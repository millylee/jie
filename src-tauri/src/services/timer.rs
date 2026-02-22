use std::sync::Arc;
use chrono::Utc;

use crate::models::{BlockType, GameStatus};
use crate::services::storage::Storage;
use crate::services::file_ops;

/// Maximum allowed real-time gap (in minutes) between two ticks.
/// If the gap exceeds this, we assume clock tampering and only count 1 minute.
/// The timer ticks every 60 seconds, so under normal conditions the gap is ~1 minute.
const MAX_TICK_GAP_MINUTES: i64 = 3;

/// Check for timed blocks that have expired and restore them.
/// Uses elapsed-minute counting to prevent clock-manipulation bypass.
pub fn check_expired_blocks(storage: &Arc<Storage>, vault_dir: &str) {
    let now = Utc::now();
    let mut data = match storage.data.lock() {
        Ok(d) => d,
        Err(_) => return,
    };

    let mut changed = false;
    for game in data.games.iter_mut() {
        if game.status != GameStatus::Blocked {
            continue;
        }
        if game.block_type != Some(BlockType::Timed) {
            continue;
        }

        let duration = match game.duration_minutes {
            Some(d) => d,
            None => {
                // Legacy data without duration_minutes: fall back to block_until comparison
                if let Some(ref until_str) = game.block_until {
                    if let Ok(until) = chrono::DateTime::parse_from_rfc3339(until_str) {
                        if now >= until {
                            try_restore(game, vault_dir, &mut changed);
                        }
                    }
                }
                continue;
            }
        };

        let elapsed = game.elapsed_minutes.unwrap_or(0);

        // Calculate how many real minutes passed since the last tick
        let real_delta = if let Some(ref last_str) = game.last_tick_at {
            if let Ok(last) = chrono::DateTime::parse_from_rfc3339(last_str) {
                let delta = now.signed_duration_since(last).num_minutes();
                // If clock went backwards or jumped too far forward, cap to 1 minute
                if delta < 0 || delta > MAX_TICK_GAP_MINUTES {
                    1
                } else {
                    delta
                }
            } else {
                1
            }
        } else {
            1
        };

        let new_elapsed = elapsed + real_delta;
        game.elapsed_minutes = Some(new_elapsed);
        game.last_tick_at = Some(now.to_rfc3339());

        // Update block_until to reflect the real remaining time (for frontend display)
        let remaining = duration - new_elapsed;
        if remaining > 0 {
            let new_until = now + chrono::Duration::minutes(remaining);
            game.block_until = Some(new_until.to_rfc3339());
        }

        changed = true;

        if new_elapsed >= duration {
            try_restore(game, vault_dir, &mut changed);
        }
    }

    drop(data);
    if changed {
        storage.save().ok();
    }
}

fn try_restore(
    game: &mut crate::models::Game,
    vault_dir: &str,
    changed: &mut bool,
) {
    let result = file_ops::restore_file(&game.exe_path);
    if result.is_ok() {
        // Restore shortcut if exists
        if let Some(ref shortcut) = game.shortcut_path {
            if let Err(e) = file_ops::restore_shortcut(shortcut, vault_dir) {
                log::error!("自动恢复快捷方式失败: {}", e);
            }
        }

        game.status = GameStatus::Active;
        game.block_type = None;
        game.block_until = None;
        game.blocked_at = None;
        game.original_name = None;
        game.duration_minutes = None;
        game.elapsed_minutes = None;
        game.last_tick_at = None;
        *changed = true;
        log::info!("Auto-restored expired block for: {}", game.name);
    } else {
        log::error!("Failed to auto-restore {}: {:?}", game.name, result);
    }
}
