-- Un gasto de publicidad puede asignarse a una referencia (ej. un boost de
-- Facebook para una publicación de un producto). Es opcional: sin producto sigue
-- siendo un gasto general. Si se borra la referencia, el gasto se conserva como
-- general (la plata ya se gastó), por eso on delete set null.
-- Es solo atribución: NO modifica productos.costo_unitario ni el stock.
alter table public.gastos_publicidad
  add column producto_id uuid references public.productos(id) on delete set null;

-- Índice en la FK (el advisor de performance de Supabase lo marca si falta).
create index gastos_publicidad_producto_id_idx on public.gastos_publicidad (producto_id);
