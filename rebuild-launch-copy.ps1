$ErrorActionPreference = 'Continue'
$proj = 'C:\Users\eldon\Workspace\weavers-yarn-tools'
Get-Process 'Weavers Yarn Tools' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
npm run dist --prefix $proj
if ($LASTEXITCODE -eq 0) {
    Write-Output '=== BUILD OK — launching app ==='
    Start-Process (Join-Path $proj 'dist\win-unpacked\Weavers Yarn Tools.exe')
    Write-Output '=== COPY TO NAS ==='
    $nas = '\\NAS01\homes\[PROJECTS]\Yarn Calculator'
    robocopy (Join-Path $proj 'app') (Join-Path $nas 'app') /E /MIR /NFL /NDL /NJH /NJS | Out-Null
    robocopy (Join-Path $proj 'build') (Join-Path $nas 'build') /E /NFL /NDL /NJH /NJS | Out-Null
    foreach ($f in @('main.js', 'package.json', 'package-lock.json', 'README.md', 'BUILD-MAC.md', 'build-app.mjs', 'detect-photos.mjs', '.gitignore')) {
        Copy-Item (Join-Path $proj $f) (Join-Path $nas $f) -Force
    }
    Copy-Item (Join-Path $proj 'dist\Weavers Yarn Tools Setup 1.0.0.exe') (Join-Path $nas 'dist') -Force
    Copy-Item (Join-Path $proj 'dist\Weavers Yarn Tools 1.0.0.exe') (Join-Path $nas 'dist') -Force
    Write-Output '=== NAS DIST ==='
    Get-ChildItem (Join-Path $nas 'dist') -Filter '*.exe' | ForEach-Object {
        Write-Output ($_.Name + ' | ' + [math]::Round($_.Length/1MB,1) + ' MB')
    }
} else {
    Write-Output 'BUILD FAILED'
}
