Write-Output '=== ACTIVE PROCESSES ==='
Get-Process node, robocopy, powershell -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Output ($_.ProcessName + ' PID ' + $_.Id + ' started ' + $_.StartTime.ToString('HH:mm:ss'))
}
Write-Output '=== NAS COPY PROGRESS ==='
$nas = '\\NAS01\homes\[PROJECTS]\Yarn Calculator'
if (Test-Path (Join-Path $nas 'dist\Weavers Yarn Tools Setup 1.0.0.exe')) {
    $f = Get-Item (Join-Path $nas 'dist\Weavers Yarn Tools Setup 1.0.0.exe')
    Write-Output ('installer copied: ' + [math]::Round($f.Length/1MB,1) + ' MB')
} else {
    Write-Output 'installer not yet on NAS'
}
if (Test-Path (Join-Path $nas 'app\yarn-photos')) {
    Write-Output ('photos on NAS: ' + (Get-ChildItem (Join-Path $nas 'app\yarn-photos') -Filter '*.png').Count + '/442')
} else {
    Write-Output 'photos folder not yet on NAS'
}
