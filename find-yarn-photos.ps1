$ErrorActionPreference = 'Continue'
$roots = @(
    '\\NAS01\homes\[PROJECTS]\WeaversCanvas\Projects\WeaversCanvas',
    '\\NAS01\homes\[PROJECTS]\WeaversCanvas'
)
foreach ($r in $roots) {
    Write-Output ('=== ' + $r + ' ===')
    Get-ChildItem -LiteralPath $r -Recurse -Include *.jpg,*.jpeg,*.png,*.gif,*.pdf,*.webp -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Output ($_.FullName.Substring($r.Length) + ' | ' + [math]::Round($_.Length/1KB,0) + ' KB') }
}
