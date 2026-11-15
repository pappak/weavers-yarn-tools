$ErrorActionPreference = 'Continue'
$proj = 'C:\Users\eldon\Workspace\weavers-yarn-tools'
Get-Process 'Weavers Yarn Tools', 'electron' -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "$env:TEMP\wyt-debug.log" -ErrorAction SilentlyContinue
Start-Process (Join-Path $proj 'node_modules\electron\dist\electron.exe') -ArgumentList $proj
Start-Sleep -Seconds 7
Write-Output '=== DEBUG LOG (electron from source) ==='
Get-Content "$env:TEMP\wyt-debug.log" -ErrorAction SilentlyContinue
