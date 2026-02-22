import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Game, BlockOptions, MathChallenge } from "@/types";

interface GameState {
  games: Game[];
  loaded: boolean;
  loadGames: () => Promise<void>;
  reload: () => Promise<void>;
  addGame: (filePath: string) => Promise<Game>;
  removeGame: (gameId: string) => Promise<void>;
  blockGame: (options: BlockOptions) => Promise<void>;
  restoreGame: (gameId: string) => Promise<void>;
  getMathChallenge: () => Promise<MathChallenge>;
}

export const useGameStore = create<GameState>((set, get) => ({
  games: [],
  loaded: false,

  loadGames: async () => {
    if (get().loaded) return;
    try {
      const games = await invoke<Game[]>("get_games");
      set({ games, loaded: true });
    } catch (e) {
      console.error("Failed to load games:", e);
    }
  },

  reload: async () => {
    set({ loaded: false });
    try {
      const games = await invoke<Game[]>("get_games");
      set({ games, loaded: true });
    } catch (e) {
      console.error("Failed to reload games:", e);
    }
  },

  addGame: async (filePath: string) => {
    const game = await invoke<Game>("add_game", { filePath });
    set((state) => ({ games: [...state.games, game] }));
    return game;
  },

  removeGame: async (gameId: string) => {
    try {
      await invoke("remove_game", { gameId });
      set((state) => ({
        games: state.games.filter((g) => g.id !== gameId),
      }));
    } catch (e) {
      console.error("Failed to remove game:", e);
    }
  },

  blockGame: async (options: BlockOptions) => {
    try {
      const updated = await invoke<Game>("block_game", { options });
      set((state) => ({
        games: state.games.map((g) => (g.id === updated.id ? updated : g)),
      }));
    } catch (e) {
      console.error("Failed to block game:", e);
      throw e;
    }
  },

  restoreGame: async (gameId: string) => {
    try {
      const updated = await invoke<Game>("restore_game", { gameId });
      set((state) => ({
        games: state.games.map((g) => (g.id === updated.id ? updated : g)),
      }));
    } catch (e) {
      console.error("Failed to restore game:", e);
      throw e;
    }
  },

  getMathChallenge: async () => {
    return await invoke<MathChallenge>("get_math_challenge");
  },
}));
