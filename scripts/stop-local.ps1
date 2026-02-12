$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root '.runtime'
$pidFile = Join-Path $runtimeDir 'local-processes.json'

function Stop-TrackedProcess {
  param(
    [int]$ProcessId
  )

  if ($ProcessId -le 0) { return }
  $existing = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($null -ne $existing) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
  }
}

function Stop-ListenerOnPort {
  param(
    [int]$Port
  )

  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($null -ne $listeners) {
    foreach ($listener in $listeners) {
      Stop-TrackedProcess -ProcessId ([int]$listener.OwningProcess)
    }
    return
  }

  $netstatLines = netstat -ano | Select-String ":$Port" | Select-String 'LISTENING'
  foreach ($line in $netstatLines) {
    $parts = (($line -replace '\s+', ' ').Trim().Split(' '))
    $procIdText = $parts[$parts.Length - 1]
    $procId = 0
    if ([int]::TryParse($procIdText, [ref]$procId) -and $procId -gt 0) {
      Stop-TrackedProcess -ProcessId $procId
    }
  }
}

if (Test-Path $pidFile) {
  try {
    $tracked = Get-Content $pidFile -Raw | ConvertFrom-Json
    Stop-TrackedProcess -ProcessId ([int]$tracked.backend.pid)
    Stop-TrackedProcess -ProcessId ([int]$tracked.frontend.pid)
  } catch {
    # Ignore broken state.
  }
}

# Safety cleanup for common local ports.
Stop-ListenerOnPort -Port 5000
Stop-ListenerOnPort -Port 3000

if (Test-Path $pidFile) {
  Remove-Item $pidFile -Force
}

Write-Output 'Local services stopped.'
