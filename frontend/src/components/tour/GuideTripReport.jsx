import { useCallback, useState } from 'react';
import api from '../../api/axiosClient';
import useResource from '../../hooks/useResource';
import { errorMessage } from '../../utils/tour';
import './trip-experience.css';
export default function GuideTripReport({scheduleId}){
 const path=`/api/guide-workspace/trips/${scheduleId}/report`;
 const load=useCallback(async()=>(await api.get(path)).data.data,[path]);const {data,loading,error,reload}=useResource(load);
 const [form,setForm]=useState({summary:'',incidents:'',suggestions:''}),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setFailure('');try{await api.post(path,form);reload();}catch(e){setFailure(errorMessage(e));}finally{setBusy(false);}}
 return <section className="guide-report"><h3>Báo cáo sau chuyến đi</h3>{failure&&<p role="alert">{failure}</p>}{loading?<p>Đang tải…</p>:error?<p role="alert">{error} <button onClick={reload}>Thử lại</button></p>:data?.length?<div><p>Đã gửi · {data[0].status==='REVIEWED'?'Admin đã xem xét':'Chờ admin xem xét'}</p><p className="trip-note">{data[0].summary}</p><p className="trip-note">{data[0].incidents}</p><p className="trip-note">{data[0].suggestions}</p>{data[0].admin_note&&<p>Phản hồi: {data[0].admin_note}</p>}</div>:<form onSubmit={submit}><p>Chỉ hướng dẫn viên gửi và admin được xem. Không ghi tên, bệnh án hoặc thông tin nhạy cảm của hành khách; liên hệ riêng khi cần xử lý sự cố.</p>{[['summary','Tình hình đoàn',4000],['incidents','Sự cố (ghi “Không có” nếu không phát sinh)',4000],['suggestions','Đề xuất cải thiện',2000]].map(([key,title,max])=><label className="field" key={key}>{title}<textarea required maxLength={max} value={form[key]} disabled={busy} onChange={e=>setForm(old=>({...old,[key]:e.target.value}))}/></label>)}<button className="btn" disabled={busy||Object.values(form).some(v=>!v.trim())}>Gửi báo cáo</button></form>}</section>;
}
