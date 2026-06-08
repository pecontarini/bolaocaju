import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UltimoPalpite = {
  jogo_id: string;
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
  comanda?: number;
} | null;

export type ClienteSessao = {
  telefone: string | null;
  nome: string | null;
  cliente_id: string | null;
  marca_id: string | null;
  ultimoPalpite: UltimoPalpite;
  setCliente: (c: {
    telefone: string;
    nome: string;
    cliente_id: string;
    marca_id: string;
  }) => void;
  setUltimoPalpite: (p: UltimoPalpite) => void;
  /** Limpa a sessão se a marca atual for diferente da gravada. */
  garantirMarca: (marca_id: string) => void;
  limpar: () => void;
};

export const useCliente = create<ClienteSessao>()(
  persist(
    (set, get) => ({
      telefone: null,
      nome: null,
      cliente_id: null,
      marca_id: null,
      ultimoPalpite: null,
      setCliente: ({ telefone, nome, cliente_id, marca_id }) =>
        set({ telefone, nome, cliente_id, marca_id }),
      setUltimoPalpite: (p) => set({ ultimoPalpite: p }),
      garantirMarca: (marca_id) => {
        const atual = get().marca_id;
        if (atual && atual !== marca_id) {
          set({
            telefone: null,
            nome: null,
            cliente_id: null,
            marca_id: null,
            ultimoPalpite: null,
          });
        }
      },
      limpar: () =>
        set({
          telefone: null,
          nome: null,
          cliente_id: null,
          marca_id: null,
          ultimoPalpite: null,
        }),
    }),
    { name: "bolao-caju-cliente" },
  ),
);