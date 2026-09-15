"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { LoteConItems } from "@/lib/types";
import { formatCOP, formatFecha } from "@/lib/calc";
import { Badge, EmptyState } from "@/components/ui";

async function fetchLotes() {
  return supabase
    .from("lotes")
    .select("*, lote_items(*, producto:productos(id,nombre))")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
}

/**
 * Solo lectura: un lote es un libro de compras, no se edita ni se elimina
 * desde la UI (ver CLAUDE.md / plan de lotes). Para corregir un error puntual
 * está el ajuste manual de stock/costo en "Editar referencia".
 */
export function LotesHistorial() {
  const { data: lotes, loading, error } = useRealtimeQuery<LoteConItems>("lotes", fetchLotes);

  if (loading) return <p className="text-sm text-ink-muted">Cargando…</p>;
  if (error) return <p className="text-sm text-alert">No se pudo cargar el historial: {error}</p>;
  if (lotes.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay lotes registrados"
        hint="Cada compra que registres con &quot;Nuevo lote&quot; va a quedar aquí."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {lotes.map((lote) => {
        const unidadesTotal = lote.lote_items.reduce((a, li) => a + li.unidades, 0);
        return (
          <li key={lote.id} className="rounded-md border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{formatFecha(lote.fecha)}</span>
                <Badge tone="neutral">{lote.metodo_importacion === "avion" ? "Avión" : "Barco"}</Badge>
                <span className="text-sm text-ink-muted">{unidadesTotal} unidad(es)</span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span>
                Flete: <span className="tabular font-medium text-ink">{formatCOP(lote.flete_total)}</span>
              </span>
              {lote.metodo_importacion === "avion" && (
                <>
                  <span>
                    Seguro: <span className="tabular font-medium text-ink">{formatCOP(lote.seguro_total)}</span>
                  </span>
                  <span>
                    Tarifa aérea:{" "}
                    <span className="tabular font-medium text-ink">{formatCOP(lote.tarifa_avion_total)}</span>
                  </span>
                  <span>
                    Arancel: <span className="tabular font-medium text-ink">{lote.arancel_pct}%</span>
                  </span>
                </>
              )}
            </div>

            {lote.notas && <p className="mt-2 text-xs italic text-ink-muted">{lote.notas}</p>}

            <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
              {lote.lote_items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink">
                    {item.producto?.nombre ?? "Referencia eliminada"} × {item.unidades}
                  </span>
                  <span className="tabular font-medium text-ink-muted">
                    {formatCOP(item.costo_unitario_resultante)} / und.
                  </span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
