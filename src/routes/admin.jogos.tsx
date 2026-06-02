import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { Bandeira } from "@/components/jogos/Bandeira";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Jogo, StatusJogo } from "@/lib/jogos";
import {
  formatarDataHoraBR,
  inicioFimDeHojeBrasilia,
  rotuloFase,
  STATUS_LABEL,
  statusBadgeClass,
} from "@/lib/admin/jogo-helpers";

export const Route = createFileRoute("/admin/jogos")({
  component: () => (
    <AdminShell>
      <ListaJogosPage />
    </AdminShell>
  ),
});

const COLUNAS =
  "id,numero_jogo,fase,grupo,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil";

function ListaJogosPage() {
  const [busca, setBusca] = useState("");
  const [fase, setFase] = useState<string>("todas");
  const [status, setStatus] = useState<string>("todos");
  const [soHoje, setSoHoje] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "jogos-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .order("data_hora_inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Jogo[];
    },
  });

  const fases = useMemo(() => {
    const s = new Set<string>();
    (q.data ?? []).forEach((j) => j.fase && s.add(j.fase));
    return Array.from(s);
  }, [q.data]);

  const filtrados = useMemo(() => {
    let arr = q.data ?? [];
    if (fase !== "todas") arr = arr.filter((j) => j.fase === fase);
    if (status !== "todos") arr = arr.filter((j) => j.status === (status as StatusJogo));
    if (soHoje) {
      const { inicio, fim } = inicioFimDeHojeBrasilia();
      arr = arr.filter(
        (j) => j.data_hora_inicio >= inicio && j.data_hora_inicio <= fim,
      );
    }
    if (busca.trim()) {
      const b = busca.trim().toLowerCase();
      arr = arr.filter(
        (j) =>
          j.time_a.toLowerCase().includes(b) ||
          j.time_b.toLowerCase().includes(b) ||
          (j.codigo_a ?? "").toLowerCase().includes(b) ||
          (j.codigo_b ?? "").toLowerCase().includes(b),
      );
    }
    return arr;
  }, [q.data, fase, status, busca, soHoje]);

  return (
    <>
      <PageHeader titulo="Jogos" subtitulo="Os 104 jogos da Copa do Mundo FIFA 2026." />

      <div className="glass rounded-2xl p-3 mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto] items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cl-cinza-texto" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar time…"
            className="pl-9 bg-white h-10"
          />
        </div>
        <Select value={fase} onValueChange={setFase}>
          <SelectTrigger className="bg-white h-10 min-w-[140px]">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as fases</SelectItem>
            {fases.map((f) => (
              <SelectItem key={f} value={f}>
                {rotuloFase(f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-white h-10 min-w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as StatusJogo[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={soHoje ? "default" : "outline"}
          onClick={() => setSoHoje((v) => !v)}
          className={
            soHoje
              ? "bg-cl-verde hover:bg-cl-verde-escuro text-white h-10"
              : "border-cl-verde/40 text-cl-verde-escuro hover:bg-cl-verde/10 h-10"
          }
        >
          Hoje
        </Button>
      </div>

      {q.isLoading ? (
        <div className="glass rounded-2xl h-64 animate-pulse" />
      ) : filtrados.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-cl-cinza-texto text-sm">
          Nenhum jogo encontrado com esses filtros.
        </div>
      ) : (
        <ul className="glass rounded-2xl divide-y divide-cl-verde/10 overflow-hidden">
          {filtrados.map((j) => (
            <li
              key={j.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-cl-verde/5 transition-colors"
            >
              <div className="w-10 text-center font-display text-cl-cinza-texto text-sm tabular-nums shrink-0">
                #{j.numero_jogo}
              </div>
              <div className="hidden md:block w-40 text-xs text-cl-cinza-texto shrink-0">
                {formatarDataHoraBR(j.data_hora_inicio)}
              </div>
              <div className="md:hidden w-20 text-[11px] text-cl-cinza-texto shrink-0">
                {new Date(j.data_hora_inicio).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Sao_Paulo",
                })}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Bandeira codigo={j.codigo_a} tamanho={18} />
                <span className="text-sm text-cl-verde-escuro truncate">
                  {j.codigo_a ?? j.time_a}
                </span>
                <span className="text-cl-cinza-texto text-xs">x</span>
                <span className="text-sm text-cl-verde-escuro truncate">
                  {j.codigo_b ?? j.time_b}
                </span>
                <Bandeira codigo={j.codigo_b} tamanho={18} />
              </div>
              <div className="hidden sm:block text-xs text-cl-cinza-texto w-28 shrink-0 truncate">
                {rotuloFase(j.fase)}
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 shrink-0 ${statusBadgeClass(j.status)}`}
              >
                {STATUS_LABEL[j.status]}
              </span>
              {j.placar_a !== null && j.placar_b !== null ? (
                <div className="font-display text-cl-verde-escuro text-sm tabular-nums w-12 text-center shrink-0">
                  {j.placar_a}–{j.placar_b}
                </div>
              ) : (
                <div className="w-12 text-center text-cl-cinza-texto text-xs shrink-0">
                  –
                </div>
              )}
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-cl-verde-escuro shrink-0"
              >
                <Link to="/admin/jogo/$id" params={{ id: j.id }}>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}