# Chuck Bot 桌面客户端（Electron 薄壳）

这是 Chuck Bot 的 Windows/macOS 桌面客户端，采用**薄壳**架构：它不重写 Xiryn
的任何业务逻辑，只负责「安装、启动、托盘、更新」，并加载官方 Next.js 服务。

## 架构

```
Electron 主进程 (desktop/main/index.js)
├── 单实例锁
├── BrowserWindow → 加载 http://127.0.0.1:6796
├── Tray 托盘图标（关闭窗口 = 最小化到托盘）
└── 子进程启动 next start（内置 Node 运行时）
        ↓
   Xiryn (Next.js) 服务  ← 官方核心，原样复用
        ↓
   Docker Agent 小电脑（每 Agent 一个 Linux 桌面）
```

## 目录

```
desktop/
├── main/index.js           # 主进程：窗口、托盘、服务生命周期、首次运行引导
├── main/docker.js          # Docker 检测（missing/stopped/ready + 非默认安装路径）
├── main/ipc.js             # 环境诊断 IPC（env:docker / env:start-docker / env:open-external）
├── preload/index.js        # 最小安全 IPC 桥（chuckBot.env）
├── resources/app-root/     # 打包后的 Xiryn 应用（构建时生成）
├── resources/node/         # 内置 Node 运行时（构建时生成，可选）
├── scripts/bundle-app.mjs  # 组装 app-root + node 的脚本
└── package.json            # Electron 依赖与 electron-builder 配置
```

## 构建与运行

### 开发模式（源码运行）

```bash
# 1. 先在仓库根目录构建 Next 应用
npm run build

# 2. 组装 app-root（把 .next/node_modules/资源 拷进 desktop/resources）
node desktop/scripts/bundle-app.mjs

# 3. 安装 Electron 并运行
cd desktop
npm install
npm run dev    # ← 用 dev 而不是 start，见下面的坑
```

> **关键坑：`ELECTRON_RUN_AS_NODE`**。WorkBuddy / VSCode 等 Electron 宿主会把
> `ELECTRON_RUN_AS_NODE=1` 传给子进程，导致 `electron .` 以纯 Node 模式运行，
> `require("electron")` 返回 electron.exe 的**路径字符串**而不是 API 对象
> （`app`/`BrowserWindow` 全是 undefined）。`npm run dev` 走的
> `scripts/dev.cmd` 会先清除该变量。直接命令行启动时用：
> `env -u ELECTRON_RUN_AS_NODE ./node_modules/electron/dist/electron.exe .`

### 打包安装包

```bash
cd desktop
npm run dist   # 生成 Windows NSIS 安装包（dist/ 目录）
```

### 真机验证记录（2026-10-30）

- Electron 33.4.11 二进制已下载（`desktop/node_modules/electron/dist/electron.exe`，188MB）。
- 源码模式 `npm run dev` 已验证：窗口打开 + 4 个 electron 进程 + 拉起 `next start`
  + 首页 `http://127.0.0.1:6796` 返回 200。
- `bundle-app.mjs` 已成功组装 `desktop/resources/app-root`（.next + node_modules +
  workstation/db/public/messages/lib，含 better-sqlite3 原生模块）。
- **尚未验证**：`electron-builder` 真正出安装包（需跑 `npm run dist`），以及打包后
  的 `app.isPackaged` 分支（内置 Node 路径、userData 数据目录、auto-updater）。

## 当前状态

- [x] 单实例锁
- [x] 窗口 + 托盘 + 最小化到托盘
- [x] 子进程启动 `next start`（内置 Node）
- [x] 健康检查（轮询 127.0.0.1:6796）
- [x] 退出时清理自启的服务
- [x] 外部链接走系统浏览器
- [x] 首次运行 Docker 检测 + 缺失引导（阶段 3）
- [x] 环境诊断 IPC（Docker 状态查询 / 启动 / 外链）
- [ ] 首次运行「欢迎向导」内嵌页面（当前是弹窗，可升级为引导页）
- [ ] 镜像自动拉取进度展示（复用 Xiryn 的 buildImage，客户端仅呈现状态）
- [ ] 真实品牌图标（当前是占位图标）
- [ ] 代码签名 + 自动更新 —— 阶段 5

## 关键约定

- **服务只监听 loopback**（`proxy.ts` 会拒绝非本机 Host/Origin），Electron 加载
  `127.0.0.1:6796` 是允许的。
- **数据目录**：通过 `XIRYN_DATA_DIR` 指向 `app.getPath("userData")/xiryn-data`，
  保证 SQLite/vault/日志可写且不随版本更新被覆盖。
- **更新**：客户端用 electron-updater（阶段 5）管理；应用内更新检查已通过
  `XIRYN_UPDATE_CHECK=off` 关闭。
- **不碰用户自己的进程**：退出时只停「客户端自己启动的服务」，不结束用户手动
  启动的 Docker Desktop / Ollama。
