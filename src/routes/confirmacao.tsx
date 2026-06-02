import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutCliente } from "@/components/site/LayoutCliente";
import { useCliente } from "@/store/cliente";

export const Route = createFileRoute("/confirmacao")({
  component: ConfirmacaoPage,
});

function ConfirmacaoPage() {
  const palpite = useCliente((s) => s.ultimoPalpite);
  const navigate = useNavigate();

  useEffect(() => {
    if (!palpite) navigate({ to: "/", replace: true });
  }, [palpite, navigate]);

  if (!palpite) return null;

  return (
    <div
      className="min-h-screen relative bg-cl-cinza-bg"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url('/assets/15-textura-floral.png')",
        backgroundRepeat: "repeat",
        backgroundSize: "360px",
      }}
    >
      <main className="mx-auto max-w-[480px] px-5 py-10 flex flex-col items-center text-center min-h-screen">
        <img
          src="/assets/08-selo-circular-verde.png"
          alt=""
          className="size-44 md:size-48 drop-shadow-md"
        />
        <h1 className="font-display text-cl-verde-escuro text-3xl mt-6">
          Palpite registrado!
        </h1>
        <p className="text-sm text-cl-cinza-texto mt-2">
          Seu palpite foi salvo com sucesso.
        </p>

        <div className="mt-6 w-full rounded-2xl bg-card border-2 border-cl-verde shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-cl-cinza-texto">
            Seu palpite
          </p>
          <p className="font-display text-2xl text-cl-verde-escuro mt-1">
            {palpite.time_a}{" "}
            <span className="text-cl-laranja">{palpite.placar_a}</span>{" "}
            <span className="text-cl-cinza-texto">x</span>{" "}
            <span className="text-cl-laranja">{palpite.placar_b}</span>{" "}
            {palpite.time_b}
          </p>
        </div>

        <p className="mt-6 font-display text-cl-verde-escuro text-lg">
          Aguarde o resultado. Boa sorte!
        </p>

        <div className="mt-auto pt-8 w-full flex flex-col gap-2">
          <Button
            asChild
            className="w-full h-12 bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl"
          >
            <Link to="/meus-palpites">Ver meus palpites</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-12 border-cl-verde text-cl-verde-escuro hover:bg-cl-verde-claro/30 rounded-xl"
          >
            <Link to="/">Voltar pro início</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}