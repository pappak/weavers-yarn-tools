$me = $PID
Write-Output '=== KILL HUNG HELPERS (builds finished; copies stalled) ==='
$procs = Get-CimInstance Win32_Process | Where-Object {
    ($_.CommandLine -match 'weavers-yarn-tools|nas-copy|final-build|rebuild-launch|finalize-nas') -and $_.ProcessId -ne $me -and $_.Name -ne 'Weavers Yarn Tools.exe'
}
foreach ($p in $procs) {
    Write-Output ('killing PID ' + $p.ProcessId + ' ' + $p.Name)
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Output ('killed ' + $procs.Count)
Write-Output '=== NAS QUICK TEST (10s budget) ==='
$task = [System.Threading.Tasks.Task]::Run({ Get-ChildItem '\\NAS01\homes\[PROJECTS]\Yarn Calculator' -ErrorAction SilentlyContinue | Select-Object -First 1 })
if ($task.Wait(10000)) { Write-Output 'NAS responded' } else { Write-Output 'NAS NOT RESPONDING within 10s' }
