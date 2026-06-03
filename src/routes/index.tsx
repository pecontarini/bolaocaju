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
import { FaixaAzulejos } from "@/components/site/FaixaAzulejos";
import type { Jogo } from "@/lib/jogos";
import { useEffect, useMemo, useRef, useState } from "react";
import { useJogosRealtime } from "@/hooks/useJogosRealtime";

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

  const jogosGrupos = useQuery({
    queryKey: ["home", "jogos-fase-grupos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .eq("fase", "fase_grupos")
        .order("data_hora_inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Jogo[];
    },
    refetchInterval: 30_000,
  });

  const classificacao = useQuery({
    queryKey: ["classificacao-home"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_classificacao");
      if (error) throw error;
      return (data ?? []) as LinhaClassificacao[];
    },
    refetchInterval: 60_000,
  });

  const listaGrupos = grupos.data ?? [];

  const jogosPorGrupo = useMemo(() => {
    const m = new Map<string, Jogo[]>();
    for (const j of jogosGrupos.data ?? []) {
      if (!j.grupo) continue;
      if (!m.has(j.grupo)) m.set(j.grupo, []);
      m.get(j.grupo)!.push(j);
    }
    return m;
  }, [jogosGrupos.data]);

  const classPorGrupo = useMemo(() => {
    const m = new Map<string, LinhaClassificacao[]>();
    for (const c of classificacao.data ?? []) {
      if (!m.has(c.grupo)) m.set(c.grupo, []);
      m.get(c.grupo)!.push(c);
    }
    return m;
  }, [classificacao.data]);

  const grupoInicial = useMemo(() => {
    if (!listaGrupos.length) return null;
    const agora = Date.now();
    const prox = (jogosGrupos.data ?? [])
      .filter(
        (j) =>
          j.grupo &&
          listaGrupos.includes(j.grupo) &&
          new Date(j.data_hora_inicio).getTime() >= agora,
      )
      .sort(
        (a, b) =>
          new Date(a.data_hora_inicio).getTime() -
          new Date(b.data_hora_inicio).getTime(),
      )[0];
    return prox?.grupo ?? listaGrupos[0];
  }, [listaGrupos, jogosGrupos.data]);

  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);
  const inicializou = useRef(false);
  useEffect(() => {
    if (!inicializou.current && grupoInicial) {
      setGrupoAtivo(grupoInicial);
      inicializou.current = true;
    }
  }, [grupoInicial]);

  const swiperRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const chipRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const scrollProgrammatic = useRef(false);

  function irPara(g: string) {
    setGrupoAtivo(g);
    const el = slideRefs.current.get(g);
    if (el && swiperRef.current) {
      scrollProgrammatic.current = true;
      swiperRef.current.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
      window.setTimeout(() => {
        scrollProgrammatic.current = false;
      }, 600);
    }
    chipRefs.current
      .get(g)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  // posiciona no slide inicial (sem animar) quando os refs estiverem prontos
  useEffect(() => {
    if (!grupoAtivo || !swiperRef.current) return;
    const el = slideRefs.current.get(grupoAtivo);
    if (!el) return;
    if (Math.abs(swiperRef.current.scrollLeft - el.offsetLeft) < 4) return;
    scrollProgrammatic.current = true;
    swiperRef.current.scrollLeft = el.offsetLeft;
    window.setTimeout(() => {
      scrollProgrammatic.current = false;
    }, 80);
    // só posiciona uma vez quando muda a lista; clicks usam irPara()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaGrupos.length]);

  // sincroniza chip ao arrastar
  useEffect(() => {
    const root = swiperRef.current;
    if (!root || !listaGrupos.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (scrollProgrammatic.current) return;
        const visivel = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visivel) {
          const g = (visivel.target as HTMLElement).dataset.grupo;
          if (g && g !== grupoAtivo) {
            setGrupoAtivo(g);
            chipRefs.current
              .get(g)
              ?.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
          }
        }
      },
      { root, threshold: [0.55, 0.75] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [listaGrupos, grupoAtivo]);

  const carregando =
    grupos.isLoading || jogosGrupos.isLoading || classificacao.isLoading;

  return (
    <LayoutCliente>
      <h1 className="sr-only">Bolão Caju Limão — Grupos da Copa</h1>

      <div className="mb-3">
        <p className="font-display text-cl-verde-escuro text-2xl leading-tight">
          Grupos da Copa
        </p>
        <p className="text-sm text-cl-cinza-texto">
          Toque num grupo ou arraste pro lado.
        </p>
      </div>

      {/* Chips de grupos */}
      <div className="-mx-4 px-4 mb-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max pr-4">
          {grupos.isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-12 rounded-full bg-muted animate-pulse"
                />
              ))
            : listaGrupos.map((g) => {
                const ativo = g === grupoAtivo;
                return (
                  <button
                    key={g}
                    type="button"
                    ref={(el) => {
                      chipRefs.current.set(g, el);
                    }}
                    onClick={() => irPara(g)}
                    aria-pressed={ativo}
                    className={`min-w-[3rem] h-10 px-4 rounded-full font-display text-base tracking-wider transition-colors border ${
                      ativo
                        ? "bg-cl-verde-escuro text-white border-cl-verde-escuro shadow-[0_6px_18px_-10px_rgba(28,59,22,0.7)]"
                        : "bg-white text-cl-verde-escuro border-border hover:bg-cl-verde-claro"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
        </div>
      </div>

      <FaixaAzulejos className="mb-4 opacity-90" />

      {carregando ? (
        <SkeletonCard />
      ) : listaGrupos.length === 0 ? (
        <SemGrupos />
      ) : (
        <div
          ref={swiperRef}
          className="-mx-4 flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth touch-pan-x"
          style={{ scrollbarWidth: "none" }}
        >
          {listaGrupos.map((g) => (
            <section
              key={g}
              data-grupo={g}
              ref={(el) => {
                slideRefs.current.set(g, el);
              }}
              className="snap-center shrink-0 w-full px-4"
            >
              <SlideGrupo
                grupo={g}
                linhas={classPorGrupo.get(g) ?? []}
                jogos={jogosPorGrupo.get(g) ?? []}
              />
            </section>
          ))}
        </div>
      )}
    </LayoutCliente>
  );
}

function SlideGrupo({
  grupo,
  linhas,
  jogos,
}: {
  grupo: string;
  linhas: LinhaClassificacao[];
  jogos: Jogo[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <HeaderClassificacao titulo={`Classificação do Grupo ${grupo}`} />
        <TabelaClassificacao grupo={grupo} linhas={linhas} />
      </div>
      <div>
        <HeaderClassificacao titulo={`Jogos do Grupo ${grupo}`} />
        {jogos.length === 0 ? (
          <p className="text-sm text-cl-cinza-texto px-1">
            Nenhum jogo cadastrado para este grupo.
          </p>
        ) : (
          <div className="space-y-3">
            {jogos.map((j) => (
              <CardJogoAberto key={j.id} jogo={j} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SemGrupos() {
  return (
    <section className="rounded-2xl bg-card border-2 border-dashed border-cl-verde/40 p-6 text-center">
      <p className="font-display text-cl-verde-escuro text-xl">
        Nenhum grupo disponível
      </p>
      <p className="text-sm text-cl-cinza-texto mt-1">
        Os grupos da Copa aparecem aqui assim que forem cadastrados.
      </p>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 animate-pulse">
      <div className="h-4 w-32 bg-muted rounded mb-3" />
      <div className="h-6 w-3/4 bg-muted rounded mb-2" />
      <div className="h-4 w-1/2 bg-muted rounded mb-6" />
      <div className="h-12 w-full bg-muted rounded" />
    </div>
  );
}