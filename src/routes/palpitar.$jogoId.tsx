import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, MapPin, Loader2, Receipt, Info, ArrowLeft } from "lucide-react";

import { LayoutCliente } from "@/components/site/LayoutCliente";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/store/cliente";
import { type Jogo } from "@/lib/jogos";
import { Bandeira } from "@/components/jogos/Bandeira";
import { useJogosRealtime } from "@/hooks/useJogosRealtime";
import { useMarcaAtual } from "@/lib/marca";

const COLUNAS =
  "id,numero_jogo,fase,grupo,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil";

export const Route = createFileRoute("/palpitar/$jogoId")({
  component: PalpitarJogoPage,
});

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; latitude: number; longitude: number }
  | { status: "error"; mensagem: string };

function PalpitarJogoPage() {
  useJogosRealtime();
  const { jogoId } = Route.useParams();
  const navigate = useNavigate();
  const { marca } = useMarcaAtual();
  const cliente_id = useCliente((s) => s.cliente_id);
  const nome = useCliente((s) => s.nome);
  const setUltimoPalpite = useCliente((s) => s.setUltimoPalpite);
  const garantirMarca = useCliente((s) => s.garantirMarca);

  // Se trocou de marca, limpa a sessão do cliente para forçar novo cadastro.
  useEffect(() => {
    if (marca?.id) garantirMarca(marca.id);
  }, [marca?.id, garantirMarca]);

  const jogoQ = useQuery({
    queryKey: ["jogo-palpite", jogoId, marca?.id],
    enabled: !!marca?.id,
    queryFn: async () => {
      // Busca o jogo no calendário global + o estado da marca atual (marca_jogos).
      const { data, error } = await supabase
        .from("marca_jogos")
        .select(
          "status, palpites_encerrados, premio_descricao, premio_imagem_url, jogos!inner(*)",
        )
        .eq("marca_id", marca!.id)
        .eq("jogo_id", jogoId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      type Row = {
        status: string;
        palpites_encerrados: boolean | null;
        premio_descricao: string | null;
        premio_imagem_url: string | null;
        jogos: Jogo;
      };
      const row = data as unknown as Row;
      // Sobrescreve campos por-marca na view do jogo.
      return {
        ...row.jogos,
        status: row.status as Jogo["status"],
        palpites_encerrados: row.palpites_encerrados,
        premio_descricao: row.premio_descricao ?? row.jogos.premio_descricao,
        premio_imagem_url: row.premio_imagem_url ?? row.jogos.premio_imagem_url,
      } as Jogo;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!cliente_id) {
      navigate({
        to: "/cadastro",
        search: { next: `/palpitar/${jogoId}` },
        replace: true,
      });
    }
  }, [cliente_id, navigate, jogoId]);

  const [placarA, setPlacarA] = useState(0);
  const [placarB, setPlacarB] = useState(0);
  const [comandaStr, setComandaStr] = useState("");
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [enviando, setEnviando] = useState(false);

  const comandaNum = Number(comandaStr);
  const comandaValida =
    comandaStr !== "" &&
    Number.isInteger(comandaNum) &&
    comandaNum >= 1 &&
    comandaNum <= 9999;

  const jogo = jogoQ.data;
  const jogoAberto =
    (jogo?.status === "ativo" || jogo?.status === "habilitado") &&
    !jogo?.palpites_encerrados;

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
            "Precisamos da sua localização pra confirmar que você está numa unidade da marca. Ative a localização no navegador e tente de novo.",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    if (cliente_id && geo.status === "idle" && jogoAberto) {
      pedirGeo();
    }
  }, [cliente_id, geo.status, jogoAberto]);

  async function confirmar() {
    if (!jogo || !cliente_id || !marca || geo.status !== "ok" || enviando)
      return;
    if (!comandaValida) {
      toast.error("Informe o número da comanda (1 a 9999).");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.from("palpites").insert({
        marca_id: marca.id,
        jogo_id: jogo.id,
        cliente_id,
        placar_a: placarA,
        placar_b: placarB,
        comanda: comandaNum,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });
      if (error) {
        const code = (error as { code?: string }).code ?? "";
        const m = (error.message || "").toLowerCase();
        if (code === "23505" || m.includes("duplicate")) {
          toast.error("Você já palpitou neste jogo.");
        } else if (m.includes("metros")) {
          toast.error("Você precisa estar numa unidade da marca pra palpitar.");
        } else if (m.includes("encerrados")) {
          toast.error("Os palpites deste jogo já fecharam.");
        } else if (m.includes("ativo")) {
          toast.error("Os palpites deste jogo ainda não abriram.");
        } else if (m.includes("maioridade")) {
          toast.error("É preciso confirmar que você tem 18 anos ou mais.");
        } else if (m.includes("comanda")) {
          toast.error("Número de comanda inválido.");
        } else {
          toast.error("Não consegui registrar agora. Tente de novo em instantes.");
        }
        return;
      }
      setUltimoPalpite({
        jogo_id: jogo.id,
        time_a: jogo.time_a,
        time_b: jogo.time_b,
        placar_a: placarA,
        placar_b: placarB,
        comanda: comandaNum,
      });
      navigate({ to: "/confirmacao" });
    } finally {
      setEnviando(false);
    }
  }

  if (jogoQ.isLoading || !cliente_id) {
    return (
      <LayoutCliente>
        <div className="py-16 text-center text-cl-cinza-texto flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-cl-verde" />
          Carregando…
        </div>
      </LayoutCliente>
    );
  }

  if (!jogo) {
    return (
      <LayoutCliente>
        <div className="rounded-2xl bg-card border-2 border-dashed border-cl-verde/40 p-8 text-center">
          <p className="font-display text-xl text-cl-verde-escuro">
            Jogo não encontrado
          </p>
          <Button asChild className="mt-4 bg-cl-verde hover:bg-cl-verde-escuro text-white">
            <Link to="/">Voltar pro início</Link>
          </Button>
        </div>
      </LayoutCliente>
    );
  }

  if (!jogoAberto) {
    return (
      <LayoutCliente>
        <div className="rounded-2xl bg-card border-2 border-dashed border-cl-verde/40 p-8 text-center">
          <p className="font-display text-xl text-cl-verde-escuro">
            Este jogo não está aberto para palpites
          </p>
          <p className="text-sm text-cl-cinza-texto mt-2">
            {jogo.time_a} × {jogo.time_b}
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

  return (
    <LayoutCliente>
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-cl-verde-escuro mb-3"
      >
        <ArrowLeft className="size-4" /> Jogos abertos
      </Link>

      <div className="mb-2">
        <div>
          <p className="text-xs text-cl-cinza-texto uppercase tracking-wide">
            Olá,
          </p>
          <p className="font-display text-cl-verde-escuro text-2xl leading-tight truncate max-w-[220px]">
            {nome}
          </p>
        </div>
      </div>

      <p className="font-display text-cl-laranja text-xl sm:text-2xl mb-4">É a hora!</p>

      {geo.status !== "ok" && <GeoBloco geo={geo} onTentar={pedirGeo} />}

      <section className="rounded-2xl bg-card border-2 border-cl-verde shadow-sm overflow-hidden mb-4">
        <div className="bg-cl-verde text-white px-4 py-2 text-center">
          <p className="font-display text-base leading-none">
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
          <div className="text-2xl text-cl-cinza-texto px-1">×</div>
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

      <section className="rounded-2xl bg-card border-2 border-cl-verde shadow-sm p-4 mb-4">
        <label
          htmlFor="comanda"
          className="flex items-center gap-2 font-display text-cl-verde-escuro text-lg"
        >
          <Receipt className="size-5 text-cl-laranja" />
          Número da comanda
        </label>
        <p className="text-xs text-cl-cinza-texto mt-1">
          O número impresso na sua comanda do bar.
        </p>
        <input
          id="comanda"
          type="number"
          inputMode="numeric"
          min={1}
          max={9999}
          step={1}
          value={comandaStr}
          onChange={(e) =>
            setComandaStr(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          placeholder="Ex.: 27"
          disabled={geo.status !== "ok"}
          className="mt-3 w-full h-14 rounded-xl bg-white border border-cl-verde/30 text-center text-3xl font-semibold num text-cl-verde-escuro focus:outline-none focus:ring-2 focus:ring-cl-verde disabled:opacity-50"
          aria-invalid={!comandaValida && comandaStr !== ""}
        />
        {!comandaValida && comandaStr !== "" && (
          <p className="text-xs text-cl-laranja mt-2">
            Use um número de 1 a 9999.
          </p>
        )}
      </section>

      <RegrasBolao />

      <div className="sticky bottom-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] -mx-4 px-4 bg-gradient-to-t from-cl-cinza-bg via-cl-cinza-bg/90 to-transparent">
        <Button
          onClick={confirmar}
          disabled={geo.status !== "ok" || enviando || !comandaValida}
          className="w-full h-14 text-base font-semibold bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl shadow-md"
        >
          {enviando ? "Registrando…" : "Confirmar palpite"}
        </Button>
      </div>
    </LayoutCliente>
  );
}

function RegrasBolao() {
  const regras = [
    "1 aposta por jogo.",
    "As apostas encerram no apito inicial da partida.",
    "1 chopp por comanda que acertar o placar no tempo regular.",
    "É obrigatória a presença do titular para apostar e resgatar.",
    "Para resgatar: apresente sua identidade (ou o app) e a comanda.",
  ];
  return (
    <section className="rounded-2xl bg-cl-verde-claro/30 border border-cl-verde/30 p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="size-4 text-cl-verde-escuro" />
        <p className="font-display text-cl-verde-escuro text-base">
          Como funciona
        </p>
      </div>
      <ul className="space-y-1.5">
        {regras.map((r) => (
          <li
            key={r}
            className="text-[13px] text-cl-verde-escuro flex gap-2 leading-snug"
          >
            <span className="text-cl-laranja shrink-0">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
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
          className="w-14 h-14 rounded-xl bg-cl-verde-escuro text-white text-3xl font-semibold flex items-center justify-center num"
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
            Precisamos da sua localização pra confirmar que você está numa unidade da marca.
          </p>
        )}
      </div>
    </div>
  );
}