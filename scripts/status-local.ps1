$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root '.runtime'
$pidFile = Join-Path $runtimeDir 'local-processes.json'

function Get-ProcessState {
  param(
    [int]$ProcessId
  )

  if ($ProcessId -le 0) { return 'missing' }
  $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($null -eq $proc) { return 'stopped' }
  return 'running'
}

function Get-PortState {
  param(
    [int]$Port
  )

  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $listener) {
    return "listening(pid=$($listener.OwningProcess))"
  }

  $line = netstat -ano | Select-String ":$Port" | Select-String 'LISTENING' | Select-Object -First 1
  if ($null -eq $line) { return 'closed' }

  $parts = (($line -replace '\s+', ' ').Trim().Split(' '))
  $procId = $parts[$parts.Length - 1]
  return "listening(pid=$procId)"
}

if (-not (Test-Path $pidFile)) {
  Write-Output 'No local runtime state found. Run start script first.'
  exit 0
}

$tracked = Get-Content $pidFile -Raw | ConvertFrom-Json

$backendPid = [int]$tracked.backend.pid
$frontendPid = [int]$tracked.frontend.pid

Write-Output "Mode: $($tracked.mode)"
Write-Output "Started: $($tracked.startedAt)"
Write-Output "Backend: pid=$backendPid process=$(Get-ProcessState -ProcessId $backendPid) port=$(Get-PortState -Port 5000)"
Write-Output "Frontend: pid=$frontendPid process=$(Get-ProcessState -ProcessId $frontendPid) port=$(Get-PortState -Port 3000)"
