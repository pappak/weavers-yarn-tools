Write-Output '=== LISTENING TEST SERVERS (8123/8124) ==='
Get-NetTCPConnection -LocalPort 8123,8124 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -Unique OwningProcess | ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        Write-Output ('port ' + $_.LocalPort + ' -> PID ' + $_.OwningProcess + ' (' + $proc.ProcessName + ')')
    }
Write-Output '=== RUNNING SHELL HELPERS ==='
Get-Process app-builder, robocopy -ErrorAction SilentlyContinue | ForEach-Object { Write-Output $_.ProcessName }
Write-Output '=== BUILD/OUTPUTS CHECK ==='
Write-Output ('installer exists: ' + (Test-Path 'C:\Users\eldon\Workspace\weavers-yarn-tools\dist\Weavers Yarn Tools Setup 1.0.0.exe'))
Write-Output ('NAS dist exists: ' + (Test-Path '\\NAS01\homes\[PROJECTS]\Yarn Calculator\dist\Weavers Yarn Tools Setup 1.0.0.exe'))
