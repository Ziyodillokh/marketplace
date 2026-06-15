#Requires -Version 5.0
# ═══════════════════════════════════════════════════════════════════
# CI/CD avtomatik sozlash — bitta skript hammasini qiladi.
#
# Foydalanish (Windows PowerShell'da):
#   cd C:\Users\user\Desktop\marketplace
#   powershell -ExecutionPolicy Bypass -File setup-cicd.ps1
#
# Bu skript:
#   1. Lokal o'zgarishlarni GitHub'ga push qiladi
#   2. SSH key (ed25519) yaratadi
#   3. Server External IP'ni oladi
#   4. OS Login'ni o'chiradi
#   5. SSH key'ni server metadata orqali qo'shadi
#   6. SSH ulanishni test qiladi
#   7. Server'da bootstrap/update buyrug'ini ko'rsatadi
#   8. GitHub Secrets uchun barcha qiymatlarni ekranga chiqaradi
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

$INSTANCE = "yuksalish-server"
$ZONE = "europe-west3-a"
$USER = "abdulazizabdujalilov20062606"
$KEY_PATH = "$env:USERPROFILE\.ssh\yuksalish_deploy"

function Section($title) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
}

function Ok($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Err($msg)  { Write-Host "  ✗ $msg" -ForegroundColor Red }

# ─── 1. Git push ─────────────────────────────────────────────
Section "1/8  Git push (lokal → GitHub)"
try {
    $status = git status --porcelain 2>&1
    if ($status) {
        Warn "Uncommitted o'zgarishlar bor — avval commit qiling"
        git status --short
    }
    $unpushed = git log origin/main..HEAD --oneline 2>&1
    if ($unpushed) {
        Write-Host "  Push qilinadigan commit'lar:" -ForegroundColor Yellow
        Write-Host $unpushed
        git push origin main
        Ok "Push muvaffaqiyatli"
    } else {
        Ok "Hamma narsa push qilingan"
    }
} catch {
    Err "Git push xato: $_"
    Write-Host "  Davom etish uchun qo'lda push qiling: git push origin main" -ForegroundColor Yellow
    exit 1
}

# ─── 2. SSH key yaratish ─────────────────────────────────────
Section "2/8  SSH key yaratish"
if (Test-Path $KEY_PATH) {
    Warn "Key allaqachon bor: $KEY_PATH"
    $overwrite = Read-Host "  Qaytadan yaratasizmi? (uni o'chiradi) [y/N]"
    if ($overwrite -match '^[Yy]') {
        Remove-Item $KEY_PATH -Force
        Remove-Item "$KEY_PATH.pub" -Force -ErrorAction SilentlyContinue
        ssh-keygen -t ed25519 -f $KEY_PATH -C "github-actions" -N '""' | Out-Null
        Ok "Yangi key yaratildi"
    } else {
        Ok "Eski key ishlatiladi"
    }
} else {
    if (-not (Test-Path "$env:USERPROFILE\.ssh")) {
        New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force | Out-Null
    }
    ssh-keygen -t ed25519 -f $KEY_PATH -C "github-actions" -N '""' | Out-Null
    Ok "SSH key yaratildi: $KEY_PATH"
}

$pubKey = Get-Content "$KEY_PATH.pub" -Raw
$pubKey = $pubKey.Trim()
Ok "Public key: $($pubKey.Substring(0, 50))..."

# ─── 3. gcloud tekshirish ────────────────────────────────────
Section "3/8  gcloud tekshirish"
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Ok "gcloud topildi: $gcloudVersion"
} catch {
    Err "gcloud topilmadi — o'rnatish: https://cloud.google.com/sdk/docs/install"
    exit 1
}

$activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
if (-not $activeAccount) {
    Warn "gcloud'ga login qilinmagan — login qilamiz..."
    gcloud auth login
}
Ok "Faol akkount: $activeAccount"

$project = gcloud config get-value project 2>&1
if (-not $project -or $project -match "unset") {
    Warn "Project tanlanmagan — ro'yxatdan tanlang:"
    gcloud projects list
    $project = Read-Host "  Project ID ni yozing"
    gcloud config set project $project
}
Ok "Project: $project"

# ─── 4. External IP olish ────────────────────────────────────
Section "4/8  Server External IP"
$ip = gcloud compute instances describe $INSTANCE --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>&1
if ($ip -match "^\d+\.\d+\.\d+\.\d+$") {
    Ok "External IP: $ip"
} else {
    Err "IP olishda xato: $ip"
    exit 1
}

# ─── 5. OS Login o'chirish (instance-level) ─────────────────
Section "5/8  OS Login holatini tekshirish"
$osLoginInstance = gcloud compute instances describe $INSTANCE --zone=$ZONE --format="value(metadata.items[].filter(key='enable-oslogin').extract(value))" 2>&1
$osLoginProject = gcloud compute project-info describe --format="value(commonInstanceMetadata.items[].filter(key='enable-oslogin').extract(value))" 2>&1

if ($osLoginInstance -match "TRUE" -or $osLoginProject -match "TRUE") {
    Warn "OS Login yoqilgan — VM uchun o'chiramiz"
    gcloud compute instances add-metadata $INSTANCE --zone=$ZONE --metadata=enable-oslogin=FALSE | Out-Null
    Ok "OS Login bu VM uchun o'chirildi"
} else {
    Ok "OS Login o'chirilgan"
}

# ─── 6. Public key'ni serverga metadata orqali qo'yish ──────
Section "6/8  Public key'ni serverga qo'yish (metadata orqali)"
$sshKeyEntry = "$USER`:$pubKey"
$tmpFile = New-TemporaryFile
Set-Content -Path $tmpFile -Value $sshKeyEntry -NoNewline

try {
    # Mavjud ssh-keys metadata'ni olib, yangini qo'shamiz
    $existingKeys = gcloud compute instances describe $INSTANCE --zone=$ZONE --format="value(metadata.items[].filter(key='ssh-keys').extract(value))" 2>&1

    if ($existingKeys -and $existingKeys -notmatch "^\s*$") {
        # Allaqachon bor — qo'shimcha qatorga qo'shamiz (agar dublikat bo'lmasa)
        if ($existingKeys -match [regex]::Escape($pubKey)) {
            Ok "Key allaqachon serverda bor — o'tkazib yuboramiz"
        } else {
            $combined = "$existingKeys`n$sshKeyEntry"
            Set-Content -Path $tmpFile -Value $combined -NoNewline
            gcloud compute instances add-metadata $INSTANCE --zone=$ZONE --metadata-from-file="ssh-keys=$tmpFile" | Out-Null
            Ok "Key serverga qo'shildi (eski kalit saqlandi)"
        }
    } else {
        gcloud compute instances add-metadata $INSTANCE --zone=$ZONE --metadata-from-file="ssh-keys=$tmpFile" | Out-Null
        Ok "Key serverga birinchi marta qo'shildi"
    }
} finally {
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
}

# Metadata propagation uchun kutish
Write-Host "  ⏳ Server metadata yangilanishini kutamiz (15 sek)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# ─── 7. SSH test ─────────────────────────────────────────────
Section "7/8  SSH ulanish testi"
$sshResult = ssh -i $KEY_PATH -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes "$USER@$ip" "echo SSH_OK && whoami && pwd" 2>&1
if ($sshResult -match "SSH_OK") {
    Ok "SSH muvaffaqiyatli — parolsiz ulanish ishlayapti"
    Write-Host "  Server javobi:" -ForegroundColor Gray
    $sshResult | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Err "SSH xato:"
    $sshResult | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    Warn "Yana 30 sek kutib qaytadan urinib ko'ring (metadata sekin tarqalishi mumkin)"
}

# ─── 8. GitHub Secrets uchun qiymatlar ───────────────────────
Section "8/8  GitHub Secrets — quyidagi qiymatlarni kiriting"

Write-Host ""
Write-Host "  Brauzerda oching:" -ForegroundColor Yellow
Write-Host "  https://github.com/Ziyodillokh/marketplace/settings/secrets/actions" -ForegroundColor White
Write-Host ""

Write-Host "  ─── SSH_HOST ───" -ForegroundColor Magenta
Write-Host "  $ip"
Write-Host ""

Write-Host "  ─── SSH_USER ───" -ForegroundColor Magenta
Write-Host "  $USER"
Write-Host ""

Write-Host "  ─── SSH_PRIVATE_KEY ───" -ForegroundColor Magenta
Write-Host "  (Quyidagi BUTUN matnni nusxalang — BEGIN dan END gacha)"
Write-Host ""
Get-Content $KEY_PATH | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
Write-Host ""

# ─── Buffer ga private key'ni nusxalash (qulaylik uchun)
try {
    Get-Content $KEY_PATH -Raw | Set-Clipboard
    Ok "Private key buferga (clipboard) nusxalandi — to'g'ridan-to'g'ri Ctrl+V qiling"
} catch {
    Warn "Buferga nusxalash ishlamadi — yuqoridagidan qo'lda nusxalang"
}

# ─── Serverda yangilash buyrug'i ─────────────────────────────
Section "Endi serverda nima qilish kerak"
Write-Host ""
Write-Host "  GCP Console SSH yoki shu PowerShell'da:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ssh -i `"$KEY_PATH`" $USER@$ip" -ForegroundColor White
Write-Host ""
Write-Host "  Server'da quyidagi BIR BUYRUQNI ishga tushiring:" -ForegroundColor Yellow
Write-Host ""
Write-Host @"
  cd /opt/marketplace && \
  sudo git pull && \
  sudo chmod +x deploy/*.sh && \
  sudo bash deploy/07-reliability.sh && \
  sudo nano /etc/marketplace-watchdog.env
"@ -ForegroundColor White
Write-Host ""

# ─── Yakuniy holat ───────────────────────────────────────────
Section "✅ Lokal sozlashlar tugadi"
Write-Host ""
Write-Host "  Keyingi qadamlar:" -ForegroundColor Green
Write-Host "    1. GitHub Secrets'ga 3 ta qiymatni kiriting (yuqorida ko'rsatilgan)"
Write-Host "    2. Server'da bitta buyruqni ishga tushiring (yuqorida)"
Write-Host "    3. Telegram token kiritgach: pm2 list bilan tekshiring"
Write-Host "    4. Test deploy:  git commit --allow-empty -m 'test' && git push"
Write-Host ""
