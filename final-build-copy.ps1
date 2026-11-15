$ErrorActionPreference = 'Continue'
$proj = 'C:\Users\eldon\Workspace\weavers-yarn-tools'
$nas = '\\NAS01\homes\[PROJECTS]\Yarn Calculator'

# 1) Clean slate for the build output (all builders are dead now)
Remove-Item (Join-Path $proj 'dist') -Recurse -Force -ErrorAction SilentlyContinue

# 2) One clean build
npm run dist --prefix $proj
if ($LASTEXITCODE -ne 0) { Write-Output 'BUILD FAILED'; exit 1 }
Write-Output '=== BUILD OK ==='

# 3) Launch for the user
Start-Process (Join-Path $proj 'dist\win-unpacked\Weavers Yarn Tools.exe')
Write-Output 'app launched'

# 4) NAS copy with no retry storms
New-Item -ItemType Directory -Force -Path (Join-Path $nas 'dist') | Out-Null
Write-Output 'copying app/ ...'
robocopy (Join-Path $proj 'app') (Join-Path $nas 'app') /E /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
Write-Output 'copying build/ ...'
robocopy (Join-Path $proj 'build') (Join-Path $nas 'build') /E /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
foreach ($f in @('main.js', 'package.json', 'package-lock.json', 'README.md', 'BUILD-MAC.md', 'build-app.mjs', 'detect-photos.mjs', '.gitignore')) {
    Copy-Item (Join-Path $proj $f) (Join-Path $nas $f) -Force
}
Write-Output 'copying installers ...'
Copy-Item (Join-Path $proj 'dist\Weavers Yarn Tools Setup 1.0.0.exe') (Join-Path $nas 'dist') -Force
Copy-Item (Join-Path $proj 'dist\Weavers Yarn Tools 1.0.0.exe') (Join-Path $nas 'dist') -Force

# 5) Verify
Write-Output '=== VERIFY ==='
Write-Output ('NAS installer: ' + (Test-Path (Join-Path $nas 'dist\Weavers Yarn Tools Setup 1.0.0.exe')))
$photos = (Get-ChildItem (Join-Path $nas 'app\yarn-photos') -Filter '*.png' -ErrorAction SilentlyContinue).Count
Write-Output ('NAS photos: ' + $photos + '/442')
$h1 = (Get-FileHash (Join-Path $proj 'app\index.html')).Hash
$h2 = (Get-FileHash (Join-Path $nas 'app\index.html')).Hash
Write-Output ('index.html hash match: ' + ($h1 -eq $h2))
Write-Output 'DONE'
