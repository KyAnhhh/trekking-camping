import { useCallback, useState } from 'react';
import api from '../../api/axiosClient';
import useResource from '../../hooks/useResource';
import { errorMessage } from '../../utils/tour';
export default function EmailPreference(){
 const load=useCallback(async()=>(await api.get('/api/notifications/preferences')).data.data,[]);
 const {data,loading,error,reload}=useResource(load);const [busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 async function change(value){setBusy(true);setFailure('');try{await api.put('/api/notifications/preferences',{emailEnabled:value});reload();}catch(e){setFailure(errorMessage(e));}finally{setBusy(false);}}
 return <section className="panel"><h2>Tùy chọn email thông báo</h2>{loading?<p>Đang tải…</p>:error?<p role="alert">{error} <button onClick={reload}>Thử lại</button></p>:<label><input type="checkbox" checked={!!data?.emailEnabled} disabled={busy} onChange={e=>change(e.target.checked)}/> Nhận email cập nhật chuyến đi và nhắc chuẩn bị</label>}
 <p className="small muted">Thông báo trong website vẫn được giữ. Email chỉ được gửi khi quản trị đã cấu hình dịch vụ; tùy chọn này không tắt email khôi phục mật khẩu.</p>{failure&&<p role="alert">{failure}</p>}</section>;
}
