import { Bandeira } from "./Bandeira";

export type LinhaClassificacao = {
  grupo: string;
  codigo: string;
  selecao: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo: number;
};

type Props = {
  grupo: string;
  linhas: LinhaClassificacao[];
  className?: string;
};

export function TabelaClassificacao({ grupo, linhas, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl overflow-hidden border border-border bg-white shadow-sm ${className}`}
    >
      <div className="px-3 py-2 bg-cl-verde-escuro flex items-center gap-2">
        <span
          className="inline-block size-1.5 rounded-full bg-cl-laranja"
          aria-hidden
        />
        <p className="font-display text-white text-sm tracking-wider">
          Grupo {grupo}
        </p>
      </div>
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="bg-cl-verde-escuro text-white text-[11px] uppercase tracking-wider">
            <th className="px-2 py-1.5 text-left font-medium w-6">#</th>
            <th className="px-1 py-1.5 text-left font-medium">Seleção</th>
            <th className="px-1.5 py-1.5 text-center font-medium w-7">J</th>
            <th className="px-1.5 py-1.5 text-center font-medium w-7">
              V
            </th>
            <th className="px-1.5 py-1.5 text-center font-medium w-7">
              E
            </th>
            <th className="px-1.5 py-1.5 text-center font-medium w-7">
              D
            </th>
            <th className="px-1.5 py-1.5 text-center font-medium w-8">SG</th>
            <th className="px-2 py-1.5 text-center font-semibold w-9">Pts</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const isBrasil = l.codigo === "BRA";
            const classificado = i < 2;
            const zebra = i % 2 === 1 && !isBrasil;
            const bg = isBrasil
              ? "bg-[#F6B26B]/60"
              : zebra
                ? "bg-[#F5F2EA]"
                : "bg-white";
            return (
              <tr
                key={l.codigo}
                className={`${bg} border-t border-border/60 ${
                  classificado ? "border-l-[3px] border-l-cl-verde" : ""
                }`}
              >
                <td className="px-2 py-1.5 text-cl-cinza-texto font-medium">
                  {i + 1}
                </td>
                <td className="px-1 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Bandeira codigo={l.codigo} tamanho={18} />
                    <span
                      className={`truncate ${
                        isBrasil
                          ? "font-semibold text-cl-verde-escuro"
                          : "text-cl-verde-escuro"
                      }`}
                    >
                      {l.selecao}
                    </span>
                  </div>
                </td>
                <td className="px-1.5 py-1.5 text-center text-cl-cinza-texto">
                  {l.jogos}
                </td>
                <td className="px-1.5 py-1.5 text-center text-cl-cinza-texto">
                  {l.vitorias}
                </td>
                <td className="px-1.5 py-1.5 text-center text-cl-cinza-texto">
                  {l.empates}
                </td>
                <td className="px-1.5 py-1.5 text-center text-cl-cinza-texto">
                  {l.derrotas}
                </td>
                <td className="px-1.5 py-1.5 text-center text-cl-cinza-texto">
                  {l.saldo > 0 ? `+${l.saldo}` : l.saldo}
                </td>
                <td className="px-2 py-1.5 text-center font-bold text-cl-verde-escuro">
                  {l.pontos}
                </td>
              </tr>
            );
          })}
          {linhas.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-3 py-4 text-center text-xs text-cl-cinza-texto"
              >
                Sem dados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function HeaderClassificacao({ titulo = "Classificação" }: { titulo?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <img
        src="/assets/08-selo-circular-verde.png"
        alt=""
        className="h-6 w-6"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <p className="font-display text-cl-verde-escuro text-sm uppercase tracking-wider">
        {titulo}
      </p>
    </div>
  );
}