# dsh-mcp-manager

在 DeepSeek Harness 的设置里管理外部 MCP 服务器：填表单或粘贴 `mcp.json`，保存后 Agent 即可自由调用这些服务器提供的工具。

工具会以 `mcp__<服务器名>__<工具名>` 的形式出现在模型的工具列表里 —— 与 Claude Code、Codex 相同的命名形式。

---

## 安装

把本仓库推到 GitHub 后，在终端执行：

```bash
dsh plugin --profile desktop add git+https://github.com/<你的用户名>/<仓库名>.git
```

`dsh plugin` 是 pnpm 的透传封装，所以 `add` / `rm` / `update` 都可用，git 依赖也是 pnpm 原生支持的。安装会自动完成两件事：

1. 把插件写进 `~/.dsh/profiles/desktop/package.json` 的 `dependencies`；
2. 按包里的 `cordis.patch.yml` 挂载 Loader 条目。

装完**重启 DSH**（或让它自动 reload profile），设置左侧栏就会出现一个独立的 **MCP** 页签。

> 仓库里不需要构建步骤：`index.js` 和 `client.js` 都是可直接运行的纯 JS，克隆下来就能装。

---

## 使用

### 方式一：逐条填表

点「添加服务器」，填名称和传输方式：

| 传输方式 | 适用 | 必填字段 |
|---|---|---|
| **本地进程（stdio）** | 跑在本机的 MCP 服务器 | 启动命令，如 `npx`；参数；环境变量；工作目录 |
| **远程服务（Streamable HTTP）** | 已部署的 MCP 服务 | 接口地址，如 `http://localhost:3000/mcp`；请求头 |

保存后通常几秒内生效，不需要重启。

### 方式二：导入 / 导出 JSON

点「导入 JSON」，粘贴你在 Claude Desktop、Cursor、VS Code 里现成的配置：

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_xxx" }
    },
    "web": {
      "url": "http://localhost:3000/mcp",
      "headers": { "Authorization": "Bearer xxx" }
    }
  }
}
```

导入是**合并**：同名的服务器会被覆盖，其它服务器原样保留。页面会先告诉你要新增哪些、要覆盖哪些，确认后才写入。

「导出 JSON」则把当前配置输出成同样的格式，可以直接粘到别的 MCP 客户端里。

---

## 行为说明

- **工具调用走正常管线。** MCP 工具注册在 `ctx.tools` 上，因此自动继承部署已有的审批提示、权限预设、超时和结果裁剪策略，不会绕过任何一道关卡。
- **一台服务器连不上，不影响其它服务器。** 页面会显示失败原因和重连次数，DSH 正常启动。
- **断线自动重连。** 默认从 500ms 起指数退避，最多 30s 一次；连续失败 10 次后停止重连并注销该服务器的工具，重启或改配置后恢复。
- **工具列表变化会自动同步。** 服务器增删工具后，下一轮对话即可见；同步失败时保留上一组工具，不会出现「半个服务器」。
- **命名稳定。** 工具名由 `(服务器名, 工具名)` 纯函数决定，重启和改配置都不会让会话历史与权限规则失效。

### 关于 `sse`

DSH 支持 `stdio` 和 `streamable-http` 两种传输。导入时若某项声明了 `"type": "sse"`，本插件会按 Streamable HTTP 处理并给出黄色提示 —— 多数服务器声明 sse 但实际讲的就是 streamable HTTP。若某个服务器确实只支持旧版 SSE，它会连接失败，此时请改用 stdio 或中转。

---

## 开发

```bash
npm test          # 34 个测试
npm run sync      # 把 src/ 同步进 client.js 的内联块
npm run sync:check # 校验 client.js 与 src/ 是否一致
```

### 为什么浏览器那一半是内联的

DSH 浏览器端的模块系统只认**裸包名**，`require('./src/naming.js')` 这种相对路径不在模块表里，会直接抛错。所以 `scripts/sync-client-data.mjs` 会把 Host 也要用的那几个 `src/` 模块内联进 `client.js` 的标记块里。

- 真正的唯一来源仍是 `src/`；
- 生成结果**提交进 git**，所以安装路径上不需要任何构建；
- `--check` 会在拷贝过期时让 CI 失败，避免两份实现悄悄跑偏。

### 测试里的宿主依赖

`test/host.test.mjs` 会加载 Host 入口并断言 schema。这些测试需要真实的 `@deepseek-ai/dsh-mcp-client`、MCP SDK 等包；它们不在本仓库里，由运行中的 DSH Host 提供。缺少时测试会 **skip** 而不是 fail。

---

## 许可

MIT