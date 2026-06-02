import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, ChevronDown, Trophy } from "lucide-react";
import { toast } from "sonner";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { Bandeira } from "@/components/jogos/Bandeira";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  formatarDataHoraBR,
  mascararTelefoneBR,
} from "@/lib/admin/jogo-helpers";

export const Route = createFileRoute("/admin/sorteios")({
  component: () => (
    <AdminShell>
      <SorteiosPage />
    </AdminShell>
  ),
});

type SorteioComJogo = {
  id: string;
  jogo_id: string;
  vencedor_nome: string | null;
  vencedor_telefone: string | null;
  total_acertadores: number | null;
  seed: string | null;
  created_at: string;
  jogos: {
    time_a: string;
    time_b: string;
    codigo_a: string | null;
    codigo_b: string | null;
    placar_a: number | null;
    placar_b: number | null;
    numero_jogo: number;
  } | null;
};

function SorteiosPage() {
  const q = useQuery({
    queryKey: ["admin", "sorteios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sorteios")
        .select(
          "id,jogo_id,vencedor_nome,vencedor_telefone,total_acertadores,seed,created_at,jogos:jogo_id(time_a,time_b,codigo_a,codigo_b,placar_a,placar_b,numero_jogo)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SorteioComJogo[];
    },
  });

  return (
    <>
      <PageHeader
        titulo="Sorteios"
        subtitulo="Histórico auditável de todos os sorteios."
      />

      {q.isLoading ? (
        <div className="glass rounded-2xl h-64 animate-pulse" />
      ) : !q.data || q.data.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-cl-cinza-texto">
          Nenhum sorteio realizado ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {q.data.map((s) => (
            <ItemSorteio key={s.id} s={s} />
          ))}
        </ul>
      )}
    </>
  );
}

function ItemSorteio({ s }: { s: SorteioComJogo }) {
  const [aberto, setAberto] = useState(false);

  async function copiar() {
    if (!s.seed) return;
    try {
      await navigator.clipboard.writeText(s.seed);
      toast.success("Seed copiado.");
    } catch {
      toast.error("Não consegui copiar agora.");
    }
  }

  return (
    <li className="glass rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-cl-verde/5 transition-colors"
      >
        <Trophy className="size-5 text-cl-laranja shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            {s.jogos && (
              <>
                <Bandeira codigo={s.jogos.codigo_a} tamanho={16} />
                <span className="font-medium text-cl-verde-escuro">
                  {s.jogos.codigo_a ?? s.jogos.time_a}
                </span>
                <span className="font-display text-cl-verde-escuro tabular-nums">
                  {s.jogos.placar_a}–{s.jogos.placar_b}
                </span>
                <span className="font-medium text-cl-verde-escuro">
                  {s.jogos.codigo_b ?? s.jogos.time_b}
                </span>
                <Bandeira codigo={s.jogos.codigo_b} tamanho={16} />
              </>
            )}
          </div>
          <p className="font-display text-cl-verde-escuro text-base mt-0.5 truncate">
            {s.vencedor_nome ?? "—"}
          </p>
          <p className="text-xs text-cl-cinza-texto">
            {mascararTelefoneBR(s.vencedor_telefone)} •{" "}
            {s.total_acertadores ?? 0}{" "}
            {s.total_acertadores === 1 ? "acertador" : "acertadores"} •{" "}
            {formatarDataHoraBR(s.created_at)}
          </p>
        </div>
        <ChevronDown
          className={`size-4 text-cl-cinza-texto transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="px-4 pb-4 -mt-1">
          <div className="rounded-xl bg-white/80 border border-cl-verde/20 p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-widest text-cl-cinza-texto">
                Seed (comprovante)
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={copiar}
                className="h-7 text-cl-verde-escuro"
              >
                <Copy className="size-3.5 mr-1" /> Copiar
              </Button>
            </div>
            <p className="font-mono text-[11px] break-all text-cl-verde-escuro">
              {s.seed ?? "—"}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}