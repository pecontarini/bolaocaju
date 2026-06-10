import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/lib/admin/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranding } from "@/lib/marca";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const auth = useAdminSession();
  const navigate = useNavigate();
  const { nomeExibicao, logoSrc } = useBranding();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.status === "in") {
      navigate({ to: "/admin", replace: true });
    }
  }, [auth.status, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error) {
      setLoading(false);
      const m = (error.message || "").toLowerCase();
      if (m.includes("invalid") || m.includes("credenti")) {
        toast.error("Email ou senha inválidos.");
      } else if (m.includes("network") || m.includes("fetch")) {
        toast.error("Sem conexão agora. Tente de novo em instantes.");
      } else {
        toast.error("Não consegui entrar agora. Tente de novo.");
      }
      return;
    }
    // Confere se o usuário tem perfil (loja) vinculado.
    const { data: perfil, error: perfilErr } = await supabase.rpc("fn_meu_perfil");
    const p = (perfil as Array<unknown> | null)?.[0] ?? null;
    if (perfilErr || !p) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Usuário sem loja vinculada. Procure o administrador.");
      return;
    }
    setLoading(false);
    toast.success("Bem-vindo!");
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[420px] glass rounded-3xl p-7 space-y-5"
      >
        <div className="flex flex-col items-center text-center">
          <img
            src={logoSrc}
            alt={nomeExibicao}
            className="h-14 w-auto max-w-[220px] object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="font-display font-bold text-cl-verde text-3xl mt-3 leading-tight">
            Bolão {nomeExibicao}
          </h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-cl-cinza-texto mt-1">
            Painel da gerência
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cl-verde/10 text-cl-verde-escuro text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 border border-cl-verde/20">
            Acesso restrito
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-cl-verde-escuro">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@cajulimao.com"
              className="h-11 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha" className="text-cl-verde-escuro">
              Senha
            </Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-11 bg-white"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl text-base font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" /> Entrando…
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>
    </div>
  );
}