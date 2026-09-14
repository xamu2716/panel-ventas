"use client";

import { useState } from "react";
import { ESTADOS, ESTADO_LABEL, type PedidoConProducto } from "@/lib/types";
import { EmptyState } from "@/components/ui";
import { PedidoCard } from "./PedidoCard";

type Handlers = {
  onOpen: (p: PedidoConProducto) => void;
  onAvanzar: (p: PedidoConProducto) => void;
  onRetroceder: (p: PedidoConProducto) => void;
};

export function KanbanBoard({ pedidos, ...handlers }: { pedidos: PedidoConProducto[] } & Handlers) {
  const [activo, setActivo] = useState(ESTADOS[0]);
  const porEstado = Object.fromEntries(
    ESTADOS.map((e) => [e, pedidos.filter((p) => p.estado === e)]),
  );

  return (
    <div>
      {/* Celular: tabs por estado, una columna a la vez */}
      <div className="md:hidden">
        <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-2">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => setActivo(e)}
              className={`min-h-11 shrink-0 rounded-md px-3.5 text-sm font-semibold ${
                activo === e ? "bg-accent-soft text-accent-strong" : "text-ink-muted"
              }`}
            >
              {ESTADO_LABEL[e]} ({porEstado[e].length})
            </button>
          ))}
        </div>
        <Columna estado={activo} pedidos={porEstado[activo]} {...handlers} />
      </div>

      {/* Escritorio: las 4 columnas lado a lado */}
      <div className="hidden md:grid md:grid-cols-4 md:gap-4">
        {ESTADOS.map((e) => (
          <div key={e}>
            <p className="mb-2 flex items-center justify-between text-sm font-semibold text-ink-muted">
              {ESTADO_LABEL[e]} <span className="tabular">{porEstado[e].length}</span>
            </p>
            <Columna estado={e} pedidos={porEstado[e]} {...handlers} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Columna({
  pedidos,
  onOpen,
  onAvanzar,
  onRetroceder,
}: { estado: string; pedidos: PedidoConProducto[] } & Handlers) {
  if (pedidos.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState title="Sin pedidos aquí" />
      </div>
    );
  }
  return (
    <ul className="mt-4 flex flex-col gap-3 md:mt-0">
      {pedidos.map((p) => (
        <PedidoCard
          key={p.id}
          pedido={p}
          onOpen={() => onOpen(p)}
          onAvanzar={() => onAvanzar(p)}
          onRetroceder={() => onRetroceder(p)}
        />
      ))}
    </ul>
  );
}
