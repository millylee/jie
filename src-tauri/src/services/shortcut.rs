use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::path::Path;
use std::ptr;

use winapi::ctypes::c_void;
use winapi::shared::guiddef::GUID;
use winapi::shared::minwindef::MAX_PATH;
use winapi::shared::winerror::{FAILED, SUCCEEDED};
use winapi::um::combaseapi::{CoCreateInstance, CoInitializeEx, CoUninitialize};
use winapi::um::objbase::COINIT_APARTMENTTHREADED;
use winapi::um::objidl::IPersistFile;
use winapi::um::shobjidl_core::IShellLinkW;
use winapi::um::winnt::WCHAR;
use winapi::Interface;

// CLSID_ShellLink: {00021401-0000-0000-C000-000000000046}
const CLSID_SHELL_LINK: GUID = GUID {
    Data1: 0x00021401,
    Data2: 0x0000,
    Data3: 0x0000,
    Data4: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46],
};

/// Convert a Rust &str to a null-terminated wide string (Vec<u16>).
fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

/// Convert a null-terminated wide string buffer to a Rust String.
fn from_wide(buf: &[WCHAR]) -> String {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..len])
}

/// Extract the pure exe path from a string that may contain command-line arguments.
/// e.g. `"D:\Program Files\App\app.exe" --src1` -> `D:\Program Files\App\app.exe`
fn extract_exe_path(raw: &str) -> String {
    let trimmed = raw.trim();

    // If quoted, extract content between quotes
    if let Some(stripped) = trimmed.strip_prefix('"') {
        if let Some(end) = stripped.find('"') {
            return stripped[..end].to_string();
        }
    }

    // If the whole string is already a valid path, use it directly
    if Path::new(trimmed).exists() {
        return trimmed.to_string();
    }

    // Try to find .exe boundary and strip trailing arguments
    if let Some(idx) = trimmed.to_lowercase().find(".exe") {
        return trimmed[..idx + 4].to_string();
    }

    trimmed.to_string()
}

/// Parse a Windows .lnk shortcut file and return the target path.
/// Uses the Windows COM API (IShellLinkW) for reliable parsing.
pub fn parse_lnk(path: &str) -> Result<String, String> {
    let lnk_path = Path::new(path);
    if !lnk_path.exists() {
        return Err(format!("快捷方式不存在: {}", path));
    }

    unsafe {
        // Initialize COM
        let hr = CoInitializeEx(ptr::null_mut(), COINIT_APARTMENTTHREADED);
        // S_OK (0) or S_FALSE (1) both mean COM is usable
        let com_initialized = SUCCEEDED(hr);
        if !com_initialized && FAILED(hr) {
            return Err(format!("COM初始化失败: 0x{:08X}", hr));
        }

        let result = parse_lnk_com(path);

        // Only uninitialize if we successfully initialized
        if com_initialized {
            CoUninitialize();
        }

        result
    }
}

unsafe fn parse_lnk_com(path: &str) -> Result<String, String> {
    let mut psl: *mut IShellLinkW = ptr::null_mut();

    // Create IShellLink instance
    let hr = CoCreateInstance(
        &CLSID_SHELL_LINK,
        ptr::null_mut(),
        winapi::shared::wtypesbase::CLSCTX_INPROC_SERVER,
        &IShellLinkW::uuidof(),
        &mut psl as *mut *mut IShellLinkW as *mut *mut c_void,
    );

    if FAILED(hr) || psl.is_null() {
        return Err(format!("创建ShellLink失败: 0x{:08X}", hr));
    }

    // Query IPersistFile interface
    let mut ppf: *mut IPersistFile = ptr::null_mut();
    let hr = (*psl).QueryInterface(
        &IPersistFile::uuidof(),
        &mut ppf as *mut *mut IPersistFile as *mut *mut c_void,
    );

    if FAILED(hr) || ppf.is_null() {
        (*psl).Release();
        return Err(format!("获取IPersistFile失败: 0x{:08X}", hr));
    }

    // Load the .lnk file
    let wide_path = to_wide(path);
    let hr = (*ppf).Load(wide_path.as_ptr(), 0);

    if FAILED(hr) {
        (*ppf).Release();
        (*psl).Release();
        return Err(format!("加载快捷方式失败: 0x{:08X}", hr));
    }

    // Get the target path
    let mut target_buf: [WCHAR; MAX_PATH] = [0; MAX_PATH];
    let mut find_data: winapi::um::minwinbase::WIN32_FIND_DATAW = std::mem::zeroed();

    let hr = (*psl).GetPath(
        target_buf.as_mut_ptr(),
        MAX_PATH as i32,
        &mut find_data,
        0, // SLGP_SHORTPATH = 0
    );

    (*ppf).Release();
    (*psl).Release();

    if FAILED(hr) {
        return Err("无法从快捷方式中获取目标路径".to_string());
    }

    let target = from_wide(&target_buf);
    if target.is_empty() {
        return Err("无法从快捷方式中获取目标路径".to_string());
    }

    Ok(extract_exe_path(&target))
}

/// Extract the file name without extension from a path.
pub fn extract_name(path: &str) -> String {
    Path::new(path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("未知游戏")
        .to_string()
}
