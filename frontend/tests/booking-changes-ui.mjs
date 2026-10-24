// Real browser, stubbed API only. No database or real-login evidence.
import assert from 'node:assert/strict';
const base = process.env.UI_BASE_URL || 'http://localhost:5173';
const debug = 'http://127.0.0.1:9224';
const tab = await (await fetch(debug + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(), errors = [], checks = [];
let rows=[];let saved={id:7,bookingId:3,status:'PENDING',createdAt:'2026-10-23T00:00:00',type:'CANCEL',reason:'Synthetic reason'};
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
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params;
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/')) { await send('Fetch.continueRequest', { requestId }); return; }
  let data = [], status = 200;
  if(path==='/api/chat/models')data={models:[],defaultModel:null};
 else if(request.method==='OPTIONS')data=null;
 else if(path.endsWith('/preparation'))data={items:[],departureDate:'2099-11-01',returnDate:'2099-11-03'};
 else if(path.endsWith('/change-requests/7')&&request.method==='PUT'){const input=JSON.parse(request.postData);saved.status=input.decision;saved.adminNote=input.note;data=saved;}
 else if(path.endsWith('/change-requests')&&request.method==='POST'){const input=JSON.parse(request.postData);if(input.type==='RESCHEDULE'){assert.equal(input.targetScheduleId,12);assert.equal(input.expectedAmount,200);}saved={...saved,...input,status:'PENDING'};rows=[saved];data=saved;}
 else if(path==='/api/tours/synthetic')data={id:4,pricePerPax:100};
 else if(path==='/api/tours/4/schedules')data=[{id:12,departureDate:'2099-12-01',returnDate:'2099-12-03',availableSlots:5,status:'OPEN'}];
 else if(path.endsWith('/change-requests'))data=rows;
 else if(path.endsWith('/participation'))data={status:'LEGACY',numberOfPax:2,editable:false};
 else if(path.endsWith('/passengers'))data={passengers:[],expectedCount:2,revision:0,editable:false};
 else if(path.endsWith('/guides'))data=[];
 else if(path==='/api/bookings/3'||path==='/api/admin/bookings/3')data={booking:{id:3,bookingCode:'BK-TEST',tourTitle:'Synthetic trip',tourSlug:'synthetic',scheduleId:10,departureDate:'2099-11-01',returnDate:'2099-11-03',numberOfPax:2,totalAmount:200,status:'CONFIRMED'},payments:[],contactName:'Synthetic',canCancel:false};
 else if(path.includes('unread'))data=0;
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
 await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*://*/api/*'}]});
 await send('Page.navigate',{url:base+'/login'});await wait(`document.querySelector('input[type=password]')`);
 await js(`localStorage.setItem('token','synthetic-client');localStorage.setItem('role','ROLE_USER');localStorage.setItem('username','user@test.invalid')`);
 await send('Page.navigate',{url:base+'/my-bookings/3'});
 await wait(`document.querySelector('.booking-changes form')`);
 await check('empty history offers form',`!document.querySelector('.booking-change-item')`);
 await check('reason required',`document.querySelector('.booking-changes form > button').disabled`);
 await js(`{const t=document.querySelector('.booking-changes textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'Synthetic reason');t.dispatchEvent(new Event('input',{bubbles:true}));}`);
 await js(`document.querySelector('.booking-changes form > button').click()`);
 await wait(`document.querySelector('.booking-change-item')`);
 await check('pending request hides duplicate form',`!document.querySelector('.booking-changes form')`);
 await js(`localStorage.setItem('token','synthetic-admin');localStorage.setItem('role','ROLE_ADMIN')`);
 await send('Page.navigate',{url:base+'/admin/bookings/3'});
 await wait(`document.querySelector('.booking-change-actions')`);
 await check('review requires note',`[...document.querySelectorAll('.booking-change-actions button')].every(b=>b.disabled)`);
 await js(`{const t=document.querySelector('.booking-changes textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'Synthetic rejection');t.dispatchEvent(new Event('input',{bubbles:true}));}`);
 await js(`document.querySelector('.booking-change-actions button').click()`);
 await wait(`document.querySelector('.booking-change-item')?.textContent.includes('Synthetic rejection')`);
 checks.push('admin rejection note displayed');
 await js(`localStorage.setItem('token','synthetic-client');localStorage.setItem('role','ROLE_USER')`);
 await send('Page.navigate',{url:base+'/my-bookings/3'});
 await wait(`document.querySelector('.booking-change-item')?.textContent.includes('Synthetic rejection')`);
 checks.push('client sees rejection');
 await js(`{const e=document.querySelector('.booking-changes form select');e.value='RESCHEDULE';e.dispatchEvent(new Event('change',{bubbles:true}));}`);
 await wait(`document.querySelectorAll('.booking-changes form select')[1]?.options.length===2`);
 await js(`{const e=document.querySelectorAll('.booking-changes form select')[1];e.value='12';e.dispatchEvent(new Event('change',{bubbles:true}));const t=document.querySelector('.booking-changes form textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'New schedule');t.dispatchEvent(new Event('input',{bubbles:true}));}`);
 await js(`document.querySelector('.booking-changes form > button').click()`);
 await wait(`!document.querySelector('.booking-changes form')`);
 checks.push('reschedule sends selected schedule and displayed amount');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await check('mobile no overflow',`document.documentElement.scrollWidth<=innerWidth`);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({scope:'Browser/API stubs, not DB integration',checks},null,2));
} catch(e) { console.error(JSON.stringify({errors,text:await js('document.body.innerText.slice(0,2000)')}));throw e; }
finally { await fetch(debug+'/json/close/'+tab.id);ws.close(); }
