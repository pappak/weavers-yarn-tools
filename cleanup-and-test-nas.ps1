Write-Output '=== KILL SESSION PROCESSES (by command line) ==='
$procs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match 'weavers-yarn-tools' -and $_.ProcessId -ne $PID
}
foreach ($p in $procs) {
    Write-Output ('killing PID ' + $p.ProcessId + ' : ' + $p.Name)
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Output ('killed ' + $procs.Count + ' processes')
Start-Sleep -Seconds 2
Write-Output '=== NAS RESPONSIVENESS TEST ==='
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$items = Get-ChildItem '\\NAS01\homes\[PROJECTS]\Yarn Calculator' -ErrorAction SilentlyContinue
$sw.Stop()
Write-Output ('NAS responded in ' + [math]::Round($sw.ElapsedMilliseconds) + ' ms, items: ' + $items.Count)
