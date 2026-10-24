// Real browser, stubbed API only. No database or real-login evidence.
import assert from 'node:assert/strict';
const base = process.env.UI_BASE_URL || 'http://localhost:5173';
const debug = 'http://127.0.0.1:9224';
const tab = await (await fetch(debug + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(), errors = [], checks = [];
let saved = false, fail = false;
const tour = { id: 1, slug: 'synthetic', title: 'Synthetic tour', location: 'Test', pricePerPax: 100, durationDays: 2 };
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => reject(Error('CDP timeout')), 10000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
}
ws.addEventListener('message', async e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = pending.get(m.id); if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params;
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/')) { await send('Fetch.continueRequest', { requestId }); return; }
  let data = [], status = 200;
  if (path === '/api/tours') data = [tour];
  else if (path === '/api/chat/models') data = { models: [], defaultModel: null };
  else if (path.includes('unread')) data = { count: 0 };
  else if (path.startsWith('/api/me/favorite-tours')) {
    if (request.method === 'PUT') { if (fail) { status = 503; fail = false; } else saved = true; }
    if (request.method === 'DELETE') saved = false;
    data = path.endsWith('/ids') ? (saved ? [1] : []) : { items: saved ? [tour] : [], totalElements: saved ? 1 : 0 };
  }
  try { await send('Fetch.fulfillRequest', { requestId, responseCode: status,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: base },
      { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }],
    body: Buffer.from(JSON.stringify({ code: status === 200 ? 1000 : status, message: 'Synthetic failure', data })).toString('base64') });
  } catch (e) { errors.push(String(e)); }
});
async function js(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; }
async function wait(expression) { for (let i = 0; i < 100; i++) { if (await js(`Boolean(${expression})`)) return; await new Promise(r => setTimeout(r, 100)); } throw Error(expression); }
async function check(name, expression) { assert.ok(await js(expression), name); checks.push(name); }
const button = `document.querySelector('.favorite-button[aria-pressed]')`;
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Storage.clearDataForOrigin', { origin: base, storageTypes: 'all' });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  await send('Page.navigate', { url: base + '/tours' });
  await wait(button); await js(`${button}.click()`);
  await wait(`location.pathname === '/login'`); checks.push('guest redirected to login');
  await js(`localStorage.setItem('token','synthetic-token');localStorage.setItem('username','a@test.invalid');localStorage.setItem('role','ROLE_USER')`);
  await send('Page.navigate', { url: base + '/tours' }); await wait(`${button} && !${button}.disabled`);
  fail = true; await js(`${button}.click()`); await wait(`document.querySelector('.favorite-control [role=alert]')`);
  await check('failed save stays unsaved', `${button}.getAttribute('aria-pressed') === 'false'`);
  await js(`${button}.click()`); await wait(`${button}.getAttribute('aria-pressed') === 'true'`); checks.push('save updates heart');
  await send('Page.navigate', { url: base + '/favorites' }); await wait(`document.querySelector('.favorites-grid .tour-card')`);
  await check('reload restores saved state', `${button}.getAttribute('aria-pressed') === 'true'`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await check('mobile has no horizontal overflow', 'document.documentElement.scrollWidth <= innerWidth');
  await js(`${button}.click()`); await wait(`!document.querySelector('.favorites-grid') && document.querySelector('.favorites-page a[href="/tours"]')`);
  checks.push('remove produces empty state');
  await js(`localStorage.removeItem('token');window.dispatchEvent(new Event('auth:expired'))`);
  await wait(`location.pathname === '/login'`); checks.push('expired session hides private page');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ scope: 'Browser with API stubs', checks, runtimeErrors: errors }, null, 2));
} catch (e) {
  console.error(JSON.stringify({ errors, url: await js('location.href'), text: await js('document.body.innerText.slice(0,1200)') }));
  throw e;
} finally { await fetch(debug + '/json/close/' + tab.id); ws.close(); }
