import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { StatusJogo } from "@/lib/jogos";

export const FASE_LABEL: Record<string, string> = {
  grupos: "Fase de grupos",
  "16avos": "16-avos de final",
  oitavas: "Oitavas de final",
  quartas: "Quartas de final",
  semi: "Semifinal",
  semifinal: "Semifinal",
  terceiro: "Disputa de 3º lugar",
  final: "Final",
};

export function rotuloFase(fase: string | null | undefined): string {
  if (!fase) return "—";
  return FASE_LABEL[fase] ?? fase;
}

export const STATUS_LABEL: Record<StatusJogo, string> = {
  agendado: "Agendado",
  habilitado: "Habilitado",
  ativo: "Ao vivo",
  palpites_encerrados: "Palpites encerrados",
  encerrado: "Encerrado",
};

export function statusBadgeClass(status: StatusJogo): string {
  switch (status) {
    case "ativo":
      return "bg-cl-laranja text-cl-verde-escuro";
    case "palpites_encerrados":
      return "bg-cl-aviso/20 text-cl-aviso border border-cl-aviso/40";
    case "habilitado":
      return "bg-cl-verde-claro text-cl-verde-escuro";
    case "encerrado":
      return "bg-cl-verde/15 text-cl-verde-escuro border border-cl-verde/30";
    case "agendado":
    default:
      return "bg-muted text-cl-cinza-texto";
  }
}

export function formatarDataHoraBR(iso: string): string {
  return format(new Date(iso), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR });
}

export function inicioFimDeHojeBrasilia(): { inicio: string; fim: string } {
  const agora = new Date();
  // converte "agora" pra horário Brasilia (UTC-3) sem DST
  const brasiliaMs = agora.getTime() + (agora.getTimezoneOffset() - 180) * 60_000;
  const brasilia = new Date(brasiliaMs);
  const y = brasilia.getUTCFullYear();
  const m = brasilia.getUTCMonth();
  const d = brasilia.getUTCDate();
  // início do dia em Brasília = 00:00 -03:00  => 03:00 UTC
  const inicio = new Date(Date.UTC(y, m, d, 3, 0, 0));
  const fim = new Date(Date.UTC(y, m, d + 1, 2, 59, 59));
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

export function mascararTelefoneBR(tel: string | null | undefined): string {
  if (!tel) return "—";
  const d = tel.replace(/\D/g, "");
  if (d.length < 8) return tel;
  const ddd = d.slice(2, 4);
  const ultimo4 = d.slice(-4);
  return `+55 ${ddd} 9****-${ultimo4}`;
}