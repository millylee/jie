export interface Game {
  id: string;
  name: string;
  exe_path: string;
  shortcut_path?: string;
  icon_base64?: string;
  status: "active" | "blocked";
  block_type?: "timed" | "permanent";
  block_until?: string;
  blocked_at?: string;
  duration_minutes?: number;
  elapsed_minutes?: number;
}

export interface AppSettings {
  auto_start: boolean;
  minimize_to_tray: boolean;
  vault_path: string;
}

export interface MathChallenge {
  question: string;
  answer: number;
}

export interface BlockOptions {
  game_id: string;
  block_type: "timed" | "permanent";
  duration_minutes?: number;
}
