"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeQuery } from "@/lib/useRealtimeQuery";
import type { Producto } from "@/lib/types";
import { formatCOP, gananciaPedido, margenPct, totalPedido } from "@/lib/calc";
import { Button, EmptyState, Field, Input, MoneyInput, Select, ToggleGroup } from "@/components/ui";
import { IconPlus, IconTrash } from "@/components/icons";

async function fetchProductos() {
  return supabase.from("productos").select("*").order("nombre", { ascending: true });
}

type Alcance = "producto" | "varias";

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

type LineaSim = { key: string; productoId: string; precioVenta: string; unidades: string };

function nuevaLineaSim(): LineaSim {
  return { key: crypto.randomUUID(), productoId: "", precioVenta: "", unidades: "" };
}

export function SimulacionView() {
  const { data: productos, loading } = useRealtimeQuery<Producto>("productos", fetchProductos);

  const [alcance, setAlcance] = useState<Alcance>("producto");

  // --- Modo "Producto": un producto específico, matriz de precios × cantidades ---
  const [productoId, setProductoId] = useState<string>("");
  const [costoBase, setCostoBase] = useState("");
  const [preciosTexto, setPreciosTexto] = useState("");
  const [cantidadMin, setCantidadMin] = useState("10");
  const [cantidadMax, setCantidadMax] = useState("15");

  const productoElegido = useMemo(
    () => productos.filter((p) => p.id === productoId),
    [productos, productoId],
  );

  const costoSugerido = useMemo(
    () => promedio(productoElegido.map((p) => p.costo_unitario)),
    [productoElegido],
  );
  const precioSugerido = useMemo(
    () => promedio(productoElegido.map((p) => p.precio_venta)),
    [productoElegido],
  );

  // Al cambiar de producto se resiembran costo y precios sugeridos.
  useEffect(() => {
    if (productoElegido.length === 0) {
      setCostoBase("");
      setPreciosTexto("");
      return;
    }
    setCostoBase(String(Math.round(costoSugerido)));
    const base = Math.round(precioSugerido / 1000) * 1000;
    setPreciosTexto([base - 50000, base, base + 50000].filter((v) => v > 0).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  // Selección inicial: primer producto disponible.
  useEffect(() => {
    if (!productoId && productos.length > 0) setProductoId(productos[0].id);
  }, [productos, productoId]);

  const costo = Number(costoBase) || 0;
  const precios = parsearPrecios(preciosTexto);
  const min = Math.max(1, Math.round(Number(cantidadMin)) || 1);
  const maxCrudo = Math.round(Number(cantidadMax)) || min;
  const max = Math.min(maxCrudo, min + MAX_COLUMNAS - 1);
  const cantidades = max >= min ? Array.from({ length: max - min + 1 }, (_, i) => min + i) : [];

  // --- Modo "Varias referencias": lista de líneas, cada una con su propia
  // referencia, precio de venta y unidades a probar. Reemplaza los antiguos
  // modos "Categoría"/"Todo" (que promediaban costo/precio de varios
  // productos) por algo más concreto: elegir exactamente qué y cuánto. ---
  const [lineasSim, setLineasSim] = useState<LineaSim[]>([nuevaLineaSim()]);

  function actualizarLineaSim(key: string, cambios: Partial<LineaSim>) {
    setLineasSim((prev) => prev.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
  }

  function seleccionarProductoLineaSim(key: string, nuevoProductoId: string) {
    const producto = productos.find((p) => p.id === nuevoProductoId);
    actualizarLineaSim(key, {
      productoId: nuevoProductoId,
      precioVenta: producto ? String(producto.precio_venta) : "",
    });
  }

  function agregarLineaSim() {
    setLineasSim((prev) => [...prev, nuevaLineaSim()]);
  }

  function quitarLineaSim(key: string) {
    setLineasSim((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function datosLineaSim(linea: LineaSim) {
    const producto = productos.find((p) => p.id === linea.productoId);
    const costoUnitario = producto?.costo_unitario ?? 0;
    const precio = Number(linea.precioVenta) || 0;
    const unidades = Number(linea.unidades) || 0;
    return {
      producto,
      costoUnitario,
      costoTotal: costoUnitario * unidades,
      venta: totalPedido(precio, unidades),
      ganancia: gananciaPedido(precio, costoUnitario, unidades),
    };
  }

  const resumenVarias = lineasSim.reduce(
    (acc, l) => {
      const d = datosLineaSim(l);
      return {
        invertido: acc.invertido + d.costoTotal,
        venta: acc.venta + d.venta,
        ganancia: acc.ganancia + d.ganancia,
      };
    },
    { invertido: 0, venta: 0, ganancia: 0 },
  );

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
              { value: "varias", label: "Varias referencias" },
            ]}
          />
        </Field>

        {alcance === "producto" && (
          <>
            <Field label="Producto" htmlFor="producto">
              <Select id="producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>

            {productoElegido.length === 0 ? (
              <p className="text-sm text-ink-muted">No hay productos todavía.</p>
            ) : (
              <>
                <Field
                  label="Costo unitario base"
                  htmlFor="costoBase"
                  hint="Del producto elegido; edítalo si quieres probar otro supuesto."
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
          </>
        )}
      </div>

      {alcance === "producto" && productoElegido.length > 0 && (
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
                  <tr className="border-b border-line bg-paper/60">
                    <td colSpan={2} className="px-4 py-2.5 font-medium text-ink-muted">
                      Costo total de compra
                    </td>
                    {cantidades.map((cantidad) => (
                      <td key={cantidad} className="tabular px-4 py-2.5 text-right font-medium text-ink-muted">
                        {formatCOP(costo * cantidad)}
                      </td>
                    ))}
                  </tr>
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
                          const ingreso = totalPedido(precio, cantidad);
                          const ganancia = gananciaPedido(precio, costo, cantidad);
                          return (
                            <td key={cantidad} className="px-4 py-2.5 text-right">
                              <p className="tabular text-ink">{formatCOP(ingreso)}</p>
                              <p
                                className={`tabular font-semibold ${
                                  ganancia < 0 ? "text-alert" : "text-settled"
                                }`}
                              >
                                {formatCOP(ganancia)}
                              </p>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="border-t border-line bg-paper/60 px-4 py-2.5 text-xs text-ink-muted">
                "Costo total de compra" es costo unitario × cantidad (la inversión para traer esas
                unidades; no depende del precio de venta). En cada celda, arriba el total de venta
                (precio × cantidad) y abajo, resaltada, la ganancia = venta − costo total de compra.
              </p>
            </div>
          )}
        </div>
      )}

      {alcance === "varias" && (
        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-ink">Referencias a simular</p>
            {lineasSim.map((linea, idx) => {
              const datos = datosLineaSim(linea);
              return (
                <div
                  key={linea.key}
                  className="flex flex-col gap-3 rounded-md border border-line bg-paper/60 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">Referencia {idx + 1}</p>
                    {lineasSim.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarLineaSim(linea.key)}
                        aria-label={`Quitar referencia ${idx + 1}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-alert-soft hover:text-alert"
                      >
                        <IconTrash size={18} />
                      </button>
                    )}
                  </div>

                  <Field label="Producto" htmlFor={`sim-producto-${linea.key}`}>
                    <Select
                      id={`sim-producto-${linea.key}`}
                      value={linea.productoId}
                      onChange={(e) => seleccionarProductoLineaSim(linea.key, e.target.value)}
                    >
                      <option value="">Elige una referencia…</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Precio de venta a probar" htmlFor={`sim-precio-${linea.key}`}>
                      <MoneyInput
                        id={`sim-precio-${linea.key}`}
                        value={linea.precioVenta}
                        onChange={(v) => actualizarLineaSim(linea.key, { precioVenta: v })}
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Unidades a vender" htmlFor={`sim-unidades-${linea.key}`}>
                      <Input
                        id={`sim-unidades-${linea.key}`}
                        inputMode="numeric"
                        value={linea.unidades}
                        onChange={(e) => actualizarLineaSim(linea.key, { unidades: e.target.value })}
                        placeholder="Ej. 13"
                      />
                    </Field>
                  </div>

                  {linea.productoId && (
                    <div className="flex flex-col gap-1 rounded-md border border-line bg-surface px-3 py-2.5 text-xs text-ink-muted">
                      <p>
                        Costo unitario: <span className="tabular font-medium text-ink">{formatCOP(datos.costoUnitario)}</span>
                        {" · Costo total: "}
                        <span className="tabular font-medium text-ink">{formatCOP(datos.costoTotal)}</span>
                      </p>
                      <p>
                        Venta total: <span className="tabular font-medium text-ink">{formatCOP(datos.venta)}</span>
                      </p>
                      <p>
                        Ganancia:{" "}
                        <span
                          className={`tabular font-display text-sm ${
                            datos.ganancia < 0 ? "text-alert" : "text-settled"
                          }`}
                        >
                          {formatCOP(datos.ganancia)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <Button type="button" variant="secondary" onClick={agregarLineaSim} className="self-start">
              <IconPlus size={16} /> Agregar otra referencia
            </Button>
          </div>

          <div className="rounded-md border border-line px-4 py-3 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-ink-muted">Total invertido</p>
                <p className="tabular font-display text-lg text-ink">{formatCOP(resumenVarias.invertido)}</p>
              </div>
              <div>
                <p className="text-ink-muted">Total a vender</p>
                <p className="tabular font-display text-lg text-ink">{formatCOP(resumenVarias.venta)}</p>
              </div>
              <div>
                <p className="text-ink-muted">Ganancia / pérdida</p>
                <p
                  className={`tabular font-display text-lg ${
                    resumenVarias.ganancia < 0 ? "text-alert" : "text-settled"
                  }`}
                >
                  {formatCOP(resumenVarias.ganancia)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
