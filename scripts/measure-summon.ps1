# Times Ctrl+Alt+Space -> mynotes window visible, with mynotes already running in the tray.
# Run from a Windows PowerShell console: powershell -ExecutionPolicy Bypass -File scripts\measure-summon.ps1

param(
    [int]$Runs = 15,
    [int]$PauseMs = 600
)

$csharp = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class WinApi
{
    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public static bool IsShown(int[] pids)
    {
        if (pids == null || pids.Length == 0)
        {
            return false;
        }

        bool shown = false;
        EnumWindows((hWnd, lParam) =>
        {
            if (!IsWindowVisible(hWnd))
            {
                return true;
            }

            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            for (int i = 0; i < pids.Length; i++)
            {
                if ((int)pid == pids[i])
                {
                    StringBuilder title = new StringBuilder(256);
                    GetWindowText(hWnd, title, title.Capacity);
                    if (title.ToString() == "mynotes")
                    {
                        shown = true;
                        return false;
                    }
                    break;
                }
            }

            return true;
        }, IntPtr.Zero);

        return shown;
    }

    public static void SendHotkey()
    {
        const uint KEYEVENTF_KEYUP = 2;

        keybd_event(0x11, 0, 0, UIntPtr.Zero);
        keybd_event(0x12, 0, 0, UIntPtr.Zero);
        keybd_event(0x20, 0, 0, UIntPtr.Zero);
        keybd_event(0x20, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(0x12, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(0x11, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
'@

if (-not ('WinApi' -as [type])) {
    Add-Type -TypeDefinition $csharp -Language CSharp
}

$procs = Get-Process -Name mynotes -ErrorAction SilentlyContinue
if (-not $procs) {
    Write-Error "No mynotes process is running."
    exit 1
}
[int[]]$pids = @($procs.Id)

function Wait-Hidden {
    param([int[]]$Pids, [int]$TimeoutMs)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.ElapsedMilliseconds -lt $TimeoutMs) {
        if (-not [WinApi]::IsShown($Pids)) { return $true }
        [void][System.Threading.Thread]::SpinWait(20)
    }
    return -not [WinApi]::IsShown($Pids)
}

function Ensure-Hidden {
    param([int[]]$Pids)
    # Visible-but-unfocused windows need two toggles: first focuses, second hides.
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        if (-not [WinApi]::IsShown($Pids)) { return $true }
        [WinApi]::SendHotkey()
        if (Wait-Hidden -Pids $Pids -TimeoutMs 2000) { return $true }
    }
    return $false
}

function Get-Median {
    param([double[]]$Values)
    if ($Values.Count -eq 0) { return 0.0 }
    $sorted = @($Values | Sort-Object)
    $n = $sorted.Count
    if ($n % 2 -eq 1) { return [double]$sorted[($n - 1) / 2] }
    return ([double]$sorted[($n / 2) - 1] + [double]$sorted[$n / 2]) / 2.0
}

$samples = New-Object System.Collections.Generic.List[double]

for ($run = 1; $run -le $Runs; $run++) {
    if (-not (Ensure-Hidden -Pids $pids)) {
        Write-Error "Could not hide mynotes window before run $run."
        exit 1
    }

    Start-Sleep -Milliseconds $PauseMs
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    [WinApi]::SendHotkey()

    $shown = $false
    # Busy-poll so the measured interval is not inflated by a sleep.
    while ($sw.ElapsedMilliseconds -lt 5000) {
        if ([WinApi]::IsShown($pids)) {
            $shown = $true
            break
        }
        [void][System.Threading.Thread]::SpinWait(20)
    }

    if ($shown) {
        $ms = $sw.Elapsed.TotalMilliseconds
        $samples.Add($ms)
        Write-Output ("run {0}: {1:F1} ms" -f $run, $ms)
    } else {
        Write-Output ("run {0}: timeout" -f $run)
    }

    Start-Sleep -Milliseconds $PauseMs
    [WinApi]::SendHotkey()
    if (-not (Wait-Hidden -Pids $pids -TimeoutMs 5000)) {
        # A show timeout can leave a hidden window toggled visible by the hide attempt.
        if (-not (Ensure-Hidden -Pids $pids)) {
            Write-Error "mynotes window did not hide after run $run."
            exit 1
        }
    }
}

if (-not (Ensure-Hidden -Pids $pids)) {
    Write-Error "Could not leave mynotes window hidden."
    exit 1
}

$median = Get-Median -Values $samples.ToArray()
$min = 0.0
$max = 0.0
if ($samples.Count -gt 0) {
    $min = [double]($samples | Measure-Object -Minimum).Minimum
    $max = [double]($samples | Measure-Object -Maximum).Maximum
}

Write-Output ("median: {0:F1} ms" -f $median)
Write-Output ("min: {0:F1} ms" -f $min)
Write-Output ("max: {0:F1} ms" -f $max)
Write-Output ("runs: {0}" -f $samples.Count)
