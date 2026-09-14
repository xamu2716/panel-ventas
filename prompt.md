# Prompt para Claude Code — Panel de Ventas (chaquetas + Jellycat)

Antes de empezar, lee `contexto.md` (en esta misma carpeta) completo. Contiene el negocio real detrás de este sistema: qué se vende, cómo se vende, y por qué se necesita. Las cifras que aparecen ahí (costos, precios) son solo para que entiendas el dominio — nada de eso debe quedar precargado ni fijo en el sistema. Todos los productos, costos, precios, pedidos y gastos de publicidad los voy a ingresar yo mismo desde la interfaz, una vez esté construida. No soy el usuario final de datos ya puestos, soy quien los va a cargar día a día.

## Quién lo usa y cómo

Un solo usuario (yo), sin roles ni multiusuario. La interacción más frecuente, por lejos, va a ser cargar un pedido nuevo desde el celular, muchas veces al día, muchas veces parado o con afán mientras respondo mensajes de Facebook Marketplace. Esto no es un detalle menor: la facilidad de uso en celular pesa más que cualquier otra decisión de diseño. Formularios cortos, campos grandes y fáciles de tocar, mínimos pasos, nada que obligue a escribir un número que el sistema ya podría calcular.

## Qué vamos a construir

Un panel de ventas e inventario para revender dos líneas de producto: chaquetas de moto importadas y peluches Jellycat importados, vendidos por Facebook Marketplace. No es una tienda online, no tiene checkout, no se conecta a Facebook (no existe API pública para eso) — es una herramienta interna para registrar y controlar mis propios pedidos, inventario y gastos, cargados a mano pero de la forma más rápida y automatizada posible.

Debe verse y funcionar igual en celular y computador, con los mismos datos sincronizados en tiempo real entre ambos: si registro o cambio algo desde el celular, al abrir el computador después debe verse actualizado, y viceversa. Esto descarta cualquier solución que guarde datos solo en el navegador de un dispositivo (localStorage, archivo local, etc.) — necesita una base de datos real en la nube que ambos dispositivos consulten.

## Requerimiento no negociable: domicilio vs. recoge en casa

Este es el problema central que resuelve el sistema. Cada pedido tiene una de dos formas de entrega:

1. **Recoge en mi casa** — no requiere dirección de destino.
2. **Domicilio** — tengo que llevar o enviar el producto a una dirección del comprador.

En cualquier vista donde aparezca un pedido, debe ser inmediato distinguir cuál es cuál (tag/color visual claro, no un texto pequeño que haya que leer), y si es domicilio, la dirección debe estar visible sin abrir un detalle adicional para encontrarla.

## Estructura funcional

### 1. Tablero de pedidos (vista principal, kanban)
Cuatro columnas que reflejan el flujo real de venta: **Nuevo → Apartado → Listo para entregar → Entregado**.

Cada pedido es una tarjeta con:
- Cliente y contacto (nombre/teléfono de Marketplace)
- Producto y cantidad
- Tag de entrega: domicilio o recoge en casa (visualmente distinto, color/ícono)
- Dirección de entrega visible si es domicilio
- Precio total y ganancia de esa venta (ya calculada, nunca que yo la calcule)
- Señal visual si el pedido lleva varios días sin avanzar de estado

Debe poder cambiarse de columna fácilmente (arrastrar o con un botón de estado), y abrir un detalle con toda la info, opción de editar o eliminar.

**Cargar un pedido nuevo (el flujo más usado, debe ser el más simple del sistema):**
1. Cliente (nombre) y teléfono.
2. Elegir producto de una lista desplegable ya cargada desde el inventario — no escribir el nombre a mano.
3. Cantidad.
4. Domicilio sí/no, con campo de dirección que solo aparece si es domicilio.
5. Notas opcionales.

Precio total y ganancia se calculan solos a partir del producto elegido (que ya tiene su precio de venta y costo guardados) y la cantidad. Yo no escribo ni calculo esos números.

### 2. Inventario
Por cada referencia de producto (chaqueta o jellycat), cargado por mí desde la interfaz, se guarda:
- Nombre/referencia
- Línea de producto (chaqueta / jellycat)
- Costo unitario
- Precio de venta
- Ganancia por unidad = precio venta menos costo (calculado automáticamente, no editable directamente)
- % de margen sobre esa unidad (calculado automáticamente)
- Stock actual

El stock se descuenta automáticamente cuando un pedido pasa a estado "Entregado". Aviso visual cuando el stock de una referencia esté bajo (definir un umbral simple, ej. 3 unidades o menos, configurable).

### 3. Gastos de publicidad
Un lugar simple para registrar gastos de publicidad (fecha, monto, nota opcional de a qué producto o publicación corresponde). Este gasto debe descontarse de la ganancia total en el resumen: la ganancia neta real no es solo precio de venta menos costo de producto, también resta lo invertido en publicidad.

### 4. Resumen / números del negocio
KPIs principales arriba: ingresos totales (de lo entregado/pagado), ganancia neta total acumulada (ya descontando publicidad), monto pendiente por cobrar/entregar, unidades restantes en bodega (valoradas a costo), gasto total en publicidad.

Gráficas (investigadas contra lo que usan dashboards reales de venta/retail para un vendedor pequeño, evitando métricas de e-commerce con tráfico web que no aplican aquí):

1. Línea de tiempo de ingresos y ganancia por día/semana.
2. Barras de ventas por producto/referencia.
3. Barras de margen por producto.
4. Dona/circular de porcentaje de pedidos por domicilio vs. recoge en casa.
5. Barras de stock restante por referencia.
6. Vista simple de pedidos por estado (Nuevo/Apartado/Listo/Entregado), para ver cuellos de botella.

Tabla de desglose por producto (vendido, pendiente, margen) debajo de las gráficas.

## Restricciones de alcance (para evitar sobre-construir)
- No hay checkout, no hay pagos en línea, no hay integración con Facebook/Meta.
- No hay múltiples usuarios ni roles.
- La carga de datos siempre es manual por diseño: el objetivo es que sea rápida y con mínimos cálculos manuales, no que desaparezca.
- No agregues métricas, vistas o funciones no pedidas aquí (nada de CAC, conversión de tráfico, cupones, reseñas, etc., no aplican a este negocio).

## Especificación técnica (stack, base de datos, despliegue)

Necesito que el panel funcione igual desde el celular y el computador con los datos sincronizados en tiempo real, y que el despliegue sea gratis. Esto descarta cualquier cosa que viva solo en un dispositivo.

- Frontend: Next.js (React), responsive, mobile-first, diseña primero para pantalla de celular y luego adapta a escritorio, no al revés.
- Base de datos: Supabase (Postgres gestionado, tiene plan gratuito, incluye API/cliente listo para conectar desde el frontend sin escribir un backend aparte). Crear un proyecto de Supabase y usar su cliente de JavaScript/TypeScript para leer y escribir los datos de pedidos, inventario y gastos de publicidad directamente. Definir el esquema con estas tablas mínimas: productos (referencia, línea, costo, precio, stock), pedidos (cliente, teléfono, producto, cantidad, tipo de entrega, dirección, estado, fecha, notas), gastos_publicidad (fecha, monto, nota).
- Despliegue: Vercel, plan gratuito (Hobby), conectado directo a un repositorio de GitHub, cada cambio se despliega automáticamente a una URL pública. Configurar las variables de entorno de Supabase (URL del proyecto y clave anónima) en el panel de Vercel, no hardcodeadas en el código.
- Resultado esperado: una URL única (ej. algo.vercel.app) que abro igual desde el navegador del celular y del computador, no una app nativa instalada, no un archivo local. Como ambos apuntan a la misma base de datos en Supabase, cualquier cambio se refleja en todos los dispositivos al recargar, o en tiempo real si se implementan las suscripciones en tiempo real de Supabase (recomendable para que el tablero se actualice solo).
- Gráficas: usar una librería ligera de gráficas para React (ej. Recharts) en vez de construir SVG a mano.
- Sigue conventional commits en inglés si se usa git (feat:, fix:, chore:, etc.).

## Entregable esperado

Un sistema funcional desplegado en una URL pública gratuita (Vercel + Supabase), con las cuatro piezas descritas (Pedidos, Inventario, Publicidad, Resumen), formularios de carga mínimos y rápidos pensados primero para el celular, cálculos automáticos de precio/margen/ganancia neta, y las gráficas listadas, coherente con el contexto de negocio en contexto.md, sin datos de ese documento precargados en el sistema.
