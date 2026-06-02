import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutCliente } from "@/components/site/LayoutCliente";
import { CardJogoAberto } from "@/components/jogos/CardJogoAberto";
import { ListaResultados } from "@/components/jogos/ListaJogos";
import { FaixaAzulejos } from "@/components/site/FaixaAzulejos";
import { BannerCopa } from "@/components/site/BannerCopa";
import type { Jogo } from "@/lib/jogos";
import { useState } from "react";
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
  const abertos = useQuery({
    queryKey: ["jogos-abertos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .eq("status", "ativo")
        .order("data_hora_inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Jogo[];
    },
    refetchInterval: 30_000,
  });

  const resultados = useQuery({
    queryKey: ["ultimos-resultados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .eq("status", "encerrado")
        .order("data_hora_inicio", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Jogo[];
    },
  });

  const proximoGeral = useQuery({
    queryKey: ["proximo-jogo-banner"],
    queryFn: async () => {
      const agora = new Date().toISOString();
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .neq("status", "encerrado")
        .gte("data_hora_inicio", agora)
        .order("data_hora_inicio", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Jogo | null;
    },
    refetchInterval: 60_000,
  });

  const totalEncerrados = useQuery({
    queryKey: ["total-encerrados"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("jogos")
        .select("id", { count: "exact", head: true })
        .eq("status", "encerrado");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  return (
    <LayoutCliente>
      <h1 className="sr-only">Bolão Caju Limão</h1>

      {/* Banner Copa */}
      <div className="mb-5">
        <BannerCopa
          proximo={proximoGeral.data ?? null}
          encerrados={totalEncerrados.data ?? 0}
        />
      </div>

      {/* Saudação enxuta */}
      <div className="mb-4">
        <p className="font-display text-cl-verde-escuro text-2xl leading-tight">
          Boa, fera!
        </p>
        <p className="text-sm text-cl-cinza-texto">
          Escolha um jogo aberto e mande seu palpite.
        </p>
      </div>

      {/* Jogos abertos */}
      {abertos.isLoading ? (
        <SkeletonCard />
      ) : !abertos.data || abertos.data.length === 0 ? (
        <SemJogoAberto />
      ) : (
        <JogosAbertos jogos={abertos.data} />
      )}

      <FaixaAzulejos className="my-6 opacity-90" />

      {/* Últimos resultados */}
      <section>
        <SectionTitle>Últimos resultados</SectionTitle>
        {resultados.isLoading ? (
          <SkeletonList />
        ) : (
          <ListaResultados jogos={resultados.data ?? []} />
        )}
      </section>
    </LayoutCliente>
  );
}

function ehHojeBrasilia(iso: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(iso)) === fmt.format(new Date());
}

function chaveDia(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function rotuloDia(iso: string): string {
  return format(new Date(iso), "EEEE, dd 'de' MMM", { locale: ptBR })
    .replace(/^./, (c) => c.toUpperCase());
}

const DIAS_INICIAIS = 3;

function JogosAbertos({ jogos }: { jogos: Jogo[] }) {
  const hoje = jogos.filter((j) => ehHojeBrasilia(j.data_hora_inicio));
  const futuros = jogos.filter((j) => !ehHojeBrasilia(j.data_hora_inicio));

  // agrupa futuros por dia
  const grupos = new Map<string, Jogo[]>();
  for (const j of futuros) {
    const k = chaveDia(j.data_hora_inicio);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(j);
  }
  const dias = Array.from(grupos.entries());

  const [verTodos, setVerTodos] = useState(false);
  const diasVisiveis = verTodos ? dias : dias.slice(0, DIAS_INICIAIS);
  const restantes = dias.length - diasVisiveis.length;

  return (
    <div className="space-y-6">
      {hoje.length > 0 && (
        <section>
          <SectionTitle>Hoje</SectionTitle>
          <div className="space-y-3">
            {hoje.map((j) => (
              <CardJogoAberto key={j.id} jogo={j} />
            ))}
          </div>
        </section>
      )}

      {dias.length > 0 && (
        <section>
          <SectionTitle>Próximos dias</SectionTitle>
          <div className="space-y-5">
            {diasVisiveis.map(([k, lista]) => (
              <div key={k}>
                <p className="font-display text-cl-verde-escuro text-sm mb-2">
                  {rotuloDia(lista[0].data_hora_inicio)}
                </p>
                <div className="space-y-3">
                  {lista.map((j) => (
                    <CardJogoAberto key={j.id} jogo={j} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {restantes > 0 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setVerTodos(true)}
                className="text-sm font-semibold text-cl-verde-escuro underline underline-offset-4 decoration-cl-laranja"
              >
                Ver mais {restantes} {restantes === 1 ? "dia" : "dias"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-cl-verde-escuro text-lg mb-2 flex items-center gap-2">
      <span className="block h-px flex-1 bg-cl-verde/30" aria-hidden />
      <span className="px-2">{children}</span>
      <span className="block h-px flex-1 bg-cl-verde/30" aria-hidden />
    </h2>
  );
}

function SemJogoAberto() {
  return (
    <section className="rounded-2xl bg-card border-2 border-dashed border-cl-verde/40 p-6 text-center">
      <img
        src="/assets/00-simbolo-copo-isolado.png"
        alt=""
        className="size-20 mx-auto opacity-80"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <p className="font-display text-cl-verde-escuro text-xl mt-3">
        Nenhum jogo aberto agora
      </p>
      <p className="text-sm text-cl-cinza-texto mt-1">
        Quando o próximo jogo abrir, ele aparece aqui na hora.
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

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-12 rounded-xl bg-card border border-border animate-pulse"
        />
      ))}
    </div>
  );
}
