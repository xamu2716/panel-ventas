# Reglas del proyecto — Panel de Ventas

Este archivo lo lee Claude Code automáticamente al abrir esta carpeta. Aplica en toda sesión de trabajo sobre este repositorio.

## Antes de escribir código
1. Lee `contexto.md` completo — es el negocio real detrás de este sistema.
2. Lee `prompt.md` completo — es la especificación funcional y técnica.
3. Usa el MCP de Context7 para confirmar la sintaxis actual de Next.js, Supabase y la librería de gráficas antes de escribir código que las use — no confíes en memoria de entrenamiento para APIs que cambian seguido.

## Mapa del proyecto
Esta sección existe para que no tengas que explorar carpetas cada vez que necesitas encontrar algo — revisa aquí primero. Mantenla actualizada: cada vez que crees una carpeta o archivo nuevo con un propósito claro (una vista, un componente reusado en varios lados, el esquema de la base de datos, un helper de cálculo), agrega una línea aquí describiéndolo en el momento en que lo creas, no al final de la sesión.

Formato sugerido por línea: `ruta/ — qué vive ahí, en una frase`.

- `app/page.tsx` — vista Pedidos (kanban), en `/`.
- `app/inventario/page.tsx` — vista Inventario.
- `app/publicidad/page.tsx` — vista Gastos de publicidad.
- `app/resumen/page.tsx` — vista Resumen con KPIs y gráficas.
- `app/simulacion/page.tsx` — vista Simulación (qué pasaría si vendo a tal precio/cantidad).
- `app/layout.tsx` — layout raíz: fuentes (Fraunces + Public Sans) y `<Nav>`.
- `app/globals.css` — tokens de color/tipografía (Tailwind v4 `@theme inline`).
- `components/Nav.tsx` — navegación: barra lateral en escritorio, barra inferior en celular (5 secciones).
- `components/ui.tsx` — primitivos reusados en toda la app (Button, Field, Input, Select, Textarea, ToggleGroup, Badge, Sheet, EmptyState). `ToggleGroup` acepta cualquier número de opciones (columnas via `gridTemplateColumns` inline, no clase fija).
- `components/icons.tsx` — íconos SVG inline (sin librería externa).
- `components/CategoriaBadge.tsx` — insignia de categoría de producto (texto libre): color estable vía `lib/chartColors.ts#colorCategoria`, reusada en Inventario y Resumen.
- `components/pedidos/` — `PedidosView` (orquesta datos), `KanbanBoard`, `PedidoCard`, `PedidoForm`, `PedidoDetail`.
- `components/inventario/` — `InventarioView`, `ProductoForm` (calculadora de costo por lote, barco o avión; categoría como texto libre con `<datalist>` de sugerencias), `ProductoCard`.
- `components/publicidad/` — `PublicidadView`, `GastoForm`.
- `components/resumen/` — `ResumenView` (filtro de categoría que afecta toda la vista), `KpiTiles`, `DesgloseTabla`, `charts.tsx` (gráficas Recharts, incluyendo ventas por categoría y comparación de productos en el tiempo), `ChartCard.tsx`.
- `components/simulacion/SimulacionView.tsx` — calculadora "qué pasaría si": por producto, categoría o todo el inventario, tabla precio × cantidad que muestra costo total de compra (fila, no depende del precio), venta total y ganancia (por celda), usando `lib/calc.ts` (sin cálculos propios).
- `lib/supabaseClient.ts` — cliente de Supabase (browser, sin auth).
- `lib/types.ts` — tipos TS que reflejan el esquema de la base de datos.
- `lib/calc.ts` — TODOS los cálculos de negocio (costo por lote barco/avión, ganancia, margen, formato COP). Un solo lugar, no duplicar cuentas en componentes.
- `lib/metrics.ts` — agregaciones para Resumen (KPIs y datos por gráfica) a partir de los datos ya cargados, incluida `categoriasDisponibles` (lista de categorías reales, ya no un enum fijo).
- `lib/chartColors.ts` — colores de gráficas: par fijo para series binarias (entrega) y `CATEGORIA_PALETTE`/`colorCategoria` para categorías de producto dinámicas, validados aparte para accesibilidad (ver nota abajo).
- `lib/useRealtimeQuery.ts` — hook: carga una tabla y se resuscribe a cambios realtime de Supabase (recarga todo en cualquier cambio; suficiente para el volumen de un vendedor pequeño).

**Esquema de Supabase** (proyecto `panel-ventas`, ref `mgyzwlymgwkbrqjhatjh`): tablas `productos`, `pedidos`, `gastos_publicidad`. `productos.categoria` es texto libre (sin CHECK de valores) — ya no un enum fijo chaqueta/jellycat; la UI sugiere las ya usadas vía `<datalist>`. `productos.metodo_importacion` (`barco`|`avion`) decide cómo se deriva `costo_unitario` en la UI: barco = (costo+flete+publicidad)/unidades; avión = ((CIF+arancel)×1.19 + tarifa_avion + publicidad)/unidades, con CIF = costo+seguro+flete y arancel = CIF×`arancel_pct`/100 (arancel fijo por referencia, guardado en el producto). El stock se ajusta con un trigger de Postgres al cambiar `pedidos.estado` (resta al entrar a "entregado", repone al salir), no desde el cliente. `pedidos.estado_actualizado_en` se actualiza solo cuando cambia `estado` (trigger aparte de `updated_at`) — es la base de la señal "días sin avanzar" y del eje de tiempo del resumen. Los GRANTs a `anon`/`authenticated` son a nivel de tabla: si se agregan columnas nuevas, no hace falta volver a otorgar permisos (confirmar de todas formas con una consulta a `information_schema.column_privileges` tras migrar).

**Nota de colores de gráfica:** los tokens de `app/globals.css` (usados en badges/botones) son deliberadamente algo apagados para verse cálidos; para gráficas donde el color es la única forma de distinguir series, `lib/chartColors.ts` define variantes con más croma, validadas con el validador de accesibilidad de la skill `dataviz` (contraste, separación CVD, piso de visión normal) contra el fondo de tarjeta. `CATEGORIA_PALETTE` tiene 5 slots validados (más allá de eso, los colores se repiten — evitar agregar un 6º/7º slot sin correr el validador, un violeta ya se descartó por colisionar con el azul bajo protanopia/deuteranopia). Si se agregan series nuevas a una gráfica, volver a correr ese validador antes de fijar el color a mano.

Antes de buscar algo por todo el proyecto con Grep o explorando carpetas, revisa primero si ya está listado aquí.

## Git y GitHub — reglas estrictas
El repositorio ya existe y ya está clonado en esta carpeta; el dueño lo creó él mismo en GitHub con el nombre y configuración que eligió.
- NUNCA ejecutes `git init` — este repositorio ya está inicializado.
- NUNCA crees un repositorio nuevo en GitHub (ni con `gh repo create` ni de ninguna otra forma).
- NUNCA cambies, agregues ni elimines el remoto (`git remote`) — el remoto ya está configurado apuntando al repo correcto.
- Si en algún punto parece que hace falta crear un repo o tocar la configuración de git/GitHub, PARA y pregunta primero — no lo asumas ni lo resuelvas por tu cuenta.

**Commits: al final, no durante el desarrollo.** Mientras estás construyendo, probando y corrigiendo (toda la sección de "Pruebas funcionales obligatorias" de abajo), NO hagas `git commit` ni `git push` en cada paso — trabaja libremente sobre los archivos sin comprometer nada a git todavía. Solo cuando el proyecto completo cumpla la "Definición de terminado" al final de este archivo:
1. Revisa todos los cambios acumulados (`git status`, `git diff`).
2. Organiza y crea los commits en un orden lógico que cuente la historia del proyecto de forma secuencial — por ejemplo: estructura inicial de Next.js, esquema de Supabase, tablero de pedidos, inventario, gastos de publicidad, resumen y gráficas, ajustes de diseño. Cada commit debe ser una unidad coherente, no un volcado de todo en uno solo ni commits arbitrarios por archivo tocado.
3. Sigue las convenciones de conventional commits (`feat:`, `fix:`, `chore:`, etc.) de la sección de abajo.
4. Recién ahí haz `git push` sobre el remoto ya existente.

**Despliegue a Vercel no depende de este orden.** El MCP de Vercel puede desplegar el proyecto directamente sin pasar por GitHub. Si el dueño no ha conectado el repositorio de GitHub a Vercel todavía, despliega igual usando el MCP de Vercel directo (sin necesidad de push) para que pueda ver y probar la URL en vivo mientras se termina de organizar el historial de git.

**Estado actual del despliegue (ya conectado):** el repo de GitHub (`xamu2716/panel-ventas`) ya está conectado al proyecto de Vercel `panel-ventas` — cada `git push` a `main` dispara un deploy automático a producción, no hace falta desplegar a mano. La URL pública en uso es `https://panel-ventas-rosy.vercel.app` (dominio de producción asignado al proyecto; `https://panel-ventas-xamu2716.vercel.app` es el mismo proyecto pero por su alias de deployment autogenerado). Deployment Protection está en **"All Deployments"** (Vercel Authentication cubriendo también producción) — decisión deliberada del dueño: el panel no tiene login propio y maneja nombres/teléfonos/direcciones de clientes, así que esa capa de Vercel hace ese papel. Las variables de entorno de Supabase ya están configuradas en ese proyecto de Vercel.

## Manejo de credenciales — obligatorio desde el primer commit del proyecto
- Todas las claves de Supabase (URL del proyecto y clave anónima/API) van en un archivo `.env.local` en la raíz del proyecto — NUNCA escritas directamente en el código fuente.
- Crea un `.gitignore` desde el inicio del proyecto que excluya `.env`, `.env.local`, `.env*.local`, `node_modules/`, `.next/`, y cualquier otro archivo de configuración local o de build.
- Crea también un `.env.example` con las mismas variables pero sin valores reales (solo los nombres, ej. `NEXT_PUBLIC_SUPABASE_URL=`) para que quede documentado qué variables necesita el proyecto, sin exponer ningún secreto.
- Al desplegar en Vercel, esas variables se configuran en el panel de Vercel (Settings → Environment Variables), no en el código.
- Antes de cualquier commit, verifica con `git status` que ningún archivo `.env*` (salvo `.env.example`) esté siendo incluido.

## Skills a usar durante el desarrollo
- `frontend-design` (Anthropic) — úsala para las decisiones de diseño visual: paleta de colores, tipografía, layout. El objetivo es que el panel se vea intencional y cuidado, no una plantilla genérica de dashboard con gradiente morado y tarjetas redondeadas por defecto.
- `web-design-guidelines` (Vercel) — si está disponible en este entorno, úsala para auditar el código de UI ya construido contra buenas prácticas reales de accesibilidad y usabilidad: tamaño de zonas táctiles (importante porque este panel se usa mucho desde el celular con el pulgar), contraste, estados de foco, formularios con etiquetas correctas. Si no está disponible, aplica ese mismo criterio manualmente al revisar cada formulario y botón.
-webapp-testing -- Usala si lo ves necesario a la hora de realizar las pruebas.
-canvas-design --por si necesitras modificar elementos graficos


## Stack fijo (no cambiar sin preguntar)
- Next.js (App Router) + React
- Supabase (Postgres) vía su cliente JS, usando el MCP de Supabase para crear/ajustar el esquema
- Vercel para despliegue, vía su MCP para desplegar y revisar logs de build
- Recharts (o librería equivalente ligera) para las gráficas
- Mobile-first: todo componente se diseña primero para pantalla de celular (~380px de ancho) y se adapta hacia arriba, nunca al revés

## Convenciones de commits
Conventional commits, en inglés: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `test:`. Un commit por unidad de trabajo coherente, no un solo commit gigante al final.

**No agregar la línea `Co-Authored-By: Claude ...`** al final de los mensajes de commit — el dueño prefiere que el historial quede a su nombre sin esa nota (ver `contexto.md`).

## Pruebas funcionales obligatorias — no solo que se vea bien, que FUNCIONE

Esto es lo más importante de este archivo. No basta con que el código compile ni con que una captura de pantalla se vea correcta. Antes de considerar CUALQUIER funcionalidad terminada, debes usar el MCP de Playwright para operar la página como lo haría el dueño del negocio de verdad: hacer clic, escribir en los campos, enviar formularios, y comprobar que el resultado en pantalla (y en la base de datos) sea el esperado. Una funcionalidad que "se ve bien" pero no guarda datos, no calcula bien, o rompe al usarla, NO está terminada.

Para cada pieza del sistema, antes de darla por lista:

**Pedidos (tablero kanban)**
1. Abre el formulario de nuevo pedido y complétalo con datos de prueba (cliente, producto, cantidad, domicilio sí/no).
2. Envíalo y confirma que la tarjeta aparece en la columna "Nuevo" con los datos correctos.
3. Confirma que el precio y la ganancia mostrados coinciden con lo que corresponde según el producto y la cantidad elegidos — verifica la cuenta a mano, no confíes en que "se ve un número ahí".
4. Prueba con domicilio = sí: confirma que el campo de dirección aparece y que se guarda y se muestra en la tarjeta.
5. Prueba con domicilio = no: confirma que NO aparece ningún campo ni tag de dirección.
6. Mueve el pedido de columna en columna hasta "Entregado".
7. Confirma que al llegar a "Entregado", el stock de esa referencia en Inventario bajó exactamente en la cantidad vendida.
8. Prueba editar un pedido ya creado y confirma que el cambio se refleja.
9. Prueba eliminar un pedido y confirma que desaparece.

**Inventario**
1. Crea una referencia nueva de prueba con costo y precio de venta, método **barco**.
2. Confirma que la ganancia por unidad y el % de margen mostrados son matemáticamente correctos.
3. Crea otra referencia con método **avión** (costo, seguro, flete, % de arancel, tarifa aérea,
   publicidad, unidades) y verifica **a mano** el desglose CIF → arancel → nacionalizado con IVA →
   costo unitario que muestra la calculadora; prueba con un arancel bajo (ej. 5-10%) y uno alto
   (ej. 50%) para confirmar que la fórmula escala bien en ambos casos.
4. Escribe una categoría nueva (no usada antes) al crear un producto; confirma que queda sugerida
   (autocompletar) al crear el siguiente producto.
5. Baja el stock manualmente o mediante un pedido y confirma que el aviso de "stock bajo" aparece
   cuando corresponde.

**Gastos de publicidad**
1. Registra un gasto de prueba.
2. Confirma que aparece en el listado y que se descuenta correctamente de la ganancia neta en el Resumen.

**Resumen y gráficas**
1. Con datos de prueba de al menos dos categorías distintas ya cargados (pedidos, inventario, gastos), abre la vista de Resumen.
2. Con el filtro en "Todas", confirma que cada KPI (ingresos, ganancia neta, pendiente, stock valorado) coincide con una cuenta manual a partir de TODOS los datos de prueba, y que la gráfica de ventas por categoría cuadra.
3. Cambia el filtro a una categoría específica: confirma que los KPIs, las gráficas y la tabla de desglose se restringen a esa categoría, y que aparece la gráfica de "unidades por producto en el tiempo" comparando las referencias de esa categoría.
4. Confirma que cada gráfica renderiza con datos reales (no vacía, no rota, no con overflow) — si una gráfica se ve vacía en una captura de pantalla, antes de asumir que está rota, verifica con una captura de solo ese elemento (`.recharts-wrapper`) o leyendo las coordenadas del SVG (`cx`/`cy` de `.recharts-line-dot`, etc.): las capturas `fullPage` de Recharts en Playwright pueden verse vacías o con la barra de navegación inferior encima por timing/overlap, sin que sea un error real.
5. Confirma que la tabla de desglose por producto coincide con los datos de prueba.

**Simulación**
1. Alcance "Producto": elige uno con costo conocido, prueba varios precios y cantidades, y verifica **a mano** en varias celdas que el costo total de compra = costo unitario × cantidad, la venta = precio × cantidad, y la ganancia = venta − costo total.
2. Alcance "Categoría" y "Todo": confirma que el costo y precio sugeridos son el promedio de los productos en ese alcance (verifica la cuenta), y que siguen siendo editables.
3. Prueba con un producto costeado por avión: el costo unitario base debe ser el mismo que aparece en Inventario (ya incluye la fórmula completa), no un recálculo aparte.

**Sincronización entre dispositivos**
1. Con el MCP de Playwright, abre la página en dos pestañas/contextos distintos.
2. Crea o cambia un pedido en una.
3. Confirma que la otra, al recargar (o en tiempo real si ya están implementadas las suscripciones de Supabase), refleja el cambio.

Si cualquiera de estas pruebas falla, corrige el código y vuelve a probar la MISMA prueba hasta que pase, antes de continuar con lo siguiente. No sigas construyendo funcionalidades nuevas sobre una que no pasó sus pruebas.

## Verificación visual (además de las pruebas funcionales, no en vez de ellas)
Antes de dar por terminada cualquier vista nueva o cambio visual (tablero, inventario, gastos, resumen con gráficas):
1. Usa el MCP de Playwright para abrir la página en un viewport de celular (~390x844) y tomar una captura.
2. Usa el MCP de Playwright para abrir la misma página en un viewport de escritorio (~1440x900) y tomar otra captura.
3. Revisa ambas capturas: que las gráficas se vean completas y legibles, que nada se corte o se monte encima de otro elemento, que los botones y campos del formulario de pedido sean fáciles de tocar en celular, que los colores tengan buen contraste y se vean intencionales (no colores por defecto sin cuidar), que la tipografía sea legible y consistente en tamaño y jerarquía.
4. Si algo no se ve bien, corrígelo antes de continuar, no lo dejes pendiente.

## Datos
No hardcodear en el código ningún costo, precio, referencia de producto o cifra que aparezca en `contexto.md` — esas cifras son solo contexto de negocio para ti, no datos reales del sistema. El sistema arranca vacío; todos los productos, pedidos y gastos los carga el dueño desde la interfaz una vez desplegado.

## Alcance
No agregues autenticación de usuarios, roles, checkout, pagos en línea, ni integraciones con Facebook/Meta — están fuera del alcance de este proyecto por decisión explícita, no por olvido. Si durante el desarrollo aparece una necesidad real de algo no cubierto en `prompt.md`, pregunta antes de construirlo en vez de asumir.

## Al terminar una fase
Antes de desplegar a Vercel, corre `npm run build` localmente y confirma que no hay errores. Despliega solo cuando el build pase limpio, todas las pruebas funcionales de la sección anterior hayan pasado, y la verificación visual esté hecha.

## Definición de "terminado" para este proyecto
No entregues ni anuncies el proyecto como listo hasta que TODO lo siguiente sea cierto al mismo tiempo:
- Cada funcionalidad de `prompt.md` fue probada operándola de verdad (no solo leída en el código) y funciona como se describe.
- Los cálculos automáticos (precio, ganancia, margen, KPIs) son correctos, verificados contra una cuenta manual.
- El diseño se ve bien e intencional, no genérico, tanto en celular como en computador — colores con buen contraste, tipografía legible y consistente, nada desalineado ni cortado.
- Los datos se sincronizan correctamente entre dispositivos vía Supabase.
- El proyecto está desplegado en una URL pública de Vercel funcionando, no solo corriendo en local.
- No quedan errores en la consola del navegador ni en el build.

Si algo de esta lista no se cumple, el trabajo sigue en curso, no está terminado. No entregues código genérico sin probarlo end-to-end.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
