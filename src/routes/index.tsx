import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutCliente } from "@/components/site/LayoutCliente";
import { CardJogoAberto } from "@/components/jogos/CardJogoAberto";
import {
  TabelaClassificacao,
  HeaderClassificacao,
  type LinhaClassificacao,
} from "@/components/jogos/TabelaClassificacao";
import type { Jogo } from "@/lib/jogos";
import { useMemo, useState } from "react";
import { useJogosRealtime } from "@/hooks/useJogosRealtime";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Bandeira } from "@/components/jogos/Bandeira";
import { ChevronRight, Info, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

/* ----------------------------- Config ----------------------------- */

const COPA_INICIO = new Date("2026-06-11T00:00:00-03:00");
const COPA_FIM = new Date("2026-07-19T23:59:59-03:00");

const CARDAPIO = {
  brasilia: "https://www.hubt.com.br/boteco-caju-limao/",
  saoPaulo: "https://www.hubt.com.br/boteco-caju-limao/2",
} as const;

const COLUNAS =
  "id,numero_jogo,fase,grupo,rodada,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil";

type Aba = "visao" | "partidas" | "classificacao" | "eliminatoria";
const ABAS: { id: Aba; label: string }[] = [
  { id: "visao", label: "Visão geral" },
  { id: "partidas", label: "Partidas" },
  { id: "classificacao", label: "Classificação" },
  { id: "eliminatoria", label: "Fase eliminatória" },
];

/* ----------------------------- Route ----------------------------- */

type Search = { aba: Aba };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolão Caju Limão — Palpite nos jogos da Copa" },
      {
        name: "description",
        content:
          "Palpite no placar exato dos jogos da Copa 2026 direto do Boteco Caju Limão.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => {
    const aba = s.aba as Aba | undefined;
    return {
      aba:
        aba === "partidas" ||
        aba === "classificacao" ||
        aba === "eliminatoria"
          ? aba
          : "visao",
    };
  },
  component: HomeCliente,
});

/* ----------------------------- Home ----------------------------- */

function HomeCliente() {
  useJogosRealtime();
  const { aba } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  function setAba(a: Aba) {
    navigate({ search: { aba: a }, replace: true });
  }

  return (
    <LayoutCliente>
      <h1 className="sr-only">Bolão Caju Limão</h1>
      <TabBar ativa={aba} onChange={setAba} />

      <div className="mt-3">
        {aba === "visao" && <AbaVisaoGeral />}
        {aba === "partidas" && <AbaPartidas />}
        {aba === "classificacao" && <AbaClassificacao />}
        {aba === "eliminatoria" && <AbaEliminatoria />}
      </div>
    </LayoutCliente>
  );
}

/* ----------------------------- TabBar ----------------------------- */

function TabBar({ ativa, onChange }: { ativa: Aba; onChange: (a: Aba) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Seções"
      className="sticky top-[52px] z-20 -mx-4 px-4 glass-sticky"
    >
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {ABAS.map((t) => {
          const isAtiva = t.id === ativa;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isAtiva}
              data-active={isAtiva}
              onClick={() => onChange(t.id)}
              className="tab-underline whitespace-nowrap"
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =============================================================== */
/*                       ABA 1 — VISÃO GERAL                        */
/* =============================================================== */

function AbaVisaoGeral() {
  const hoje = new Date();
  const antes = hoje < COPA_INICIO;
  const durante = hoje >= COPA_INICIO && hoje <= COPA_FIM;
  const diasFaltam = Math.max(
    0,
    differenceInCalendarDays(COPA_INICIO, hoje),
  );
  const progresso = clamp(
    (hoje.getTime() - COPA_INICIO.getTime()) /
      (COPA_FIM.getTime() - COPA_INICIO.getTime()),
    0,
    1,
  );

  // jogo "de agora" = aberto e dentro de janela curta (palpites não encerrados)
  const jogoAgora = useQuery({
    queryKey: ["home", "jogo-agora"],
    queryFn: async () => {
      const agora = new Date().toISOString();
      const limite = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .eq("palpites_encerrados", false)
        .gte("data_hora_inicio", new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .lte("data_hora_inicio", limite)
        .order("data_hora_inicio", { ascending: true })
        .limit(1);
      if (error) throw error;
      return ((data ?? []) as Jogo[])[0] ?? null;
    },
    refetchInterval: 60_000,
  });

  const [cardapioAberto, setCardapioAberto] = useState(false);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl glass px-5 pt-6 pb-7 text-center"
        data-textura="hero"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "url('/assets/16-textura-geometrica.png')",
            backgroundSize: "260px",
            backgroundRepeat: "repeat",
          }}
        />
        <img
          src="/assets/05-logo-com-adornos-emblema.png"
          alt="Caju Limão"
          className="mx-auto h-24 w-auto"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.fb) {
              img.dataset.fb = "1";
              img.src = "/assets/02-logo-vertical-verde.png";
            } else {
              img.style.display = "none";
            }
          }}
        />
        <p className="mt-2 font-display text-xl text-cl-verde-escuro">
          Bolão Caju Limão
        </p>
        <p className="text-[12px] text-cl-cinza-texto uppercase tracking-wider">
          Copa do Mundo FIFA 2026
        </p>
      </section>

      {/* Estado da Copa */}
      <section className="glass rounded-3xl p-5">
        {antes && (
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cl-cinza-texto">
              Contagem regressiva
            </p>
            <p className="mt-1 font-display text-cl-verde-escuro leading-none tabular-nums">
              <span className="text-5xl font-bold">{diasFaltam}</span>
              <span className="text-base ml-2">
                {diasFaltam === 1 ? "dia" : "dias"}
              </span>
            </p>
            <p className="mt-1 text-sm text-cl-cinza-texto">
              para a Copa começar
            </p>
            <p className="mt-3 text-[11px] uppercase tracking-wider text-cl-cinza-texto">
              11 jun → 19 jul 2026
            </p>
          </div>
        )}

        {durante && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cl-cinza-texto text-center">
              A Copa está rolando
            </p>
            <div className="mt-3 relative h-2 rounded-full bg-cl-verde/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-cl-verde rounded-full transition-all"
                style={{ width: `${progresso * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-cl-laranja border-2 border-white shadow"
                style={{
                  left: `calc(${progresso * 100}% - 6px)`,
                }}
                aria-hidden
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-cl-cinza-texto num">
              <span>11 jun</span>
              <span>19 jul</span>
            </div>
          </div>
        )}

        {!antes && !durante && (
          <div className="text-center">
            <p className="font-display text-xl text-cl-verde-escuro">
              Copa encerrada
            </p>
            <p className="text-sm text-cl-cinza-texto mt-1">
              Obrigado por palpitar com a gente!
            </p>
          </div>
        )}
      </section>

      {/* Jogo de agora (se houver) */}
      {jogoAgora.data && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="pulse-dot" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cl-laranja">
              Jogo de agora
            </p>
          </div>
          <CardJogoAberto jogo={jogoAgora.data} />
        </section>
      )}

      {/* Botões */}
      <section className="grid grid-cols-1 gap-3">
        <Link
          to="/sobre-copa"
          className="glass rounded-2xl p-4 flex items-center gap-3 card-press"
        >
          <span className="size-10 rounded-full bg-cl-verde/10 flex items-center justify-center text-cl-verde">
            <Info className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg text-cl-verde-escuro leading-tight">
              Sobre a Copa
            </span>
            <span className="block text-xs text-cl-cinza-texto">
              Regras do bolão e da competição
            </span>
          </span>
          <ChevronRight className="size-5 text-cl-cinza-texto" />
        </Link>

        <button
          type="button"
          onClick={() => setCardapioAberto(true)}
          className="glass rounded-2xl p-4 flex items-center gap-3 card-press text-left"
        >
          <span className="size-10 rounded-full bg-cl-laranja/20 flex items-center justify-center text-cl-verde-escuro">
            <UtensilsCrossed className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg text-cl-verde-escuro leading-tight">
              Cardápio
            </span>
            <span className="block text-xs text-cl-cinza-texto">
              Escolha a unidade Caju Limão
            </span>
          </span>
          <ChevronRight className="size-5 text-cl-cinza-texto" />
        </button>
      </section>

      <EscolhaUnidadeDialog
        aberto={cardapioAberto}
        onMudou={setCardapioAberto}
      />
    </div>
  );
}

function EscolhaUnidadeDialog({
  aberto,
  onMudou,
}: {
  aberto: boolean;
  onMudou: (v: boolean) => void;
}) {
  function abrir(url: string) {
    onMudou(false);
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return (
    <Dialog open={aberto} onOpenChange={onMudou}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-cl-verde-escuro text-xl">
            Escolha sua unidade
          </DialogTitle>
          <DialogDescription>
            O cardápio abrirá em uma nova aba.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 mt-2">
          <button
            type="button"
            onClick={() => abrir(CARDAPIO.brasilia)}
            className="w-full text-left p-4 rounded-2xl border border-cl-verde/20 bg-white hover:bg-cl-verde/5 transition-colors"
          >
            <p className="font-semibold text-cl-verde-escuro">Brasília</p>
            <p className="text-xs text-cl-cinza-texto mt-0.5">
              Asa Norte / Sudoeste
            </p>
          </button>
          <button
            type="button"
            onClick={() => abrir(CARDAPIO.saoPaulo)}
            className="w-full text-left p-4 rounded-2xl border border-cl-verde/20 bg-white hover:bg-cl-verde/5 transition-colors"
          >
            <p className="font-semibold text-cl-verde-escuro">São Paulo</p>
            <p className="text-xs text-cl-cinza-texto mt-0.5">Itaim</p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =============================================================== */
/*                        ABA 2 — PARTIDAS                          */
/* =============================================================== */

type FiltroPartidas = "data" | "grupo" | "rodada" | "time";

function AbaPartidas() {
  const [filtro, setFiltro] = useState<FiltroPartidas>("data");
  const [time, setTime] = useState<string>("");

  const jogos = useQuery({
    queryKey: ["home", "jogos-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .order("data_hora_inicio", { ascending: true });
      if (error) {
        toast.error("Não foi possível carregar os jogos.");
        throw error;
      }
      return (data ?? []) as Jogo[];
    },
    refetchInterval: 30_000,
  });

  const filtros: { id: FiltroPartidas; label: string }[] = [
    { id: "data", label: "Por data" },
    { id: "grupo", label: "Por grupo" },
    { id: "rodada", label: "Por rodada" },
    { id: "time", label: "Por time" },
  ];

  return (
    <div className="space-y-4">
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Filtros" className="flex gap-2 w-max">
          {filtros.map((f) => {
            const isAtivo = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isAtivo}
                onClick={() => setFiltro(f.id)}
                className={
                  isAtivo
                    ? "px-4 py-2 rounded-full bg-cl-verde text-white text-sm font-semibold shadow-sm whitespace-nowrap"
                    : "px-4 py-2 rounded-full bg-white/60 text-cl-verde text-sm font-semibold border border-cl-verde/15 whitespace-nowrap"
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {jogos.isLoading ? (
        <SkeletonList />
      ) : jogos.isError ? (
        <EstadoErro mensagem="Falha ao carregar partidas." />
      ) : (jogos.data ?? []).length === 0 ? (
        <EstadoVazio mensagem="Nenhum jogo cadastrado." />
      ) : filtro === "data" ? (
        <PartidasPorData jogos={jogos.data ?? []} />
      ) : filtro === "grupo" ? (
        <PartidasPorGrupo jogos={jogos.data ?? []} />
      ) : filtro === "rodada" ? (
        <PartidasPorRodada jogos={jogos.data ?? []} />
      ) : (
        <PartidasPorTime
          jogos={jogos.data ?? []}
          time={time}
          onTime={setTime}
        />
      )}
    </div>
  );
}

function chaveDia(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function chaveHoje(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function rotuloDia(iso: string, hojeKey: string): string {
  if (chaveDia(iso) === hojeKey) return "Hoje";
  return format(new Date(iso), "EEEE, dd 'de' MMM", { locale: ptBR }).replace(
    /^./,
    (c) => c.toUpperCase(),
  );
}

function PartidasPorData({ jogos }: { jogos: Jogo[] }) {
  const hojeKey = chaveHoje();
  const grupos = useMemo(() => {
    const m = new Map<string, Jogo[]>();
    for (const j of jogos) {
      const k = chaveDia(j.data_hora_inicio);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(j);
    }
    return Array.from(m.entries());
  }, [jogos]);

  return (
    <div className="space-y-6">
      {grupos.map(([k, lista]) => {
        const ehHoje = k === hojeKey;
        return (
          <div key={k}>
            <div className="flex items-center gap-2 mb-2 mt-1">
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  ehHoje ? "text-cl-laranja" : "text-cl-verde-escuro"
                }`}
              >
                {rotuloDia(lista[0].data_hora_inicio, hojeKey)}
              </p>
              {ehHoje && (
                <span className="text-[9px] font-semibold uppercase tracking-wider bg-cl-laranja text-white rounded-full px-2 py-0.5">
                  agora
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {lista.map((j) => (
                <CardJogoAberto key={j.id} jogo={j} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PartidasPorGrupo({ jogos }: { jogos: Jogo[] }) {
  const grupos = useMemo(() => {
    const m = new Map<string, Jogo[]>();
    for (const j of jogos) {
      if (j.fase !== "fase_grupos" || !j.grupo) continue;
      if (!m.has(j.grupo)) m.set(j.grupo, []);
      m.get(j.grupo)!.push(j);
    }
    for (const lista of m.values()) {
      lista.sort(
        (a, b) =>
          new Date(a.data_hora_inicio).getTime() -
          new Date(b.data_hora_inicio).getTime(),
      );
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [jogos]);

  return (
    <div className="space-y-6">
      {grupos.map(([g, lista]) => (
        <div key={g}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cl-verde-escuro mb-2">
            Grupo {g}
          </p>
          <div className="space-y-1.5">
            {lista.map((j) => (
              <CardJogoAberto key={j.id} jogo={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartidasPorRodada({ jogos }: { jogos: Jogo[] }) {
  const rodadas = useMemo(() => {
    const m = new Map<string, Jogo[]>();
    for (const j of jogos) {
      if (j.fase !== "fase_grupos" || j.rodada == null) continue;
      const k = String(j.rodada);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(j);
    }
    for (const lista of m.values()) {
      lista.sort(
        (a, b) =>
          new Date(a.data_hora_inicio).getTime() -
          new Date(b.data_hora_inicio).getTime(),
      );
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [jogos]);

  return (
    <div className="space-y-6">
      {rodadas.map(([r, lista]) => (
        <div key={r}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cl-verde-escuro mb-2">
            Rodada {r}
          </p>
          <div className="space-y-1.5">
            {lista.map((j) => (
              <CardJogoAberto key={j.id} jogo={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartidasPorTime({
  jogos,
  time,
  onTime,
}: {
  jogos: Jogo[];
  time: string;
  onTime: (s: string) => void;
}) {
  const times = useMemo(() => {
    const s = new Map<string, { codigo: string | null; nome: string }>();
    for (const j of jogos) {
      if (!s.has(j.time_a)) s.set(j.time_a, { codigo: j.codigo_a, nome: j.time_a });
      if (!s.has(j.time_b)) s.set(j.time_b, { codigo: j.codigo_b, nome: j.time_b });
    }
    return Array.from(s.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [jogos]);

  const filtrados = useMemo(
    () =>
      time
        ? jogos.filter((j) => j.time_a === time || j.time_b === time)
        : [],
    [jogos, time],
  );

  return (
    <div className="space-y-4">
      <select
        value={time}
        onChange={(e) => onTime(e.target.value)}
        className="w-full rounded-2xl border border-cl-verde/15 bg-white px-4 py-3 text-sm font-semibold text-cl-verde-escuro"
      >
        <option value="">Selecione uma seleção…</option>
        {times.map((t) => (
          <option key={t.nome} value={t.nome}>
            {t.nome}
          </option>
        ))}
      </select>

      {time && filtrados.length === 0 && (
        <EstadoVazio mensagem="Sem jogos para este time." />
      )}

      <div className="space-y-1.5">
        {filtrados.map((j) => (
          <CardJogoAberto key={j.id} jogo={j} />
        ))}
      </div>
    </div>
  );
}

/* =============================================================== */
/*                      ABA 3 — CLASSIFICAÇÃO                       */
/* =============================================================== */

function AbaClassificacao() {
  const grupos = useQuery({
    queryKey: ["home", "grupos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_grupos");
      if (error) {
        toast.error("Não foi possível carregar os grupos.");
        throw error;
      }
      const lista = (data ?? [])
        .map((r: { grupo?: string } | string) =>
          typeof r === "string" ? r : (r.grupo ?? ""),
        )
        .filter(Boolean) as string[];
      return Array.from(new Set(lista)).sort();
    },
  });

  const classificacao = useQuery({
    queryKey: ["home", "classificacao"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_classificacao");
      if (error) {
        toast.error("Não foi possível carregar a classificação.");
        throw error;
      }
      return (data ?? []) as LinhaClassificacao[];
    },
    refetchInterval: 60_000,
  });

  const classPorGrupo = useMemo(() => {
    const m = new Map<string, LinhaClassificacao[]>();
    for (const c of classificacao.data ?? []) {
      if (!m.has(c.grupo)) m.set(c.grupo, []);
      m.get(c.grupo)!.push(c);
    }
    return m;
  }, [classificacao.data]);

  if (grupos.isLoading || classificacao.isLoading) {
    return <SkeletonClassificacao />;
  }

  return (
    <div className="space-y-5">
      <HeaderClassificacao titulo="Classificação" />
      <div className="space-y-4">
        {(grupos.data ?? []).map((g) => (
          <TabelaClassificacao
            key={g}
            grupo={g}
            linhas={classPorGrupo.get(g) ?? []}
          />
        ))}
      </div>

      <Accordion type="single" collapsible className="glass rounded-2xl px-4">
        <AccordionItem value="regras" className="border-none">
          <AccordionTrigger className="text-sm font-semibold text-cl-verde-escuro hover:no-underline">
            Regras de desempate
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-cl-cinza-texto mb-2">
              Em empate de pontos, a ordem de desempate na fase de grupos é:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-cl-verde-escuro">
              <li>Saldo de gols em todos os jogos do grupo</li>
              <li>Gols marcados em todos os jogos do grupo</li>
              <li>
                Pontos nos confrontos diretos entre as equipes empatadas
              </li>
              <li>Saldo de gols nos confrontos diretos</li>
              <li>Gols marcados nos confrontos diretos</li>
              <li>Pontos de fair play (cartões)</li>
              <li>Sorteio / posição no Ranking Mundial da FIFA</li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/* =============================================================== */
/*                  ABA 4 — FASE ELIMINATÓRIA                       */
/* =============================================================== */

type Fase =
  | "round_de_32"
  | "oitavas"
  | "quartas"
  | "semifinal"
  | "final";

const SUBABAS: { id: Fase; label: string }[] = [
  { id: "round_de_32", label: "32-avos" },
  { id: "oitavas", label: "Oitavas" },
  { id: "quartas", label: "Quartas" },
  { id: "semifinal", label: "Semis" },
  { id: "final", label: "Final" },
];

function AbaEliminatoria() {
  const [fase, setFase] = useState<Fase>("round_de_32");

  const jogos = useQuery({
    queryKey: ["home", "jogos-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .order("data_hora_inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Jogo[];
    },
  });

  const filtrados = useMemo(() => {
    const lista = jogos.data ?? [];
    if (fase === "semifinal") {
      return lista.filter(
        (j) => j.fase === "semifinal" || j.fase === "disputa_terceiro",
      );
    }
    return lista.filter((j) => j.fase === fase);
  }, [jogos.data, fase]);

  const mostrarConfrontos = fase === "round_de_32";

  return (
    <div className="space-y-4">
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max">
          {SUBABAS.map((s) => {
            const isAtiva = fase === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setFase(s.id)}
                aria-selected={isAtiva}
                className={
                  isAtiva
                    ? "px-4 py-2 rounded-full bg-cl-verde text-white text-sm font-semibold shadow-sm whitespace-nowrap"
                    : "px-4 py-2 rounded-full bg-white/60 text-cl-verde text-sm font-semibold border border-cl-verde/15 whitespace-nowrap"
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {jogos.isLoading ? (
        <SkeletonList />
      ) : filtrados.length === 0 ? (
        <EstadoVazio mensagem="Sem jogos cadastrados nesta fase." />
      ) : (
        <div className="space-y-1.5">
          {filtrados.map((j) => (
            <CardEliminatoria
              key={j.id}
              jogo={j}
              comConfronto={mostrarConfrontos}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CardEliminatoria({
  jogo,
  comConfronto,
}: {
  jogo: Jogo;
  comConfronto: boolean;
}) {
  const data = new Date(jogo.data_hora_inicio);
  const dia = format(data, "dd 'de' MMM • HH'h'mm", { locale: ptBR });

  return (
    <article className="glass rounded-3xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-cl-cinza-texto num">
          {dia}
        </span>
        {jogo.estadio && (
          <span className="text-[10px] text-cl-cinza-texto truncate max-w-[55%] text-right">
            {jogo.estadio}
            {jogo.cidade ? ` · ${jogo.cidade}` : ""}
          </span>
        )}
      </div>

      {comConfronto ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Bandeira codigo={jogo.codigo_a} tamanho={20} />
            <span className="text-sm font-semibold text-cl-verde-escuro truncate">
              {jogo.time_a}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
            x
          </span>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <span className="text-sm font-semibold text-cl-verde-escuro truncate text-right">
              {jogo.time_b}
            </span>
            <Bandeira codigo={jogo.codigo_b} tamanho={20} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-cl-cinza-texto italic">
          Definido após os jogos
        </p>
      )}
    </article>
  );
}

/* =============================================================== */
/*                         Estados auxiliares                       */
/* =============================================================== */

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 rounded-3xl glass animate-pulse"
        />
      ))}
    </div>
  );
}

function SkeletonClassificacao() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-52 rounded-3xl glass animate-pulse" />
      ))}
    </div>
  );
}

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-cl-verde/30 p-6 text-center">
      <p className="text-sm text-cl-cinza-texto">{mensagem}</p>
    </div>
  );
}

function EstadoErro({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-3xl border border-cl-erro/30 bg-cl-erro/5 p-4 text-center">
      <p className="text-sm text-cl-erro font-medium">{mensagem}</p>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}