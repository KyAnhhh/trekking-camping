import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import './admin-ai.css';

export default function AdminAiModels() {
  const [config, setConfig] = useState(null), [history, setHistory] = useState([]), [metrics, setMetrics] = useState(null);
  const [tab, setTab] = useState('models'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function load() {
    const [c, h, m] = await Promise.all(['/api/admin/ai-models', '/api/admin/ai-models/history', '/api/admin/ai-models/metrics'].map(url => axiosClient.get(url)));
    setConfig(c.data.data); setHistory(h.data.data); setMetrics(m.data.data);
  }
  useEffect(() => { let active = true; load().catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được cấu hình AI.'); }); return () => { active = false; }; }, []);
  async function act(operation) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await operation(); await load(); setNotice('Đã lưu phiên bản cấu hình. Các lượt đang chạy giữ nguyên model.'); }
    catch (e) { setError(e.response?.data?.message || 'Không lưu được cấu hình.'); }
    finally { setBusy(false); }
  }
  function edit(id, field, value) {
    setConfig(c => ({ ...c, settings: { ...c.settings, models: c.settings.models.map(m => m.id === id ? { ...m, [field]: value, ...(field === 'enabled' && !value ? { visible: false } : {}) } : m) } }));
  }
  return <section className="ai-admin">
    <header><p className="eyebrow">VẬN HÀNH TRỢ LÝ</p><h1>Quản trị model AI</h1><p>Khách chọn model để tư vấn và lập lịch trình. Quản lý model được phép sử dụng và theo dõi lỗi. API key luôn nằm ở server.</p></header>
    <nav className="ai-tabs" aria-label="Quản trị AI">{[['models', 'Danh sách model'], ['activity', 'Hoạt động & phiên bản']].map(([id, title]) => <button className={tab === id ? 'btn' : 'btn btn-outline'} key={id} onClick={() => setTab(id)} aria-pressed={tab === id}>{title}</button>)}</nav>
    {error && <p role="alert" className="notice">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!config ? <button className="btn" onClick={() => act(load)} disabled={busy}>Tải lại cấu hình</button> : <>
      <fieldset disabled={busy}>
      {tab === 'models' && <div className="ai-model-grid">{config.settings.models.map(m => <article key={m.id} className="ai-model-card">
        <span className="eyebrow">GOOGLE · GEMINI API</span><h2>{m.label}</h2><code>{m.id}</code>
        <label>Tên hiển thị<input maxLength={80} value={m.label} onChange={e => edit(m.id, 'label', e.target.value)} /></label>
        <label><input type="checkbox" checked={m.verified} onChange={e => edit(m.id, 'verified', e.target.checked)} /> Quản trị viên xác nhận đã kiểm thử tương thích</label>
        <label><input type="checkbox" checked={m.enabled} onChange={e => edit(m.id, 'enabled', e.target.checked)} /> Bật model</label>
        <label><input type="checkbox" checked={m.visible} disabled={!m.enabled} onChange={e => edit(m.id, 'visible', e.target.checked)} /> Cho khách chọn</label>
        <p className="muted">Hỗ trợ dự kiến: tư vấn có nguồn, tìm tour qua công cụ, lập lịch trình. Xác nhận này do admin nhập, không phải kết quả kiểm tra tự động.</p>
      </article>)}</div>}
      <p className="muted">Mọi model công khai đều có thể được khách chọn cho chat và lập lịch trình. Kho tri thức dùng chung; embedding local giữ nguyên.</p>
      </fieldset>
      {tab !== 'activity' && <div className="ai-actions"><button className="btn" disabled={busy} onClick={() => act(() => axiosClient.put('/api/admin/ai-models', config))}>Lưu cấu hình · phiên bản {config.revision}</button><button className="btn btn-outline" disabled={busy} onClick={() => act(load)}>Tải lại</button></div>}
      {tab === 'activity' && <>
        <p>{metrics?.scope}. Không hiển thị nội dung hội thoại hoặc secret.</p>
        <div className="ai-model-grid">{config.settings.models.map(m => { const u = metrics?.models?.[m.id]; return <article key={m.id} className="ai-model-card"><h2>{m.label}</h2><p>{u?.calls || 0} lượt · {u?.failures || 0} lỗi</p><p>Trung bình: {u?.calls ? Math.round(u.totalMillis / u.calls) + ' ms' : 'Chưa có dữ liệu'}</p><p>Lỗi lượt gần nhất: {u?.lastError || '—'}</p><p>Lần gọi gần nhất: {u?.lastCall ? new Date(u.lastCall).toLocaleString('vi-VN') : '—'}</p></article>; })}</div>
        <h2>Lịch sử cấu hình</h2>{!history.length && <p>Chưa có thay đổi được lưu.</p>}
        {history.map(h => <div className="ai-audit" key={h.revision}><span>Phiên bản {h.revision} · {h.changedBy} · {new Date(h.changedAt).toLocaleString('vi-VN')}</span><button className="btn btn-small btn-outline" disabled={busy || h.revision === config.revision} onClick={() => { if (window.confirm(`Khôi phục cấu hình phiên bản ${h.revision}?`)) act(() => axiosClient.post(`/api/admin/ai-models/history/${h.revision}/restore`, { expectedRevision: config.revision })); }}>Khôi phục</button></div>)}
        <button className="btn btn-outline" disabled={busy} onClick={() => act(load)}>Làm mới</button>
      </>}
    </>}
  </section>;
}
