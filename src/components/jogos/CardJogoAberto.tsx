import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { type Jogo } from "@/lib/jogos";
import { Bandeira } from "./Bandeira";

function horaBR(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function CardJogoAberto({ jogo }: { jogo: Jogo }) {
  return (
    <article className="glass rounded-2xl overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-cl-cinza-texto">
          {horaBR(jogo.data_hora_inicio)}
        </span>
        <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 bg-cl-laranja text-cl-verde-escuro font-semibold">
          Aberto
        </span>
      </div>
      <div className="px-4 pb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TimeMini nome={jogo.time_a} codigo={jogo.codigo_a} alinhar="end" />
        <span className="font-display text-cl-cinza-texto text-xl">×</span>
        <TimeMini nome={jogo.time_b} codigo={jogo.codigo_b} alinhar="start" />
      </div>
      <div className="px-4 pb-4">
        <Button
          asChild
          className="w-full h-11 bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl font-semibold"
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
      className={`flex items-center gap-2 min-w-0 ${alinhar === "end" ? "justify-end" : "justify-start"}`}
    >
      {alinhar === "start" && <Bandeira codigo={codigo} tamanho={22} />}
      <div className={`min-w-0 ${alinhar === "end" ? "text-right" : "text-left"}`}>
        <p className="font-display text-cl-verde-escuro text-sm leading-tight truncate">
          {codigo ?? nome}
        </p>
        <p className="text-[10px] text-cl-cinza-texto truncate">{nome}</p>
      </div>
      {alinhar === "end" && <Bandeira codigo={codigo} tamanho={22} />}
    </div>
  );
}