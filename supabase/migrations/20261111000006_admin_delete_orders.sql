-- Allow authenticated admins to delete orders and their cascade items

grant delete on public.orders to authenticated;
grant delete on public.order_items to authenticated;
grant delete on public.order_item_extras to authenticated;

drop policy if exists "admins delete orders" on public.orders;
create policy "admins delete orders" on public.orders for delete to authenticated
  using (public.is_admin());

drop policy if exists "admins delete order items" on public.order_items;
create policy "admins delete order items" on public.order_items for delete to authenticated
  using (public.is_admin());

drop policy if exists "admins delete order extras" on public.order_item_extras;
create policy "admins delete order extras" on public.order_item_extras for delete to authenticated
  using (public.is_admin());

-- RPC helper for bulk deletion
create or replace function public.delete_orders_admin(order_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if order_ids is null or array_length(order_ids, 1) is null then
    delete from public.orders;
    get diagnostics deleted_count = row_count;
  else
    delete from public.orders where id = any(order_ids);
    get diagnostics deleted_count = row_count;
  end if;

  return deleted_count;
end;
$$;

revoke all on function public.delete_orders_admin(uuid[]) from public, anon;
grant execute on function public.delete_orders_admin(uuid[]) to authenticated;
