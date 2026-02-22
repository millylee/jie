use std::ffi::OsStr;
use std::io::Cursor;
use std::os::windows::ffi::OsStrExt;
use std::ptr;

use base64::Engine;
use winapi::shared::minwindef::FALSE;
use winapi::shared::windef::HICON;
use winapi::um::shellapi::ExtractIconExW;
use winapi::um::wingdi::{
    BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, CreateCompatibleDC, DeleteDC,
    DeleteObject, GetDIBits, GetObjectW, DIB_RGB_COLORS,
};
use winapi::um::winuser::{DestroyIcon, GetIconInfo, ICONINFO};

/// Extract the application icon from an .exe file and return it as a base64-encoded PNG string.
pub fn extract_icon_base64(exe_path: &str) -> Result<String, String> {
    unsafe {
        let wide_path: Vec<u16> = OsStr::new(exe_path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let mut large_icon: HICON = ptr::null_mut();
        let count = ExtractIconExW(wide_path.as_ptr(), 0, &mut large_icon, ptr::null_mut(), 1);
        if count == 0 || large_icon.is_null() {
            return Err("无法提取图标".to_string());
        }

        let result = icon_to_base64(large_icon);
        DestroyIcon(large_icon);
        result
    }
}

unsafe fn icon_to_base64(icon: HICON) -> Result<String, String> {
    let mut icon_info: ICONINFO = std::mem::zeroed();
    if GetIconInfo(icon, &mut icon_info) == FALSE {
        return Err("GetIconInfo 失败".to_string());
    }

    let mut bmp: BITMAP = std::mem::zeroed();
    if GetObjectW(
        icon_info.hbmColor as *mut _,
        std::mem::size_of::<BITMAP>() as i32,
        &mut bmp as *mut BITMAP as *mut _,
    ) == 0
    {
        cleanup_iconinfo(&icon_info);
        return Err("GetObject 失败".to_string());
    }

    let width = bmp.bmWidth as u32;
    let height = bmp.bmHeight as u32;

    let hdc = CreateCompatibleDC(ptr::null_mut());
    if hdc.is_null() {
        cleanup_iconinfo(&icon_info);
        return Err("CreateCompatibleDC 失败".to_string());
    }

    // Negative height = top-down row order (no need to flip)
    let mut bmi: BITMAPINFO = std::mem::zeroed();
    bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
    bmi.bmiHeader.biWidth = width as i32;
    bmi.bmiHeader.biHeight = -(height as i32);
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;
    bmi.bmiHeader.biCompression = BI_RGB;

    let buf_size = (width * height * 4) as usize;
    let mut pixels: Vec<u8> = vec![0u8; buf_size];

    let rows = GetDIBits(
        hdc,
        icon_info.hbmColor,
        0,
        height,
        pixels.as_mut_ptr() as *mut _,
        &mut bmi,
        DIB_RGB_COLORS,
    );

    DeleteDC(hdc);
    cleanup_iconinfo(&icon_info);

    if rows == 0 {
        return Err("GetDIBits 失败".to_string());
    }

    // BGRA -> RGBA
    for chunk in pixels.chunks_exact_mut(4) {
        chunk.swap(0, 2);
    }

    let img = image::RgbaImage::from_raw(width, height, pixels)
        .ok_or_else(|| "创建图像失败".to_string())?;
    let mut png_buf = Vec::new();
    img.write_to(&mut Cursor::new(&mut png_buf), image::ImageFormat::Png)
        .map_err(|e| format!("PNG编码失败: {}", e))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(&png_buf))
}

unsafe fn cleanup_iconinfo(info: &ICONINFO) {
    if !info.hbmColor.is_null() {
        DeleteObject(info.hbmColor as *mut _);
    }
    if !info.hbmMask.is_null() {
        DeleteObject(info.hbmMask as *mut _);
    }
}
