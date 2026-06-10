import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bandeira } from "@/components/jogos/Bandeira";
import type { Jogo } from "@/lib/jogos";
import { useUsarTexturas } from "@/lib/marca";

const FASE_LABEL: Record<string, string> = {
  fase_grupos: "Fase de grupos",
  round_de_32: "16-avos",
  oitavas: "Oitavas de final",
  quartas: "Quartas de final",
  semifinal: "Semifinal",
  disputa_terceiro: "Disputa de 3º lugar",
  final: "Final",
};

const TOTAL_JOGOS = 104;

type Props = {
  proximo: Jogo | null;
  encerrados: number;
};

function diff(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const dias = Math.floor(s / 86400);
  const horas = Math.floor((s % 86400) / 3600);
  const min = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  return { dias, horas, min, seg };
}

export function BannerCopa({ proximo, encerrados }: Props) {
  const [agora, setAgora] = useState(() => Date.now());
  const usarTexturas = useUsarTexturas();

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const antesDaCopa = encerrados === 0;
  const alvo = proximo ? new Date(proximo.data_hora_inicio).getTime() : null;
  const restante = alvo ? alvo - agora : 0;
  const c = diff(restante);

  const fase = proximo?.fase ? FASE_LABEL[proximo.fase] ?? proximo.fase : null;
  const pct = Math.min(100, Math.round((encerrados / TOTAL_JOGOS) * 100));

  return (
    <section
      aria-label="Status da Copa"
      className="relative overflow-hidden rounded-3xl bg-white border border-border shadow-sm"
    >
      {usarTexturas && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/assets/16-textura-geometrica.png')",
            backgroundRepeat: "repeat",
            backgroundSize: "260px",
            opacity: 0.06,
          }}
        />
      )}
      <div className="relative p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <Trophy
            className="text-cl-verde shrink-0"
            size={36}
            strokeWidth={1.5}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-cl-cinza-texto">
              {antesDaCopa ? "Contagem regressiva" : fase ?? "A Copa está rolando"}
            </p>
            <h2 className="font-display text-cl-verde-escuro text-xl sm:text-2xl leading-tight mt-1">
              Copa do Mundo FIFA 2026
            </h2>
          </div>
        </div>

        {/* Destaque numérico */}
        <div className="mt-6">
          {antesDaCopa && alvo ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-cl-verde-escuro text-6xl tabular-nums leading-none">
                  {c.dias}
                </span>
                <span className="text-cl-cinza-texto text-base">
                  {c.dias === 1 ? "dia" : "dias"}
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-cl-cinza-texto mt-2">
                pro pontapé inicial
              </p>
              <p className="text-sm text-cl-cinza-texto mt-1 tabular-nums">
                {c.horas}h {String(c.min).padStart(2, "0")}min{" "}
                {String(c.seg).padStart(2, "0")}s
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display font-bold text-cl-verde-escuro text-3xl leading-tight">
                {fase ?? "Em andamento"}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-cl-cinza-texto mt-2">
                fase atual
              </p>
            </div>
          )}
        </div>

        {/* Progresso */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cl-cinza-texto">
              Progresso
            </p>
            <p className="text-xs text-cl-cinza-texto tabular-nums">
              {encerrados} de {TOTAL_JOGOS} jogos
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-cl-verde-claro overflow-hidden">
            <div
              className="h-full bg-cl-verde rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Próximo jogo */}
        {proximo && (
          <div className="mt-6 pt-5 border-t border-border/70">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cl-cinza-texto">
              Próximo jogo
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Bandeira codigo={proximo.codigo_a} tamanho={26} />
              <span className="font-display text-cl-verde-escuro text-base flex-1 min-w-0 truncate">
                {proximo.codigo_a ?? proximo.time_a}
              </span>
              <span className="text-cl-cinza-texto text-sm">×</span>
              <span className="font-display text-cl-verde-escuro text-base flex-1 min-w-0 truncate text-right">
                {proximo.codigo_b ?? proximo.time_b}
              </span>
              <Bandeira codigo={proximo.codigo_b} tamanho={26} />
            </div>
            <p className="text-xs text-cl-cinza-texto mt-2">
              {format(
                new Date(proximo.data_hora_inicio),
                "EEE, dd/MM • HH'h'mm",
                { locale: ptBR },
              )}{" "}
              (Brasília)
            </p>
            {!antesDaCopa && alvo && restante > 0 && (
              <p className="text-xs text-cl-verde-escuro mt-1 tabular-nums font-medium">
                Faltam {c.dias > 0 ? `${c.dias}d ` : ""}
                {c.horas}h {String(c.min).padStart(2, "0")}min
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}