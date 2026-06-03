import { Link } from "@tanstack/react-router";
import { type Jogo } from "@/lib/jogos";
import { Bandeira } from "./Bandeira";
import { ChevronRight } from "lucide-react";

function horaBR(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function diaBR(iso: string) {
  return new Date(iso)
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "America/Sao_Paulo",
    })
    .replace(".", "");
}

export function CardJogoAberto({ jogo }: { jogo: Jogo }) {
  const aoVivo = jogo.placar_a !== null && jogo.placar_b !== null;
  const envolveBrasil = jogo.codigo_a === "BRA" || jogo.codigo_b === "BRA";

  return (
    <Link
      to="/palpitar/$jogoId"
      params={{ jogoId: jogo.id }}
      className="block card-press"
    >
      <article
        className={`glass rounded-3xl overflow-hidden grid grid-cols-[56px_1fr_auto] items-stretch transition-shadow hover:shadow-[0_8px_28px_rgba(28,59,22,0.10)] ${
          aoVivo
            ? "ring-1 ring-cl-laranja/40"
            : envolveBrasil
              ? "ring-1 ring-cl-laranja/30"
              : ""
        }`}
      >
        {/* Coluna 1: hora/data */}
        <div className="flex flex-col items-center justify-center border-r border-border/60 py-2.5 px-1 text-cl-cinza-texto">
          <span className="text-[10px] uppercase tracking-wider">
            {diaBR(jogo.data_hora_inicio)}
          </span>
          <span className="text-[15px] font-semibold num text-cl-verde-escuro mt-0.5">
            {horaBR(jogo.data_hora_inicio)}
          </span>
        </div>

        {/* Coluna 2: times empilhados */}
        <div className="py-2 px-3 flex flex-col gap-1.5 min-w-0">
          <LinhaTime
            nome={jogo.time_a}
            codigo={jogo.codigo_a}
            placar={aoVivo ? jogo.placar_a : null}
            destaque={jogo.codigo_a === "BRA"}
          />
          <LinhaTime
            nome={jogo.time_b}
            codigo={jogo.codigo_b}
            placar={aoVivo ? jogo.placar_b : null}
            destaque={jogo.codigo_b === "BRA"}
          />
        </div>

        {/* Coluna 3: status + seta */}
        <div className="flex flex-col items-end justify-center gap-1 pr-3 pl-1 py-2">
          {aoVivo ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-cl-laranja">
              <span className="pulse-dot" aria-hidden />
              Ao vivo
            </span>
          ) : (
            <span className="badge-palpite">Palpite</span>
          )}
          <ChevronRight className="size-4 text-cl-cinza-texto" />
        </div>
      </article>
    </Link>
  );
}

function LinhaTime({
  nome,
  codigo,
  placar,
  destaque,
}: {
  nome: string;
  codigo: string | null;
  placar: number | null;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Bandeira codigo={codigo} tamanho={18} />
      <span
        className={`text-[14px] truncate flex-1 ${
          destaque
            ? "font-semibold text-cl-verde-escuro"
            : "font-medium text-cl-verde-escuro"
        }`}
      >
        {nome}
      </span>
      {placar !== null && (
        <span className="text-[15px] font-semibold num text-cl-verde-escuro tabular-nums">
          {placar}
        </span>
      )}
    </div>
  );
}