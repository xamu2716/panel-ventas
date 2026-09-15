"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button, Field, Input, MoneyInput, Select, Sheet, ToggleGroup } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { costoPromedioPonderado, costoUnitarioLineaLote, formatCOP } from "@/lib/calc";
import type { MetodoImportacion, Producto } from "@/lib/types";
import { IconPlus, IconTrash } from "@/components/icons";

function hoyISO() {
  // Fecha local, no UTC — ver nota en lib/calc.ts.
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

type Item = {
  key: string;
  modo: "existente" | "nueva";
  productoId: string;
  nombreNuevo: string;
  categoriaNueva: string;
  precioVentaNueva: string;
  costoMercancia: string;
  unidades: string;
  publicidad: string;
};

function nuevoItem(hayExistentes: boolean): Item {
  return {
    key: crypto.randomUUID(),
    modo: hayExistentes ? "existente" : "nueva",
    productoId: "",
    nombreNuevo: "",
    categoriaNueva: "",
    precioVentaNueva: "",
    costoMercancia: "",
    unidades: "",
    publicidad: "",
  };
}

type Props = {
  productos: Producto[];
  categoriasExistentes: readonly string[];
  onClose: () => void;
  onSaved: () => void;
};

export function LoteForm({ productos, categoriasExistentes, onClose, onSaved }: Props) {
  const hayExistentes = productos.length > 0;

  const [fecha, setFecha] = useState(hoyISO());
  const [metodo, setMetodo] = useState<MetodoImportacion>("barco");
  const [fleteTotal, setFleteTotal] = useState("");
  const [seguroTotal, setSeguroTotal] = useState("");
  const [tarifaAvionTotal, setTarifaAvionTotal] = useState("");
  const [arancelPct, setArancelPct] = useState("0");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<Item[]>([nuevoItem(hayExistentes)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));

  function actualizarItem(key: string, cambios: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...cambios } : it)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, nuevoItem(hayExistentes)]);
  }

  function quitarItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  const unidadesTotalLote = useMemo(
    () => items.reduce((acc, it) => acc + num(it.unidades), 0),
    [items],
  );

  // El arancel es del envío completo (se calcula una sola vez sobre el CIF de
  // toda la caja), no de una referencia — por eso es un solo valor del lote,
  // no un campo por línea. Aun así, cada línea paga arancel solo sobre SU
  // propio CIF (mercancía propia + su parte prorrateada de seguro/flete), lo
  // que en conjunto da el mismo total que calcularlo una vez para toda la caja.
  function calcularLinea(item: Item) {
    return costoUnitarioLineaLote({
      metodo,
      costoMercancia: num(item.costoMercancia),
      unidades: num(item.unidades),
      publicidad: num(item.publicidad),
      unidadesTotalLote,
      fleteTotal: num(fleteTotal),
      seguroTotal: num(seguroTotal),
      tarifaAvionTotal: num(tarifaAvionTotal),
      arancelPct: num(arancelPct),
    });
  }

  // El total real del lote es la suma de lo que cuesta cada línea ya
  // nacionalizada (costo unitario resultante × sus unidades) — NO la suma de
  // los insumos crudos, que se queda corta porque no incluye el arancel ni el
  // IVA de nacionalización cuando el envío es por avión.
  const costoTotalLote = items.reduce((acc, it) => {
    const unidades = num(it.unidades);
    return acc + calcularLinea(it).costoUnitario * unidades;
  }, 0);

  function validar(): string | null {
    if (items.length === 0) return "Agrega al menos una referencia.";
    for (const it of items) {
      if (num(it.unidades) <= 0) return "Cada línea necesita unidades mayores a 0.";
      if (it.modo === "existente" && !it.productoId) return "Elige un producto para cada línea, o marca \"Nueva referencia\".";
      if (it.modo === "nueva") {
        if (!it.nombreNuevo.trim()) return "Escribe el nombre de la referencia nueva.";
        if (!it.categoriaNueva.trim()) return "Escribe la categoría de la referencia nueva.";
        if (num(it.precioVentaNueva) <= 0) return "El precio de venta de la referencia nueva debe ser mayor a 0.";
      }
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const mensaje = validar();
    if (mensaje) {
      setError(mensaje);
      return;
    }

    setSaving(true);

    // Estado en memoria de stock/costo por producto, para que el promedio
    // ponderado se componga bien incluso si dos líneas del mismo lote son la
    // misma referencia (cada línea parte del resultado de la anterior, no de
    // un valor viejo leído antes de este envío).
    const estado = new Map(productos.map((p) => [p.id, { stock: p.stock, costo: p.costo_unitario }]));

    // 1) Crear las referencias nuevas primero, para tener su id.
    const resueltos: (Item & { productoIdFinal: string })[] = [];
    for (const it of items) {
      if (it.modo === "existente") {
        resueltos.push({ ...it, productoIdFinal: it.productoId });
        continue;
      }
      const { data, error: errNuevo } = await supabase
        .from("productos")
        .insert({
          nombre: it.nombreNuevo.trim(),
          categoria: it.categoriaNueva.trim(),
          precio_venta: num(it.precioVentaNueva),
          umbral_stock_bajo: 3,
          stock: 0,
          costo_unitario: 0,
        })
        .select("id")
        .single();
      if (errNuevo || !data) {
        setSaving(false);
        setError(`No se pudo crear "${it.nombreNuevo}": ${errNuevo?.message ?? "error desconocido"}`);
        return;
      }
      estado.set(data.id, { stock: 0, costo: 0 });
      resueltos.push({ ...it, productoIdFinal: data.id });
    }

    // 2) Cabecera del lote.
    const { data: lote, error: errLote } = await supabase
      .from("lotes")
      .insert({
        fecha,
        metodo_importacion: metodo,
        flete_total: num(fleteTotal),
        seguro_total: metodo === "avion" ? num(seguroTotal) : 0,
        tarifa_avion_total: metodo === "avion" ? num(tarifaAvionTotal) : 0,
        arancel_pct: metodo === "avion" ? num(arancelPct) : 0,
        notas: notas.trim() || null,
      })
      .select("id")
      .single();
    if (errLote || !lote) {
      setSaving(false);
      setError(`No se pudo registrar el lote: ${errLote?.message ?? "error desconocido"}`);
      return;
    }

    // 3) Una línea (lote_items) por referencia, con su costo ya calculado.
    for (const it of resueltos) {
      const { costoUnitario } = calcularLinea(it);
      const { error: errItem } = await supabase.from("lote_items").insert({
        lote_id: lote.id,
        producto_id: it.productoIdFinal,
        costo_mercancia: num(it.costoMercancia),
        unidades: num(it.unidades),
        publicidad: num(it.publicidad),
        costo_unitario_resultante: costoUnitario,
      });
      if (errItem) {
        setSaving(false);
        setError(`El lote quedó registrado, pero falló una línea: ${errItem.message}`);
        return;
      }

      // 4) Sumar stock y recalcular el promedio ponderado de esa referencia.
      const actual = estado.get(it.productoIdFinal) ?? { stock: 0, costo: 0 };
      const unidadesNuevas = num(it.unidades);
      const nuevoCosto = costoPromedioPonderado({
        stockActual: actual.stock,
        costoActual: actual.costo,
        unidadesNuevas,
        costoUnitarioNuevo: costoUnitario,
      });
      const nuevoStock = actual.stock + unidadesNuevas;
      estado.set(it.productoIdFinal, { stock: nuevoStock, costo: nuevoCosto });
      const { error: errUpd } = await supabase
        .from("productos")
        .update({ stock: nuevoStock, costo_unitario: nuevoCosto })
        .eq("id", it.productoIdFinal);
      if (errUpd) {
        setSaving(false);
        setError(`El lote quedó registrado, pero no se pudo actualizar el stock: ${errUpd.message}`);
        return;
      }
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Sheet title="Nuevo lote" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <p className="text-sm text-ink-muted">
          Un lote es un envío/compra real. Si trae varias referencias, el flete/seguro/tarifa/arancel
          se reparte entre ellas según sus unidades.
        </p>

        <Field label="Fecha" htmlFor="fecha">
          <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>

        <Field label="Método de importación" htmlFor="metodo">
          <ToggleGroup
            name="Método de importación"
            value={metodo}
            onChange={setMetodo}
            options={[
              { value: "barco", label: "Barco" },
              { value: "avion", label: "Avión" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Flete total del envío" htmlFor="fleteTotal">
            <MoneyInput id="fleteTotal" value={fleteTotal} onChange={setFleteTotal} placeholder="0" />
          </Field>
          {metodo === "avion" && (
            <>
              <Field label="Seguro total del envío" htmlFor="seguroTotal">
                <MoneyInput id="seguroTotal" value={seguroTotal} onChange={setSeguroTotal} placeholder="0" />
              </Field>
              <Field label="Tarifa aérea total" htmlFor="tarifaAvionTotal">
                <MoneyInput
                  id="tarifaAvionTotal"
                  value={tarifaAvionTotal}
                  onChange={setTarifaAvionTotal}
                  placeholder="Ej. 130.000"
                />
              </Field>
              <Field
                label="Arancel de este envío (%)"
                htmlFor="arancelPct"
                hint="Se calcula una sola vez sobre el CIF de toda la caja (mercancía + seguro + flete de todas las líneas), no por referencia."
              >
                <Input
                  id="arancelPct"
                  inputMode="decimal"
                  value={arancelPct}
                  onChange={(e) => setArancelPct(e.target.value)}
                  placeholder="Ej. 10"
                />
              </Field>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-ink">Referencias en este lote</p>
          {items.map((item, idx) => {
            const { fleteAsignado, seguroAsignado, tarifaAsignada, costoUnitario } = calcularLinea(item);
            return (
              <div key={item.key} className="flex flex-col gap-3 rounded-md border border-line bg-paper/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <ToggleGroup
                    name={`Modo línea ${idx + 1}`}
                    value={item.modo}
                    onChange={(modo) => actualizarItem(item.key, { modo })}
                    options={[
                      { value: "existente", label: "Existente" },
                      { value: "nueva", label: "Nueva referencia" },
                    ]}
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarItem(item.key)}
                      aria-label={`Quitar línea ${idx + 1}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-alert-soft hover:text-alert"
                    >
                      <IconTrash size={18} />
                    </button>
                  )}
                </div>

                {item.modo === "existente" ? (
                  <Field label="Producto" htmlFor={`producto-${item.key}`}>
                    <Select
                      id={`producto-${item.key}`}
                      value={item.productoId}
                      onChange={(e) => actualizarItem(item.key, { productoId: e.target.value })}
                    >
                      <option value="">Elige una referencia…</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nombre" htmlFor={`nombre-${item.key}`}>
                      <Input
                        id={`nombre-${item.key}`}
                        value={item.nombreNuevo}
                        onChange={(e) => actualizarItem(item.key, { nombreNuevo: e.target.value })}
                        placeholder="Ej. Jellycat Popcorn"
                      />
                    </Field>
                    <Field label="Categoría" htmlFor={`categoria-${item.key}`}>
                      <Input
                        id={`categoria-${item.key}`}
                        list="categorias-existentes-lote"
                        value={item.categoriaNueva}
                        onChange={(e) => actualizarItem(item.key, { categoriaNueva: e.target.value })}
                        placeholder="Ej. jellycat"
                      />
                      <datalist id="categorias-existentes-lote">
                        {categoriasExistentes.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </Field>
                    <Field label="Precio de venta" htmlFor={`precio-${item.key}`}>
                      <MoneyInput
                        id={`precio-${item.key}`}
                        value={item.precioVentaNueva}
                        onChange={(v) => actualizarItem(item.key, { precioVentaNueva: v })}
                        placeholder="0"
                      />
                    </Field>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Costo de mercancía" htmlFor={`mercancia-${item.key}`}>
                    <MoneyInput
                      id={`mercancia-${item.key}`}
                      value={item.costoMercancia}
                      onChange={(v) => actualizarItem(item.key, { costoMercancia: v })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Unidades" htmlFor={`unidades-${item.key}`}>
                    <Input
                      id={`unidades-${item.key}`}
                      inputMode="numeric"
                      value={item.unidades}
                      onChange={(e) => actualizarItem(item.key, { unidades: e.target.value })}
                      placeholder="Ej. 4"
                    />
                  </Field>
                  <Field
                    label="Publicidad (opcional)"
                    htmlFor={`publicidad-${item.key}`}
                    hint="Solo si vas a promocionar este lote — no es obligatorio en cada reabastecimiento."
                  >
                    <MoneyInput
                      id={`publicidad-${item.key}`}
                      value={item.publicidad}
                      onChange={(v) => actualizarItem(item.key, { publicidad: v })}
                      placeholder="0"
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-1 rounded-md border border-line bg-surface px-3 py-2.5 text-xs text-ink-muted">
                  <p>
                    Flete asignado: <span className="tabular font-medium text-ink">{formatCOP(fleteAsignado)}</span>
                    {metodo === "avion" && (
                      <>
                        {" · Seguro: "}
                        <span className="tabular font-medium text-ink">{formatCOP(seguroAsignado)}</span>
                        {" · Tarifa: "}
                        <span className="tabular font-medium text-ink">{formatCOP(tarifaAsignada)}</span>
                      </>
                    )}
                  </p>
                  <p>
                    Costo unitario resultante:{" "}
                    <span className="tabular font-display text-sm text-accent-strong">
                      {formatCOP(costoUnitario)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="secondary" onClick={agregarItem} className="self-start">
            <IconPlus size={16} /> Agregar otra referencia
          </Button>
        </div>

        <div className="rounded-md border border-line px-4 py-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-ink-muted">Unidades del lote</p>
              <p className="tabular font-display text-lg text-ink">{unidadesTotalLote}</p>
            </div>
            <div>
              <p className="text-ink-muted">Costo total del lote</p>
              <p className="tabular font-display text-lg text-ink">{formatCOP(costoTotalLote)}</p>
            </div>
          </div>
          {metodo === "avion" && (
            <p className="mt-2 text-xs text-ink-muted">
              Ya incluye el arancel y el IVA de nacionalización de cada línea, no solo los insumos.
            </p>
          )}
        </div>

        <Field label="Notas (opcional)" htmlFor="notas">
          <Input
            id="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. caja de avión con 4 referencias de Jellycat"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Registrando…" : "Registrar lote"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
