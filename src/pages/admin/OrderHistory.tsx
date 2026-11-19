import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { formatDA, formatDateTime } from '../../lib/format';
import { StatusBadge, TypeBadge } from '../../components/admin/OrderCard';
import { deleteOrder, deleteOrders, deleteAllOrders } from '../../lib/orderActions';
import type { Order, OrderStatus, OrderType } from '../../lib/types';

const PAGE = 50;
const STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'rejected'];
const TYPES: OrderType[] = ['dine_in', 'takeaway', 'delivery'];

export default function OrderHistory() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState<OrderType | ''>('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [rows, setRows] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Selection & bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);
    const term = q.trim().replace(/[,()%]/g, ' ').trim();
    if (term) {
      const num = term.replace(/^MK-?/i, '');
      const parts = [`customer_name.ilike.%${term}%`, `customer_phone.ilike.%${term.replace(/\s/g, '')}%`, `reference.ilike.%${term}%`];
      if (/^\d+$/.test(num)) parts.push(`order_number.eq.${num}`);
      query = query.or(parts.join(','));
    }
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59.999`).toISOString());
    if (type) query = query.eq('order_type', type);
    if (status) query = query.eq('status', status);
    const { data, error: err, count: c } = await query;
    setLoading(false);
    if (err) {
      setError(true);
      return;
    }
    setRows((data ?? []) as Order[]);
    setCount(c ?? 0);
  }, [q, from, to, type, status, limit]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 250);
    return () => clearTimeout(id);
  }, [load]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const handleDeleteOne = async (e: React.MouseEvent, o: Order) => {
    e.stopPropagation();
    if (!window.confirm(t('hist.confirmDeleteOne', { ref: o.reference }))) return;
    setBusy(true);
    setFeedback(null);
    try {
      await deleteOrder(o.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(o.id);
        return next;
      });
      setFeedback({ type: 'success', message: t('hist.deleteSuccess') });
      await load();
    } catch {
      setFeedback({ type: 'error', message: t('hist.deleteError') });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(t('hist.confirmDeleteMany', { n: selectedIds.size }))) return;
    setBusy(true);
    setFeedback(null);
    try {
      await deleteOrders(Array.from(selectedIds));
      setSelectedIds(new Set());
      setFeedback({ type: 'success', message: t('hist.deleteSuccess') });
      await load();
    } catch {
      setFeedback({ type: 'error', message: t('hist.deleteError') });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAll = async () => {
    if (count === 0) return;
    if (!window.confirm(t('hist.confirmDeleteAll'))) return;
    setBusy(true);
    setFeedback(null);
    try {
      await deleteAllOrders();
      setSelectedIds(new Set());
      setFeedback({ type: 'success', message: t('hist.deleteSuccess') });
      await load();
    } catch {
      setFeedback({ type: 'error', message: t('hist.deleteError') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="row wrap" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0 }}>{t('hist.title')}</h1>
        {count > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-red"
            disabled={busy || loading}
            onClick={handleDeleteAll}
            title={t('hist.deleteAll')}
          >
            🗑️ {t('hist.deleteAll')}
          </button>
        )}
      </div>

      <div className="filters">
        <input
          className="input"
          type="search"
          placeholder={t('hist.searchPh')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t('common.search')}
          data-testid="history-search"
        />
        <label className="field">
          <span className="sr-only">{t('hist.from')}</span>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('hist.from')} />
        </label>
        <label className="field">
          <span className="sr-only">{t('hist.to')}</span>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('hist.to')} />
        </label>
        <select className="select" value={type} onChange={(e) => setType(e.target.value as OrderType | '')} aria-label={t('hist.type')}>
          <option value="">{t('hist.type')}: {t('common.all')}</option>
          {TYPES.map((x) => (
            <option key={x} value={x}>
              {t(`type.${x}`)}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          aria-label={t('hist.status')}
          data-testid="history-status"
        >
          <option value="">{t('hist.status')}: {t('common.all')}</option>
          {STATUSES.map((x) => (
            <option key={x} value={x}>
              {t(`status.${x}`)}
            </option>
          ))}
        </select>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{feedback.message}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFeedback(null)} style={{ padding: '0 8px' }}>
            ✕
          </button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div
          className="panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 16px',
            background: 'rgba(214, 40, 40, 0.08)',
            borderColor: 'var(--red)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 800 }}>{t('hist.selectedCount', { n: selectedIds.size })}</span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              {t('hist.clearSelection')}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy}
            onClick={handleDeleteSelected}
          >
            🗑️ {t('hist.deleteSelected', { n: selectedIds.size })}
          </button>
        </div>
      )}

      <div className="muted small">{t('hist.count', { n: count })}</div>
      {error && <div className="alert alert-error">{t('common.error')}</div>}

      <div className="table-wrap">
        <table className="table" data-testid="history-table">
          <thead>
            <tr>
              <th style={{ width: 44, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll()}
                  aria-label={t('hist.selectAll')}
                  style={{ cursor: 'pointer', width: 18, height: 18 }}
                />
              </th>
              <th>{t('conf.number')}</th>
              <th>{t('rc.date')}</th>
              <th>{t('od.customer')}</th>
              <th>{t('f.phone')}</th>
              <th>{t('hist.type')}</th>
              <th>{t('hist.status')}</th>
              <th>{t('sum.total')}</th>
              <th style={{ textAlign: 'center', width: 80 }}>{t('hist.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const isSelected = selectedIds.has(o.id);
              return (
                <tr
                  key={o.id}
                  className="clickable"
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                  style={{ background: isSelected ? 'rgba(214, 40, 40, 0.05)' : undefined }}
                >
                  <td style={{ textAlign: 'center' }} onClick={(e) => toggleSelect(o.id, e)}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(o.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', width: 18, height: 18 }}
                      aria-label={o.reference}
                    />
                  </td>
                  <td className="num" style={{ fontWeight: 800 }}>
                    {o.reference}
                  </td>
                  <td className="num">{formatDateTime(o.created_at, locale)}</td>
                  <td>{o.customer_name}</td>
                  <td className="num">{o.customer_phone ?? '—'}</td>
                  <td>
                    <TypeBadge type={o.order_type} />
                  </td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="num">
                    {formatDA(o.total, locale)}
                    {o.delivery_fee_status === 'pending' && <span className="muted small"> *</span>}
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={busy}
                      onClick={(e) => handleDeleteOne(e, o)}
                      title={t('am.delete')}
                      style={{ color: 'var(--red)', padding: '4px 8px', minHeight: 30 }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                  {t('hist.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">{t('common.loading')}</p>}
      {rows.length < count && (
        <button className="btn" onClick={() => setLimit((l) => l + PAGE)} style={{ alignSelf: 'center' }}>
          {t('hist.loadMore')}
        </button>
      )}
    </>
  );
}
