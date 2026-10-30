# Chuck Bot 开发准则与版本规则

> 本文档是 Chuck Bot（Xiryn 下游产品）的强制开发准则。所有开发、合并、发布都必须遵守。
> 配套的完整规划见 `C:\Users\202605\.workbuddy\plans\swift-thunder-darwin-gD8s1823.md`（本机规划文件）。

## 1. 身份与品牌

| 项 | 值 |
|---|---|
| 产品名 | **Chuck Bot** |
| 官方上游 | `SouravBeraAkaSpeed/xiryn`（持续合并来源） |
| 自有发布仓库 | `tm7209519-glitch/chuck-bot` |
| 提交作者 | `tm7209519-glitch <tm7209519@gmail.com>` |
| 协议 | MIT（继承自上游） |

品牌与仓库配置集中在 `lib/project.ts`，禁止在组件里硬编码产品名、图标、更新地址或官网。

## 2. 强制开发准则

1. **持续兼容官方**：`main` 永远只跟踪 `origin/main`（官方），不放任何产品改动。
2. **尽量复用官方底层**：Agent runtime、模型接入、SQLite、Docker workstation、工具与数据库能力直接复用，不重写。
3. **下游改动集中在产品分支**：品牌、汉化、样式、桌面客户端都放在 `feature/local-customizations`（或后续产品分支）。
4. **核心目录原则上不改**：`actions/`、`lib/agent*`、`lib/workstation*`、`db/`、`workstation/` 尽量不动；必须改时用最小补丁和适配层。
5. **配置集中**：品牌、语言、更新地址从下游配置读取，不得散落硬编码。
6. **数据与程序分离**：程序更新不得覆盖 SQLite、vault、日志和 Agent 数据卷。

## 3. 分支与远程

```
main                       → 跟踪 origin/main（官方）
feature/local-customizations → 产品功能分支（品牌/i18n/样式/桌面壳）
local/zip-baseline         → 最初 ZIP 基线，兜底备份（只读）
```

- `origin` 指向官方 `https://github.com/SouravBeraAkaSpeed/xiryn.git`
- 自有远程指向 fork `https://github.com/tm7209519-glitch/chuck-bot.git`
- 每次官方更新流程：`main` 快进 → 合并到产品分支 → 跑完整回归。

## 4. 版本规则

- 版本号沿用 `package.json` 的 semver；下游发布的版本必须能追溯到对应的官方上游版本。
- 每个下游 Release 在 CHANGELOG 里标注「基于上游 vX.Y.Z」。
- 禁止把 `git pull` 当作面向用户的更新方式；客户端更新走自有 GitHub Releases + 签名安装包。

## 5. 分阶段路线（可勾选）

- [ ] 阶段 0：仓库与发布基础
- [ ] 阶段 1：品牌与国际化骨架
- [ ] 阶段 2：Electron 最小可行客户端
- [ ] 阶段 3：安装向导与诊断
- [ ] 阶段 4：汉化与前端视觉改造
- [ ] 阶段 5：签名自动更新
- [ ] 阶段 7：远期同步能力

> 注：原「阶段 6：单机私有化」已从计划移除（用户决定暂不做）。

## 6. 强制验收门槛

- Web：typecheck、lint、format、生产构建通过。
- 兼容：官方更新合并后，对话、群组、工具、SQLite 迁移、Docker workstation 冒烟通过。
- 桌面：首次安装、重复启动、端口冲突、Docker 未启动、异常退出、托盘恢复、卸载不丢数据。
- 更新：旧到新、下载中断、验签失败、安装失败与数据保留测试通过。
- 平台：Windows 实机通过后才发 Windows；macOS 签名及 notarization 通过后才发 macOS。
