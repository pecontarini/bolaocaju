import { type Jogo, formatarDiaCurto } from "@/lib/jogos";
import { Bandeira } from "./Bandeira";

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
            <Bandeira codigo={j.codigo_a} tamanho={18} />
            <span className="text-sm font-medium text-cl-verde-escuro truncate">
              {j.time_a}
            </span>
            <span className="text-cl-cinza-texto text-xs">x</span>
            <span className="text-sm font-medium text-cl-verde-escuro truncate">
              {j.time_b}
            </span>
            <Bandeira codigo={j.codigo_b} tamanho={18} />
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
    <ul className="space-y-2">
      {jogos.map((j) => {
        const a = j.placar_a;
        const b = j.placar_b;
        const aVenc = a != null && b != null && a > b;
        const bVenc = a != null && b != null && b > a;
        return (
          <li
            key={j.id}
            className="glass rounded-2xl px-3 py-2.5 flex items-center gap-2"
          >
            <div className="text-[10px] uppercase tracking-wider text-cl-cinza-texto w-14 shrink-0 leading-tight">
              {formatarDiaCurto(j.data_hora_inicio)}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-1.5 justify-end">
              <span
                className={`text-sm truncate ${aVenc ? "font-display font-semibold text-cl-verde-escuro" : "text-cl-verde-escuro/80"}`}
              >
                {j.codigo_a ?? j.time_a}
              </span>
              <Bandeira codigo={j.codigo_a} tamanho={18} />
            </div>
            <span className="placar-chip text-base">
              <span>{a ?? "–"}</span>
              <span className="x">×</span>
              <span>{b ?? "–"}</span>
            </span>
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <Bandeira codigo={j.codigo_b} tamanho={18} />
              <span
                className={`text-sm truncate ${bVenc ? "font-display font-semibold text-cl-verde-escuro" : "text-cl-verde-escuro/80"}`}
              >
                {j.codigo_b ?? j.time_b}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
