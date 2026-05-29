# PowerShell System Tray Launcher for RH番剧记录系统
# Requires: .NET Framework (built into Windows 10/11)
# 100% ASCII code to prevent encoding/parser errors on Windows PowerShell 5.1

param(
    [string]$ProjectDir = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

$LogFile = Join-Path $ProjectDir "launcher.log"
"--- Launcher Initializing ---" | Out-File -FilePath $LogFile -Encoding UTF8

function Write-Log {
    param([string]$message)
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "[$timestamp] $message" | Out-File -FilePath $LogFile -Append -Encoding UTF8
    } catch {}
}

# ===== Error handling =====
$ErrorActionPreference = "Stop"
try {

Write-Log "Loading System.Windows.Forms..."
Add-Type -AssemblyName System.Windows.Forms
Write-Log "Loading System.Drawing..."
Add-Type -AssemblyName System.Drawing

# ===== Configuration (RH番剧记录系统 in Unicode) =====
$AppName = "RH" + [char]0x756a + [char]0x5267 + [char]0x8bb0 + [char]0x5f55 + [char]0x7cfb + [char]0x7edf
$Port    = 5173
$AppUrl  = "http://localhost:" + $Port + "/"

Write-Log "AppName: $AppName, Port: $Port"

# ===== Create tray icon =====
function New-TrayIcon {
    Write-Log "Creating custom bitmap icon..."
    $bmp = New-Object System.Drawing.Bitmap(32, 32)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Background circle (pink accent: #fb7299 -> R=251, G=114, B=153)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(251, 114, 153))
    $g.FillEllipse($bgBrush, 1, 1, 30, 30)
    
    # "RH" text centered on circle
    $font = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, 32, 32)
    $g.DrawString("RH", $font, $textBrush, $rect, $sf)
    
    $g.Dispose()
    $font.Dispose()
    $bgBrush.Dispose()
    $textBrush.Dispose()
    $sf.Dispose()
    
    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    Write-Log "Custom icon created successfully."
    return $icon
}

# ===== Process Stop Function (Kills Vite process tree & orphans) =====
function Stop-ViteProcess {
    Write-Log "Stopping Vite process on port $Port..."
    
    # 1. Kill process tree we started
    if ($viteProcess -and -not $viteProcess.HasExited) {
        try {
            $pid = $viteProcess.Id
            Write-Log "Killing spawned process tree PID $pid..."
            Start-Process "taskkill" -ArgumentList "/F /T /PID $pid" -NoNewWindow -Wait -ErrorAction SilentlyContinue
        } catch {
            Write-Log "Error killing spawned process: $_"
        }
    }
    
    # 2. Find and kill any process listening on port 5173 (cleans up orphans)
    try {
        $pidToKill = $null
        # Try Get-NetTCPConnection first
        $cmdCheck = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
        if ($cmdCheck) {
            $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
            if ($conn) {
                $pidToKill = $conn.OwningProcess
                Write-Log "Get-NetTCPConnection found PID $pidToKill listening on port $Port."
            }
        }
        
        # Fallback to netstat parse
        if (-not $pidToKill) {
            $netstat = netstat -ano | Select-String "LISTENING" | Select-String (":" + $Port)
            if ($netstat) {
                $line = $netstat[0].ToString().Trim()
                $parts = $line -split '\s+'
                $pidToKill = $parts[-1]
                Write-Log "netstat parser found PID $pidToKill listening on port $Port."
            }
        }
        
        # Kill the listener process tree
        if ($pidToKill -and $pidToKill -gt 0) {
            Write-Log "Killing process tree for listener PID $pidToKill..."
            Start-Process "taskkill" -ArgumentList "/F /T /PID $pidToKill" -NoNewWindow -Wait -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Log "Error killing active port listener: $_"
    }
}

# ===== Check if port is already in use =====
Write-Log "Checking if port $Port is in use..."
$alreadyRunning = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", $Port)
    $tcp.Close()
    $alreadyRunning = $true
    Write-Log "Port $Port is already in use. Skipping server launch."
} catch {
    Write-Log "Port $Port is free."
}

$viteProcess = $null

if (-not $alreadyRunning) {
    # ===== Check node_modules =====
    Write-Log "Checking node_modules path..."
    if (-not (Test-Path (Join-Path $ProjectDir "node_modules"))) {
        Write-Log "node_modules not found. Looking for npm..."
        $npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
        if (-not $npmPath) {
            Write-Log "npm not found! Exiting."
            $msg = "Node.js / npm not detected. Please install Node.js first from https://nodejs.org/"
            [System.Windows.Forms.MessageBox]::Show(
                $msg,
                $AppName,
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Error
            ) | Out-Null
            exit 1
        }
        
        # Install dependencies
        Write-Log "Running npm install..."
        $installInfo = New-Object System.Diagnostics.ProcessStartInfo
        $installInfo.FileName = "cmd.exe"
        $installInfo.Arguments = '/c cd /d "' + $ProjectDir + '" && npm install && exit'
        $installInfo.WorkingDirectory = $ProjectDir
        $installInfo.UseShellExecute = $true
        $installProc = [System.Diagnostics.Process]::Start($installInfo)
        $installProc.WaitForExit()
        Write-Log "npm install completed with exit code: $($installProc.ExitCode)"
        
        if ($installProc.ExitCode -ne 0) {
            $msg = "Dependency installation failed. Please check your network and try again."
            [System.Windows.Forms.MessageBox]::Show(
                $msg,
                $AppName,
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Error
            ) | Out-Null
            exit 1
        }
    }

    # ===== Start Vite dev server =====
    Write-Log "Starting Vite dev server in hidden window..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = '/c cd /d "' + $ProjectDir + '" && npx vite --port ' + $Port
    $psi.WorkingDirectory = $ProjectDir
    $psi.UseShellExecute = $true
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

    $viteProcess = New-Object System.Diagnostics.Process
    $viteProcess.StartInfo = $psi
    $viteProcess.Start() | Out-Null
    Write-Log "Vite process started. PID: $($viteProcess.Id)"

    # Wait for Vite to be ready
    $maxWait = 30
    $waited = 0
    $ready = $false
    Write-Log "Waiting for Vite port to become active..."
    while ($waited -lt $maxWait) {
        Start-Sleep -Milliseconds 500
        $waited += 0.5
        
        if ($viteProcess.HasExited) {
            Write-Log "Vite process exited prematurely!"
            $msg = "Vite failed to start. Please check Node.js installation or project configuration."
            [System.Windows.Forms.MessageBox]::Show(
                $msg,
                $AppName,
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Error
            ) | Out-Null
            exit 1
        }
        
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $Port)
            $tcp.Close()
            $ready = $true
            Write-Log "Vite port is active now."
            break
        } catch {
            # Not ready yet
        }
    }

    if (-not $ready) {
        Write-Log "Vite startup timed out."
        $msg = "Vite dev server start timed out (waited " + $maxWait + " seconds). Please check project config."
        [System.Windows.Forms.MessageBox]::Show(
            $msg,
            $AppName,
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
    }
}

# ===== Create NotifyIcon (System Tray) =====
Write-Log "Initializing NotifyIcon..."
$trayIcon = New-Object System.Windows.Forms.NotifyIcon
$trayIcon.Icon = New-TrayIcon
$trayIcon.Text = $AppName + " (" + $Port + ")"
$trayIcon.Visible = $true

# ===== Context menu =====
Write-Log "Creating context menu..."
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Header
$menuHeader = New-Object System.Windows.Forms.ToolStripMenuItem
$menuHeader.Text = [char]0xd83d + [char]0xdcfa + " " + $AppName
$menuHeader.Enabled = $false
$menuHeader.Font = New-Object System.Drawing.Font("Microsoft YaHei", 9, [System.Drawing.FontStyle]::Bold)
$contextMenu.Items.Add($menuHeader) | Out-Null
$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Open Browser
$openText = [char]0x6253 + [char]0x5f00 + [char]0x6d4f + [char]0x89c8 + [char]0x5668
$menuOpen = New-Object System.Windows.Forms.ToolStripMenuItem
$menuOpen.Text = [char]0xd83c + [char]0xdf10 + " " + $openText
$menuOpen.Font = New-Object System.Drawing.Font("Microsoft YaHei", 9)
$menuOpen.Add_Click({
    Start-Process $AppUrl
})
$contextMenu.Items.Add($menuOpen) | Out-Null

# Separator
$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Exit
$exitText = [char]0x9000 + [char]0x51fa
$menuExit = New-Object System.Windows.Forms.ToolStripMenuItem
$menuExit.Text = [char]0x274c + " " + $exitText
$menuExit.Font = New-Object System.Drawing.Font("Microsoft YaHei", 9)
$menuExit.Add_Click({
    Write-Log "Exit clicked in tray menu. Cleaning up..."
    Stop-ViteProcess
    $trayIcon.Visible = $false
    $trayIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})
$contextMenu.Items.Add($menuExit) | Out-Null

$trayIcon.ContextMenuStrip = $contextMenu

# ===== Double-click action =====
$trayIcon.Add_DoubleClick({
    Start-Process $AppUrl
})

# ===== Show balloon notification =====
Write-Log "Showing balloon notification..."
$tipText = [char]0x670d + [char]0x52a1 + [char]0x5df2 + [char]0x542f + [char]0x52a8 + [char]0xff01 + [char]0x53cc + [char]0x51fb + [char]0x56fe + [char]0x6807 + [char]0x6216 + [char]0x53f3 + [char]0x952e + [char]0x6253 + [char]0x5f00 + [char]0x6d4f + [char]0x89c8 + [char]0x5668
$trayIcon.BalloonTipTitle = $AppName
$trayIcon.BalloonTipText = $tipText + "`n" + $AppUrl
$trayIcon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
$trayIcon.ShowBalloonTip(3000)

# ===== Auto-open browser =====
Write-Log "Opening default browser at $AppUrl..."
Start-Process $AppUrl

# ===== Run message loop =====
Write-Log "Starting Application Message Loop..."
[System.Windows.Forms.Application]::Run()

# ===== Cleanup on exit =====
Write-Log "Application loop ended. Performing clean exit..."
Stop-ViteProcess
$trayIcon.Visible = $false
$trayIcon.Dispose()

} catch {
    # Fallback error popup and log write
    $errMsg = "Error:`n" + $_.Exception.Message + "`n`nStack:`n" + $_.ScriptStackTrace
    Write-Log "FATAL EXCEPTION: $errMsg"
    
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
    $errTitle = "RH" + [char]0x756a + [char]0x5267 + [char]0x8bb0 + [char]0x5f55 + [char]0x7cfb + [char]0x7edf + " - Error"
    [System.Windows.Forms.MessageBox]::Show(
        $errMsg,
        $errTitle,
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
}
