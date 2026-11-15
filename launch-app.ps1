Start-Process 'C:\Users\eldon\Workspace\weavers-yarn-tools\dist\win-unpacked\Weavers Yarn Tools.exe'
Start-Sleep -Seconds 3
$p = Get-Process 'Weavers Yarn Tools' -ErrorAction SilentlyContinue
if ($p) { Write-Output ('RUNNING - PID ' + $p.Id) } else { Write-Output 'not running - check install' }
