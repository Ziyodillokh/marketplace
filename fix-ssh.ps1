# All-in-one SSH setup for CI/CD
# Usage: powershell -ExecutionPolicy Bypass -File fix-ssh.ps1

$ErrorActionPreference = "Continue"

$USERNAME = "abdulazizabdujalilov20062606"
$IP       = "35.234.87.15"
$KEY      = "$env:USERPROFILE\.ssh\yuksalish_deploy"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  CI/CD SSH SETUP - all in one" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# --- 1. Delete old key and create new one ---
Write-Host ""
Write-Host "[1/5] Creating fresh SSH key..." -ForegroundColor Yellow
if (-not (Test-Path "$env:USERPROFILE\.ssh")) {
    New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force | Out-Null
}
Remove-Item $KEY -Force -ErrorAction SilentlyContinue
Remove-Item "$KEY.pub" -Force -ErrorAction SilentlyContinue
ssh-keygen -t ed25519 -f $KEY -C "github-actions" -N '""' -q
Write-Host "      OK: new key created" -ForegroundColor Green

# --- 2. Show server command to copy-paste ---
$pubKey = (Get-Content "$KEY.pub" -Raw).Trim()
$serverCmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && (grep -v 'github-actions' ~/.ssh/authorized_keys 2>/dev/null; echo `"$pubKey`") > /tmp/ak && mv /tmp/ak ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo OK_KEY_ADDED"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "  [2/5] COPY THIS COMMAND TO SERVER SSH:" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host $serverCmd -ForegroundColor White
Write-Host ""
$serverCmd | Set-Clipboard
Write-Host "  (Already copied to clipboard - paste in GCP Console SSH)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Open GCP Console SSH (browser), paste the command, hit Enter." -ForegroundColor Yellow
Write-Host "  Wait until you see: OK_KEY_ADDED" -ForegroundColor Yellow
Write-Host ""
Read-Host "  Press Enter HERE when you see OK_KEY_ADDED on server"

# --- 3. Test SSH from local ---
Write-Host ""
Write-Host "[3/5] Testing SSH from local..." -ForegroundColor Yellow

# Remove old host key entry to avoid stale fingerprint issues
$knownHosts = "$env:USERPROFILE\.ssh\known_hosts"
if (Test-Path $knownHosts) {
    ssh-keygen -R $IP 2>&1 | Out-Null
}

$result = ssh -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes "$USERNAME@$IP" "echo SSH_WORKS && whoami" 2>&1
$resultStr = ($result | Out-String)

if ($resultStr -match "SSH_WORKS") {
    Write-Host "      OK: SSH works!" -ForegroundColor Green
    Write-Host "      Server says: $(($resultStr -split "`n" | Where-Object {$_ -match '\w'}) -join '; ')" -ForegroundColor Gray
} else {
    Write-Host "      FAILED:" -ForegroundColor Red
    Write-Host $resultStr -ForegroundColor Red
    Write-Host ""
    Write-Host "  Did you paste the command to server? Try again:" -ForegroundColor Yellow
    Write-Host "  Server command is still in your clipboard. Paste it in GCP SSH." -ForegroundColor Yellow
    Read-Host "  Press Enter to retry SSH test"
    $result = ssh -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes "$USERNAME@$IP" "echo SSH_WORKS && whoami" 2>&1
    if (($result | Out-String) -notmatch "SSH_WORKS") {
        Write-Host "      Still failed. Check server SSH and try running this script again." -ForegroundColor Red
        exit 1
    }
    Write-Host "      OK on second try!" -ForegroundColor Green
}

# --- 4. Copy private key to clipboard ---
Write-Host ""
Write-Host "[4/5] Copying private key to clipboard..." -ForegroundColor Yellow
$privKey = Get-Content $KEY -Raw
$privKey | Set-Clipboard

# Quick validation
if ($privKey -match "BEGIN OPENSSH PRIVATE KEY" -and $privKey -match "END OPENSSH PRIVATE KEY") {
    Write-Host "      OK: private key valid, in clipboard (Ctrl+V to paste)" -ForegroundColor Green
    Write-Host "      Key length: $($privKey.Length) chars" -ForegroundColor Gray
} else {
    Write-Host "      WARN: private key seems malformed" -ForegroundColor Red
}

# --- 5. Final instructions ---
Write-Host ""
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "  [5/5] LAST STEP - UPDATE GITHUB SECRETS" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Open in browser:" -ForegroundColor Yellow
Write-Host "  https://github.com/Ziyodillokh/marketplace/settings/secrets/actions" -ForegroundColor White
Write-Host ""
Write-Host "  Update these 3 secrets (click pencil icon next to each):" -ForegroundColor Yellow
Write-Host ""
Write-Host "    SSH_HOST         = $IP"
Write-Host "    SSH_USER         = $USERNAME"
Write-Host "    SSH_PRIVATE_KEY  = press Ctrl+V (already in clipboard)"
Write-Host ""
Write-Host "  Steps for SSH_PRIVATE_KEY:" -ForegroundColor Yellow
Write-Host "    1. Click pencil icon next to SSH_PRIVATE_KEY"
Write-Host "    2. Press Ctrl+A then Delete (clear old value)"
Write-Host "    3. Press Ctrl+V (paste new key)"
Write-Host "    4. Click 'Update secret'"
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  AFTER UPDATING SECRETS:" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Run this to trigger a test deploy:" -ForegroundColor Yellow
Write-Host ""
Write-Host '    git commit --allow-empty -m "test deploy" ; git push origin main' -ForegroundColor White
Write-Host ""
Write-Host "  Then watch:" -ForegroundColor Yellow
Write-Host "  https://github.com/Ziyodillokh/marketplace/actions" -ForegroundColor White
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
