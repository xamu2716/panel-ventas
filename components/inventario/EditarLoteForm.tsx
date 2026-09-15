"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button, Field, Input, MoneyInput, Sheet, ToggleGroup } from "@/components/ui";
import { costoUnitarioLineaLote, formatCOP } from "@/lib/calc";
import { aplicarCambiosDeLote } from "@/lib/lotesSync";
import type { LoteConItems, MetodoImportacion } from "@/lib/types";

type LineaForm = {
  id: string;
  productoId: string;
  nombre: string;
  costoMercancia: string;
  unidades: string;
  publicidad: string;
};

type Props = {
  lote: LoteConItems;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Editar un lote ya registrado: solo el lote más reciente de cada una de sus
 * referencias (ver `esLoteEditable` en lib/lotesSync.ts) puede llegar aquí.
 * A diferencia de "Nuevo lote", las líneas son una lista fija — no se pueden
 * agregar, quitar, ni cambiar a qué producto apunta cada una. Si falta una
 * referencia, se registra un lote nuevo (puede ser de una sola línea).
 */
export function EditarLoteForm({ lote, onClose, onSaved }: Props) {
  const [fecha, setFecha] = useState(lote.fecha);
  const [metodo, setMetodo] = useState<MetodoImportacion>(lote.metodo_importacion);
  const [fleteTotal, setFleteTotal] = useState(String(lote.flete_total));
  const [seguroTotal, setSeguroTotal] = useState(String(lote.seguro_total));
  const [tarifaAvionTotal, setTarifaAvionTotal] = useState(String(lote.tarifa_avion_total));
  const [arancelPct, setArancelPct] = useState(String(lote.arancel_pct));
  const [notas, setNotas] = useState(lote.notas ?? "");
  const [lineas, setLineas] = useState<LineaForm[]>(
    lote.lote_items.map((li) => ({
      id: li.id,
      productoId: li.producto_id,
      nombre: li.producto?.nombre ?? "Referencia eliminada",
      costoMercancia: String(li.costo_mercancia),
      unidades: String(li.unidades),
      publicidad: String(li.publicidad),
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));

  function actualizarLinea(id: string, cambios: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, ...cambios } : l)));
  }

  const unidadesTotalLote = useMemo(() => lineas.reduce((acc, l) => acc + num(l.unidades), 0), [lineas]);

  function calcularLinea(linea: LineaForm) {
    return costoUnitarioLineaLote({
      metodo,
      costoMercancia: num(linea.costoMercancia),
      unidades: num(linea.unidades),
      publicidad: num(linea.publicidad),
      unidadesTotalLote,
      fleteTotal: num(fleteTotal),
      seguroTotal: num(seguroTotal),
      tarifaAvionTotal: num(tarifaAvionTotal),
      arancelPct: num(arancelPct),
    });
  }

  const costoTotalLote = lineas.reduce((acc, l) => acc + calcularLinea(l).costoUnitario * num(l.unidades), 0);

  function validar(): string | null {
    for (const l of lineas) {
      if (num(l.unidades) <= 0) return "Cada línea necesita unidades mayores a 0.";
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
    try {
      await aplicarCambiosDeLote(lote, {
        fecha,
        metodoImportacion: metodo,
        fleteTotal: num(fleteTotal),
        seguroTotal: metodo === "avion" ? num(seguroTotal) : 0,
        tarifaAvionTotal: metodo === "avion" ? num(tarifaAvionTotal) : 0,
        arancelPct: metodo === "avion" ? num(arancelPct) : 0,
        notas: notas.trim() || null,
        lineas: lineas.map((l) => ({
          id: l.id,
          productoId: l.productoId,
          costoMercancia: num(l.costoMercancia),
          unidades: num(l.unidades),
          publicidad: num(l.publicidad),
        })),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el lote.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="Editar lote" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <p className="text-sm text-ink-muted">
          Puedes corregir los costos compartidos y los números de cada referencia. No se pueden
          agregar ni quitar líneas — si falta una referencia, registra un lote nuevo para ella.
        </p>

        <Field label="Fecha" htmlFor="fecha-editar">
          <Input id="fecha-editar" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>

        <Field label="Método de importación" htmlFor="metodo-editar">
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
          <Field label="Flete total del envío" htmlFor="fleteTotal-editar">
            <MoneyInput id="fleteTotal-editar" value={fleteTotal} onChange={setFleteTotal} placeholder="0" />
          </Field>
          {metodo === "avion" && (
            <>
              <Field label="Seguro total del envío" htmlFor="seguroTotal-editar">
                <MoneyInput id="seguroTotal-editar" value={seguroTotal} onChange={setSeguroTotal} placeholder="0" />
              </Field>
              <Field label="Tarifa aérea total" htmlFor="tarifaAvionTotal-editar">
                <MoneyInput
                  id="tarifaAvionTotal-editar"
                  value={tarifaAvionTotal}
                  onChange={setTarifaAvionTotal}
                  placeholder="Ej. 130.000"
                />
              </Field>
              <Field
                label="Arancel de este envío (%)"
                htmlFor="arancelPct-editar"
                hint="Se calcula una sola vez sobre el CIF de toda la caja, no por referencia."
              >
                <Input
                  id="arancelPct-editar"
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
          <p className="text-sm font-semibold text-ink">Referencias de este lote</p>
          {lineas.map((linea) => {
            const { fleteAsignado, seguroAsignado, tarifaAsignada, costoUnitario } = calcularLinea(linea);
            return (
              <div key={linea.id} className="flex flex-col gap-3 rounded-md border border-line bg-paper/60 p-4">
                <p className="font-semibold text-ink">{linea.nombre}</p>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Costo de mercancía" htmlFor={`mercancia-${linea.id}`}>
                    <MoneyInput
                      id={`mercancia-${linea.id}`}
                      value={linea.costoMercancia}
                      onChange={(v) => actualizarLinea(linea.id, { costoMercancia: v })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Unidades" htmlFor={`unidades-${linea.id}`}>
                    <Input
                      id={`unidades-${linea.id}`}
                      inputMode="numeric"
                      value={linea.unidades}
                      onChange={(e) => actualizarLinea(linea.id, { unidades: e.target.value })}
                      placeholder="Ej. 4"
                    />
                  </Field>
                  <Field label="Publicidad (opcional)" htmlFor={`publicidad-${linea.id}`}>
                    <MoneyInput
                      id={`publicidad-${linea.id}`}
                      value={linea.publicidad}
                      onChange={(v) => actualizarLinea(linea.id, { publicidad: v })}
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

        <Field label="Notas (opcional)" htmlFor="notas-editar">
          <Input id="notas-editar" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
