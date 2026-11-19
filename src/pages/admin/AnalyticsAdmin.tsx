import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { formatDA, loc } from '../../lib/format';
import type { Category, Order, Product } from '../../lib/types';
import SmartSalesChart from './SmartSalesChart';
import './admin-manage.css';

type RangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_ar: string;
  product_name_fr: string;
  product_name_en: string;
  variant_name_ar: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface ProductSalesStat {
  key: string;
  name: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  revenue: number;
}

interface CategorySalesStat {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  percent: number;
}

export default function AnalyticsAdmin() {
  const { t, locale } = useI18n();

  const [preset, setPreset] = useState<RangePreset>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  // Compute date limits based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = fmt(now);
      return { from: todayStr, to: todayStr };
    }
    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = fmt(y);
      return { from: yStr, to: yStr };
    }
    if (preset === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 6);
      return { from: fmt(w), to: fmt(now) };
    }
    if (preset === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(m), to: fmt(now) };
    }
    if (preset === 'custom') {
      return { from: fromDate, to: toDate };
    }
    // 'all'
    return { from: '', to: '' };
  }, [preset, fromDate, toDate]);

  // Initial load of categories and products
  useEffect(() => {
    void (async () => {
      const [catsRes, prodsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*'),
      ]);
      if (catsRes.data) setCategories(catsRes.data as Category[]);
      if (prodsRes.data) setProducts(prodsRes.data as Product[]);
    })();
  }, []);

  // Map product ID to Category ID
  const productCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p.id && p.category_id) {
        map.set(p.id, p.category_id);
      }
    }
    return map;
  }, [products]);

  // Category name lookup
  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, loc(c, 'name', locale));
    }
    return map;
  }, [categories, locale]);

  // Load orders and items based on dateRange
  const loadData = useCallback(async () => {
    setLoading(true);

    let ordersQuery = supabase
      .from('orders')
      .select('id, order_number, reference, order_type, status, subtotal, delivery_fee, total, created_at')
      .order('created_at', { ascending: false });

    if (dateRange.from) {
      ordersQuery = ordersQuery.gte('created_at', new Date(`${dateRange.from}T00:00:00`).toISOString());
    }
    if (dateRange.to) {
      ordersQuery = ordersQuery.lte('created_at', new Date(`${dateRange.to}T23:59:59.999`).toISOString());
    }

    const { data: ordersData, error: ordersErr } = await ordersQuery;
    if (ordersErr || !ordersData) {
      setLoading(false);
      return;
    }

    const loadedOrders = ordersData as Order[];
    setOrders(loadedOrders);

    // Fetch order items if there are orders
    if (loadedOrders.length > 0) {
      // Fetch in chunks if more than 200 orders
      const orderIds = loadedOrders.map((o) => o.id);
      const chunkSize = 150;
      const chunks = [];
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        chunks.push(orderIds.slice(i, i + chunkSize));
      }

      const allItems: OrderItemRow[] = [];
      for (const chunk of chunks) {
        const { data: itemsChunk } = await supabase
          .from('order_items')
          .select('id, order_id, product_id, product_name_ar, product_name_fr, product_name_en, variant_name_ar, quantity, unit_price, line_total')
          .in('order_id', chunk);
        if (itemsChunk) {
          allItems.push(...(itemsChunk as OrderItemRow[]));
        }
      }
      setOrderItems(allItems);
    } else {
      setOrderItems([]);
    }

    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Only consider active or completed orders for sales revenue (excluding cancelled and rejected)
  const validOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'cancelled' && o.status !== 'rejected');
  }, [orders]);

  // Sales KPIs calculation
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const validCount = validOrders.length;
    const completedOrders = orders.filter((o) => o.status === 'completed').length;
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    let totalRevenue = 0;
    let dineInSales = 0;
    let dineInCount = 0;
    let takeawaySales = 0;
    let takeawayCount = 0;
    let deliverySales = 0;
    let deliveryFees = 0;
    let deliveryCount = 0;

    for (const o of validOrders) {
      totalRevenue += o.total;

      if (o.order_type === 'dine_in') {
        dineInSales += o.total;
        dineInCount++;
      } else if (o.order_type === 'takeaway') {
        takeawaySales += o.total;
        takeawayCount++;
      } else if (o.order_type === 'delivery') {
        deliverySales += o.total;
        deliveryFees += o.delivery_fee || 0;
        deliveryCount++;
      }
    }

    const avgTicket = validCount > 0 ? Math.round(totalRevenue / validCount) : 0;

    return {
      totalRevenue,
      totalOrders,
      validCount,
      completedOrders,
      completionRate,
      avgTicket,
      dineInSales,
      dineInCount,
      dineInPct: totalRevenue > 0 ? Math.round((dineInSales / totalRevenue) * 100) : 0,
      takeawaySales,
      takeawayCount,
      takeawayPct: totalRevenue > 0 ? Math.round((takeawaySales / totalRevenue) * 100) : 0,
      deliverySales,
      deliveryFees,
      deliveryCount,
      deliveryPct: totalRevenue > 0 ? Math.round((deliverySales / totalRevenue) * 100) : 0,
    };
  }, [orders, validOrders]);

  // Product sales and Category sales aggregation
  const { topProducts, categoryStats } = useMemo(() => {
    const validOrderIds = new Set(validOrders.map((o) => o.id));
    const relevantItems = orderItems.filter((item) => validOrderIds.has(item.order_id));

    const prodMap = new Map<string, ProductSalesStat>();
    const catMap = new Map<string, { qty: number; revenue: number }>();

    let totalItemsRevenue = 0;

    for (const item of relevantItems) {
      const prodName =
        locale === 'fr'
          ? item.product_name_fr || item.product_name_ar
          : locale === 'en'
            ? item.product_name_en || item.product_name_ar
            : item.product_name_ar;

      const fullName = item.variant_name_ar ? `${prodName} (${item.variant_name_ar})` : prodName;
      const catId = (item.product_id && productCategoryMap.get(item.product_id)) || 'other';
      const catName = categoryNameMap.get(catId) || t('common.other');

      totalItemsRevenue += item.line_total;

      // Group product
      const existing = prodMap.get(fullName) || {
        key: fullName,
        name: fullName,
        categoryId: catId,
        categoryName: catName,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.line_total;
      prodMap.set(fullName, existing);

      // Group category
      const catExisting = catMap.get(catId) || { qty: 0, revenue: 0 };
      catExisting.qty += item.quantity;
      catExisting.revenue += item.line_total;
      catMap.set(catId, catExisting);
    }

    // Convert category map to array
    const catArr: CategorySalesStat[] = [];
    catMap.forEach((v, catId) => {
      catArr.push({
        id: catId,
        name: categoryNameMap.get(catId) || t('common.other'),
        quantity: v.qty,
        revenue: v.revenue,
        percent: totalItemsRevenue > 0 ? Math.round((v.revenue / totalItemsRevenue) * 100) : 0,
      });
    });
    catArr.sort((a, b) => b.revenue - a.revenue);

    // Products array sorted by quantity / revenue
    const allProds = Array.from(prodMap.values());
    allProds.sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

    return { topProducts: allProds, categoryStats: catArr };
  }, [validOrders, orderItems, productCategoryMap, categoryNameMap, locale, t]);

  // Filtered top products based on selected category
  const filteredProducts = useMemo(() => {
    if (selectedCatId === 'all') return topProducts;
    return topProducts.filter((p) => p.categoryId === selectedCatId);
  }, [topProducts, selectedCatId]);

  return (
    <div className="am-page">
      {/* Header with Title and Print Button */}
      <div className="am-head">
        <div>
          <h1 style={{ margin: 0 }}>{t('am.stat.title')}</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            {t('am.stat.desc')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()}>
            🖨️ {t('am.stat.print')}
          </button>
        </div>
      </div>

      {/* Date Range Presets and Filters */}
      <div className="panel stack" style={{ gap: 12 }}>
        <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
          {(['today', 'yesterday', 'week', 'month', 'all', 'custom'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`btn btn-sm ${preset === r ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPreset(r)}
            >
              {t(`am.stat.range.${r}`)}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="row wrap" style={{ gap: 12, alignItems: 'center', paddingTop: 6 }}>
            <label className="field" style={{ margin: 0, minWidth: 160 }}>
              <span className="small muted">{t('history.from')}</span>
              <input
                className="input input-sm"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="field" style={{ margin: 0, minWidth: 160 }}>
              <span className="small muted">{t('history.to')}</span>
              <input
                className="input input-sm"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <div className="panel muted">{t('common.loading')}</div>
      ) : validOrders.length === 0 ? (
        <div className="panel muted" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
          {t('am.stat.noData')}
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="am-stat-grid">
            {/* Total Revenue */}
            <div className="am-stat-card primary">
              <div className="am-stat-card-head">
                <span>{t('am.stat.totalSales')}</span>
                <span className="am-stat-icon">💰</span>
              </div>
              <div className="am-stat-card-val num">{formatDA(kpis.totalRevenue, locale)}</div>
              <div className="am-stat-card-sub">
                <span>{kpis.validCount} {t('am.stat.ordersCount')}</span>
                <span>•</span>
                <span>{t('am.stat.avgTicket')}: <strong>{formatDA(kpis.avgTicket, locale)}</strong></span>
              </div>
            </div>

            {/* Dine-In Sales */}
            <div className="am-stat-card dine-in">
              <div className="am-stat-card-head">
                <span>{t('am.stat.dineInSales')}</span>
                <span className="am-stat-icon">🍽️</span>
              </div>
              <div className="am-stat-card-val num">{formatDA(kpis.dineInSales, locale)}</div>
              <div className="am-stat-card-sub">
                <span>{kpis.dineInCount} {t('am.stat.ordersCount')}</span>
                <span>•</span>
                <span><strong>{kpis.dineInPct}%</strong> {t('am.stat.percent')}</span>
              </div>
            </div>

            {/* Takeaway Sales */}
            <div className="am-stat-card takeaway">
              <div className="am-stat-card-head">
                <span>{t('am.stat.takeawaySales')}</span>
                <span className="am-stat-icon">🥡</span>
              </div>
              <div className="am-stat-card-val num">{formatDA(kpis.takeawaySales, locale)}</div>
              <div className="am-stat-card-sub">
                <span>{kpis.takeawayCount} {t('am.stat.ordersCount')}</span>
                <span>•</span>
                <span><strong>{kpis.takeawayPct}%</strong> {t('am.stat.percent')}</span>
              </div>
            </div>

            {/* Delivery Sales */}
            <div className="am-stat-card delivery">
              <div className="am-stat-card-head">
                <span>{t('am.stat.deliverySales')}</span>
                <span className="am-stat-icon">🛵</span>
              </div>
              <div className="am-stat-card-val num">{formatDA(kpis.deliverySales, locale)}</div>
              <div className="am-stat-card-sub">
                <span>{kpis.deliveryCount} {t('am.stat.ordersCount')}</span>
                <span>•</span>
                <span>{t('am.stat.deliveryFees')}: <strong>{formatDA(kpis.deliveryFees, locale)}</strong></span>
              </div>
            </div>
          </div>

          {/* Smart Sales Chart */}
          <SmartSalesChart orders={validOrders} locale={locale} preset={preset} />

          {/* Categories Performance & Breakdown */}
          {categoryStats.length > 0 && (
            <div className="panel stack" style={{ gap: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                🏷️ {t('am.stat.categorySales')}
              </h3>

              <div className="am-progress-list">
                {categoryStats.map((c) => (
                  <div key={c.id} className="am-progress-item">
                    <div className="am-progress-meta">
                      <span>{c.name} ({c.quantity} {t('am.stat.qtySold')})</span>
                      <span className="num">
                        {formatDA(c.revenue, locale)} <strong style={{ color: 'var(--red)', marginInlineStart: 6 }}>({c.percent}%)</strong>
                      </span>
                    </div>
                    <div className="am-progress-track">
                      <div className="am-progress-fill" style={{ width: `${c.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Selling Dishes with Category Filter */}
          <div className="panel stack" style={{ gap: 16 }}>
            <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                ⭐ {t('am.stat.topDishes')}
              </h3>

              {/* Category Filter Buttons / Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="small muted">{t('am.stat.filterCat')}</span>
                <select
                  className="input input-sm"
                  style={{ minWidth: 160 }}
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                >
                  <option value="all">{t('am.stat.allCats')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {loc(c, 'name', locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <p className="muted small">{t('am.stat.noData')}</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="am-stat-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>{t('am.stat.dish')}</th>
                      <th>{t('am.stat.category')}</th>
                      <th style={{ textAlign: 'center' }}>{t('am.stat.qtySold')}</th>
                      <th style={{ textAlign: 'end' }}>{t('am.stat.revenue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.slice(0, 30).map((prod, idx) => (
                      <tr key={prod.key}>
                        <td className="muted num" style={{ fontWeight: 700 }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td style={{ fontWeight: 700 }}>{prod.name}</td>
                        <td className="muted">{prod.categoryName}</td>
                        <td style={{ textAlign: 'center' }} className="num">
                          <span className="badge badge-dark">{prod.quantity}</span>
                        </td>
                        <td style={{ textAlign: 'end', fontWeight: 800 }} className="num">
                          {formatDA(prod.revenue, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
