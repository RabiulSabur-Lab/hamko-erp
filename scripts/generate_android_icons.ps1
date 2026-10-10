Add-Type -AssemblyName System.Drawing

$sourcePath = "E:\Pendrive\All AI\Hamko.png"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found: $sourcePath"
    exit 1
}

$rawImg = [System.Drawing.Bitmap]::FromFile($sourcePath)

# 1. Precise bounding box crop (17, 9, 510, 177)
$cropRect = New-Object System.Drawing.Rectangle(17, 9, 510, 177)
$croppedLogo = $rawImg.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$rawImg.Dispose()

$logoRatio = $croppedLogo.Height / $croppedLogo.Width

function Draw-HighQualityImage {
    param(
        [int]$CanvasWidth,
        [int]$CanvasHeight,
        [string]$BgType, # 'white_square', 'white_circle', 'transparent', 'white_solid'
        [double]$LogoScalePercent, # e.g. 0.80
        [string]$OutputPath
    )

    $bmp = New-Object System.Drawing.Bitmap($CanvasWidth, $CanvasHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Background
    if ($BgType -eq 'white_square' -or $BgType -eq 'white_solid') {
        $g.Clear([System.Drawing.Color]::White)
    } elseif ($BgType -eq 'white_circle') {
        $g.Clear([System.Drawing.Color]::Transparent)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillEllipse($brush, 0, 0, $CanvasWidth, $CanvasHeight)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    # Draw logo if not pure background
    if ($BgType -ne 'white_solid') {
        $targetW = [Math]::Round($CanvasWidth * $LogoScalePercent)
        $targetH = [Math]::Round($targetW * $logoRatio)
        
        # Guard if height exceeds safe vertical padding (80% of canvas)
        $maxH = [Math]::Round($CanvasHeight * 0.80)
        if ($targetH -gt $maxH) {
            $targetH = $maxH
            $targetW = [Math]::Round($targetH / $logoRatio)
        }

        $destX = [Math]::Round(($CanvasWidth - $targetW) / 2.0)
        $destY = [Math]::Round(($CanvasHeight - $targetH) / 2.0)
        $destRect = New-Object System.Drawing.Rectangle($destX, $destY, $targetW, $targetH)

        $g.DrawImage($croppedLogo, $destRect, 0, 0, $croppedLogo.Width, $croppedLogo.Height, [System.Drawing.GraphicsUnit]::Pixel)
    }

    $g.Dispose()

    # Ensure output directory exists
    $parentDir = [System.IO.Path]::GetDirectoryName($OutputPath)
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated: $OutputPath ($CanvasWidth x $CanvasHeight)"
}

$densities = @(
    @{ Name = "mipmap-ldpi";   IconSize = 36;  AdaptiveSize = 81 },
    @{ Name = "mipmap-mdpi";   IconSize = 48;  AdaptiveSize = 108 },
    @{ Name = "mipmap-hdpi";   IconSize = 72;  AdaptiveSize = 162 },
    @{ Name = "mipmap-xhdpi";  IconSize = 96;  AdaptiveSize = 216 },
    @{ Name = "mipmap-xxhdpi"; IconSize = 144; AdaptiveSize = 324 },
    @{ Name = "mipmap-xxxhdpi";IconSize = 192; AdaptiveSize = 432 }
)

$resDir = "E:\Pendrive\All AI\project\android\app\src\main\res"

foreach ($d in $densities) {
    $folder = Join-Path $resDir $d.Name

    # 1. ic_launcher.png (Legacy square with clean white background)
    $outSquare = Join-Path $folder "ic_launcher.png"
    Draw-HighQualityImage -CanvasWidth $d.IconSize -CanvasHeight $d.IconSize -BgType 'white_square' -LogoScalePercent 0.82 -OutputPath $outSquare

    # 2. ic_launcher_round.png (Legacy round with crisp circular white background)
    $outRound = Join-Path $folder "ic_launcher_round.png"
    Draw-HighQualityImage -CanvasWidth $d.IconSize -CanvasHeight $d.IconSize -BgType 'white_circle' -LogoScalePercent 0.72 -OutputPath $outRound

    # 3. ic_launcher_foreground.png (Adaptive foreground with transparent background & centered safe logo)
    $outFg = Join-Path $folder "ic_launcher_foreground.png"
    Draw-HighQualityImage -CanvasWidth $d.AdaptiveSize -CanvasHeight $d.AdaptiveSize -BgType 'transparent' -LogoScalePercent 0.66 -OutputPath $outFg

    # 4. ic_launcher_background.png (Adaptive background pure solid white)
    $outBg = Join-Path $folder "ic_launcher_background.png"
    Draw-HighQualityImage -CanvasWidth $d.AdaptiveSize -CanvasHeight $d.AdaptiveSize -BgType 'white_solid' -LogoScalePercent 0 -OutputPath $outBg
}

# Also generate a crisp web favicon
$webFavicon = "E:\Pendrive\All AI\project\public\favicon.png"
Draw-HighQualityImage -CanvasWidth 128 -CanvasHeight 128 -BgType 'white_circle' -LogoScalePercent 0.75 -OutputPath $webFavicon

$croppedLogo.Dispose()
Write-Output "All icons successfully generated!"
