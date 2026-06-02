import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutCliente } from "@/components/site/LayoutCliente";
import { CardJogoMomento } from "@/components/jogos/CardJogoMomento";
import {
  ListaProximos,
  ListaResultados,
} from "@/components/jogos/ListaJogos";
import { FaixaAzulejos } from "@/components/site/FaixaAzulejos";
import type { Jogo } from "@/lib/jogos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolão Caju Limão — Palpite no jogo do momento" },
      {
        name: "description",
        content:
          "Palpite no placar exato do jogo do momento da Copa 2026 direto do Boteco Caju Limão.",
      },
    ],
  }),
  component: HomeCliente,
});

const COLUNAS =
  "id,numero_jogo,fase,grupo,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil";

function HomeCliente() {
  const ativo = useQuery({
    queryKey: ["jogo-ativo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .eq("status", "ativo")
        .order("data_hora_inicio", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Jogo | null;
    },
    refetchInterval: 30_000,
  });

  const proximos = useQuery({
    queryKey: ["proximos-jogos"],
    queryFn: async () => {
      const agora = new Date().toISOString();
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .in("status", ["agendado", "habilitado"])
        .gte("data_hora_inicio", agora)
        .order("data_hora_inicio", { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Jogo[];
    },
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

  return (
    <LayoutCliente>
      <h1 className="sr-only">Bolão Caju Limão</h1>

      {/* Saudação enxuta */}
      <div className="mb-4">
        <p className="font-display text-cl-verde-escuro text-2xl leading-tight">
          Boa, fera!
        </p>
        <p className="text-sm text-cl-cinza-texto">
          Bem-vindo ao bolão da Copa do Mundo FIFA 2026.
        </p>
      </div>

      {/* Jogo do momento */}
      {ativo.isLoading ? (
        <SkeletonCard />
      ) : ativo.data ? (
        <CardJogoMomento jogo={ativo.data} />
      ) : (
        <SemJogoAtivo />
      )}

      <FaixaAzulejos className="my-6 opacity-90" />

      {/* Próximos jogos */}
      <section className="mb-6">
        <SectionTitle>Próximos jogos</SectionTitle>
        {proximos.isLoading ? (
          <SkeletonList />
        ) : (
          <ListaProximos jogos={proximos.data ?? []} />
        )}
      </section>

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-cl-verde-escuro text-lg mb-2 flex items-center gap-2">
      <span className="block h-px flex-1 bg-cl-verde/30" aria-hidden />
      <span className="px-2">{children}</span>
      <span className="block h-px flex-1 bg-cl-verde/30" aria-hidden />
    </h2>
  );
}

function SemJogoAtivo() {
  return (
    <section className="rounded-2xl bg-card border-2 border-dashed border-cl-verde/40 p-6 text-center">
      <img
        src="/assets/08-selo-circular-verde.png"
        alt=""
        className="size-16 mx-auto opacity-60"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <p className="font-display text-cl-verde-escuro text-xl mt-3">
        Nenhum jogo aberto agora
      </p>
      <p className="text-sm text-cl-cinza-texto mt-1">
        Quando o próximo bolão abrir, ele aparece aqui na hora.
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
