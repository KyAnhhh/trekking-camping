import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../../context/CompareContext';
import CompareButton from '../../components/tour/CompareButton';
import { tourApi } from '../../api/tourService';
import { dateLabel, formatDifficulty, isBookable, money } from '../../utils/tour';

const missing = 'Chưa cập nhật';
const shown = (v, unit = '') => v == null || v === '' ? missing : `${v}${unit ? ' ' + unit : ''}`;
const simulated = tour => /mô phỏng|kiểm thử|synthetic|simulation/i.test([tour.title, tour.summary, tour.adventureProfile?.sourceNote].filter(Boolean).join(' '));
const rows = [
  ['Địa điểm', t => shown(t.location)],
  ['Giá tham khảo / người', t => t.pricePerPax == null ? missing : money(t.pricePerPax)],
  ['Thời lượng', t => t.durationDays == null || t.durationNights == null ? missing : `${t.durationDays} ngày ${t.durationNights} đêm`],
  ['Độ khó', t => formatDifficulty(t.difficultyLevel)],
  ['Quãng đường', t => shown(t.adventureProfile?.distanceKm, 'km')],
  ['Độ cao cao nhất', t => shown(t.adventureProfile?.maxAltitudeM, 'm')],
  ['Tổng leo lên', t => shown(t.adventureProfile?.totalAscentM, 'm')],
  ['Vận động mỗi ngày', t => shown(t.adventureProfile?.activeHoursPerDay, 'giờ')],
  ['Tiếp cận y tế (ước tính)', t => shown(t.adventureProfile?.medicalAccessHours, 'giờ')],
  ['Lưu ý tiếp cận y tế', t => shown(t.adventureProfile?.medicalAccessNotes)],
  ['Yêu cầu tham gia', t => shown(t.adventureProfile?.participationRequirements)],
  ['Trang bị cần chuẩn bị', t => shown(t.requiredGear)],
  ['Nguồn thông số', t => shown(t.adventureProfile?.sourceNote)],
];

export default function TourCompare() {
  const { selected, remove } = useCompare();
  const [state, setState] = useState({}), [retry, setRetry] = useState(0);
  const selectionKey = JSON.stringify(selected.map(row => row.slug));
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    const slugs = JSON.parse(selectionKey);
    if (slugs.length < 2) return () => controller.abort();
    slugs.forEach(async slug => {
      try {
        const tour = (await tourApi.getTourBySlug(slug, controller.signal)).data.data;
        if (!tour || tour.isActive === false) throw new Error('unavailable');
        let schedules = [], scheduleError = false;
        try { schedules = (await tourApi.getSchedules(tour.id, controller.signal)).data.data; }
        catch { scheduleError = true; }
        if (!controller.signal.aborted) setState(current => ({ ...current, [slug]: { tour, schedules, scheduleError } }));
      } catch (e) {
        if (!controller.signal.aborted) setState(current => ({ ...current, [slug]: { error: e.response?.status === 404 || e.message === 'unavailable' ? 'Tour không còn công khai hoặc không tồn tại.' : 'Không tải được tour. Vui lòng thử lại.' } }));
      }
    });
    return () => controller.abort();
  }, [selectionKey, retry]);
  return <section className="container comparison-page">
    <p className="eyebrow">CHỌN HÀNH TRÌNH PHÙ HỢP</p><h1>So sánh tour</h1>
    <p>Đặt 2–3 hành trình cạnh nhau để cân nhắc thời gian, chi phí và yêu cầu tham gia.</p>
    <Link className="text-link" to="/tours">Chọn thêm hoặc đổi tour →</Link>
    {selected.length < 2 ? <p role="status">Chọn ít nhất 2 tour bằng nút “So sánh” trên thẻ tour hoặc trang yêu thích.</p> : <>
      <p className="muted">Trên điện thoại, vuốt ngang trong bảng để xem các tour. Giá và chỗ trống sẽ được kiểm tra lại khi đặt.</p>
      <button type="button" className="compare-toggle" onClick={() => setRetry(n => n + 1)}>Tải lại dữ liệu</button>
      <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Bảng so sánh tour, có thể cuộn ngang">
        <table className="comparison-table"><caption className="sr-only">Thông tin các tour đang so sánh</caption><thead><tr><th scope="col">Tiêu chí</th>
          {selected.map(row => <th scope="col" key={row.slug}><h2>{state[row.slug]?.tour?.title || row.title}</h2>
            {state[row.slug]?.tour && simulated(state[row.slug].tour) && <span className="compare-simulation">Có dữ liệu mô phỏng — không dùng để xác nhận điều kiện thực địa</span>}
            <CompareButton tour={row} />
            {!state[row.slug] ? <p role="status">Đang tải…</p> : state[row.slug].error ? <p role="alert">{state[row.slug].error} <button type="button" onClick={() => remove(row.slug)}>Bỏ tour</button></p> : null}
          </th>)}</tr></thead><tbody>
          {rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{selected.map(row => <td key={row.slug}>{state[row.slug]?.tour ? value(state[row.slug].tour) : '—'}</td>)}</tr>)}
          <tr><th scope="row">Lịch đang nhận khách</th>{selected.map(row => {
            const entry = state[row.slug];
            const open = (entry?.schedules || []).filter(isBookable).sort((a,b) => a.departureDate.localeCompare(b.departureDate));
            return <td key={row.slug}>{!entry?.tour ? '—' : entry.scheduleError ? <span>Không tải được lịch. Hãy thử tải lại dữ liệu.</span> : !open.length ? 'Chưa có lịch đang nhận khách.' : <ul className="comparison-schedules">{open.slice(0,3).map(s => <li key={s.id}>{dateLabel(s.departureDate)} · Còn {s.availableSlots} chỗ<br /><Link to={`/tours/${encodeURIComponent(row.slug)}/booking?schedule=${s.id}`}>Đặt lịch này</Link></li>)}{open.length > 3 && <li>Xem thêm lịch trong chi tiết tour.</li>}</ul>}</td>;
          })}</tr>
          <tr><th scope="row">Khám phá thêm</th>{selected.map(row => <td key={row.slug}>{state[row.slug]?.tour && <Link to={`/tours/${encodeURIComponent(row.slug)}`}>Xem chi tiết tour →</Link>}</td>)}</tr>
        </tbody></table>
      </div>
      <p className="muted">Chỉ số lớn hơn không có nghĩa tour phù hợp hơn. Bảng so sánh không xác nhận sức khỏe đủ điều kiện tham gia.</p>
    </>}
  </section>;
}
