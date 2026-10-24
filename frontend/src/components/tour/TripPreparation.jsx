import { useCallback, useState } from 'react';
import api from '../../api/axiosClient';
import useResource from '../../hooks/useResource';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { dateLabel, errorMessage } from '../../utils/tour';
import './trip-experience.css';
export default function TripPreparation({ bookingId }) {
 const { setDraft }=useChat();const navigate=useNavigate();
 const path=`/api/bookings/${bookingId}/preparation`;
 const load=useCallback(async()=>(await api.get(path)).data.data,[path]);
 const {data,loading,error,reload}=useResource(load);
 const [label,setLabel]=useState(''),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 async function act(fn){if(busy)return;setBusy(true);setFailure('');try{await fn();setLabel('');reload();}catch(e){setFailure(errorMessage(e));}finally{setBusy(false);}}
 return <section className="panel trip-preparation"><h2>Chuẩn bị chuyến đi</h2>
 {failure&&<p role="alert">{failure}</p>}
 {loading?<p role="status">Đang tải checklist…</p>:error?<p role="alert">{error} <button onClick={reload}>Thử lại</button></p>:data&&<>
 <p>{dateLabel(data.departureDate)} – {dateLabel(data.returnDate)}</p>
 <p><strong>Điểm đón: </strong>{data.pickupPoint||'Chưa cập nhật'}</p><p><strong>Giờ tập trung: </strong>{data.pickupAt?new Date(data.pickupAt).toLocaleString('vi-VN'):'Chưa cập nhật'}</p>
 <details><summary>Yêu cầu tham gia</summary><p className="trip-note">{data.requirements||'Liên hệ nhà tổ chức để xác nhận.'}</p></details>
 <details><summary>Lịch trình và hướng dẫn viên</summary>{data.itinerary?.length?data.itinerary.map((day,i)=><div key={i}><h3>Ngày {day.day_number}: {day.title}</h3><p className="trip-note">{day.description}</p></div>):<p>Lịch trình chưa cập nhật.</p>}<p>Hướng dẫn viên đã nhận đoàn: {data.guides?.length?data.guides.map(g=>g.name).join(', '):'Chưa cập nhật'}</p></details>
 <p>{data.items.filter(i=>i.checked).length}/{data.items.length} mục đã chuẩn bị. Mục theo tour lấy từ danh sách đồ khách cần mang; mục riêng chỉ bạn xem.</p>
 {!data.items.length&&<p>Tour chưa có checklist cụ thể. Bạn có thể thêm mục cần chuẩn bị bên dưới.</p>}
 <ul className="trip-checklist">{data.items.map(item=><li key={item.key}><label><input type="checkbox" checked={item.checked} disabled={busy} onChange={e=>act(()=>api.put(`${path}/${encodeURIComponent(item.key)}`,{checked:e.target.checked}))}/><span>{item.label} {item.custom&&<small>(Mục riêng)</small>}</span></label>{item.custom&&<button className="text-btn" disabled={busy} aria-label={`Xóa ${item.label}`} onClick={()=>act(()=>api.delete(`${path}/${encodeURIComponent(item.key)}`))}>Xóa</button>}</li>)}</ul>
 <form onSubmit={e=>{e.preventDefault();act(()=>api.post(path,{label}));}}><label className="field">Thêm đồ cần chuẩn bị<input required maxLength={500} value={label} disabled={busy} onChange={e=>setLabel(e.target.value)}/></label><button className="btn btn-outline" disabled={busy||!label.trim()}>Thêm mục</button></form>
 <p className="small muted">Để hỏi AI về chuyến này, mở Hỏi AI và nêu “Booking #{bookingId} cần chuẩn bị gì?”. AI không được đọc ghi chú checklist riêng hoặc khai báo sức khỏe.</p>
 <button className="btn btn-outline" onClick={()=>{setDraft(`Booking #${bookingId} cần chuẩn bị gì? Cho tôi biết điểm đón và giờ tập trung nếu đã có thông tin.`);navigate('/chat');}}>Hỏi AI về chuyến này →</button>
 </>}
 </section>;
}
