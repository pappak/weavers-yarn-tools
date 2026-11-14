$ErrorActionPreference = 'Stop'
$proj = 'C:\Users\eldon\Workspace\weavers-yarn-tools'
Set-Location $proj
git branch -m master main
git rm --cached fix-codesign-cache.ps1 push-repo.ps1 | Out-Null
Remove-Item (Join-Path $proj 'fix-codesign-cache.ps1'), (Join-Path $proj 'push-repo.ps1') -Force
git add -A
git commit --amend --no-edit
Write-Output '=== PUSH ==='
git push -u origin main
Write-Output '=== LOG ==='
git log --oneline -1
