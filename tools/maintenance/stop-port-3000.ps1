$Port3000Pids = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
if ($Port3000Pids) {
  $Port3000Pids | ForEach-Object { Stop-Process -Id $_ -Force }
  Write-Host "Stopped process(es) using port 3000." -ForegroundColor Green
} else {
  Write-Host "Nothing is using port 3000." -ForegroundColor Yellow
}
