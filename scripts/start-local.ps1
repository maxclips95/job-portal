param(
  [switch]$Dev,
  [switch]$NoWait
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root '.runtime'
$logDir = Join-Path $runtimeDir 'logs'
$pidFile = Join-Path $runtimeDir 'local-processes.json'

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Stop-TrackedProcess {
  param(
    [int]$ProcessId
  )

  if ($ProcessId -le 0) { return }
  $existing = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($null -ne $existing) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

function Stop-ListenerOnPort {
  param(
    [int]$Port
  )

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

function Wait-ForUrl {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )

  $start = Get-Date
  while (((Get-Date) - $start).TotalSeconds -lt $TimeoutSeconds) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  return $false
}

function Get-ListenerPid {
  param(
    [int]$Port
  )

  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $listener) {
    return [int]$listener.OwningProcess
  }

  $line = netstat -ano | Select-String ":$Port" | Select-String 'LISTENING' | Select-Object -First 1
  if ($null -eq $line) { return 0 }
  $parts = (($line -replace '\s+', ' ').Trim().Split(' '))
  $procIdText = $parts[$parts.Length - 1]
  $procId = 0
  if ([int]::TryParse($procIdText, [ref]$procId)) {
    return $procId
  }
  return 0
}

if (Test-Path $pidFile) {
  try {
    $tracked = Get-Content $pidFile -Raw | ConvertFrom-Json
    Stop-TrackedProcess -ProcessId ([int]$tracked.backend.pid)
    Stop-TrackedProcess -ProcessId ([int]$tracked.frontend.pid)
  } catch {
    # Ignore corrupt/old state and continue.
  }
}

# Ensure fixed local ports are free before spawning fresh processes.
Stop-ListenerOnPort -Port 5000
Stop-ListenerOnPort -Port 3000

$backendCommand = if ($Dev) { 'npm run dev --prefix=backend' } else { 'npm run start --prefix=backend' }
$frontendCommand = if ($Dev) { 'npm run dev --prefix=frontend' } else { 'npm run start --prefix=frontend' }

$backendStdOut = Join-Path $logDir 'backend.out.log'
$backendStdErr = Join-Path $logDir 'backend.err.log'
$frontendStdOut = Join-Path $logDir 'frontend.out.log'
$frontendStdErr = Join-Path $logDir 'frontend.err.log'

$backendProc = Start-Process -FilePath 'powershell.exe' `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', "Set-Location -LiteralPath '$root'; $backendCommand") `
  -RedirectStandardOutput $backendStdOut `
  -RedirectStandardError $backendStdErr `
  -PassThru `
  -WindowStyle Hidden

$frontendProc = Start-Process -FilePath 'powershell.exe' `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', "Set-Location -LiteralPath '$root'; $frontendCommand") `
  -RedirectStandardOutput $frontendStdOut `
  -RedirectStandardError $frontendStdErr `
  -PassThru `
  -WindowStyle Hidden

$backendReady = $true
$frontendReady = $true
if (-not $NoWait) {
  $backendReady = Wait-ForUrl -Url 'http://localhost:5000/health' -TimeoutSeconds 90
  $frontendReady = Wait-ForUrl -Url 'http://localhost:3000' -TimeoutSeconds 90
}

$backendListenerPid = Get-ListenerPid -Port 5000
$frontendListenerPid = Get-ListenerPid -Port 3000

$state = @{
  mode = if ($Dev) { 'dev' } else { 'start' }
  startedAt = (Get-Date).ToString('o')
  backend = @{
    pid = if ($backendListenerPid -gt 0) { $backendListenerPid } else { $backendProc.Id }
    launcherPid = $backendProc.Id
    listenerPid = $backendListenerPid
    port = 5000
    command = $backendCommand
    stdout = $backendStdOut
    stderr = $backendStdErr
    ready = $backendReady
  }
  frontend = @{
    pid = if ($frontendListenerPid -gt 0) { $frontendListenerPid } else { $frontendProc.Id }
    launcherPid = $frontendProc.Id
    listenerPid = $frontendListenerPid
    port = 3000
    command = $frontendCommand
    stdout = $frontendStdOut
    stderr = $frontendStdErr
    ready = $frontendReady
  }
}

$state | ConvertTo-Json -Depth 6 | Set-Content -Path $pidFile -Encoding UTF8

Write-Output "Backend PID: $($backendProc.Id) (ready: $backendReady)"
Write-Output "Frontend PID: $($frontendProc.Id) (ready: $frontendReady)"
Write-Output 'Frontend URL: http://localhost:3000'
Write-Output 'Backend URL: http://localhost:5000'
if ($NoWait) {
  Write-Output 'NoWait mode: services started in background. Run `npm run local:status` to verify.'
  exit 0
}

if (-not $backendReady -or -not $frontendReady) {
  Write-Output "One or more services failed health check. Logs: $logDir"
  exit 1
}
