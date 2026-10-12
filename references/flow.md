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
    │ 用户选定门店 → storeCode, beCode
    ▼
query-store-coupons  (orderType=1, beType=1)
    │
    ▼
query-meals → query-meal-detail?
    │
    ▼
候选组合（≤8）× calculate-price  (可带 couponId/couponCode)
    │ 选应付最低且 ≤ 预算
    ▼
展示方案 + takeWayList → 用户选 takeWayCode
    │
    ▼
用户确认「确认下单」
    │
    ▼
create-order  (beType=1, takeWayCode, 同方案 items)
    │
    ▼
返回 payH5Url / 取餐信息
    │
    └─ 可选 query-order / cancel-order
```

## 到店关键参数

| 步骤 | orderType | beType |
|---|---|---|
| 到店全流程 | `1` | `1` |

## 价格单位

`calculate-price` 返回的 `price` 等字段多为**分**。展示给用户时：`yuan = fen / 100`。
