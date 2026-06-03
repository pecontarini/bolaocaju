import type { ReactNode } from "react";
import { HeaderCliente } from "./HeaderCliente";

export function LayoutCliente({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cl-cinza-bg">
      <HeaderCliente />
      <main className="mx-auto max-w-[480px] px-4 pt-3 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
