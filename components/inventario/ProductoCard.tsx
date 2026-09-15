"use client";

import { formatCOP, gananciaUnidad, margenPct, stockBajo } from "@/lib/calc";
import type { Producto } from "@/lib/types";
import { Badge } from "@/components/ui";
import { CategoriaBadge } from "@/components/CategoriaBadge";
import { IconAlert, IconPencil, IconTrash } from "@/components/icons";

export function ProductoCard({
  producto,
  categoriasOrdenadas,
  onEdit,
  onDelete,
}: {
  producto: Producto;
  categoriasOrdenadas: readonly string[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ganancia = gananciaUnidad(producto.precio_venta, producto.costo_unitario);
  const margen = margenPct(producto.precio_venta, producto.costo_unitario);
  const bajo = stockBajo(producto.stock, producto.umbral_stock_bajo);

  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{producto.nombre}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CategoriaBadge categoria={producto.categoria} categoriasOrdenadas={categoriasOrdenadas} />
            <Badge tone="neutral">
              {producto.metodo_importacion === "avion" ? "Avión" : "Barco"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            aria-label={`Editar ${producto.nombre}`}
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-paper"
          >
            <IconPencil size={18} />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Eliminar ${producto.nombre}`}
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-alert-soft hover:text-alert"
          >
            <IconTrash size={18} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-ink-muted">Costo unitario</p>
          <p className="tabular font-medium text-ink">{formatCOP(producto.costo_unitario)}</p>
        </div>
        <div>
          <p className="text-ink-muted">Precio venta</p>
          <p className="tabular font-medium text-ink">{formatCOP(producto.precio_venta)}</p>
        </div>
        <div>
          <p className="text-ink-muted">Ganancia / unidad</p>
          <p className={`tabular font-medium ${ganancia < 0 ? "text-alert" : "text-settled"}`}>
            {formatCOP(ganancia)}
          </p>
        </div>
        <div>
          <p className="text-ink-muted">Margen</p>
          <p className={`tabular font-medium ${margen < 0 ? "text-alert" : "text-settled"}`}>
            {margen.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-ink-muted">Stock:</span>
        <span className="tabular text-sm font-semibold text-ink">{producto.stock}</span>
        {bajo && (
          <Badge tone="alert">
            <IconAlert size={13} /> Stock bajo
          </Badge>
        )}
      </div>
    </li>
  );
}
