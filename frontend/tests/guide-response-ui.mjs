// Real browser, stubbed API only. No database or real-login evidence.
import assert from 'node:assert/strict';
const base = process.env.UI_BASE_URL || 'http://localhost:5173';
const debug = 'http://127.0.0.1:9224';
const tab = await (await fetch(debug + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(), errors = [], checks = [];
let responseStatus='PENDING',reason='';
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
  if(path==='/api/chat/models')data={models:[],defaultModel:null};
 else if(path.endsWith('/response') && request.method==='PUT') {const body=JSON.parse(request.postData);assert.equal(body.assignmentId,20);responseStatus=body.decision;reason=body.reason;data=null;}
 else if(path==='/api/guide-workspace/trips')data={items:[{id:1,title:'Test trip',departureDate:'2099-11-01',returnDate:'2099-11-02',status:'OPEN',role:'LEAD',assignmentId:20,responseStatus,responseReason:reason}],page:0,totalPages:1,totalElements:1};
 else if(path==='/api/admin/guide-assignments')data={items:[{id:1,title:'Test trip',departure_date:'2099-11-01',return_date:'2099-11-02',assigned:1,pending:1,accepted:0,declined:0,confirmed_leads:0,unlinked:1}],page:0,hasNext:false};
 else if(path.endsWith('/history'))data=[{guide_id:4,actor:'admin@test.invalid',action:'ASSIGNED',reason:'Synthetic reason',created_at:'2026-10-23T00:00:00Z'}];
 else if(path.includes('unread'))data={count:0};
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
 await send('Runtime.enable');await send('Page.enable');await send('Storage.clearDataForOrigin',{origin:base,storageTypes:'all'});
 await send('Fetch.enable',{patterns:[{urlPattern:'*://*/api/*'}]});
 await send('Page.navigate',{url:base+'/login'});await wait(`document.querySelector('input[type=password]')`);
 await js(`localStorage.setItem('token','synthetic-guide');localStorage.setItem('role','ROLE_GUIDE');localStorage.setItem('username','guide@test.invalid')`);
 await send('Page.navigate',{url:base+'/guide-workspace'});
 await wait(`document.querySelector('.guide-trip textarea')`);
 await check('pending guide has no guest-list link',`!document.querySelector('a[href="/guide-workspace/1"]')`);
 await check('decline requires reason',`[...document.querySelectorAll('.guide-trip button')].find(b=>b.textContent==='Từ chối lịch').disabled`);
 await js(`{const e=document.querySelector('.guide-trip textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Synthetic reason');e.dispatchEvent(new Event('input',{bubbles:true}));}`);
 await js(`[...document.querySelectorAll('.guide-trip button')].find(b=>b.textContent==='Từ chối lịch').click()`);
 await wait(`document.querySelector('.guide-trip')?.textContent.includes('Đã từ chối')`);
 await check('declined stays without guest-list access',`!document.querySelector('a[href="/guide-workspace/1"]')`);
 responseStatus='PENDING';reason='';await send('Page.reload');await wait(`document.querySelector('.guide-trip textarea')`);
 await js(`[...document.querySelectorAll('.guide-trip button')].find(b=>b.textContent==='Nhận lịch').click()`);
 await wait(`document.querySelector('a[href="/guide-workspace/1"]')`);checks.push('accepted exposes roster navigation');
 await js(`localStorage.setItem('token','synthetic-admin');localStorage.setItem('role','ROLE_ADMIN');localStorage.setItem('username','admin@test.invalid')`);
 await send('Page.navigate',{url:base+'/admin/guide-assignments'});
 await wait(`document.querySelector('.workspace-grid .panel')`);
 await check('admin sees missing lead and account warning',`document.querySelector('.workspace-grid').innerText.includes('Chưa có trưởng đoàn')&&document.querySelector('.workspace-grid').innerText.includes('chưa có tài khoản')`);
 await js(`[...document.querySelectorAll('.workspace-grid button')].find(b=>b.textContent==='Lịch sử').click()`);
 await wait(`document.querySelector('#admin-content')?.textContent.includes('Synthetic reason')||document.body.innerText.includes('Synthetic reason')`);checks.push('audit history visible');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await check('mobile no horizontal overflow',`document.documentElement.scrollWidth<=innerWidth`);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({scope:'Browser/API stub',checks,runtimeErrors:errors},null,2));
}catch(e){console.error(JSON.stringify({errors,text:await js('document.body.innerText.slice(0,1500)')}));throw e;}
finally{await fetch(debug+'/json/close/'+tab.id);ws.close();}

