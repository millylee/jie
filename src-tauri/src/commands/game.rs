use tauri::State;
use std::sync::Arc;

use crate::models::{Game, GameStatus};
use crate::services::storage::Storage;
use crate::services::shortcut;
use crate::services::icon;

#[tauri::command]
pub fn get_games(storage: State<'_, Arc<Storage>>) -> Result<Vec<Game>, String> {
    let data = storage.data.lock().map_err(|e| e.to_string())?;
    Ok(data.games.clone())
}

#[tauri::command]
pub fn add_game(file_path: String, storage: State<'_, Arc<Storage>>) -> Result<Game, String> {
    let lower = file_path.to_lowercase();

    let (exe_path, shortcut_path) = if lower.ends_with(".lnk") {
        let target = shortcut::parse_lnk(&file_path)?;
        (target, Some(file_path.clone()))
    } else if lower.ends_with(".exe") {
        (file_path.clone(), None)
    } else {
        return Err("不支持的文件格式，请拖入 .exe 或 .lnk 文件".to_string());
    };

    // Check if already exists
    {
        let data = storage.data.lock().map_err(|e| e.to_string())?;
        if data.games.iter().any(|g| g.exe_path == exe_path) {
            return Err("该游戏已经在列表中".to_string());
        }
    }

    let name = shortcut::extract_name(&exe_path);
    let icon_base64 = icon::extract_icon_base64(&exe_path).ok();

    let game = Game {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        exe_path,
        shortcut_path,
        icon_base64,
        status: GameStatus::Active,
        block_type: None,
        block_until: None,
        blocked_at: None,
        duration_minutes: None,
        elapsed_minutes: None,
        last_tick_at: None,
        original_name: None,
    };

    {
        let mut data = storage.data.lock().map_err(|e| e.to_string())?;
        data.games.push(game.clone());
    }
    storage.save()?;

    Ok(game)
}

#[tauri::command]
pub fn remove_game(game_id: String, storage: State<'_, Arc<Storage>>) -> Result<(), String> {
    let mut data = storage.data.lock().map_err(|e| e.to_string())?;

    let game = data.games.iter().find(|g| g.id == game_id);
    if let Some(g) = game {
        if g.status == GameStatus::Blocked {
            return Err("请先恢复游戏再移除".to_string());
        }
    }

    data.games.retain(|g| g.id != game_id);
    drop(data);
    storage.save()?;

    Ok(())
}
