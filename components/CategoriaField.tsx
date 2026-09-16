"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";

const NUEVA = "__nueva__";

type Props = {
  value: string;
  onChange: (v: string) => void;
  categoriasExistentes: readonly string[];
  idPrefix: string;
};

/**
 * Campo de categoría: mientras no hay ninguna categoría creada todavía es un
 * texto libre (no hay nada que ofrecer en un desplegable). En cuanto ya existe
 * al menos una, se convierte en un desplegable con las ya usadas + una opción
 * para escribir una nueva — así no se puede crear "jellycat" y "Jellycat" como
 * categorías distintas por un error de tipeo. Reusado en ProductoForm y en
 * cada línea de "nueva referencia" de LoteForm.
 */
export function CategoriaField({ value, onChange, categoriasExistentes, idPrefix }: Props) {
  const hayCategorias = categoriasExistentes.length > 0;
  const [modoNueva, setModoNueva] = useState(
    !hayCategorias || (value !== "" && !categoriasExistentes.includes(value)),
  );

  if (!hayCategorias || modoNueva) {
    return (
      <Field
        label="Categoría"
        htmlFor={`${idPrefix}-categoria-nueva`}
        hint={hayCategorias ? undefined : "Escribe la primera — luego podrás elegirla de una lista."}
      >
        <Input
          id={`${idPrefix}-categoria-nueva`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ej. chaqueta, jellycat…"
          required
        />
        {hayCategorias && (
          <button
            type="button"
            onClick={() => {
              setModoNueva(false);
              onChange("");
            }}
            className="self-start text-xs font-medium text-accent-strong underline underline-offset-2"
          >
            Elegir una categoría existente
          </button>
        )}
      </Field>
    );
  }

  return (
    <Field label="Categoría" htmlFor={`${idPrefix}-categoria`}>
      <Select
        id={`${idPrefix}-categoria`}
        value={value}
        onChange={(e) => {
          if (e.target.value === NUEVA) {
            setModoNueva(true);
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
      >
        <option value="" disabled>
          Elige una categoría…
        </option>
        {categoriasExistentes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={NUEVA}>+ Nueva categoría…</option>
      </Select>
    </Field>
  );
}
