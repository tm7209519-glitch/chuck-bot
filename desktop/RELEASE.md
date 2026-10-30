# 自动更新与发布（阶段 5）

Chuck Bot 桌面客户端的签名与自动更新，基于 **electron-builder + electron-updater + GitHub Releases**。

## 工作流总览

```
推 tag (v0.1.0)
   ↓
GitHub Actions release.yml
   ├── npm run build        # 构建 Next.js 应用
   ├── bundle-app.mjs       # 组装到 desktop/resources/app-root
   ├── 下载 Node 运行时     # 打进客户端，用户无需装 Node
   ├── npm ci (desktop)     # 安装 electron 依赖
   └── electron-builder     # 打包 NSIS 安装包 → 发布到 GitHub Releases
```

客户端侧（electron-updater）：
```
启动 → 检查 GitHub Releases
   → 有新版本 → 提示用户
   → 用户点击下载 → 显示进度
   → 下载完成 → 提示重启安装
   → 退出并安装（NSIS 接管）
```

## 当前状态

- [x] `main/updater.js`：electron-updater 完整流程（check/download/install + 进度事件）
- [x] `preload/index.js`：`chuckBot.update` 安全桥
- [x] `desktop/package.json`：`publish: github` 指向 `tm7209519-glitch/chuck-bot`
- [x] `.github/workflows/release.yml`：Windows 构建 + 发布
- [ ] 代码签名（缺证书，见下）
- [ ] 真机验证更新链路

## 代码签名（待用户提供证书）

**Windows（Authenticode）**：需要一张代码签名证书（`.pfx` + 密码）。配置方法：

1. 在 GitHub 仓库 Settings → Secrets 里添加两个 secret：
   - `WIN_CSC_LINK`：`.pfx` 文件的 base64（`base64 -w0 cert.pfx`）或路径
   - `WIN_CSC_KEY_PASSWORD`：`.pfx` 密码
2. 推送新 tag，workflow 会自动用它们签名。

没有证书时，electron-builder 会构建**未签名**安装包（Windows 会弹 SmartScreen 警告），仅适合预发布测试，不适合 stable 发布。

**macOS**：需要 Apple Developer ID 证书 + notarization（需 Apple Developer 账号，$99/年）。配置 `CSC_LINK` / `CSC_KEY_PASSWORD` / `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` 等 secret，并在 `release.yml` 的 matrix 里加 `macos-latest`。

## 发布步骤（本地）

```bash
# 1. 更新版本号（desktop/package.json 和根 package.json 的 version）
# 2. 提交并打 tag
git tag v0.1.0
git push origin v0.1.0        # 触发 release workflow

# 或手动触发：GitHub 仓库 → Actions → Release → Run workflow
```

## 预发布通道

设 `CHUCK_BOT_PRE_RELEASE=1` 环境变量（或 secrets）会让 electron-updater 允许预发布版本，用于内部测试。

## 关键约定

- **不自动下载、不自动安装**：用户必须主动点击，避免打扰。
- **更新不覆盖用户数据**：SQLite/vault/日志在 `userData` 目录，与安装包分离。
- **失败保留当前版本**：下载/安装失败不破坏现有安装。
- **GitHub Releases 是唯一发布源**，不用 `git pull` 面向用户。
