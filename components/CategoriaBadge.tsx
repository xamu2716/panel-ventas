import { colorCategoria } from "@/lib/chartColors";

/**
 * Insignia de categoría de producto: la categoría es texto libre (dinámica), así
 * que el color no puede salir del sistema fijo de `Badge` (tonos predefinidos) —
 * sale de `colorCategoria`, estable mientras no cambie el conjunto de categorías.
 * El texto se queda en tinta neutra (nunca en el color de la serie) y el punto de
 * color es lo que carga la identidad, igual que en las leyendas de gráfica.
 */
export function CategoriaBadge({
  categoria,
  categoriasOrdenadas,
}: {
  categoria: string;
  categoriasOrdenadas: readonly string[];
}) {
  const color = colorCategoria(categoria, categoriasOrdenadas);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {categoria}
    </span>
  );
}
