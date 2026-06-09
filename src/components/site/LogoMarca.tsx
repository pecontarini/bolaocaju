import { useState, useEffect } from "react";
import { useBranding } from "@/lib/marca";

type Props = {
  variante?: "padrao" | "branco";
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  alt?: string;
};

/**
 * Logo da marca atual com fallback gracioso: se a imagem falhar (404, etc),
 * mostra o nome_exibicao em texto na fonte display e cor primária da marca.
 * NUNCA cai para o logo de outra marca.
 */
export function LogoMarca({
  variante = "padrao",
  className,
  imgClassName,
  fallbackClassName,
  alt,
}: Props) {
  const { slug, nomeExibicao, logoSrc, logoBrancoSrc } = useBranding();
  const src = variante === "branco" ? logoBrancoSrc : logoSrc;
  const [erro, setErro] = useState(false);

  // Reset error state when brand (and therefore src) changes.
  useEffect(() => {
    setErro(false);
  }, [slug, src]);

  if (erro || !src) {
    return (
      <span
        className={fallbackClassName ?? className}
        style={{
          fontFamily: "var(--brand-font-display)",
          color:
            variante === "branco" ? "#ffffff" : "var(--cl-verde-escuro)",
        }}
      >
        {nomeExibicao}
      </span>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt ?? nomeExibicao}
      className={imgClassName ?? className}
      onError={() => setErro(true)}
    />
  );
}