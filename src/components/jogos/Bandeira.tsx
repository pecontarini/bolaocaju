import { useState } from "react";

export const FIFA_FLAG: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
};

type Props = {
  codigo: string | null | undefined;
  tamanho?: number;
  className?: string;
};

export function Bandeira({ codigo, tamanho = 24, className = "" }: Props) {
  const cc = codigo ? FIFA_FLAG[codigo.toUpperCase()] : undefined;
  const [erro, setErro] = useState(false);

  if (!cc || erro) {
    return (
      <span
        aria-hidden
        className={`inline-flex items-center justify-center rounded-full bg-cl-verde-claro text-cl-verde-escuro font-semibold ${className}`}
        style={{
          width: tamanho,
          height: tamanho,
          fontSize: Math.max(9, Math.round(tamanho * 0.42)),
          lineHeight: 1,
        }}
      >
        {codigo ? codigo.slice(0, 3).toUpperCase() : "?"}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/h40/${cc}.png`}
      srcSet={`https://flagcdn.com/h80/${cc}.png 2x`}
      alt={codigo ?? ""}
      onError={() => setErro(true)}
      className={`inline-block object-cover ${className}`}
      style={{
        height: tamanho,
        width: "auto",
        borderRadius: 3,
        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.15)",
      }}
    />
  );
}