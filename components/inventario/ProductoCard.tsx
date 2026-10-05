"use client";

import {
  costoConPublicidad,
  formatCOP,
  margenRealPct,
  publicidadPorUnidad,
  rebajaPct,
  stockBajo,
  type ResumenVentas,
} from "@/lib/calc";
import type { Producto } from "@/lib/types";
import { Badge } from "@/components/ui";
import { CategoriaBadge } from "@/components/CategoriaBadge";
import { IconAlert, IconPencil, IconTrash } from "@/components/icons";

/**
 * Ya no muestra un chip fijo de método de importación (barco/avión): eso ahora
 * es un dato del lote con el que se trajo cada reabastecimiento, no de la
 * referencia — la misma referencia puede haber llegado por distintos métodos
 * en distintos lotes. Ver Historial de lotes para el detalle por compra.
 */

export function ProductoCard({
  producto,
  categoriasOrdenadas,
  publicidadAsignada = 0,
  unidadesCompradas = 0,
  ventas,
  onEdit,
  onDelete,
}: {
  producto: Producto;
  categoriasOrdenadas: readonly string[];
  /** Total de gastos de publicidad asignados a esta referencia (tabla gastos_publicidad). */
  publicidadAsignada?: number;
  /** Unidades compradas acumuladas (suma de todos sus lotes), base del reparto de esa publicidad. */
  unidadesCompradas?: number;
  /** Lo realmente vendido (pedidos entregados, cada uno a su propio precio). */
  ventas: ResumenVentas;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // La rentabilidad sale de lo realmente vendido; el precio publicado es solo referencia.
  const hayVentas = ventas.unidades > 0;
  const rebaja = rebajaPct(producto.precio_venta, ventas.precioPromedio);
  const bajo = stockBajo(producto.stock, producto.umbral_stock_bajo);
  // Valores derivados solo para mostrar: no se guardan ni tocan costo_unitario.
  const publicidadUnidad = publicidadPorUnidad(publicidadAsignada, unidadesCompradas);
  const costoReal = costoConPublicidad(producto.costo_unitario, publicidadUnidad);
  const margenReal = margenRealPct(ventas, publicidadUnidad);

  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{producto.nombre}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CategoriaBadge categoria={producto.categoria} categoriasOrdenadas={categoriasOrdenadas} />
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
          <p className="text-ink-muted">Precio publicado</p>
          <p className="tabular font-medium text-ink-muted">{formatCOP(producto.precio_venta)}</p>
        </div>
        {hayVentas ? (
          <>
            <div>
              <p className="text-ink-muted">Vendido ({ventas.unidades} u.)</p>
              <p className="tabular font-medium text-ink">{formatCOP(ventas.ingresos)}</p>
            </div>
            <div>
              <p className="text-ink-muted">Precio prom. vendido</p>
              <p className="tabular font-medium text-ink">{formatCOP(ventas.precioPromedio)}</p>
              {rebaja > 0 && (
                <p className="tabular text-xs text-ink-muted">{rebaja.toFixed(1)} % bajo el publicado</p>
              )}
            </div>
            <div>
              <p className="text-ink-muted">Ganancia acumulada</p>
              <p className={`tabular font-medium ${ventas.ganancia < 0 ? "text-alert" : "text-settled"}`}>
                {formatCOP(ventas.ganancia)}
              </p>
            </div>
            <div>
              <p className="text-ink-muted">Margen real</p>
              <p className={`tabular font-medium ${ventas.margenPct < 0 ? "text-alert" : "text-settled"}`}>
                {ventas.margenPct.toFixed(1)}%
              </p>
            </div>
          </>
        ) : (
          <p className="col-span-2 text-ink-muted">Sin ventas todavía</p>
        )}
      </div>

      {publicidadAsignada > 0 && (
        <div
          className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-paper px-3 py-3 text-sm sm:grid-cols-4"
          aria-label="Publicidad asignada"
        >
          <div>
            <p className="text-ink-muted">Publicidad asignada</p>
            <p className="tabular font-medium text-ink">{formatCOP(publicidadAsignada)}</p>
          </div>
          <div>
            <p className="text-ink-muted">Publicidad / unidad</p>
            <p className="tabular font-medium text-ink">{formatCOP(publicidadUnidad)}</p>
          </div>
          <div>
            <p className="text-ink-muted">Costo con publicidad</p>
            <p className="tabular font-medium text-ink">{formatCOP(costoReal)}</p>
          </div>
          <div>
            <p className="text-ink-muted">Margen real c/ publicidad</p>
            <p className={`tabular font-medium ${margenReal < 0 ? "text-alert" : "text-settled"}`}>
              {hayVentas ? `${margenReal.toFixed(1)}%` : "Sin ventas"}
            </p>
          </div>
          <p className="col-span-2 text-xs text-ink-muted sm:col-span-4">
            {unidadesCompradas > 0
              ? `Repartida entre las ${unidadesCompradas} unidades compradas. No cambia el costo ni el stock.`
              : "Sin lotes todavía: la publicidad por unidad se calcula cuando registres su primer lote. No cambia el costo ni el stock."}
          </p>
        </div>
      )}

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
