// Edge Function: sincronizar-resultados
// Puxa placares da Copa do Mundo via football-data.org e atualiza nossos
// jogos via RPC fn_aplicar_resultado. Idempotente; falha por-match nao
// derruba os demais. Agendada via pg_cron (ver migracao).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FD_URL = "https://api.football-data.org/v4/competitions/WC/matches";

type FDMatch = {
  id: number;
  status: string;
  homeTeam: { tla: string | null };
  awayTeam: { tla: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
};

Deno.serve(async (_req) => {
  const token = Deno.env.get("FOOTBALL_DATA_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!token || !supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_env" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Buscar matches da Copa
  let matches: FDMatch[] = [];
  try {
    const r = await fetch(FD_URL, { headers: { "X-Auth-Token": token } });
    if (!r.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "fd_http", status: r.status }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
    const body = await r.json();
    matches = Array.isArray(body?.matches) ? body.matches : [];
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "fd_fetch_fail" }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  let processados = 0;
  let aplicados = 0;
  let ignorados = 0;
  let erros = 0;

  for (const m of matches) {
    processados++;
    try {
      const status = (m.status || "").toUpperCase();
      if (status !== "IN_PLAY" && status !== "PAUSED" && status !== "FINISHED") {
        ignorados++;
        continue;
      }

      const placarA = m.score?.fullTime?.home;
      const placarB = m.score?.fullTime?.away;
      if (placarA == null || placarB == null) {
        ignorados++;
        continue;
      }

      // 2a) Casar por fd_match_id
      let { data: jogo } = await supabase
        .from("jogos")
        .select("id, fd_match_id")
        .eq("fd_match_id", m.id)
        .maybeSingle();

      // 2b) Fallback: casar por codigos dos times
      if (!jogo) {
        const tlaA = m.homeTeam?.tla;
        const tlaB = m.awayTeam?.tla;
        if (!tlaA || !tlaB) {
          ignorados++;
          continue;
        }
        const { data: candidato } = await supabase
          .from("jogos")
          .select("id, fd_match_id")
          .eq("codigo_a", tlaA)
          .eq("codigo_b", tlaB)
          .is("fd_match_id", null)
          .maybeSingle();

        if (!candidato) {
          ignorados++;
          continue;
        }
        // grava cache do match id
        await supabase
          .from("jogos")
          .update({ fd_match_id: m.id })
          .eq("id", candidato.id);
        jogo = candidato;
      }

      // 3) Aplicar resultado
      const { error: rpcErr } = await supabase.rpc("fn_aplicar_resultado", {
        p_jogo_id: jogo.id,
        p_placar_a: placarA,
        p_placar_b: placarB,
        p_finalizado: status === "FINISHED",
      });
      if (rpcErr) {
        erros++;
        continue;
      }
      aplicados++;
    } catch (_e) {
      erros++;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processados,
      aplicados,
      ignorados,
      erros,
    }),
    { headers: { "content-type": "application/json" } },
  );
});