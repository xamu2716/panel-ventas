/**
 * Cálculos del negocio, centralizados aquí para que el resto de la app nunca
 * tenga que sacar cuentas por su cuenta. Ver CLAUDE.md / prompt.md: el dueño
 * no debe escribir ni calcular precio, ganancia o margen a mano.
 */

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
 * entre las unidades del lote. El arancel es un % propio de cada referencia
 * (varía según el producto) aplicado sobre el CIF; el IVA de nacionalización
 * se aplica sobre CIF + arancel. La tarifa aérea y la publicidad son cargos
 * del lote y se prorratean igual que en el costeo por barco.
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
  metodo: "barco" | "avion";
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

export function gananciaUnidad(precioVenta: number, costoUnitario: number): number {
  return precioVenta - costoUnitario;
}

export function margenPct(precioVenta: number, costoUnitario: number): number {
  if (!precioVenta || precioVenta <= 0) return 0;
  return (gananciaUnidad(precioVenta, costoUnitario) / precioVenta) * 100;
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
