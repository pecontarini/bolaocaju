import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Trophy, Loader2, FileDown } from "lucide-react";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { Bandeira } from "@/components/jogos/Bandeira";
import { supabase } from "@/integrations/supabase/client";
import { useMarcaId } from "@/lib/marca";
import { usePerfilAdmin } from "@/lib/admin/perfil";
import { useBranding } from "@/lib/marca";
import { Button } from "@/components/ui/button";
import {
  exportarGanhadoresCSV,
  exportarGanhadoresPDF,
  exportarTodosGanhadoresCSV,
  exportarTodosGanhadoresPDF,
  type JogoComGanhadores,
} from "@/lib/admin/export-ganhadores";
import {
  exportarParticipantesCSV,
  exportarParticipantesPDF,
  type ParticipanteExport,
} from "@/lib/admin/export-participantes";
import {
  formatarDataHoraBR,
  mascararTelefoneBR,
} from "@/lib/admin/jogo-helpers";

export const Route = createFileRoute("/admin/sorteios")({
  component: () => (
    <AdminShell>
      <GanhadoresPage />
    </AdminShell>
  ),
});

type JogoEncerrado = {
  id: string;
  numero_jogo: number;
  time_a: string;
  time_b: string;
  codigo_a: string | null;
  codigo_b: string | null;
  placar_a: number | null;
  placar_b: number | null;
  data_hora_inicio: string;
};

function GanhadoresPage() {
  const marcaId = useMarcaId();
  const perfilQ = usePerfilAdmin();
  const ehGeral = perfilQ.data?.papel === "admin_geral";
  const branding = useBranding();
  const [exportando, setExportando] = useState<null | "csv" | "pdf">(null);
  const [exportandoPart, setExportandoPart] = useState<null | "csv" | "pdf">(null);
  const q = useQuery({
    queryKey: ["admin", "ganhadores-jogos", ehGeral ? "all" : marcaId],
    enabled: ehGeral || !!marcaId,
    queryFn: async () => {
      let qb = supabase
        .from("jogos")
        .select(
          "id,numero_jogo,time_a,time_b,codigo_a,codigo_b,placar_a,placar_b,data_hora_inicio",
        )
        .eq("status", "encerrado");
      if (!ehGeral) qb = qb.eq("marca_id", marcaId!);
      const { data, error } = await qb.order("data_hora_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JogoEncerrado[];
    },
  });

  async function exportarTodos(formato: "csv" | "pdf") {
    if (!q.data || q.data.length === 0) return;
    setExportando(formato);
    try {
      const itens: JogoComGanhadores[] = [];
      for (const jogo of q.data) {
        const { data, error } = await supabase.rpc("fn_meus_ganhadores", {
          p_jogo_id: jogo.id,
        });
        if (error) throw error;
        const lista = ((data ?? []) as Array<{
          nome: string | null;
          telefone: string | null;
          comanda: number | null;
          marca_slug: string | null;
          unidade_nome: string | null;
        }>).map((r) => ({
          comanda: r.comanda,
          clientes: { nome: r.nome, telefone: r.telefone },
          marca_slug: r.marca_slug,
          unidade_nome: r.unidade_nome,
        }));
        itens.push({ jogo, lista });
      }
      if (formato === "csv") exportarTodosGanhadoresCSV(itens);
      else
        await exportarTodosGanhadoresPDF(itens, {
          nomeExibicao: branding.nomeExibicao,
          logoSrc: branding.logoSrc,
        });
    } finally {
      setExportando(null);
    }
  }

  async function exportarParticipantes(formato: "csv" | "pdf") {
    setExportandoPart(formato);
    try {
      const PAGE = 1000;
      let offset = 0;
      const lista: ParticipanteExport[] = [];
      while (true) {
        const { data, error } = await supabase
          .rpc("fn_palpites_admin", { p_jogo_id: null })
          .range(offset, offset + PAGE - 1);
        if (error) throw error;
        const lote = ((data ?? []) as unknown) as ParticipanteExport[];
        lista.push(...lote);
        if (lote.length < PAGE) break;
        offset += PAGE;
      }
      if (formato === "csv") exportarParticipantesCSV(lista);
      else
        await exportarParticipantesPDF(lista, {
          nomeExibicao: branding.nomeExibicao,
          logoSrc: branding.logoSrc,
        });
    } finally {
      setExportandoPart(null);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Ganhadores"
        subtitulo="Comandas que acertaram o placar no tempo regular."
      />

      {q.data && q.data.length > 0 && (
        <div className="flex gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={exportando !== null}
            onClick={() => exportarTodos("csv")}
          >
            {exportando === "csv" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            Exportar todos (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={exportando !== null}
            onClick={() => exportarTodos("pdf")}
          >
            {exportando === "pdf" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            Exportar todos (PDF)
          </Button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={exportandoPart !== null}
          onClick={() => exportarParticipantes("csv")}
        >
          {exportandoPart === "csv" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
          Participantes (CSV)
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={exportandoPart !== null}
          onClick={() => exportarParticipantes("pdf")}
        >
          {exportandoPart === "pdf" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
          Participantes (PDF)
        </Button>
      </div>

      {q.isLoading ? (
        <div className="glass rounded-2xl h-64 animate-pulse" />
      ) : !q.data || q.data.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-cl-cinza-texto">
          Nenhum jogo encerrado ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {q.data.map((j) => (
            <ItemJogo key={j.id} jogo={j} />
          ))}
        </ul>
      )}
    </>
  );
}

type GanhadorLinha = {
  comanda: number | null;
  clientes: { nome: string | null; telefone: string | null } | null;
  marca_slug: string | null;
  unidade_nome: string | null;
};

function ItemJogo({ jogo }: { jogo: JogoEncerrado }) {
  const [aberto, setAberto] = useState(false);
  const perfilQ = usePerfilAdmin();
  const perfil = perfilQ.data ?? null;
  const branding = useBranding();

  const ganhadoresQ = useQuery({
    queryKey: ["admin", "meus-ganhadores", jogo.id, perfil?.papel ?? null, perfil?.unidade_id ?? null],
    enabled: aberto && !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_meus_ganhadores", {
        p_jogo_id: jogo.id,
      });
      if (error) throw error;
      return ((data ?? []) as Array<{
        nome: string | null;
        telefone: string | null;
        comanda: number | null;
        marca_slug: string | null;
        unidade_nome: string | null;
      }>).map((r) => ({
        comanda: r.comanda,
        clientes: { nome: r.nome, telefone: r.telefone },
        marca_slug: r.marca_slug,
        unidade_nome: r.unidade_nome,
      })) as GanhadorLinha[];
    },
  });

  const lista = ganhadoresQ.data ?? [];
  const comandasDistintas = new Set(
    lista.map((g) => g.comanda).filter((c): c is number => c != null),
  ).size;
  const ehGeral = perfil?.papel === "admin_geral";
  const grupos = (() => {
    if (!ehGeral) return null;
    const porMarca = new Map<string, Map<string, GanhadorLinha[]>>();
    for (const g of lista) {
      const m = g.marca_slug ?? "—";
      const u = g.unidade_nome ?? "—";
      if (!porMarca.has(m)) porMarca.set(m, new Map());
      const subm = porMarca.get(m)!;
      if (!subm.has(u)) subm.set(u, []);
      subm.get(u)!.push(g);
    }
    return porMarca;
  })();

  return (
    <li className="glass rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-cl-verde/5 transition-colors"
      >
        <Trophy className="size-5 text-cl-laranja shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Bandeira codigo={jogo.codigo_a} tamanho={16} />
            <span className="font-medium text-cl-verde-escuro">
              {jogo.codigo_a ?? jogo.time_a}
            </span>
            <span className="font-display text-cl-verde-escuro tabular-nums">
              {jogo.placar_a}–{jogo.placar_b}
            </span>
            <span className="font-medium text-cl-verde-escuro">
              {jogo.codigo_b ?? jogo.time_b}
            </span>
            <Bandeira codigo={jogo.codigo_b} tamanho={16} />
          </div>
          <p className="text-xs text-cl-cinza-texto mt-0.5">
            Jogo #{jogo.numero_jogo} • {formatarDataHoraBR(jogo.data_hora_inicio)}
          </p>
        </div>
        <ChevronDown
          className={`size-4 text-cl-cinza-texto transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="px-4 pb-4 -mt-1">
          {ganhadoresQ.isLoading ? (
            <div className="py-4 text-center text-cl-cinza-texto">
              <Loader2 className="size-5 mx-auto animate-spin" />
            </div>
          ) : lista.length === 0 ? (
            <p className="text-sm text-cl-verde-escuro text-center py-3">
              Ninguém acertou o placar.
            </p>
          ) : ehGeral && grupos ? (
            <>
              <BotoesExport jogo={jogo} lista={lista} branding={branding} />
              <div className="rounded-xl bg-cl-laranja text-cl-verde-escuro px-3 py-2 text-center mb-3">
                <p className="text-[10px] uppercase tracking-widest font-semibold">
                  Chopps servidos
                </p>
                <p className="font-display text-2xl tabular-nums leading-none mt-0.5">
                  {comandasDistintas}
                </p>
              </div>
              <div className="space-y-4">
                {Array.from(grupos.entries()).map(([marca, porUnidade]) => (
                  <div key={marca}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-cl-verde-escuro font-semibold mb-2">
                      {marca}
                    </p>
                    <div className="space-y-3">
                      {Array.from(porUnidade.entries()).map(([unidade, gs]) => (
                        <div key={`${marca}-${unidade}`}>
                          <p className="text-[10px] uppercase tracking-wider text-cl-cinza-texto mb-1.5">
                            {unidade}
                          </p>
                          <ul className="space-y-2">
                            {gs.map((g, i) => (
                              <LinhaGanhadorJ key={`${g.comanda}-${i}`} g={g} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <BotoesExport jogo={jogo} lista={lista} branding={branding} />
              <div className="rounded-xl bg-cl-laranja text-cl-verde-escuro px-3 py-2 text-center mb-3">
                <p className="text-[10px] uppercase tracking-widest font-semibold">
                  Chopps servidos
                </p>
                <p className="font-display text-2xl tabular-nums leading-none mt-0.5">
                  {comandasDistintas}
                </p>
              </div>
              <ul className="space-y-2">
                {lista.map((g, i) => (
                  <LinhaGanhadorJ key={`${g.comanda}-${i}`} g={g} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function LinhaGanhadorJ({ g }: { g: GanhadorLinha }) {
  return (
    <li className="rounded-xl bg-white/85 border border-cl-verde/20 p-3 flex items-center gap-3">
      <div className="size-14 shrink-0 rounded-xl bg-cl-verde-escuro text-white flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase opacity-80">Comanda</span>
        <span className="font-display text-xl leading-none tabular-nums">
          {g.comanda ?? "—"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-cl-verde-escuro leading-tight truncate">
          {g.clientes?.nome ?? "—"}
        </p>
        <p className="text-xs text-cl-cinza-texto">
          {mascararTelefoneBR(g.clientes?.telefone)}
        </p>
      </div>
    </li>
  );
}

function BotoesExport({
  jogo,
  lista,
  branding,
}: {
  jogo: JogoEncerrado;
  lista: GanhadorLinha[];
  branding: { nomeExibicao: string; logoSrc: string };
}) {
  const dados = lista.map((g) => ({
    comanda: g.comanda,
    clientes: g.clientes,
    marca_slug: g.marca_slug,
    unidade_nome: g.unidade_nome,
  }));
  return (
    <div className="flex gap-2 mb-3">
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() => exportarGanhadoresCSV(jogo, dados)}
      >
        <FileDown className="size-4" />
        Exportar CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() =>
          exportarGanhadoresPDF(jogo, dados, {
            nomeExibicao: branding.nomeExibicao,
            logoSrc: branding.logoSrc,
          })
        }
      >
        <FileDown className="size-4" />
        Exportar PDF
      </Button>
    </div>
  );
}