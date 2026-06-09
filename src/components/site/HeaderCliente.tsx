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
import { useBranding } from "@/lib/marca";
import { LogoMarca } from "@/components/site/LogoMarca";

const navItens = [
  { to: "/", label: "Início" },
  { to: "/meus-palpites", label: "Meus palpites" },
  { to: "/sobre-copa", label: "Sobre a Copa" },
] as const;

export function HeaderCliente() {
  const [open, setOpen] = useState(false);
  const { nomeExibicao } = useBranding();
  return (
    <header className="sticky top-0 z-30 glass-sticky">
      <div className="mx-auto max-w-[480px] flex items-center justify-between px-4 h-13" style={{ height: 52 }}>
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <LogoMarca
            imgClassName="h-9 w-auto shrink-0 max-w-[160px] object-contain"
            fallbackClassName="font-display text-base text-cl-verde-escuro truncate max-w-[160px]"
          />
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
