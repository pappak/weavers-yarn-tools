Add-Type -AssemblyName System.Drawing
$p = 'C:\Users\eldon\Workspace\weavers-yarn-tools\chart-pages\Screenshot 2026-06-04 131916.png'
$bmp = [System.Drawing.Bitmap]::new($p)
$W = $bmp.Width; $H = $bmp.Height
# Page 1: first photo (Size 60 sewing thread) — find its exact vertical extent
# by scanning x=60..250 for dark rows and printing hit counts per y
foreach ($y in 250..340) {
    $hit = 0; $samples = @()
    for ($x = 54; $x -lt 254; $x++) {
        $c = $bmp.GetPixel($x, $y)
        $lum = ($c.R * 0.299 + $c.G * 0.587 + $c.B * 0.114) / 255.0
        $gray = [math]::Abs($c.R - $c.G) -lt 30 -and [math]::Abs($c.G - $c.B) -lt 32
        if ($gray -and $lum -gt 0.05 -and $lum -lt 0.93) {
            $hit++
            if ($samples.Count -lt 3) { $samples += ('(' + $c.R + ',' + $c.G + ',' + $c.B + ')') }
        }
    }
    if ($hit -gt 20) { Write-Output ('y=' + $y + ' hit=' + $hit + '/200  e.g. ' + ($samples -join ' ')) }
}
$bmp.Dispose()
