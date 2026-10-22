; Tauri refreshes shell icons only for file associations. Reinstalling over an
; old or broken shortcut otherwise leaves Explorer and the taskbar showing a
; cached generic icon for the app. SHCNE_ASSOCCHANGED with SHCNF_FLUSH.
!macro NSIS_HOOK_POSTINSTALL
  System::Call "shell32::SHChangeNotify(i,i,i,i) (0x08000000, 0x1000, 0, 0)"
!macroend
