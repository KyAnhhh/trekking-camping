import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axiosClient';
import useResource from '../../hooks/useResource';
import { errorMessage, mediaUrl } from '../../utils/tour';
import './trip-experience.css';
function PrivateImage({url}){
 const [src,setSrc]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true,objectUrl;const controller=new AbortController();setSrc('');setFailed(false);api.get(url,{responseType:'blob',signal:controller.signal}).then(r=>{if(active){objectUrl=URL.createObjectURL(r.data);setSrc(objectUrl);}}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};},[url]);
 return src?<img src={src} alt="Ảnh đánh giá chuyến đi"/>:<span role="status">{failed?'Không tải được ảnh':'Đang tải ảnh…'}</span>;
}
export default function ReviewPhotos({reviewId,mode='public'}){
 const path=mode==='admin'?`/api/admin/reviews/${reviewId}/photos`:mode==='owner'?`/api/me/reviews/${reviewId}/photos`:`/api/reviews/${reviewId}/photos`;
 const load=useCallback(async()=>(await api.get(path)).data.data,[path]);const {data,loading,error,reload}=useResource(load);
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 async function act(fn){if(busy)return;setBusy(true);setFailure('');try{await fn();reload();}catch(e){setFailure(errorMessage(e));}finally{setBusy(false);}}
 function upload(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>5*1024*1024||!['image/jpeg','image/png'].includes(file.type)){setFailure('Chọn ảnh JPEG/PNG tối đa 5 MB.');return;}const form=new FormData();form.append('file',file);act(()=>api.post(path,form,{headers:{'Content-Type':'multipart/form-data'}}));}
 return <section aria-label="Ảnh đánh giá">{loading?<p>Đang tải ảnh…</p>:error?<p role="alert">{error} <button onClick={reload}>Thử lại</button></p>:<>
 <div className="review-photo-grid">{data?.map(photo=><figure key={photo.id}>{mode==='public'?<img loading="lazy" src={mediaUrl(photo.url)} alt="Ảnh do khách đã đi tour chia sẻ"/>:<PrivateImage url={photo.url}/>}{mode!=='public'&&<figcaption>{photo.approved?'Đã duyệt ảnh':'Ảnh đang ẩn / chờ duyệt'}{mode==='admin'?<button className="text-btn" disabled={busy} onClick={()=>act(()=>api.put(`${path}/${photo.id}`,{approved:!photo.approved}))}>{photo.approved?'Ẩn ảnh':'Duyệt ảnh'}</button>:<button className="text-btn" disabled={busy} onClick={()=>act(()=>api.delete(`${path}/${photo.id}`))}>Xóa ảnh</button>}</figcaption>}</figure>)}</div>
 {mode==='owner'&&<label className="field">Thêm ảnh chuyến đi (tối đa 5 ảnh, JPEG/PNG ≤5 MB/ảnh)<input type="file" accept="image/jpeg,image/png" disabled={busy||data?.length>=5} onChange={upload}/><small>Chỉ upload ảnh bạn có quyền chia sẻ. Ảnh chỉ công khai sau khi admin duyệt.</small></label>}
 </>}{failure&&<p role="alert">{failure}</p>}</section>;
}
