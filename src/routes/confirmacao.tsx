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

        <div className="mt-6 w-full rounded-2xl bg-card border-2 border-cl-verde shadow-sm p-5 text-center">
          <p className="text-[11px] uppercase tracking-wider text-cl-cinza-texto">
            Seu palpite
          </p>
          <p className="font-display text-cl-verde-escuro text-base mt-2 truncate">
            {palpite.time_a} <span className="text-cl-cinza-texto">×</span>{" "}
            {palpite.time_b}
          </p>
          <div className="mt-3 flex justify-center">
            <span className="placar-chip text-4xl px-5 py-2">
              <span>{palpite.placar_a}</span>
              <span className="x">×</span>
              <span>{palpite.placar_b}</span>
            </span>
          </div>
          {palpite.comanda != null && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-cl-laranja/20 border border-cl-laranja/40 px-3 py-1">
              <span className="text-[10px] uppercase tracking-wider text-cl-cinza-texto">
                Comanda
              </span>
              <span className="font-display text-cl-verde-escuro text-base tabular">
                #{palpite.comanda}
              </span>
            </p>
          )}
        </div>

        <p className="mt-6 font-display text-cl-verde-escuro text-lg">
          Aguarde o resultado. Boa sorte!
        </p>

        <div className="mt-6 w-full rounded-2xl bg-cl-verde-claro/30 border border-cl-verde/30 p-4 text-left">
          <p className="font-display text-cl-verde-escuro text-sm uppercase tracking-wide mb-2">
            Como funciona
          </p>
          <ul className="space-y-1.5">
            {[
              "1 aposta por jogo.",
              "As apostas encerram no apito inicial.",
              "1 chopp por comanda que acertar o placar no tempo regular.",
              "É obrigatória a presença do titular para apostar e resgatar.",
              "Para resgatar: apresente sua identidade (ou o app) e a comanda.",
            ].map((r) => (
              <li
                key={r}
                className="text-[13px] text-cl-verde-escuro flex gap-2 leading-snug"
              >
                <span className="text-cl-laranja shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

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