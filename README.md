# Panel de ventas

Panel interno de pedidos, inventario, publicidad y simulación de precios para la reventa de
productos importados (categorías configurables, ej. chaquetas de moto y peluches Jellycat),
vendidos por Facebook Marketplace. Ver `contexto.md` (negocio) y `prompt.md` (especificación) para
el detalle completo; `CLAUDE.md` documenta las reglas de trabajo y el mapa del proyecto.

Un solo usuario, sin login, pensado primero para celular. Next.js (App Router) + Supabase (Postgres + tiempo real) + Recharts, desplegado en Vercel.

El costeo de cada producto se calcula desde su lote de importación (Alibaba/proveedor + flete +
publicidad, o la fórmula completa de nacionalización si viene por avión: CIF + arancel por
referencia + IVA + tarifa aérea) — nunca se teclea el costo unitario a mano salvo como ajuste
puntual editable.

## Desarrollo local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env.local` y completa las variables con la URL y la clave **anon** (JWT clásica, no la "publishable") de tu proyecto de Supabase:
   ```bash
   cp .env.example .env.local
   ```
3. Corre el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre [http://localhost:3000](http://localhost:3000).

## Base de datos

El esquema (`productos`, `pedidos`, `gastos_publicidad`, triggers de stock y de `estado_actualizado_en`, RLS) vive en el proyecto de Supabase y se administra con migraciones aplicadas vía su MCP — no hay archivos `.sql` en este repo. Ver la sección "Esquema de Supabase" en `CLAUDE.md` para el detalle de tablas y triggers.

## Despliegue

Desplegado en Vercel. Las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) se configuran en el panel de Vercel (Settings → Environment Variables), nunca en el código.
