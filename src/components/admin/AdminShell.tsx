import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered, Trophy, Users, LogOut, Loader2, Menu } from "lucide-react";
import { useState } from "react";

import { useAdminSession, signOutAdmin } from "@/lib/admin/auth";
import { Button } from "@/components/ui/button";
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
      <FundoAreia>
        <div className="min-h-screen flex items-center justify-center text-cl-verde-escuro">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </FundoAreia>
    );
  }

  return (
    <FundoAreia>
      <div className="min-h-screen flex">
        <SidebarDesktop />
        <div className="flex-1 min-w-0">
          <TopbarMobile email={auth.session.user.email ?? ""} />
          <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</main>
        </div>
      </div>
    </FundoAreia>
  );
}

function FundoAreia({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* blobs decorativos */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-[420px] rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--cl-verde-claro)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-32 size-[360px] rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--cl-laranja)" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function SidebarDesktop() {
  return (
    <aside className="hidden md:flex md:w-64 shrink-0 sticky top-0 h-screen p-3">
      <div className="glass rounded-3xl flex flex-col w-full p-4">
        <Link to="/admin" className="flex items-center justify-center mb-4 mt-2">
          <img
            src="/assets/01-logo-horizontal-verde.png"
            alt="Caju Limão"
            className="h-14 w-auto"
          />
        </Link>
        <p className="text-[11px] text-center text-cl-cinza-texto uppercase tracking-widest mb-6">
          Painel administrativo
        </p>
        <NavLinks />
        <div className="mt-auto pt-4">
          <BotaoSair />
        </div>
      </div>
    </aside>
  );
}

function TopbarMobile({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="md:hidden sticky top-0 z-30 p-3">
      <div className="glass rounded-2xl flex items-center justify-between px-3 py-2">
        <Link to="/admin" className="flex items-center">
          <img
            src="/assets/01-logo-horizontal-verde.png"
            alt="Caju Limão"
            className="h-10 w-auto"
          />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
              className="text-cl-verde-escuro"
            >
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-cl-verde-escuro text-white border-none w-[80%] flex flex-col"
          >
            <SheetHeader>
              <SheetTitle className="text-white font-display text-xl text-left">
                Painel admin
              </SheetTitle>
            </SheetHeader>
            <p className="text-xs text-white/70 truncate">{email}</p>
            <nav className="mt-4 flex flex-col gap-1" onClick={() => setOpen(false)}>
              <NavLinks variant="dark" />
            </nav>
            <div className="mt-auto">
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
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? pathname === to : pathname.startsWith(to);
        const baseLight =
          "text-cl-verde-escuro hover:bg-cl-verde/10";
        const activeLight = "bg-cl-verde text-white hover:bg-cl-verde";
        const baseDark = "text-white/90 hover:bg-white/10";
        const activeDark = "bg-white/15 font-semibold";
        const cls =
          variant === "dark"
            ? active
              ? `${baseDark} ${activeDark}`
              : baseDark
            : active
              ? activeLight
              : baseLight;
        return (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${cls}`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
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
        <h1 className="font-display text-cl-verde-escuro text-2xl sm:text-3xl leading-tight">
          {titulo}
        </h1>
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