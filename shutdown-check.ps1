$me = $PID
Write-Output '=== MY SESSION PROCESSES (excluding this check) ==='
$procs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match 'weavers-yarn-tools|nas-copy|final-build' -and $_.ProcessId -ne $me
}
if ($procs) {
    foreach ($p in $procs) { Write-Output ('RUNNING: PID ' + $p.ProcessId + ' ' + $p.Name) }
} else {
    Write-Output 'none - all session work has finished'
}
Write-Output '=== NODE TEST SERVERS ==='
$srv = Get-NetTCPConnection -LocalPort 8123,8124 -State Listen -ErrorAction SilentlyContinue
if ($srv) { Write-Output 'test servers STILL listening' } else { Write-Output 'none - killed earlier' }
Write-Output '=== APP ==='
$app = Get-Process 'Weavers Yarn Tools' -ErrorAction SilentlyContinue
Write-Output ('Weavers Yarn Tools app: ' + ($(if ($app) { 'running (safe to close - it saves nothing)' } else { 'not running' })))
Write-Output '=== NAS COPY STATE ==='
$nas = '\\NAS01\homes\[PROJECTS]\Yarn Calculator'
Write-Output ('installer on NAS: ' + (Test-Path (Join-Path $nas 'dist\Weavers Yarn Tools Setup 1.0.0.exe')))
Write-Output ('photos on NAS: ' + (Get-ChildItem (Join-Path $nas 'app\yarn-photos') -Filter '*.png' -ErrorAction SilentlyContinue).Count + '/442')
