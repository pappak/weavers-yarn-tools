Write-Output '=== NAS QUICK TEST (12s budget) ==='
$job = Start-Job { Get-ChildItem '\\NAS01\homes\[PROJECTS]\Yarn Calculator' -ErrorAction SilentlyContinue | Select-Object -First 3 | ForEach-Object { $_.Name } }
if (Wait-Job $job -Timeout 12) { Write-Output ('NAS responded: ' + (Receive-Job $job) -join ', ') } else { Write-Output 'NAS NOT RESPONDING within 12s'; Stop-Job $job }
Remove-Job $job -Force
