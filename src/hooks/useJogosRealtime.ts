import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type JogoRow = {
  id: string;
  time_a: string;
  time_b: string;
  placar_a: number | null;
  placar_b: number | null;
};

/**
 * Assina UPDATEs da tabela `jogos` e:
 *  - invalida queries de jogos/classificação (refetch transparente)
 *  - dispara animação "GOL!" quando o placar aumenta
 *  - revalida tudo de novo após reconexão do canal
 */
export function useJogosRealtime() {
  const qc = useQueryClient();
  const placares = useRef<Map<string, { a: number; b: number }>>(new Map());

  useEffect(() => {
    function invalidarTudo() {
      qc.invalidateQueries({ queryKey: ["jogos-abertos"] });
      qc.invalidateQueries({ queryKey: ["ultimos-resultados"] });
      qc.invalidateQueries({ queryKey: ["proximo-jogo-banner"] });
      qc.invalidateQueries({ queryKey: ["total-encerrados"] });
      qc.invalidateQueries({ queryKey: ["classificacao-home"] });
      qc.invalidateQueries({ queryKey: ["sobre-copa", "classificacao"] });
      qc.invalidateQueries({ queryKey: ["jogo-palpite"] });
      qc.invalidateQueries({ queryKey: ["admin", "jogo"] });
    }

    const ch = supabase
      .channel("jogos-ao-vivo")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jogos" },
        (payload) => {
          const novo = payload.new as JogoRow;
          const antigoRow = payload.old as Partial<JogoRow> | undefined;
          const cache = placares.current.get(novo.id);

          const aAnt = cache?.a ?? antigoRow?.placar_a ?? 0;
          const bAnt = cache?.b ?? antigoRow?.placar_b ?? 0;
          const aNovo = novo.placar_a ?? 0;
          const bNovo = novo.placar_b ?? 0;

          if (aNovo > aAnt) festejarGol(novo.time_a);
          if (bNovo > bAnt) festejarGol(novo.time_b);

          placares.current.set(novo.id, { a: aNovo, b: bNovo });
          invalidarTudo();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // primeira conexão e qualquer reconexão: refaz fetch
          invalidarTudo();
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

function festejarGol(time: string) {
  toast(`⚽ GOL do ${time}!`, {
    duration: 1800,
    className:
      "!bg-cl-verde !text-white !border-cl-verde-escuro !font-display !text-base",
  });
}