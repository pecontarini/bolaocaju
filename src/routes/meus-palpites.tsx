import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Trophy, Beer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { LayoutCliente } from "@/components/site/LayoutCliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bandeira } from "@/components/jogos/Bandeira";
import { useCliente } from "@/store/cliente";
import { supabase } from "@/integrations/supabase/client";
import {
  mascararTelefone,
  normalizarTelefoneBR,
  REGEX_E164_BR,
} from "@/lib/telefone";

export const Route = createFileRoute("/meus-palpites")({
  component: MeusPalpitesPage,
});

type Palpite = {
  numero_jogo: number;
  fase: string | null;
  time_a: string;
  codigo_a: string | null;
  time_b: string;
  codigo_b: string | null;
  data_hora_inicio: string;
  meu_placar_a: number;
  meu_placar_b: number;
  placar_real_a: number | null;
  placar_real_b: number | null;
  comanda: number;
  jogo_status: string;
  acertou: boolean | null;
  premio_descricao: string | null;
  palpite_em: string;
};

function MeusPalpitesPage() {
  const telefoneStore = useCliente((s) => s.telefone);
  const [telefoneBusca, setTelefoneBusca] = useState<string | null>(
    telefoneStore,
  );
  const [inputTel, setInputTel] = useState("");

  useEffect(() => {
    if (telefoneStore) setTelefoneBusca(telefoneStore);
  }, [telefoneStore]);

  const query = useQuery({
    queryKey: ["meus-palpites", telefoneBusca],
    enabled: !!telefoneBusca,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_meus_palpites", {
        p_telefone: telefoneBusca!,
      });
      if (error) throw error;
      return (data ?? []) as Palpite[];
    },
  });

  useEffect(() => {
    if (query.error) {
      toast.error("Não consegui buscar seus palpites. Tente de novo.");
    }
  }, [query.error]);

  function onBuscar(e: React.FormEvent) {
    e.preventDefault();
    const tel = normalizarTelefoneBR(inputTel);
    if (!REGEX_E164_BR.test(tel)) {
      toast.error("Confira o número de telefone com DDD.");
      return;
    }
    setTelefoneBusca(tel);
  }

  return (
    <LayoutCliente>
      <div className="mb-5">
        <h1 className="font-display text-2xl text-cl-verde-escuro">
          Meus palpites
        </h1>
        <p className="text-sm text-cl-cinza-texto mt-1">
          Seu histórico de palpites no Bolão Caju Limão.
        </p>
      </div>

      {!telefoneBusca && (
        <form onSubmit={onBuscar} className="glass rounded-2xl p-4 space-y-3">
          <label className="text-sm font-medium text-cl-verde-escuro">
            Seu telefone
          </label>
          <Input
            value={mascararTelefone(inputTel)}
            onChange={(e) => setInputTel(mascararTelefone(e.target.value))}
            placeholder="(61) 99999-9999"
            inputMode="tel"
            autoComplete="tel-national"
            className="h-12 text-base"
          />
          <Button
            type="submit"
            className="w-full h-12 bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl"
          >
            Ver meus palpites
          </Button>
        </form>
      )}

      {telefoneBusca && query.isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {telefoneBusca && !query.isLoading && (query.data?.length ?? 0) === 0 && (
        <div className="text-center py-10 glass rounded-2xl px-5">
          <p className="font-display text-xl text-cl-verde-escuro">
            Você ainda não tem palpites
          </p>
          <p className="text-sm text-cl-cinza-texto mt-2">
            Bora colocar fé e arriscar um placar?
          </p>
          <Button
            asChild
            className="mt-5 h-12 px-6 bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl"
          >
            <Link to="/">Fazer um palpite</Link>
          </Button>
        </div>
      )}

      {telefoneBusca && (query.data?.length ?? 0) > 0 && (
        <ul className="space-y-3">
          {query.data!.map((p, idx) => (
            <CardPalpite key={`${p.numero_jogo}-${idx}`} p={p} />
          ))}
        </ul>
      )}
    </LayoutCliente>
  );
}

function CardPalpite({ p }: { p: Palpite }) {
  const apurado = p.placar_real_a != null && p.placar_real_b != null;
  const dataFmt = format(
    new Date(p.data_hora_inicio),
    "EEE, dd 'de' MMM • HH'h'mm",
    { locale: ptBR },
  );

  return (
    <li className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-cl-cinza-texto">
          {p.fase ?? `Jogo ${p.numero_jogo}`}
        </p>
        <span className="text-[11px] text-cl-cinza-texto">{dataFmt}</span>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bandeira codigo={p.codigo_a} tamanho={24} />
          <span className="font-display text-cl-verde-escuro truncate">
            {p.time_a}
          </span>
        </div>
        <span className="text-cl-cinza-texto text-xs px-2">×</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-display text-cl-verde-escuro truncate text-right">
            {p.time_b}
          </span>
          <Bandeira codigo={p.codigo_b} tamanho={24} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
            Seu palpite
          </p>
          <span className="placar-chip text-2xl mt-1 inline-flex">
            <span>{p.meu_placar_a}</span>
            <span className="x">×</span>
            <span>{p.meu_placar_b}</span>
          </span>
        </div>
        {apurado && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
              Resultado
            </p>
            <span className="placar-chip text-2xl mt-1 inline-flex">
              <span>{p.placar_real_a}</span>
              <span className="x">×</span>
              <span>{p.placar_real_b}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-2 rounded-full bg-cl-laranja/20 border border-cl-laranja/40 px-3 py-1">
          <span className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
            Comanda
          </span>
          <span className="font-display text-cl-verde-escuro text-sm tabular">
            #{p.comanda}
          </span>
        </span>
        <StatusBadge apurado={apurado} acertou={p.acertou} />
      </div>
    </li>
  );
}

function StatusBadge({
  apurado,
  acertou,
}: {
  apurado: boolean;
  acertou: boolean | null;
}) {
  if (!apurado) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-xs font-medium">
        <Clock className="size-3.5" />
        Aguardando resultado
      </span>
    );
  }
  if (acertou) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cl-verde text-white border border-cl-verde-escuro px-3 py-1 text-xs font-semibold">
        <Trophy className="size-3.5" />
        Você acertou!
        <Beer className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-cl-cinza-texto border border-border px-3 py-1 text-xs">
      Não foi dessa vez
    </span>
  );
}