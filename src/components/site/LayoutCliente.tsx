import type { ReactNode } from "react";
import { HeaderCliente } from "./HeaderCliente";

export function LayoutCliente({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-cl-cinza-bg relative"
      style={{
        backgroundImage: "url('/assets/16-textura-geometrica.png')",
        backgroundRepeat: "repeat",
        backgroundSize: "320px",
      }}
    >
      <div className="min-h-screen bg-cl-cinza-bg/92">
        <HeaderCliente />
        <main className="mx-auto max-w-[480px] px-4 py-5 pb-16">{children}</main>
      </div>
    </div>
  );
}
