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
import { useMemo, useState, useEffect } from "react";
import { useJogosRealtime } from "@/hooks/useJogosRealtime";
import { useMarcaAtual, useBranding } from "@/lib/marca";
import { LogoMarca } from "@/components/site/LogoMarca";
import { useCliente } from "@/store/cliente";
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
import {
  ChevronRight,
  Info,
  UtensilsCrossed,
  Trophy,
  Users,
  MapPin,
  Globe2,
  Ticket,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
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
      { title: "Bolão — Palpite nos jogos da Copa 2026" },
      {
        name: "description",
        content:
          "Palpite no placar exato dos jogos da Copa do Mundo FIFA 2026.",
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
  const { nomeExibicao } = useBranding();

  function setAba(a: Aba) {
    navigate({ search: { aba: a }, replace: true });
  }

  return (
    <LayoutCliente>
      <h1 className="sr-only">Bolão {nomeExibicao}</h1>
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
  const { marca } = useMarcaAtual();
  const { nomeExibicao } = useBranding();
  const cliente_id = useCliente((s) => s.cliente_id);
  const [hoje, setHoje] = useState<Date | null>(null);
  useEffect(() => {
    setHoje(new Date());
    const id = setInterval(() => setHoje(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const antes = !!hoje && hoje < COPA_INICIO;
  const durante = !!hoje && hoje >= COPA_INICIO && hoje <= COPA_FIM;
  const depois = !!hoje && hoje > COPA_FIM;
  const diasFaltam = Math.max(
    0,
    hoje ? differenceInCalendarDays(COPA_INICIO, hoje) : 0,
  );
  const progresso = clamp(
    ((hoje?.getTime() ?? COPA_INICIO.getTime()) - COPA_INICIO.getTime()) /
      (COPA_FIM.getTime() - COPA_INICIO.getTime()),
    0,
    1,
  );

  // Lista de jogos abertos para palpite na marca atual: status in (ativo, habilitado) e não encerrados.
  const jogosAbertosQ = useQuery({
    queryKey: ["home", "jogos-abertos", marca?.id],
    enabled: !!marca?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marca_jogos")
        .select(
          "status, palpites_encerrados, premio_descricao, premio_imagem_url, jogos!inner(*)",
        )
        .eq("marca_id", marca!.id)
        .in("status", ["ativo", "habilitado"])
        .eq("palpites_encerrados", false)
        .order("data_hora_inicio", {
          ascending: true,
          referencedTable: "jogos",
        });
      if (error) throw error;
      type Row = {
        status: string;
        palpites_encerrados: boolean | null;
        premio_descricao: string | null;
        premio_imagem_url: string | null;
        jogos: Jogo;
      };
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        ...r.jogos,
        status: r.status as Jogo["status"],
        palpites_encerrados: r.palpites_encerrados,
        premio_descricao: r.premio_descricao ?? r.jogos.premio_descricao,
        premio_imagem_url: r.premio_imagem_url ?? r.jogos.premio_imagem_url,
      })) as Jogo[];
    },
    refetchInterval: 60_000,
  });

  const jogosAbertos = useMemo(
    () =>
      [...(jogosAbertosQ.data ?? [])].sort(
        (a, b) =>
          new Date(a.data_hora_inicio).getTime() -
          new Date(b.data_hora_inicio).getTime(),
      ),
    [jogosAbertosQ.data],
  );

  // Jogos em que o cliente atual já palpitou (para trocar CTA por selo).
  const meusPalpitesQ = useQuery({
    queryKey: [
      "home",
      "meus-palpites-abertos",
      marca?.id,
      cliente_id,
      jogosAbertos.map((j) => j.id).join(","),
    ],
    enabled: !!marca?.id && !!cliente_id && jogosAbertos.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("palpites")
        .select("jogo_id")
        .eq("marca_id", marca!.id)
        .eq("cliente_id", cliente_id!)
        .in(
          "jogo_id",
          jogosAbertos.map((j) => j.id),
        );
      if (error) throw error;
      return new Set(
        ((data ?? []) as { jogo_id: string }[]).map((p) => p.jogo_id),
      );
    },
  });
  const jaPalpitados = meusPalpitesQ.data ?? new Set<string>();

  // Números da Copa: 104 jogos / cidades distintas
  const numerosCopa = useQuery({
    queryKey: ["home", "numeros-copa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select("cidade");
      if (error) throw error;
      const cidades = new Set<string>();
      for (const r of (data ?? []) as { cidade: string | null }[]) {
        if (r.cidade) cidades.add(r.cidade);
      }
      return {
        totalJogos: (data ?? []).length || 104,
        totalSedes: cidades.size || 16,
      };
    },
  });

  const [cardapioAberto, setCardapioAberto] = useState(false);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl glass px-5 pt-5 pb-6 text-center"
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
        <LogoMarca
          imgClassName="mx-auto h-[156px] w-auto max-w-[280px] object-contain"
          fallbackClassName="block mx-auto font-display text-3xl font-bold text-cl-verde-escuro"
        />
        <p className="mt-4 font-display text-2xl font-semibold text-cl-verde-escuro leading-tight">
          Bolão
        </p>
        <p className="mt-1 text-[11px] text-cl-cinza-texto uppercase tracking-[0.18em]">
          Copa do Mundo FIFA 2026
        </p>
      </section>

      {/* Jogos abertos para palpite */}
      <SecaoJogosAbertos
        loading={jogosAbertosQ.isLoading}
        jogos={jogosAbertos}
        jaPalpitados={jaPalpitados}
      />

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

        {depois && (
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

      {/* A Copa em números */}
      <section>
        <HeaderSecao titulo="A Copa em números" />
        <div className="grid grid-cols-2 gap-2.5">
          <MiniCard
            icon={<Users className="size-5" />}
            valor="48"
            rotulo="seleções"
          />
          <MiniCard
            icon={<Trophy className="size-5" />}
            valor={String(numerosCopa.data?.totalJogos ?? 104)}
            rotulo="jogos"
          />
          <MiniCard
            icon={<MapPin className="size-5" />}
            valor={String(numerosCopa.data?.totalSedes ?? 16)}
            rotulo="sedes"
          />
          <MiniCard
            icon={<Globe2 className="size-5" />}
            valor="3"
            rotulo="países"
          />
        </div>
      </section>

      {/* Botões */}
      <section>
        <HeaderSecao titulo="Atalhos" />
        <div className="grid grid-cols-1 gap-2.5">
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

        <Link
          to="/meus-palpites"
          className="glass rounded-2xl p-4 flex items-center gap-3 card-press"
        >
          <span className="size-10 rounded-full bg-cl-verde/15 flex items-center justify-center text-cl-verde-escuro">
            <Ticket className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg text-cl-verde-escuro leading-tight">
              Meus palpites
            </span>
            <span className="block text-xs text-cl-cinza-texto">
              Acompanhe seus chutes na Copa
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
              Escolha a unidade {nomeExibicao}
            </span>
          </span>
          <ChevronRight className="size-5 text-cl-cinza-texto" />
        </button>
        </div>
      </section>

      <EscolhaUnidadeDialog
        aberto={cardapioAberto}
        onMudou={setCardapioAberto}
      />
    </div>
  );
}

function HeaderSecao({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 px-0.5">
      <img
        src="/assets/08-selo-circular-verde.png"
        alt=""
        className="h-5 w-5"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cl-verde-escuro">
        {titulo}
      </p>
    </div>
  );
}

function MiniCard({
  icon,
  valor,
  rotulo,
}: {
  icon: React.ReactNode;
  valor: string;
  rotulo: string;
}) {
  return (
    <div className="glass rounded-2xl p-3.5 flex items-center gap-3">
      <span className="size-9 rounded-full bg-cl-verde/10 flex items-center justify-center text-cl-verde">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold leading-none text-cl-verde-escuro tabular-nums">
          {valor}
        </p>
        <p className="text-[11px] text-cl-cinza-texto uppercase tracking-wider mt-0.5">
          {rotulo}
        </p>
      </div>
    </div>
  );
}

function SecaoJogosAbertos({
  loading,
  jogos,
  jaPalpitados,
}: {
  loading: boolean;
  jogos: Jogo[];
  jaPalpitados: Set<string>;
}) {
  if (loading) {
    return (
      <section>
        <HeaderSecao titulo="Jogos abertos para palpite" />
        <div className="glass rounded-3xl p-5 animate-pulse h-32" />
      </section>
    );
  }
  if (jogos.length === 0) {
    return (
      <section>
        <HeaderSecao titulo="Jogos abertos para palpite" />
        <div className="glass rounded-3xl p-5 text-center">
          <p className="text-sm text-cl-cinza-texto">
            Nenhum jogo aberto agora. Volte mais tarde!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <HeaderSecao titulo="Jogos abertos para palpite" />
      <div className="space-y-2.5">
        {jogos.slice(0, 2).map((jogo) => (
          <CardJogoAbertoPalpite
            key={jogo.id}
            jogo={jogo}
            destaque={jogo.status === "ativo"}
            jaPalpitou={jaPalpitados.has(jogo.id)}
          />
        ))}
      </div>
      <Link
        to="/"
        search={{ aba: "partidas" }}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold border border-cl-verde/30 text-cl-verde-escuro hover:bg-cl-verde/5 transition-colors"
      >
        Ver todos os jogos
        <ChevronRight className="size-4" />
      </Link>
    </section>
  );
}

function CardJogoAbertoPalpite({
  jogo,
  destaque,
  jaPalpitou,
}: {
  jogo: Jogo;
  destaque: boolean;
  jaPalpitou: boolean;
}) {
  const envolveBrasil = !!jogo.envolve_brasil;
  const dataFmt = format(
    new Date(jogo.data_hora_inicio),
    "EEE, dd 'de' MMM • HH'h'mm",
    { locale: ptBR },
  ).replace(/^./, (c) => c.toUpperCase());
  const local = [jogo.estadio, jogo.cidade].filter(Boolean).join(" — ");

  return (
    <article
      className={`glass rounded-3xl p-4 ${
        destaque
          ? "ring-2 ring-cl-laranja/50"
          : envolveBrasil
            ? "ring-1 ring-cl-laranja/40"
            : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {destaque && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-cl-laranja">
            <span className="pulse-dot" aria-hidden /> Em destaque
          </span>
        )}
        {envolveBrasil && (
          <span className="text-[9px] font-semibold uppercase tracking-wider bg-cl-laranja text-white rounded-full px-2 py-0.5">
            Brasil
          </span>
        )}
      </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1.5 text-center min-w-0">
            <Bandeira codigo={jogo.codigo_a} tamanho={40} />
            <p
              className={`text-sm leading-tight truncate w-full ${
                jogo.codigo_a === "BRA"
                  ? "font-display font-semibold text-cl-verde-escuro"
                  : "font-medium text-cl-verde-escuro"
              }`}
            >
              {jogo.time_a}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl text-cl-verde-escuro/40 font-bold">
              ×
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center min-w-0">
            <Bandeira codigo={jogo.codigo_b} tamanho={40} />
            <p
              className={`text-sm leading-tight truncate w-full ${
                jogo.codigo_b === "BRA"
                  ? "font-display font-semibold text-cl-verde-escuro"
                  : "font-medium text-cl-verde-escuro"
              }`}
            >
              {jogo.time_b}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-cl-cinza-texto">
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="truncate">{dataFmt}</span>
          </div>
          {local && (
            <div className="flex items-center gap-1.5 text-xs text-cl-cinza-texto">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{local}</span>
            </div>
          )}
        </div>

      {jaPalpitou ? (
        <div className="mt-3 w-full flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold bg-cl-verde/10 text-cl-verde-escuro border border-cl-verde/30">
          <CheckCircle2 className="size-4" />
          Palpite registrado
        </div>
      ) : (
        <Link
          to="/palpitar/$jogoId"
          params={{ jogoId: jogo.id }}
          className={`mt-3 block w-full text-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
            envolveBrasil || destaque
              ? "bg-cl-laranja text-white hover:bg-cl-laranja/90"
              : "bg-cl-verde text-white hover:bg-cl-verde/90"
          }`}
        >
          Palpitar
        </Link>
      )}
    </article>
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
  const selecoes = useQuery({
    queryKey: ["home", "selecoes-reais"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_grupos");
      if (error) throw error;
      const map = new Map<string, { nome: string; codigo: string | null }>();
      for (const r of (data ?? []) as Array<{
        selecao?: string;
        codigo?: string | null;
      }>) {
        const nome = r.selecao;
        if (!nome) continue;
        if (!map.has(nome)) map.set(nome, { nome, codigo: r.codigo ?? null });
      }
      return Array.from(map.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      );
    },
  });

  const filtrados = useMemo(
    () =>
      time
        ? jogos
            .filter(
              (j) =>
                j.fase === "fase_grupos" &&
                (j.time_a === time || j.time_b === time),
            )
            .sort(
              (a, b) =>
                new Date(a.data_hora_inicio).getTime() -
                new Date(b.data_hora_inicio).getTime(),
            )
        : [],
    [jogos, time],
  );

  const timeSel = selecoes.data?.find((t) => t.nome === time);

  return (
    <div className="space-y-4">
      <div className="relative">
        <select
          value={time}
          onChange={(e) => onTime(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-cl-verde/15 bg-white px-4 py-3 pr-10 text-sm font-semibold text-cl-verde-escuro"
        >
          <option value="">Selecione uma seleção…</option>
          {(selecoes.data ?? []).map((t) => (
            <option key={t.nome} value={t.nome}>
              {t.nome}
            </option>
          ))}
        </select>
        <ChevronRight className="size-4 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-cl-cinza-texto pointer-events-none" />
      </div>

      {timeSel && (
        <div className="flex items-center gap-2 px-1">
          <Bandeira codigo={timeSel.codigo} tamanho={20} />
          <p className="font-display text-lg text-cl-verde-escuro">
            {timeSel.nome}
          </p>
        </div>
      )}

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