import type { ReactNode } from "react";
import { HeaderCliente } from "./HeaderCliente";

export function LayoutCliente({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <HeaderCliente />
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
