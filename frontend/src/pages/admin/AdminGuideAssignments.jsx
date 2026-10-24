import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosClient';
import useResource from '../../hooks/useResource';
import GuideAssignment from '../../components/tour/GuideAssignment';
import AdminPager from '../../components/common/AdminPager';
import { dateLabel,errorMessage } from '../../utils/tour';
export default function AdminGuideAssignments(){
 const [page,setPage]=useState(0),[selected,setSelected]=useState(null),[history,setHistory]=useState(null),[historyError,setHistoryError]=useState('');
 const loader=useCallback(async()=> (await api.get('/api/admin/guide-assignments',{params:{page}})).data.data,[page]);
 const {data,loading,error,reload}=useResource(loader);
 const showHistory=async id=>{setHistory(null);setHistoryError('');try{setHistory({id,rows:(await api.get(`/api/admin/guide-assignments/${id}/history`)).data.data});}catch(e){setHistoryError(errorMessage(e));}};
 return <section><header className="admin-page-heading"><div><h1>Phân công hướng dẫn viên</h1><p>Lịch sắp khởi hành, phản hồi và lịch sử thay đổi.</p></div><button className="btn" onClick={reload} disabled={loading}>Tải lại</button></header>
 {loading?<p role="status">Đang tải…</p>:error?<p role="alert">{error}</p>:<>
 {!data?.items.length&&<p>Không có lịch sắp khởi hành.</p>}
 <div className="workspace-grid">{data?.items.map(row=><article className="panel" key={row.id}><h2>{row.title}</h2><p>{dateLabel(row.departure_date)} – {dateLabel(row.return_date)}</p>
  <p>{Number(row.assigned)===0?'Chưa phân công':`${row.accepted} đã nhận/chuyển tiếp · ${row.pending} chờ · ${row.declined} từ chối`}</p>
  {Number(row.confirmed_leads)===0&&<p className="notice">Chưa có trưởng đoàn đã nhận lịch.</p>}{Number(row.unlinked)>0&&<p className="notice">{row.unlinked} hồ sơ chưa có tài khoản hướng dẫn viên hoạt động. <Link to="/admin/guides">Liên kết tài khoản</Link></p>}
  <button className="btn" onClick={()=>setSelected({id:row.id,departureDate:row.departure_date,returnDate:row.return_date})}>Phân công</button>{' '}<button className="btn btn-outline" onClick={()=>showHistory(row.id)}>Lịch sử</button>
 </article>)}</div><AdminPager data={data} busy={loading} onPage={setPage} /></>}
 {historyError&&<p role="alert">{historyError}</p>}{history&&<section className="panel"><h2>Lịch sử lịch #{history.id}</h2><button onClick={()=>setHistory(null)}>Đóng lịch sử</button>{!history.rows.length?<p>Chưa ghi nhận thay đổi mới; lịch sử cũ không được tạo giả.</p>:<ul>{history.rows.map((row,i)=><li key={i}>{new Date(row.created_at).toLocaleString('vi-VN')} · {row.actor} · Guide #{row.guide_id} · {row.action}<p>{row.reason}</p></li>)}</ul>}</section>}
 {selected&&<GuideAssignment schedule={selected} onClose={()=>setSelected(null)} onSaved={()=>{setSelected(null);setHistory(null);reload();}}/>}
 </section>;
}
