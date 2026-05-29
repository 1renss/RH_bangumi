Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptPosition)
WshShell.Run "powershell -WindowStyle Hidden -STA -NoProfile -ExecutionPolicy Bypass -File """ & strPath & "\tray.ps1""", 0, False
