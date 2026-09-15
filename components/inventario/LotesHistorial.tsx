"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { LoteConItems } from "@/lib/types";
import { formatCOP, formatFecha } from "@/lib/calc";
import { esLoteEditable, eliminarLote } from "@/lib/lotesSync";
import { Badge, EmptyState } from "@/components/ui";
import { IconPencil, IconTrash } from "@/components/icons";
import { EditarLoteForm } from "./EditarLoteForm";

async function fetchLotes() {
  return supabase
    .from("lotes")
    .select("*, lote_items(*, producto:productos(id,nombre))")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
}

/**
 * Historial de lotes. Un lote solo se puede editar o eliminar si ninguna de
 * sus líneas quedó "vieja" (es decir, si ninguna referencia suya tuvo otra
 * compra registrada después) — ver `esLoteEditable` en lib/lotesSync.ts. Si
 * no cumple, se muestra sin botones y con una nota explicando por qué.
 */
export function LotesHistorial() {
  const { data: lotes, loading, error, reload } = useRealtimeQuery<LoteConItems>("lotes", fetchLotes);
  const [editando, setEditando] = useState<LoteConItems | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const todosLosLoteItems = useMemo(() => lotes.flatMap((l) => l.lote_items), [lotes]);

  async function handleEliminar(lote: LoteConItems) {
    setDeleteError(null);
    if (
      !window.confirm(
        `¿Eliminar el lote del ${formatFecha(lote.fecha)}? Esto revierte el stock y el costo de sus referencias al estado anterior a esta compra.`,
      )
    ) {
      return;
    }
    setEliminando(lote.id);
    try {
      await eliminarLote(lote);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar el lote.");
    } finally {
      setEliminando(null);
    }
  }

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
    <>
      {deleteError && (
        <p role="alert" className="mb-3 rounded-md bg-alert-soft px-3 py-2 text-sm text-alert">
          {deleteError}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {lotes.map((lote) => {
          const unidadesTotal = lote.lote_items.reduce((a, li) => a + li.unidades, 0);
          const { editable, referenciaQueBloquea } = esLoteEditable(lote, todosLosLoteItems);
          return (
            <li key={lote.id} className="rounded-md border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{formatFecha(lote.fecha)}</span>
                  <Badge tone="neutral">{lote.metodo_importacion === "avion" ? "Avión" : "Barco"}</Badge>
                  <span className="text-sm text-ink-muted">{unidadesTotal} unidad(es)</span>
                </div>
                {editable && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditando(lote)}
                      aria-label={`Editar lote del ${formatFecha(lote.fecha)}`}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-paper"
                    >
                      <IconPencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(lote)}
                      disabled={eliminando === lote.id}
                      aria-label={`Eliminar lote del ${formatFecha(lote.fecha)}`}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-alert-soft hover:text-alert disabled:opacity-50"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                )}
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

              {!editable && (
                <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
                  Ya registraste otra compra de &quot;{referenciaQueBloquea}&quot; después de este lote — para
                  corregirlo, ajusta el costo o el stock a mano en &quot;Editar referencia&quot;.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {editando && (
        <EditarLoteForm
          lote={editando}
          onClose={() => setEditando(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}
