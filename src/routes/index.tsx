import { createFileRoute } from "@tanstack/react-router";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useJogosRealtime } from "@/hooks/useJogosRealtime";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  component: HomeCliente,
});

const COLUNAS =
  "id,numero_jogo,fase,grupo,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil";

function HomeCliente() {
  useJogosRealtime();

  const grupos = useQuery({
    queryKey: ["home", "grupos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_grupos");
      if (error) throw error;
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
      if (error) throw error;
      return (data ?? []) as LinhaClassificacao[];
    },
    refetchInterval: 60_000,
  });

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
    refetchInterval: 30_000,
  });

  return (
    <LayoutCliente>
      <h1 className="sr-only">Bolão Caju Limão</h1>

      {/* Bloco 1: carrossel de grupos */}
      <section className="mb-4">
        <HeaderClassificacao titulo="Grupos" />
        <CarrosselGrupos
          grupos={grupos.data ?? []}
          classificacao={classificacao.data ?? []}
          carregando={grupos.isLoading || classificacao.isLoading}
        />
      </section>

      {/* Bloco 2: jogos em ordem cronológica */}
      <section className="mt-6">
        <HeaderClassificacao titulo="Jogos" />
        {jogos.isLoading ? (
          <SkeletonList />
        ) : (
          <ListaJogosCronologica jogos={jogos.data ?? []} />
        )}
      </section>
    </LayoutCliente>
  );
}

/* ----------------------------- Carrossel de Grupos ----------------------------- */

function CarrosselGrupos({
  grupos,
  classificacao,
  carregando,
}: {
  grupos: string[];
  classificacao: LinhaClassificacao[];
  carregando: boolean;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const swiperRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const scrollProgrammatic = useRef(false);

  const classPorGrupo = useMemo(() => {
    const m = new Map<string, LinhaClassificacao[]>();
    for (const c of classificacao) {
      if (!m.has(c.grupo)) m.set(c.grupo, []);
      m.get(c.grupo)!.push(c);
    }
    return m;
  }, [classificacao]);

  useEffect(() => {
    if (!ativo && grupos.length) setAtivo(grupos[0]);
  }, [grupos, ativo]);

  function irPara(g: string) {
    setAtivo(g);
    const el = slideRefs.current.get(g);
    if (el && swiperRef.current) {
      scrollProgrammatic.current = true;
      swiperRef.current.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
      window.setTimeout(() => {
        scrollProgrammatic.current = false;
      }, 600);
    }
  }

  // Sincroniza pílula ativa com o slide visível durante o swipe.
  useEffect(() => {
    const root = swiperRef.current;
    if (!root || !grupos.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (scrollProgrammatic.current) return;
        const visivel = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visivel) {
          const g = (visivel.target as HTMLElement).dataset.grupo;
          if (g && g !== ativo) setAtivo(g);
        }
      },
      { root, threshold: [0.55, 0.75] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [grupos, ativo]);

  if (carregando) {
    return (
      <div className="rounded-3xl bg-white/40 border border-white/60 p-4 animate-pulse h-72" />
    );
  }

  if (!grupos.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-cl-verde/40 p-6 text-center">
        <p className="text-sm text-cl-cinza-texto">
          Nenhum grupo cadastrado ainda.
        </p>
      </div>
    );
  }

  const grupoAtivo = ativo ?? grupos[0];

  return (
    <div>
      {/* Seletor de grupos: pílulas modernas (sem swipe) */}
      <div
        className="-mx-4 px-4 mb-4 overflow-x-auto no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        <div role="tablist" aria-label="Grupos" className="flex gap-2 w-max pb-1">
          {grupos.map((g) => {
            const isAtivo = g === grupoAtivo;
            return (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={isAtivo}
                onClick={() => irPara(g)}
                className={
                  isAtivo
                    ? "px-4 py-2 rounded-full bg-cl-verde text-white text-sm font-semibold shadow-sm whitespace-nowrap transition-colors"
                    : "px-4 py-2 rounded-full bg-white/60 text-cl-verde text-sm font-semibold border border-cl-verde/15 whitespace-nowrap hover:bg-white/80 transition-colors"
                }
              >
                Grupo {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Swipe horizontal pelos grupos — sem indicadores visuais (as pílulas
          servem de marcador). Snap por grupo, scrollbar oculta. */}
      <div
        ref={swiperRef}
        className="-mx-4 flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth touch-pan-x overscroll-x-contain"
        style={{ scrollbarWidth: "none" }}
      >
        {grupos.map((g) => (
          <section
            key={g}
            data-grupo={g}
            ref={(el) => {
              slideRefs.current.set(g, el);
            }}
            className="snap-center shrink-0 w-full px-4"
          >
            <TabelaClassificacao
              grupo={g}
              linhas={classPorGrupo.get(g) ?? []}
            />
          </section>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Lista cronológica de jogos --------------------------- */

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

function ListaJogosCronologica({ jogos }: { jogos: Jogo[] }) {
  const hojeKey = chaveHoje();

  const { passados, hojeEFuturos } = useMemo(() => {
    const p: Jogo[] = [];
    const f: Jogo[] = [];
    for (const j of jogos) {
      const k = chaveDia(j.data_hora_inicio);
      if (k < hojeKey) p.push(j);
      else f.push(j);
    }
    return { passados: p, hojeEFuturos: f };
  }, [jogos, hojeKey]);

  const gruposFuturos = useMemo(() => {
    const m = new Map<string, Jogo[]>();
    for (const j of hojeEFuturos) {
      const k = chaveDia(j.data_hora_inicio);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(j);
    }
    return Array.from(m.entries());
  }, [hojeEFuturos]);

  const [verPassados, setVerPassados] = useState(false);

  if (jogos.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-cl-verde/40 p-6 text-center">
        <p className="text-sm text-cl-cinza-texto">
          Nenhum jogo cadastrado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {gruposFuturos.map(([k, lista]) => {
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

      {passados.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setVerPassados((v) => !v)}
            className="w-full text-sm font-semibold text-cl-verde-escuro underline underline-offset-4 decoration-cl-laranja py-2"
          >
            {verPassados
              ? "Esconder jogos passados"
              : `Ver ${passados.length} ${passados.length === 1 ? "jogo passado" : "jogos passados"}`}
          </button>
          {verPassados && (
            <div className="space-y-6 mt-3 opacity-90">
              {Array.from(
                passados.reduce((m, j) => {
                  const k = chaveDia(j.data_hora_inicio);
                  if (!m.has(k)) m.set(k, []);
                  m.get(k)!.push(j);
                  return m;
                }, new Map<string, Jogo[]>()),
              )
                .reverse()
                .map(([k, lista]) => (
                  <div key={k}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cl-cinza-texto mb-2">
                      {rotuloDia(lista[0].data_hora_inicio, hojeKey)}
                    </p>
                    <div className="space-y-1.5">
                      {lista.map((j) => (
                        <CardJogoAberto key={j.id} jogo={j} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-cl-verde-escuro text-base mb-3 flex items-center gap-3 uppercase tracking-wider">
      <span className="block h-px flex-1 bg-cl-verde/25" aria-hidden />
      <span>{children}</span>
      <span className="block h-px flex-1 bg-cl-verde/25" aria-hidden />
    </h2>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-32 rounded-2xl bg-card border border-border animate-pulse"
        />
      ))}
    </div>
  );
}