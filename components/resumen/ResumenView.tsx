"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { GastoPublicidad, PedidoConProducto, Producto } from "@/lib/types";
import {
  computeKpis,
  desglosePorProducto,
  distribucionEntrega,
  margenPorProducto,
  pedidosPorEstado,
  stockPorProducto,
  ventasPorDia,
  ventasPorProducto,
} from "@/lib/metrics";
import { KpiTiles } from "./KpiTiles";
import { DesgloseTabla } from "./DesgloseTabla";
import {
  EntregaDonutChart,
  EstadoBarChart,
  IngresosLineChart,
  MargenPorProductoChart,
  StockPorProductoChart,
  VentasPorProductoChart,
} from "./charts";

async function fetchPedidos() {
  return supabase
    .from("pedidos")
    .select("*, producto:productos(id,nombre,linea)")
    .order("created_at", { ascending: true });
}

async function fetchProductos() {
  return supabase.from("productos").select("*").order("nombre", { ascending: true });
}

async function fetchGastos() {
  return supabase.from("gastos_publicidad").select("*");
}

export function ResumenView() {
  const { data: pedidos, loading: l1 } = useRealtimeQuery<PedidoConProducto>(
    "pedidos",
    fetchPedidos,
  );
  const { data: productos, loading: l2 } = useRealtimeQuery<Producto>("productos", fetchProductos);
  const { data: gastos, loading: l3 } = useRealtimeQuery<GastoPublicidad>(
    "gastos_publicidad",
    fetchGastos,
  );

  const loading = l1 || l2 || l3;
  const kpis = computeKpis(pedidos, productos, gastos);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <h1 className="font-display text-2xl text-ink">Resumen</h1>
      <p className="text-sm text-ink-muted">Números del negocio, chaquetas y Jellycat juntos.</p>

      {loading ? (
        <p className="mt-6 text-sm text-ink-muted">Cargando…</p>
      ) : (
        <>
          <div className="mt-6">
            <KpiTiles {...kpis} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <IngresosLineChart data={ventasPorDia(pedidos)} />
            <EstadoBarChart data={pedidosPorEstado(pedidos)} />
            <VentasPorProductoChart data={ventasPorProducto(pedidos, productos)} />
            <MargenPorProductoChart data={margenPorProducto(productos)} />
            <EntregaDonutChart data={distribucionEntrega(pedidos)} />
            <StockPorProductoChart data={stockPorProducto(productos)} />
          </div>

          <div className="mt-8">
            <h2 className="mb-3 font-display text-xl text-ink">Desglose por producto</h2>
            <DesgloseTabla filas={desglosePorProducto(pedidos, productos)} />
          </div>
        </>
      )}
    </div>
  );
}
