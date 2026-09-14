"use client";

import { ESTADO_LABEL, ESTADOS, type EstadoPedido, type PedidoConProducto } from "@/lib/types";
import { diasDesde, formatCOP, gananciaPedido, totalPedido } from "@/lib/calc";
import { Badge } from "@/components/ui";
import { IconChevronLeft, IconChevronRight, IconHouse, IconPhone, IconRoute } from "@/components/icons";

const DIAS_ESTANCADO = 3;

export function PedidoCard({
  pedido,
  onOpen,
  onAvanzar,
  onRetroceder,
}: {
  pedido: PedidoConProducto;
  onOpen: () => void;
  onAvanzar: () => void;
  onRetroceder: () => void;
}) {
  const total = totalPedido(pedido.precio_unitario_snapshot, pedido.cantidad);
  const ganancia = gananciaPedido(
    pedido.precio_unitario_snapshot,
    pedido.costo_unitario_snapshot,
    pedido.cantidad,
  );
  const idx = ESTADOS.indexOf(pedido.estado);
  const esDomicilio = pedido.tipo_entrega === "domicilio";
  const diasEstancado = diasDesde(pedido.estado_actualizado_en);
  const estancado = pedido.estado !== "entregado" && diasEstancado >= DIAS_ESTANCADO;

  return (
    <li
      className={`rounded-md border border-line bg-surface pl-3 pr-4 py-3.5 border-l-4 ${
        esDomicilio ? "border-l-route" : "border-l-line-strong"
      }`}
    >
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-ink">{pedido.cliente}</p>
            {pedido.telefono && (
              <p className="flex items-center gap-1 text-xs text-ink-muted">
                <IconPhone size={13} /> {pedido.telefono}
              </p>
            )}
          </div>
          <Badge tone={esDomicilio ? "route" : "neutral"}>
            {esDomicilio ? <IconRoute size={13} /> : <IconHouse size={13} />}
            {esDomicilio ? "Domicilio" : "Recoge en casa"}
          </Badge>
        </div>

        <p className="mt-2 text-sm text-ink">
          {pedido.producto?.nombre ?? "Producto eliminado"} × {pedido.cantidad}
        </p>

        {esDomicilio && pedido.direccion && (
          <p className="mt-1 rounded bg-route-soft px-2 py-1.5 text-xs text-route-strong">
            {pedido.direccion}
          </p>
        )}

        <div className="mt-2 flex items-baseline gap-4">
          <p className="tabular font-display text-lg text-ink">{formatCOP(total)}</p>
          <p className={`tabular text-sm ${ganancia < 0 ? "text-alert" : "text-settled"}`}>
            {ganancia >= 0 ? "+" : ""}
            {formatCOP(ganancia)}
          </p>
        </div>

        {estancado && (
          <p className="mt-2 text-xs font-medium text-alert">
            {diasEstancado} días sin avanzar de estado
          </p>
        )}
      </button>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <button
          onClick={onRetroceder}
          disabled={idx === 0}
          className="flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-ink-muted disabled:opacity-30 enabled:hover:bg-paper"
        >
          <IconChevronLeft size={16} /> Atrás
        </button>
        <span className="text-xs text-ink-faint">{ESTADO_LABEL[pedido.estado]}</span>
        {idx < ESTADOS.length - 1 ? (
          <button
            onClick={onAvanzar}
            className="flex min-h-10 items-center gap-1 rounded-md bg-accent-soft px-3 text-xs font-semibold text-accent-strong hover:bg-accent-soft/70"
          >
            {siguienteLabel(pedido.estado)} <IconChevronRight size={16} />
          </button>
        ) : (
          <span className="min-h-10 px-2" />
        )}
      </div>
    </li>
  );
}

function siguienteLabel(estado: EstadoPedido): string {
  const idx = ESTADOS.indexOf(estado);
  const siguiente = ESTADOS[idx + 1];
  return siguiente ? ESTADO_LABEL[siguiente] : "";
}
