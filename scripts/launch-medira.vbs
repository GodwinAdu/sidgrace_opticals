' Medira silent launcher.
' Runs start-local.ps1 with NO visible window (not even a flash), then exits.
' The "0" window style = hidden; "False" = don't wait for it to finish.
Dim shell, fso, here, ps1
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = here & "\start-local.ps1"
shell.Run "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & ps1 & """", 0, False
