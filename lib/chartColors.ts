/**
 * Colores de gráficas — derivados de los tokens de marca (app/globals.css) pero
 * ajustados en croma/luminosidad y validados con el validador de accesibilidad
 * de la skill dataviz (contraste, separación CVD y piso de visión normal) contra
 * la superficie de tarjeta (#fffcf4). Los tokens de marca "puros" (más apagados)
 * se quedan en la UI de badges/botones, donde siempre van acompañados de ícono
 * y texto; aquí, donde el color es la única forma de distinguir series en una
 * gráfica, necesitan más croma para separarse de verdad.
 */

// Par fijo de 2 series para gráficas con exactamente dos categorías que NO son
// "categoría de producto" (ej. tipo de entrega: recoge vs. domicilio). Nunca se
// ciclan ni se reasignan según el filtro activo.
export const CHART_SLOT_1 = "#c1531c"; // terracota — mismo acento que el resto de la UI
export const CHART_SLOT_2 = "#0592a3"; // teal de gráfica (más vívido que --route de la UI)

// Serie adicional para la línea de ingresos vs. ganancia (2 series, ambas dinero).
export const CHART_INGRESOS = CHART_SLOT_1;
export const CHART_GANANCIA = "#38804b"; // verde de gráfica (más vívido que --settled de la UI)

/**
 * Paleta categórica para "categoría de producto" (dinámica: el dueño puede
 * escribir la que quiera, ya no son solo chaqueta/jellycat). Validada con el
 * validador de accesibilidad de la skill dataviz contra la superficie de tarjeta
 * (#fffcf4): banda de luminosidad, piso de croma, separación CVD (par adyacente,
 * modo claro) y piso de visión normal — los 5 slots pasan todos los checks
 * (ver `node scripts/validate_palette.js` de la skill dataviz). Se evitó un 6º/7º
 * slot (violeta) porque colisiona con el azul bajo protanopia/deuteranopia.
 * Con más de 5 categorías reales (muy improbable para este negocio), los colores
 * se repiten — es preferible a inventar un hue no validado.
 */
export const CATEGORIA_PALETTE = [
  CHART_SLOT_1, // terracota
  CHART_SLOT_2, // teal
  "#b07a00", // dorado/mostaza
  "#1f5fb0", // azul
  "#d1447e", // magenta
] as const;

/**
 * Asigna un color estable a una categoría según su posición en la lista de
 * categorías ordenadas (alfabético, calculada una sola vez por vista con
 * `categoriasDisponibles`). Estable = la misma categoría siempre sale del mismo
 * color mientras no cambie el conjunto de categorías presentes.
 */
export function colorCategoria(categoria: string, categoriasOrdenadas: readonly string[]): string {
  const idx = categoriasOrdenadas.indexOf(categoria);
  if (idx < 0) return CATEGORIA_PALETTE[0];
  return CATEGORIA_PALETTE[idx % CATEGORIA_PALETTE.length];
}

// Rampa ordinal (una sola tonalidad, terracota, clara→oscura) para las 4 etapas
// del pedido: es una secuencia de embudo, no identidades sueltas, así que usa
// un solo hue con pasos de luminosidad en vez de 4 colores categóricos.
export const CHART_ESTADO_RAMP: Record<"nuevo" | "apartado" | "listo" | "entregado", string> = {
  nuevo: "#d0612d",
  apartado: "#ba4c12",
  listo: "#a43800",
  entregado: "#8e2200",
};

export const CHART_GRID = "#ddd0ba"; // = --line
export const CHART_AXIS_TEXT = "#6e6053"; // = --ink-muted
