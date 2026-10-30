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
├── main/index.js           # 主进程：窗口、托盘、服务生命周期
├── preload/index.js        # 最小安全 IPC 桥
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
npm start
```

### 打包安装包

```bash
cd desktop
npm run dist   # 生成 Windows NSIS 安装包（dist/ 目录）
```

## 当前状态

- [x] 单实例锁
- [x] 窗口 + 托盘 + 最小化到托盘
- [x] 子进程启动 `next start`（内置 Node）
- [x] 健康检查（轮询 127.0.0.1:6796）
- [x] 退出时清理自启的服务
- [x] 外部链接走系统浏览器
- [ ] 首次运行环境检测（Docker 检测/引导）—— 阶段 3
- [ ] 镜像自动拉取进度 —— 阶段 3
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
