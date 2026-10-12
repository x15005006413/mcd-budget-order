/**
 * MCP connectivity smoke test (no order creation).
 * Usage:
 *   set MCD_MCP_TOKEN=your_token
 *   npm run smoke
 */

const URL = process.env.MCD_MCP_URL || 'https://mcp.mcd.cn';
const TOKEN = process.env.MCD_MCP_TOKEN;

if (!TOKEN) {
  console.error('Missing MCD_MCP_TOKEN. Set env var and retry. Do not commit tokens.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

async function rpc(method, params, id = 1) {
  const res = await fetch(URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  // Streamable HTTP may return SSE or plain JSON
  if (text.startsWith('event:') || text.includes('data:')) {
    const dataLine = text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('data:'));
    if (!dataLine) throw new Error(`SSE without data: ${text.slice(0, 500)}`);
    return JSON.parse(dataLine.slice(5).trim());
  }

  return JSON.parse(text);
}

const initParams = {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'mcd-budget-order-smoke', version: '1.0.0' },
};

try {
  console.log('initialize →', URL);
  const init = await rpc('initialize', initParams, 1);
  if (init.error) throw new Error(JSON.stringify(init.error));
  console.log('ok server:', init.result?.serverInfo ?? init.result);

  // notifications/initialized (best-effort)
  await fetch(URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  }).catch(() => {});

  console.log('tools/list …');
  const listed = await rpc('tools/list', {}, 2);
  if (listed.error) throw new Error(JSON.stringify(listed.error));

  const tools = listed.result?.tools ?? [];
  const names = tools.map((t) => t.name).sort();
  console.log(`tools: ${names.length}`);
  console.log(names.join(', '));

  const required = [
    'query-nearby-stores',
    'query-meals',
    'calculate-price',
    'create-order',
  ];
  const missing = required.filter((n) => !names.includes(n));
  if (missing.length) {
    console.warn('missing expected tools:', missing.join(', '));
    process.exitCode = 2;
  } else {
    console.log('smoke passed (list only, no order).');
  }
} catch (err) {
  console.error('smoke failed:', err.message || err);
  process.exit(1);
}
