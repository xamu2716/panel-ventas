"use client";

import { ESTADO_LABEL, type PedidoConProducto } from "@/lib/types";
import { formatFecha, formatCOP, gananciaPedido, totalPedido, diasDesde } from "@/lib/calc";
import { Badge, Button, Sheet } from "@/components/ui";
import { IconHouse, IconPhone, IconRoute } from "@/components/icons";

export function PedidoDetail({
  pedido,
  onClose,
  onEdit,
  onDelete,
}: {
  pedido: PedidoConProducto;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const total = totalPedido(pedido.precio_unitario_snapshot, pedido.cantidad);
  const ganancia = gananciaPedido(
    pedido.precio_unitario_snapshot,
    pedido.costo_unitario_snapshot,
    pedido.cantidad,
  );
  const esDomicilio = pedido.tipo_entrega === "domicilio";

  return (
    <Sheet title="Detalle del pedido" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl text-ink">{pedido.cliente}</p>
            {pedido.telefono && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
                <IconPhone size={14} /> {pedido.telefono}
              </p>
            )}
          </div>
          <Badge tone="accent">{ESTADO_LABEL[pedido.estado]}</Badge>
        </div>

        <div className="rounded-md border border-line px-4 py-3">
          <p className="text-sm text-ink-muted">Producto</p>
          <p className="font-medium text-ink">
            {pedido.producto?.nombre ?? "Producto eliminado"} × {pedido.cantidad}
          </p>
        </div>

        <div>
          <Badge tone={esDomicilio ? "route" : "neutral"}>
            {esDomicilio ? <IconRoute size={13} /> : <IconHouse size={13} />}
            {esDomicilio ? "Domicilio" : "Recoge en casa"}
          </Badge>
          {esDomicilio && pedido.direccion && (
            <p className="mt-2 rounded-md bg-route-soft px-3 py-2 text-sm text-route-strong">
              {pedido.direccion}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-line bg-accent-soft/30 px-4 py-3">
          <div>
            <p className="text-xs text-ink-muted">Total</p>
            <p className="tabular font-display text-xl text-accent-strong">{formatCOP(total)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Ganancia</p>
            <p
              className={`tabular font-display text-xl ${ganancia < 0 ? "text-alert" : "text-settled"}`}
            >
              {formatCOP(ganancia)}
            </p>
          </div>
        </div>

        {pedido.notas && (
          <div>
            <p className="text-sm text-ink-muted">Notas</p>
            <p className="text-sm text-ink">{pedido.notas}</p>
          </div>
        )}

        <div className="text-xs text-ink-faint">
          Creado el {formatFecha(pedido.created_at)} · en este estado hace{" "}
          {diasDesde(pedido.estado_actualizado_en)} día(s)
        </div>

        <div className="flex gap-3 border-t border-line pt-4">
          <Button variant="secondary" onClick={onEdit} className="flex-1">
            Editar
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Eliminar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
