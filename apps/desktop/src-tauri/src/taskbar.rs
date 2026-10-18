use std::{io, ptr};
use windows_sys::Win32::{
    Foundation::HWND,
    System::LibraryLoader::GetModuleHandleW,
    UI::WindowsAndMessaging::{
        ICON_BIG, IMAGE_ICON, LR_SHARED, LoadImageW, SendMessageW, WM_SETICON,
    },
};

pub fn set_icon(window: HWND) -> io::Result<()> {
    // Tauri's set_icon sets ICON_SMALL only. Windows uses ICON_BIG for the
    // taskbar and Alt+Tab. Tauri embeds the multi-resolution ICO as 32512.
    // LR_SHARED keeps this resource handle alive until the process exits.
    unsafe {
        let module = GetModuleHandleW(ptr::null());
        if module.is_null() {
            return Err(io::Error::last_os_error());
        }
        let icon = LoadImageW(
            module,
            32512usize as *const u16,
            IMAGE_ICON,
            256,
            256,
            LR_SHARED,
        );
        if icon.is_null() {
            return Err(io::Error::last_os_error());
        }
        SendMessageW(window, WM_SETICON, ICON_BIG as usize, icon as isize);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DefWindowProcW, DestroyWindow, RegisterClassW, UnregisterClassW,
        WM_GETICON, WNDCLASSW,
    };

    #[test]
    fn embedded_icon_is_assigned_to_the_taskbar_slot() {
        unsafe {
            let name: Vec<u16> = "MonolithTaskbarIconTest\0".encode_utf16().collect();
            let module = GetModuleHandleW(ptr::null());
            let class = WNDCLASSW {
                lpfnWndProc: Some(DefWindowProcW),
                hInstance: module,
                lpszClassName: name.as_ptr(),
                ..Default::default()
            };
            assert_ne!(RegisterClassW(&class), 0);
            // An invisible test window exercises the same resource and WM_SETICON
            // path without changing the installed app or the user's desktop.
            let window = CreateWindowExW(
                0,
                name.as_ptr(),
                name.as_ptr(),
                0,
                0,
                0,
                1,
                1,
                ptr::null_mut(),
                ptr::null_mut(),
                module,
                ptr::null(),
            );
            assert!(!window.is_null());
            let outcome = set_icon(window);
            let icon = SendMessageW(window, WM_GETICON, ICON_BIG as usize, 0);
            DestroyWindow(window);
            UnregisterClassW(name.as_ptr(), module);
            outcome.unwrap();
            assert_ne!(icon, 0, "The taskbar must receive an icon handle");
        }
    }
}
