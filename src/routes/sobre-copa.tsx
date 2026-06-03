import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { LayoutCliente } from "@/components/site/LayoutCliente";
import { FaixaAzulejos } from "@/components/site/FaixaAzulejos";
import { Bandeira } from "@/components/jogos/Bandeira";
import {
  TabelaClassificacao,
  HeaderClassificacao,
  type LinhaClassificacao,
} from "@/components/jogos/TabelaClassificacao";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useJogosRealtime } from "@/hooks/useJogosRealtime";

export const Route = createFileRoute("/sobre-copa")({
  head: () => ({
    meta: [
      { title: "Sobre a Copa 2026 — Bolão Caju Limão" },
      {
        name: "description",
        content:
          "Tudo sobre a Copa do Mundo FIFA 2026: grupos, sedes, formato e números.",
      },
    ],
  }),
  component: SobreCopa,
});

type LinhaGrupo = { grupo: string; codigo: string; selecao: string };

const NOME_PAIS: Record<string, string> = {
  USA: "Estados Unidos",
  CAN: "Canadá",
  MEX: "México",
};

function SobreCopa() {
  useJogosRealtime();
  const grupos = useQuery({
    queryKey: ["sobre-copa", "grupos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_grupos");
      if (error) throw error;
      return (data ?? []) as LinhaGrupo[];
    },
  });

  const sedes = useQuery({
    queryKey: ["sobre-copa", "sedes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select("cidade, pais_sede");
      if (error) throw error;
      return (data ?? []) as { cidade: string | null; pais_sede: string | null }[];
    },
  });

  const classificacao = useQuery({
    queryKey: ["sobre-copa", "classificacao"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_classificacao");
      if (error) throw error;
      return (data ?? []) as LinhaClassificacao[];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (grupos.error) toast.error("Não consegui carregar os grupos.");
  }, [grupos.error]);
  useEffect(() => {
    if (sedes.error) toast.error("Não consegui carregar as sedes.");
  }, [sedes.error]);
  useEffect(() => {
    if (classificacao.error)
      toast.error("Não consegui carregar a classificação.");
  }, [classificacao.error]);

  return (
    <LayoutCliente>
      <h1 className="sr-only">Sobre a Copa do Mundo FIFA 2026</h1>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-border shadow-sm">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/assets/16-textura-geometrica.png')",
            backgroundRepeat: "repeat",
            backgroundSize: "260px",
            opacity: 0.07,
          }}
        />
        <div className="relative p-6 text-center">
          <img
            src="/assets/05-logo-com-adornos-emblema.png"
            alt=""
            className="mx-auto h-24 w-auto"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-cl-cinza-texto">
            FIFA World Cup
          </p>
          <h2 className="font-display text-cl-verde-escuro text-3xl leading-tight mt-1">
            Copa do Mundo FIFA 2026
          </h2>
          <p className="text-sm text-cl-cinza-texto mt-2">
            Estados Unidos, Canadá e México
          </p>
          <p className="text-xs font-medium text-cl-verde-escuro mt-3 inline-block px-3 py-1 rounded-full bg-cl-verde-claro">
            11 de junho a 19 de julho de 2026
          </p>
        </div>
      </section>

      <FaixaAzulejos className="my-6 opacity-90" />

      {/* Números */}
      <section>
        <SectionTitle>Em números</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumeroCard valor="48" label="seleções" />
          <NumeroCard valor="104" label="jogos" />
          <NumeroCard valor="16" label="sedes" />
          <NumeroCard valor="3" label="países" />
        </div>
      </section>

      <FaixaAzulejos className="my-6 opacity-90" />

      {/* O torneio */}
      <section>
        <SectionTitle>O torneio</SectionTitle>
        <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-border p-5 space-y-4 text-sm text-cl-cinza-texto leading-relaxed">
          <div>
            <h3 className="font-display font-semibold text-cl-verde-escuro text-sm mb-1">
              O que é
            </h3>
            <p>
              A Copa do Mundo FIFA é o principal torneio de seleções masculinas,
              disputado a cada quatro anos. A edição de 2026 é a primeira com 48
              seleções e 104 partidas, e a primeira sediada por três países ao
              mesmo tempo: Estados Unidos, Canadá e México.
            </p>
          </div>
          <div>
            <h3 className="font-display font-semibold text-cl-verde-escuro text-sm mb-1">
              Formato
            </h3>
            <p>
              São 12 grupos de 4 seleções. Avançam os dois primeiros de cada
              grupo e os oito melhores terceiros colocados, formando uma fase
              eliminatória de 32 times. A partir daí é mata-mata em jogo único,
              até a final.
            </p>
          </div>
          <div>
            <h3 className="font-display font-semibold text-cl-verde-escuro text-sm mb-1">
              Datas e sedes
            </h3>
            <p>
              O torneio vai de 11 de junho a 19 de julho de 2026, com partidas
              em 16 cidades dos três países. A abertura é na Cidade do México
              e a final em Nova York / Nova Jersey. Os jogos das quartas de
              final em diante acontecem nos Estados Unidos.
            </p>
          </div>
          <div>
            <h3 className="font-display font-semibold text-cl-verde-escuro text-sm mb-1">
              História
            </h3>
            <p>
              O Brasil é o maior campeão, com cinco títulos. A atual campeã é
              a Argentina, vencedora em 2022. A primeira Copa, em 1930, foi
              vencida pelo Uruguai, país-sede daquela edição.
            </p>
          </div>
        </div>
      </section>

      <FaixaAzulejos className="my-6 opacity-90" />

      {/* Formato */}
      <section>
        <SectionTitle>Como funciona</SectionTitle>
        <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-border p-5 space-y-3 text-sm text-cl-cinza-texto leading-relaxed">
          <p>
            <span className="font-semibold text-cl-verde-escuro">
              12 grupos de 4 seleções.
            </span>{" "}
            Avançam 32 times: os 2 primeiros de cada grupo + os 8 melhores
            terceiros.
          </p>
          <p>
            <span className="font-semibold text-cl-verde-escuro">
              Mata-mata:
            </span>{" "}
            32-avos, oitavas, quartas, semifinais, disputa de terceiro lugar e
            final.
          </p>
        </div>
      </section>

      <FaixaAzulejos className="my-6 opacity-90" />

      {/* Grupos */}
      <section>
        <SectionTitle>Os 12 grupos</SectionTitle>
        {grupos.isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : (
          <GruposLista
            linhas={grupos.data ?? []}
            classificacao={classificacao.data ?? []}
            carregandoClassificacao={classificacao.isLoading}
          />
        )}
      </section>

      <FaixaAzulejos className="my-6 opacity-90" />

      {/* Sedes */}
      <section>
        <SectionTitle>Sedes</SectionTitle>
        {sedes.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <SedesLista linhas={sedes.data ?? []} />
        )}
      </section>

      {/* Rodapé */}
      <div className="mt-8 mb-2">
        <Link
          to="/"
          className="block w-full text-center bg-cl-verde-escuro text-white font-display text-base py-3.5 rounded-2xl min-h-11 hover:bg-cl-verde transition-colors"
        >
          Ver jogos
        </Link>
      </div>
    </LayoutCliente>
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

function NumeroCard({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-border p-4 text-center shadow-sm">
      <p className="font-display font-bold text-cl-verde-escuro text-4xl tabular-nums leading-none">
        {valor}
      </p>
      <p className="text-xs text-cl-cinza-texto mt-1.5 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function GruposLista({
  linhas,
  classificacao,
  carregandoClassificacao,
}: {
  linhas: LinhaGrupo[];
  classificacao: LinhaClassificacao[];
  carregandoClassificacao: boolean;
}) {
  const porGrupo = new Map<string, LinhaGrupo[]>();
  for (const l of linhas) {
    if (!porGrupo.has(l.grupo)) porGrupo.set(l.grupo, []);
    porGrupo.get(l.grupo)!.push(l);
  }
  const ordenado = Array.from(porGrupo.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const classPorGrupo = new Map<string, LinhaClassificacao[]>();
  for (const c of classificacao) {
    if (!classPorGrupo.has(c.grupo)) classPorGrupo.set(c.grupo, []);
    classPorGrupo.get(c.grupo)!.push(c);
  }

  if (ordenado.length === 0) {
    return (
      <p className="text-sm text-cl-cinza-texto text-center py-4">
        Grupos ainda não disponíveis.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {ordenado.map(([grupo, selecoes]) => (
        <div
          key={grupo}
          className="rounded-2xl bg-white/90 backdrop-blur-sm border border-border p-4 shadow-sm"
        >
          <p className="font-display text-cl-verde-escuro text-sm uppercase tracking-wider mb-3">
            Grupo {grupo}
          </p>
          <ul className="space-y-2">
            {selecoes.map((s) => {
              const isBrasil = s.codigo === "BRA";
              return (
                <li
                  key={`${grupo}-${s.codigo}`}
                  className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                    isBrasil
                      ? "bg-cl-laranja/10 border border-cl-laranja/40"
                      : ""
                  }`}
                >
                  <Bandeira codigo={s.codigo} tamanho={22} />
                  <span
                    className={`text-sm flex-1 ${
                      isBrasil
                        ? "font-semibold text-cl-laranja"
                        : "text-cl-verde-escuro"
                    }`}
                  >
                    {s.selecao}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-cl-cinza-texto tabular-nums">
                    {s.codigo}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <HeaderClassificacao />
            {carregandoClassificacao ? (
              <Skeleton className="h-40 rounded-2xl" />
            ) : (
              <TabelaClassificacao
                grupo={grupo}
                linhas={classPorGrupo.get(grupo) ?? []}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SedesLista({
  linhas,
}: {
  linhas: { cidade: string | null; pais_sede: string | null }[];
}) {
  const porPais = new Map<string, Set<string>>();
  for (const l of linhas) {
    if (!l.cidade || !l.pais_sede) continue;
    if (!porPais.has(l.pais_sede)) porPais.set(l.pais_sede, new Set());
    porPais.get(l.pais_sede)!.add(l.cidade);
  }

  const ordemPais = ["USA", "MEX", "CAN"];
  const paises = Array.from(porPais.keys()).sort(
    (a, b) => ordemPais.indexOf(a) - ordemPais.indexOf(b),
  );

  if (paises.length === 0) {
    return (
      <p className="text-sm text-cl-cinza-texto text-center py-4">
        Sedes ainda não disponíveis.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {paises.map((pais) => {
        const cidades = Array.from(porPais.get(pais)!).sort();
        return (
          <div
            key={pais}
            className="rounded-2xl bg-white/90 backdrop-blur-sm border border-border p-4 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <Bandeira codigo={pais} tamanho={24} />
              <p className="font-display text-cl-verde-escuro text-base">
                {NOME_PAIS[pais] ?? pais}
              </p>
              <span className="ml-auto text-xs text-cl-cinza-texto tabular-nums">
                {cidades.length} {cidades.length === 1 ? "cidade" : "cidades"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cidades.map((c) => (
                <span
                  key={c}
                  className="text-xs px-2.5 py-1 rounded-full bg-cl-verde-claro text-cl-verde-escuro"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}