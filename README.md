# Panel de ventas

Panel interno de pedidos, inventario, publicidad y simulación de precios para la reventa de
productos importados (categorías configurables, ej. chaquetas de moto y peluches Jellycat),
vendidos por Facebook Marketplace. Ver `contexto.md` (negocio) y `prompt.md` (especificación) para
el detalle completo; `CLAUDE.md` documenta las reglas de trabajo y el mapa del proyecto.

Un solo usuario, sin login, pensado primero para celular. Next.js (App Router) + Supabase (Postgres + tiempo real) + Recharts, desplegado en Vercel.

El costeo de cada producto sale de sus lotes (envíos/compras reales, ver `lotes`/`lote_items` en
`CLAUDE.md`): Alibaba/proveedor + flete + publicidad si viene por barco; la fórmula completa de
nacionalización si viene por avión (CIF + arancel del envío + IVA + tarifa aérea); o, para una compra
directa (Temu, Shein o una tienda local, ideal para testear un producto), simplemente el total pagado
dividido entre las unidades. Un mismo lote puede traer varias
referencias a la vez, repartiendo sus costos compartidos entre ellas, y cada reabastecimiento
recalcula el costo del producto como promedio ponderado con lo que ya había en stock — nunca se
teclea el costo unitario a mano salvo como ajuste puntual editable.

## Desarrollo local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env.local` y completa las variables. `NEXT_PUBLIC_SUPABASE_URL` es la URL de tu proyecto de Supabase y `NEXT_PUBLIC_SUPABASE_ANON_KEY` es la **publishable key** (`sb_publishable_...`, Settings → API Keys; el nombre de la variable se conserva por compatibilidad). `SUPABASE_SERVICE_ROLE_KEY` (una **secret key** `sb_secret_...`) y `CRON_SECRET` (texto aleatorio, por ejemplo `openssl rand -hex 32`) solo hacen falta para probar el endpoint de keep-alive; son solo de servidor y nunca se versionan. Las llaves JWT legacy (`anon`/`service_role`) están desactivadas en este proyecto:
   ```bash
   cp .env.example .env.local
   ```
3. Corre el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre [http://localhost:3000](http://localhost:3000).

## Base de datos

El esquema (`productos`, `lotes`, `lote_items`, `pedidos`, `gastos_publicidad`, triggers de stock y de `estado_actualizado_en`, RLS) vive en el proyecto de Supabase y se administra con migraciones aplicadas vía su MCP; desde el keep-alive cada cambio de esquema también se guarda en `supabase/migrations/` (tabla `heartbeat`, `gastos_publicidad.producto_id` y el tipo de lote `directa`). Ver la sección "Esquema de Supabase" en `CLAUDE.md` para el detalle de tablas y triggers.

## Despliegue

Desplegado en Vercel. Las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) se configuran en el panel de Vercel (Settings → Environment Variables), nunca en el código.

### Keep-alive de Supabase

El plan gratuito de Supabase pausa el proyecto tras 7 días de baja actividad. Un cron de Vercel (`vercel.json`, una vez al día) llama a `GET /api/cron/keep-alive`, que actualiza una fila de la tabla `heartbeat` (no toca las tablas del negocio). Funciona aunque el panel esté protegido con Vercel Authentication. Para comprobarlo: Vercel → Settings → Cron Jobs → Run, y revisar que `heartbeat.last_ping` cambió. Detalles, causas de fallo y rotación de llaves en `CLAUDE.md`.
