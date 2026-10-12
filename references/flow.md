# 到店预算点餐调用流

```text
now-time-info
    │
    ▼
[可选确认] auto-bind-coupons
available-coupons / query-my-coupons
    │
    ▼
query-nearby-stores  (searchType=2, beType=1, city+keyword)
    │ 用户选定门店 → storeCode（到店自取不传 beCode）
    ▼
query-store-coupons  (orderType=1, beType=1, 不传 beCode)
    │
    ▼
query-meals → query-meal-detail?  (同上, 不传 beCode)
    │
    ▼
候选组合（≤8）× calculate-price  (不传 beCode; 可带 couponId/couponCode)
    │ 选应付最低且 ≤ 预算
    ▼
展示方案 + takeWayList → 用户选 takeWayCode
    │
    ▼
用户确认「确认下单」
    │
    ▼
create-order  (orderType=1, beType=1, 不传 beCode, takeWayCode, 同方案 items)
    │
    ▼
返回 payH5Url / 取餐信息
    │
    └─ 可选 query-order / cancel-order
```

## 到店关键参数

| 步骤 | orderType | beType | beCode |
|---|---|---|---|
| 到店自取全流程 | `1` | `1` | **不传** |
| 得来速 | `1` | `5` | **必传**（`query-nearby-stores`） |
| 外送降级 | `2` | `2` | **必传**（`delivery-query-stores`） |

## 价格单位

`calculate-price` 返回的 `price` 等字段多为**分**。展示给用户时：`yuan = fen / 100`。
