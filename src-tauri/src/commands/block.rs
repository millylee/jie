use std::sync::Arc;
use tauri::State;
use chrono::{Utc, Duration};

use crate::models::{BlockOptions, BlockType, GameStatus};
use crate::services::storage::Storage;
use crate::services::file_ops;

#[tauri::command]
pub fn block_game(
    options: BlockOptions,
    storage: State<'_, Arc<Storage>>,
    vault_dir: State<'_, String>,
) -> Result<crate::models::Game, String> {
    let mut data = storage.data.lock().map_err(|e| e.to_string())?;

    let game = data
        .games
        .iter_mut()
        .find(|g| g.id == options.game_id)
        .ok_or("游戏不存在")?;

    if game.status == GameStatus::Blocked {
        return Err("游戏已经被封锁".to_string());
    }

    // Execute file operation (rename)
    let result = file_ops::block_file(&game.exe_path)?;

    // Block shortcut if exists
    if let Some(ref shortcut) = game.shortcut_path {
        if let Err(e) = file_ops::block_shortcut(shortcut, &vault_dir) {
            log::error!("封锁快捷方式失败: {}", e);
        }
    }

    // Update game state
    game.status = GameStatus::Blocked;
    game.blocked_at = Some(Utc::now().to_rfc3339());
    game.original_name = result.original_name;

    match options.block_type {
        BlockType::Permanent => {
            game.block_type = Some(BlockType::Permanent);
            game.block_until = None;
            game.duration_minutes = None;
            game.elapsed_minutes = None;
            game.last_tick_at = None;
        }
        BlockType::Timed => {
            let minutes = options.duration_minutes.unwrap_or(1440);
            let now = Utc::now();
            let until = now + Duration::minutes(minutes);
            game.block_type = Some(BlockType::Timed);
            game.block_until = Some(until.to_rfc3339());
            game.duration_minutes = Some(minutes);
            game.elapsed_minutes = Some(0);
            game.last_tick_at = Some(now.to_rfc3339());
        }
    }

    let updated = game.clone();
    drop(data);
    storage.save()?;

    Ok(updated)
}
