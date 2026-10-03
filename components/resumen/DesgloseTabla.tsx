import { CategoriaBadge } from "@/components/CategoriaBadge";
import { formatCOP } from "@/lib/calc";

type Fila = {
  nombre: string;
  categoria: string;
  vendido: number;
  pendiente: number;
  /** Publicidad asignada a la referencia (gastos_publicidad.producto_id). */
  publicidad: number;
  /** Margen con la publicidad asignada repartida entre las unidades compradas; igual al margen normal si no hay. */
  margenReal: number;
  /** Ganancia de lo entregado menos la publicidad asignada. */
  gananciaNeta: number;
};

export function DesgloseTabla({
  filas,
  categoriasOrdenadas,
}: {
  filas: Fila[];
  categoriasOrdenadas: readonly string[];
}) {
  if (filas.length === 0) {
    return <p className="text-sm text-ink-muted">Sin productos en inventario todavía.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-line bg-paper/60 text-left text-ink-muted">
            <th className="px-4 py-2.5 font-medium">Producto</th>
            <th className="px-4 py-2.5 font-medium">Categoría</th>
            <th className="px-4 py-2.5 text-right font-medium">Vendido</th>
            <th className="px-4 py-2.5 text-right font-medium">Pendiente</th>
            <th className="px-4 py-2.5 text-right font-medium">Publicidad</th>
            <th className="px-4 py-2.5 text-right font-medium">Margen real</th>
            <th className="px-4 py-2.5 text-right font-medium">Ganancia neta</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre} className="border-b border-line last:border-0">
              <td className="px-4 py-2.5 font-medium text-ink">{f.nombre}</td>
              <td className="px-4 py-2.5">
                <CategoriaBadge categoria={f.categoria} categoriasOrdenadas={categoriasOrdenadas} />
              </td>
              <td className="tabular px-4 py-2.5 text-right text-ink">{f.vendido}</td>
              <td className="tabular px-4 py-2.5 text-right text-ink">{f.pendiente}</td>
              <td className="tabular px-4 py-2.5 text-right text-ink">{formatCOP(f.publicidad)}</td>
              <td
                className={`tabular px-4 py-2.5 text-right font-medium ${
                  f.margenReal < 0 ? "text-alert" : "text-settled"
                }`}
              >
                {f.margenReal.toFixed(1)}%
              </td>
              <td
                className={`tabular px-4 py-2.5 text-right font-medium ${
                  f.gananciaNeta < 0 ? "text-alert" : "text-settled"
                }`}
              >
                {formatCOP(f.gananciaNeta)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
