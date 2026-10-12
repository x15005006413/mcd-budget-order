# mcd-budget-order

到店优先的**预算省钱点餐** Skill：基于麦当劳中国官方 MCP，按预算编排领券 → 选店 → 菜单 → 真算价 → **确认后下单**。

> 参赛作品，非麦当劳官方产品。餐品、价格、库存以 MCP 实时结果为准。

## 目标用户

- 想控制花销、又想快速到店取餐的用户
- 在 Cursor 等 MCP Client 里用自然语言完成「预算内最优方案 + 确认下单」的开发者

## 你能得到什么

1. 在预算内给出可执行的到店点单方案（应付金额来自 `calculate-price`）
2. 优先利用麦麦省领券 / 门店可用券做省钱组合
3. 你回复「确认下单」后调用 `create-order`，拿到支付链接

## 安装方法

### 1. 申请 MCP Token

在 [麦当劳 MCP 开放平台](https://open.mcd.cn/mcp) 登录并激活 Token。

### 2. 配置 Cursor MCP

复制 `mcp-config.example.json` 到 Cursor 的 MCP 配置（Settings → Tools & MCP → Add Custom MCP），将占位符换成环境变量或本地密钥（**不要提交真实 Token**）：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamablehttp",
      "url": "https://mcp.mcd.cn",
      "headers": {
        "Authorization": "Bearer 你的Token"
      }
    }
  }
}
```

保存后确认 `mcd-mcp` 状态为已连接。

### 3. 启用本 Skill

本仓库已提供 Cursor 项目级 Skill：

- `.cursor/skills/mcd-budget-order/SKILL.md`

用 Cursor 打开本仓库后，在 Agent 对话中直接描述需求即可（例如：「预算 40，两人，上海陆家嘴附近到店」）。

也可将 `SKILL.md` 内容作为自定义说明使用。

### 4.（可选）连通性冒烟

```bash
set MCD_MCP_TOKEN=你的Token
npm run smoke
```

## 使用示例

**示例 1 — 只要方案**

```text
预算 35 元，1 人，到店。位置：北京朝阳大望路。先不要下单，给我最省方案。
```

**示例 2 — 确认下单**

```text
就按这个方案，确认下单。
```

Agent 应先展示门店、菜品、用券、应付与取餐方式，再在确认后调用 `create-order`。

## 项目结构

| 路径 | 说明 |
|---|---|
| `SKILL.md` | 编排规则（与 `.cursor/skills/...` 同步） |
| `MCP_INTEGRATION.md` | MCP Server / Tool / 流程 / 业务价值 |
| `CONTEST_DECLARATION.md` | 参赛声明（官方原文，勿改） |
| `mcp-config.example.json` | 脱敏配置示例 |
| `references/flow.md` | 流程图与参数约定 |
| `scripts/smoke.mjs` | MCP 连通性冒烟（不下单） |

## 默认场景与安全

- **默认到店**（`orderType=1`, `beType=1`）；外送需你明确要求
- `auto-bind-coupons` / `create-order` / `cancel-order` 均需确认
- 超预算不创建订单
- 仓库内禁止存放真实 Token（见 `.gitignore`）

## 更多

- 工具与流程细节：`MCP_INTEGRATION.md`
- 官方 MCP 文档：[mcd-mcp-server](https://github.com/M-China/mcd-mcp-server)
- 比赛主页：[mcd-developer-innovation-challenge](https://github.com/M-China/mcd-developer-innovation-challenge)
