import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosClient';
import CompareButton from '../../components/tour/CompareButton';
import { todayInVietnam, dateLabel, money, formatDifficulty, isBookable, errorMessage } from '../../utils/tour';
import '../../styles/departures.css';

const monthRange = month => {
  const [y,m] = month.split('-').map(Number);
  return { from: month+'-01', to: month+'-'+new Date(Date.UTC(y,m,0)).getUTCDate() };
};
const initial = () => ({ ...monthRange(todayInVietnam().slice(0,7)), location:'', difficulty:'', people:1, availableOnly:true });
function availability(row, people) {
  if(row.status==='CANCELLED') return 'Đã hủy';
  if(row.status==='CLOSED') return 'Đã đóng';
  if(row.departureDate<=todayInVietnam()) return 'Đã đến ngày khởi hành';
  if(row.status==='FULL'||row.availableSlots===0) return 'Hết chỗ';
  if(row.status!=='OPEN'||row.availableSlots==null) return 'Chưa nhận khách';
  return row.availableSlots<people ? 'Không đủ chỗ cho nhóm' : `Còn ${row.availableSlots} chỗ`;
}
export default function Departures() {
  const [draft,setDraft]=useState(initial),[filters,setFilters]=useState(initial);
  const [view,setView]=useState('list'),[month,setMonth]=useState(()=>todayInVietnam().slice(0,7));
  const [result,setResult]=useState(null),[error,setError]=useState(''),[formError,setFormError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setResult(null);setError('');
    api.get('/api/tours/departures',{params:{...filters,difficulty:filters.difficulty||undefined},signal:controller.signal,timeout:15000})
      .then(({data})=>{if(!controller.signal.aborted)setResult(data.data);})
      .catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e));});
    return ()=>controller.abort();
  },[filters,retry]);
  const update=e=>setDraft(v=>({...v,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const submit=e=>{
    e.preventDefault();const days=(Date.parse(draft.to)-Date.parse(draft.from))/86400000;
    if(!Number.isFinite(days)||days<0||days>92){setFormError('Chọn khoảng ngày hợp lệ, tối đa 93 ngày.');return;}
    setFormError('');setFilters({...draft,people:Number(draft.people)});setView('list');
  };
  const chooseMonth=value=>{
    if(!/^\d{4}-\d{2}$/.test(value))return;
    setMonth(value);const next={...draft,...monthRange(value)};setDraft(next);setFilters({...next,people:Number(next.people)||1});setFormError('');
  };
  const items=result?.items||[];
  const [year,mon]=month.split('-').map(Number);
  const offset=(new Date(Date.UTC(year,mon-1,1)).getUTCDay()+6)%7;
  const days=new Date(Date.UTC(year,mon,0)).getUTCDate();
  const renderTrip=row=>{
    const bookable=isBookable(row)&&row.availableSlots>=filters.people;
    return <article className="departure-card" key={row.id}>
      <p className="eyebrow">{dateLabel(row.departureDate)} → {dateLabel(row.returnDate)}</p>
      <h2><Link to={`/tours/${encodeURIComponent(row.tour.slug)}`}>{row.tour.title}</Link></h2>
      {row.simulated&&<p className="departure-demo">MÔ PHỎNG ĐỒ ÁN · Không phải lịch mở bán thật</p>}
      <p>{row.tour.location||'Địa điểm chưa cập nhật'} · {formatDifficulty(row.tour.difficultyLevel)}</p>
      <p><strong>{money(row.tour.pricePerPax)}</strong> / người · Giá tham khảo</p>
      <p className={bookable?'departure-open':'muted'}>{availability(row,filters.people)}</p>
      <div className="departure-actions"><CompareButton tour={row.tour}/>
        {bookable ? <Link className="btn" to={`/tours/${encodeURIComponent(row.tour.slug)}/booking?schedule=${row.id}&people=${filters.people}`}>Chọn lịch này</Link>
          : <Link className="text-link" to={`/tours/${encodeURIComponent(row.tour.slug)}`}>Xem tour</Link>}
      </div>
    </article>;
  };
  return <section className="container departures-page">
    <p className="eyebrow">CHỌN THỜI ĐIỂM LÊN ĐƯỜNG</p><h1>Lịch khởi hành</h1>
    <p>Tìm lịch phù hợp với ngày rảnh và số thành viên. Ngày được tính theo giờ Việt Nam; chỗ trống sẽ được kiểm tra lại khi đặt.</p>
    <form className="departure-filters" onSubmit={submit}>
      <label>Từ ngày<input type="date" name="from" required value={draft.from} onChange={update}/></label>
      <label>Đến ngày<input type="date" name="to" required value={draft.to} onChange={update}/></label>
      <label>Địa điểm<input name="location" maxLength={100} placeholder="Ví dụ: Lâm Đồng" value={draft.location} onChange={update}/></label>
      <label>Độ khó<select name="difficulty" value={draft.difficulty} onChange={update}><option value="">Tất cả</option><option value="1">Dễ</option><option value="2">Trung bình</option><option value="3">Mạo hiểm</option></select></label>
      <label>Số người<input type="number" min="1" max="1000" required name="people" value={draft.people} onChange={update}/></label>
      <label className="departure-check"><input type="checkbox" name="availableOnly" checked={draft.availableOnly} onChange={update}/>Chỉ lịch còn đủ chỗ</label>
      <button className="btn" type="submit">Tìm lịch</button>
    </form>
    {formError&&<p role="alert">{formError}</p>}
    <div className="departure-toolbar"><div role="group" aria-label="Chế độ xem">
      <button className="compare-toggle" aria-pressed={view==='list'} onClick={()=>setView('list')}>Danh sách</button>
      <button className="compare-toggle" aria-pressed={view==='calendar'} onClick={()=>{setView('calendar');chooseMonth(month);}}>Lịch tháng</button>
    </div>{view==='calendar'&&<label>Chọn tháng <input aria-label="Tháng khởi hành" type="month" value={month} onChange={e=>chooseMonth(e.target.value)}/></label>}</div>
    {error?<div role="alert"><p>{error}</p><button className="btn" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></div>
      :!result?<p role="status">Đang tải lịch khởi hành…</p>:<>
        <p role="status">{items.length} lịch phù hợp{result.truncated?' (giới hạn 500 lịch; hãy thu hẹp khoảng ngày)':''}</p>
        {view==='list'? items.length?<div className="departures-grid">{items.map(renderTrip)}</div>:<p>Chưa có lịch phù hợp. Hãy đổi ngày, địa điểm hoặc số người.</p>
          :<div className="departure-calendar-scroll" tabIndex={0} role="region" aria-label="Lịch tháng, cuộn ngang trên điện thoại">
            <div className="departure-calendar">
              {['T2','T3','T4','T5','T6','T7','CN'].map(day=><strong className="departure-weekday" key={day}>{day}</strong>)}
              {Array.from({length:offset},(_,i)=><div key={'blank'+i} aria-hidden="true"/>)}
              {Array.from({length:days},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0');const rows=items.filter(r=>r.departureDate===date);return <div className="departure-day" key={date}><strong>{i+1}</strong>{rows.map(row=><a key={row.id} href={'#departure-'+row.id}>{row.simulated?'[Mô phỏng] ':''}{row.tour.title}<small>{availability(row,filters.people)}</small></a>)}</div>;})}
            </div>
          </div>}
        {view==='calendar'&&<div className="departures-grid">{items.map(row=><div id={'departure-'+row.id} key={row.id}>{renderTrip(row)}</div>)}</div>}
      </>}
  </section>;
}
