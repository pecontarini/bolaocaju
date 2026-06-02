import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UltimoPalpite = {
  jogo_id: string;
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
} | null;

export type ClienteSessao = {
  telefone: string | null;
  nome: string | null;
  cliente_id: string | null;
  ultimoPalpite: UltimoPalpite;
  setCliente: (c: { telefone: string; nome: string; cliente_id: string }) => void;
  setUltimoPalpite: (p: UltimoPalpite) => void;
  limpar: () => void;
};

export const useCliente = create<ClienteSessao>()(
  persist(
    (set) => ({
      telefone: null,
      nome: null,
      cliente_id: null,
      ultimoPalpite: null,
      setCliente: ({ telefone, nome, cliente_id }) =>
        set({ telefone, nome, cliente_id }),
      setUltimoPalpite: (p) => set({ ultimoPalpite: p }),
      limpar: () =>
        set({ telefone: null, nome: null, cliente_id: null, ultimoPalpite: null }),
    }),
    { name: "bolao-caju-cliente" },
  ),
);