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
  if(path==='/api/tours/departures') {
 const params=new URL(request.url).searchParams; const from=params.get('from'); const month=from.slice(0,7);
 const rows=[{id:1,tour:tours[0],departureDate:month+'-25',returnDate:month+'-26',availableSlots:4,status:'OPEN',simulated:true},{id:2,tour:tours[1],departureDate:month+'-26',returnDate:month+'-27',availableSlots:0,status:'FULL',simulated:false},{id:3,tour:tours[2],departureDate:month+'-27',returnDate:month+'-28',availableSlots:3,status:'CANCELLED',simulated:true}];
 data={items:params.get('location')==='empty'?[]:params.get('availableOnly')==='true'?rows.filter(r=>r.status==='OPEN'&&r.availableSlots>=Number(params.get('people'))):rows,truncated:false,timezone:'Asia/Ho_Chi_Minh'};if(failTour)status=503;
 } else if(path==='/api/chat/models')data={models:[],defaultModel:null};else if(path.includes('unread'))data={count:0};
  try { await send('Fetch.fulfillRequest', { requestId, responseCode: status,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: base },
      { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }],
    body: Buffer.from(JSON.stringify({ code: status === 200 ? 1000 : status, message: 'Synthetic failure', data })).toString('base64') });
  } catch (e) { errors.push(String(e)); }
});
async function js(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; }
async function wait(expression) { for (let i = 0; i < 100; i++) { if (await js(`Boolean(${expression})`)) return; await new Promise(r => setTimeout(r, 100)); } throw Error(expression); }
async function check(name, expression) { assert.ok(await js(expression), name); checks.push(name); }
async function input(selector,value) { await js(`{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));}`); }
try {
 await send('Runtime.enable');await send('Page.enable');
 await send('Storage.clearDataForOrigin',{origin:base,storageTypes:'all'});
 await send('Fetch.enable',{patterns:[{urlPattern:'*://*/api/*'}]});
 await send('Page.navigate',{url:base+'/departures'});
 await wait(`document.querySelector('.departure-card')`);
 await check('guest sees departures and demo label',`!!document.querySelector('.departure-demo')`);
 await input('[name=people]','2');await js(`document.querySelector('.departure-filters').requestSubmit()`);
 await wait(`document.querySelector('a[href*="schedule=1&people=2"]')`);checks.push('booking link preserves schedule and party size');
 await js(`document.querySelector('[name=availableOnly]').click();document.querySelector('.departure-filters').requestSubmit()`);
 await wait(`document.querySelectorAll('.departure-card').length===3`);
 await check('full and cancelled cannot book',`document.querySelectorAll('.departure-card a[href*="/booking?"]').length===1`);
 await input('[name=location]','empty');await js(`document.querySelector('.departure-filters').requestSubmit()`);
 await wait(`document.querySelector('.departures-page').innerText.includes('Chưa có lịch phù hợp')`);checks.push('empty state');
 await input('[name=location]','');await js(`document.querySelector('.departure-filters').requestSubmit()`);
 await wait(`document.querySelectorAll('.departure-card').length===3`);
 await js(`document.querySelectorAll('.departure-toolbar button')[1].click()`);
 await wait(`document.querySelector('.departure-calendar')`);checks.push('month calendar renders');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await check('mobile page does not overflow',`document.documentElement.scrollWidth<=innerWidth`);
 failTour=true;await input('[aria-label="Tháng khởi hành"]','2026-12');
 await wait(`document.querySelector('.departures-page [role=alert]')`);checks.push('API failure visible');
 failTour=false;await js(`document.querySelector('.departures-page [role=alert] button').click()`);
 await wait(`document.querySelector('.departure-calendar')`);checks.push('retry recovers');
 await js(`document.querySelector('.departure-card .compare-toggle').click()`);await wait(`document.querySelector('.compare-tray')`);checks.push('comparison tray available');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({scope:'Browser/API stub',checks,runtimeErrors:errors},null,2));
}catch(e){console.error(JSON.stringify({errors,text:await js('document.body.innerText.slice(0,1500)')}));throw e;}
finally{await fetch(debug+'/json/close/'+tab.id);ws.close();}
