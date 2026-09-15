export type MetodoImportacion = "barco" | "avion";

/**
 * Identidad de una referencia + agregados vivos. El costeo real (de dónde sale
 * costo_unitario) vive en `Lote`/`LoteItem`: cada reabastecimiento es una compra
 * nueva con sus propios costos, y varias referencias pueden compartir un mismo
 * lote (mismo envío). `costo_unitario` es el promedio ponderado acumulado de
 * todos los lotes recibidos hasta ahora (editable a mano como ajuste puntual).
 */
export type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  arancel_pct: number;
  costo_unitario: number;
  precio_venta: number;
  stock: number;
  umbral_stock_bajo: number;
  created_at: string;
  updated_at: string;
};

/** Un envío/compra real: costos compartidos entre todas sus líneas (lote_items). */
export type Lote = {
  id: string;
  fecha: string;
  metodo_importacion: MetodoImportacion;
  flete_total: number;
  seguro_total: number;
  tarifa_avion_total: number;
  notas: string | null;
  created_at: string;
};

/** Una línea de un lote: una referencia, sus unidades y su costo resultante ya calculado. */
export type LoteItem = {
  id: string;
  lote_id: string;
  producto_id: string;
  costo_mercancia: number;
  unidades: number;
  publicidad: number;
  costo_unitario_resultante: number;
  created_at: string;
};

/** Lote con sus líneas incluidas (join de Supabase), cada línea con el nombre del producto. */
export type LoteConItems = Lote & {
  lote_items: (LoteItem & { producto: Pick<Producto, "id" | "nombre"> | null })[];
};

export type TipoEntrega = "recoge" | "domicilio";
export type EstadoPedido = "nuevo" | "apartado" | "listo" | "entregado";

export const ESTADOS: EstadoPedido[] = ["nuevo", "apartado", "listo", "entregado"];

export const ESTADO_LABEL: Record<EstadoPedido, string> = {
  nuevo: "Nuevo",
  apartado: "Apartado",
  listo: "Listo para entregar",
  entregado: "Entregado",
};

export type Pedido = {
  id: string;
  cliente: string;
  telefono: string | null;
  producto_id: string;
  cantidad: number;
  tipo_entrega: TipoEntrega;
  direccion: string | null;
  estado: EstadoPedido;
  notas: string | null;
  precio_unitario_snapshot: number;
  costo_unitario_snapshot: number;
  estado_actualizado_en: string;
  created_at: string;
  updated_at: string;
};

/** Pedido con el producto asociado incluido (join de Supabase). */
export type PedidoConProducto = Pedido & {
  producto: Pick<Producto, "id" | "nombre" | "categoria"> | null;
};

export type GastoPublicidad = {
  id: string;
  fecha: string;
  monto: number;
  nota: string | null;
  created_at: string;
};
