use std::sync::Arc;
use tauri::State;
use rand::Rng;

use crate::models::{Game, GameStatus, MathChallenge};
use crate::services::storage::Storage;
use crate::services::file_ops;

#[tauri::command]
pub fn restore_game(
    game_id: String,
    storage: State<'_, Arc<Storage>>,
    vault_dir: State<'_, String>,
) -> Result<Game, String> {
    let mut data = storage.data.lock().map_err(|e| e.to_string())?;

    let game = data
        .games
        .iter_mut()
        .find(|g| g.id == game_id)
        .ok_or("游戏不存在")?;

    if game.status != GameStatus::Blocked {
        return Err("游戏未被封锁".to_string());
    }

    // Restore file (rename back)
    file_ops::restore_file(&game.exe_path)?;

    // Restore shortcut if exists
    if let Some(ref shortcut) = game.shortcut_path {
        if let Err(e) = file_ops::restore_shortcut(shortcut, &vault_dir) {
            log::error!("恢复快捷方式失败: {}", e);
        }
    }

    // Update state
    game.status = GameStatus::Active;
    game.block_type = None;
    game.block_until = None;
    game.blocked_at = None;
    game.original_name = None;
    game.duration_minutes = None;
    game.elapsed_minutes = None;
    game.last_tick_at = None;

    let updated = game.clone();
    drop(data);
    storage.save()?;

    Ok(updated)
}

#[tauri::command]
pub fn get_math_challenge() -> MathChallenge {
    let mut rng = rand::thread_rng();

    // Generate a non-trivial math problem
    let op = rng.gen_range(0..3);
    let (question, answer) = match op {
        0 => {
            // multiplication + addition
            let a = rng.gen_range(12..50);
            let b = rng.gen_range(12..50);
            let c = rng.gen_range(10..100);
            (format!("{} × {} + {} = ?", a, b, c), (a * b + c) as i64)
        }
        1 => {
            // multiplication - subtraction
            let a = rng.gen_range(15..40);
            let b = rng.gen_range(15..40);
            let c = rng.gen_range(10..200);
            (format!("{} × {} - {} = ?", a, b, c), (a * b - c) as i64)
        }
        _ => {
            // addition of three numbers
            let a = rng.gen_range(100..500);
            let b = rng.gen_range(100..500);
            let c = rng.gen_range(100..500);
            (format!("{} + {} + {} = ?", a, b, c), (a + b + c) as i64)
        }
    };

    MathChallenge { question, answer }
}
