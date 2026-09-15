"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, MoneyInput, Sheet } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import type { Producto } from "@/lib/types";

type Props = {
  producto?: Producto;
  categoriasExistentes: readonly string[];
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Solo identidad de la referencia (nombre, categoría, precio, umbral de stock
 * bajo). El costo real, el stock y el arancel (que es del envío, no de la
 * referencia) ya NO se cargan aquí: salen de registrar un lote (ver
 * LoteForm), que puede traer varias referencias a la vez y reparte
 * flete/seguro/tarifa/arancel entre ellas. Los campos de abajo en modo
 * edición son solo un ajuste manual puntual, no el flujo normal.
 */
export function ProductoForm({ producto, categoriasExistentes, onClose, onSaved }: Props) {
  const editando = !!producto;

  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoria, setCategoria] = useState(producto?.categoria ?? "");
  const [precioVenta, setPrecioVenta] = useState(String(producto?.precio_venta ?? ""));
  const [umbral, setUmbral] = useState(String(producto?.umbral_stock_bajo ?? "3"));
  const [stock, setStock] = useState(String(producto?.stock ?? ""));
  const [costoUnitario, setCostoUnitario] = useState(String(producto?.costo_unitario ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("Escribe el nombre o referencia del producto.");
      return;
    }
    if (!categoria.trim()) {
      setError("Escribe la categoría del producto (ej. chaqueta, jellycat).");
      return;
    }
    if (num(precioVenta) <= 0) {
      setError("El precio de venta debe ser mayor a 0.");
      return;
    }

    setSaving(true);
    const payload = {
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      precio_venta: num(precioVenta),
      umbral_stock_bajo: num(umbral),
      ...(editando
        ? { stock: num(stock), costo_unitario: num(costoUnitario) }
        : { stock: 0, costo_unitario: 0 }),
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

        <Field
          label="Categoría"
          htmlFor="categoria"
          hint="Escribe la que necesites — no está limitada a una lista fija."
        >
          <Input
            id="categoria"
            list="categorias-existentes"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ej. chaqueta, jellycat…"
            required
          />
          <datalist id="categorias-existentes">
            {categoriasExistentes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Precio de venta (por unidad)" htmlFor="precioVenta">
          <MoneyInput id="precioVenta" value={precioVenta} onChange={setPrecioVenta} placeholder="0" required />
        </Field>

        <Field label="Aviso de stock bajo cuando queden" htmlFor="umbral">
          <Input
            id="umbral"
            inputMode="numeric"
            value={umbral}
            onChange={(e) => setUmbral(e.target.value)}
          />
        </Field>

        {editando ? (
          <div className="flex flex-col gap-5 rounded-md border border-line bg-paper/60 p-4">
            <p className="text-sm font-semibold text-ink">Ajuste manual (opcional)</p>
            <Field
              label="Stock actual"
              htmlFor="stock"
              hint="El stock normal sube al registrar un lote y baja al entregar un pedido. Usa esto solo para corregir un error puntual."
            >
              <Input
                id="stock"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </Field>
            <Field
              label="Costo unitario"
              htmlFor="costoUnitario"
              hint="El costo normal es el promedio ponderado de los lotes recibidos. Usa esto solo para un ajuste puntual."
            >
              <MoneyInput id="costoUnitario" value={costoUnitario} onChange={setCostoUnitario} />
            </Field>
          </div>
        ) : (
          <p className="rounded-md border border-line bg-paper/60 px-3 py-2.5 text-xs text-ink-muted">
            Esta referencia se crea sin stock ni costo todavía — usa &quot;Nuevo lote&quot; después
            para cargarle la primera compra.
          </p>
        )}

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
