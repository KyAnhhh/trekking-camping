import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import './admin-ai.css';

export default function AdminAiModels() {
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [tab, setTab] = useState('models');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const [c, h, m] = await Promise.all([
      axiosClient.get('/api/admin/ai-models'),
      axiosClient.get('/api/admin/ai-models/history'),
      axiosClient.get('/api/admin/ai-models/metrics'),
    ]);
    setConfig(c.data.data);
    setHistory(h.data.data);
    setMetrics(m.data.data);
  }

  useEffect(() => {
    let active = true;
    load().catch((e) => {
      if (active) setError(e.response?.data?.message || 'Không tải được cấu hình AI.');
    });
    return () => { active = false; };
  }, []);

  async function act(operation) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      await load();
      setNotice('Đã lưu phiên bản cấu hình và đồng bộ cơ sở dữ liệu.');
    } catch (e) {
      setError(e.response?.data?.message || 'Không lưu được cấu hình.');
    } finally {
      setBusy(false);
    }
  }

  function edit(id, field, value) {
    setConfig((c) => ({
      ...c,
      settings: {
        ...c.settings,
        models: c.settings.models.map((m) =>
          m.id === id ? { ...m, [field]: value, ...(field === 'enabled' && !value ? { visible: false } : {}) } : m
        ),
      },
    }));
  }

  // Calculate high-level AI usage metrics
  const totalCalls = Object.values(metrics?.models || {}).reduce((sum, u) => sum + (u?.calls || 0), 0);
  const totalFailures = Object.values(metrics?.models || {}).reduce((sum, u) => sum + (u?.failures || 0), 0);
  const totalDuration = Object.values(metrics?.models || {}).reduce((sum, u) => sum + (u?.totalMillis || 0), 0);
  const avgDuration = totalCalls ? Math.round(totalDuration / totalCalls) : 0;
  const successRate = totalCalls ? Math.round(((totalCalls - totalFailures) / totalCalls) * 100) : 100;

  return (
    <section className="ai-admin">
      <header>
        <p className="eyebrow">VẬN HÀNH TRỢ LÝ</p>
        <h1>Quản trị model AI</h1>
        <p>Khách chọn model để tư vấn và lập lịch trình. Toàn bộ hoạt động, độ trễ và tỷ lệ phản hồi của từng model được lưu trữ trực tiếp vào cơ sở dữ liệu.</p>
      </header>

      <nav className="ai-tabs" aria-label="Quản trị AI">
        {[
          ['models', 'Danh sách model'],
          ['activity', 'Hoạt động & phiên bản lưu trữ'],
        ].map(([id, title]) => (
          <button
            className={tab === id ? 'btn' : 'btn btn-outline'}
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
          >
            {title}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="notice">{error}</p>}
      {notice && <p role="status" className="notice" style={{ background: '#eaf4ee', color: '#163d2c', borderColor: '#b6dbbe' }}>{notice}</p>}

      {!config ? (
        <button className="btn" onClick={() => act(load)} disabled={busy}>Tải lại cấu hình</button>
      ) : (
        <>
          <fieldset disabled={busy}>
            {tab === 'models' && (
              <div className="ai-model-grid">
                {config.settings.models.map((m) => (
                  <article key={m.id} className="ai-model-card">
                    <span className="eyebrow">GOOGLE · GEMINI API</span>
                    <h2>{m.label}</h2>
                    <code>{m.id}</code>
                    <label>
                      Tên hiển thị
                      <input maxLength={80} value={m.label} onChange={(e) => edit(m.id, 'label', e.target.value)} />
                    </label>
                    <label>
                      <input type="checkbox" checked={m.verified} onChange={(e) => edit(m.id, 'verified', e.target.checked)} />
                      Quản trị viên xác nhận đã kiểm thử tương thích
                    </label>
                    <label>
                      <input type="checkbox" checked={m.enabled} onChange={(e) => edit(m.id, 'enabled', e.target.checked)} />
                      Bật model
                    </label>
                    <label>
                      <input type="checkbox" checked={m.visible} disabled={!m.enabled} onChange={(e) => edit(m.id, 'visible', e.target.checked)} />
                      Cho khách chọn
                    </label>
                    <p className="muted">Hỗ trợ dự kiến: tư vấn có nguồn, tìm tour qua công cụ, lập lịch trình. Xác nhận này do admin nhập, không phải kết quả kiểm tra tự động.</p>
                  </article>
                ))}
              </div>
            )}
            {tab === 'models' && (
              <p className="muted" style={{ marginTop: '1rem' }}>Mọi model công khai đều có thể được khách chọn cho chat và lập lịch trình. Kho tri thức dùng chung; embedding local giữ nguyên.</p>
            )}
          </fieldset>

          {tab === 'models' && (
            <div className="ai-actions">
              <button className="btn" disabled={busy} onClick={() => act(() => axiosClient.put('/api/admin/ai-models', config))}>
                Lưu cấu hình · phiên bản {config.revision}
              </button>
              <button className="btn btn-outline" disabled={busy} onClick={() => act(load)}>Tải lại</button>
            </div>
          )}

          {tab === 'activity' && (
            <>
              {/* High level KPI Overview */}
              <div className="ai-kpi-grid">
                <div className="ai-kpi-card">
                  <span>Tổng lượt gọi AI</span>
                  <strong>{totalCalls.toLocaleString('vi-VN')}</strong>
                </div>
                <div className="ai-kpi-card">
                  <span>Tỷ lệ thành công</span>
                  <strong style={{ color: successRate >= 95 ? '#19733e' : '#b88232' }}>{successRate}%</strong>
                </div>
                <div className="ai-kpi-card">
                  <span>Thời gian phản hồi TB</span>
                  <strong>{avgDuration} <small style={{ fontSize: '0.9rem', fontWeight: 400 }}>ms</small></strong>
                </div>
                <div className="ai-kpi-card">
                  <span>Lượt lỗi / gián đoạn</span>
                  <strong style={{ color: totalFailures > 0 ? '#c5221f' : '#19733e' }}>{totalFailures}</strong>
                </div>
              </div>

              <p className="muted" style={{ marginBottom: '1.25rem' }}>
                {metrics?.scope || 'Hoạt động ghi nhận thời gian thực và lưu trữ bền vững trong cơ sở dữ liệu.'}
              </p>

              {/* Per-model metrics cards */}
              <div className="ai-model-grid">
                {config.settings.models.map((m) => {
                  const u = metrics?.models?.[m.id];
                  const calls = u?.calls || 0;
                  const failures = u?.failures || 0;
                  const avg = calls ? Math.round(u.totalMillis / calls) : 0;
                  return (
                    <article key={m.id} className="ai-model-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h2 style={{ fontSize: '1.15rem', margin: 0 }}>{m.label}</h2>
                        <span className={`ai-badge ${m.enabled ? 'ai-badge-success' : 'ai-badge-failed'}`}>
                          {m.enabled ? 'Đang bật' : 'Tạm tắt'}
                        </span>
                      </div>
                      <code style={{ marginBottom: '12px' }}>{m.id}</code>

                      <div className="ai-stat-row">
                        <span>Lượt gọi thành công:</span>
                        <strong>{(calls - failures).toLocaleString('vi-VN')} / {calls.toLocaleString('vi-VN')}</strong>
                      </div>
                      <div className="ai-stat-row">
                        <span>Thời gian phản hồi TB:</span>
                        <strong>{calls ? `${avg} ms` : 'Chưa có dữ liệu'}</strong>
                      </div>
                      <div className="ai-stat-row">
                        <span>Lỗi gần nhất:</span>
                        <strong style={{ color: u?.lastError ? '#c5221f' : '#647168' }}>{u?.lastError || 'Không có'}</strong>
                      </div>
                      <div className="ai-stat-row">
                        <span>Lần gọi gần nhất:</span>
                        <strong style={{ fontSize: '0.8rem' }}>{u?.lastCall ? new Date(u.lastCall).toLocaleString('vi-VN') : 'Chưa có'}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Detailed Activity Log Table */}
              <div className="ai-activity-section">
                <div className="ai-activity-header">
                  <div>
                    <h2>Nhật ký hoạt động từng Model (Thời gian thực)</h2>
                    <p className="muted" style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Toàn bộ yêu cầu xử lý từ khách và admin được ghi nhận vào bảng <code>ai_model_activities</code>
                    </p>
                  </div>
                  <button className="btn btn-small btn-outline" disabled={busy} onClick={() => act(load)}>
                    Làm mới hoạt động
                  </button>
                </div>

                {metrics?.activities && metrics.activities.length > 0 ? (
                  <div className="ai-activity-table-wrap">
                    <table className="ai-activity-table">
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Model</th>
                          <th>Loại thao tác</th>
                          <th>Thời gian xử lý</th>
                          <th>Trạng thái</th>
                          <th>Mã / Chi tiết lỗi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.activities.map((actItem) => (
                          <tr key={actItem.id}>
                            <td style={{ color: '#647168' }}>
                              {new Date(actItem.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td>
                              <span className="ai-badge ai-badge-model">{actItem.modelId}</span>
                            </td>
                            <td>
                              {actItem.actionType === 'STREAM_CHAT' ? 'Tư vấn trực tiếp (SSE)' :
                               actItem.actionType === 'CHAT_QUERY' ? 'Truy vấn RAG' : actItem.actionType}
                            </td>
                            <td>
                              <strong>{actItem.durationMs.toLocaleString('vi-VN')} ms</strong>
                            </td>
                            <td>
                              <span className={`ai-badge ${actItem.status === 'SUCCESS' ? 'ai-badge-success' : 'ai-badge-failed'}`}>
                                {actItem.status === 'SUCCESS' ? '✓ Thành công' : '✕ Thất bại'}
                              </span>
                            </td>
                            <td style={{ color: actItem.errorCode ? '#c5221f' : '#647168' }}>
                              {actItem.errorCode || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted" style={{ padding: '16px 0', textAlign: 'center' }}>
                    Chưa ghi nhận nhật ký nào. Hãy gửi câu hỏi trên Chatbot AI để kiểm tra ghi nhận hoạt động tự động!
                  </p>
                )}
              </div>

              {/* Configuration History Section */}
              <div style={{ marginTop: '28px' }}>
                <h2>Lịch sử phiên bản cấu hình</h2>
                {!history.length && <p className="muted">Chưa có thay đổi được lưu.</p>}
                {history.map((h) => (
                  <div className="ai-audit" key={h.revision}>
                    <span>Phiên bản {h.revision} · {h.changedBy} · {new Date(h.changedAt).toLocaleString('vi-VN')}</span>
                    <button
                      className="btn btn-small btn-outline"
                      disabled={busy || h.revision === config.revision}
                      onClick={() => {
                        if (window.confirm(`Khôi phục cấu hình phiên bản ${h.revision}?`)) {
                          act(() =>
                            axiosClient.post(`/api/admin/ai-models/history/${h.revision}/restore`, {
                              expectedRevision: config.revision,
                            })
                          );
                        }
                      }}
                    >
                      Khôi phục
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
