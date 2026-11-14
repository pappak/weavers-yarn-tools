Add-Type -AssemblyName System.Drawing
$p = 'C:\Users\eldon\Workspace\weavers-yarn-tools\chart-pages\Screenshot 2026-06-04 131916.png'
$bmp = [System.Drawing.Bitmap]::new($p)
Write-Output ("SIZE: " + $bmp.Width + " x " + $bmp.Height + "  PixelFormat: " + $bmp.PixelFormat)
# Sample a 10x10 grid of pixels with values
for ($fy = 0.05; $fy -le 0.95; $fy += 0.10) {
    $y = [int]($bmp.Height * $fy)
    $row = ''
    for ($fx = 0.08; $fx -le 0.92; $fx += 0.092) {
        $x = [int]($bmp.Width * $fx)
        $c = $bmp.GetPixel($x, $y)
        $row += ('(' + $c.R + ',' + $c.G + ',' + $c.B + ') ')
    }
    Write-Output ('y=' + $y + ': ' + $row)
}
$bmp.Dispose()
