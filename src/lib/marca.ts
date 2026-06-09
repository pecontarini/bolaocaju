import { create } from "zustand";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SLUG_DEFAULT = "caju-limao";
export const SLUGS_CONHECIDOS = ["caju-limao", "caminito", "responsa"] as const;
export type SlugMarca = (typeof SLUGS_CONHECIDOS)[number];

export type Branding = Record<string, string> & {
  logo?: string;
  logo_branco?: string;
  icone?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  nome_exibicao?: string;
  fonte_display?: string;
  fonte_corpo?: string;
};

export type Marca = {
  id: string;
  slug: string;
  nome: string;
  branding: Branding;
};

/**
 * Resolve o slug da marca atual:
 *  1. subdomínio (caminito.boteco.app -> "caminito")
 *  2. ?marca=<slug>
 *  3. default 'caju-limao'
 * Hostnames de preview da Lovable e localhost caem direto na query/default.
 */
export function resolverSlugMarca(): string {
  if (typeof window === "undefined") return SLUG_DEFAULT;
  const url = new URL(window.location.href);
  const queryMarca = url.searchParams.get("marca")?.trim().toLowerCase();
  if (queryMarca && /^[a-z0-9-]+$/.test(queryMarca)) return queryMarca;
  return SLUG_DEFAULT;
}

type MarcaStore = {
  slug: string;
  marca: Marca | null;
  setSlug: (s: string) => void;
  setMarca: (m: Marca | null) => void;
};

export const useMarcaStore = create<MarcaStore>((set) => ({
  slug:
    typeof window === "undefined" ? SLUG_DEFAULT : resolverSlugMarca(),
  marca: null,
  setSlug: (slug) => set({ slug }),
  setMarca: (marca) => set({ marca }),
}));

export function useMarcaAtual() {
  const slug = useMarcaStore((s) => s.slug);
  const setMarca = useMarcaStore((s) => s.setMarca);
  const setSlug = useMarcaStore((s) => s.setSlug);
  const marcaGuardada = useMarcaStore((s) => s.marca);

  const host =
    typeof window === "undefined"
      ? ""
      : window.location.hostname.toLowerCase();
  const ehPreviewHost =
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");

  const q = useQuery({
    queryKey: ["marca", host, slug],
    queryFn: async (): Promise<Marca> => {
      // 1) Resolução por hostname real (domínios de produção).
      if (!ehPreviewHost) {
        const { data: porDominio, error: errDom } = await supabase
          .from("marcas")
          .select("id, slug, nome, branding")
          .eq("dominio", host)
          .eq("ativo", true)
          .maybeSingle();
        if (errDom) throw errDom;
        if (porDominio) {
          const m = porDominio as Marca;
          // eslint-disable-next-line no-console
          console.log("HOST:", host, "| marca:", m.slug);
          setMarca(m);
          setSlug(m.slug);
          return m;
        }
      }

      // 2) Resolução por slug (querystring / default).
      const { data, error } = await supabase
        .from("marcas")
        .select("id, slug, nome, branding")
        .eq("slug", slug)
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // fallback para a marca default se o slug pedido não existir
        const def = await supabase
          .from("marcas")
          .select("id, slug, nome, branding")
          .eq("slug", SLUG_DEFAULT)
          .maybeSingle();
        if (def.error) throw def.error;
        if (!def.data) throw new Error("Marca default não encontrada");
        const m = def.data as Marca;
        // eslint-disable-next-line no-console
        console.log("HOST:", host, "| marca:", m.slug, "(fallback default)");
        setMarca(m);
        return m;
      }
      const m = data as Marca;
      // eslint-disable-next-line no-console
      console.log("HOST:", host, "| marca:", m.slug);
      setMarca(m);
      return m;
    },
    staleTime: 60_000 * 5,
    refetchOnWindowFocus: false,
  });

  return {
    slug,
    marca: q.data ?? marcaGuardada,
    isLoading: q.isLoading,
    error: q.error,
  };
}

/** ID da marca atual, ou null se ainda não carregou. Hook leve para queries. */
export function useMarcaId(): string | null {
  const marca = useMarcaStore((s) => s.marca);
  return marca?.id ?? null;
}

/**
 * Helpers de branding para evitar repetir lógica em componentes.
 * Retorna URL do logo da marca atual (com fallback) e nome de exibição.
 */
const LOGO_FALLBACK_POR_SLUG: Record<string, string> = {
  "caju-limao": "caju-logo-horizontal.png",
  caminito: "caminito-escrita-colorida.png",
  responsa: "responsa-logo.png",
};
const LOGO_BRANCO_FALLBACK_POR_SLUG: Record<string, string> = {
  "caju-limao": "caju-logo-branco-fundo-verde.png",
  caminito: "caminito-escrita-branca.png",
  responsa: "responsa-logo-branco.png",
};

export function useBranding() {
  const { marca, slug } = useMarcaAtual();
  const nomeExibicao =
    marca?.branding?.nome_exibicao ?? marca?.nome ?? "Bolão";
  const slugMarca = marca?.slug ?? slug;
  const logoArquivo =
    marca?.branding?.logo ?? LOGO_FALLBACK_POR_SLUG[slugMarca];
  const logoSrc = logoArquivo
    ? `/assets/${slugMarca}/${logoArquivo}`
    : "/assets/caju-limao/caju-logo-horizontal.png";
  const logoBrancoArquivo =
    marca?.branding?.logo_branco ??
    LOGO_BRANCO_FALLBACK_POR_SLUG[slugMarca] ??
    logoArquivo;
  const logoBrancoSrc = logoBrancoArquivo
    ? `/assets/${slugMarca}/${logoBrancoArquivo}`
    : logoSrc;
  return {
    slug,
    marca,
    nomeExibicao,
    logoSrc,
    logoBrancoSrc,
    fonteDisplay: marca?.branding?.fonte_display,
  };
}