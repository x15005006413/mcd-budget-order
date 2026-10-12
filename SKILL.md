---
name: mcd-budget-order
description: >-
  麦当劳到店优先的预算省钱点餐助手。用户给出预算/人数/位置后，编排官方 mcd-mcp：
  领券、选店、查菜单、calculate-price 比价，确认后 create-order。
  在用户提到预算点餐、省钱点麦、到店取餐、确认下单时使用。
---

# 麦当劳预算到店点餐（mcd-budget-order）

## 目标

在**到店取餐**场景下，按用户预算找出应付最低的可执行点单方案；用户明确确认后调用 `create-order`。

本 Skill **不是**随意聊天点餐：必须走固定流水线，价格以 `calculate-price` 返回为准。

## 前置条件

- Cursor（或其他 MCP Client）已连接 `mcd-mcp`（`https://mcp.mcd.cn`）
- 用户已登录并可使用与 Token 绑定的麦当劳账号权益
- 默认：`orderType=1`，`beType=1`（到店取餐）。外送仅在用户明确要求或附近无到店门店时降级

## 硬性规则

1. **未选定门店**（至少有 `storeCode`）前：禁止查完整菜单比价、禁止下单。
2. **`beCode` 传参**（与官方 MCP 一致，传错会报错）：

   | 场景 | beType | orderType | beCode |
   |---|---|---|---|
   | 到店自取（默认） | `1` | `1` | **不传**（附近店通常无 `beCode`；传了可能报错） |
   | 得来速 | `5` | `1` | **必传**（来自 `query-nearby-stores`） |
   | 麦乐送/外送 | `2` | `2` | **必传**（来自 `delivery-query-stores`） |
   | 团餐 | `6` | `2` | **必传**（来自 `delivery-query-stores`） |

3. **价格**：禁止模型口算总价；展示应付金额必须以最近一次成功的 `calculate-price` 的 `data.price` 为准（单位通常为「分」，向用户展示时换算为元，保留两位小数）。
4. **预算**：若最优方案 `应付 > 预算`，只展示「最接近方案 + 差额」，**禁止** `create-order`。
5. **写操作门禁**：下列工具必须先说明将要做什么，并得到用户明确同意后再调用：
   - `auto-bind-coupons`
   - `create-order`
   - `cancel-order`
   - `delivery-create-address`（外送降级时）
6. **确认下单口令**：仅当用户明确表示确认（如「确认下单」「下单」「就按这个点」）且方案未改动时，才调用 `create-order`。改菜/改店/改券后必须重新 `calculate-price` 并再次确认。
7. **到店下单**：`create-order` 需要 `takeWayCode`，必须来自同一次算价结果中的 `takeWayList`（让用户选一项，或选默认可用项并告知用户）。
8. 不贬低品牌、不做竞品对比、不输出医疗/营养承诺。

## 标准流水线（到店优先）

按顺序执行；某步失败则说明原因并停在可恢复点，不要跳步下单。

### 0. 收集输入

向用户确认（缺什么问什么，可有默认）：

| 字段 | 默认 | 说明 |
|---|---|---|
| budgetYuan | 必填 | 预算（元） |
| people | 1 | 人数 |
| location | 必填 | 城市 + 地标/地址关键词（用于 `query-nearby-stores`） |
| preferences | 可选 | 忌口、偏好（如不要辣、只要套餐） |
| dineMode | 到店 | 默认到店；用户说外送再切 |

### 1. 时间

调用 `now-time-info`，用于判断早餐档、营业相关提示。

### 2. 券（可选但推荐）

1. 询问是否一键领取麦麦省可领券 → 同意后 `auto-bind-coupons`
2. `available-coupons`（了解可领）
3. `query-my-coupons`（券包）

### 3. 选门店（到店）

调用 `query-nearby-stores`：

- `searchType=2`
- `beType=1`
- `city` + `keyword` 来自用户位置

向用户列出 2–5 家（店名、距离、是否营业），请用户选定一家，记下 `storeCode`。  
`beType=1` 返回的门店通常**没有** `beCode`，后续工具调用也**不要传** `beCode`。  
（若用户明确要求得来速 `beType=5`，则必须同时记下并传递 `beCode`。）

若无结果：说明情况；仅当用户同意时再走外送降级（本 MVP 可提示「请换关键词或改外送」，外送完整链路可作为后续扩展）。

### 4. 门店可用券

`query-store-coupons`：

- `storeCode`（必填）
- `orderType=1`，`beType=1`
- **不传** `beCode`

合并「我的券」与「门店可用券」，后续算价优先尝试可用券（`couponId` + `couponCode`）。

### 5. 菜单

`query-meals`（同一 `storeCode`，`orderType=1`，`beType=1`，**不传** `beCode`）。

需要套餐组成或特制时再 `query-meal-detail`。

构建候选商品池时：

- 优先带券可用商品 / 套餐
- 尊重忌口与人数（大约每人至少 1 主食或 1 套餐）
- 用菜单里的 `currentPrice` 仅作**初筛**，最终以算价为准

### 6. 预算搜索 + 真算价

对每个候选组合调用 `calculate-price`（同一 `storeCode`，`orderType=1`，**不传** `beCode`；可含券字段、`withOrder` 若用户要随单购权益）：

- 记录返回的 `price`（应付）、`discount`、`productOriginalPrice` 等
- 在**应付 ≤ 预算**的候选中选应付最低者
- 若皆超预算：保留差额最小者，标记 `overBudget=true`，禁止下单

控制调用次数：MVP 建议先评估 ≤ 8 组候选（例如：最便宜套餐×人数、券商品+配餐、热卖低价组合等）。

### 7. 展示方案（确认前）

用固定结构回复用户，例如：

```text
【到店省钱方案】
门店：{storeName}（{storeCode}）
人数：{n}｜预算：¥{budget}
菜品：
- {name} x{qty}
用券：{券名或「无」}
原价：¥{...}｜优惠：¥{...}｜应付：¥{pay}
取餐方式候选项：{takeWayList 摘要}
状态：可下单 / 超预算差 ¥{delta}（不可下单）

回复「确认下单」将创建真实订单并可能产生支付；回复「取消」或提出修改。
```

### 8. 确认后下单

用户确认且 `overBudget=false` 时：

1. 确保已选定 `takeWayCode`（来自算价 `takeWayList`）
2. 使用**与展示方案一致**的 `items` / 券 / `withOrder` 调用 `create-order`（`orderType=1`，**不传** `beCode`）
3. 返回 `orderId`、`payH5Url`、取餐相关字段；提醒尽快支付
4. 用户要取消时，确认后 `cancel-order`

## 外送降级（非默认）

仅在用户明确要求外送时：

`delivery-query-addresses` →（必要时经确认 `delivery-create-address`）→ `delivery-query-stores`，此后 `orderType=2`，`beType=2`，后续菜单/算价/下单须同时传 `storeCode` + `beCode`，并带 `addressId`。其余省钱与确认规则相同。

## 失败处理

| 情况 | 动作 |
|---|---|
| Token/401 | 提示检查 MCP Token，停止 |
| 429 | 降低频率后重试 |
| 算价失败 | 换组合或去掉券重试，不直接下单 |
| 下单失败 | 展示错误信息，保留方案供修改 |

## 安全

- 不在对话中要求用户粘贴 Token 到聊天记录长期保存
- 不把真实 Token 写入仓库文件
