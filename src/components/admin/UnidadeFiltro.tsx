import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMarcaId } from "@/lib/marca";

export type Unidade = {
  id: string;
  nome: string;
  cidade: string | null;
};

export function useUnidadesMarca() {
  const marcaId = useMarcaId();
  return useQuery({
    queryKey: ["admin", "unidades", marcaId],
    enabled: !!marcaId,
    staleTime: 60_000 * 5,
    queryFn: async (): Promise<Unidade[]> => {
      const { data, error } = await supabase
        .from("unidades")
        .select("id,nome,cidade")
        .eq("marca_id", marcaId!)
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Unidade[];
    },
  });
}

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  className?: string;
};

export function UnidadeFiltro({ value, onChange, className }: Props) {
  const { data: unidades, isLoading } = useUnidadesMarca();
  if (isLoading) {
    return (
      <div className={`glass rounded-2xl px-3 py-2 text-xs text-cl-cinza-texto ${className ?? ""}`}>
        Carregando unidades…
      </div>
    );
  }
  if (!unidades || unidades.length <= 1) return null;
  return (
    <label
      className={`glass rounded-2xl px-3 py-2 flex items-center gap-2 text-sm text-cl-verde-escuro ${className ?? ""}`}
    >
      <MapPin className="size-4 text-cl-laranja shrink-0" />
      <span className="text-[11px] uppercase tracking-widest text-cl-cinza-texto">
        Unidade
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-transparent outline-none font-medium flex-1 min-w-0"
      >
        <option value="">Todas</option>
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
            {u.cidade ? ` — ${u.cidade}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}