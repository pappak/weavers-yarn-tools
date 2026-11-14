# Detects yarn photo strips in the 9 Master Yarn Chart page screenshots and
# crops them sequentially in column-major order (col1 top->bottom, col2, ...),
# matching the YL_YARNS database order. Columns are found by splitting the
# content span at the widest white gutters in the x-histogram.
Add-Type -AssemblyName System.Drawing
$pagesDir = 'C:\Users\eldon\Workspace\weavers-yarn-tools\chart-pages'
$outDir = 'C:\Users\eldon\Workspace\weavers-yarn-tools\chart-crops'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Remove-Item (Join-Path $outDir '*.png') -ErrorAction SilentlyContinue

function Test-PhotoPixel($c) {
    $lum = ($c.R * 0.299 + $c.G * 0.587 + $c.B * 0.114) / 255.0
    $gray = ([math]::Abs($c.R - $c.G) -lt 30) -and ([math]::Abs($c.G - $c.B) -lt 32)
    return ($gray -and $lum -gt 0.05 -and $lum -lt 0.93)
}

$pages = Get-ChildItem $pagesDir -Filter '*.png' | Sort-Object Name
$globalIdx = 0

foreach ($page in $pages) {
    $bmp = [System.Drawing.Bitmap]::new($page.FullName)
    $W = $bmp.Width; $H = $bmp.Height

    # ── x-histogram of photographic pixels ──
    $colHist = New-Object int[] $W
    for ($y = 0; $y -lt $H; $y += 3) {
        for ($x = 0; $x -lt $W; $x += 2) {
            if (Test-PhotoPixel ($bmp.GetPixel($x, $y))) { $colHist[$x]++ }
        }
    }
    $max = ($colHist | Measure-Object -Maximum).Maximum
    $lo = -1; $hi = -1
    for ($x = 0; $x -lt $W; $x++) {
        if ($colHist[$x] -gt [math]::Max(3, $max * 0.05)) { if ($lo -lt 0) { $lo = $x }; $hi = $x }
    }
    Write-Output ("PAGE " + $page.Name + "  W=" + $W + " H=" + $H + " span=" + $lo + ".." + $hi)

    # ── find gutters: runs of near-zero histogram inside the span ──
    $gutThresh = [math]::Max(2, $max * 0.06)
    $gutters = New-Object System.Collections.ArrayList
    $inG = $false; $g0 = 0
    for ($x = $lo; $x -le $hi; $x++) {
        if ($colHist[$x] -le $gutThresh) {
            if (-not $inG) { $inG = $true; $g0 = $x }
        } else {
            if ($inG) {
                $inG = $false
                if ($x - $g0 -ge 14) { [void]$gutters.Add(@($g0, $x)) }
            }
        }
    }
    if ($inG -and ($hi - $g0) -ge 14) { [void]$gutters.Add(@($g0, $hi)) }

    # Split points = the 3 widest gutters
    $splits = @()
    if ($gutters.Count -ge 3) {
        $splits = @($gutters | Sort-Object { $_[1] - $_[0] } -Descending | Select-Object -First 3 | Sort-Object { $_[0] } | ForEach-Object { [int](($_[0] + $_[1]) / 2) })
    }
    $colRanges = New-Object System.Collections.ArrayList
    if ($splits.Count -eq 3) {
        [void]$colRanges.Add(@($lo, $splits[0]))
        [void]$colRanges.Add(@($splits[0], $splits[1]))
        [void]$colRanges.Add(@($splits[1], $splits[2]))
        [void]$colRanges.Add(@($splits[2], $hi + 1))
    } else {
        # Fallback: quarter split of the span
        $colW = [math]::Floor(($hi - $lo) / 4)
        for ($ci = 0; $ci -lt 4; $ci++) {
            $a = $lo + $ci * $colW
            $b = $lo + ($ci + 1) * $colW
            if ($ci -eq 3) { $b = $hi + 1 }
            [void]$colRanges.Add(@($a, $b))
        }
        Write-Output ("  WARN: gutters=" + $gutters.Count + " -> quarter fallback")
    }

    $pageTotal = 0
    $colCounts = @()
    foreach ($col in $colRanges) {
        # Trim column to its content
        $x0 = $col[0]; $x1 = $col[1]
        $t0 = -1; $t1 = -1
        for ($x = $x0; $x -lt $x1; $x++) {
            if ($colHist[$x] -gt [math]::Max(2, $max * 0.04)) { if ($t0 -lt 0) { $t0 = $x }; $t1 = $x }
        }
        if ($t0 -lt 0) { $t0 = $x0; $t1 = $x1 }
        $cw = $t1 - $t0

        # ── band rows: rows mostly covered by photographic pixels ──
        $bandRows = New-Object bool[] $H
        for ($y = 0; $y -lt $H; $y++) {
            $hit = 0
            for ($x = $t0; $x -le $t1; $x++) {
                if (Test-PhotoPixel ($bmp.GetPixel($x, $y))) { $hit++ }
            }
            if ($hit -gt ($cw * 0.5)) { $bandRows[$y] = $true }
        }
        # ── group consecutive band rows ──
        $bands = New-Object System.Collections.ArrayList
        $inB = $false; $b0 = 0
        for ($y = 0; $y -lt $H; $y++) {
            if ($bandRows[$y]) {
                if (-not $inB) { $inB = $true; $b0 = $y }
            } else {
                if ($inB) {
                    $inB = $false
                    $bh = $y - $b0
                    if ($bh -ge 12 -and $bh -le 170) { [void]$bands.Add(@($b0, $y)) }
                }
            }
        }
        $colCounts += $bands.Count
        foreach ($b in $bands) {
            $y0 = [math]::Max(0, $b[0] - 2); $y1 = [math]::Min($H, $b[1] + 2)
            $bh = $y1 - $y0
            $crop = New-Object System.Drawing.Bitmap $cw, $bh
            $g = [System.Drawing.Graphics]::FromImage($crop)
            $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $cw, $bh), (New-Object System.Drawing.Rectangle $t0, $y0, $cw, $bh), [System.Drawing.GraphicsUnit]::Pixel)
            $g.Dispose()
            $name = 'yarn-{0:d3}.png' -f $globalIdx
            $crop.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
            $crop.Dispose()
            $globalIdx++
        }
        $pageTotal += $bands.Count
    }
    Write-Output ("  gutterSplits=" + ($splits -join ',') + "  perCol=[" + ($colCounts -join ',') + "] pageTotal=" + $pageTotal)
    $bmp.Dispose()
}
Write-Output ('TOTAL CROPS: ' + $globalIdx)
