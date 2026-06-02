import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ClienteSessao = {
  telefone: string | null;
  nome: string | null;
  cliente_id: string | null;
  setCliente: (c: { telefone: string; nome: string; cliente_id: string }) => void;
  limpar: () => void;
};

export const useCliente = create<ClienteSessao>()(
  persist(
    (set) => ({
      telefone: null,
      nome: null,
      cliente_id: null,
      setCliente: ({ telefone, nome, cliente_id }) =>
        set({ telefone, nome, cliente_id }),
      limpar: () => set({ telefone: null, nome: null, cliente_id: null }),
    }),
    { name: "bolao-caju-cliente" },
  ),
);