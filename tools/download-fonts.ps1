# OğuzWeb — font indirme (Windows / PowerShell)
# Kullanım:  powershell -ExecutionPolicy Bypass -File tools\download-fonts.ps1
# Ağ erişimi gerektirir. Node 18+ kurulu olmalıdır.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "✗ Node bulunamadı. https://nodejs.org adresinden kurun (18 veya üzeri)." -ForegroundColor Red
  exit 1
}

$major = [int](node -p "process.versions.node.split('.')[0]")
if ($major -lt 18) {
  Write-Host "✗ Node $major bulundu. 18 veya üzeri gerekli." -ForegroundColor Red
  exit 1
}

Write-Host "Source Serif 4 ve Source Sans 3 indiriliyor (latin + latin-ext)…"
node tools/fonts.js

Write-Host ""
Write-Host "Dosyalar: src\fonts\"
Get-ChildItem src\fonts -ErrorAction SilentlyContinue | Format-Table Name, Length

Write-Host ""
Write-Host "Sonraki adim:"
Write-Host "  1) npx serve ."
Write-Host "  2) tarayicida tools\font-metrics.html acin"
Write-Host "  3) cikan degerleri src\css\03-base\fonts.css icine yapistirin"
