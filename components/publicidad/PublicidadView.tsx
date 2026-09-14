"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { GastoPublicidad } from "@/lib/types";
import { formatCOP, formatFecha } from "@/lib/calc";
import { Button, EmptyState } from "@/components/ui";
import { IconPlus, IconTrash } from "@/components/icons";
import { GastoForm } from "./GastoForm";

async function fetchGastos() {
  return supabase
    .from("gastos_publicidad")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
}

export function PublicidadView() {
  const { data: gastos, loading, error, reload } = useRealtimeQuery<GastoPublicidad>(
    "gastos_publicidad",
    fetchGastos,
  );
  const [formOpen, setFormOpen] = useState(false);

  const total = gastos.reduce((acc, g) => acc + g.monto, 0);

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
          <p className="text-sm text-ink-muted">Gasto extra, no incluido en el costo de un lote.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <IconPlus size={18} /> Registrar
        </Button>
      </div>

      <div className="mt-5 rounded-md border border-line bg-surface px-4 py-4">
        <p className="text-sm text-ink-muted">Total invertido</p>
        <p className="font-display text-2xl text-accent-strong">{formatCOP(total)}</p>
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
            {gastos.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3"
              >
                <div>
                  <p className="tabular font-medium text-ink">{formatCOP(g.monto)}</p>
                  <p className="text-xs text-ink-muted">
                    {formatFecha(g.fecha)}
                    {g.nota ? ` · ${g.nota}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => eliminar(g)}
                  aria-label="Eliminar gasto"
                  className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-alert-soft hover:text-alert"
                >
                  <IconTrash size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && <GastoForm onClose={() => setFormOpen(false)} onSaved={reload} />}
    </div>
  );
}
