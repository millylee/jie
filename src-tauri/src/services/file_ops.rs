use std::fs;
use std::path::Path;

const BLOCK_SUFFIX: &str = ".jie_blocked";

/// Block a game file by renaming it.
pub fn block_file(exe_path: &str) -> Result<BlockResult, String> {
    let path = Path::new(exe_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", exe_path));
    }

    let new_name = format!("{}{}", path.to_string_lossy(), BLOCK_SUFFIX);
    fs::rename(path, &new_name).map_err(|e| format!("重命名失败: {}", e))?;
    Ok(BlockResult {
        original_name: Some(
            path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
        ),
    })
}

/// Restore a blocked game file by renaming it back.
pub fn restore_file(exe_path: &str) -> Result<(), String> {
    let blocked_path = format!("{}{}", exe_path, BLOCK_SUFFIX);
    let bp = Path::new(&blocked_path);
    if bp.exists() {
        fs::rename(bp, exe_path).map_err(|e| format!("恢复重命名失败: {}", e))?;
    }
    Ok(())
}

pub struct BlockResult {
    pub original_name: Option<String>,
}

// --- Shortcut (.lnk) operations ---

/// 封锁时：将 .lnk 快捷方式移入 vault 保险箱
pub fn block_shortcut(shortcut_path: &str, vault_dir: &str) -> Result<(), String> {
    let src = Path::new(shortcut_path);
    if !src.exists() {
        log::warn!("快捷方式不存在，跳过: {}", shortcut_path);
        return Ok(());
    }

    let vault = Path::new(vault_dir);
    fs::create_dir_all(vault).map_err(|e| format!("创建保险箱目录失败: {}", e))?;

    let file_name = src.file_name().unwrap_or_default();
    let dest = vault.join(file_name);

    if fs::rename(src, &dest).is_err() {
        fs::copy(src, &dest).map_err(|e| format!("移动快捷方式失败(复制阶段): {}", e))?;
        fs::remove_file(src).map_err(|e| format!("移动快捷方式失败(删除阶段): {}", e))?;
    }

    log::info!(
        "已将快捷方式移入保险箱: {} -> {}",
        shortcut_path,
        dest.display()
    );
    Ok(())
}

/// 恢复时：将 .lnk 快捷方式从 vault 恢复到原位置
pub fn restore_shortcut(shortcut_path: &str, vault_dir: &str) -> Result<(), String> {
    let original = Path::new(shortcut_path);
    let file_name = original.file_name().unwrap_or_default();
    let vault_file = Path::new(vault_dir).join(file_name);

    if !vault_file.exists() {
        log::warn!("保险箱中未找到快捷方式，跳过恢复: {}", vault_file.display());
        return Ok(());
    }

    if let Some(parent) = original.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目标目录失败: {}", e))?;
    }

    if fs::rename(&vault_file, original).is_err() {
        fs::copy(&vault_file, original)
            .map_err(|e| format!("恢复快捷方式失败(复制阶段): {}", e))?;
        fs::remove_file(&vault_file).map_err(|e| format!("恢复快捷方式失败(删除阶段): {}", e))?;
    }

    log::info!(
        "已恢复快捷方式: {} -> {}",
        vault_file.display(),
        shortcut_path
    );
    Ok(())
}
