import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Play,
  Trophy,
  Save,
  CheckCircle2,
  Gift,
  AlertTriangle,
  Receipt,
} from "lucide-react";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { Bandeira } from "@/components/jogos/Bandeira";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/lib/admin/auth";
import type { Jogo } from "@/lib/jogos";
import {
  formatarDataHoraBR,
  rotuloFase,
  statusBadgeClass,
  STATUS_LABEL,
  mascararTelefoneBR,
} from "@/lib/admin/jogo-helpers";

const COLUNAS =
  "id,numero_jogo,fase,grupo,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil";

export const Route = createFileRoute("/admin/jogo/$id")({
  component: () => (
    <AdminShell>
      <DetalheJogoPage />
    </AdminShell>
  ),
});

type Ganhador = {
  nome: string | null;
  telefone: string | null;
  comanda: number | null;
};

function DetalheJogoPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const auth = useAdminSession();
  const userId = auth.status === "in" ? auth.session.user.id : null;

  const jogoQ = useQuery({
    queryKey: ["admin", "jogo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Jogo;
    },
    refetchInterval: 15_000,
  });

  // contador em tempo real
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      const { count, error } = await supabase
        .from("palpites")
        .select("id", { count: "exact", head: true })
        .eq("jogo_id", id);
      if (!cancelled && !error) setCount(count ?? 0);
    }
    fetchCount();
    const channel = supabase
      .channel(`palpites-detalhe-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "palpites",
          filter: `jogo_id=eq.${id}`,
        },
        () => setCount((c) => (c ?? 0) + 1),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  const ganhadoresQ = useQuery({
    queryKey: ["admin", "ganhadores", id],
    enabled: false,
    queryFn: async (): Promise<Ganhador[]> => {
      const { data, error } = await supabase
        .from("palpites")
        .select("comanda, clientes:cliente_id(nome, telefone)")
        .eq("jogo_id", id)
        .eq("acertou", true)
        .order("comanda", { ascending: true });
      if (error) throw error;
      type Row = {
        comanda: number | null;
        clientes: { nome: string | null; telefone: string | null } | null;
      };
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        comanda: r.comanda,
        nome: r.clientes?.nome ?? null,
        telefone: r.clientes?.telefone ?? null,
      }));
    },
  });

  function invalidarTudo() {
    qc.invalidateQueries({ queryKey: ["admin", "jogo", id] });
    qc.invalidateQueries({ queryKey: ["admin", "jogos-todos"] });
    qc.invalidateQueries({ queryKey: ["admin", "jogo-ativo"] });
    qc.invalidateQueries({ queryKey: ["admin", "ganhadores", id] });
    qc.invalidateQueries({ queryKey: ["admin", "palpites", id] });
    qc.invalidateQueries({ queryKey: ["admin", "ganhadores-jogos"] });
  }

  if (jogoQ.isLoading) {
    return (
      <div className="py-20 text-center text-cl-cinza-texto flex flex-col items-center gap-2">
        <Loader2 className="size-6 animate-spin text-cl-verde" />
        Carregando jogo…
      </div>
    );
  }

  if (!jogoQ.data) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="font-display text-xl text-cl-verde-escuro">
          Jogo não encontrado
        </p>
        <Button
          asChild
          className="mt-4 bg-cl-verde hover:bg-cl-verde-escuro text-white"
        >
          <Link to="/admin/jogos">Voltar pra Jogos</Link>
        </Button>
      </div>
    );
  }

  const jogo = jogoQ.data;
  const podeAtivar = jogo.status === "habilitado" || jogo.status === "agendado";
  const podeLancarPlacar =
    jogo.status === "ativo" || jogo.status === "palpites_encerrados";
  const placarLancado = jogo.placar_a !== null && jogo.placar_b !== null;
  const jaEncerrado = jogo.status === "encerrado";
  const podeApurar = placarLancado && !jaEncerrado;
  const mostrarGanhadores = jaEncerrado || (ganhadoresQ.data != null);

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-cl-verde-escuro mb-2 -ml-2"
      >
        <Link to="/admin/jogos">
          <ArrowLeft className="size-4 mr-1" /> Jogos
        </Link>
      </Button>

      <PageHeader
        titulo={`Jogo #${jogo.numero_jogo}`}
        subtitulo={`${rotuloFase(jogo.fase)} • ${formatarDataHoraBR(jogo.data_hora_inicio)}`}
        acoes={
          <span
            className={`text-[11px] uppercase tracking-wider rounded-full px-3 py-1 ${statusBadgeClass(jogo.status)}`}
          >
            {STATUS_LABEL[jogo.status]}
          </span>
        }
      />

      {/* Card confronto */}
      <section className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center justify-center gap-6">
          <TimeBox nome={jogo.time_a} codigo={jogo.codigo_a} />
          <div className="text-center">
            {placarLancado ? (
              <p className="font-display text-cl-verde-escuro text-5xl tabular-nums leading-none">
                {jogo.placar_a} <span className="text-cl-cinza-texto">×</span>{" "}
                {jogo.placar_b}
              </p>
            ) : (
              <p className="font-display text-cl-cinza-texto text-4xl">×</p>
            )}
            <p className="text-[11px] uppercase tracking-wider text-cl-cinza-texto mt-1">
              {placarLancado ? "Placar final" : "A definir"}
            </p>
          </div>
          <TimeBox nome={jogo.time_b} codigo={jogo.codigo_b} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/70 border border-cl-verde/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
              Sede
            </p>
            <p className="text-cl-verde-escuro truncate">
              {jogo.estadio ?? "—"}
              {jogo.cidade ? ` • ${jogo.cidade}` : ""}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 border border-cl-verde/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
              Palpites recebidos
            </p>
            <p className="font-display text-cl-verde-escuro text-2xl tabular-nums leading-none">
              {count ?? "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Ações em ordem */}
      <div className="space-y-5">
        {podeAtivar && (
          <AcaoAtivar
            jogo={jogo}
            userId={userId}
            onDone={invalidarTudo}
          />
        )}

        {!jaEncerrado && (
          <AcaoPremio jogo={jogo} onDone={invalidarTudo} />
        )}

        {podeLancarPlacar && (
          <AcaoLancarPlacar
            jogo={jogo}
            onDone={invalidarTudo}
          />
        )}

        {podeApurar && (
          <AcaoApurar
            jogo={jogo}
            userId={userId}
            onApurado={(lista) => {
              qc.setQueryData(["admin", "ganhadores", id], lista);
              invalidarTudo();
            }}
          />
        )}

        {mostrarGanhadores && <CardGanhadores jogo={jogo} />}

        <ListaPalpitesAdmin jogoId={id} />
      </div>
    </>
  );
}

function TimeBox({ nome, codigo }: { nome: string; codigo: string | null }) {
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <Bandeira codigo={codigo} tamanho={48} />
      </div>
      <p className="font-display text-cl-verde-escuro text-lg mt-1">
        {codigo ?? ""}
      </p>
      <p className="text-xs text-cl-cinza-texto truncate max-w-[140px]">
        {nome}
      </p>
    </div>
  );
}

/* ===== AÇÃO: ATIVAR ===== */
function AcaoAtivar({
  jogo,
  userId,
  onDone,
}: {
  jogo: Jogo;
  userId: string | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function ativar() {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase.rpc("fn_ativar_jogo", {
      p_jogo_id: jogo.id,
      p_usuario_id: userId,
    });
    setLoading(false);
    if (error) {
      toast.error(traduzirErro(error.message, "Não consegui ativar o bolão agora."));
      return;
    }
    toast.success("Bolão ativado!");
    setOpen(false);
    onDone();
  }

  return (
    <>
      <section className="glass rounded-3xl p-5">
        <Cabecalho icon={<Play className="size-5" />} titulo="Ativar bolão" passo={1} />
        <p className="text-sm text-cl-cinza-texto mb-3">
          Abre o bolão deste jogo pros clientes palpitarem. Só um jogo pode estar
          ativo por vez.
        </p>
        <Button
          onClick={() => setOpen(true)}
          className="w-full h-12 bg-cl-verde hover:bg-cl-verde-escuro text-white text-base font-semibold"
        >
          <Play className="size-4 mr-2" /> Ativar bolão deste jogo
        </Button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-cl-verde-escuro">
              Ativar o bolão?
            </DialogTitle>
            <DialogDescription>
              Ativar o bolão de <strong>{jogo.time_a}</strong> x{" "}
              <strong>{jogo.time_b}</strong>? Isso encerra qualquer outro jogo
              ativo no momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={ativar}
              disabled={loading}
              className="bg-cl-verde hover:bg-cl-verde-escuro text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Ativando…
                </>
              ) : (
                "Sim, ativar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ===== AÇÃO: PRÊMIO ===== */
function AcaoPremio({ jogo, onDone }: { jogo: Jogo; onDone: () => void }) {
  const [desc, setDesc] = useState(jogo.premio_descricao ?? "");
  const [imgUrl, setImgUrl] = useState(jogo.premio_imagem_url ?? "");
  const [loading, setLoading] = useState(false);
  const sujo =
    desc !== (jogo.premio_descricao ?? "") ||
    imgUrl !== (jogo.premio_imagem_url ?? "");

  async function salvar() {
    setLoading(true);
    const { error } = await supabase
      .from("jogos")
      .update({
        premio_descricao: desc.trim() || null,
        premio_imagem_url: imgUrl.trim() || null,
      })
      .eq("id", jogo.id);
    setLoading(false);
    if (error) {
      toast.error("Não consegui salvar o prêmio agora.");
      return;
    }
    toast.success("Prêmio atualizado.");
    onDone();
  }

  return (
    <section className="glass rounded-3xl p-5">
      <Cabecalho icon={<Gift className="size-5" />} titulo="Prêmio do jogo" passo={2} />
      <div className="space-y-3">
        <div>
          <Label htmlFor="premio-desc" className="text-cl-verde-escuro">
            Descrição
          </Label>
          <Textarea
            id="premio-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex.: Uma rodada de caipirinha pra mesa"
            className="mt-1 bg-white"
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="premio-img" className="text-cl-verde-escuro">
            Imagem (URL, opcional)
          </Label>
          <Input
            id="premio-img"
            value={imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 bg-white"
          />
        </div>

        {(desc.trim() || imgUrl.trim()) && (
          <div className="rounded-xl bg-cl-laranja/15 border border-cl-laranja/40 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-cl-laranja font-semibold">
              Como aparece pro cliente
            </p>
            <p className="text-sm text-cl-verde-escuro font-medium">
              {desc.trim() || "—"}
            </p>
            {imgUrl.trim() && (
              <img
                src={imgUrl.trim()}
                alt=""
                className="mt-2 max-h-32 mx-auto rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        )}

        <Button
          onClick={salvar}
          disabled={loading || !sujo}
          className="w-full bg-cl-verde hover:bg-cl-verde-escuro text-white"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" /> Salvando…
            </>
          ) : (
            <>
              <Save className="size-4 mr-2" /> Salvar prêmio
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

/* ===== AÇÃO: LANÇAR PLACAR ===== */
function AcaoLancarPlacar({
  jogo,
  onDone,
}: {
  jogo: Jogo;
  onDone: () => void;
}) {
  const [a, setA] = useState<number>(jogo.placar_a ?? 0);
  const [b, setB] = useState<number>(jogo.placar_b ?? 0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function lancar() {
    setLoading(true);
    const { error } = await supabase
      .from("jogos")
      .update({ placar_a: a, placar_b: b })
      .eq("id", jogo.id);
    setLoading(false);
    if (error) {
      toast.error("Não consegui salvar o placar agora.");
      return;
    }
    toast.success("Placar registrado!");
    setOpen(false);
    onDone();
  }

  return (
    <>
      <section className="glass rounded-3xl p-5">
        <Cabecalho
          icon={<CheckCircle2 className="size-5" />}
          titulo="Lançar placar final"
          passo={3}
        />
        <div className="rounded-xl bg-cl-aviso/15 border border-cl-aviso/40 p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="size-4 text-cl-aviso mt-0.5 shrink-0" />
          <p className="text-xs text-cl-verde-escuro leading-snug">
            Lance o placar do <strong>tempo regular</strong> (90 min +
            acréscimos), não prorrogação nem pênaltis.
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <PlacarInput nome={jogo.time_a} codigo={jogo.codigo_a} valor={a} onChange={setA} />
          <div className="font-display text-2xl text-cl-cinza-texto text-center">×</div>
          <PlacarInput nome={jogo.time_b} codigo={jogo.codigo_b} valor={b} onChange={setB} />
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="mt-4 w-full h-12 bg-cl-verde hover:bg-cl-verde-escuro text-white text-base font-semibold"
        >
          Lançar placar
        </Button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-cl-verde-escuro">
              Confirmar placar?
            </DialogTitle>
            <DialogDescription>
              Registrar <strong>{jogo.time_a} {a}</strong> ×{" "}
              <strong>{b} {jogo.time_b}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={lancar}
              disabled={loading}
              className="bg-cl-verde hover:bg-cl-verde-escuro text-white"
            >
              {loading ? "Salvando…" : "Sim, confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlacarInput({
  nome,
  codigo,
  valor,
  onChange,
}: {
  nome: string;
  codigo: string | null;
  valor: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-1">
        <Bandeira codigo={codigo} tamanho={28} />
      </div>
      <p className="text-xs text-cl-cinza-texto truncate">{nome}</p>
      <Input
        type="number"
        min={0}
        max={20}
        value={valor}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(20, Number(e.target.value) || 0)))
        }
        className="mt-2 h-14 text-3xl text-center font-display tabular-nums bg-white"
      />
    </div>
  );
}

/* ===== AÇÃO: SORTEAR ===== */
function AcaoSortear({
  jogo,
  userId,
  onDone,
}: {
  jogo: Jogo;
  userId: string | null;
  onDone: (s: Sorteio) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [semAcerto, setSemAcerto] = useState(false);

  const acertadoresQ = useQuery({
    queryKey: ["admin", "acertadores", jogo.id, jogo.placar_a, jogo.placar_b],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("palpites")
        .select("id", { count: "exact", head: true })
        .eq("jogo_id", jogo.id)
        .eq("placar_a", jogo.placar_a)
        .eq("placar_b", jogo.placar_b);
      if (error) throw error;
      return count ?? 0;
    },
  });

  async function sortear() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("fn_sortear_vencedor", {
      p_jogo_id: jogo.id,
      p_usuario_id: userId,
    });
    setLoading(false);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("acert") || msg.includes("vencedor") || msg.includes("ninguem")) {
        setSemAcerto(true);
        setOpen(false);
        toast.message("Ninguém acertou o placar exato.");
        return;
      }
      toast.error(traduzirErro(error.message, "Não consegui sortear agora."));
      return;
    }
    toast.success("Vencedor sorteado!");
    setOpen(false);
    onDone(data as Sorteio);
  }

  if (semAcerto) {
    return (
      <section className="glass rounded-3xl p-6 text-center">
        <p className="font-display text-cl-verde-escuro text-xl">
          Ninguém acertou o placar exato.
        </p>
        <p className="text-sm text-cl-cinza-texto mt-1">
          Sem vencedor neste jogo.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="glass rounded-3xl p-5">
        <Cabecalho icon={<Trophy className="size-5" />} titulo="Sortear vencedor" passo={4} />
        <p className="text-sm text-cl-cinza-texto mb-3">
          {acertadoresQ.isLoading
            ? "Contando acertadores…"
            : acertadoresQ.data === 0
              ? "Ninguém acertou o placar exato até agora."
              : `${acertadoresQ.data} ${acertadoresQ.data === 1 ? "pessoa acertou" : "pessoas acertaram"} o placar exato.`}
        </p>
        <Button
          onClick={() => setOpen(true)}
          disabled={acertadoresQ.isLoading}
          className="w-full h-12 bg-cl-laranja hover:bg-cl-laranja/90 text-cl-verde-escuro font-semibold text-base"
        >
          <Trophy className="size-4 mr-2" /> Sortear vencedor
        </Button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-cl-verde-escuro">
              Sortear o vencedor?
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. O sorteio fica registrado com seed pra
              auditoria, e o jogo será encerrado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={sortear}
              disabled={loading}
              className="bg-cl-laranja hover:bg-cl-laranja/90 text-cl-verde-escuro"
            >
              {loading ? "Sorteando…" : "Sim, sortear agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CardVencedor({ sorteio, jogo }: { sorteio: Sorteio; jogo: Jogo }) {
  return (
    <section
      className="rounded-3xl overflow-hidden relative glass"
      style={{
        backgroundImage:
          "linear-gradient(180deg, color-mix(in oklab, white 70%, transparent), color-mix(in oklab, white 90%, transparent)), url('/assets/15-textura-floral.png')",
        backgroundSize: "cover, 220px",
        backgroundRepeat: "no-repeat, repeat",
      }}
    >
      <div className="p-6 text-center">
        <Trophy className="size-8 text-cl-laranja mx-auto" />
        <p className="text-[11px] uppercase tracking-widest text-cl-cinza-texto mt-2">
          Vencedor sorteado
        </p>
        <h3 className="font-display text-cl-verde-escuro text-3xl md:text-4xl mt-1">
          {sorteio.vencedor_nome ?? "—"}
        </h3>
        <p className="text-sm text-cl-cinza-texto mt-1">
          {sorteio.vencedor_telefone ?? ""}
        </p>
        <p className="text-xs text-cl-cinza-texto mt-3">
          {sorteio.total_acertadores ?? 0}{" "}
          {sorteio.total_acertadores === 1 ? "acertador" : "acertadores"} •{" "}
          {jogo.placar_a}×{jogo.placar_b}
        </p>

        <div className="mt-4 rounded-xl bg-white/80 border border-cl-verde/20 p-3 text-left">
          <p className="text-[10px] uppercase tracking-widest text-cl-cinza-texto">
            Comprovante de sorteio (seed)
          </p>
          <p className="font-mono text-[11px] break-all text-cl-verde-escuro mt-1">
            {sorteio.seed ?? "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ===== helpers ===== */
function Cabecalho({
  icon,
  titulo,
  passo,
}: {
  icon: React.ReactNode;
  titulo: string;
  passo: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="size-7 rounded-full bg-cl-verde text-white text-xs font-semibold flex items-center justify-center">
        {passo}
      </span>
      <h2 className="font-display text-cl-verde-escuro text-lg flex items-center gap-2">
        {icon} {titulo}
      </h2>
    </div>
  );
}

function traduzirErro(msg: string, fallback: string) {
  const m = msg.toLowerCase();
  if (m.includes("permission") || m.includes("rls")) return "Sem permissão.";
  if (m.includes("network") || m.includes("fetch")) return "Sem conexão agora.";
  return fallback;
}