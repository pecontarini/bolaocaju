import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/lib/admin/auth";

export type PapelAdmin = "admin_geral" | "gerente_loja";

export type PerfilAdmin = {
  papel: PapelAdmin;
  marca_id: string | null;
  marca_slug: string | null;
  unidade_id: string | null;
  unidade_nome: string | null;
};

export function usePerfilAdmin() {
  const auth = useAdminSession();
  const userId = auth.status === "in" ? auth.session.user.id : null;
  return useQuery({
    queryKey: ["admin", "meu-perfil", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async (): Promise<PerfilAdmin | null> => {
      const { data, error } = await supabase.rpc("fn_meu_perfil");
      if (error) throw error;
      const lista = (data as PerfilAdmin[] | null) ?? [];
      return lista[0] ?? null;
    },
  });
}