import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigurado) {
  // No lanzar un error aquí: haría fallar el build/prerender de Next.js (que
  // importa este módulo incluso para páginas con "use client") en cualquier
  // entorno donde las variables aún no estén configuradas — por ejemplo justo
  // después de desplegar a Vercel y antes de cargarlas en su panel. En vez de
  // eso, se usa un cliente con valores de relleno y se avisa por consola; la UI
  // que sí depende de datos reales debe revisar `supabaseConfigurado`.
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Configúralas en .env.local (ver .env.example) o, en Vercel, en Settings → Environment Variables, y vuelve a desplegar.",
  );
}

export const supabase = createClient(
  supabaseConfigurado ? supabaseUrl! : "https://placeholder.supabase.co",
  supabaseConfigurado ? supabaseAnonKey! : "placeholder-anon-key",
);
