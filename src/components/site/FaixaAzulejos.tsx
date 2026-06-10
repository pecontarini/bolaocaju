import { useUsarTexturas } from "@/lib/marca";

export function FaixaAzulejos({ className = "" }: { className?: string }) {
  const usarTexturas = useUsarTexturas();
  if (!usarTexturas) return null;
  return (
    <div
      role="presentation"
      className={`h-4 w-full bg-repeat-x bg-center ${className}`}
      style={{
        backgroundImage: "url('/assets/07-faixa-azulejos.png')",
        backgroundSize: "auto 100%",
      }}
    />
  );
}
