const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarReais(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  if (!Number.isFinite(n)) return fmt.format(0);
  return fmt.format(n);
}