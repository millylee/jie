mod commands;
mod models;
mod services;

use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

use services::storage::Storage;

#[tauri::command]
fn get_settings(storage: tauri::State<'_, Arc<Storage>>) -> Result<models::AppSettings, String> {
    let data = storage.data.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.clone())
}

#[tauri::command]
fn save_settings(
    settings: models::AppSettings,
    storage: tauri::State<'_, Arc<Storage>>,
) -> Result<(), String> {
    let mut data = storage.data.lock().map_err(|e| e.to_string())?;
    data.settings = settings;
    drop(data);
    storage.save()?;
    Ok(())
}

#[tauri::command]
fn enable_autostart() -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::winreg::{RegOpenKeyExW, RegSetValueExW, HKEY_CURRENT_USER};
    use winapi::um::winnt::{KEY_SET_VALUE, REG_SZ};

    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let value_data = format!("\"{}\"", exe_path.display());

    let sub_key: Vec<u16> = OsStr::new("SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let value_name: Vec<u16> = OsStr::new("JieApp")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let value_data_wide: Vec<u16> = OsStr::new(&value_data)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let mut hkey = std::ptr::null_mut();
        let ret = RegOpenKeyExW(HKEY_CURRENT_USER, sub_key.as_ptr(), 0, KEY_SET_VALUE, &mut hkey);
        if ret != 0 {
            return Err(format!("打开注册表失败: error code {}", ret));
        }
        let ret = RegSetValueExW(
            hkey,
            value_name.as_ptr(),
            0,
            REG_SZ,
            value_data_wide.as_ptr() as *const u8,
            (value_data_wide.len() * 2) as u32,
        );
        winapi::um::winreg::RegCloseKey(hkey);
        if ret != 0 {
            return Err(format!("写入注册表失败: error code {}", ret));
        }
    }
    Ok(())
}

#[tauri::command]
fn disable_autostart() -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::winreg::{RegOpenKeyExW, RegDeleteValueW, HKEY_CURRENT_USER};
    use winapi::um::winnt::KEY_SET_VALUE;

    let sub_key: Vec<u16> = OsStr::new("SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let value_name: Vec<u16> = OsStr::new("JieApp")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let mut hkey = std::ptr::null_mut();
        let ret = RegOpenKeyExW(HKEY_CURRENT_USER, sub_key.as_ptr(), 0, KEY_SET_VALUE, &mut hkey);
        if ret != 0 {
            return Err(format!("打开注册表失败: error code {}", ret));
        }
        let ret = RegDeleteValueW(hkey, value_name.as_ptr());
        winapi::um::winreg::RegCloseKey(hkey);
        if ret != 0 && ret != 2 {
            // error code 2 = value not found, which is fine when disabling
            return Err(format!("删除注册表值失败: error code {}", ret));
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Initialize storage
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let storage = Arc::new(Storage::new(app_data_dir.clone()));

            // Vault directory for moved game files
            let vault_dir = app_data_dir.join("vault").to_string_lossy().to_string();
            std::fs::create_dir_all(&vault_dir).ok();

            app.manage(storage.clone());
            app.manage(vault_dir.clone());

            // Start background timer for checking expired blocks
            let timer_storage = storage.clone();
            let timer_vault = vault_dir.clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(60));
                    services::timer::check_expired_blocks(&timer_storage, &timer_vault);
                }
            });

            // System tray
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&menu)
                .tooltip("戒 - 游戏封锁工具")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.unminimize().ok();
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.unminimize().ok();
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                })
                .build(app)?;

            // Handle window close -> minimize to tray
            let close_storage = storage.clone();
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let data = close_storage.data.lock().ok();
                        let minimize_to_tray = data
                            .as_ref()
                            .map(|d| d.settings.minimize_to_tray)
                            .unwrap_or(true);
                        if minimize_to_tray {
                            api.prevent_close();
                            window_clone.hide().ok();
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::game::get_games,
            commands::game::add_game,
            commands::game::remove_game,
            commands::block::block_game,
            commands::restore::restore_game,
            commands::restore::get_math_challenge,
            get_settings,
            save_settings,
            enable_autostart,
            disable_autostart,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
