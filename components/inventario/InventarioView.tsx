"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { Producto } from "@/lib/types";
import { categoriasDisponibles } from "@/lib/metrics";
import { Button, EmptyState } from "@/components/ui";
import { IconBox, IconPlus } from "@/components/icons";
import { ProductoForm } from "./ProductoForm";
import { ProductoCard } from "./ProductoCard";
import { LoteForm } from "./LoteForm";
import { LotesHistorial } from "./LotesHistorial";

async function fetchProductos() {
  return supabase.from("productos").select("*").order("nombre", { ascending: true });
}

export function InventarioView() {
  const { data: productos, loading, error, reload } = useRealtimeQuery<Producto>(
    "productos",
    fetchProductos,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [loteFormOpen, setLoteFormOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | undefined>(undefined);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const categorias = useMemo(() => categoriasDisponibles(productos), [productos]);

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEditar(p: Producto) {
    setEditando(p);
    setFormOpen(true);
  }

  async function eliminar(p: Producto) {
    setDeleteError(null);
    if (!window.confirm(`¿Eliminar "${p.nombre}" del inventario?`)) return;
    const { error } = await supabase.from("productos").delete().eq("id", p.id);
    if (error) {
      setDeleteError(
        error.code === "23503"
          ? `No se puede eliminar "${p.nombre}": tiene pedidos o lotes asociados.`
          : error.message,
      );
      return;
    }
    reload();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Inventario</h1>
          <p className="text-sm text-ink-muted">Referencias, lotes de compra y stock.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={abrirNuevo}>
            <IconPlus size={18} /> Nueva referencia
          </Button>
          <Button onClick={() => setLoteFormOpen(true)}>
            <IconBox size={18} /> Nuevo lote
          </Button>
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="mt-4 rounded-md bg-alert-soft px-3 py-2 text-sm text-alert">
          {deleteError}
        </p>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-muted">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-alert">No se pudo cargar el inventario: {error}</p>
        ) : productos.length === 0 ? (
          <EmptyState
            title="Todavía no hay referencias"
            hint="Crea una referencia y después registra su primer lote para cargarle stock y costo."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {productos.map((p) => (
              <ProductoCard
                key={p.id}
                producto={p}
                categoriasOrdenadas={categorias}
                onEdit={() => abrirEditar(p)}
                onDelete={() => eliminar(p)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-xl text-ink">Historial de lotes</h2>
        <LotesHistorial />
      </div>

      {formOpen && (
        <ProductoForm
          producto={editando}
          categoriasExistentes={categorias}
          onClose={() => setFormOpen(false)}
          onSaved={reload}
        />
      )}

      {loteFormOpen && (
        <LoteForm
          productos={productos}
          categoriasExistentes={categorias}
          onClose={() => setLoteFormOpen(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
