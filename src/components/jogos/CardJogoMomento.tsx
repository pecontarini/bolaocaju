import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Jogo, formatarDataJogo } from "@/lib/jogos";
import { Bandeira } from "./Bandeira";

export function CardJogoMomento({ jogo }: { jogo: Jogo }) {
  const podePalpitar = !jogo.palpites_encerrados;
  return (
    <section
      className="rounded-2xl bg-card border-2 border-cl-verde shadow-sm overflow-hidden"
      aria-labelledby="jogo-momento-titulo"
    >
      <div className="bg-cl-verde text-white px-4 py-2 flex items-center justify-between">
        <span className="font-display text-sm tracking-wide uppercase">
          Jogo do momento
        </span>
        <Badge className="bg-cl-laranja text-cl-verde-escuro hover:bg-cl-laranja font-semibold animate-pulse">
          AO VIVO
        </Badge>
      </div>

      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <img
          src="/assets/08-selo-circular-verde.png"
          alt=""
          className="size-20 shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="flex-1 min-w-0">
          <h2
            id="jogo-momento-titulo"
            className="font-display text-cl-verde-escuro text-xl leading-tight"
          >
            {jogo.time_a} <span className="text-cl-cinza-texto">x</span>{" "}
            {jogo.time_b}
          </h2>
          <p className="text-sm text-cl-cinza-texto mt-1">
            {formatarDataJogo(jogo.data_hora_inicio)}
          </p>
          {jogo.estadio && (
            <p className="text-xs text-cl-cinza-texto/80 mt-0.5 truncate">
              {jogo.estadio} {jogo.cidade ? `• ${jogo.cidade}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-4 mt-2 text-center">
        <TimeBlock nome={jogo.time_a} codigo={jogo.codigo_a} />
        <TimeBlock nome={jogo.time_b} codigo={jogo.codigo_b} />
      </div>

      <div className="px-4 pb-4">
        <Button
          asChild
          disabled={!podePalpitar}
          className="w-full h-14 text-base font-semibold bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl shadow-md"
        >
          <Link to="/palpitar">
            {podePalpitar ? "PALPITAR" : "Palpites encerrados"}
          </Link>
        </Button>
      </div>
    </section>
  );
}

function TimeBlock({ nome, codigo }: { nome: string; codigo: string | null }) {
  return (
    <div className="bg-cl-verde-claro/60 rounded-xl py-3 px-2">
      <div className="flex justify-center">
        <Bandeira codigo={codigo} tamanho={32} />
      </div>
      <div className="mt-1 text-xs font-semibold text-cl-verde-escuro uppercase tracking-wide">
        {codigo ?? ""}
      </div>
      <div className="text-[11px] text-cl-cinza-texto truncate">{nome}</div>
    </div>
  );
}
