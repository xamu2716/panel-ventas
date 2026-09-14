export type Linea = "chaqueta" | "jellycat";

export type Producto = {
  id: string;
  nombre: string;
  linea: Linea;
  costo_lote_alibaba: number;
  flete_lote: number;
  publicidad_lote: number;
  unidades_lote: number;
  costo_unitario: number;
  precio_venta: number;
  stock: number;
  umbral_stock_bajo: number;
  created_at: string;
  updated_at: string;
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
  producto: Pick<Producto, "id" | "nombre" | "linea"> | null;
};

export type GastoPublicidad = {
  id: string;
  fecha: string;
  monto: number;
  nota: string | null;
  created_at: string;
};
