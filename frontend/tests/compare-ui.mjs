// Real browser, stubbed API only. No database or real-login evidence.
import assert from 'node:assert/strict';
const base = process.env.UI_BASE_URL || 'http://localhost:5173';
const debug = 'http://127.0.0.1:9224';
const tab = await (await fetch(debug + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(), errors = [], checks = [];
let failTour=false, failSchedule=false;
const tours=[1,2,3,4].map(id=>({id,slug:'test-'+id,title:id===1?'Simulation test':'Tour '+id,durationDays:2,durationNights:1,pricePerPax:id*100,adventureProfile:id===1?{distanceKm:12,sourceNote:'simulation fixture'}:{}}));
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
  if(path==='/api/tours') data=tours;
  else if(path==='/api/chat/models') data={models:[],defaultModel:null};
  else if(path.startsWith('/api/tours/test-')) {data=tours.find(t=>path.endsWith(t.slug));if(failTour&&data?.id===2)status=404;}
  else if(path.endsWith('/schedules')) {data=[{id:99,departureDate:'2099-01-01',availableSlots:4,status:'OPEN'},{id:100,departureDate:'2020-01-01',availableSlots:9,status:'OPEN'}];if(failSchedule)status=503;}
  else if(path.includes('unread'))data={count:0};
  else if(path.endsWith('/favorite-tours/ids'))data=[1,2];
  else if(path.endsWith('/favorite-tours'))data={items:tours.slice(0,2),totalElements:2};
  try { await send('Fetch.fulfillRequest', { requestId, responseCode: status,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: base },
      { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }],
    body: Buffer.from(JSON.stringify({ code: status === 200 ? 1000 : status, message: 'Synthetic failure', data })).toString('base64') });
  } catch (e) { errors.push(String(e)); }
});
async function js(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; }
async function wait(expression) { for (let i = 0; i < 100; i++) { if (await js(`Boolean(${expression})`)) return; await new Promise(r => setTimeout(r, 100)); } throw Error(expression); }
async function check(name, expression) { assert.ok(await js(expression), name); checks.push(name); }
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Storage.clearDataForOrigin', { origin: base, storageTypes: 'all' });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  await send('Page.navigate', { url: base + '/tours' });
  await wait(`document.querySelectorAll('.tour-card .compare-toggle').length === 4`);
  await js(`document.querySelectorAll('.tour-card .compare-toggle')[0].click()`);
  await wait(`document.querySelector('.compare-tray')`);
  await check('one tour cannot compare yet', `!document.querySelector('.compare-tray a')`);
  await js(`document.querySelectorAll('.tour-card .compare-toggle')[1].click()`);
  await wait(`document.querySelector('.compare-tray a')`);
  await js(`document.querySelectorAll('.tour-card .compare-toggle')[2].click()`);
  await wait(`document.querySelectorAll('.tour-card .compare-toggle')[3].disabled`);
  checks.push('maximum three tours');
  await js(`document.querySelector('.compare-tray a').click()`);
  await wait(`document.querySelectorAll('.comparison-table thead h2').length === 3 && document.querySelector('.compare-simulation')`);
  await check('guest compares with simulation labeled', `location.pathname === '/compare' && !!document.querySelector('.compare-simulation')`);
  await check('missing metrics shown honestly', `document.querySelector('.comparison-table').innerText.includes('Chưa cập nhật')`);
  await wait(`document.querySelectorAll('.comparison-table a[href*="schedule=99"]').length === 3`);
  await check('only bookable schedules linked', `!document.querySelector('a[href*="schedule=100"]')`);
  await send('Page.reload');
  await wait(`document.querySelectorAll('.comparison-table thead h2').length === 3 && document.querySelector('.compare-simulation')`);
  checks.push('reload restores selection');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await check('mobile scroll limited to table', `document.documentElement.scrollWidth <= innerWidth && document.querySelector('.comparison-scroll').scrollWidth > document.querySelector('.comparison-scroll').clientWidth`);
  failTour = true; failSchedule = true;
  await js(`document.querySelector('.comparison-page > .compare-toggle').click()`);
  await wait(`document.querySelector('.comparison-table [role=alert]')`);
  await wait(`document.querySelector('.comparison-table').innerText.includes('Không tải được lịch')`);
  await check('partial failure preserves other tour', `!!document.querySelector('.compare-simulation')`);
  failTour = false; failSchedule = false;
  await js(`document.querySelector('.comparison-page > .compare-toggle').click()`);
  await wait(`document.querySelectorAll('.comparison-table a[href*="schedule=99"]').length === 3`);
  checks.push('retry recovers tour and schedules');
  await js(`document.querySelector('.compare-tray-heading button').click()`);
  await wait(`!document.querySelector('.compare-tray') && !document.querySelector('.comparison-table')`);
  checks.push('clear selection shows empty state');
  await js(`localStorage.setItem('token','synthetic-token');localStorage.setItem('username','a@test.invalid');localStorage.setItem('role','ROLE_USER')`);
  await send('Page.navigate', { url: base + '/favorites' });
  await wait(`document.querySelectorAll('.favorites-grid .compare-toggle').length === 2`);
  await js(`document.querySelector('.favorites-grid .compare-toggle').click()`);
  await wait(`document.querySelector('.compare-tray li')`);
  checks.push('favorite cards share comparison selection');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ scope: 'Browser with API stubs', checks, runtimeErrors: errors }, null, 2));
} catch (e) { console.error(JSON.stringify({ errors, text: await js('document.body.innerText.slice(0,1500)') })); throw e;
} finally { await fetch(debug + '/json/close/' + tab.id); ws.close(); }
