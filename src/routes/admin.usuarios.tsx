import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AdminShell, PageHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatarDataHoraBR } from "@/lib/admin/jogo-helpers";

export const Route = createFileRoute("/admin/usuarios")({
  component: () => (
    <AdminShell>
      <UsuariosPage />
    </AdminShell>
  ),
});

type AdminRow = {
  id: string;
  nome: string | null;
  email: string | null;
  criado_em: string;
};

function UsuariosPage() {
  const qc = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admins")
        .select("id, nome, email, criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });

  return (
    <>
      <PageHeader
        titulo="Usuários"
        subtitulo="Logins da equipe com acesso ao painel."
        acoes={
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger asChild>
              <Button className="bg-cl-verde hover:bg-cl-verde-escuro text-white">
                <Plus className="size-4 mr-1.5" />
                Novo usuário
              </Button>
            </DialogTrigger>
            <DialogNovoAdmin
              onCriado={() => {
                setDialogAberto(false);
                qc.invalidateQueries({ queryKey: ["admin", "admins"] });
              }}
            />
          </Dialog>
        }
      />

      {q.isLoading ? (
        <div className="glass rounded-2xl h-48 animate-pulse" />
      ) : q.error ? (
        <div className="glass rounded-2xl p-6 text-sm text-cl-verde-escuro text-center">
          Não foi possível carregar a lista. Talvez seu usuário não tenha
          permissão de admin.
        </div>
      ) : !q.data || q.data.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-cl-cinza-texto">
          Nenhum admin cadastrado ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {q.data.map((a) => (
            <li
              key={a.id}
              className="glass rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="size-11 shrink-0 rounded-full bg-cl-verde text-white flex items-center justify-center">
                <UserRound className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-cl-verde-escuro text-lg leading-tight truncate">
                  {a.nome ?? "—"}
                </p>
                <p className="text-xs text-cl-cinza-texto truncate">
                  {a.email ?? "—"}
                </p>
              </div>
              <p className="text-[11px] text-cl-cinza-texto shrink-0 hidden sm:block">
                Criado em {formatarDataHoraBR(a.criado_em)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function DialogNovoAdmin({ onCriado }: { onCriado: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const senhaValida = senha.length >= 8;
  const nomeValido = nome.trim().length > 0;
  const podeEnviar = nomeValido && emailValido && senhaValida && !enviando;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-criar-usuario",
        { body: { nome: nome.trim(), email: email.trim(), senha } },
      );
      if (error) {
        const msg =
          (data as { error?: string } | null)?.error ||
          error.message ||
          "Não foi possível criar o usuário.";
        toast.error(msg);
        return;
      }
      if (!data?.ok) {
        toast.error(data?.error ?? "Não foi possível criar o usuário.");
        return;
      }
      toast.success("Usuário criado");
      setNome("");
      setEmail("");
      setSenha("");
      onCriado();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro inesperado ao criar usuário.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <DialogContent className="glass border-cl-verde/20 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-cl-verde-escuro text-2xl">
          Novo usuário
        </DialogTitle>
        <DialogDescription className="text-cl-cinza-texto">
          Cria um login da equipe com acesso ao painel.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="nome" className="text-cl-verde-escuro">
            Nome
          </Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            className="bg-white"
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-cl-verde-escuro">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@cajulimao.com"
            className="bg-white"
            autoComplete="email"
          />
          {email && !emailValido && (
            <p className="text-xs text-destructive">
              Informe um e-mail válido.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senha" className="text-cl-verde-escuro">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="senha"
              type={mostrar ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="bg-white pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-cl-cinza-texto hover:text-cl-verde-escuro p-1"
            >
              {mostrar ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {senha && !senhaValida && (
            <p className="text-xs text-destructive">
              A senha deve ter ao menos 8 caracteres.
            </p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="submit"
            disabled={!podeEnviar}
            className="bg-cl-verde hover:bg-cl-verde-escuro text-white w-full sm:w-auto"
          >
            {enviando ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Criando…
              </>
            ) : (
              "Criar usuário"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}