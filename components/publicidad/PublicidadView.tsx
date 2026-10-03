"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { GastoPublicidad, Producto } from "@/lib/types";
import { formatCOP, formatFecha } from "@/lib/calc";
import { categoriasDisponibles } from "@/lib/metrics";
import { Badge, Button, EmptyState } from "@/components/ui";
import { CategoriaBadge } from "@/components/CategoriaBadge";
import { IconPencil, IconPlus, IconTrash } from "@/components/icons";
import { GastoForm } from "./GastoForm";

async function fetchGastos() {
  return supabase
    .from("gastos_publicidad")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
}

async function fetchProductos() {
  return supabase.from("productos").select("*").order("nombre", { ascending: true });
}

export function PublicidadView() {
  const { data: gastos, loading, error, reload } = useRealtimeQuery<GastoPublicidad>(
    "gastos_publicidad",
    fetchGastos,
  );
  const { data: productos } = useRealtimeQuery<Producto>("productos", fetchProductos);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<GastoPublicidad | undefined>(undefined);

  const categorias = useMemo(() => categoriasDisponibles(productos), [productos]);
  const productoPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const total = gastos.reduce((acc, g) => acc + g.monto, 0);

  // Resumen: cuánto lleva asignado cada referencia y cuánto queda como gasto general.
  const { porProducto, general } = useMemo(() => {
    const map = new Map<string, number>();
    let general = 0;
    for (const g of gastos) {
      if (g.producto_id && productoPorId.has(g.producto_id)) {
        map.set(g.producto_id, (map.get(g.producto_id) ?? 0) + g.monto);
      } else {
        general += g.monto;
      }
    }
    const porProducto = [...map.entries()]
      .map(([id, monto]) => ({ producto: productoPorId.get(id)!, monto }))
      .sort((a, b) => b.monto - a.monto);
    return { porProducto, general };
  }, [gastos, productoPorId]);

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEditar(g: GastoPublicidad) {
    setEditando(g);
    setFormOpen(true);
  }

  async function eliminar(g: GastoPublicidad) {
    if (!window.confirm("¿Eliminar este gasto de publicidad?")) return;
    await supabase.from("gastos_publicidad").delete().eq("id", g.id);
    reload();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Publicidad</h1>
          <p className="text-sm text-ink-muted">
            Gasto extra, fuera del costo de un lote. Asígnalo a una referencia para ver su ganancia real.
          </p>
        </div>
        <Button onClick={abrirNuevo}>
          <IconPlus size={18} /> Registrar
        </Button>
      </div>

      <div className="mt-5 rounded-md border border-line bg-surface px-4 py-4">
        <p className="text-sm text-ink-muted">Total invertido</p>
        <p className="font-display text-2xl text-accent-strong">{formatCOP(total)}</p>
        {gastos.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 text-sm" aria-label="Total por producto">
            {porProducto.map(({ producto, monto }) => (
              <li key={producto.id} className="flex items-center justify-between gap-3">
                <span className="text-ink">{producto.nombre}</span>
                <span className="tabular font-medium text-ink">{formatCOP(monto)}</span>
              </li>
            ))}
            {general > 0 && (
              <li className="flex items-center justify-between gap-3">
                <span className="text-ink-muted">General (sin asignar)</span>
                <span className="tabular font-medium text-ink">{formatCOP(general)}</span>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-muted">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-alert">No se pudo cargar: {error}</p>
        ) : gastos.length === 0 ? (
          <EmptyState title="Sin gastos registrados" hint="Registra el primero cuando impulses una publicación." />
        ) : (
          <ul className="flex flex-col gap-2">
            {gastos.map((g) => {
              const producto = g.producto_id ? productoPorId.get(g.producto_id) : undefined;
              return (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="tabular font-medium text-ink">{formatCOP(g.monto)}</p>
                    <p className="text-xs text-ink-muted">
                      {formatFecha(g.fecha)}
                      {g.nota ? ` · ${g.nota}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {producto ? (
                        <>
                          <span className="text-xs font-medium text-ink">{producto.nombre}</span>
                          <CategoriaBadge categoria={producto.categoria} categoriasOrdenadas={categorias} />
                        </>
                      ) : (
                        <Badge>General</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => abrirEditar(g)}
                      aria-label="Editar gasto"
                      className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-paper"
                    >
                      <IconPencil size={18} />
                    </button>
                    <button
                      onClick={() => eliminar(g)}
                      aria-label="Eliminar gasto"
                      className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-alert-soft hover:text-alert"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {formOpen && (
        <GastoForm
          productos={productos}
          gasto={editando}
          onClose={() => setFormOpen(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
