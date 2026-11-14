$ErrorActionPreference = 'Stop'
$src = '\\NAS01\homes\[PROJECTS]\WeaversCanvas\Projects\WeaversCanvas\Docs'
$dst = 'C:\Users\eldon\Workspace\weavers-yarn-tools\chart-pages'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Get-ChildItem -LiteralPath $src -Filter 'Screenshot 2026-06-04*.png' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dst $_.Name) -Force
    Write-Output $_.Name
}
