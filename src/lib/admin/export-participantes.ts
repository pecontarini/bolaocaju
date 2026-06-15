import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarDataHoraBR } from "@/lib/admin/jogo-helpers";

export type ParticipanteExport = {
  marca_slug: string | null;
  unidade_nome: string | null;
  nome: string | null;
  telefone: string | null;
  comanda: number | null;
  time_a: string | null;
  time_b: string | null;
  placar_a: number | null;
  placar_b: number | null;
  acertou: boolean | null;
  criado_em: string;
};

export type BrandingExport = {
  nomeExibicao: string;
  logoSrc: string;
};

function nomeBase() {
  const stamp = format(new Date(), "yyyy-MM-dd-HHmm");
  return `participantes-${stamp}`;
}

function disparaDownload(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function placar(p: ParticipanteExport) {
  return `${p.time_a ?? "—"} ${p.placar_a ?? "-"} x ${p.placar_b ?? "-"} ${p.time_b ?? "—"}`;
}

export function exportarParticipantesCSV(lista: ParticipanteExport[]) {
  const cabecalho = [
    "Marca",
    "Unidade",
    "Comanda",
    "Nome",
    "Telefone",
    "Time A",
    "Time B",
    "Placar A",
    "Placar B",
    "Acertou",
    "Data do palpite",
  ];
  const linhas = lista.map((p) => [
    p.marca_slug ?? "",
    p.unidade_nome ?? "",
    p.comanda ?? "",
    p.nome ?? "",
    p.telefone ?? "",
    p.time_a ?? "",
    p.time_b ?? "",
    p.placar_a ?? "",
    p.placar_b ?? "",
    p.acertou ? "Sim" : "Não",
    formatarDataHoraBR(p.criado_em),
  ]);
  const csv = [cabecalho, ...linhas]
    .map((row) => row.map(escapeCSV).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  disparaDownload(blob, `${nomeBase()}.csv`);
}

async function carregarLogoDataURL(
  src: string,
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

function corPrimariaRGB(): [number, number, number] {
  if (typeof window === "undefined") return [47, 89, 26];
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--cl-verde")
    .trim();
  if (!raw) return [47, 89, 26];
  const hex = raw.replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const m = raw.match(/(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  return [47, 89, 26];
}

function agrupar(lista: ParticipanteExport[]) {
  const porMarca = new Map<string, Map<string, ParticipanteExport[]>>();
  for (const p of lista) {
    const m = p.marca_slug ?? "—";
    const u = p.unidade_nome ?? "—";
    if (!porMarca.has(m)) porMarca.set(m, new Map());
    const subm = porMarca.get(m)!;
    if (!subm.has(u)) subm.set(u, []);
    subm.get(u)!.push(p);
  }
  return porMarca;
}

export async function exportarParticipantesPDF(
  lista: ParticipanteExport[],
  branding: BrandingExport,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const cor = corPrimariaRGB();
  const margem = 40;

  doc.setFillColor(cor[0], cor[1], cor[2]);
  doc.rect(0, 0, pageW, 90, "F");

  const logo = await carregarLogoDataURL(branding.logoSrc);
  let textX = margem;
  if (logo) {
    const altura = 50;
    const largura = (logo.w / logo.h) * altura;
    try {
      doc.addImage(logo.dataUrl, "PNG", margem, 20, largura, altura);
      textX = margem + largura + 16;
    } catch {
      // ignora
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(
    `Bolão ${branding.nomeExibicao} — Participantes`,
    textX,
    42,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    textX,
    62,
  );

  doc.setTextColor(0, 0, 0);
  const comandas = new Set(
    lista.map((p) => p.comanda).filter((c) => c != null),
  ).size;
  doc.setFontSize(10);
  doc.text(
    `Total de palpites: ${lista.length} • Comandas distintas: ${comandas}`,
    margem,
    115,
  );

  const grupos = agrupar(lista);
  let cursorY = 135;

  for (const [marca, porUnidade] of grupos.entries()) {
    if (cursorY > 720) {
      doc.addPage();
      cursorY = 60;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(cor[0], cor[1], cor[2]);
    doc.text(marca.toUpperCase(), margem, cursorY);
    cursorY += 6;
    doc.setDrawColor(cor[0], cor[1], cor[2]);
    doc.line(margem, cursorY, pageW - margem, cursorY);
    cursorY += 12;

    for (const [unidade, ps] of porUnidade.entries()) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`${unidade}  (${ps.length})`, margem, cursorY);
      cursorY += 6;

      autoTable(doc, {
        startY: cursorY,
        margin: { left: margem, right: margem },
        head: [["Comanda", "Nome", "Telefone", "Palpite", "Acertou", "Data"]],
        body: ps.map((p) => [
          p.comanda ?? "—",
          p.nome ?? "—",
          p.telefone ?? "—",
          placar(p),
          p.acertou ? "Sim" : "Não",
          formatarDataHoraBR(p.criado_em),
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: cor, textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 240] },
      });
      // @ts-expect-error lastAutoTable injetado pelo autotable
      cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 18;
    }
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i}/${total}`, pageW - margem, 820, { align: "right" });
  }

  doc.save(`${nomeBase()}.pdf`);
}