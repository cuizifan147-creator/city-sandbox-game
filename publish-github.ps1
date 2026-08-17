# ============================================================
#  一键发布本项目到 GitHub
#  用法：在该文件夹里右键"使用 PowerShell 运行"，或执行：
#     powershell -ExecutionPolicy Bypass -File .\publish-github.ps1
#  首次推送会弹出浏览器窗口让你登录 GitHub（Git 凭据管理器）。
# ============================================================
$ErrorActionPreference = 'Stop'

$repoName = 'city-sandbox-game'
$git = 'C:\Program Files\Git\cmd\git.exe'
if (-not (Test-Path $git)) { $git = 'git' }

Write-Host '============================================'
Write-Host '  发布 City3D 到 GitHub'
Write-Host '============================================'

# 1. GitHub 用户名
$username = Read-Host '你的 GitHub 用户名（本机默认：cuizifan147-creator）'
if (-not $username -or $username -match '\s') {
  Write-Host '✖ 用户名不能为空或含空格' -ForegroundColor Red
  exit 1
}

# 2. 若提交作者还是占位身份，改为你的 GitHub 身份
# GitHub 新账号的隐私邮箱格式：<数字ID>+<用户名>@users.noreply.github.com
$ghId = '297203046'
$email = "$ghId+$username@users.noreply.github.com"
$curEmail = & $git config user.email
if ($curEmail -like '*city3d-dev*') {
  & $git config user.name $username
  & $git config user.email $email
  & $git commit --amend --reset-author --no-edit | Out-Null
  Write-Host "✔ 提交作者已改为：$username <$email>"
} else {
  Write-Host "✔ 提交作者保持：$curEmail（如需修改请直接编辑 .git/config）"
}

# 3. 设置远程仓库地址
$remote = "https://github.com/$username/$repoName.git"
$existing = & $git remote get-url origin 2>$null
if ($existing) { & $git remote set-url origin $remote } else { & $git remote add origin $remote }
Write-Host "✔ 远程仓库地址：$remote"

# 4. 提醒建仓库
Write-Host ''
Write-Host '如果还没有仓库，请现在到 https://github.com/new 创建：' -ForegroundColor Yellow
Write-Host "   仓库名：$repoName（英文，其余可留空；不要勾选 README/.gitignore/LICENSE）" -ForegroundColor Yellow
Read-Host '建好后按回车开始推送'

# 5. 推送（首次会弹出浏览器登录 GitHub）
& $git push -u origin main
Write-Host ''
Write-Host "✅ 发布完成！访问：https://github.com/$username/$repoName" -ForegroundColor Green
Read-Host '按回车关闭窗口'
