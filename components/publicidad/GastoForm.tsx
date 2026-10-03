"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, MoneyInput, Select, Sheet, Textarea, ToggleGroup } from "@/components/ui";
import { formatCOP } from "@/lib/calc";
import { supabase } from "@/lib/supabaseClient";
import type { GastoPublicidad, Producto } from "@/lib/types";

function hoyISO() {
  // Fecha local, no UTC: toISOString() puede adelantar o atrasar el día según
  // la hora y la zona horaria del dispositivo (ver nota en lib/calc.ts).
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

type Modo = "total" | "dia";

/**
 * Crea o edita un gasto de publicidad. Si se pasa `gasto`, edita ese; si no,
 * crea uno nuevo. El gasto puede asignarse a una referencia (`producto_id`):
 * eso solo lo atribuye a ese producto para ver su ganancia real, no cambia el
 * costo ni el stock del producto.
 */
export function GastoForm({
  productos,
  gasto,
  onClose,
  onSaved,
}: {
  productos: Producto[];
  gasto?: GastoPublicidad;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editando = Boolean(gasto);
  const [fecha, setFecha] = useState(gasto?.fecha ?? hoyISO());
  const [modo, setModo] = useState<Modo>("total");
  const [monto, setMonto] = useState(gasto ? String(gasto.monto) : "");
  const [montoDia, setMontoDia] = useState("");
  const [dias, setDias] = useState("");
  const [productoId, setProductoId] = useState(gasto?.producto_id ?? "");
  const [nota, setNota] = useState(gasto?.nota ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diarioNum = Number(montoDia);
  const diasNum = Number(dias);
  const totalPorDia =
    montoDia && dias && Number.isFinite(diarioNum) && Number.isInteger(diasNum) && diasNum > 0
      ? diarioNum * diasNum
      : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let montoNum: number;
    let notaFinal = nota.trim();
    if (modo === "dia") {
      if (!montoDia.trim() || Number.isNaN(diarioNum) || diarioNum <= 0) {
        setError("Escribe cuánto gastas por día, mayor a 0.");
        return;
      }
      if (!dias.trim() || !Number.isInteger(diasNum) || diasNum <= 0) {
        setError("Escribe cuántos días dura, un número entero mayor a 0.");
        return;
      }
      montoNum = diarioNum * diasNum;
      if (!notaFinal) notaFinal = `${formatCOP(diarioNum)}/día × ${diasNum} días`;
    } else {
      montoNum = Number(monto);
      if (!monto.trim() || Number.isNaN(montoNum) || montoNum <= 0) {
        setError("Escribe un monto válido, mayor a 0.");
        return;
      }
    }

    setSaving(true);
    const payload = {
      fecha,
      monto: montoNum,
      nota: notaFinal || null,
      producto_id: productoId || null,
    };
    const { error } = gasto
      ? await supabase.from("gastos_publicidad").update(payload).eq("id", gasto.id)
      : await supabase.from("gastos_publicidad").insert(payload);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Sheet title={editando ? "Editar gasto de publicidad" : "Registrar gasto de publicidad"} onClose={onClose}>
      {/* noValidate: toda la validación está en handleSubmit, con mensajes en español
          (la nativa del navegador frenaba el envío sin limpiar el error anterior). */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field label="Fecha" htmlFor="fecha">
          <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>

        <Field
          label="Producto (opcional)"
          htmlFor="producto"
          hint="Si lo asignas, baja la ganancia de esa referencia y se muestra su costo con publicidad. No cambia su costo ni su stock en inventario."
        >
          <Select id="producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">Sin asignar — gasto general</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.categoria})
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">¿Cómo registras el monto?</span>
          <ToggleGroup
            name="Forma del monto"
            value={modo}
            onChange={(m) => {
              setModo(m);
              setError(null);
            }}
            options={[
              { value: "total", label: "Monto total" },
              { value: "dia", label: "Por día × días" },
            ]}
          />
        </div>

        {modo === "total" ? (
          <Field label="Monto" htmlFor="monto" hint="Gasto extra: no se suma al costo de ningún lote.">
            <MoneyInput id="monto" value={monto} onChange={setMonto} placeholder="0" required />
          </Field>
        ) : (
          <>
            <Field label="Monto por día" htmlFor="monto-dia">
              <MoneyInput id="monto-dia" value={montoDia} onChange={setMontoDia} placeholder="0" required />
            </Field>
            <Field
              label="Días"
              htmlFor="dias"
              hint={totalPorDia > 0 ? `Total: ${formatCOP(totalPorDia)}` : "Cuántos días dura el impulso."}
            >
              <Input
                id="dias"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                placeholder="0"
                required
              />
            </Field>
          </>
        )}

        <Field label="Nota (opcional)" htmlFor="nota">
          <Textarea
            id="nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. impulso publicación Jellycat Cake"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Guardando…" : editando ? "Guardar cambios" : "Registrar gasto"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
