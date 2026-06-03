import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users } from "lucide-react";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { CardJogoAdmin } from "@/components/admin/CardJogoAdmin";
import { supabase } from "@/integrations/supabase/client";
import type { Jogo } from "@/lib/jogos";
import { inicioFimDeHojeBrasilia } from "@/lib/admin/jogo-helpers";

export const Route = createFileRoute("/admin/")({
  component: () => (
    <AdminShell>
      <DashboardPage />
    </AdminShell>
  ),
});

const COLUNAS =
  "id,numero_jogo,fase,grupo,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil";

function DashboardPage() {
  return (
    <>
      <PageHeader
        titulo="Dashboard"
        subtitulo="Visão rápida dos jogos de hoje e abertos."
      />

      <div className="space-y-5">
        <NumerosDoDia />
        <JogosAbertosAgora />
        <JogosDeHoje />
      </div>
    </>
  );
}

function NumerosDoDia() {
  const { inicio, fim } = inicioFimDeHojeBrasilia();

  const palpitesHoje = useQuery({
    queryKey: ["admin", "palpites-hoje", inicio],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("palpites")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicio)
        .lte("created_at", fim);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  const clientesHoje = useQuery({
    queryKey: ["admin", "clientes-hoje", inicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("palpites")
        .select("cliente_id")
        .gte("created_at", inicio)
        .lte("created_at", fim);
      if (error) throw error;
      const unicos = new Set((data ?? []).map((r: { cliente_id: string }) => r.cliente_id));
      return unicos.size;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="grid grid-cols-2 gap-3">
      <CardNumero
        icon={<Trophy className="size-5" />}
        rotulo="Palpites hoje"
        valor={palpitesHoje.data ?? "—"}
      />
      <CardNumero
        icon={<Users className="size-5" />}
        rotulo="Clientes únicos hoje"
        valor={clientesHoje.data ?? "—"}
      />
    </div>
  );
}

function CardNumero({
  icon,
  rotulo,
  valor,
}: {
  icon: React.ReactNode;
  rotulo: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-cl-verde">
        {icon}
        <span className="text-[11px] uppercase tracking-wider text-cl-cinza-texto">
          {rotulo}
        </span>
      </div>
      <p className="font-display text-cl-verde-escuro text-3xl mt-1 tabular-nums">
        {valor}
      </p>
    </div>
  );
}

function JogosDeHoje() {
  const { inicio, fim } = inicioFimDeHojeBrasilia();
  const q = useQuery({
    queryKey: ["admin", "jogos-hoje", inicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .gte("data_hora_inicio", inicio)
        .lte("data_hora_inicio", fim)
        .order("data_hora_inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Jogo[];
    },
    refetchInterval: 60_000,
  });

  return (
    <section>
      <h2 className="secao-titulo mb-3">Jogos de hoje</h2>
      {q.isLoading ? (
        <div className="glass rounded-2xl h-24 animate-pulse" />
      ) : !q.data || q.data.length === 0 ? (
        <div className="glass rounded-2xl p-5 text-center text-sm text-cl-cinza-texto">
          Nenhum jogo hoje.
        </div>
      ) : (
        <ListaJogosAdmin jogos={q.data} mostrarPalpites={false} />
      )}
    </section>
  );
}

function JogosAbertosAgora() {
  const q = useQuery({
    queryKey: ["admin", "jogos-abertos"],
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

  return (
    <section>
      <h2 className="secao-titulo mb-3">Jogos abertos agora</h2>
      {q.isLoading ? (
        <div className="glass rounded-2xl h-20 animate-pulse" />
      ) : !q.data || q.data.length === 0 ? (
        <div className="glass rounded-2xl p-5 text-center text-sm text-cl-cinza-texto">
          Nenhum jogo aberto no momento.
        </div>
      ) : (
        <ListaJogosAdmin jogos={q.data} mostrarPalpites />
      )}
    </section>
  );
}

function ListaJogosAdmin({
  jogos,
  mostrarPalpites,
}: {
  jogos: Jogo[];
  mostrarPalpites: boolean;
}) {
  return (
    <ul className="space-y-2.5">
      {jogos.map((j) => (
        <li key={j.id}>
          <ItemJogoAdmin jogo={j} mostrarPalpites={mostrarPalpites} />
        </li>
      ))}
    </ul>
  );
}

function ItemJogoAdmin({
  jogo,
  mostrarPalpites,
}: {
  jogo: Jogo;
  mostrarPalpites: boolean;
}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!mostrarPalpites) return;
    let cancelled = false;
    async function fetchCount() {
      const { count, error } = await supabase
        .from("palpites")
        .select("id", { count: "exact", head: true })
        .eq("jogo_id", jogo.id);
      if (!cancelled && !error) setCount(count ?? 0);
    }
    fetchCount();
    const channel = supabase
      .channel(`dash-palpites-${jogo.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "palpites",
          filter: `jogo_id=eq.${jogo.id}`,
        },
        () => setCount((c) => (c ?? 0) + 1),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [jogo.id, mostrarPalpites]);

  return (
    <CardJogoAdmin
      jogo={jogo}
      mostrarPalpites={mostrarPalpites}
      palpites={count}
    />
  );
}