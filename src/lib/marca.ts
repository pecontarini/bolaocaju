import { create } from "zustand";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SLUG_DEFAULT = "caju-limao";
export const SLUGS_CONHECIDOS = ["caju-limao", "caminito", "responsa"] as const;
export type SlugMarca = (typeof SLUGS_CONHECIDOS)[number];

export type Branding = Record<string, unknown> & {
  logo?: string;
  logo_branco?: string;
  icone?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  nome_exibicao?: string;
  fonte_display?: string;
  fonte_corpo?: string;
  usar_texturas?: boolean;
};

export type Marca = {
  id: string;
  slug: string;
  nome: string;
  branding: Branding;
};

/**
 * Resolve apenas o slug pedido por querystring.
 * A marca real é resolvida assincronamente por hostname antes de qualquer default.
 */
export function resolverSlugMarca(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const queryMarca = url.searchParams.get("marca")?.trim().toLowerCase();
  if (queryMarca && /^[a-z0-9-]+$/.test(queryMarca)) return queryMarca;
  return null;
}

type MarcaStore = {
  slug: string | null;
  marca: Marca | null;
  setSlug: (s: string | null) => void;
  setMarca: (m: Marca | null) => void;
};

export const useMarcaStore = create<MarcaStore>((set) => ({
  slug: typeof window === "undefined" ? null : resolverSlugMarca(),
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
  const q = useQuery({
    queryKey: ["marca", host, slug],
    queryFn: async (): Promise<Marca> => {
      let marca: Marca | null = null;

      // a) Resolução prioritária por hostname.
      if (host) {
        const { data: porDominio, error } = await supabase
          .from("marcas")
          .select("*")
          .eq("dominio", host)
          .maybeSingle();
        if (error) throw error;
        if (porDominio) marca = porDominio as Marca;
      }

      // b) Fallback por querystring/preview/dev.
      if (!marca) {
        const slugQuery =
          typeof window === "undefined"
            ? slug
            : new URLSearchParams(window.location.search).get("marca")?.trim().toLowerCase() ?? slug;
        if (slugQuery && /^[a-z0-9-]+$/.test(slugQuery)) {
          const { data, error } = await supabase
            .from("marcas")
            .select("*")
            .eq("slug", slugQuery)
            .maybeSingle();
          if (error) throw error;
          if (data) marca = data as Marca;
        }
      }

      // c) Default somente depois de hostname e querystring falharem.
      if (!marca) {
        const { data, error } = await supabase
          .from("marcas")
          .select("*")
          .eq("slug", SLUG_DEFAULT)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Marca default não encontrada");
        marca = data as Marca;
      }

      // eslint-disable-next-line no-console
      console.log("HOST:", host, "| marca:", marca?.slug);
      setMarca(marca);
      setSlug(marca.slug);
      return marca;
    },
    staleTime: 60_000 * 5,
    refetchOnWindowFocus: false,
  });

  return {
    slug: q.data?.slug ?? marcaGuardada?.slug ?? slug ?? SLUG_DEFAULT,
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
 * Indica se a marca atual deve renderizar texturas/azulejos de fundo
 * (faixa azulejos, textura geométrica, textura floral, marca d'água).
 * Hoje só está ativo para marcas com `branding.usar_texturas === true`
 * (ex.: Caju Limão). Demais marcas usam fundo limpo.
 */
export function useUsarTexturas(): boolean {
  const marca = useMarcaStore((s) => s.marca);
  return marca?.branding?.usar_texturas === true;
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
  const slugMarca = marca?.slug ?? slug ?? SLUG_DEFAULT;
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