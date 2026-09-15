import { supabase } from "./supabaseClient";
import { costoPromedioPonderado, costoUnitarioLineaLote, reversarLinea } from "./calc";
import type { LoteConItems, LoteItem, MetodoImportacion } from "./types";

/**
 * Un lote (o, más preciso, cada línea suya) solo se puede editar o eliminar si
 * es la compra más reciente registrada para esa referencia: si después se
 * registró otro lote de la misma referencia, deshacer el promedio ponderado
 * de esta línea ya no sería exacto. `todosLosLoteItems` debe ser la lista
 * COMPLETA de lote_items de TODOS los lotes (no solo de este), para poder
 * comparar `created_at` contra cualquier compra posterior de la misma
 * referencia.
 */
export function esLoteEditable(
  lote: LoteConItems,
  todosLosLoteItems: LoteItem[],
): { editable: boolean; referenciaQueBloquea?: string } {
  for (const item of lote.lote_items) {
    const hayMasReciente = todosLosLoteItems.some(
      (li) =>
        li.producto_id === item.producto_id &&
        li.id !== item.id &&
        new Date(li.created_at).getTime() > new Date(item.created_at).getTime(),
    );
    if (hayMasReciente) {
      return { editable: false, referenciaQueBloquea: item.producto?.nombre ?? "una referencia" };
    }
  }
  return { editable: true };
}

type LineaEditada = {
  id: string;
  productoId: string;
  costoMercancia: number;
  unidades: number;
  publicidad: number;
};

export type CambiosLote = {
  fecha: string;
  metodoImportacion: MetodoImportacion;
  fleteTotal: number;
  seguroTotal: number;
  tarifaAvionTotal: number;
  arancelPct: number;
  notas: string | null;
  lineas: LineaEditada[];
};

/** Trae el stock/costo más reciente de los productos indicados, justo antes de aplicar un cambio. */
async function traerProductosActuales(ids: string[]) {
  const { data, error } = await supabase.from("productos").select("id, stock, costo_unitario").in("id", ids);
  if (error || !data) throw new Error(error?.message ?? "No se pudieron leer los productos afectados.");
  return new Map(data.map((p) => [p.id, { stock: p.stock, costo: p.costo_unitario }]));
}

/**
 * Reversa el efecto de una línea vieja sobre el estado actual del producto.
 * Si ya se vendieron más unidades de las que quedarían al deshacer esta
 * compra (el stock resultante sería negativo), lanza un error claro y no
 * calcula nada — el llamador debe hacer esto ANTES de escribir cualquier
 * cambio en la base de datos.
 */
function reversar(
  actual: { stock: number; costo: number },
  lineaVieja: { unidades: number; costo_unitario_resultante: number },
  nombreProducto: string,
): { stock: number; costo: number } {
  const stockAntesCrudo = actual.stock - lineaVieja.unidades;
  if (stockAntesCrudo < 0) {
    throw new Error(
      `No se puede modificar ni eliminar esta línea: ya se vendieron unidades de "${nombreProducto}" que dejarían su stock en negativo.`,
    );
  }
  return reversarLinea({
    stockActual: actual.stock,
    costoActual: actual.costo,
    unidades: lineaVieja.unidades,
    costoUnitario: lineaVieja.costo_unitario_resultante,
  });
}

/**
 * Aplica cambios a un lote ya existente (cabecera + líneas). Asume que ya se
 * confirmó `esLoteEditable` antes de llamar esto: no agrega ni quita líneas,
 * ni cambia a qué producto apunta una línea. Para cada línea, reversa su
 * efecto viejo sobre el producto, calcula el nuevo costo con los valores
 * editados y vuelve a aplicar el promedio ponderado — todo en memoria
 * primero; solo si nada queda en negativo se escribe en la base de datos.
 */
export async function aplicarCambiosDeLote(lote: LoteConItems, cambios: CambiosLote): Promise<void> {
  const unidadesTotalLote = cambios.lineas.reduce((acc, l) => acc + l.unidades, 0);
  const productoIds = [...new Set(lote.lote_items.map((li) => li.producto_id))];
  const productosActuales = await traerProductosActuales(productoIds);

  const estadoProductos = new Map<string, { stock: number; costo: number }>();
  const costoResultantePorLinea = new Map<string, number>();

  for (const lineaVieja of lote.lote_items) {
    const nombreProducto = lineaVieja.producto?.nombre ?? "referencia";
    const actual = estadoProductos.get(lineaVieja.producto_id) ?? productosActuales.get(lineaVieja.producto_id);
    if (!actual) throw new Error(`No se encontró el producto de la línea "${nombreProducto}".`);
    const antes = reversar(actual, lineaVieja, nombreProducto);

    const lineaNueva = cambios.lineas.find((l) => l.id === lineaVieja.id);
    if (!lineaNueva) throw new Error(`Falta la línea editada para "${nombreProducto}".`);

    const { costoUnitario } = costoUnitarioLineaLote({
      metodo: cambios.metodoImportacion,
      costoMercancia: lineaNueva.costoMercancia,
      unidades: lineaNueva.unidades,
      publicidad: lineaNueva.publicidad,
      unidadesTotalLote,
      fleteTotal: cambios.fleteTotal,
      seguroTotal: cambios.seguroTotal,
      tarifaAvionTotal: cambios.tarifaAvionTotal,
      arancelPct: cambios.arancelPct,
    });
    costoResultantePorLinea.set(lineaNueva.id, costoUnitario);

    const nuevoCosto = costoPromedioPonderado({
      stockActual: antes.stock,
      costoActual: antes.costo,
      unidadesNuevas: lineaNueva.unidades,
      costoUnitarioNuevo: costoUnitario,
    });
    estadoProductos.set(lineaVieja.producto_id, { stock: antes.stock + lineaNueva.unidades, costo: nuevoCosto });
  }

  // Todo validado — recién ahora se escribe.
  const { error: errLote } = await supabase
    .from("lotes")
    .update({
      fecha: cambios.fecha,
      metodo_importacion: cambios.metodoImportacion,
      flete_total: cambios.fleteTotal,
      seguro_total: cambios.metodoImportacion === "avion" ? cambios.seguroTotal : 0,
      tarifa_avion_total: cambios.metodoImportacion === "avion" ? cambios.tarifaAvionTotal : 0,
      arancel_pct: cambios.metodoImportacion === "avion" ? cambios.arancelPct : 0,
      notas: cambios.notas,
    })
    .eq("id", lote.id);
  if (errLote) throw new Error(`No se pudo actualizar el lote: ${errLote.message}`);

  for (const lineaNueva of cambios.lineas) {
    const { error: errItem } = await supabase
      .from("lote_items")
      .update({
        costo_mercancia: lineaNueva.costoMercancia,
        unidades: lineaNueva.unidades,
        publicidad: lineaNueva.publicidad,
        costo_unitario_resultante: costoResultantePorLinea.get(lineaNueva.id) ?? 0,
      })
      .eq("id", lineaNueva.id);
    if (errItem) throw new Error(`No se pudo actualizar una línea del lote: ${errItem.message}`);
  }

  for (const [productoId, estado] of estadoProductos) {
    const { error: errProd } = await supabase
      .from("productos")
      .update({ stock: estado.stock, costo_unitario: estado.costo })
      .eq("id", productoId);
    if (errProd) throw new Error(`No se pudo actualizar el stock del producto: ${errProd.message}`);
  }
}

/**
 * Elimina un lote completo: reversa el efecto de cada una de sus líneas sobre
 * su producto (stock y costo vuelven a como estaban antes de esta compra) y
 * borra el lote — sus lote_items se borran solos por `ON DELETE CASCADE`. Si
 * reversar cualquier línea dejaría el stock en negativo, no se borra nada.
 */
export async function eliminarLote(lote: LoteConItems): Promise<void> {
  const productoIds = [...new Set(lote.lote_items.map((li) => li.producto_id))];
  const productosActuales = await traerProductosActuales(productoIds);
  const estadoProductos = new Map<string, { stock: number; costo: number }>();

  for (const linea of lote.lote_items) {
    const nombreProducto = linea.producto?.nombre ?? "referencia";
    const actual = estadoProductos.get(linea.producto_id) ?? productosActuales.get(linea.producto_id);
    if (!actual) throw new Error(`No se encontró el producto de la línea "${nombreProducto}".`);
    estadoProductos.set(linea.producto_id, reversar(actual, linea, nombreProducto));
  }

  for (const [productoId, estado] of estadoProductos) {
    const { error: errProd } = await supabase
      .from("productos")
      .update({ stock: estado.stock, costo_unitario: estado.costo })
      .eq("id", productoId);
    if (errProd) throw new Error(`No se pudo revertir el stock del producto: ${errProd.message}`);
  }

  const { error: errLote } = await supabase.from("lotes").delete().eq("id", lote.id);
  if (errLote) throw new Error(`No se pudo eliminar el lote: ${errLote.message}`);
}
