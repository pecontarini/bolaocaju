import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type StatusJogo =
  | "agendado"
  | "habilitado"
  | "ativo"
  | "palpites_encerrados"
  | "encerrado";

export type Jogo = {
  id: string;
  numero_jogo: number;
  fase: string | null;
  grupo: string | null;
  rodada: number | null;
  data_hora_inicio: string;
  time_a: string;
  codigo_a: string | null;
  time_b: string;
  codigo_b: string | null;
  estadio: string | null;
  cidade: string | null;
  pais_sede: string | null;
  status: StatusJogo;
  placar_a: number | null;
  placar_b: number | null;
  palpites_encerrados: boolean | null;
  premio_descricao: string | null;
  premio_imagem_url: string | null;
  envolve_brasil: boolean | null;
};

export const formatarDataJogo = (iso: string) =>
  format(new Date(iso), "EEE, dd 'de' MMM • HH'h'mm", { locale: ptBR });

export const formatarDiaCurto = (iso: string) =>
  format(new Date(iso), "dd/MM • HH'h'mm", { locale: ptBR });

export const bandeiraEmoji = (codigo: string | null) => {
  if (!codigo || codigo.length !== 3) return "🏳️";
  // Mapa rápido para alguns países; fallback genérico.
  const map: Record<string, string> = {
    BRA: "🇧🇷", ARG: "🇦🇷", USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦",
    FRA: "🇫🇷", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ESP: "🇪🇸", POR: "🇵🇹", GER: "🇩🇪",
    ITA: "🇮🇹", NED: "🇳🇱", BEL: "🇧🇪", URU: "🇺🇾", COL: "🇨🇴",
    CHI: "🇨🇱", JPN: "🇯🇵", KOR: "🇰🇷", AUS: "🇦🇺", MAR: "🇲🇦",
    SEN: "🇸🇳", CIV: "🇨🇮", NGA: "🇳🇬", CRO: "🇭🇷", SUI: "🇨🇭",
    DEN: "🇩🇰", POL: "🇵🇱", SRB: "🇷🇸", SWE: "🇸🇪", NOR: "🇳🇴",
    ECU: "🇪🇨", PAR: "🇵🇾", PER: "🇵🇪", VEN: "🇻🇪", BOL: "🇧🇴",
    CRC: "🇨🇷", PAN: "🇵🇦", HON: "🇭🇳",
  };
  return map[codigo.toUpperCase()] ?? "🏳️";
};