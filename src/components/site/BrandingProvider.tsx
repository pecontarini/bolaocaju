import { useEffect, type ReactNode } from "react";
import { useMarcaAtual, useMarcaStore, type Branding } from "@/lib/marca";

/**
 * Aplica o branding da marca atual via CSS custom properties.
 * Mapeia as chaves do jsonb `branding` para os tokens existentes
 * `--cl-*` para que classes Tailwind como `bg-cl-verde` herdem a cor certa.
 */
function aplicarBranding(slug: string, branding: Branding) {
  const root = document.documentElement;
  const set = (k: string, v?: string) => {
    if (v) root.style.setProperty(k, v);
  };

  const primaria = branding.cor_primaria ?? "#2F591A";
  const secundaria =
    branding.cor_secundaria ??
    branding.cor_laranja ??
    branding.cor_apoio_laranja ??
    primaria;
  const escura =
    branding.cor_verde_escuro ??
    branding.cor_apoio_azul_escuro ??
    branding.cor_apoio_verde ??
    primaria;
  const claro =
    branding.cor_verde_claro ??
    branding.cor_creme ??
    "#E1EDB4";
  const cinzaBg =
    branding.cor_cinza_bg ??
    branding.cor_creme ??
    "#F5F2EA";

  // Tokens da marca (usados pelas classes existentes bg-cl-verde, text-cl-verde-escuro, etc.)
  set("--cl-verde", primaria);
  set("--cl-verde-escuro", escura);
  set("--cl-laranja", secundaria);
  set("--cl-verde-claro", claro);
  set("--cl-cinza-bg", cinzaBg);

  // Tokens shadcn (primary/secondary/accent)
  set("--primary", primaria);
  set("--secondary", claro);
  set("--accent", secundaria);
  set("--ring", primaria);

  // Marcador para CSS específico por marca, se necessário.
  root.dataset.marca = slug;

  // Fonte display por marca. "a definir" / vazio -> serif genérico.
  const fonte = (branding.fonte_display ?? "").trim().toLowerCase();
  let fontStack = '"Playfair Display", Georgia, serif';
  if (fonte.includes("thunder")) {
    fontStack = '"Thunder", "Playfair Display", Georgia, serif';
  } else if (fonte && !fonte.includes("definir") && !fonte.includes("playfair")) {
    // Marca com fonte custom nomeada (assume disponível via @font-face/Google Fonts)
    fontStack = `"${branding.fonte_display}", Georgia, serif`;
  } else if (fonte.includes("definir") || fonte === "") {
    fontStack = 'Georgia, "Times New Roman", serif';
  }
  // Caju sempre Playfair
  if (slug === "caju-limao") fontStack = '"Playfair Display", Georgia, serif';
  root.style.setProperty("--font-display", fontStack);

  // Título e favicon
  if (branding.nome_exibicao) {
    document.title = `Bolão ${branding.nome_exibicao} — Copa do Mundo FIFA 2026`;
  }
  if (branding.icone) {
    const href = `/assets/${slug}/${branding.icone}`;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  // Atualiza o slug do store se a URL mudar (querystring ou subdomínio).
  const setSlug = useMarcaStore((s) => s.setSlug);
  useEffect(() => {
    if (typeof window === "undefined") return;
    function syncSlug() {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("marca")?.trim().toLowerCase();
      if (q && /^[a-z0-9-]+$/.test(q)) {
        setSlug(q);
        return;
      }
      const host = url.hostname.toLowerCase();
      const ehPreview =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".lovable.app") ||
        host.endsWith(".lovableproject.com");
      if (!ehPreview) {
        const partes = host.split(".");
        if (partes.length >= 3 && partes[0] !== "www") {
          setSlug(partes[0]);
          return;
        }
      }
      setSlug("caju-limao");
    }
    syncSlug();
    window.addEventListener("popstate", syncSlug);
    return () => window.removeEventListener("popstate", syncSlug);
  }, [setSlug]);

  const { marca, slug } = useMarcaAtual();

  useEffect(() => {
    if (!marca) return;
    aplicarBranding(marca.slug, marca.branding ?? {});
  }, [marca, slug]);

  return <>{children}</>;
}