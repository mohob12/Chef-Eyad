import { useState, useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import { formatDA } from '../../lib/format';
import type { Locale, Order } from '../../lib/types';

interface SmartSalesChartProps {
  orders: Order[];
  locale: Locale;
  preset: string;
}

interface ChartPoint {
  key: string;
  label: string;
  secondaryLabel?: string;
  fullTitle: string;
  sales: number;
  ordersCount: number;
  dineIn: number;
  takeaway: number;
  delivery: number;
  isPeak: boolean;
}

export default function SmartSalesChart({ orders, locale, preset }: SmartSalesChartProps) {
  const { t } = useI18n();

  const [metric, setMetric] = useState<'sales' | 'orders'>('sales');
  const [viewMode, setViewMode] = useState<'auto' | 'hourly' | 'daily'>('auto');
  const [activePointKey, setActivePointKey] = useState<string | null>(null);

  // Grouping logic: Decide if hourly or daily is primary
  const isSingleDay = useMemo(() => {
    if (preset === 'today' || preset === 'yesterday') return true;
    if (orders.length === 0) return false;
    const dates = new Set(orders.map((o) => o.created_at.slice(0, 10)));
    return dates.size <= 1;
  }, [preset, orders]);

  const effectiveView = viewMode === 'auto' ? (isSingleDay ? 'hourly' : 'daily') : viewMode;

  // Compute chart points
  const points = useMemo<ChartPoint[]>(() => {
    if (orders.length === 0) return [];

    if (effectiveView === 'hourly') {
      // 2-hour time slots: 10:00 - 12:00, 12:00 - 14:00, ..., 22:00 - 00:00, 00:00 - 02:00
      // Covering the standard restaurant operating hours (10:00 AM to 02:00 AM)
      const slotRanges: { start: number; end: number; label: string; full: string }[] = [
        { start: 10, end: 12, label: '10:00-12:00', full: locale === 'ar' ? '10:00 إلى 12:00 (صباحاً)' : '10:00 - 12:00' },
        { start: 12, end: 14, label: '12:00-14:00', full: locale === 'ar' ? '12:00 إلى 14:00 (غداء 🍔)' : '12:00 - 14:00' },
        { start: 14, end: 16, label: '14:00-16:00', full: locale === 'ar' ? '14:00 إلى 16:00 (بعد الظهر)' : '14:00 - 16:00' },
        { start: 16, end: 18, label: '16:00-18:00', full: locale === 'ar' ? '16:00 إلى 18:00 (مساءً)' : '16:00 - 18:00' },
        { start: 18, end: 20, label: '18:00-20:00', full: locale === 'ar' ? '18:00 إلى 20:00 (بداية العشاء 🍕)' : '18:00 - 20:00' },
        { start: 20, end: 22, label: '20:00-22:00', full: locale === 'ar' ? '20:00 إلى 22:00 (ذروة العشاء 🔥)' : '20:00 - 22:00' },
        { start: 22, end: 24, label: '22:00-00:00', full: locale === 'ar' ? '22:00 إلى منتصف الليل' : '22:00 - 00:00' },
        { start: 0, end: 2, label: '00:00-02:00', full: locale === 'ar' ? '00:00 إلى 02:00 (سهرة)' : '00:00 - 02:00' },
      ];

      const slotMap = new Map<number, { sales: number; count: number; dineIn: number; takeaway: number; delivery: number }>();
      slotRanges.forEach((_, idx) => {
        slotMap.set(idx, { sales: 0, count: 0, dineIn: 0, takeaway: 0, delivery: 0 });
      });

      // Aggregate orders into slots
      orders.forEach((o) => {
        const d = new Date(o.created_at);
        const hour = d.getHours();
        let matchedIdx = -1;
        slotRanges.forEach((slot, idx) => {
          if (slot.start === 0 && slot.end === 2) {
            if (hour >= 0 && hour < 2) matchedIdx = idx;
          } else if (hour >= slot.start && hour < slot.end) {
            matchedIdx = idx;
          }
        });
        if (matchedIdx !== -1) {
          const cur = slotMap.get(matchedIdx)!;
          cur.sales += o.total;
          cur.count += 1;
          if (o.order_type === 'dine_in') cur.dineIn += o.total;
          else if (o.order_type === 'takeaway') cur.takeaway += o.total;
          else if (o.order_type === 'delivery') cur.delivery += o.total;
        }
      });

      const maxVal = Math.max(...Array.from(slotMap.values()).map((v) => (metric === 'sales' ? v.sales : v.count)), 0);

      return slotRanges.map((slot, idx) => {
        const val = slotMap.get(idx)!;
        const currentVal = metric === 'sales' ? val.sales : val.count;
        return {
          key: `slot-${idx}`,
          label: slot.label,
          fullTitle: slot.full,
          sales: val.sales,
          ordersCount: val.count,
          dineIn: val.dineIn,
          takeaway: val.takeaway,
          delivery: val.delivery,
          isPeak: maxVal > 0 && currentVal === maxVal,
        };
      });
    }

    // Daily aggregation
    const daysMap = new Map<string, { date: Date; sales: number; count: number; dineIn: number; takeaway: number; delivery: number }>();

    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cur = daysMap.get(key) || { date: d, sales: 0, count: 0, dineIn: 0, takeaway: 0, delivery: 0 };
      cur.sales += o.total;
      cur.count += 1;
      if (o.order_type === 'dine_in') cur.dineIn += o.total;
      else if (o.order_type === 'takeaway') cur.takeaway += o.total;
      else if (o.order_type === 'delivery') cur.delivery += o.total;
      daysMap.set(key, cur);
    });

    const sortedKeys = Array.from(daysMap.keys()).sort();
    if (sortedKeys.length === 0) return [];

    // If continuous date filling is helpful for short ranges (week / month)
    const pointsList: ChartPoint[] = [];
    const maxVal = Math.max(...Array.from(daysMap.values()).map((v) => (metric === 'sales' ? v.sales : v.count)), 0);

    const dayFormatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-DZ' : 'en-GB', {
      weekday: 'short',
    });
    const fullDateFormatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-DZ' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    sortedKeys.forEach((key) => {
      const val = daysMap.get(key)!;
      const d = val.date;
      const dayName = dayFormatter.format(d);
      const shortNum = `${d.getDate()}/${d.getMonth() + 1}`;
      const fullTitle = fullDateFormatter.format(d);
      const currentVal = metric === 'sales' ? val.sales : val.count;

      pointsList.push({
        key,
        label: shortNum,
        secondaryLabel: dayName,
        fullTitle,
        sales: val.sales,
        ordersCount: val.count,
        dineIn: val.dineIn,
        takeaway: val.takeaway,
        delivery: val.delivery,
        isPeak: maxVal > 0 && currentVal === maxVal,
      });
    });

    return pointsList;
  }, [orders, effectiveView, metric, locale]);

  // Overall calculations for Insights and Benchmarks
  const analytics = useMemo(() => {
    if (points.length === 0) {
      return { maxVal: 0, avgVal: 0, totalSales: 0, totalOrders: 0, peakPoint: null, aboveAvgCount: 0 };
    }

    const totalSales = points.reduce((acc, p) => acc + p.sales, 0);
    const totalOrders = points.reduce((acc, p) => acc + p.ordersCount, 0);

    const values = points.map((p) => (metric === 'sales' ? p.sales : p.ordersCount));
    const activeValues = values.filter((v) => v > 0);
    const maxVal = Math.max(...values, 0);

    // Calculate benchmark average (based on active periods or all periods)
    const countForAvg = activeValues.length > 0 ? activeValues.length : points.length;
    const avgVal = countForAvg > 0 ? Math.round((metric === 'sales' ? totalSales : totalOrders) / countForAvg) : 0;

    const peakPoint = points.find((p) => (metric === 'sales' ? p.sales : p.ordersCount) === maxVal && maxVal > 0) || null;
    const aboveAvgCount = points.filter((p) => (metric === 'sales' ? p.sales : p.ordersCount) >= avgVal && (metric === 'sales' ? p.sales : p.ordersCount) > 0).length;

    return {
      maxVal,
      avgVal,
      totalSales,
      totalOrders,
      peakPoint,
      aboveAvgCount,
    };
  }, [points, metric]);

  const activePoint = points.find((p) => p.key === activePointKey) || analytics.peakPoint || points[points.length - 1] || null;

  // Y-axis tick values
  const yTicks = useMemo(() => {
    const max = analytics.maxVal || 100;
    const step = max / 3;
    return [
      Math.round(max),
      Math.round(step * 2),
      Math.round(step * 1),
      0,
    ];
  }, [analytics.maxVal]);

  // Average line position percentage from bottom
  const avgHeightPct = analytics.maxVal > 0 ? Math.min(95, Math.round((analytics.avgVal / analytics.maxVal) * 100)) : 0;

  if (points.length === 0) {
    return null;
  }

  return (
    <div className="panel stack am-smart-chart-container" style={{ gap: 16 }}>
      {/* Chart Top Header & Controls */}
      <div className="row wrap am-smart-chart-head" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📈</span>
            <span>{t('am.stat.dailyChart')}</span>
          </h3>
          <span className="badge badge-subtle num" style={{ fontSize: '0.8rem' }}>
            {points.length} {effectiveView === 'hourly' ? (locale === 'ar' ? 'فترات ساعية' : 'périodes') : (locale === 'ar' ? 'أيام' : 'jours')}
          </span>
        </div>

        <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
          {/* View Mode Toggle: Hourly / Daily */}
          <div className="am-pill-group">
            <button
              type="button"
              className={`am-pill-btn ${effectiveView === 'daily' ? 'active' : ''}`}
              onClick={() => setViewMode('daily')}
            >
              📅 {t('am.stat.chart.viewDaily')}
            </button>
            <button
              type="button"
              className={`am-pill-btn ${effectiveView === 'hourly' ? 'active' : ''}`}
              onClick={() => setViewMode('hourly')}
            >
              🕒 {t('am.stat.chart.viewHourly')}
            </button>
          </div>

          {/* Metric Selector Toggle: Sales vs Orders */}
          <div className="am-pill-group">
            <button
              type="button"
              className={`am-pill-btn ${metric === 'sales' ? 'active' : ''}`}
              onClick={() => setMetric('sales')}
            >
              💰 {t('am.stat.chart.metricSales')}
            </button>
            <button
              type="button"
              className={`am-pill-btn ${metric === 'orders' ? 'active' : ''}`}
              onClick={() => setMetric('orders')}
            >
              📦 {t('am.stat.chart.metricOrders')}
            </button>
          </div>
        </div>
      </div>

      {/* Smart Insights Ribbon */}
      <div className="am-smart-insights-strip">
        {/* Peak insight */}
        {analytics.peakPoint && (
          <div className="am-insight-card peak">
            <div className="am-insight-icon">🏆</div>
            <div className="am-insight-content">
              <span className="am-insight-title">{t('am.stat.chart.peak')}</span>
              <span className="am-insight-val num">
                {metric === 'sales' ? formatDA(analytics.peakPoint.sales, locale) : `${analytics.peakPoint.ordersCount} ${t('am.stat.ordersCount')}`}
              </span>
              <span className="am-insight-sub muted">{analytics.peakPoint.fullTitle}</span>
            </div>
          </div>
        )}

        {/* Benchmark / Average insight */}
        <div className="am-insight-card avg">
          <div className="am-insight-icon">📊</div>
          <div className="am-insight-content">
            <span className="am-insight-title">{t('am.stat.chart.avgBenchmark')}</span>
            <span className="am-insight-val num">
              {metric === 'sales' ? formatDA(analytics.avgVal, locale) : `${analytics.avgVal} ${t('am.stat.ordersCount')}`}
            </span>
            <span className="am-insight-sub muted">
              {analytics.aboveAvgCount} {t('am.stat.chart.aboveAvg')}
            </span>
          </div>
        </div>

        {/* Total Metric for the displayed view */}
        <div className="am-insight-card total">
          <div className="am-insight-icon">⚡</div>
          <div className="am-insight-content">
            <span className="am-insight-title">{metric === 'sales' ? t('am.stat.totalSales') : t('am.stat.ordersCount')}</span>
            <span className="am-insight-val num">
              {metric === 'sales' ? formatDA(analytics.totalSales, locale) : `${analytics.totalOrders}`}
            </span>
            <span className="am-insight-sub muted">
              {metric === 'sales' ? `${analytics.totalOrders} ${t('am.stat.ordersCount')}` : formatDA(analytics.totalSales, locale)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Canvas */}
      <div className="am-chart-canvas-wrapper">
        {/* Y-Axis Guide Labels */}
        <div className="am-chart-yaxis">
          {yTicks.map((val, idx) => (
            <span key={idx} className="am-chart-ytick num">
              {metric === 'sales' ? (val >= 1000 ? `${Math.round(val / 1000)}k` : val) : val}
            </span>
          ))}
        </div>

        {/* Graphic Area */}
        <div className="am-chart-stage">
          {/* Background Grid Lines */}
          <div className="am-chart-gridline" style={{ top: '0%' }} />
          <div className="am-chart-gridline" style={{ top: '33.3%' }} />
          <div className="am-chart-gridline" style={{ top: '66.6%' }} />
          <div className="am-chart-gridline" style={{ top: '100%' }} />

          {/* Average Benchmark Line */}
          {avgHeightPct > 0 && avgHeightPct < 96 && (
            <div
              className="am-chart-avg-line"
              style={{ bottom: `${avgHeightPct}%` }}
              title={`${t('am.stat.chart.avgBenchmark')}: ${metric === 'sales' ? formatDA(analytics.avgVal, locale) : analytics.avgVal}`}
            >
              <span className="am-chart-avg-tag">
                {t('am.stat.chart.averageLine')}: {metric === 'sales' ? formatDA(analytics.avgVal, locale) : analytics.avgVal}
              </span>
            </div>
          )}

          {/* The Columns Track */}
          <div className="am-smart-chart-bars">
            {points.map((p) => {
              const val = metric === 'sales' ? p.sales : p.ordersCount;
              const heightPct = analytics.maxVal > 0 ? Math.max(val > 0 ? 6 : 2, Math.round((val / analytics.maxVal) * 100)) : 2;
              const isSelected = activePointKey === p.key;

              return (
                <div
                  key={p.key}
                  className={`am-smart-bar-col ${isSelected ? 'selected' : ''}`}
                  onMouseEnter={() => setActivePointKey(p.key)}
                  onClick={() => setActivePointKey(p.key)}
                >
                  {/* Bar Box */}
                  <div className="am-smart-bar-wrapper">
                    {/* Peak badge on column head */}
                    {p.isPeak && (
                      <div className="am-smart-peak-crown" title={t('am.stat.chart.peakBadge')}>
                        ⭐
                      </div>
                    )}

                    {/* The Fill Bar */}
                    <div
                      className={`am-smart-bar-fill ${p.isPeak ? 'peak-fill' : ''} ${val === 0 ? 'empty-fill' : ''}`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Compact value inside/above bar */}
                      {heightPct > 25 && (
                        <span className="am-smart-bar-val num">
                          {metric === 'sales' ? (val >= 1000 ? `${Math.round(val / 1000)}k` : val) : val}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* X-Axis Column Label */}
                  <div className="am-smart-bar-labels">
                    {p.secondaryLabel && <span className="am-smart-sublabel">{p.secondaryLabel}</span>}
                    <span className="am-smart-mainlabel num">{p.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smart Live Inspector Card for hovered / active period */}
      {activePoint && (
        <div className="am-chart-detail-card">
          <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.25rem' }}>{activePoint.isPeak ? '🏆' : '📍'}</span>
              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>{activePoint.fullTitle}</strong>
                {activePoint.isPeak && (
                  <span className="badge badge-warning" style={{ marginInlineStart: 8, fontSize: '0.75rem' }}>
                    {t('am.stat.chart.peakBadge')}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="am-detail-stat">
                <span className="muted small">{t('am.stat.totalSales')}:</span>
                <strong className="num" style={{ color: 'var(--red)', fontSize: '1rem' }}>
                  {formatDA(activePoint.sales, locale)}
                </strong>
              </div>
              <div className="am-detail-stat">
                <span className="muted small">{t('am.stat.ordersCount')}:</span>
                <strong className="num">{activePoint.ordersCount}</strong>
              </div>
              {activePoint.ordersCount > 0 && (
                <div className="am-detail-stat">
                  <span className="muted small">{t('am.stat.avgTicket')}:</span>
                  <strong className="num">{formatDA(Math.round(activePoint.sales / activePoint.ordersCount), locale)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown for Dine-In, Takeaway, Delivery for this specific slot */}
          {activePoint.sales > 0 && (
            <div className="am-detail-breakdown row wrap" style={{ gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
              <span className="small muted">🍽️ داخل المطعم: <strong className="num">{formatDA(activePoint.dineIn, locale)}</strong></span>
              <span className="small muted">🥡 سفري: <strong className="num">{formatDA(activePoint.takeaway, locale)}</strong></span>
              <span className="small muted">🛵 توصيل: <strong className="num">{formatDA(activePoint.delivery, locale)}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
