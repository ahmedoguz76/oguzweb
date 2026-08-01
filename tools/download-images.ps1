# OğuzWeb — görsel indirme ve hazırlama (Windows / PowerShell)
# Kullanım:  powershell -ExecutionPolicy Bypass -File tools\download-images.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$SrcDir   = "src\images\_source"
$Manifest = "tools\assets.json"
New-Item -ItemType Directory -Force -Path $SrcDir | Out-Null

if (Test-Path $Manifest) {
  Write-Host "Manifest bulundu: $Manifest"
  $items = Get-Content $Manifest -Raw | ConvertFrom-Json
  foreach ($item in $items) {
    $target = Join-Path $SrcDir $item.file
    if (Test-Path $target) {
      Write-Host "  . $($item.file) (mevcut, atlandi)"
      continue
    }
    Write-Host "  v $($item.file)"
    try {
      Invoke-WebRequest -Uri $item.url -OutFile $target -UseBasicParsing
    } catch {
      Write-Host "  x indirilemedi: $($item.url)" -ForegroundColor Red
    }
  }
} else {
  Write-Host "tools\assets.json yok - indirme adimi atlandi."
  Write-Host "Gorselleri elle $SrcDir klasorune koyun."
}

$count = (Get-ChildItem $SrcDir -Include *.png,*.jpg,*.jpeg -Recurse -ErrorAction SilentlyContinue).Count
Write-Host ""
Write-Host "$SrcDir icinde $count kaynak gorsel var."

if ($count -eq 0) {
  Write-Host ""
  Write-Host "Proje ekran goruntusu standardi:"
  Write-Host "  . yakalama genisligi 1440px (tum projelerde ayni)"
  Write-Host "  . tarayici cercevesi yok, icerik alanina kirpilmis"
  Write-Host "  . en-boy orani 16:10 masaustu / 4:5 portre"
  Write-Host "  . PNG, sRGB"
  exit 0
}

Write-Host ""
Write-Host "Varyantlar uretiliyor..."
node tools/images.js
