// Real browser, stubbed API only. No database or real-login evidence.
import assert from 'node:assert/strict';
const base = process.env.UI_BASE_URL || 'http://localhost:5173';
const debug = 'http://127.0.0.1:9224';
const tab = await (await fetch(debug + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(), errors = [], checks = [];
let checked=false,custom=[],emailEnabled=true,reports=[],photos=[];let rows=[];let saved={id:7,bookingId:3,status:'PENDING',createdAt:'2026-10-23T00:00:00',type:'CANCEL',reason:'Synthetic reason'};
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
  const path = decodeURIComponent(new URL(request.url).pathname);
  if (!path.startsWith('/api/')) { await send('Fetch.continueRequest', { requestId }); return; }
  if(path==='/api/media/reviews/test.jpg'&&request.method==='GET') {await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Access-Control-Allow-Origin',value:base}],body:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='});return;}
  let data = [], status = 200;
  if(path==='/api/chat/models')data={models:[],defaultModel:null};
 else if(request.method==='OPTIONS')data=null;
 else if(path==='/api/bookings/3/preparation/g:1'&&request.method==='PUT'){checked=JSON.parse(request.postData).checked;data=null;}
 else if(path==='/api/bookings/3/preparation'&&request.method==='POST'){custom.push({key:'c:1',label:JSON.parse(request.postData).label,checked:false,custom:true});data=null;}
 else if(path==='/api/bookings/3/preparation')data={items:[{key:'g:1',label:'Water',checked,custom:false},...custom],departureDate:'2099-11-01',returnDate:'2099-11-03',pickupPoint:'Synthetic pickup'};
 else if(path==='/api/notifications/preferences'){if(request.method==='PUT')emailEnabled=JSON.parse(request.postData).emailEnabled;data={emailEnabled};}
 else if(path==='/api/notifications')data={items:[],unread:0,page:0,totalPages:0,totalElements:0};
 else if(path==='/api/guide-workspace/trips')data={items:[{id:1,title:'Synthetic completed trip',departureDate:'2020-01-01',returnDate:'2020-01-03',responseStatus:'ACCEPTED',role:'LEAD',status:'CLOSED'}],page:0,totalPages:1,totalElements:1};
 else if(path==='/api/guide-workspace/trips/1/report'){if(request.method==='POST')reports=[{id:1,schedule_id:1,status:'SUBMITTED',...JSON.parse(request.postData)}];data=reports;}
 else if(path==='/api/admin/guide-reports/1'&&request.method==='PUT'){reports[0].status='REVIEWED';reports[0].admin_note=JSON.parse(request.postData).note;data=null;}
 else if(path==='/api/admin/guide-reports')data={items:reports,page:0,hasNext:false};
 else if(path==='/api/bookings/3/review')data={canReview:false,review:{id:9,rating:5,comment:'Synthetic review'},message:'Reviewed'};
 else if(path==='/api/me/reviews/9/photos'){if(request.method==='POST')photos=[{id:1,url:'/api/media/reviews/test.jpg',approved:false}];data=photos;}
 else if(path==='/api/admin/reviews/9/photos')data=photos;
 else if(path==='/api/admin/reviews/9/photos/1'&&request.method==='PUT'){photos[0].approved=JSON.parse(request.postData).approved;data=null;}
 else if(path.includes('/operations/reviews'))data={items:[{id:9,author:'Synthetic',rating:5,approved:true,comment:'Review',tour:'Synthetic trip',bookingId:3}],page:0,totalPages:1,totalElements:1};
 else if(path==='/api/chat'){errors.push('Unexpected AI send');data={};}

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
async function wait(expression) { for (let i = 0; i < 300; i++) { if (await js(`Boolean(${expression})`)) return; await new Promise(r => setTimeout(r, 100)); } throw Error(expression); }
async function check(name, expression) { assert.ok(await js(expression), name); checks.push(name); }
async function input(selector,value){await js(`{const t=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(t.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(t,${JSON.stringify(value)});t.dispatchEvent(new Event('input',{bubbles:true}));}`);}
async function account(role,path){await js(`localStorage.setItem('token','synthetic-${role}');localStorage.setItem('role','ROLE_${role}');localStorage.setItem('username','synthetic@test.invalid')`);await send('Page.navigate',{url:base+path});}
try {
 await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*://*/api/*'}]});
 await send('Page.navigate',{url:base+'/login'});await wait(`document.querySelector('input[type=password]')`);
 await account('USER','/my-bookings/3');await wait(`document.querySelector('.trip-checklist input')`);
 await js(`document.querySelector('.trip-checklist input').click()`);await wait(`document.querySelector('.trip-checklist input')?.checked`);
 await send('Page.reload');await wait(`document.querySelector('.trip-checklist input')?.checked`);checks.push('checklist persists after reload');
 await input('.trip-preparation form input','Personal item');await js(`document.querySelector('.trip-preparation form button').click()`);await wait(`document.querySelector('.trip-checklist')?.textContent.includes('Personal item')`);checks.push('custom checklist item added');
 await js(`document.querySelector('.trip-preparation > button').click()`);await wait(`location.pathname==='/chat'`);
 await wait(`document.querySelector('.chat-panel input')?.value.includes('Booking #3')`);checks.push('AI handoff prefills booking context without sending');
 await send('Page.navigate',{url:base+'/notifications'});await wait(`document.querySelector('input[type=checkbox]')`);
 await js(`document.querySelector('input[type=checkbox]').click()`);await wait(`document.querySelector('input[type=checkbox]')?.checked===false`);
 await send('Page.reload');await wait(`document.querySelector('input[type=checkbox]')?.checked===false`);checks.push('email opt-out persists');
 await account('GUIDE','/guide-workspace');await wait(`document.querySelector('.guide-report form')`);
 await check('guide report requires all fields',`document.querySelector('.guide-report form button').disabled`);
 await input('.guide-report textarea','Trip summary');await input('.guide-report label:nth-of-type(2) textarea','No incidents');await input('.guide-report label:nth-of-type(3) textarea','Suggestions');
 await js(`document.querySelector('.guide-report form button').click()`);await wait(`document.querySelector('.guide-report')?.textContent.includes('Trip summary')&&!document.querySelector('.guide-report form')`);checks.push('guide submits private report');
 await account('ADMIN','/admin/guide-reports');await wait(`document.querySelector('.guide-report textarea')`);await input('.guide-report textarea','Reviewed action');await js(`document.querySelector('.guide-report button').click()`);await wait(`document.querySelector('.guide-report')?.textContent.includes('Reviewed action')`);checks.push('admin reviews report');
 await account('GUIDE','/guide-workspace');await wait(`document.querySelector('.guide-report')?.textContent.includes('Reviewed action')`);checks.push('guide sees admin response');
 await account('USER','/my-bookings/3');await wait(`document.querySelector('input[type=file]')`);
 // A browser-created synthetic PNG exercises multipart upload UI; no real photos or backend.
 await js(`{const input=document.querySelector('input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array([137,80,78,71])],'synthetic.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}`);
 await wait(`document.querySelector('.review-photo-grid figcaption')`);checks.push('upload displays pending moderation');
 await account('ADMIN','/admin/reviews');await wait(`document.querySelector('.review-photo-grid button')`);await js(`document.querySelector('.review-photo-grid button').click()`);await wait(`document.querySelector('.review-photo-grid figcaption')?.textContent.includes('Đã duyệt ảnh')`);checks.push('admin approves review photo');
 await wait(`document.querySelector('.review-photo-grid img')?.naturalWidth>0`);checks.push('private image preview renders');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await check('mobile no overflow',`document.documentElement.scrollWidth<=innerWidth`);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({scope:'Browser with API stubs; no DB/provider verification',checks},null,2));
}catch(e){console.error(JSON.stringify({errors,text:await js('document.body.innerText.slice(0,2500)')}));throw e;}
finally {await fetch(debug+'/json/close/'+tab.id);ws.close();}

