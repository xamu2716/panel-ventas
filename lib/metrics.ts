import { ESTADOS, ESTADO_LABEL, type GastoPublicidad, type PedidoConProducto, type Producto } from "./types";
import { gananciaPedido, margenPct, totalPedido } from "./calc";

/**
 * Toda la lógica de agregación para la vista de Resumen, en un solo lugar:
 * KPIs y datos listos para cada gráfica. Cada función es pura (recibe los
 * datos ya cargados, no toca la red) para poder revisarla/probarla aparte.
 */

export function computeKpis(
  pedidos: PedidoConProducto[],
  productos: Producto[],
  gastos: GastoPublicidad[],
) {
  const entregados = pedidos.filter((p) => p.estado === "entregado");
  const pendientes = pedidos.filter((p) => p.estado !== "entregado");

  const ingresos = entregados.reduce(
    (acc, p) => acc + totalPedido(p.precio_unitario_snapshot, p.cantidad),
    0,
  );
  const gananciaBruta = entregados.reduce(
    (acc, p) =>
      acc + gananciaPedido(p.precio_unitario_snapshot, p.costo_unitario_snapshot, p.cantidad),
    0,
  );
  const gastoExtra = gastos.reduce((acc, g) => acc + g.monto, 0);
  // La publicidad de cada lote ya está prorrateada dentro de costo_unitario_snapshot;
  // solo la publicidad EXTRA del módulo se resta aquí, para no contarla dos veces.
  const gananciaNeta = gananciaBruta - gastoExtra;
  const pendiente = pendientes.reduce(
    (acc, p) => acc + totalPedido(p.precio_unitario_snapshot, p.cantidad),
    0,
  );
  const stockValorado = productos.reduce((acc, p) => acc + p.stock * p.costo_unitario, 0);
  const publicidadLotes = productos.reduce((acc, p) => acc + p.publicidad_lote, 0);
  // Informativo: publicidad de lotes (ya en el costo) + publicidad extra. No se
  // vuelve a restar de la ganancia neta, solo se muestra como referencia.
  const gastoPublicidadTotal = publicidadLotes + gastoExtra;

  return { ingresos, gananciaNeta, pendiente, stockValorado, gastoPublicidadTotal };
}

export function ventasPorDia(pedidos: PedidoConProducto[]) {
  const entregados = pedidos.filter((p) => p.estado === "entregado");
  const map = new Map<string, { ingresos: number; ganancia: number }>();
  for (const p of entregados) {
    const fecha = p.estado_actualizado_en.slice(0, 10);
    const cur = map.get(fecha) ?? { ingresos: 0, ganancia: 0 };
    cur.ingresos += totalPedido(p.precio_unitario_snapshot, p.cantidad);
    cur.ganancia += gananciaPedido(p.precio_unitario_snapshot, p.costo_unitario_snapshot, p.cantidad);
    map.set(fecha, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, v]) => ({ fecha, ...v }));
}

export function ventasPorProducto(pedidos: PedidoConProducto[], productos: Producto[]) {
  const entregados = pedidos.filter((p) => p.estado === "entregado");
  return productos.map((prod) => {
    const suyos = entregados.filter((p) => p.producto_id === prod.id);
    return {
      nombre: prod.nombre,
      linea: prod.linea,
      unidades: suyos.reduce((a, p) => a + p.cantidad, 0),
      ingresos: suyos.reduce((a, p) => a + totalPedido(p.precio_unitario_snapshot, p.cantidad), 0),
    };
  });
}

export function margenPorProducto(productos: Producto[]) {
  return productos.map((p) => ({
    nombre: p.nombre,
    linea: p.linea,
    margen: margenPct(p.precio_venta, p.costo_unitario),
  }));
}

export function distribucionEntrega(pedidos: PedidoConProducto[]) {
  return [
    { name: "Recoge en casa", value: pedidos.filter((p) => p.tipo_entrega === "recoge").length },
    { name: "Domicilio", value: pedidos.filter((p) => p.tipo_entrega === "domicilio").length },
  ];
}

export function stockPorProducto(productos: Producto[]) {
  return productos.map((p) => ({
    nombre: p.nombre,
    linea: p.linea,
    stock: p.stock,
    bajo: p.stock <= p.umbral_stock_bajo,
  }));
}

export function pedidosPorEstado(pedidos: PedidoConProducto[]) {
  return ESTADOS.map((e) => ({
    estado: e,
    label: ESTADO_LABEL[e],
    count: pedidos.filter((p) => p.estado === e).length,
  }));
}

export function desglosePorProducto(pedidos: PedidoConProducto[], productos: Producto[]) {
  return productos.map((prod) => {
    const deProd = pedidos.filter((p) => p.producto_id === prod.id);
    return {
      nombre: prod.nombre,
      linea: prod.linea,
      vendido: deProd.filter((p) => p.estado === "entregado").reduce((a, p) => a + p.cantidad, 0),
      pendiente: deProd
        .filter((p) => p.estado !== "entregado")
        .reduce((a, p) => a + p.cantidad, 0),
      margen: margenPct(prod.precio_venta, prod.costo_unitario),
    };
  });
}
