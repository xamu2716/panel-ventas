"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { PostgrestError } from "@supabase/supabase-js";

type Fetcher<T> = () => Promise<{ data: T[] | null; error: PostgrestError | null }>;

/**
 * Carga una lista desde Supabase y se vuelve a suscribir a cambios en tiempo
 * real de la tabla indicada: cuando cambia algo (desde este dispositivo u
 * otro), se vuelve a pedir la lista completa. Es la forma más simple y
 * robusta de mantener sincronizados celular y computador sin parchar estado
 * local a mano — el volumen de datos de un vendedor pequeño no lo justifica.
 */
export function useRealtimeQuery<T>(table: string, fetcher: Fetcher<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await fetcher();
    if (error) setError(error.message);
    else {
      setData(data ?? []);
      setError(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  useEffect(() => {
    // `load` es async: sus setState ocurren después de un await (microtask),
    // no de forma síncrona dentro del cuerpo del efecto — es el patrón normal
    // de "cargar al montar", no un ciclo de renderizado en cascada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const channel = supabase
      .channel(`realtime-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, load]);

  return { data, loading, error, reload: load };
}
