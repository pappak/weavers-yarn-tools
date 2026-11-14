Add-Type -AssemblyName System.Drawing
$p = 'C:\Users\eldon\Workspace\weavers-yarn-tools\chart-pages\Screenshot 2026-06-04 131916.png'
$bmp = [System.Drawing.Bitmap]::new($p)
$W = $bmp.Width; $H = $bmp.Height

# Test the predicate on a known photo pixel
$probe = $bmp.GetPixel(150, 300)
$lumP = ($probe.R * 0.299 + $probe.G * 0.587 + $probe.B * 0.114) / 255.0
Write-Output ("probe(150,300) = (" + $probe.R + "," + $probe.G + "," + $probe.B + ")  lum=" + [math]::Round($lumP,3) +
    "  gray=" + ([math]::Abs($probe.R - $probe.G) -lt 28) + "/" + ([math]::Abs($probe.G - $probe.B) -lt 28) +
    "  inRange=" + ($lumP -gt 0.05 -and $lumP -lt 0.88))

$colHist = New-Object int[] $W
for ($y = 0; $y -lt $H; $y += 3) {
    for ($x = 0; $x -lt $W; $x += 2) {
        $c = $bmp.GetPixel($x, $y)
        $lum = ($c.R * 0.299 + $c.G * 0.587 + $c.B * 0.114) / 255.0
        if ($lum -gt 0.05 -and $lum -lt 0.88) { $colHist[$x]++ }
    }
}
$max = ($colHist | Measure-Object -Maximum).Maximum
$nonzero = ($colHist | Where-Object { $_ -gt 0 }).Count
Write-Output ("HIST max=" + $max + "  nonzero-cols=" + $nonzero + "/" + $W)
# Print histogram summary per 50px bucket
for ($b = 0; $b -lt $W; $b += 50) {
    $s = 0; for ($x = $b; $x -lt [math]::Min($b + 50, $W); $x++) { $s += $colHist[$x] }
    if ($s -gt 0) { Write-Output ("  x" + $b + "-" + ($b + 49) + ": " + $s) }
}
$bmp.Dispose()
