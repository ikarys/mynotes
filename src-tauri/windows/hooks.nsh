; The autostart plugin also writes a StartupApproved entry, which Tauri's
; uninstaller does not remove. Kept on updates, like the Run value it pairs with.
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "${PRODUCTNAME}"
  ${EndIf}
!macroend
