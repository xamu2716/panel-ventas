import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron llama a esta ruta una vez al día (ver vercel.json). Escribe una
// fila en `heartbeat` porque, en el plan gratuito de Supabase, un SELECT puede
// no contar como actividad y el proyecto se pausa tras 7 días sin ella.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const faltantes = [
    !cronSecret && "CRON_SECRET",
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  // Sin CRON_SECRET no hay forma de autenticar al llamador: nunca dejar pasar.
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (faltantes.length > 0) {
    return Response.json(
      { ok: false, error: `Faltan variables de entorno: ${faltantes.join(", ")}` },
      { status: 500 },
    );
  }

  // Cliente solo de servidor: la service role ignora RLS y jamás debe llegar al navegador.
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("heartbeat")
    .upsert({ id: 1, last_ping: new Date().toISOString() })
    .select("last_ping")
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, last_ping: data.last_ping });
}
