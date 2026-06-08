import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useMarcaAtual } from "@/lib/marca";

const navItens = [
  { to: "/", label: "Início" },
  { to: "/meus-palpites", label: "Meus palpites" },
  { to: "/sobre-copa", label: "Sobre a Copa" },
] as const;

export function HeaderCliente() {
  const [open, setOpen] = useState(false);
  const { marca, slug } = useMarcaAtual();
  const nomeExibicao =
    marca?.branding?.nome_exibicao ?? marca?.nome ?? "Bolão";
  const logoArquivo =
    marca?.branding?.logo ?? "01-logo-horizontal-verde.png";
  const logoSrc = marca
    ? `/assets/${marca.slug}/${logoArquivo}`
    : "/assets/01-logo-horizontal-verde.png";
  const logoFallback = "/assets/01-logo-horizontal-verde.png";
  return (
    <header className="sticky top-0 z-30 glass-sticky">
      <div className="mx-auto max-w-[480px] flex items-center justify-between px-4 h-13" style={{ height: 52 }}>
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img
            key={slug}
            src={logoSrc}
            alt={nomeExibicao}
            className="h-9 w-auto shrink-0"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (!img.dataset.fb) {
                img.dataset.fb = "1";
                img.src = logoFallback;
              } else {
                img.style.display = "none";
                const sibling = img.nextElementSibling as HTMLElement | null;
                if (sibling) sibling.classList.remove("sr-only");
              }
            }}
          />
          <span className="sr-only font-display text-lg text-cl-verde-escuro truncate">
            {nomeExibicao}
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
            className="bg-cl-verde-escuro text-white border-none w-[78%]"
          >
            <SheetHeader>
              <SheetTitle className="text-white font-display text-2xl">
                {nomeExibicao}
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1 px-2">
              {navItens.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="py-3.5 px-3 rounded-lg text-base min-h-11 flex items-center hover:bg-white/10 transition-colors"
                  activeProps={{ className: "bg-white/15 font-semibold" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <p className="absolute bottom-6 left-6 right-6 text-xs text-white/70">
              Bolão oficial {nomeExibicao} • Copa do Mundo FIFA 2026
            </p>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
