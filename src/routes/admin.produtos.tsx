import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Package, Plus, Pencil, Save, X } from "lucide-react";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatarReais } from "@/lib/formato";

export type Produto = {
  id: string;
  nome: string;
  custo_reais: number | string;
  ativo: boolean;
};

export const Route = createFileRoute("/admin/produtos")({
  component: () => (
    <AdminShell>
      <ProdutosPage />
    </AdminShell>
  ),
});

function ProdutosPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Produto | null>(null);
  const [criando, setCriando] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id,nome,custo_reais,ativo")
        .order("ativo", { ascending: false })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Produto[];
    },
  });

  function recarregar() {
    qc.invalidateQueries({ queryKey: ["admin", "produtos"] });
  }

  return (
    <>
      <PageHeader
        titulo="Produtos"
        subtitulo="Itens bonificáveis e seus custos"
        acoes={
          <Button
            onClick={() => setCriando(true)}
            className="bg-cl-verde hover:bg-cl-verde-escuro text-white"
          >
            <Plus className="size-4 mr-1" /> Novo
          </Button>
        }
      />

      {q.isLoading ? (
        <div className="py-20 text-center text-cl-cinza-texto">
          <Loader2 className="size-6 mx-auto animate-spin text-cl-verde" />
        </div>
      ) : !q.data || q.data.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center text-cl-cinza-texto">
          Nenhum produto cadastrado.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {q.data.map((p) => {
            const custo = Number(p.custo_reais ?? 0);
            const destaque = custo === 0 && p.ativo;
            return (
              <li
                key={p.id}
                className={`glass rounded-2xl p-4 flex items-center gap-3 ${
                  destaque ? "ring-2 ring-cl-laranja/70" : ""
                }`}
              >
                <div className="size-10 rounded-xl bg-cl-verde/15 text-cl-verde-escuro flex items-center justify-center shrink-0">
                  <Package className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-cl-verde-escuro text-lg leading-tight truncate">
                    {p.nome}
                  </p>
                  <p className="text-xs text-cl-cinza-texto tabular-nums">
                    Custo: <strong>{formatarReais(custo)}</strong>
                    {!p.ativo && (
                      <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider">
                        Inativo
                      </span>
                    )}
                    {destaque && (
                      <span className="ml-2 inline-block rounded-full bg-cl-laranja/90 text-cl-verde-escuro px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
                        Preencher custo
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(p)}
                  className="border-cl-verde/40 text-cl-verde-escuro"
                >
                  <Pencil className="size-3 mr-1" /> Editar
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {(criando || editing) && (
        <ProdutoFormDialog
          produto={editing}
          onClose={() => {
            setEditing(null);
            setCriando(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCriando(false);
            recarregar();
          }}
        />
      )}
    </>
  );
}

function ProdutoFormDialog({
  produto,
  onClose,
  onSaved,
}: {
  produto: Produto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!produto;
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [custo, setCusto] = useState(
    produto ? String(Number(produto.custo_reais ?? 0).toFixed(2)).replace(".", ",") : "",
  );
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    const custoNum = Number(custo.replace(/\./g, "").replace(",", "."));
    if (!nome.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    if (!Number.isFinite(custoNum) || custoNum < 0) {
      toast.error("Custo inválido.");
      return;
    }
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      custo_reais: custoNum,
      ativo,
    };
    const { error } = isEdit
      ? await supabase.from("produtos").update(payload).eq("id", produto!.id)
      : await supabase.from("produtos").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Não consegui salvar o produto.");
      return;
    }
    toast.success(isEdit ? "Produto atualizado." : "Produto criado.");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-cl-verde-escuro">
            {isEdit ? "Editar produto" : "Novo produto"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="p-nome" className="text-cl-verde-escuro">
              Nome
            </Label>
            <Input
              id="p-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Chopp"
              className="mt-1 bg-white"
            />
          </div>
          <div>
            <Label htmlFor="p-custo" className="text-cl-verde-escuro">
              Custo (R$)
            </Label>
            <Input
              id="p-custo"
              inputMode="decimal"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
              placeholder="0,00"
              className="mt-1 bg-white tabular-nums"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/70 border border-cl-verde/15 px-3 py-2">
            <div>
              <p className="text-cl-verde-escuro font-medium">Ativo</p>
              <p className="text-[11px] text-cl-cinza-texto">
                Disponível para vincular como prêmio
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="size-4 mr-1" /> Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={saving}
            className="bg-cl-verde hover:bg-cl-verde-escuro text-white"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Salvando…
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" /> Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
