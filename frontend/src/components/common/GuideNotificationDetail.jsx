import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosClient';
import useResource from '../../hooks/useResource';

const actions = { ACCEPTED: 'Đã nhận đoàn', DECLINED: 'Từ chối', ASSIGNED: 'Được phân công', REMOVED: 'Gỡ phân công' };

export default function GuideNotificationDetail({ scheduleId }) {
  const load = useCallback(async () => (await api.get(`/api/admin/guide-assignments/${scheduleId}/history`)).data.data, [scheduleId]);
  const { data, loading, error, reload } = useResource(load);
  return <section className="notification-detail" aria-label={`Chi tiết phân công lịch #${scheduleId}`}>
    <h3>Lịch sử phân công lịch #{scheduleId}</h3>
    <p className="muted">Các sự kiện mới nhất của lịch, có thể bao gồm phản hồi sau thông báo này.</p>
    {loading ? <p role="status">Đang tải phản hồi…</p> : error ? <div role="alert"><p>{error}</p><button className="btn btn-outline btn-small" onClick={reload}>Thử lại</button></div> : !data?.length ? <p>Chưa có lịch sử được lưu cho lịch này.</p> : <ol className="notification-history">
      {data.map((row, index) => <li key={index}>
        <strong>{actions[row.action] || row.action} · Hướng dẫn viên #{row.guide_id}</strong>
        <p className="muted">{new Date(row.created_at).toLocaleString('vi-VN')} · {row.actor}</p>
        <p className="notification-reason"><strong>Lý do / ghi chú: </strong>{row.reason || 'Không có ghi chú.'}</p>
      </li>)}
    </ol>}
    <Link className="btn btn-outline btn-small" to="/admin/guide-assignments">Quản lý phân công →</Link>
  </section>;
}
