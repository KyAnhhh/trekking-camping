import { useCallback, useState } from 'react';
import api from '../../api/axiosClient';
import useResource from '../../hooks/useResource';
import AdminPager from '../../components/common/AdminPager';
import { errorMessage } from '../../utils/tour';
import '../../components/tour/trip-experience.css';
export default function AdminGuideReports(){
 const [page,setPage]=useState(0),[notes,setNotes]=useState({}),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 const load=useCallback(async()=>(await api.get('/api/admin/guide-reports',{params:{page}})).data.data,[page]);const {data,loading,error,reload}=useResource(load);
 async function review(id){if(busy)return;setBusy(true);setFailure('');try{await api.put(`/api/admin/guide-reports/${id}`,{note:notes[id]});reload();}catch(e){setFailure(errorMessage(e));}finally{setBusy(false);}}
 return <section><h1>Báo cáo sau chuyến đi</h1><p>Nội dung nội bộ từ hướng dẫn viên; không công khai cho khách hoặc đưa vào kho tri thức AI.</p><button className="btn btn-outline" onClick={reload} disabled={loading||busy}>Tải lại</button>{failure&&<p role="alert">{failure}</p>}{loading?<p>Đang tải…</p>:error?<p role="alert">{error}</p>:<>
 {!data?.items.length&&<p>Chưa có báo cáo.</p>}{data?.items.map(r=><article className="panel guide-report" key={r.id}><h2>{r.title} · Lịch #{r.schedule_id}</h2><p>{r.guide_name} · {new Date(r.created_at).toLocaleString('vi-VN')} · {r.status==='REVIEWED'?'Đã xem xét':'Chờ xử lý'}</p><h3>Tình hình đoàn</h3><p className="trip-note">{r.summary}</p><h3>Sự cố</h3><p className="trip-note">{r.incidents}</p><h3>Đề xuất</h3><p className="trip-note">{r.suggestions}</p>{r.status==='SUBMITTED'?<><label className="field">Ghi chú xử lý<textarea maxLength={2000} value={notes[r.id]||''} onChange={e=>setNotes(old=>({...old,[r.id]:e.target.value}))}/></label><button className="btn" disabled={busy||!notes[r.id]?.trim()} onClick={()=>review(r.id)}>Ghi nhận đã xem xét</button></>:<p>Phản hồi: {r.admin_note}</p>}</article>)}<AdminPager data={data} busy={busy} onPage={setPage}/></>}</section>;
}
