import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { type Jogo } from "@/lib/jogos";
import { Bandeira } from "./Bandeira";
import { MapPin } from "lucide-react";

function horaBR(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function CardJogoAberto({ jogo }: { jogo: Jogo }) {
  const aoVivo =
    jogo.placar_a !== null && jogo.placar_b !== null;
  return (
    <article className="glass card-press rounded-2xl overflow-hidden">
      <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-cl-cinza-texto tabular">
          {horaBR(jogo.data_hora_inicio)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold ${
            aoVivo
              ? "bg-cl-laranja/20 text-cl-laranja"
              : "bg-cl-verde-claro text-cl-verde-escuro"
          }`}
        >
          <span className="pulse-dot" aria-hidden />
          {aoVivo ? "Ao vivo" : "Aberto"}
        </span>
      </div>
      <div className="px-4 pt-1 pb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TimeMini nome={jogo.time_a} codigo={jogo.codigo_a} alinhar="end" />
        {aoVivo ? (
          <span className="font-display text-cl-verde-escuro text-2xl leading-none tabular-nums px-2 py-1 rounded-lg bg-cl-verde-claro">
            {jogo.placar_a}
            <span className="text-cl-cinza-texto mx-1">×</span>
            {jogo.placar_b}
          </span>
        ) : (
          <span className="font-display text-cl-cinza-texto text-2xl leading-none">×</span>
        )}
        <TimeMini nome={jogo.time_b} codigo={jogo.codigo_b} alinhar="start" />
      </div>
      {(jogo.estadio || jogo.cidade) && (
        <div className="px-4 pb-3 flex items-center justify-center gap-1 text-[11px] text-cl-cinza-texto">
          <MapPin className="size-3" />
          <span className="truncate">
            {[jogo.estadio, jogo.cidade].filter(Boolean).join(" · ")}
          </span>
        </div>
      )}
      <div className="px-4 pb-4">
        <Button
          asChild
          className="w-full h-12 bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl font-semibold text-base shadow-[0_8px_22px_-12px_rgba(28,59,22,0.55)]"
        >
          <Link to="/palpitar/$jogoId" params={{ jogoId: jogo.id }}>
            Palpitar
          </Link>
        </Button>
      </div>
    </article>
  );
}

function TimeMini({
  nome,
  codigo,
  alinhar,
}: {
  nome: string;
  codigo: string | null;
  alinhar: "start" | "end";
}) {
  return (
    <div
      className={`flex items-center gap-2.5 min-w-0 ${alinhar === "end" ? "justify-end" : "justify-start"}`}
    >
      {alinhar === "start" && <Bandeira codigo={codigo} tamanho={36} />}
      <div className={`min-w-0 ${alinhar === "end" ? "text-right" : "text-left"}`}>
        <p className="font-display text-cl-verde-escuro text-lg leading-none truncate">
          {codigo ?? nome.slice(0, 3).toUpperCase()}
        </p>
        <p className="text-[10px] text-cl-cinza-texto truncate mt-1 uppercase tracking-wide">
          {nome}
        </p>
      </div>
      {alinhar === "end" && <Bandeira codigo={codigo} tamanho={36} />}
    </div>
  );
}