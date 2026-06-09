import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarcaAtual } from "@/lib/marca";

export type Patrocinador = {
  id: string;
  nome: string;
  logo_url: string | null;
  link: string | null;
  texto_premio: string | null;
  ativo: boolean;
  marca_id: string | null;
  ordem: number | null;
};

export function usePatrocinador() {
  const { marca } = useMarcaAtual();
  const marcaId = marca?.id ?? null;
  const q = useQuery({
    queryKey: ["patrocinador", marcaId],
    enabled: !!marcaId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Patrocinador | null> => {
      const { data, error } = await supabase
        .from("patrocinadores")
        .select("*")
        .eq("ativo", true)
        .or(`marca_id.is.null,marca_id.eq.${marcaId}`)
        .order("marca_id", { nullsFirst: false })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data?.[0] as Patrocinador | undefined) ?? null;
    },
  });
  return q.data ?? null;
}

export function FaixaPatrocinio() {
  const patrocinador = usePatrocinador();
  const [falhou, setFalhou] = useState(false);
  if (!patrocinador) return null;

  const conteudo = (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-semibold">
        Patrocínio oficial
      </span>
      {patrocinador.logo_url && !falhou ? (
        <img
          src={patrocinador.logo_url}
          alt={patrocinador.nome}
          className="h-8 w-auto object-contain"
          onError={() => setFalhou(true)}
        />
      ) : (
        <span className="font-bold text-neutral-800 text-sm">
          {patrocinador.nome}
        </span>
      )}
    </div>
  );

  return (
    <div className="bg-white border-t border-neutral-200">
      <div className="mx-auto max-w-[480px] px-4 py-3 flex items-center justify-center">
        {patrocinador.link ? (
          <a
            href={patrocinador.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {conteudo}
          </a>
        ) : (
          conteudo
        )}
      </div>
    </div>
  );
}