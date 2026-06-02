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

const navItens = [
  { to: "/", label: "Início" },
  { to: "/meus-palpites", label: "Meus palpites" },
  { to: "/sobre-copa", label: "Sobre a Copa" },
];

export function HeaderCliente() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border">
      <div className="mx-auto max-w-[480px] flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/assets/01-logo-horizontal-verde.png"
            alt="Caju Limão"
            className="h-12 w-auto"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="font-display text-cl-verde-escuro text-lg font-semibold sr-only">
            Bolão Caju Limão
          </span>
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
            className="bg-cl-verde-escuro text-white border-none w-[78%]"
          >
            <SheetHeader>
              <SheetTitle className="text-white font-display text-2xl">
                <img
                  src="/assets/04-logo-texto-branco-fundo-verde.png"
                  alt="Caju Limão"
                  className="h-12 w-auto"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1 px-2">
              {navItens.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="py-3 px-3 rounded-md text-base hover:bg-white/10 transition-colors"
                  activeProps={{ className: "bg-white/15 font-semibold" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <p className="absolute bottom-6 left-6 right-6 text-xs text-white/70">
              Bolão oficial Boteco Caju Limão • Copa do Mundo FIFA 2026
            </p>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}