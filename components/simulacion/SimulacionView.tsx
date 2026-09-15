"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { Producto } from "@/lib/types";
import { categoriasDisponibles } from "@/lib/metrics";
import { formatCOP, gananciaPedido, margenPct, totalPedido } from "@/lib/calc";
import { EmptyState, Field, Input, Select, ToggleGroup } from "@/components/ui";

async function fetchProductos() {
  return supabase.from("productos").select("*").order("nombre", { ascending: true });
}

type Alcance = "producto" | "categoria" | "todo";

const MAX_COLUMNAS = 20;

function promedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((a, v) => a + v, 0) / valores.length;
}

function parsearPrecios(texto: string): number[] {
  const vistos = new Set<number>();
  for (const parte of texto.split(",")) {
    const n = Number(parte.trim());
    if (Number.isFinite(n) && n > 0) vistos.add(Math.round(n));
  }
  return [...vistos].sort((a, b) => b - a);
}

export function SimulacionView() {
  const { data: productos, loading } = useRealtimeQuery<Producto>("productos", fetchProductos);
  const categorias = useMemo(() => categoriasDisponibles(productos), [productos]);

  const [alcance, setAlcance] = useState<Alcance>("producto");
  const [productoId, setProductoId] = useState<string>("");
  const [categoriaSel, setCategoriaSel] = useState<string>("");

  const [costoBase, setCostoBase] = useState("");
  const [preciosTexto, setPreciosTexto] = useState("");
  const [cantidadMin, setCantidadMin] = useState("10");
  const [cantidadMax, setCantidadMax] = useState("15");

  // Productos dentro del alcance elegido, para promediar costo/precio de referencia.
  const productosEnAlcance = useMemo(() => {
    if (alcance === "producto") return productos.filter((p) => p.id === productoId);
    if (alcance === "categoria") return productos.filter((p) => p.categoria === categoriaSel);
    return productos;
  }, [alcance, productoId, categoriaSel, productos]);

  const costoSugerido = useMemo(
    () => promedio(productosEnAlcance.map((p) => p.costo_unitario)),
    [productosEnAlcance],
  );
  const precioSugerido = useMemo(
    () => promedio(productosEnAlcance.map((p) => p.precio_venta)),
    [productosEnAlcance],
  );

  // Al cambiar de alcance/producto/categoría, se resiembran costo y precios
  // sugeridos: cambiar de a qué le apuntas reinicia la simulación.
  useEffect(() => {
    if (productosEnAlcance.length === 0) {
      setCostoBase("");
      setPreciosTexto("");
      return;
    }
    setCostoBase(String(Math.round(costoSugerido)));
    const base = Math.round(precioSugerido / 1000) * 1000;
    setPreciosTexto([base - 50000, base, base + 50000].filter((v) => v > 0).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alcance, productoId, categoriaSel]);

  // Selección inicial: primer producto/categoría disponible.
  useEffect(() => {
    if (!productoId && productos.length > 0) setProductoId(productos[0].id);
    if (!categoriaSel && categorias.length > 0) setCategoriaSel(categorias[0]);
  }, [productos, categorias, productoId, categoriaSel]);

  const costo = Number(costoBase) || 0;
  const precios = parsearPrecios(preciosTexto);
  const min = Math.max(1, Math.round(Number(cantidadMin)) || 1);
  const maxCrudo = Math.round(Number(cantidadMax)) || min;
  const max = Math.min(maxCrudo, min + MAX_COLUMNAS - 1);
  const cantidades = max >= min ? Array.from({ length: max - min + 1 }, (_, i) => min + i) : [];

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <p className="text-sm text-ink-muted">Cargando…</p>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <h1 className="font-display text-2xl text-ink">Simulación</h1>
        <div className="mt-6">
          <EmptyState
            title="Todavía no hay referencias"
            hint="Crea al menos un producto en Inventario para poder simular precios."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <h1 className="font-display text-2xl text-ink">Simulación</h1>
      <p className="text-sm text-ink-muted">
        Prueba precios y cantidades hipotéticas para ver la ganancia resultante, antes de vender.
      </p>

      <div className="mt-6 flex flex-col gap-5 rounded-md border border-line bg-surface p-4">
        <Field label="Alcance" htmlFor="alcance">
          <ToggleGroup
            name="Alcance de la simulación"
            value={alcance}
            onChange={setAlcance}
            options={[
              { value: "producto", label: "Producto" },
              { value: "categoria", label: "Categoría" },
              { value: "todo", label: "Todo" },
            ]}
          />
        </Field>

        {alcance === "producto" && (
          <Field label="Producto" htmlFor="producto">
            <Select id="producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {alcance === "categoria" && (
          <Field label="Categoría" htmlFor="categoria">
            <Select id="categoria" value={categoriaSel} onChange={(e) => setCategoriaSel(e.target.value)}>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {productosEnAlcance.length === 0 ? (
          <p className="text-sm text-ink-muted">No hay productos en este alcance todavía.</p>
        ) : (
          <>
            <Field
              label="Costo unitario base"
              htmlFor="costoBase"
              hint={
                alcance === "producto"
                  ? "Del producto elegido; edítalo si quieres probar otro supuesto."
                  : `Promedio de ${productosEnAlcance.length} producto(s) en este alcance; edítalo a tu gusto.`
              }
            >
              <Input
                id="costoBase"
                inputMode="decimal"
                value={costoBase}
                onChange={(e) => setCostoBase(e.target.value)}
              />
            </Field>

            <Field
              label="Precios a probar"
              htmlFor="precios"
              hint="Sepáralos con comas, ej. 300000, 350000, 400000."
            >
              <Input
                id="precios"
                value={preciosTexto}
                onChange={(e) => setPreciosTexto(e.target.value)}
                placeholder="Ej. 300000, 350000"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad mínima" htmlFor="cantidadMin">
                <Input
                  id="cantidadMin"
                  inputMode="numeric"
                  value={cantidadMin}
                  onChange={(e) => setCantidadMin(e.target.value)}
                />
              </Field>
              <Field label="Cantidad máxima" htmlFor="cantidadMax">
                <Input
                  id="cantidadMax"
                  inputMode="numeric"
                  value={cantidadMax}
                  onChange={(e) => setCantidadMax(e.target.value)}
                />
              </Field>
            </div>
          </>
        )}
      </div>

      {productosEnAlcance.length > 0 && (
        <div className="mt-6">
          {precios.length === 0 || cantidades.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Escribe al menos un precio y un rango de cantidad válido para ver la simulación.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper/60 text-left text-ink-muted">
                    <th className="px-4 py-2.5 font-medium">Precio</th>
                    <th className="px-4 py-2.5 text-right font-medium">Margen</th>
                    {cantidades.map((c) => (
                      <th key={c} className="tabular px-4 py-2.5 text-right font-medium">
                        {c} und.
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {precios.map((precio) => {
                    const margen = margenPct(precio, costo);
                    return (
                      <tr key={precio} className="border-b border-line last:border-0">
                        <td className="tabular px-4 py-2.5 font-medium text-ink">{formatCOP(precio)}</td>
                        <td
                          className={`tabular px-4 py-2.5 text-right font-medium ${
                            margen < 0 ? "text-alert" : "text-settled"
                          }`}
                        >
                          {margen.toFixed(1)}%
                        </td>
                        {cantidades.map((cantidad) => {
                          const ganancia = gananciaPedido(precio, costo, cantidad);
                          return (
                            <td
                              key={cantidad}
                              className={`tabular px-4 py-2.5 text-right ${
                                ganancia < 0 ? "text-alert" : "text-ink"
                              }`}
                              title={`Ingreso: ${formatCOP(totalPedido(precio, cantidad))}`}
                            >
                              {formatCOP(ganancia)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="border-t border-line bg-paper/60 px-4 py-2.5 text-xs text-ink-muted">
                Cada celda es la ganancia total = (precio − costo unitario) × cantidad, para ese precio y
                esa cantidad. Pasa el cursor sobre una celda para ver el ingreso total correspondiente.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
