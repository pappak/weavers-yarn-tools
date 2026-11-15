$ErrorActionPreference = 'Continue'
$proj = 'C:\Users\eldon\Workspace\weavers-yarn-tools'
$nas = '\\NAS01\homes\[PROJECTS]\Yarn Calculator'
Write-Output 'copying app/ ...'
robocopy (Join-Path $proj 'app') (Join-Path $nas 'app') /E /MIR /NFL /NDL /NJH /NJS | Out-Null
Write-Output 'copying build/ ...'
robocopy (Join-Path $proj 'build') (Join-Path $nas 'build') /E /MIR /NFL /NDL /NJH /NJS | Out-Null
Write-Output 'copying project files ...'
foreach ($f in @('main.js', 'package.json', 'package-lock.json', 'README.md', 'BUILD-MAC.md', 'build-app.mjs', 'detect-photos.mjs', '.gitignore')) {
    Copy-Item (Join-Path $proj $f) (Join-Path $nas $f) -Force
}
Write-Output 'copying installers ...'
Copy-Item (Join-Path $proj 'dist\Weavers Yarn Tools Setup 1.0.0.exe') (Join-Path $nas 'dist') -Force
Copy-Item (Join-Path $proj 'dist\Weavers Yarn Tools 1.0.0.exe') (Join-Path $nas 'dist') -Force
Write-Output '=== VERIFY ==='
Write-Output ('NAS installer: ' + (Test-Path (Join-Path $nas 'dist\Weavers Yarn Tools Setup 1.0.0.exe')))
Write-Output ('NAS photos: ' + (Get-ChildItem (Join-Path $nas 'app\yarn-photos') -Filter '*.png' -ErrorAction SilentlyContinue).Count + ' files')
$h1 = (Get-FileHash (Join-Path $proj 'app\index.html')).Hash
$h2 = (Get-FileHash (Join-Path $nas 'app\index.html')).Hash
Write-Output ('index.html hash match: ' + ($h1 -eq $h2))
Write-Output 'DONE'
