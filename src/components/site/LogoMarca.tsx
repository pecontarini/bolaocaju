import { useState } from "react";
import { useMarcaAtual } from "@/lib/marca";

type Props = {
  variante?: "padrao" | "branco";
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  alt?: string;
};

/**
 * Logo da marca atual. Lê marca.branding.logo (URL completa do Storage) e
 * SOMENTE cai para o nome em texto se a URL não existir ou a imagem
 * falhar de verdade ao carregar. Cada instância tem seu próprio estado.
 */
export function LogoMarca({
  variante = "padrao",
  className,
  imgClassName,
  fallbackClassName,
  alt,
}: Props) {
  const { marca } = useMarcaAtual();
  const [falhou, setFalhou] = useState(false);

  const logoUrl =
    variante === "branco"
      ? marca?.branding?.logo_branco ?? marca?.branding?.logo
      : marca?.branding?.logo;
  const nome =
    marca?.branding?.nome_exibicao ?? marca?.nome ?? "Bolão";
  const cor =
    variante === "branco"
      ? "#ffffff"
      : marca?.branding?.cor_primaria ?? "var(--cl-verde-escuro)";
  const fonte =
    marca?.branding?.fonte_display
      ? `"${marca.branding.fonte_display}", serif`
      : "var(--brand-font-display)";

  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("LOGO URL:", logoUrl);
  }

  if (!logoUrl || falhou) {
    return (
      <span
        className={fallbackClassName ?? className}
        style={{ fontFamily: fonte, color: cor, fontWeight: 700, lineHeight: 1.1 }}
      >
        {nome}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={alt ?? nome}
      className={imgClassName ?? className}
      onError={() => setFalhou(true)}
    />
  );
}