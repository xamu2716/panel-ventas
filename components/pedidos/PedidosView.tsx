"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import { ESTADOS, ESTADO_LABEL, type PedidoConProducto, type Producto } from "@/lib/types";
import { Button } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { KanbanBoard } from "./KanbanBoard";
import { PedidoForm } from "./PedidoForm";
import { PedidoDetail } from "./PedidoDetail";

async function fetchPedidos() {
  return supabase
    .from("pedidos")
    .select("*, producto:productos(id,nombre,categoria)")
    .order("created_at", { ascending: false });
}

async function fetchProductos() {
  return supabase.from("productos").select("*").order("nombre", { ascending: true });
}

export function PedidosView() {
  const {
    data: pedidos,
    loading,
    error,
    reload,
  } = useRealtimeQuery<PedidoConProducto>("pedidos", fetchPedidos);
  const { data: productos } = useRealtimeQuery<Producto>("productos", fetchProductos);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<PedidoConProducto | undefined>(undefined);
  const [detalle, setDetalle] = useState<PedidoConProducto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEditar(p: PedidoConProducto) {
    setDetalle(null);
    setEditando(p);
    setFormOpen(true);
  }

  async function cambiarEstado(p: PedidoConProducto, delta: 1 | -1) {
    setActionError(null);
    const idx = ESTADOS.indexOf(p.estado) + delta;
    const siguiente = ESTADOS[idx];
    if (!siguiente) return;

    // Chequeo previo en el cliente: evita el viaje de red (y su error en consola)
    // cuando ya sabemos que no hay stock suficiente para entregar. El trigger de
    // la base de datos se queda como respaldo por si el stock cambió mientras tanto.
    if (siguiente === "entregado") {
      const producto = productos.find((prod) => prod.id === p.producto_id);
      if (producto && producto.stock < p.cantidad) {
        setActionError(
          `No hay stock suficiente de "${p.producto?.nombre}" para marcarlo como "${ESTADO_LABEL[siguiente]}" (quedan ${producto.stock}).`,
        );
        return;
      }
    }

    const { error } = await supabase.from("pedidos").update({ estado: siguiente }).eq("id", p.id);
    if (error) {
      setActionError(
        error.message.toLowerCase().includes("stock")
          ? `No hay stock suficiente de "${p.producto?.nombre}" para marcarlo como "${ESTADO_LABEL[siguiente]}".`
          : `No se pudo actualizar el pedido: ${error.message}`,
      );
      return;
    }
    reload();
  }

  async function eliminar(p: PedidoConProducto) {
    if (!window.confirm(`¿Eliminar el pedido de ${p.cliente}?`)) return;
    const { error } = await supabase.from("pedidos").delete().eq("id", p.id);
    if (error) {
      setActionError(`No se pudo eliminar: ${error.message}`);
      return;
    }
    setDetalle(null);
    reload();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Pedidos</h1>
          <p className="text-sm text-ink-muted">Nuevo → Apartado → Listo para entregar → Entregado</p>
        </div>
        <Button onClick={abrirNuevo} disabled={productos.length === 0}>
          <IconPlus size={18} /> Nuevo
        </Button>
      </div>

      {productos.length === 0 && (
        <p className="mt-4 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
          Primero crea al menos una referencia en Inventario para poder cargar pedidos.
        </p>
      )}

      {actionError && (
        <p role="alert" className="mt-4 rounded-md bg-alert-soft px-3 py-2 text-sm text-alert">
          {actionError}
        </p>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-muted">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-alert">No se pudo cargar: {error}</p>
        ) : (
          <KanbanBoard
            pedidos={pedidos}
            onOpen={setDetalle}
            onAvanzar={(p) => cambiarEstado(p, 1)}
            onRetroceder={(p) => cambiarEstado(p, -1)}
          />
        )}
      </div>

      {formOpen && (
        <PedidoForm
          productos={productos}
          pedido={editando}
          onClose={() => setFormOpen(false)}
          onSaved={reload}
        />
      )}

      {detalle && (
        <PedidoDetail
          pedido={detalle}
          onClose={() => setDetalle(null)}
          onEdit={() => abrirEditar(detalle)}
          onDelete={() => eliminar(detalle)}
        />
      )}
    </div>
  );
}
