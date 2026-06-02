import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Trophy, Users } from "lucide-react";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { Bandeira } from "@/components/jogos/Bandeira";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Jogo } from "@/lib/jogos";
import {
  formatarDataHoraBR,
  inicioFimDeHojeBrasilia,
  statusBadgeClass,
  STATUS_LABEL,
} from "@/lib/admin/jogo-helpers";

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
  const ativo = useQuery({
    queryKey: ["admin", "jogo-ativo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .eq("status", "ativo")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Jogo | null;
    },
    refetchInterval: 30_000,
  });

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        subtitulo="Visão rápida do bolão de hoje."
      />

      <div className="space-y-5">
        <CardJogoAtivo jogo={ativo.data ?? null} loading={ativo.isLoading} />
        <NumerosDoDia jogoAtivoId={ativo.data?.id ?? null} />
        <JogosDeHoje />
      </div>
    </>
  );
}

function CardJogoAtivo({
  jogo,
  loading,
}: {
  jogo: Jogo | null;
  loading: boolean;
}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(null);
    if (!jogo?.id) return;
    let cancelled = false;
    async function fetchCount() {
      const { count, error } = await supabase
        .from("palpites")
        .select("id", { count: "exact", head: true })
        .eq("jogo_id", jogo!.id);
      if (!cancelled && !error) setCount(count ?? 0);
    }
    fetchCount();
    const channel = supabase
      .channel(`palpites-jogo-${jogo.id}`)
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
  }, [jogo?.id]);

  if (loading) {
    return <div className="glass rounded-3xl p-6 h-44 animate-pulse" />;
  }

  if (!jogo) {
    return (
      <section className="glass rounded-3xl p-8 text-center">
        <Activity className="size-8 text-cl-cinza-texto mx-auto" />
        <p className="font-display text-xl text-cl-verde-escuro mt-2">
          Nenhum jogo ativo
        </p>
        <p className="text-sm text-cl-cinza-texto mt-1">
          Ative o bolão de um jogo na tela de Jogos.
        </p>
        <Button
          asChild
          className="mt-4 bg-cl-verde hover:bg-cl-verde-escuro text-white"
        >
          <Link to="/admin/jogos">
            Ir pra Jogos <ArrowRight className="size-4 ml-1" />
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="glass rounded-3xl overflow-hidden">
      <div className="bg-cl-verde text-white px-5 py-2.5 flex items-center justify-between">
        <span className="font-display text-sm tracking-wider uppercase">
          Jogo ativo agora
        </span>
        <Badge className="bg-cl-laranja text-cl-verde-escuro hover:bg-cl-laranja font-semibold animate-pulse">
          AO VIVO
        </Badge>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-center justify-center gap-4">
          <TimeBloco nome={jogo.time_a} codigo={jogo.codigo_a} />
          <div className="font-display text-2xl text-cl-cinza-texto">×</div>
          <TimeBloco nome={jogo.time_b} codigo={jogo.codigo_b} />
        </div>
        <p className="text-center text-sm text-cl-cinza-texto mt-3">
          {formatarDataHoraBR(jogo.data_hora_inicio)}
          {jogo.estadio ? ` • ${jogo.estadio}` : ""}
        </p>

        <div className="mt-5 rounded-2xl bg-white/70 border border-cl-verde/15 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-cl-cinza-texto">
              Palpites recebidos
            </p>
            <p className="font-display text-cl-verde-escuro text-4xl leading-none tabular-nums mt-1">
              {count ?? "—"}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-cl-verde/40 text-cl-verde-escuro hover:bg-cl-verde/10"
          >
            <Link to="/admin/jogo/$id" params={{ id: jogo.id }}>
              Abrir <ArrowRight className="size-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function TimeBloco({ nome, codigo }: { nome: string; codigo: string | null }) {
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <Bandeira codigo={codigo} tamanho={40} />
      </div>
      <div className="mt-1 text-xs font-semibold text-cl-verde-escuro uppercase tracking-wide">
        {codigo ?? ""}
      </div>
      <div className="text-[11px] text-cl-cinza-texto truncate max-w-[120px]">
        {nome}
      </div>
    </div>
  );
}

function NumerosDoDia({ jogoAtivoId }: { jogoAtivoId: string | null }) {
  void jogoAtivoId;
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
      <h2 className="font-display text-cl-verde-escuro text-xl mb-2">
        Jogos de hoje
      </h2>
      {q.isLoading ? (
        <div className="glass rounded-2xl h-24 animate-pulse" />
      ) : !q.data || q.data.length === 0 ? (
        <div className="glass rounded-2xl p-5 text-center text-sm text-cl-cinza-texto">
          Nenhum jogo hoje.
        </div>
      ) : (
        <ul className="glass rounded-2xl divide-y divide-cl-verde/10 overflow-hidden">
          {q.data.map((j) => (
            <li
              key={j.id}
              className="px-4 py-3 flex items-center gap-3"
            >
              <div className="text-xs text-cl-cinza-texto w-14 shrink-0 tabular-nums">
                {new Date(j.data_hora_inicio).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Sao_Paulo",
                })}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Bandeira codigo={j.codigo_a} tamanho={18} />
                <span className="text-sm text-cl-verde-escuro truncate">
                  {j.time_a}
                </span>
                <span className="text-cl-cinza-texto text-xs">x</span>
                <span className="text-sm text-cl-verde-escuro truncate">
                  {j.time_b}
                </span>
                <Bandeira codigo={j.codigo_b} tamanho={18} />
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${statusBadgeClass(j.status)}`}
              >
                {STATUS_LABEL[j.status]}
              </span>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-cl-verde-escuro"
              >
                <Link to="/admin/jogo/$id" params={{ id: j.id }}>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}