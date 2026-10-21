// Browser UI contract tests only: ALL API traffic stubbed. No DB or provider evidence.
import assert from 'node:assert/strict';
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5177';
const debug = 'http://127.0.0.1:9224';
const page = await (await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(), checks = [], errors = [];
function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout ${method}`)); }, 10000); pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params })); }); }
const gemma = 'gemma-4-31b-it';
let selection = { modelId: null, revision: 0 }, rows = [], fail = false, delay = 0;
let config = { revision: 0, settings: { models: [{ id: 'gemini-test', label: 'Gemini test', enabled: true, visible: true, verified: true }, { id: gemma, label: 'Gemma 31B test', enabled: true, visible: true, verified: true }, { id: 'gemma-4-26b-a4b-it', label: 'Gemma 26B test', enabled: false, visible: false, verified: false }], chatDefault: 'gemini-test', plannerDefault: 'gemini-test' } };
let history = [];
ws.addEventListener('message', async event => {
  const m = JSON.parse(event.data);
  if (m.id) { const p = pending.get(m.id); if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params; const url = new URL(request.url);
  try {
    if (!url.pathname.startsWith('/api/')) {
      if (url.origin === base) await send('Fetch.continueRequest', { requestId });
      else await send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
      return;
    }
    const body = request.postData ? JSON.parse(request.postData) : {}; let data = [], status = 200, message = 'success';
    if (request.method === 'OPTIONS') data = null;
    else if (url.pathname === '/api/chat/models') data = { models: config.settings.models.filter(m => m.enabled && m.visible), defaultModel: config.settings.chatDefault };
    else if (url.pathname === '/api/chat/sessions') { selection = { modelId: null, revision: 0 }; rows = []; data = { sessionId: 'fixture-session', sessionToken: 'fixture-secret' }; }
    else if (url.pathname.endsWith('/state')) data = selection;
    else if (url.pathname.endsWith('/settings')) { assert.equal(body.revision, selection.revision); selection = { modelId: body.modelId, revision: selection.revision + 1 }; data = selection; }
    else if (url.pathname === '/api/chat/history') data = rows;
    else if (url.pathname === '/api/chat') {
      assert.equal(body.settingsRevision, selection.revision);
      const currentModel = selection.modelId || config.settings.chatDefault;
      const oldRows = rows;
      if (delay) await new Promise(r => setTimeout(r, delay));
      if (fail) { fail = false; status = 503; message = 'Synthetic provider unavailable'; }
      else { data = { sessionId: 'fixture-session', reply: 'Synthetic grounded reply [S1]', modelId: currentModel, sources: [{ id: 'S1', label: 'guide.txt', excerpt: 'Synthetic public evidence <script>unsafe()</script>', kind: 'DOCUMENT', cited: true }, { id: 'S2', label: 'Other retrieved document', cited: false }], tours: [], notices: [] }; oldRows.push({ sender: 'USER', message: body.message }, { sender: 'BOT', message: data.reply, modelId: currentModel, sources: data.sources }); }
    } else if (url.pathname === '/api/admin/ai-models') {
      if (request.method === 'PUT') { assert.equal(body.revision, config.revision); history.push({ revision: config.revision, changedBy: 'fixture', changedAt: new Date().toISOString() }); config = { ...body, revision: body.revision + 1 }; } data = config;
    } else if (url.pathname.endsWith('/metrics')) data = { scope: 'Fixture metrics', models: {} };
    else if (url.pathname.endsWith('/history')) data = history;
    else if (url.pathname.endsWith('/restore')) { assert.equal(body.expectedRevision, config.revision); config.revision++; data = config; }
    else if (url.pathname.includes('unread')) data = { count: 0 };
    await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,OPTIONS' }], body: Buffer.from(JSON.stringify({ code: status === 200 ? 1000 : status, message, data })).toString('base64') });
  } catch (e) { if (!String(e?.message).includes('Invalid InterceptionId')) errors.push(e?.message || String(e)); }
});
async function js(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
async function wait(expression) { for (let i = 0; i < 200; i++) { if (await js(`Boolean(${expression})`)) return; await new Promise(r => setTimeout(r, 100)); } throw new Error(`Not ready: ${expression}`); }
async function check(name, expression) { assert.ok(await js(expression), name); checks.push(name); }
async function setInput(value) { await js(`{const el=document.querySelector('.chat-composer input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));}`); }
async function submit(value) { await setInput(value); await js(`document.querySelector('.chat-composer').requestSubmit()`); }
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Storage.clearDataForOrigin', { origin: base, storageTypes: 'all' });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }, { urlPattern: 'https://*' }] });
  await send('Page.navigate', { url: base + '/chat' });
  await wait(`document.querySelector('.chat-model-selector select')?.options.length===3`);
  await check('guest sees only public models', `!document.querySelector('.chat-model-selector').textContent.includes('26B')`);
  await check('no implicit model and send disabled', `document.querySelector('.chat-model-selector select').value==='' && document.querySelector('.send-btn').disabled`);
  await check('selector is inside composer left of message', `document.querySelector('.chat-composer .chat-model-selector').getBoundingClientRect().right <= document.querySelector('.chat-composer input').getBoundingClientRect().left`);
  await js(`{const el=document.querySelector('.chat-model-selector select');el.value=${JSON.stringify(gemma)};el.dispatchEvent(new Event('change',{bubbles:true}));}`);
  await wait(`!document.querySelector('.chat-model-selector select').disabled`);
  assert.equal(selection.modelId, gemma); checks.push('selection persisted through settings API');
  await send('Page.reload'); await wait(`document.querySelector('.chat-model-selector select')?.value===${JSON.stringify(gemma)}`); checks.push('reload restores selection');
  delay = 700; await submit('Synthetic tour question');
  await wait(`document.querySelector('.chat-model-selector select').disabled`); checks.push('busy locks selector');
  await wait(`document.querySelector('.chat-messages').textContent.includes('Synthetic grounded reply')`);
  await check('answer model label', `document.querySelector('.chat-messages').textContent.includes(${JSON.stringify(gemma)})`);
  await js(`document.querySelector('.chat-citation').click()`);
  await check('citation opens escaped public excerpt', `document.querySelector('.chat-source-excerpt').textContent.includes('Synthetic public evidence <script>') && !document.querySelector('.chat-source-excerpt script')`);
  await check('retrieved but uncited source remains visible', `document.querySelector('.chat-sources').textContent.includes('Other retrieved document')`);
  await send('Page.reload'); await wait(`document.querySelector('.chat-citation')`);
  await js(`document.querySelector('.chat-citation').click()`);
  await check('reload restores source excerpt', `document.querySelector('.chat-source-excerpt').textContent.includes('Synthetic public evidence')`);
  delay = 0; fail = true; await submit('Synthetic failure'); await wait(`document.querySelector('[role=alert]')?.textContent.includes('Synthetic provider unavailable')`);
  await check('provider error outside history', `!document.querySelector('.chat-messages').textContent.includes('Synthetic provider unavailable')`);
  await js(`document.querySelector('[role=alert] button').click()`); await wait(`!document.querySelector('.chat-model-selector select').disabled && !document.querySelector('[role=alert]')`);
  assert.equal(rows.length, 4); checks.push('explicit error retry saves one successful pair');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await check('mobile has no horizontal overflow', `document.documentElement.scrollWidth<=window.innerWidth`);
  await js(`document.querySelector('.chat-model-selector select').focus()`); await check('selector keyboard focus', `document.activeElement.matches('.chat-model-selector select')`);
  await send('Emulation.clearDeviceMetricsOverride');
  delay = 700; await submit('Late answer'); await js(`window.dispatchEvent(new Event('auth:changed'))`);
  await new Promise(r => setTimeout(r, 1100)); await check('account reset discards late answer', `!document.querySelector('.chat-messages').textContent.includes('Synthetic grounded reply')`);
  // Synthetic identity only; every API remains intercepted. This does not test JWT.
  await js(`localStorage.setItem('token','fixture-only');localStorage.setItem('role','ROLE_ADMIN');localStorage.setItem('username','fixture')`);
  await send('Page.navigate', { url: base + '/admin/ai-models' }); await wait(`document.querySelectorAll('.ai-model-card').length===3`);
  await check('admin sees disabled Gemma', `document.querySelector('.ai-admin').textContent.includes('Gemma 26B test')`);
  await js(`document.querySelector('.ai-actions .btn').click()`); await wait(`document.querySelector('[role=status]')`); assert.equal(config.revision, 1); checks.push('admin save revision');
  await check('admin no longer assigns default tasks', `document.querySelectorAll('.ai-tabs button').length===2 && document.querySelectorAll('.ai-admin select').length===0`);
  await js(`document.querySelectorAll('.ai-tabs button')[1].click()`); await wait(`document.querySelector('.ai-audit')`); checks.push('audit history rendered');
  await send('Page.navigate', { url: base + '/planner' });
  await wait(`document.querySelector('.planner-page .chat-model-selector select')`);
  await js(`{const el=document.querySelector('.planner-page .chat-model-selector select');el.value=${JSON.stringify(gemma)};el.dispatchEvent(new Event('change',{bubbles:true}));}`);
  await wait(`!document.querySelector('.planner-page .chat-model-selector select').disabled`);
  assert.equal(selection.modelId,gemma);checks.push('planner uses shared selection API');
  await send('Page.navigate', { url: base + '/chat' });
  await wait(`document.querySelector('.chat-model-selector select')?.value===${JSON.stringify(gemma)}`);checks.push('planner choice restored in chat');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ apiStub: true, providerCalls: 0, checks, runtimeErrors: errors }, null, 2));
} catch (e) {
  console.error(JSON.stringify({ checks, errors, text: await js('document.body.innerText').catch(() => '') }));throw e;
} finally {
  await fetch(`${debug}/json/close/${page.id}`).catch(() => {}); ws.close();
}
