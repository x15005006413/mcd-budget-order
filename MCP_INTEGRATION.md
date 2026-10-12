# MCP 集成说明

## 使用的 MCP Server

| 项 | 值 |
|---|---|
| Server | 麦当劳中国官方 MCP（远程托管） |
| URL | `https://mcp.mcd.cn` |
| 传输 | Streamable HTTP |
| 认证 | `Authorization: Bearer <MCD_MCP_TOKEN>` |
| 配置示例 | 见仓库根目录 `mcp-config.example.json`（仅环境变量占位，不含真实 Token） |

官方说明：[M-China/mcd-mcp-server](https://github.com/M-China/mcd-mcp-server)

## 业务目标

**到店优先的预算省钱点餐**：在用户预算内，用真实算价选出应付最低的可执行清单，用户确认后创建订单并返回支付链接。

## 实际使用的 Tools

| Tool | 用途 |
|---|---|
| `now-time-info` | 当前时间，辅助早餐档/营业判断 |
| `available-coupons` | 可领取的麦麦省券列表 |
| `auto-bind-coupons` | 一键领取可领券（需用户确认） |
| `query-my-coupons` | 用户券包 |
| `query-nearby-stores` | 到店附近门店（`beType=1`） |
| `query-store-coupons` | 当前门店+到店方式下可用券 |
| `query-meals` | 可售菜单与标价/促销信息 |
| `query-meal-detail` | 套餐组成与特制项（按需） |
| `calculate-price` | **真实应付价格**（含券），比价依据 |
| `create-order` | 用户确认后创建到店订单 |
| `query-order` | 查询订单（可选） |
| `cancel-order` | 取消订单（需确认，可选） |

外送降级时可能额外使用：`delivery-query-addresses`、`delivery-create-address`、`delivery-query-stores`（非默认路径）。

## 调用流程（到店）

1. 收集：预算（元）、人数、城市+位置关键词、忌口（可选）
2. `now-time-info`
3. （确认后）领券 → 查我的券
4. `query-nearby-stores` → 用户选定 `storeCode` / `beCode`
5. `query-store-coupons`（`orderType=1`, `beType=1`）
6. `query-meals`（及按需 `query-meal-detail`）生成候选组合
7. 对候选多次 `calculate-price`，在预算内选最低应付；记下 `takeWayList`
8. 展示方案；用户确认并选定 `takeWayCode` 后 `create-order`
9. 返回 `payH5Url` 等支付/取餐信息

详细图示见 `references/flow.md`。编排规则见根目录 `SKILL.md`（同时安装在 `.cursor/skills/mcd-budget-order/`）。

## 关键实现要点

- 到店默认：`orderType=1`，`beType=1`
- `create-order` 的 `takeWayCode` 必须来自对应 `calculate-price` 的 `takeWayList`
- 算价/下单的 `items` 可携带 `couponId`、`couponCode`
- 展示价格时注意返回值单位（多为分 → 元）
- 超预算不调用 `create-order`

## 业务价值

- **省钱**：券 + 门店可用券 + 真算价搜索，避免口头估算
- **可执行**：确认后直接出支付链接，形成闭环
- **可控**：写操作需确认，降低误下单风险

## 本地冒烟

```bash
# Windows PowerShell
$env:MCD_MCP_TOKEN="你的Token"
npm run smoke
```

脚本仅做 MCP 初始化与 `tools/list`，不创建订单。见 `scripts/smoke.mjs`。
