# Windows 一页部署清单

适用于把一台 Windows 公司电脑作为服务器。预计首次操作 10–20 分钟，依赖下载时间另计。

## 1. 准备软件

需要安装 Git for Windows 和 64 位 Python 3.12。推荐按下面的优先顺序安装。

### 方法 A：使用 winget（最省事）

Windows 10/11 如果可以运行 `winget --version`，在普通 PowerShell 执行：

```powershell
winget install --id Git.Git -e --source winget
winget install --id Python.Python.3.12 -e --source winget
```

安装结束后关闭 PowerShell，再重新打开一个 PowerShell 窗口。

### 方法 B：下载安装包

- Git：[Git for Windows 官方下载页](https://git-scm.com/install/windows.html)，选择最新的 x64 安装包，安装过程保持默认选项。
- Python：[Python 3.12.10 官方下载页](https://www.python.org/downloads/release/python-31210/)，在页面底部选择 `Windows installer (64-bit)`。

安装 Python 时必须勾选首页底部的 `Add python.exe to PATH`，然后选择 `Install Now`。不要下载 `embeddable package`、源码包、32 位或 ARM64 安装包。

Python 3.12.10 是 Python 3.12 系列最后一个提供传统 Windows 安装器的完整维护版本；不要为了“最新版”改装 Python 3.13 或 3.14。

### 国内网络准备

- 出发前建议把 Git x64 和 Python 3.12.10 x64 两个安装包放入 U 盘或公司共享盘，现场网络不稳定时可离线安装。
- 项目的 Python 依赖安装脚本默认使用清华 PyPI 镜像，不需要手动设置。
- 如果清华镜像不可用，可在运行安装脚本前切换阿里云镜像：

```powershell
$env:PIP_INDEX_URL="https://mirrors.aliyun.com/pypi/simple"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cn.ps1
```

- GitHub 无法访问时，不要使用来源不明的加速网址。应切换可信网络或使用公司批准的代理；后续网页自动更新同样需要访问 GitHub。

普通 PowerShell 中确认：

```powershell
git --version
python --version
```

Python 应显示 `3.11.x` 或 `3.12.x`。如果命令仍提示找不到，先关闭 PowerShell 并重新打开；仍无效时重新运行 Python 安装程序，确认已经勾选 PATH。

## 2. 下载并安装

```powershell
cd $HOME\Documents
git clone https://github.com/XuKeqiang/ops-data-toolbox.git
cd ops-data-toolbox
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cn.ps1
```

安装完成时应看到“国内镜像安装完成”。

## 3. 配置业务目录

```powershell
notepad .\config\app-config.json
```

保持 `server.host` 为 `0.0.0.0`。把 `paths.allowed_input_roots` 改成服务器真实存在的业务目录，例如：

```json
"allowed_input_roots": [
  "D:/Operations/Amazon"
]
```

如果暂时没有固定目录，保持默认值也能使用上传功能。

## 4. 首次启动

仅第一次启动前，在当前 PowerShell 设置管理员密码：

```powershell
$env:OPS_TOOLBOX_ADMIN_PASSWORD = "替换成正式强密码"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

浏览器打开 `http://127.0.0.1:8080/`，使用用户名 `admin` 和刚设置的密码登录。

如果提示端口被其他程序占用，不要结束对方程序；在 `config/app-config.json` 中把 `server.port` 改成其他端口后重新启动。

## 5. 允许同事访问

右键 PowerShell，选择“以管理员身份运行”，进入项目目录后执行：

```powershell
cd $HOME\Documents\ops-data-toolbox
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-windows-firewall.ps1
ipconfig
```

找到服务器电脑的 `IPv4 地址`。让同一公司局域网内的另一台电脑访问：

```text
http://服务器IPv4地址:8080/
```

必须完成“服务器本机能打开”和“另一台电脑能打开”两项检查。

## 6. 创建入口和自动任务

普通 PowerShell 创建桌面快捷方式：

```powershell
cd $HOME\Documents\ops-data-toolbox
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\create-shortcut.ps1
```

管理员 PowerShell 安装登录自启动和每日 02:30 备份：

```powershell
cd $HOME\Documents\ops-data-toolbox
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-windows-task.ps1
```

## 7. 交付前检查

- 本机和同事电脑都能打开网页。
- 已创建正式管理员和操作员账号，不再使用默认密码。
- 上传一个小文件并成功下载结果。
- `data\logs\server.err.log` 没有持续报错。
- 手动运行一次 `scripts\backup.ps1`，确认 `data\backups\` 生成压缩包。

## 后续更新

管理员优先在网页“系统设置 → 系统更新”中更新。网页更新失败时，在项目目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update.ps1
```

运行数据、账号、配置和历史记录不会被 `git pull` 覆盖。
