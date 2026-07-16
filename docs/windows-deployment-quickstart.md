# Windows 一页部署清单

适用于把一台 Windows 公司电脑作为服务器。预计首次操作 10–20 分钟，依赖下载时间另计。

## 怎么使用这份清单

1. 除非明确写着“管理员 PowerShell”，其余命令都在普通 PowerShell 运行。
2. 每次只复制一个代码框，等它执行结束并看到“成功标志”后再继续。
3. 命令报红时不要反复点击或跳到下一步，先到文末“常见报错处理”按现象处理。
4. 命令需要在项目目录运行时，先执行 `cd $HOME\Documents\ops-data-toolbox`。

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
py -3.12 --version
```

`python` 显示 3.11/3.12，或 `py -3.12` 显示 `Python 3.12.x`，都可以继续。Git 应显示版本号。如果命令仍提示找不到，先关闭 PowerShell 并重新打开；仍无效时重新运行安装程序。

成功标志：Git 和 Python 都能显示版本号。

## 2. 下载并安装

```powershell
cd $HOME\Documents
git clone https://github.com/XuKeqiang/ops-data-toolbox.git
cd ops-data-toolbox
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cn.ps1
```

成功标志：最后看到“国内镜像安装完成”，项目目录出现 `.venv` 文件夹和 `config\app-config.json`。

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

保存后检查 JSON 格式：

```powershell
Get-Content .\config\app-config.json -Raw | ConvertFrom-Json | Out-Null
```

成功标志：命令没有红色报错，直接回到提示符。

## 4. 首次启动

仅第一次启动前，在当前 PowerShell 设置管理员密码：

```powershell
$env:OPS_TOOLBOX_ADMIN_PASSWORD = '替换成正式强密码'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

浏览器打开 `http://127.0.0.1:8080/`，使用用户名 `admin` 和刚设置的密码登录。

再在 PowerShell 检查服务：

```powershell
Invoke-RestMethod http://127.0.0.1:8080/api/health
```

成功标志：浏览器能打开登录页，检查命令返回 `ok : True`。

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

也可以在同事电脑的 PowerShell 检查端口，其中 `192.168.1.20` 替换为服务器 IPv4：

```powershell
Test-NetConnection 192.168.1.20 -Port 8080
```

成功标志：显示 `TcpTestSucceeded : True`。

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

成功标志：桌面出现“电商经营数据工具箱”快捷方式，计划任务脚本显示已安装 `OpsToolboxServer` 和 `OpsToolboxBackup`。

## 7. 交付前检查

- 本机和同事电脑都能打开网页。
- 已创建正式管理员和操作员账号，不再使用默认密码。
- 上传一个小文件并成功下载结果。
- `data\logs\server.err.log` 没有持续报错。
- 手动运行一次 `scripts\backup.ps1`，确认 `data\backups\` 生成压缩包。

手动备份命令：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup.ps1
```

## 常见报错处理

### `winget` 不是可识别的命令

这在部分 Windows Server 或较旧系统上是正常的。不要继续处理 `winget`，直接使用第 1 步“方法 B”的 Git 和 Python 官方安装包。

### `git`、`python` 或 `py` 不是可识别的命令

先关闭所有 PowerShell 窗口，再重新打开并检查版本。仍失败时重新运行对应安装程序；Python 必须勾选 `Add python.exe to PATH`。只要 `py -3.12 --version` 能显示 3.12，安装脚本就可以继续。

### `python --version` 显示 3.13 或 3.14

执行：

```powershell
py -3.12 --version
```

如果显示 3.12，可以继续，项目脚本会优先选择 3.12。如果也找不到，安装 Python 3.12.10 64 位版后重新打开 PowerShell。

### `git clone` 超时、连接被重置或无法访问 GitHub

先在浏览器访问 `https://github.com`。浏览器也打不开时，说明是网络问题，应切换可信网络或联系公司 IT 配置批准的代理。不要使用来源不明的 GitHub 加速网址，因为后续自动更新仍需要稳定访问 GitHub。

如果电脑已经存在 `ops-data-toolbox` 文件夹，不要重复执行 `git clone`，直接进入该目录。

### 安装依赖时清华镜像超时

在同一个 PowerShell 窗口切换到阿里云镜像后重试：

```powershell
cd $HOME\Documents\ops-data-toolbox
$env:PIP_INDEX_URL="https://mirrors.aliyun.com/pypi/simple"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cn.ps1
```

如果清华和阿里云都失败，多半是公司网络代理、证书或外网策略问题，请保存完整红色报错并联系公司 IT。

### 提示 Python 版本过高、虚拟环境损坏或缺少模块

确认已经安装 Python 3.12，然后只删除可重新生成的 `.venv`，不要删除 `data` 和 `config`：

```powershell
cd $HOME\Documents\ops-data-toolbox
Remove-Item -Recurse -Force .\.venv
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cn.ps1
```

### 配置文件提示 JSON 格式错误

最常见原因是漏了英文逗号、引号或方括号。Windows 路径建议写成 `D:/Operations/Amazon`，不要直接写单个反斜杠。运行下面命令可显示错误位置：

```powershell
Get-Content .\config\app-config.json -Raw | ConvertFrom-Json
```

不确定如何修复时，把配置内容与 `config\app-config.example.json` 对照，不要删除 `data` 文件夹。

### 启动时提示端口 `8080` 被其他程序占用

系统不会结束其他程序。打开 `config\app-config.json`，把 `server.port` 从 `8080` 改成例如 `8088`，重新运行启动脚本。此后浏览器、防火墙和同事访问地址中的端口也都使用 `8088`。

### 本机浏览器打不开

先查看错误日志：

```powershell
Get-Content .\data\logs\server.err.log -Tail 80
```

再运行一次启动脚本并检查健康接口。不要连续双击快捷方式。

### 本机能打开，但同事电脑打不开

依次确认：两台电脑连接同一公司网络；访问的是服务器 IPv4 而不是 `127.0.0.1`；配置中的 `server.host` 是 `0.0.0.0`；管理员 PowerShell 已运行防火墙脚本。

检查当前网络类型：

```powershell
Get-NetConnectionProfile
```

防火墙脚本只开放“专用网络”和“公司域网络”，不会向“公用网络”开放。若显示 `Public`，请联系公司 IT 确认是否应改为专用或域网络。

### 管理员密码不生效

`OPS_TOOLBOX_ADMIN_PASSWORD` 只用于第一次创建账号。如果系统此前已经启动过，请尝试默认账号 `admin / admin123` 登录，然后立即在“系统设置”中修改密码。不要通过删除 `data\users.json` 重置账号。

### 安装计划任务提示“拒绝访问”

关闭当前窗口，右键 PowerShell 选择“以管理员身份运行”，进入项目目录后重新执行 `install-windows-task.ps1`。

### 网页“立即更新”失败

先查看：

```powershell
Get-Content .\data\logs\web-update.log -Tail 120
```

常见原因是 GitHub 无法访问，或部署目录有本地修改。不要删除 `data` 和 `config`；把日志和页面提示发给维护人员处理。

## 后续更新

管理员优先在网页“系统设置 → 系统更新”中更新。网页更新失败时，在项目目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update.ps1
```

运行数据、账号、配置和历史记录不会被 `git pull` 覆盖。
