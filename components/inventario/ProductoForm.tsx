"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button, Field, Input, Sheet, ToggleGroup } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { costoUnitarioLote, formatCOP, gananciaUnidad, margenPct } from "@/lib/calc";
import type { Linea, Producto } from "@/lib/types";

type Props = {
  producto?: Producto;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductoForm({ producto, onClose, onSaved }: Props) {
  const editando = !!producto;

  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [linea, setLinea] = useState<Linea>(producto?.linea ?? "chaqueta");
  const [alibaba, setAlibaba] = useState(String(producto?.costo_lote_alibaba ?? ""));
  const [flete, setFlete] = useState(String(producto?.flete_lote ?? ""));
  const [publicidad, setPublicidad] = useState(String(producto?.publicidad_lote ?? ""));
  const [unidadesLote, setUnidadesLote] = useState(String(producto?.unidades_lote ?? ""));
  const [costoUnitario, setCostoUnitario] = useState(String(producto?.costo_unitario ?? ""));
  const [costoTocado, setCostoTocado] = useState(false);
  const [precioVenta, setPrecioVenta] = useState(String(producto?.precio_venta ?? ""));
  const [stock, setStock] = useState(String(producto?.stock ?? ""));
  const [umbral, setUmbral] = useState(String(producto?.umbral_stock_bajo ?? "3"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));

  const costoCalculado = useMemo(
    () =>
      costoUnitarioLote({
        alibaba: num(alibaba),
        flete: num(flete),
        publicidad: num(publicidad),
        unidades: num(unidadesLote),
      }),
    [alibaba, flete, publicidad, unidadesLote],
  );

  const costoEfectivo = costoTocado ? num(costoUnitario) : costoCalculado;
  const ganancia = gananciaUnidad(num(precioVenta), costoEfectivo);
  const margen = margenPct(num(precioVenta), costoEfectivo);

  function recalcularCosto() {
    setCostoTocado(false);
    setCostoUnitario(String(costoCalculado));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("Escribe el nombre o referencia del producto.");
      return;
    }
    if (num(unidadesLote) <= 0) {
      setError("Las unidades del lote deben ser al menos 1.");
      return;
    }
    if (num(precioVenta) <= 0) {
      setError("El precio de venta debe ser mayor a 0.");
      return;
    }

    setSaving(true);
    const payload = {
      nombre: nombre.trim(),
      linea,
      costo_lote_alibaba: num(alibaba),
      flete_lote: num(flete),
      publicidad_lote: num(publicidad),
      unidades_lote: num(unidadesLote),
      costo_unitario: costoEfectivo,
      precio_venta: num(precioVenta),
      umbral_stock_bajo: num(umbral),
      ...(editando ? { stock: num(stock) } : { stock: num(unidadesLote) }),
    };

    const { error } = editando
      ? await supabase.from("productos").update(payload).eq("id", producto!.id)
      : await supabase.from("productos").insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Sheet title={editando ? "Editar referencia" : "Nueva referencia"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Nombre / referencia" htmlFor="nombre">
          <Input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Chaqueta LY2057 Black"
            required
          />
        </Field>

        <Field label="Línea" htmlFor="linea">
          <ToggleGroup
            name="Línea de producto"
            value={linea}
            onChange={setLinea}
            options={[
              { value: "chaqueta", label: "Chaqueta" },
              { value: "jellycat", label: "Jellycat" },
            ]}
          />
        </Field>

        <div className="rounded-md border border-line bg-paper/60 p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Costo del lote</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Costo en Alibaba" htmlFor="alibaba">
              <Input
                id="alibaba"
                inputMode="decimal"
                value={alibaba}
                onChange={(e) => setAlibaba(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Flete" htmlFor="flete">
              <Input
                id="flete"
                inputMode="decimal"
                value={flete}
                onChange={(e) => setFlete(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Publicidad del lote" htmlFor="publicidad">
              <Input
                id="publicidad"
                inputMode="decimal"
                value={publicidad}
                onChange={(e) => setPublicidad(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Unidades del lote" htmlFor="unidadesLote">
              <Input
                id="unidadesLote"
                inputMode="numeric"
                value={unidadesLote}
                onChange={(e) => setUnidadesLote(e.target.value)}
                placeholder="Ej. 20"
                required
              />
            </Field>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 rounded-md bg-accent-soft/50 px-3 py-3">
            <div>
              <p className="text-xs text-ink-muted">Costo unitario resultante</p>
              <p className="font-display text-xl text-accent-strong">
                {formatCOP(costoTocado ? num(costoUnitario) : costoCalculado)}
              </p>
            </div>
            {costoTocado && (
              <button
                type="button"
                onClick={recalcularCosto}
                className="text-xs font-semibold text-route-strong underline underline-offset-2"
              >
                Recalcular desde el lote
              </button>
            )}
          </div>
          <Field
            label="Ajustar costo unitario manualmente (opcional)"
            htmlFor="costoUnitario"
            hint="Se calcula solo desde el lote de arriba; solo edítalo si necesitas un ajuste puntual."
          >
            <Input
              id="costoUnitario"
              inputMode="decimal"
              value={costoTocado ? costoUnitario : String(Math.round(costoCalculado))}
              onChange={(e) => {
                setCostoTocado(true);
                setCostoUnitario(e.target.value);
              }}
            />
          </Field>
        </div>

        <Field label="Precio de venta (por unidad)" htmlFor="precioVenta">
          <Input
            id="precioVenta"
            inputMode="decimal"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(e.target.value)}
            placeholder="0"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-line px-4 py-3">
          <div>
            <p className="text-xs text-ink-muted">Ganancia / unidad</p>
            <p
              className={`font-display text-lg ${ganancia < 0 ? "text-alert" : "text-settled"}`}
            >
              {formatCOP(ganancia)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Margen</p>
            <p className={`font-display text-lg ${margen < 0 ? "text-alert" : "text-settled"}`}>
              {margen.toFixed(1)}%
            </p>
          </div>
        </div>

        {editando && (
          <Field
            label="Stock actual"
            htmlFor="stock"
            hint="Ajusta aquí si necesitas corregir el stock a mano."
          >
            <Input
              id="stock"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
        )}

        <Field label="Aviso de stock bajo cuando queden" htmlFor="umbral">
          <Input
            id="umbral"
            inputMode="numeric"
            value={umbral}
            onChange={(e) => setUmbral(e.target.value)}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear referencia"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
