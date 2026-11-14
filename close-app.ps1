$ErrorActionPreference = 'Continue'
$proj = 'C:\Users\eldon\Workspace\weavers-yarn-tools'
Write-Output '=== CLOSE RUNNING APP ==='
Get-Process 'Weavers Yarn Tools' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Write-Output 'closed'
