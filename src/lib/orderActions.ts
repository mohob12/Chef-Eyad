import { supabase } from './supabase';
import { ORDER_SELECT } from './ordersFeed';
import { errorKey } from './format';
import type { Order, OrderStatus } from './types';

export class OrderActionError extends Error {
  constructor(public key: string) {
    super(key);
  }
}

async function update(id: string, patch: Partial<Pick<Order, 'status' | 'delivery_fee' | 'admin_note'>>): Promise<Order> {
  const { data, error } = await supabase.from('orders').update(patch).eq('id', id).select(ORDER_SELECT).single();
  if (error) throw new OrderActionError(errorKey(error));
  return data as Order;
}

export const setOrderStatus = (id: string, status: OrderStatus) => update(id, { status });
export const setDeliveryFee = (id: string, fee: number | null) => update(id, { delivery_fee: fee });

export async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw new OrderActionError(errorKey(error));
  if (data?.order_items) (data as Order).order_items!.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return (data as Order) ?? null;
}

export async function deleteOrder(id: string): Promise<void> {
  // Try RPC first
  const { error: rpcErr } = await supabase.rpc('delete_orders_admin', { order_ids: [id] });
  if (!rpcErr) return;

  // Fallback to direct delete
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new OrderActionError(errorKey(error));
}

export async function deleteOrders(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error: rpcErr } = await supabase.rpc('delete_orders_admin', { order_ids: ids });
  if (!rpcErr) return;

  const { error } = await supabase.from('orders').delete().in('id', ids);
  if (error) throw new OrderActionError(errorKey(error));
}

export async function deleteAllOrders(): Promise<void> {
  const { error: rpcErr } = await supabase.rpc('delete_orders_admin', { order_ids: null });
  if (!rpcErr) return;

  const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new OrderActionError(errorKey(error));
}
