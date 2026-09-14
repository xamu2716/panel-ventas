import { formatCOP } from "@/lib/calc";

export function KpiTiles({
  ingresos,
  gananciaNeta,
  pendiente,
  stockValorado,
  gastoPublicidadTotal,
}: {
  ingresos: number;
  gananciaNeta: number;
  pendiente: number;
  stockValorado: number;
  gastoPublicidadTotal: number;
}) {
  const tiles = [
    { label: "Ingresos (entregado)", valor: ingresos, tone: "text-ink" },
    {
      label: "Ganancia neta",
      valor: gananciaNeta,
      tone: gananciaNeta < 0 ? "text-alert" : "text-settled",
    },
    { label: "Pendiente por cobrar/entregar", valor: pendiente, tone: "text-gold" },
    { label: "Stock valorado (a costo)", valor: stockValorado, tone: "text-ink" },
    { label: "Publicidad invertida", valor: gastoPublicidadTotal, tone: "text-route-strong" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-md border border-line bg-surface px-4 py-3.5">
          <p className="text-xs text-ink-muted">{t.label}</p>
          <p className={`tabular font-display text-xl ${t.tone}`}>{formatCOP(t.valor)}</p>
        </div>
      ))}
    </div>
  );
}
