# One-command SSH setup for CI/CD
# Usage:  powershell -ExecutionPolicy Bypass -File setup-ssh.ps1

$ErrorActionPreference = "Stop"

$USERNAME = "abdulazizabdujalilov20062606"
$INSTANCE = "yuksalish-server"
$ZONE     = "europe-west3-a"
$KEY      = "$env:USERPROFILE\.ssh\yuksalish_deploy"

Write-Host ""
Write-Host "[1/6] Generating SSH key..." -ForegroundColor Cyan
if (-not (Test-Path "$env:USERPROFILE\.ssh")) {
    New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force | Out-Null
}
if (Test-Path $KEY) { Remove-Item $KEY -Force; Remove-Item "$KEY.pub" -Force -ErrorAction SilentlyContinue }
ssh-keygen -t ed25519 -f $KEY -C "github-actions" -N '""' -q
Write-Host "      OK: $KEY" -ForegroundColor Green

Write-Host ""
Write-Host "[2/6] Disabling OS Login on the VM..." -ForegroundColor Cyan
gcloud compute instances add-metadata $INSTANCE --zone=$ZONE --metadata=enable-oslogin=FALSE 2>&1 | Out-Null
Write-Host "      OK" -ForegroundColor Green

Write-Host ""
Write-Host "[3/6] Adding public key to VM metadata..." -ForegroundColor Cyan
$pub = (Get-Content "$KEY.pub" -Raw).Trim()
$entry = "${USERNAME}:$pub"
$tmp = "$env:TEMP\ssh-keys.txt"
[System.IO.File]::WriteAllText($tmp, $entry, [System.Text.Encoding]::ASCII)
gcloud compute instances add-metadata $INSTANCE --zone=$ZONE --metadata-from-file="ssh-keys=$tmp" 2>&1 | Out-Null
Remove-Item $tmp -Force -ErrorAction SilentlyContinue
Write-Host "      OK" -ForegroundColor Green

Write-Host ""
Write-Host "[4/6] Getting External IP..." -ForegroundColor Cyan
$ip = (gcloud compute instances describe $INSTANCE --zone=$ZONE --format="get(networkInterfaces[0].accessConfigs[0].natIP)").Trim()
Write-Host "      IP: $ip" -ForegroundColor Green

Write-Host ""
Write-Host "[5/6] Waiting 20s for metadata propagation, then testing SSH..." -ForegroundColor Cyan
Start-Sleep -Seconds 20
$result = ssh -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes "$USERNAME@$ip" "echo SSH_OK" 2>&1
if ($result -match "SSH_OK") {
    Write-Host "      OK: SSH works without password" -ForegroundColor Green
} else {
    Write-Host "      WARN: SSH test failed (metadata may still be propagating)" -ForegroundColor Yellow
    Write-Host "      Try again in 30s: ssh -i `"$KEY`" $USERNAME@$ip" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/6] Copying private key to clipboard..." -ForegroundColor Cyan
Get-Content $KEY -Raw | Set-Clipboard
Write-Host "      OK: paste with Ctrl+V" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "  GITHUB SECRETS  - put these 3 values" -ForegroundColor Magenta
Write-Host "  https://github.com/Ziyodillokh/marketplace/settings/secrets/actions" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  SSH_HOST         = $ip"
Write-Host "  SSH_USER         = $USERNAME"
Write-Host "  SSH_PRIVATE_KEY  = (in clipboard - Ctrl+V)"
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
