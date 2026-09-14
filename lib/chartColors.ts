/**
 * Colores de gráficas — derivados de los tokens de marca (app/globals.css) pero
 * ajustados en croma/luminosidad y validados con el validador de accesibilidad
 * de la skill dataviz (contraste, separación CVD y piso de visión normal) contra
 * la superficie de tarjeta (#fffcf4). Los tokens de marca "puros" (más apagados)
 * se quedan en la UI de badges/botones, donde siempre van acompañados de ícono
 * y texto; aquí, donde el color es la única forma de distinguir series en una
 * gráfica, necesitan más croma para separarse de verdad.
 */

// Par categórico de 2 series, orden fijo, reusado en toda gráfica con exactamente
// dos categorías (línea de producto, o tipo de entrega). Nunca se ciclan ni se
// reasignan según el filtro activo.
export const CHART_SLOT_1 = "#c1531c"; // terracota — mismo acento que el resto de la UI
export const CHART_SLOT_2 = "#008f91"; // teal de gráfica (más vívido que --route de la UI)

// Serie adicional para la línea de ingresos vs. ganancia (2 series, ambas dinero).
export const CHART_INGRESOS = CHART_SLOT_1;
export const CHART_GANANCIA = "#38804b"; // verde de gráfica (más vívido que --settled de la UI)

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
