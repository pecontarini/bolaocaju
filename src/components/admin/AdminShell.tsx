import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered, Trophy, Users, LogOut, Loader2, Menu, Package } from "lucide-react";
import { useState } from "react";

import { useAdminSession, signOutAdmin } from "@/lib/admin/auth";
import { Button } from "@/components/ui/button";
import { useMarcaAtual } from "@/lib/marca";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/jogos", label: "Jogos", icon: ListOrdered, exact: false },
  { to: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
  { to: "/admin/sorteios", label: "Ganhadores", icon: Trophy, exact: false },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, exact: false },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const auth = useAdminSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.status === "out") {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [auth.status, navigate]);

  if (auth.status !== "in") {
    return (
      <div className="min-h-screen flex items-center justify-center text-cl-verde-escuro">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeaderAdmin email={auth.session.user.email ?? ""} />
      <main className="mx-auto max-w-[480px] px-4 pt-3 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <footer className="mx-auto max-w-[480px] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center">
        <p className="text-[11px] text-cl-cinza-texto/80">
          Dados:{" "}
          <a
            href="https://www.football-data.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-cl-verde-escuro"
          >
            football-data.org
          </a>
        </p>
      </footer>
    </div>
  );
}

function HeaderAdmin({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const { nomeExibicao: nome, logoSrc } = useBranding();
  return (
    <header className="sticky top-0 z-30 glass-sticky">
      <div
        className="mx-auto max-w-[480px] flex items-center justify-between px-4"
        style={{ height: 52 }}
      >
        <Link to="/admin" className="flex items-center gap-2">
          <img
            src={logoSrc}
            alt={nome}
            className="h-9 w-auto"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (!img.dataset.fb) {
                img.dataset.fb = "1";
                img.src = "/assets/01-logo-horizontal-verde.png";
              } else {
                img.style.display = "none";
              }
            }}
          />
          <span className="ml-1 inline-flex items-center rounded-full bg-cl-verde/12 text-cl-verde-escuro text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 border border-cl-verde/25">
            Admin
          </span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
              className="text-cl-verde-escuro min-h-11 min-w-11"
            >
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-cl-verde-escuro text-white border-none w-[78%] flex flex-col"
          >
            <SheetHeader>
              <SheetTitle className="text-white font-display text-2xl">
                Painel {nome}
              </SheetTitle>
            </SheetHeader>
            <p className="text-xs text-white/70 truncate px-2">{email}</p>
            <nav
              className="mt-4 flex flex-col gap-1 px-2"
              onClick={() => setOpen(false)}
            >
              <NavLinks variant="dark" />
            </nav>
            <div className="mt-auto px-2 pb-2">
              <BotaoSair variant="dark" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function NavLinks({ variant = "light" }: { variant?: "light" | "dark" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      {NAV.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? pathname === to : pathname.startsWith(to);
        const baseDark = "text-white/90 hover:bg-white/10";
        const activeDark = "bg-white/15 font-semibold";
        const cls =
          variant === "dark"
            ? active
              ? `${baseDark} ${activeDark}`
              : baseDark
            : active
              ? "bg-cl-verde text-white"
              : "text-cl-verde-escuro hover:bg-cl-verde/10";
        return (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 rounded-lg px-3 py-3.5 text-base min-h-11 transition-colors ${cls}`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function BotaoSair({ variant = "light" }: { variant?: "light" | "dark" }) {
  const navigate = useNavigate();
  async function handle() {
    await signOutAdmin();
    navigate({ to: "/admin/login", replace: true });
  }
  return (
    <Button
      variant={variant === "dark" ? "secondary" : "outline"}
      onClick={handle}
      className={
        variant === "dark"
          ? "w-full bg-white/15 text-white hover:bg-white/25 border-none"
          : "w-full border-cl-verde/40 text-cl-verde-escuro hover:bg-cl-verde/10"
      }
    >
      <LogOut className="size-4 mr-2" /> Sair
    </Button>
  );
}

export function PageHeader({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
      <div className="min-w-0">
        <h1 className="tela-titulo">{titulo}</h1>
        {subtitulo && (
          <p className="text-[13px] sm:text-sm text-cl-cinza-texto mt-1">
            {subtitulo}
          </p>
        )}
      </div>
      {acoes && <div className="shrink-0">{acoes}</div>}
    </div>
  );
}