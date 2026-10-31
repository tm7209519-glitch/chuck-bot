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
- [x] `.github/workflows/release.yml`：Windows 构建 + 发布（tag 与桌面版本校验，正式 Release 而非草稿）
- [ ] 代码签名（缺证书，见下）
- [x] 真机验证更新链路（2026-10-31，0.1.0 → 0.1.1）

## 双版本实测结果（2026-10-31）

- `v0.1.0-desktop.1` 测试 Release 与 `v0.1.1` 正式 Release 均由 GitHub Actions 构建。
- NSIS 静默安装成功，Windows 注册版本从 `0.1.0` 升至 `0.1.1`。
- 已安装的 `0.1.0` 客户端通过 electron-updater 返回 `{ ok: true, version: "0.1.1" }`。
- 客户端实际下载新版安装包成功，`quitAndInstall` 被正确调用；本执行环境回收了弹出的
  安装器子进程，随后手动完成已下载安装包的覆盖安装。因此自动弹窗交互仍建议正常桌面环境复核。
- 升级后首页返回 200，升级前写入 SQLite 的测试标记保留；测试结束后已清除。
- 基线 blockmap 使用 `v0.1.0` 固定 URL，因基线 tag 后来改为 `v0.1.0-desktop.1`，差分下载
  回退到完整包。这是本次基线标签修正造成的，不影响全量更新；后续固定 tag 后不会再有该问题。
- 没有代码签名证书，Windows 会显示 SmartScreen 提示。


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
# 1. 更新 desktop/package.json 的 version（npm version 会同步 lockfile）
# 2. 标签必须严格等于 v + desktop/package.json 的 version，避免与上游 Web 版本混用
git tag v0.1.1
git push product v0.1.1       # 触发 release workflow

# 或手动触发：GitHub 仓库 → Actions → Release → Run workflow
```

## 预发布通道

设 `CHUCK_BOT_PRE_RELEASE=1` 环境变量（或 secrets）会让 electron-updater 允许预发布版本，用于内部测试。

## 关键约定

- **不自动下载、不自动安装**：用户必须主动点击，避免打扰。
- **更新不覆盖用户数据**：SQLite/vault/日志在 `userData` 目录，与安装包分离。
- **失败保留当前版本**：下载/安装失败不破坏现有安装。
- **GitHub Releases 是唯一发布源**，不用 `git pull` 面向用户。
