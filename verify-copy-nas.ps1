$ErrorActionPreference = 'Continue'
$proj = 'C:\Users\eldon\Workspace\weavers-yarn-tools'
Write-Output '=== DIST OUTPUTS ==='
Get-ChildItem (Join-Path $proj 'dist') -Filter '*.exe' | ForEach-Object {
    Write-Output ($_.Name + ' | ' + [math]::Round($_.Length/1MB,1) + ' MB')
}
Write-Output '=== LAUNCH APP (unpacked build for you to try) ==='
Start-Process (Join-Path $proj 'dist\win-unpacked\Weavers Yarn Tools.exe')
Write-Output 'launched'
Write-Output '=== COPY TO NAS: Yarn Calculator ==='
$nas = '\\NAS01\homes\[PROJECTS]\Yarn Calculator'
New-Item -ItemType Directory -Force -Path $nas | Out-Null
# Source tree (no node_modules / dist unpacked)
$dirs = @('app', 'build')
foreach ($d in $dirs) {
    robocopy (Join-Path $proj $d) (Join-Path $nas $d) /E /NFL /NDL /NJH /NJS | Out-Null
}
foreach ($f in @('main.js', 'package.json', 'package-lock.json', 'README.md', 'BUILD-MAC.md', 'build-app.mjs', '.gitignore')) {
    Copy-Item (Join-Path $proj $f) (Join-Path $nas $f) -Force
}
# Built installers
New-Item -ItemType Directory -Force -Path (Join-Path $nas 'dist') | Out-Null
Copy-Item (Join-Path $proj 'dist\Weavers Yarn Tools Setup 1.0.0.exe') (Join-Path $nas 'dist') -Force
Copy-Item (Join-Path $proj 'dist\Weavers Yarn Tools 1.0.0.exe') (Join-Path $nas 'dist') -Force
Write-Output '=== NAS CONTENTS ==='
Get-ChildItem $nas | ForEach-Object { Write-Output $_.Name }
Get-ChildItem (Join-Path $nas 'dist') | ForEach-Object { Write-Output ('dist/' + $_.Name + ' | ' + [math]::Round($_.Length/1MB,1) + ' MB') }
