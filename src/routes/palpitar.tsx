import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, MapPin, Loader2 } from "lucide-react";

import { LayoutCliente } from "@/components/site/LayoutCliente";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/store/cliente";
import { type Jogo } from "@/lib/jogos";
import { Bandeira } from "@/components/jogos/Bandeira";

const COLUNAS =
  "id,numero_jogo,fase,grupo,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil";

export const Route = createFileRoute("/palpitar")({
  component: PalpitarPage,
});

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; latitude: number; longitude: number }
  | { status: "error"; mensagem: string };

function PalpitarPage() {
  const navigate = useNavigate();
  const cliente_id = useCliente((s) => s.cliente_id);
  const nome = useCliente((s) => s.nome);
  const setUltimoPalpite = useCliente((s) => s.setUltimoPalpite);

  const jogoAtivo = useQuery({
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

  // redireciona pro cadastro se não tem cliente
  useEffect(() => {
    if (!cliente_id) {
      navigate({
        to: "/cadastro",
        search: { next: "/palpitar" },
        replace: true,
      });
    }
  }, [cliente_id, navigate]);

  const [placarA, setPlacarA] = useState(0);
  const [placarB, setPlacarB] = useState(0);
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [enviando, setEnviando] = useState(false);

  function pedirGeo() {
    if (!("geolocation" in navigator)) {
      setGeo({
        status: "error",
        mensagem:
          "Seu navegador não suporta localização. Tente abrir o link em outro navegador.",
      });
      return;
    }
    setGeo({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          status: "ok",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () =>
        setGeo({
          status: "error",
          mensagem:
            "Precisamos da sua localização pra confirmar que você está no Caju Limão. Ative a localização no navegador e tente de novo.",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    if (cliente_id && geo.status === "idle" && jogoAtivo.data) {
      pedirGeo();
    }
  }, [cliente_id, geo.status, jogoAtivo.data]);

  async function confirmar() {
    if (!jogoAtivo.data || !cliente_id || geo.status !== "ok" || enviando) return;
    setEnviando(true);
    try {
      const { error } = await supabase.from("palpites").insert({
        jogo_id: jogoAtivo.data.id,
        cliente_id,
        placar_a: placarA,
        placar_b: placarB,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });
      if (error) {
        const code = (error as { code?: string }).code ?? "";
        const m = (error.message || "").toLowerCase();
        if (code === "23505" || m.includes("duplicate")) {
          toast.error("Você já palpitou neste jogo.");
        } else if (m.includes("metros")) {
          toast.error("Você precisa estar no Caju Limão pra palpitar.");
        } else if (m.includes("encerrados")) {
          toast.error("Os palpites deste jogo já fecharam.");
        } else if (m.includes("ativo")) {
          toast.error("Os palpites deste jogo ainda não abriram.");
        } else if (m.includes("maioridade")) {
          toast.error("É preciso confirmar que você tem 18 anos ou mais.");
        } else {
          toast.error("Não consegui registrar agora. Tente de novo em instantes.");
        }
        return;
      }
      setUltimoPalpite({
        jogo_id: jogoAtivo.data.id,
        time_a: jogoAtivo.data.time_a,
        time_b: jogoAtivo.data.time_b,
        placar_a: placarA,
        placar_b: placarB,
      });
      navigate({ to: "/confirmacao" });
    } finally {
      setEnviando(false);
    }
  }

  if (jogoAtivo.isLoading || !cliente_id) {
    return (
      <LayoutCliente>
        <div className="py-16 text-center text-cl-cinza-texto flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-cl-verde" />
          Carregando…
        </div>
      </LayoutCliente>
    );
  }

  if (!jogoAtivo.data) {
    return (
      <LayoutCliente>
        <div className="rounded-2xl bg-card border-2 border-dashed border-cl-verde/40 p-8 text-center">
          <p className="font-display text-xl text-cl-verde-escuro">
            Nenhum jogo aberto agora
          </p>
          <p className="text-sm text-cl-cinza-texto mt-2">
            Quando o próximo bolão abrir, ele aparece aqui na hora.
          </p>
          <Button
            asChild
            className="mt-4 bg-cl-verde hover:bg-cl-verde-escuro text-white"
          >
            <Link to="/">Voltar pro início</Link>
          </Button>
        </div>
      </LayoutCliente>
    );
  }

  const jogo = jogoAtivo.data;

  return (
    <LayoutCliente>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-cl-cinza-texto uppercase tracking-wide">
            Olá,
          </p>
          <p className="font-display text-cl-verde-escuro text-xl leading-tight">
            {nome}
          </p>
        </div>
        <img
          src="/assets/09-selo-laranja.png"
          alt="É a hora!"
          className="size-20 -mt-2 -mr-1"
        />
      </div>

      <p className="font-display text-cl-laranja text-2xl mb-4">É a hora!</p>

      {geo.status !== "ok" && (
        <GeoBloco geo={geo} onTentar={pedirGeo} />
      )}

      <section className="rounded-2xl bg-card border-2 border-cl-verde shadow-sm overflow-hidden mb-4">
        <div className="bg-cl-verde text-white px-4 py-2 text-center">
          <p className="font-display uppercase tracking-wide text-sm">
            Qual o placar?
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-4 py-5">
          <BlocoPlacar
            nome={jogo.time_a}
            codigo={jogo.codigo_a}
            valor={placarA}
            onChange={setPlacarA}
            disabled={geo.status !== "ok"}
          />
          <div className="font-display text-3xl text-cl-cinza-texto px-1">×</div>
          <BlocoPlacar
            nome={jogo.time_b}
            codigo={jogo.codigo_b}
            valor={placarB}
            onChange={setPlacarB}
            disabled={geo.status !== "ok"}
          />
        </div>

        {jogo.premio_descricao && (
          <div className="mx-4 mb-4 rounded-xl bg-cl-laranja/15 border border-cl-laranja/40 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-cl-laranja font-semibold">
              Prêmio
            </p>
            <p className="text-sm text-cl-verde-escuro font-medium">
              {jogo.premio_descricao}
            </p>
          </div>
        )}
      </section>

      <div className="sticky bottom-3 pt-2">
        <Button
          onClick={confirmar}
          disabled={geo.status !== "ok" || enviando}
          className="w-full h-14 text-base font-semibold bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl shadow-md"
        >
          {enviando ? "Registrando…" : "Confirmar palpite"}
        </Button>
      </div>
    </LayoutCliente>
  );
}

function BlocoPlacar({
  nome,
  codigo,
  valor,
  onChange,
  disabled,
}: {
  nome: string;
  codigo: string | null;
  valor: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const set = (v: number) => onChange(Math.max(0, Math.min(20, v)));
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <Bandeira codigo={codigo} tamanho={32} />
      </div>
      <div className="mt-1 text-xs font-semibold text-cl-verde-escuro uppercase">
        {codigo ?? ""}
      </div>
      <div className="text-[11px] text-cl-cinza-texto truncate">{nome}</div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir ${nome}`}
          onClick={() => set(valor - 1)}
          disabled={disabled || valor <= 0}
          className="size-10 rounded-full bg-cl-verde-claro/70 text-cl-verde-escuro flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
        >
          <Minus className="size-5" />
        </button>
        <div
          className="w-14 h-14 rounded-xl bg-cl-verde-escuro text-white font-display text-3xl flex items-center justify-center tabular-nums"
          aria-live="polite"
        >
          {valor}
        </div>
        <button
          type="button"
          aria-label={`Aumentar ${nome}`}
          onClick={() => set(valor + 1)}
          disabled={disabled || valor >= 20}
          className="size-10 rounded-full bg-cl-verde-claro/70 text-cl-verde-escuro flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

function GeoBloco({
  geo,
  onTentar,
}: {
  geo: GeoState;
  onTentar: () => void;
}) {
  return (
    <div className="rounded-xl border border-cl-laranja/50 bg-cl-laranja/10 p-3 mb-4 flex items-start gap-3">
      <MapPin className="size-5 text-cl-laranja mt-0.5 shrink-0" />
      <div className="flex-1">
        {geo.status === "loading" ? (
          <p className="text-sm text-cl-verde-escuro flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Confirmando sua localização…
          </p>
        ) : geo.status === "error" ? (
          <>
            <p className="text-sm text-cl-verde-escuro">{geo.mensagem}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onTentar}
              className="mt-2 border-cl-laranja text-cl-verde-escuro hover:bg-cl-laranja/20"
            >
              Tentar de novo
            </Button>
          </>
        ) : (
          <p className="text-sm text-cl-verde-escuro">
            Precisamos da sua localização pra confirmar que você está no Caju Limão.
          </p>
        )}
      </div>
    </div>
  );
}