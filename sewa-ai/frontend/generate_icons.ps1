Add-Type -AssemblyName System.Drawing
$src = 'C:\Users\USER\.gemini\antigravity\brain\7054349e-9f34-4d87-af05-5a2439e67ee9\sewa_ai_logo_master_v2_1776748116290.png'
$img = [System.Drawing.Image]::FromFile($src)

function Resize-Image($size, $path) {
    $newImg = new-object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($newImg)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($img, 0, 0, $size, $size)
    $newImg.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $newImg.Dispose()
    Write-Host "Generated: $path ($($size)x$($size))"
}

$iconSizes = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($s in $iconSizes) {
    Resize-Image $s "public/icons/icon-$s.png"
}

# Favicon
Resize-Image 32 "public/favicon.ico"

$img.Dispose()
