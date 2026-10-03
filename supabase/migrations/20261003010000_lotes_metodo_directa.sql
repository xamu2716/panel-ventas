-- Tercer tipo de lote: "directa" = compra directa (Temu, Shein, local en Bogotá).
-- Sin flete, seguro, tarifa aérea, arancel ni IVA: el costo unitario es
-- costo_mercancia / unidades. Hasta ahora el CHECK solo aceptaba barco y avión.
alter table public.lotes drop constraint lotes_metodo_importacion_check;
alter table public.lotes add constraint lotes_metodo_importacion_check
  check (metodo_importacion in ('barco', 'avion', 'directa'));
