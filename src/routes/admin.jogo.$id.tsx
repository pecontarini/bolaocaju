import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Save,
  CheckCircle2,
  Gift,
  AlertTriangle,
  Receipt,
  Radio,
  Plus,
  Minus,
  Package,
} from "lucide-react";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { useUsarTexturas } from "@/lib/marca";
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
import { usePerfilAdmin } from "@/lib/admin/perfil";
import type { Jogo } from "@/lib/jogos";
import { formatarReais } from "@/lib/formato";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatarDataHoraBR,
  rotuloFase,
  statusBadgeClass,
  STATUS_LABEL,
  mascararTelefoneBR,
} from "@/lib/admin/jogo-helpers";

const COLUNAS =
  "id,numero_jogo,fase,grupo,data_hora_inicio,time_a,codigo_a,time_b,codigo_b,estadio,cidade,pais_sede,status,placar_a,placar_b,palpites_encerrados,premio_descricao,premio_imagem_url,envolve_brasil,premio_produto_id,premio_quantidade";

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
  placar_a?: number | null;
  placar_b?: number | null;
  marca_slug?: string | null;
  unidade_nome?: string | null;
};

function DetalheJogoPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const auth = useAdminSession();
  const userId = auth.status === "in" ? auth.session.user.id : null;
  void userId;

  const jogoQ = useQuery({
    queryKey: ["admin", "jogo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogos")
        .select(COLUNAS)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Jogo;
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
  const podeLancarPlacar =
    jogo.status === "ativo" ||
    jogo.status === "palpites_encerrados" ||
    jogo.status === "encerrado";
  const podeNarrarAoVivo =
    jogo.status === "ativo" || jogo.status === "palpites_encerrados";
  const placarLancado = jogo.placar_a !== null && jogo.placar_b !== null;
  const jaEncerrado = jogo.status === "encerrado";

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
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <TimeBox nome={jogo.time_a} codigo={jogo.codigo_a} />
          <div className="text-center">
            {placarLancado ? (
              <span className="placar-chip text-3xl sm:text-4xl px-4 py-2">
                <span>{jogo.placar_a}</span>
                <span className="x">×</span>
                <span>{jogo.placar_b}</span>
              </span>
            ) : (
              <p className="font-display text-cl-cinza-texto text-4xl leading-none">×</p>
            )}
            <p className="text-[10px] uppercase tracking-wider text-cl-cinza-texto mt-2">
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
        {!jaEncerrado && (
          <AcaoPremio jogo={jogo} onDone={invalidarTudo} />
        )}

        {podeNarrarAoVivo && (
          <PlacarAoVivo jogo={jogo} onChange={invalidarTudo} />
        )}

        {podeLancarPlacar && (
          <AcaoLancarPlacar
            jogo={jogo}
            onDone={invalidarTudo}
          />
        )}

        <CardGanhadores jogo={jogo} />

        {(placarLancado || jaEncerrado) && <CardInvestimento jogoId={jogo.id} />}

        <ListaPalpitesAdmin jogoId={id} />
      </div>
    </>
  );
}

function TimeBox({ nome, codigo }: { nome: string; codigo: string | null }) {
  return (
    <div className="text-center min-w-0">
      <div className="flex justify-center">
        <Bandeira codigo={codigo} tamanho={44} />
      </div>
      <p className="font-display text-cl-verde-escuro text-base sm:text-lg mt-1.5 leading-none">
        {codigo ?? ""}
      </p>
      <p className="text-[11px] text-cl-cinza-texto truncate mt-1 uppercase tracking-wide">
        {nome}
      </p>
    </div>
  );
}

/* ===== AÇÃO: PRÊMIO ===== */
function AcaoPremio({ jogo, onDone }: { jogo: Jogo; onDone: () => void }) {
  const [desc, setDesc] = useState(jogo.premio_descricao ?? "");
  const [imgUrl, setImgUrl] = useState(jogo.premio_imagem_url ?? "");
  const [produtoId, setProdutoId] = useState<string>(
    jogo.premio_produto_id ?? "",
  );
  const [qtd, setQtd] = useState<number>(jogo.premio_quantidade ?? 1);
  const [loading, setLoading] = useState(false);

  const produtosQ = useQuery({
    queryKey: ["admin", "produtos", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id,nome,custo_reais,ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        nome: string;
        custo_reais: number | string;
        ativo: boolean;
      }>;
    },
  });

  const sujo =
    desc !== (jogo.premio_descricao ?? "") ||
    imgUrl !== (jogo.premio_imagem_url ?? "") ||
    (produtoId || null) !== (jogo.premio_produto_id ?? null) ||
    qtd !== (jogo.premio_quantidade ?? 1);

  async function salvar() {
    if (!Number.isInteger(qtd) || qtd < 1) {
      toast.error("Quantidade deve ser um inteiro maior ou igual a 1.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("jogos")
      .update({
        premio_descricao: desc.trim() || null,
        premio_imagem_url: imgUrl.trim() || null,
        premio_produto_id: produtoId || null,
        premio_quantidade: qtd,
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
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <Label className="text-cl-verde-escuro">Produto bonificável</Label>
            <Select
              value={produtoId || "__nenhum"}
              onValueChange={(v) => setProdutoId(v === "__nenhum" ? "" : v)}
            >
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue placeholder="Selecionar produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__nenhum">— Nenhum —</SelectItem>
                {(produtosQ.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} · {formatarReais(Number(p.custo_reais))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="premio-qtd" className="text-cl-verde-escuro">
              Qtd/comanda
            </Label>
            <Input
              id="premio-qtd"
              type="number"
              min={1}
              max={20}
              value={qtd}
              onChange={(e) =>
                setQtd(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className="mt-1 bg-white tabular-nums text-center"
            />
          </div>
        </div>
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

/* ===== PLACAR AO VIVO (botões +1 / -1 por time) ===== */
function PlacarAoVivo({
  jogo,
  onChange,
}: {
  jogo: Jogo;
  onChange: () => void;
}) {
  const [savingA, setSavingA] = useState(false);
  const [savingB, setSavingB] = useState(false);
  const a = jogo.placar_a ?? 0;
  const b = jogo.placar_b ?? 0;

  async function ajustar(time: "a" | "b", delta: 1 | -1) {
    const atual = time === "a" ? a : b;
    const novo = Math.max(0, atual + delta);
    if (novo === atual) return;
    const setter = time === "a" ? setSavingA : setSavingB;
    setter(true);
    const { error } = await supabase
      .from("jogos")
      .update(time === "a" ? { placar_a: novo } : { placar_b: novo })
      .eq("id", jogo.id);
    setter(false);
    if (error) {
      toast.error("Não consegui atualizar o placar agora.");
      return;
    }
    onChange();
  }

  return (
    <section className="glass rounded-3xl p-5">
      <Cabecalho
        icon={<Radio className="size-5" />}
        titulo="Placar ao vivo"
        passo={3}
      />
      <p className="text-xs text-cl-cinza-texto -mt-1 mb-4 leading-snug">
        Narre o jogo em tempo real. Cada toque vai pro celular dos clientes na
        hora. <strong>Isso não encerra o jogo nem apura ganhadores.</strong>
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <TimeAoVivo
          nome={jogo.time_a}
          codigo={jogo.codigo_a}
          valor={a}
          saving={savingA}
          onMais={() => ajustar("a", 1)}
          onMenos={() => ajustar("a", -1)}
        />
        <span className="font-display text-cl-cinza-texto text-2xl text-center">×</span>
        <TimeAoVivo
          nome={jogo.time_b}
          codigo={jogo.codigo_b}
          valor={b}
          saving={savingB}
          onMais={() => ajustar("b", 1)}
          onMenos={() => ajustar("b", -1)}
        />
      </div>
    </section>
  );
}

function TimeAoVivo({
  nome,
  codigo,
  valor,
  saving,
  onMais,
  onMenos,
}: {
  nome: string;
  codigo: string | null;
  valor: number;
  saving: boolean;
  onMais: () => void;
  onMenos: () => void;
}) {
  return (
    <div className="text-center min-w-0">
      <div className="flex justify-center mb-1">
        <Bandeira codigo={codigo} tamanho={28} />
      </div>
      <p className="text-[11px] text-cl-cinza-texto truncate uppercase tracking-wide">
        {nome}
      </p>
      <p className="font-display text-cl-verde-escuro text-5xl tabular-nums leading-none mt-2 mb-3">
        {valor}
      </p>
      <div className="flex flex-col gap-2">
        <Button
          onClick={onMais}
          disabled={saving}
          className="h-14 bg-cl-verde hover:bg-cl-verde-escuro text-white font-display text-base shadow-[0_8px_22px_-12px_rgba(28,59,22,0.55)]"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Plus className="size-4 mr-1" /> 1 Gol
            </>
          )}
        </Button>
        <Button
          onClick={onMenos}
          disabled={saving || valor === 0}
          variant="outline"
          className="h-9 border-cl-verde/40 text-cl-verde-escuro"
        >
          <Minus className="size-3 mr-1" /> Corrigir
        </Button>
      </div>
    </div>
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

/* ===== AÇÃO: APURAR GANHADORES ===== */
function AcaoApurar({
  jogo,
  userId,
  onApurado,
}: {
  jogo: Jogo;
  userId: string | null;
  onApurado: (lista: Ganhador[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const acertadoresQ = useQuery({
    queryKey: ["admin", "acertadores", jogo.id, jogo.placar_a, jogo.placar_b],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_meus_ganhadores", {
        p_jogo_id: jogo.id,
      });
      if (error) throw error;
      return Array.isArray(data) ? data.length : 0;
    },
  });

  async function apurar() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("fn_apurar_ganhadores", {
      p_jogo_id: jogo.id,
      p_usuario_id: userId,
    });
    setLoading(false);
    if (error) {
      toast.error(traduzirErro(error.message, "Não consegui apurar agora."));
      return;
    }
    type Row = {
      nome?: string | null;
      vencedor_nome?: string | null;
      telefone?: string | null;
      vencedor_telefone?: string | null;
      comanda?: number | null;
    };
    const lista: Ganhador[] = (
      Array.isArray(data) ? (data as Row[]) : []
    ).map((r) => ({
      nome: r.nome ?? r.vencedor_nome ?? null,
      telefone: r.telefone ?? r.vencedor_telefone ?? null,
      comanda: r.comanda ?? null,
    }));
    if (lista.length === 0) {
      toast.message("Ninguém acertou o placar.");
    } else {
      toast.success(
        `${lista.length} ${lista.length === 1 ? "ganhador apurado" : "ganhadores apurados"}!`,
      );
    }
    setOpen(false);
    onApurado(lista);
  }

  return (
    <>
      <section className="glass rounded-3xl p-5">
        <Cabecalho
          icon={<Trophy className="size-5" />}
          titulo="Apurar ganhadores"
          passo={4}
        />
        <p className="text-sm text-cl-cinza-texto mb-3">
          {acertadoresQ.isLoading
            ? "Contando acertadores…"
            : acertadoresQ.data === 0
              ? "Ninguém acertou o placar exato até agora."
              : `${acertadoresQ.data} ${acertadoresQ.data === 1 ? "comanda acertou" : "comandas acertaram"} o placar exato.`}
        </p>
        <Button
          onClick={() => setOpen(true)}
          disabled={acertadoresQ.isLoading}
          className="w-full h-12 bg-cl-laranja hover:bg-cl-laranja/90 text-cl-verde-escuro font-semibold text-base"
        >
          <Trophy className="size-4 mr-2" /> Apurar ganhadores
        </Button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-cl-verde-escuro">
              Apurar ganhadores?
            </DialogTitle>
            <DialogDescription>
              Toda comanda que acertou o placar no tempo regular ganha 1 chopp.
              Esta ação encerra o jogo.
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
              onClick={apurar}
              disabled={loading}
              className="bg-cl-laranja hover:bg-cl-laranja/90 text-cl-verde-escuro"
            >
              {loading ? "Apurando…" : "Sim, apurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CardGanhadores({ jogo }: { jogo: Jogo }) {
  const perfilQ = usePerfilAdmin();
  const perfil = perfilQ.data ?? null;
  const usarTexturas = useUsarTexturas();
  const jaEncerrado = jogo.status === "encerrado";
  const q = useQuery({
    queryKey: ["admin", "meus-ganhadores", jogo.id, perfil?.papel ?? null, perfil?.unidade_id ?? null],
    enabled: !!perfil && jaEncerrado,
    queryFn: async (): Promise<Ganhador[]> => {
      const { data, error } = await supabase.rpc("fn_meus_ganhadores", {
        p_jogo_id: jogo.id,
      });
      if (error) throw error;
      type Row = {
        nome: string | null;
        telefone: string | null;
        comanda: number | null;
        placar_a: number | null;
        placar_b: number | null;
        marca_slug: string | null;
        unidade_nome: string | null;
      };
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        nome: r.nome ?? null,
        telefone: r.telefone ?? null,
        comanda: r.comanda ?? null,
        placar_a: r.placar_a ?? null,
        placar_b: r.placar_b ?? null,
        marca_slug: r.marca_slug ?? null,
        unidade_nome: r.unidade_nome ?? null,
      }));
    },
  });

  const lista = q.data ?? [];
  const comandasDistintas = new Set(
    lista.map((g) => g.comanda).filter((c): c is number => c != null),
  ).size;
  const tituloJogo = `${jogo.codigo_a ?? jogo.time_a} × ${jogo.codigo_b ?? jogo.time_b}`;

  const ehGeral = perfil?.papel === "admin_geral";
  // Para admin_geral, agrupa por marca_slug → unidade_nome.
  const grupos = (() => {
    if (!ehGeral) return null;
    const porMarca = new Map<string, Map<string, Ganhador[]>>();
    for (const g of lista) {
      const m = g.marca_slug ?? "—";
      const u = g.unidade_nome ?? "—";
      if (!porMarca.has(m)) porMarca.set(m, new Map());
      const subm = porMarca.get(m)!;
      if (!subm.has(u)) subm.set(u, []);
      subm.get(u)!.push(g);
    }
    return porMarca;
  })();

  return (
    <section
      className="rounded-3xl overflow-hidden relative glass"
      style={
        usarTexturas
          ? {
              backgroundImage:
                "linear-gradient(180deg, color-mix(in oklab, white 78%, transparent), color-mix(in oklab, white 92%, transparent)), url('/assets/15-textura-floral.png')",
              backgroundSize: "cover, 220px",
              backgroundRepeat: "no-repeat, repeat",
            }
          : undefined
      }
    >
      <div className="p-6">
        <div className="text-center">
          <Trophy className="size-8 text-cl-laranja mx-auto" />
          <p className="text-[11px] uppercase tracking-widest text-cl-cinza-texto mt-2">
            Ganhadores — {tituloJogo}
          </p>
          <h3 className="font-display text-cl-verde-escuro text-2xl mt-1">
            {jaEncerrado && jogo.placar_a !== null && jogo.placar_b !== null
              ? `${jogo.placar_a}×${jogo.placar_b} no tempo regular`
              : "Aguardando resultado"}
          </h3>
          {jaEncerrado && (
            <p className="text-[11px] uppercase tracking-wider text-cl-cinza-texto mt-2">
              {lista.length}{" "}
              {lista.length === 1 ? "comanda acertou" : "comandas acertaram"}
            </p>
          )}
          {jaEncerrado && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => q.refetch()}
              disabled={q.isFetching}
              className="mt-3"
            >
              {q.isFetching ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Atualizando…
                </>
              ) : (
                "Atualizar"
              )}
            </Button>
          )}
        </div>

        {!jaEncerrado ? (
          <p className="mt-6 text-center text-sm text-cl-cinza-texto">
            Aguardando resultado do jogo.
          </p>
        ) : q.isLoading ? (
          <div className="mt-6 text-center text-cl-cinza-texto text-sm">
            <Loader2 className="size-5 mx-auto animate-spin text-cl-verde" />
          </div>
        ) : q.error ? (
          <p className="mt-6 text-center text-sm text-cl-aviso">
            Não consegui carregar os ganhadores agora.
          </p>
        ) : lista.length === 0 ? (
          <p className="mt-6 text-center text-sm text-cl-verde-escuro">
            Ninguém acertou o placar exato neste jogo.
          </p>
        ) : ehGeral && grupos ? (
          <>
            <div className="mt-5 rounded-2xl bg-cl-laranja text-cl-verde-escuro px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-widest font-semibold">
                Comandas ganhadoras
              </p>
              <p className="font-display text-4xl tabular-nums leading-none mt-1">
                {comandasDistintas}
              </p>
            </div>
            <div className="mt-5 space-y-5">
              {Array.from(grupos.entries()).map(([marca, porUnidade]) => (
                <div key={marca}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cl-verde-escuro font-semibold mb-2">
                    {marca}
                  </p>
                  <div className="space-y-4">
                    {Array.from(porUnidade.entries()).map(([unidade, gs]) => (
                      <div key={`${marca}-${unidade}`}>
                        <p className="text-[10px] uppercase tracking-wider text-cl-cinza-texto mb-1.5">
                          {unidade}
                        </p>
                        <ul className="space-y-2">
                          {gs.map((g, i) => (
                            <LinhaGanhador key={`${g.comanda}-${i}`} g={g} />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 rounded-2xl bg-cl-laranja text-cl-verde-escuro px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-widest font-semibold">
                Comandas ganhadoras
              </p>
              <p className="font-display text-4xl tabular-nums leading-none mt-1">
                {comandasDistintas}
              </p>
            </div>

            <ul className="mt-5 space-y-2">
              {lista.map((g, i) => (
                <LinhaGanhador key={`${g.comanda}-${i}`} g={g} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function LinhaGanhador({ g }: { g: Ganhador }) {
  return (
    <li className="rounded-2xl bg-white/85 border border-cl-verde/20 p-3 flex items-center gap-3">
      <div className="size-16 shrink-0 rounded-xl bg-cl-verde-escuro text-white flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase tracking-wider opacity-80">Comanda</span>
        <span className="font-display text-2xl leading-none tabular-nums">
          {g.comanda ?? "—"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-cl-verde-escuro text-lg leading-tight truncate">
          {g.nome ?? "—"}
        </p>
        <p className="text-xs text-cl-cinza-texto">
          {mascararTelefoneBR(g.telefone)}
        </p>
      </div>
      {g.placar_a !== null && g.placar_b !== null && g.placar_a !== undefined && g.placar_b !== undefined && (
        <div className="shrink-0 rounded-lg bg-cl-verde/10 text-cl-verde-escuro px-2 py-1 font-display tabular-nums text-base">
          {g.placar_a}×{g.placar_b}
        </div>
      )}
    </li>
  );
}

/* ===== LISTA DE PALPITES (conferência) ===== */
type PalpiteLinha = {
  id: string;
  comanda: number | null;
  placar_a: number;
  placar_b: number;
  acertou: boolean | null;
  created_at: string;
  clientes: { nome: string | null; telefone: string | null } | null;
};

function ListaPalpitesAdmin({ jogoId }: { jogoId: string }) {
  const q = useQuery({
    queryKey: ["admin", "palpites", jogoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("palpites")
        .select(
          "id,comanda,placar_a,placar_b,acertou,created_at,clientes:cliente_id(nome,telefone)",
        )
        .eq("jogo_id", jogoId)
        .order("comanda", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as PalpiteLinha[];
    },
    refetchInterval: 30_000,
  });

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="size-5 text-cl-verde-escuro" />
        <h2 className="font-display text-cl-verde-escuro text-lg">
          Palpites recebidos
        </h2>
      </div>
      {q.isLoading ? (
        <div className="py-6 text-center text-cl-cinza-texto">
          <Loader2 className="size-5 mx-auto animate-spin" />
        </div>
      ) : !q.data || q.data.length === 0 ? (
        <p className="text-sm text-cl-cinza-texto text-center py-4">
          Nenhum palpite registrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
                <th className="text-left px-2 py-2">Comanda</th>
                <th className="text-left px-2 py-2">Cliente</th>
                <th className="text-center px-2 py-2">Palpite</th>
                <th className="text-right px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-cl-verde/10 align-middle"
                >
                  <td className="px-2 py-2">
                    <span className="inline-flex items-center justify-center min-w-9 h-8 px-2 rounded-lg bg-cl-verde-escuro text-white font-display tabular-nums">
                      {p.comanda ?? "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2 min-w-0">
                    <p className="text-cl-verde-escuro truncate max-w-[140px]">
                      {p.clientes?.nome ?? "—"}
                    </p>
                    <p className="text-[10px] text-cl-cinza-texto truncate">
                      {mascararTelefoneBR(p.clientes?.telefone)}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-center font-display tabular-nums text-cl-verde-escuro">
                    {p.placar_a}–{p.placar_b}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {p.acertou ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cl-verde-escuro bg-cl-laranja px-2 py-0.5 rounded-full">
                        <Trophy className="size-3" /> Acertou
                      </span>
                    ) : (
                      <span className="text-[11px] text-cl-cinza-texto">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

/* ===== INVESTIMENTO ===== */
type InvestimentoRow = {
  comandas_ganhadoras: number | null;
  itens: number | null;
  investimento: number | string | null;
};

function CardInvestimento({ jogoId }: { jogoId: string }) {
  const q = useQuery({
    queryKey: ["admin", "investimento", jogoId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_investimento_jogo", {
        p_jogo_id: jogoId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as InvestimentoRow | null;
    },
  });

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Package className="size-5 text-cl-verde-escuro" />
        <h2 className="font-display text-cl-verde-escuro text-lg">
          Investimento do jogo
        </h2>
      </div>
      {q.isLoading ? (
        <div className="py-4 text-center text-cl-cinza-texto">
          <Loader2 className="size-5 mx-auto animate-spin" />
        </div>
      ) : q.isError || !q.data ? (
        <p className="text-sm text-cl-cinza-texto">
          Investimento indisponível no momento.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <BoxNum label="Comandas" valor={String(q.data.comandas_ganhadoras ?? 0)} />
          <BoxNum label="Itens" valor={String(q.data.itens ?? 0)} />
          <BoxNum
            label="Investido"
            valor={formatarReais(Number(q.data.investimento ?? 0))}
          />
        </div>
      )}
    </section>
  );
}

function BoxNum({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white/70 border border-cl-verde/15 px-2 py-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
        {label}
      </p>
      <p className="font-display text-cl-verde-escuro text-xl tabular-nums leading-none mt-1">
        {valor}
      </p>
    </div>
  );
}