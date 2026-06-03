import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { CardJogoAdmin } from "@/components/admin/CardJogoAdmin";
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
  inicioFimDeHojeBrasilia,
  rotuloFase,
  STATUS_LABEL,
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

  const palpitesQ = useQuery({
    queryKey: ["admin", "jogos-palpites-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("palpites")
        .select("jogo_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { jogo_id: string }) => {
        map[r.jogo_id] = (map[r.jogo_id] ?? 0) + 1;
      });
      return map;
    },
  });

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

  const limparFiltros = () => {
    setBusca("");
    setFase("todas");
    setStatus("todos");
    setSoHoje(false);
  };

  const algumFiltro =
    busca.trim() !== "" || fase !== "todas" || status !== "todos" || soHoje;

  return (
    <>
      <PageHeader
        titulo="Jogos"
        subtitulo={`${filtrados.length} de ${q.data?.length ?? 0} jogos da Copa do Mundo FIFA 2026.`}
      />

      <div className="glass rounded-2xl p-3 mb-4 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cl-cinza-texto" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por time ou sigla…"
            className="pl-9 bg-white h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={fase} onValueChange={setFase}>
            <SelectTrigger className="bg-white h-11">
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
            <SelectTrigger className="bg-white h-11">
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
        </div>
        <div className="flex gap-2">
          <Button
            variant={soHoje ? "default" : "outline"}
            onClick={() => setSoHoje((v) => !v)}
            className={
              soHoje
                ? "bg-cl-verde hover:bg-cl-verde-escuro text-white h-10 flex-1"
                : "border-cl-verde/40 text-cl-verde-escuro hover:bg-cl-verde/10 h-10 flex-1"
            }
          >
            Só hoje
          </Button>
          {algumFiltro && (
            <Button
              variant="ghost"
              onClick={limparFiltros}
              className="text-cl-cinza-texto hover:text-cl-verde-escuro h-10"
            >
              <X className="size-4 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-3xl h-[78px] animate-pulse" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-cl-cinza-texto text-sm">
          Nenhum jogo encontrado com esses filtros.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtrados.map((j) => (
            <CardJogoAdmin
              key={j.id}
              jogo={j}
              palpites={palpitesQ.data?.[j.id] ?? 0}
              mostrarPalpites
            />
          ))}
        </div>
      )}
    </>
  );
}