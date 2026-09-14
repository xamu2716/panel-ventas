"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Sheet, Textarea } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";

function hoyISO() {
  // Fecha local, no UTC: toISOString() puede adelantar o atrasar el día según
  // la hora y la zona horaria del dispositivo (ver nota en lib/calc.ts).
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

export function GastoForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNum = Number(monto);
    if (!monto.trim() || Number.isNaN(montoNum) || montoNum <= 0) {
      setError("Escribe un monto válido, mayor a 0.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("gastos_publicidad")
      .insert({ fecha, monto: montoNum, nota: nota.trim() || null });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Sheet title="Registrar gasto de publicidad" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Fecha" htmlFor="fecha">
          <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field
          label="Monto"
          htmlFor="monto"
          hint="Publicidad extra, no ligada al costo de un lote de producto."
        >
          <Input
            id="monto"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            required
          />
        </Field>
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
            {saving ? "Guardando…" : "Registrar gasto"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
