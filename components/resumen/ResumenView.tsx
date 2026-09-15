"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { GastoPublicidad, LoteItem, PedidoConProducto, Producto } from "@/lib/types";
import {
  capitalPorCategoria,
  capitalPorProducto,
  categoriasDisponibles,
  computeKpis,
  desglosePorProducto,
  distribucionEntrega,
  pedidosPorEstado,
  stockPorProducto,
  ventasPorCategoria,
  ventasPorDia,
  ventasPorProducto,
  ventasPorProductoEnTiempo,
} from "@/lib/metrics";
import { KpiTiles } from "./KpiTiles";
import { DesgloseTabla } from "./DesgloseTabla";
import { colorCategoria } from "@/lib/chartColors";
import {
  CapitalPorCategoriaChart,
  CapitalPorProductoChart,
  EntregaDonutChart,
  EstadoBarChart,
  IngresosLineChart,
  StockPorProductoChart,
  VentasPorCategoriaChart,
  VentasPorProductoChart,
  VentasPorProductoTiempoChart,
} from "./charts";

async function fetchPedidos() {
  return supabase
    .from("pedidos")
    .select("*, producto:productos(id,nombre,categoria)")
    .order("created_at", { ascending: true });
}

async function fetchProductos() {
  return supabase.from("productos").select("*").order("nombre", { ascending: true });
}

async function fetchGastos() {
  return supabase.from("gastos_publicidad").select("*");
}

async function fetchLoteItems() {
  return supabase.from("lote_items").select("*");
}

const TODAS = "todas" as const;

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
  const { data: loteItems, loading: l4 } = useRealtimeQuery<LoteItem>("lote_items", fetchLoteItems);

  const loading = l1 || l2 || l3 || l4;
  const [categoriaSel, setCategoriaSel] = useState<string>(TODAS);

  const categorias = useMemo(() => categoriasDisponibles(productos), [productos]);

  const productosFiltrados = useMemo(
    () => (categoriaSel === TODAS ? productos : productos.filter((p) => p.categoria === categoriaSel)),
    [productos, categoriaSel],
  );
  const pedidosFiltrados = useMemo(
    () =>
      categoriaSel === TODAS
        ? pedidos
        : pedidos.filter((p) => p.producto?.categoria === categoriaSel),
    [pedidos, categoriaSel],
  );

  const kpis = computeKpis(pedidosFiltrados, productosFiltrados, gastos, loteItems);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <h1 className="font-display text-2xl text-ink">Resumen</h1>
      <p className="text-sm text-ink-muted">Números del negocio, por categoría o todos juntos.</p>

      {loading ? (
        <p className="mt-6 text-sm text-ink-muted">Cargando…</p>
      ) : (
        <>
          {categorias.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por categoría">
              <button
                type="button"
                role="tab"
                aria-selected={categoriaSel === TODAS}
                onClick={() => setCategoriaSel(TODAS)}
                className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  categoriaSel === TODAS
                    ? "border-accent bg-accent-soft text-accent-strong"
                    : "border-line-strong bg-surface text-ink-muted hover:bg-paper"
                }`}
              >
                Todas
              </button>
              {categorias.map((c) => {
                const activa = categoriaSel === c;
                const color = colorCategoria(c, categorias);
                return (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={activa}
                    onClick={() => setCategoriaSel(c)}
                    className={`flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                      activa
                        ? "border-accent bg-accent-soft text-accent-strong"
                        : "border-line-strong bg-surface text-ink-muted hover:bg-paper"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    {c}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6">
            <KpiTiles {...kpis} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <IngresosLineChart data={ventasPorDia(pedidosFiltrados)} />
            <EstadoBarChart data={pedidosPorEstado(pedidosFiltrados)} />
            <VentasPorProductoChart
              data={ventasPorProducto(pedidosFiltrados, productosFiltrados)}
              categoriasOrdenadas={categorias}
            />
            <CapitalPorProductoChart
              data={capitalPorProducto(productosFiltrados)}
              categoriasOrdenadas={categorias}
            />
            <EntregaDonutChart data={distribucionEntrega(pedidosFiltrados)} />
            <StockPorProductoChart
              data={stockPorProducto(productosFiltrados)}
              categoriasOrdenadas={categorias}
            />
            {categoriaSel === TODAS ? (
              <>
                <VentasPorCategoriaChart data={ventasPorCategoria(pedidos, productos)} />
                <CapitalPorCategoriaChart data={capitalPorCategoria(productos)} />
              </>
            ) : (
              <VentasPorProductoTiempoChart
                data={ventasPorProductoEnTiempo(pedidosFiltrados, productosFiltrados)}
                productos={productosFiltrados.map((p) => p.nombre)}
              />
            )}
          </div>

          <div className="mt-8">
            <h2 className="mb-3 font-display text-xl text-ink">Desglose por producto</h2>
            <DesgloseTabla
              filas={desglosePorProducto(pedidosFiltrados, productosFiltrados)}
              categoriasOrdenadas={categorias}
            />
          </div>
        </>
      )}
    </div>
  );
}
