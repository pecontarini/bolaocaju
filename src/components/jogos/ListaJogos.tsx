import { type Jogo, bandeiraEmoji, formatarDiaCurto } from "@/lib/jogos";

export function ListaProximos({ jogos }: { jogos: Jogo[] }) {
  if (!jogos.length) {
    return (
      <p className="text-sm text-cl-cinza-texto">
        Sem próximos jogos por enquanto. Volte mais tarde!
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-xl bg-card border border-border overflow-hidden">
      {jogos.map((j) => (
        <li key={j.id} className="px-4 py-3 flex items-center gap-3">
          <div className="text-xs font-medium text-cl-cinza-texto w-24 shrink-0">
            {formatarDiaCurto(j.data_hora_inicio)}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span aria-hidden>{bandeiraEmoji(j.codigo_a)}</span>
            <span className="text-sm font-medium text-cl-verde-escuro truncate">
              {j.time_a}
            </span>
            <span className="text-cl-cinza-texto text-xs">x</span>
            <span className="text-sm font-medium text-cl-verde-escuro truncate">
              {j.time_b}
            </span>
            <span aria-hidden>{bandeiraEmoji(j.codigo_b)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ListaResultados({ jogos }: { jogos: Jogo[] }) {
  if (!jogos.length) {
    return <p className="text-sm text-cl-cinza-texto">Nenhum resultado ainda.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-xl bg-card border border-border overflow-hidden">
      {jogos.map((j) => (
        <li key={j.id} className="px-4 py-3 flex items-center gap-3">
          <div className="text-xs text-cl-cinza-texto w-16 shrink-0">
            {formatarDiaCurto(j.data_hora_inicio)}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <span aria-hidden>{bandeiraEmoji(j.codigo_a)}</span>
            <span className="text-sm font-medium text-cl-verde-escuro truncate">
              {j.codigo_a ?? j.time_a}
            </span>
          </div>
          <div className="font-display font-semibold text-cl-verde-escuro text-base tabular-nums">
            {j.placar_a ?? "-"} <span className="text-cl-cinza-texto">x</span>{" "}
            {j.placar_b ?? "-"}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 justify-end text-right">
            <span className="text-sm font-medium text-cl-verde-escuro truncate">
              {j.codigo_b ?? j.time_b}
            </span>
            <span aria-hidden>{bandeiraEmoji(j.codigo_b)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
