"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { Producto } from "@/lib/types";
import { Button, EmptyState } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { ProductoForm } from "./ProductoForm";
import { ProductoCard } from "./ProductoCard";

async function fetchProductos() {
  return supabase.from("productos").select("*").order("nombre", { ascending: true });
}

export function InventarioView() {
  const { data: productos, loading, error, reload } = useRealtimeQuery<Producto>(
    "productos",
    fetchProductos,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | undefined>(undefined);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
          ? `No se puede eliminar "${p.nombre}": tiene pedidos asociados.`
          : error.message,
      );
      return;
    }
    reload();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Inventario</h1>
          <p className="text-sm text-ink-muted">Referencias, costo por lote y stock.</p>
        </div>
        <Button onClick={abrirNuevo}>
          <IconPlus size={18} /> Nueva
        </Button>
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
            hint="Crea la primera para poder cargar pedidos."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {productos.map((p) => (
              <ProductoCard
                key={p.id}
                producto={p}
                onEdit={() => abrirEditar(p)}
                onDelete={() => eliminar(p)}
              />
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <ProductoForm
          producto={editando}
          onClose={() => setFormOpen(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
