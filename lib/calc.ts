/**
 * Cálculos del negocio, centralizados aquí para que el resto de la app nunca
 * tenga que sacar cuentas por su cuenta: el dueño
 * no debe escribir ni calcular precio, ganancia o margen a mano.
 */

import type { MetodoImportacion } from "./types";

export type LoteCosto = {
  alibaba: number;
  flete: number;
  publicidad: number;
  unidades: number;
};

/**
 * Costo unitario derivado del lote completo (importación por barco): lo pagado
 * en Alibaba + flete + publicidad del lote, repartido entre las unidades del
 * lote. La publicidad queda prorrateada aquí para no contarla dos veces junto
 * con el módulo de gastos de publicidad (que es solo para publicidad EXTRA no
 * ligada a un lote).
 */
export function costoUnitarioLote({ alibaba, flete, publicidad, unidades }: LoteCosto): number {
  if (!unidades || unidades <= 0) return 0;
  return (alibaba + flete + publicidad) / unidades;
}

/**
 * Costo unitario de una compra directa (Temu, Shein, local en Bogotá): lo pagado
 * por la referencia dividido entre sus unidades. No hay flete, seguro, tarifa,
 * arancel, IVA de nacionalización ni publicidad: es solo `total ÷ unidades`.
 */
export function costoUnitarioLoteDirecto({
  costoMercancia,
  unidades,
}: {
  costoMercancia: number;
  unidades: number;
}): number {
  if (!unidades || unidades <= 0) return 0;
  return costoMercancia / unidades;
}

/** IVA fijo de nacionalización usado en el costeo por avión (19%, Colombia). */
export const IVA_NACIONALIZACION_PCT = 19;

export type LoteCostoAvion = {
  alibaba: number;
  seguro: number;
  flete: number;
  arancelPct: number;
  tarifaAvion: number;
  publicidad: number;
  unidades: number;
};

/** CIF = costo de la mercancía + seguro + flete, base sobre la que se calcula el arancel. */
export function cifLote({
  alibaba,
  seguro,
  flete,
}: Pick<LoteCostoAvion, "alibaba" | "seguro" | "flete">): number {
  return alibaba + seguro + flete;
}

/**
 * Costo unitario derivado del lote completo (importación por avión):
 * ((CIF + arancel) × 1.19) + tarifa aérea + publicidad del lote, repartido
 * entre las unidades del lote. El arancel es un % único del ENVÍO completo
 * (`lotes.arancel_pct`, el mismo para todas sus líneas) aplicado sobre el CIF de
 * esta línea (ya con su parte prorrateada de seguro y flete); el IVA de
 * nacionalización se aplica sobre CIF + arancel. La tarifa aérea y la publicidad
 * del lote NO pagan arancel ni IVA y se prorratean igual que en el costeo por barco.
 */
export function costoUnitarioLoteAvion({
  alibaba,
  seguro,
  flete,
  arancelPct,
  tarifaAvion,
  publicidad,
  unidades,
}: LoteCostoAvion): number {
  if (!unidades || unidades <= 0) return 0;
  const cif = cifLote({ alibaba, seguro, flete });
  const arancel = cif * (arancelPct / 100);
  const nacionalizado = (cif + arancel) * (1 + IVA_NACIONALIZACION_PCT / 100);
  return (nacionalizado + tarifaAvion + publicidad) / unidades;
}

/**
 * Reparte un costo compartido de un lote (flete, seguro, tarifa aérea) entre las
 * unidades de una línea específica, proporcional a cuántas unidades de las del
 * lote completo son de esa línea. Es la base de "un envío trae varias
 * referencias y el flete no es solo de una".
 */
export function prorratear(total: number, unidadesLinea: number, unidadesTotalLote: number): number {
  if (!unidadesTotalLote || unidadesTotalLote <= 0) return 0;
  return (total * unidadesLinea) / unidadesTotalLote;
}

export type LineaLoteInput = {
  metodo: MetodoImportacion;
  costoMercancia: number;
  unidades: number;
  publicidad: number;
  unidadesTotalLote: number;
  fleteTotal: number;
  seguroTotal: number;
  tarifaAvionTotal: number;
  arancelPct: number;
};

export type LineaLoteResultado = {
  fleteAsignado: number;
  seguroAsignado: number;
  tarifaAsignada: number;
  costoUnitario: number;
};

/**
 * Costo unitario de una línea de un lote (una referencia dentro de un envío
 * que puede traer varias): reparte los costos compartidos del lote
 * (flete/seguro/tarifa) según las unidades de esta línea vs. el total del
 * lote, y aplica la fórmula de barco o avión correspondiente. Un solo lugar
 * para esta cuenta — la usan tanto crear un lote nuevo como editar uno ya
 * existente (ver components/inventario/LoteForm.tsx y EditarLoteForm.tsx).
 */
export function costoUnitarioLineaLote(input: LineaLoteInput): LineaLoteResultado {
  // Compra directa: no hay costos compartidos que repartir ni impuestos; se
  // ignora cualquier flete/seguro/tarifa/arancel/publicidad que llegue en el input.
  if (input.metodo === "directa") {
    return {
      fleteAsignado: 0,
      seguroAsignado: 0,
      tarifaAsignada: 0,
      costoUnitario: costoUnitarioLoteDirecto({
        costoMercancia: input.costoMercancia,
        unidades: input.unidades,
      }),
    };
  }
  const fleteAsignado = prorratear(input.fleteTotal, input.unidades, input.unidadesTotalLote);
  const seguroAsignado = prorratear(input.seguroTotal, input.unidades, input.unidadesTotalLote);
  const tarifaAsignada = prorratear(input.tarifaAvionTotal, input.unidades, input.unidadesTotalLote);
  const costoUnitario =
    input.metodo === "avion"
      ? costoUnitarioLoteAvion({
          alibaba: input.costoMercancia,
          seguro: seguroAsignado,
          flete: fleteAsignado,
          arancelPct: input.arancelPct,
          tarifaAvion: tarifaAsignada,
          publicidad: input.publicidad,
          unidades: input.unidades,
        })
      : costoUnitarioLote({
          alibaba: input.costoMercancia,
          flete: fleteAsignado,
          publicidad: input.publicidad,
          unidades: input.unidades,
        });
  return { fleteAsignado, seguroAsignado, tarifaAsignada, costoUnitario };
}

export type PromedioPonderadoInput = {
  stockActual: number;
  costoActual: number;
  unidadesNuevas: number;
  costoUnitarioNuevo: number;
};

/**
 * Costo unitario promedio ponderado (moving average) al reabastecer: mezcla lo
 * que ya había en stock a su costo actual con lo que entra a su propio costo.
 * Con stockActual = 0 da exactamente costoUnitarioNuevo (no arrastra nada del
 * costo anterior, correcto para "se quedó sin stock y se vuelve a surtir").
 */
export function costoPromedioPonderado({
  stockActual,
  costoActual,
  unidadesNuevas,
  costoUnitarioNuevo,
}: PromedioPonderadoInput): number {
  const unidadesTotales = stockActual + unidadesNuevas;
  if (unidadesTotales <= 0) return 0;
  return (stockActual * costoActual + unidadesNuevas * costoUnitarioNuevo) / unidadesTotales;
}

export type ReversarLineaInput = {
  stockActual: number;
  costoActual: number;
  unidades: number;
  costoUnitario: number;
};

/**
 * Inverso de costoPromedioPonderado: el estado (stock, costo) de un producto
 * ANTES de que se le aplicara esta línea de lote. Solo es exacto si esta línea
 * fue la última compra registrada de esa referencia (nada más se sumó
 * después) — es la base para poder editar/eliminar el lote más reciente de
 * cada referencia sin tener que reproducir todo el historial de compras.
 */
export function reversarLinea({
  stockActual,
  costoActual,
  unidades,
  costoUnitario,
}: ReversarLineaInput): { stock: number; costo: number } {
  const stockAntes = stockActual - unidades;
  if (stockAntes <= 0) return { stock: Math.max(stockAntes, 0), costo: 0 };
  const costoAntes = (costoActual * stockActual - unidades * costoUnitario) / stockAntes;
  return { stock: stockAntes, costo: costoAntes };
}

export function gananciaUnidad(precioVenta: number, costoUnitario: number): number {
  return precioVenta - costoUnitario;
}

export function margenPct(precioVenta: number, costoUnitario: number): number {
  if (!precioVenta || precioVenta <= 0) return 0;
  return (gananciaUnidad(precioVenta, costoUnitario) / precioVenta) * 100;
}

/**
 * Publicidad por unidad de una referencia: el total de gastos de publicidad
 * asignados a ella (tabla `gastos_publicidad`, ej. un boost de $32.000) repartido
 * entre TODAS las unidades que se han comprado de esa referencia (suma de las
 * unidades de todos sus lotes: 10 + 10 chaquetas = 20), no entre el stock actual:
 * así el número no cambia al vender ni con un ajuste manual de stock. Sin
 * unidades compradas da 0 (evita dividir por cero).
 */
export function publicidadPorUnidad(totalAsignado: number, unidadesCompradas: number): number {
  if (!unidadesCompradas || unidadesCompradas <= 0) return 0;
  return totalAsignado / unidadesCompradas;
}

/**
 * Costo unitario "real" para mirar la rentabilidad de una referencia: su costo
 * unitario actual (que ya incluye la publicidad que viaja DENTRO de los lotes)
 * más la publicidad asignada por unidad. Es un valor derivado solo para mostrar:
 * nunca se guarda en `productos.costo_unitario` (eso inflaría el stock valorado y
 * contaría la publicidad dos veces en la ganancia neta).
 */
export function costoConPublicidad(costoUnitario: number, publicidadUnidad: number): number {
  return costoUnitario + publicidadUnidad;
}

export function totalPedido(precioUnitario: number, cantidad: number): number {
  return precioUnitario * cantidad;
}

export function gananciaPedido(
  precioUnitario: number,
  costoUnitario: number,
  cantidad: number,
): number {
  return gananciaUnidad(precioUnitario, costoUnitario) * cantidad;
}

/** Lo mínimo que necesita saber de un pedido para acumular lo realmente vendido. */
export type VentaLinea = {
  cantidad: number;
  precio_unitario_snapshot: number;
  costo_unitario_snapshot: number;
};

export type ResumenVentas = {
  unidades: number;
  ingresos: number;
  ganancia: number;
  /** Ingresos ÷ unidades: el precio promedio al que se vendió de verdad (0 sin ventas). */
  precioPromedio: number;
  /** Ganancia ÷ ingresos, en % (0 sin ventas). */
  margenPct: number;
};

/**
 * Acumula lo realmente vendido: cada pedido aporta su PROPIO precio y su propio
 * costo (snapshots), así que 4 unidades vendidas a 10, 20, 15 y 18 suman 63 de
 * ingresos aunque el precio publicado fuera otro. El precio publicado del producto
 * (`productos.precio_venta`) es solo una referencia y nunca entra aquí.
 * Recibe los pedidos ya filtrados (normalmente los entregados).
 */
export function resumenVentas(ventas: VentaLinea[]): ResumenVentas {
  let unidades = 0;
  let ingresos = 0;
  let ganancia = 0;
  for (const v of ventas) {
    unidades += v.cantidad;
    ingresos += totalPedido(v.precio_unitario_snapshot, v.cantidad);
    ganancia += gananciaPedido(v.precio_unitario_snapshot, v.costo_unitario_snapshot, v.cantidad);
  }
  return {
    unidades,
    ingresos,
    ganancia,
    precioPromedio: unidades > 0 ? ingresos / unidades : 0,
    margenPct: ingresos > 0 ? (ganancia / ingresos) * 100 : 0,
  };
}

/**
 * Margen "real" de lo vendido incluyendo la publicidad asignada a la referencia:
 * a la ganancia de lo vendido se le resta `publicidadUnidad` por cada unidad
 * vendida (ver `publicidadPorUnidad`), sobre los ingresos reales. Sin ventas da 0.
 */
export function margenRealPct(resumen: ResumenVentas, publicidadUnidad: number): number {
  if (resumen.ingresos <= 0) return 0;
  return ((resumen.ganancia - publicidadUnidad * resumen.unidades) / resumen.ingresos) * 100;
}

/** Cuánto por debajo del precio publicado se vendió, en % (0 si no hubo rebaja o no hay publicado). */
export function rebajaPct(precioPublicado: number, precioVendido: number): number {
  if (!precioPublicado || precioPublicado <= 0) return 0;
  return Math.max(0, ((precioPublicado - precioVendido) / precioPublicado) * 100);
}

export function stockBajo(stock: number, umbral: number): boolean {
  return stock <= umbral;
}

export function diasDesde(fechaIso: string): number {
  const ms = Date.now() - new Date(fechaIso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(valor: number): string {
  if (!Number.isFinite(valor)) return copFormatter.format(0);
  return copFormatter.format(valor);
}

const copCompactFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Versión corta ("$1.2M") para ejes de gráfica donde el espacio es angosto. */
export function formatCOPCompact(valor: number): string {
  if (!Number.isFinite(valor)) return copCompactFormatter.format(0);
  return copCompactFormatter.format(valor);
}

/**
 * Fecha LOCAL ("AAAA-MM-DD") de un instante guardado como timestamptz (ej.
 * `pedidos.estado_actualizado_en`, que llega en UTC). Cortar el texto con
 * `.slice(0, 10)` toma la fecha UTC y mueve al día siguiente todo lo que pasa
 * después de las 7 pm en Colombia (UTC-5); por eso se arma con los componentes
 * locales, igual que `formatFecha`. Úsala para agrupar por día.
 */
export function fechaLocal(instanteIso: string): string {
  const d = new Date(instanteIso);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Formatea una fecha para mostrar. Las fechas "solo fecha" de Postgres (columnas
 * `date`, ej. gastos_publicidad.fecha) llegan como "AAAA-MM-DD" sin hora, y
 * `new Date("AAAA-MM-DD")` las interpreta como medianoche UTC — en Colombia
 * (UTC-5) eso se muestra como el día anterior. Para esas, se arman los
 * componentes en hora local en vez de dejar que el constructor de Date asuma UTC.
 */
export function formatFecha(fechaIso: string): string {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaIso);
  const fecha = soloFecha
    ? (() => {
        const [anio, mes, dia] = fechaIso.split("-").map(Number);
        return new Date(anio, mes - 1, dia);
      })()
    : new Date(fechaIso);
  return fecha.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
