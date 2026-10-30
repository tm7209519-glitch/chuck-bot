# Chuck Bot 桌面客户端打包脚本

此脚本把 Xiryn（Next.js）应用组装进 Electron 的 `resources/app-root`，
并复制一个可独立运行的 Node 运行时到 `resources/node`，供 Electron 主进程
通过子进程启动 `next start`。

用法（在仓库根目录执行）：

  node desktop/scripts/bundle-app.mjs

产物：

  desktop/resources/app-root/    # .next、node_modules、workstation、db/migrations、
                                 # public、messages、package.json、next.config 等
  desktop/resources/node/        # 可选的 Node 运行时（若提供 --node <dir>）

注意：
  - better-sqlite3 是原生模块，必须整目录复制，不能只复制 .js。
  - 该脚本只做「复制组装」，不触发 Electron 打包（electron-builder）。
