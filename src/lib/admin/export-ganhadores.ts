import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarDataHoraBR } from "@/lib/admin/jogo-helpers";

export type GanhadorExport = {
  comanda: number | null;
  clientes: { nome: string | null; telefone: string | null } | null;
  marca_slug: string | null;
  unidade_nome: string | null;
};

export type JogoExport = {
  numero_jogo: number;
  time_a: string;
  time_b: string;
  codigo_a: string | null;
  codigo_b: string | null;
  placar_a: number | null;
  placar_b: number | null;
  data_hora_inicio: string;
};

export type BrandingExport = {
  nomeExibicao: string;
  logoSrc: string;
};

function placarTexto(j: JogoExport) {
  return `${j.time_a} ${j.placar_a ?? "-"} x ${j.placar_b ?? "-"} ${j.time_b}`;
}

function nomeBase(j: JogoExport) {
  const safe = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return `ganhadores-jogo-${j.numero_jogo}-${safe(j.time_a)}x${safe(j.time_b)}`;
}

function nomeBaseGeral() {
  const stamp = format(new Date(), "yyyy-MM-dd-HHmm");
  return `ganhadores-todos-jogos-${stamp}`;
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

export function exportarGanhadoresCSV(jogo: JogoExport, lista: GanhadorExport[]) {
  const placar = placarTexto(jogo);
  const data = formatarDataHoraBR(jogo.data_hora_inicio);
  const jogoLabel = `#${jogo.numero_jogo} ${jogo.time_a} x ${jogo.time_b}`;
  const cabecalho = ["Marca", "Unidade", "Comanda", "Nome", "Telefone", "Placar", "Jogo", "Data"];
  const linhas = lista.map((g) => [
    g.marca_slug ?? "",
    g.unidade_nome ?? "",
    g.comanda ?? "",
    g.clientes?.nome ?? "",
    g.clientes?.telefone ?? "",
    placar,
    jogoLabel,
    data,
  ]);
  const csv = [cabecalho, ...linhas]
    .map((row) => row.map(escapeCSV).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  disparaDownload(blob, `${nomeBase(jogo)}.csv`);
}

async function carregarLogoDataURL(src: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
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
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--cl-verde").trim();
  if (!raw) return [47, 89, 26];
  // tenta hex
  const hex = raw.replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  // tenta rgb()
  const m = raw.match(/(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  return [47, 89, 26];
}

function agrupar(lista: GanhadorExport[]) {
  const porMarca = new Map<string, Map<string, GanhadorExport[]>>();
  for (const g of lista) {
    const m = g.marca_slug ?? "—";
    const u = g.unidade_nome ?? "—";
    if (!porMarca.has(m)) porMarca.set(m, new Map());
    const subm = porMarca.get(m)!;
    if (!subm.has(u)) subm.set(u, []);
    subm.get(u)!.push(g);
  }
  return porMarca;
}

export async function exportarGanhadoresPDF(
  jogo: JogoExport,
  lista: GanhadorExport[],
  branding: BrandingExport,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const cor = corPrimariaRGB();
  const margem = 40;

  // Faixa de cabeçalho
  doc.setFillColor(cor[0], cor[1], cor[2]);
  doc.rect(0, 0, pageW, 90, "F");

  // Logo
  const logo = await carregarLogoDataURL(branding.logoSrc);
  let textX = margem;
  if (logo) {
    const altura = 50;
    const largura = (logo.w / logo.h) * altura;
    try {
      doc.addImage(logo.dataUrl, "PNG", margem, 20, largura, altura);
      textX = margem + largura + 16;
    } catch {
      // ignora se formato não suportado
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Bolão ${branding.nomeExibicao} — Ganhadores`, textX, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    `Jogo #${jogo.numero_jogo} • ${placarTexto(jogo)}`,
    textX,
    60,
  );
  doc.setFontSize(9);
  doc.text(formatarDataHoraBR(jogo.data_hora_inicio), textX, 76);

  // Resumo
  doc.setTextColor(0, 0, 0);
  const comandas = new Set(lista.map((g) => g.comanda).filter((c) => c != null)).size;
  doc.setFontSize(10);
  doc.text(`Total de comandas ganhadoras: ${comandas}`, margem, 115);

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

    for (const [unidade, gs] of porUnidade.entries()) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`${unidade}  (${gs.length})`, margem, cursorY);
      cursorY += 6;

      autoTable(doc, {
        startY: cursorY,
        margin: { left: margem, right: margem },
        head: [["Comanda", "Nome", "Telefone"]],
        body: gs.map((g) => [
          g.comanda ?? "—",
          g.clientes?.nome ?? "—",
          g.clientes?.telefone ?? "—",
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: cor, textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 240] },
      });
      // @ts-expect-error lastAutoTable injetado pelo autotable
      cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 18;
    }
  }

  // Rodapé com numeração
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const emitido = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    doc.text(`Emitido em ${emitido}`, margem, 820);
    doc.text(`Página ${i}/${total}`, pageW - margem, 820, { align: "right" });
  }

  doc.save(`${nomeBase(jogo)}.pdf`);
}

export type JogoComGanhadores = { jogo: JogoExport; lista: GanhadorExport[] };

export function exportarTodosGanhadoresCSV(itens: JogoComGanhadores[]) {
  const cabecalho = ["Jogo", "Data", "Placar", "Marca", "Unidade", "Comanda", "Nome", "Telefone"];
  const linhas: unknown[][] = [];
  for (const { jogo, lista } of itens) {
    const placar = placarTexto(jogo);
    const data = formatarDataHoraBR(jogo.data_hora_inicio);
    const jogoLabel = `#${jogo.numero_jogo} ${jogo.time_a} x ${jogo.time_b}`;
    for (const g of lista) {
      linhas.push([
        jogoLabel,
        data,
        placar,
        g.marca_slug ?? "",
        g.unidade_nome ?? "",
        g.comanda ?? "",
        g.clientes?.nome ?? "",
        g.clientes?.telefone ?? "",
      ]);
    }
  }
  const csv = [cabecalho, ...linhas]
    .map((row) => row.map(escapeCSV).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  disparaDownload(blob, `${nomeBaseGeral()}.csv`);
}

export async function exportarTodosGanhadoresPDF(
  itens: JogoComGanhadores[],
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
  doc.text(`Bolão ${branding.nomeExibicao} — Ganhadores (todos os jogos)`, textX, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    textX,
    62,
  );

  doc.setTextColor(0, 0, 0);
  const totalComandas = itens.reduce(
    (acc, { lista }) =>
      acc + new Set(lista.map((g) => g.comanda).filter((c) => c != null)).size,
    0,
  );
  const jogosComGanhador = itens.filter((i) => i.lista.length > 0).length;
  doc.setFontSize(10);
  doc.text(
    `Jogos com ganhadores: ${jogosComGanhador} • Total de comandas: ${totalComandas}`,
    margem,
    115,
  );

  let cursorY = 135;

  for (const { jogo, lista } of itens) {
    if (lista.length === 0) continue;
    if (cursorY > 720) {
      doc.addPage();
      cursorY = 60;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(cor[0], cor[1], cor[2]);
    doc.text(`Jogo #${jogo.numero_jogo} — ${placarTexto(jogo)}`, margem, cursorY);
    cursorY += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(formatarDataHoraBR(jogo.data_hora_inicio), margem, cursorY);
    cursorY += 10;
    doc.setDrawColor(cor[0], cor[1], cor[2]);
    doc.line(margem, cursorY, pageW - margem, cursorY);
    cursorY += 10;

    const grupos = agrupar(lista);
    for (const [marca, porUnidade] of grupos.entries()) {
      for (const [unidade, gs] of porUnidade.entries()) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`${marca.toUpperCase()} • ${unidade}  (${gs.length})`, margem, cursorY);
        cursorY += 6;
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margem, right: margem },
          head: [["Comanda", "Nome", "Telefone"]],
          body: gs.map((g) => [
            g.comanda ?? "—",
            g.clientes?.nome ?? "—",
            g.clientes?.telefone ?? "—",
          ]),
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: cor, textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 240] },
        });
        // @ts-expect-error lastAutoTable injetado pelo autotable
        cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 14;
      }
    }
    cursorY += 8;
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i}/${total}`, pageW - margem, 820, { align: "right" });
  }

  doc.save(`${nomeBaseGeral()}.pdf`);
}