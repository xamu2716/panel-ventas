"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCOP, formatCOPCompact, formatFecha } from "@/lib/calc";
import {
  CATEGORIA_PALETTE,
  CHART_AXIS_TEXT,
  CHART_ESTADO_RAMP,
  CHART_GANANCIA,
  CHART_GRID,
  CHART_INGRESOS,
  CHART_SLOT_1,
  CHART_SLOT_2,
  colorCategoria,
} from "@/lib/chartColors";
import type { EstadoPedido } from "@/lib/types";
import { ChartCard, LegendDot } from "./ChartCard";

const axisTick = { fill: CHART_AXIS_TEXT, fontSize: 11 };
const tooltipStyle = {
  background: "#fffcf4",
  border: "1px solid #ddd0ba",
  borderRadius: 8,
  fontSize: 13,
};

function truncar(nombre: string, max = 18) {
  return nombre.length > max ? `${nombre.slice(0, max - 1)}…` : nombre;
}

// Recharts tipa value/name de Tooltip como ValueType/NameType (string | number |
// arreglo | undefined) porque una gráfica genérica podría recibir cualquier cosa;
// aquí siempre sabemos que son numéricos, así que los normalizamos al usarlos.
function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

/** Leyenda de categorías dinámica: una LegendDot por cada categoría presente. */
function CategoriaLegend({ categorias }: { categorias: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {categorias.map((c) => (
        <LegendDot key={c} color={colorCategoria(c, categorias)} label={c} />
      ))}
    </div>
  );
}

/* 1. Línea de ingresos y ganancia por día */
export function IngresosLineChart({
  data,
}: {
  data: { fecha: string; ingresos: number; ganancia: number }[];
}) {
  return (
    <ChartCard
      title="Ingresos y ganancia por día"
      legend={
        <div className="flex gap-3">
          <LegendDot color={CHART_INGRESOS} label="Ingresos" />
          <LegendDot color={CHART_GANANCIA} label="Ganancia" />
        </div>
      }
    >
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          Aún no hay pedidos entregados para graficar.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={axisTick}
              tickFormatter={(v: string) => formatFecha(v)}
              minTickGap={20}
            />
            <YAxis tick={axisTick} width={56} tickFormatter={(v: number) => formatCOPCompact(v)} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(v) => formatFecha(String(v))}
              formatter={(value, name) => [formatCOP(num(value)), String(name)]}
            />
            <Line
              type="monotone"
              dataKey="ingresos"
              name="Ingresos"
              stroke={CHART_INGRESOS}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="ganancia"
              name="Ganancia"
              stroke={CHART_GANANCIA}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* 2. Barras de ventas (unidades entregadas) por producto */
export function VentasPorProductoChart({
  data,
  categoriasOrdenadas,
}: {
  data: { nombre: string; categoria: string; unidades: number }[];
  categoriasOrdenadas: readonly string[];
}) {
  return (
    <ChartCard title="Ventas por producto" legend={<CategoriaLegend categorias={categoriasOrdenadas} />}>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
          <XAxis type="number" tick={axisTick} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={axisTick}
            width={130}
            tickFormatter={(v: string) => truncar(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${num(value)} unidad(es)`, "Vendido"]}
          />
          <Bar dataKey="unidades" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.nombre} fill={colorCategoria(d.categoria, categoriasOrdenadas)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* 3. Barras de margen por producto */
export function MargenPorProductoChart({
  data,
  categoriasOrdenadas,
}: {
  data: { nombre: string; categoria: string; margen: number }[];
  categoriasOrdenadas: readonly string[];
}) {
  return (
    <ChartCard title="Margen por producto" legend={<CategoriaLegend categorias={categoriasOrdenadas} />}>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
          <XAxis
            type="number"
            tick={axisTick}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={axisTick}
            width={130}
            tickFormatter={(v: string) => truncar(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${num(value).toFixed(1)}%`, "Margen"]}
          />
          <Bar dataKey="margen" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.nombre} fill={colorCategoria(d.categoria, categoriasOrdenadas)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* 4. Dona: % pedidos domicilio vs. recoge en casa */
export function EntregaDonutChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <ChartCard
      title="Domicilio vs. recoge en casa"
      legend={
        <div className="flex gap-3">
          <LegendDot color={CHART_SLOT_1} label="Recoge en casa" />
          <LegendDot color={CHART_SLOT_2} label="Domicilio" />
        </div>
      }
    >
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">Aún no hay pedidos registrados.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              label={({ percent }: { percent?: number }) =>
                percent ? `${Math.round(percent * 100)}%` : ""
              }
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={i === 0 ? CHART_SLOT_1 : CHART_SLOT_2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [`${num(value)} pedido(s)`, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* 5. Barras de stock restante por referencia */
export function StockPorProductoChart({
  data,
  categoriasOrdenadas,
}: {
  data: { nombre: string; categoria: string; stock: number; bajo: boolean }[];
  categoriasOrdenadas: readonly string[];
}) {
  return (
    <ChartCard title="Stock restante por referencia" legend={<CategoriaLegend categorias={categoriasOrdenadas} />}>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
          <XAxis type="number" tick={axisTick} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={axisTick}
            width={130}
            tickFormatter={(v: string) => truncar(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${num(value)} unidad(es)`, "Stock"]}
          />
          <Bar dataKey="stock" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.nombre} fill={colorCategoria(d.categoria, categoriasOrdenadas)} opacity={d.bajo ? 0.55 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* 7. Barras de ventas (unidades + ingresos) agregadas por categoría */
export function VentasPorCategoriaChart({
  data,
}: {
  data: { categoria: string; unidades: number; ingresos: number }[];
}) {
  const categorias = data.map((d) => d.categoria);
  return (
    <ChartCard title="Ventas por categoría">
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          Aún no hay pedidos entregados para graficar.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 46)}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID} horizontal={false} />
            <XAxis type="number" tick={axisTick} allowDecimals={false} />
            <YAxis type="category" dataKey="categoria" tick={axisTick} width={110} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) =>
                name === "ingresos" ? [formatCOP(num(value)), "Ingresos"] : [`${num(value)} unidad(es)`, "Vendido"]
              }
            />
            <Bar dataKey="unidades" radius={[0, 4, 4, 0]}>
              {data.map((d) => (
                <Cell key={d.categoria} fill={colorCategoria(d.categoria, categorias)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* 8. Líneas múltiples: unidades vendidas por producto en el tiempo, para comparar
   referencias de una misma categoría (cuál se vende más rápido). */
export function VentasPorProductoTiempoChart({
  data,
  productos,
}: {
  data: { fecha: string; [producto: string]: number | string }[];
  productos: readonly string[];
}) {
  // Colores por posición del producto (no por categoría: aquí cada línea es una
  // referencia individual dentro de la categoría filtrada).
  const colores = productos.map((_, i) => CATEGORIA_PALETTE[i % CATEGORIA_PALETTE.length]);
  return (
    <ChartCard
      title="Unidades por producto en el tiempo"
      legend={
        <div className="flex flex-wrap gap-3">
          {productos.map((p, i) => (
            <LegendDot key={p} color={colores[i]} label={p} />
          ))}
        </div>
      }
    >
      {data.length === 0 || productos.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          Aún no hay ventas entregadas de esta categoría para comparar.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={axisTick}
              tickFormatter={(v: string) => formatFecha(v)}
              minTickGap={20}
            />
            <YAxis tick={axisTick} width={30} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(v) => formatFecha(String(v))}
              formatter={(value, name) => [`${num(value)} unidad(es)`, String(name)]}
            />
            {productos.map((p, i) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                name={p}
                stroke={colores[i]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

const ESTADO_CORTO: Record<string, string> = {
  "Listo para entregar": "Listo",
};

/* 6. Pedidos por estado, para ver cuellos de botella */
export function EstadoBarChart({
  data,
}: {
  data: { estado: EstadoPedido; label: string; count: number }[];
}) {
  return (
    <ChartCard title="Pedidos por estado">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            interval={0}
            tickFormatter={(v: string) => ESTADO_CORTO[v] ?? v}
          />
          <YAxis tick={axisTick} width={30} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${num(value)} pedido(s)`, "Cantidad"]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.estado} fill={CHART_ESTADO_RAMP[d.estado]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
