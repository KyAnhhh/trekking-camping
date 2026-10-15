import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { money } from '../../utils/tour';
import '../../styles/dashboard-charts.css';

const statuses = [
  { key: 'PENDING', label: 'Chờ xác nhận', color: '#b88232' },
  { key: 'CONFIRMED', label: 'Đã xác nhận', color: '#3b8d85' },
  { key: 'COMPLETED', label: 'Hoàn thành', color: '#205744' },
  { key: 'CANCELLED', label: 'Đã hủy', color: '#9b7771' },
];
const count = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const number = (value) => value.toLocaleString('vi-VN');
const percent = (value, total) => (total ? value / total * 100 : 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';

function BookingChart({ bookings = {} }) {
  const [highlighted, setHighlighted] = useState(null);
  const rows = statuses.map(item => ({ ...item, value: count(bookings[item.key]) }));
  const other = Object.entries(bookings).reduce((sum, [key, value]) =>
    sum + (statuses.some(item => item.key === key) ? 0 : count(value)), 0);
  if (other) rows.push({ key: 'ALL', label: 'Trạng thái khác', color: '#647168', value: other });
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const active = rows.find(item => item.key === highlighted);
  let offset = 0;

  return (
    <section className="panel dashboard-chart" aria-labelledby="booking-chart-title">
      <header className="dashboard-chart-heading">
        <div><p className="eyebrow">HÀNH TRÌNH CỦA KHÁCH</p><h2 id="booking-chart-title">Cơ cấu đơn đặt tour</h2></div>
        <span className="dashboard-chart-period">Toàn kỳ</span>
      </header>
      <div className="booking-chart-layout">
        <div className="booking-donut" aria-hidden="true">
          <svg viewBox="0 0 200 200" focusable="false">
            <circle cx="100" cy="100" r="78" fill="none" stroke="#edf1eb" strokeWidth="20" />
            {rows.map(item => {
              const share = total ? item.value / total * 100 : 0;
              const start = offset; offset += share;
              return share > 0 && <circle key={item.key} cx="100" cy="100" r="78"
                pathLength="100" fill="none" stroke={item.color} strokeWidth="20"
                strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start}
                transform="rotate(-90 100 100)"
                className={highlighted && highlighted !== item.key ? 'is-muted' : ''} />;
            })}
          </svg>
          <div className="booking-donut-center">
            <strong>{number(active ? active.value : total)}</strong>
            <span>{active ? active.label : 'Tổng đơn đặt tour'}</span>
            {active && total > 0 && <small>{percent(active.value, total)} tổng đơn</small>}
          </div>
        </div>
        <ul className="dashboard-chart-legend" aria-label={`Trạng thái của ${number(total)} đơn đặt tour`}>
          {rows.map(item => <li key={item.key}>
            <Link to={'/admin/bookings?queue=' + item.key}
              onMouseEnter={() => setHighlighted(item.key)} onMouseLeave={() => setHighlighted(null)}
              onFocus={() => setHighlighted(item.key)} onBlur={() => setHighlighted(null)}>
              <span className="chart-swatch" style={{ background: item.color }} aria-hidden="true" />
              <span>{item.label}</span>
              <strong>{number(item.value)} <small>({percent(item.value, total)})</small></strong>
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </li>)}
        </ul>
      </div>
      <p className="dashboard-chart-note">{total ? 'Chọn một trạng thái để xem các đơn tương ứng.' : 'Chưa có đơn đặt tour. Biểu đồ sẽ cập nhật khi có dữ liệu.'}</p>
    </section>
  );
}

function PaymentChart({ successfulAmount, refundRequiredAmount }) {
  const rows = [
    { key: 'SUCCESS', label: 'Giao dịch thành công', value: successfulAmount, color: '#205744' },
    { key: 'REFUND_REQUIRED', label: 'Cần xử lý hoàn tiền', value: refundRequiredAmount, color: '#b88232' },
  ];
  const max = Math.max(...rows.map(item => count(item.value)));
  const available = rows.some(item => item.value != null);
  return (
    <section className="panel dashboard-chart" aria-labelledby="payment-chart-title">
      <header className="dashboard-chart-heading">
        <div><p className="eyebrow">THEO DÕI THANH TOÁN</p><h2 id="payment-chart-title">Tiền ghi nhận</h2></div>
        <span className="dashboard-chart-period">Toàn kỳ · VND</span>
      </header>
      <div className="payment-chart-scale" aria-hidden="true"><span>0 ₫</span><span>{money(max)}</span></div>
      <ul className="payment-chart-bars">
        {rows.map(item => <li key={item.key}>
          <Link to={'/admin/payments?status=' + item.key}>
            <div className="payment-chart-label"><span>{item.label} <ArrowUpRight size={14} aria-hidden="true" /></span><strong>{money(item.value)}</strong></div>
            <div className="payment-chart-track" aria-hidden="true">
              <div className="payment-chart-fill" style={{ width: `${max ? count(item.value) / max * 100 : 0}%`, background: item.color }} />
            </div>
          </Link>
        </li>)}
      </ul>
      {!max && <p className="dashboard-chart-empty">{available ? 'Chưa ghi nhận số tiền ở hai nhóm này.' : 'Số liệu thanh toán đang được cập nhật.'}</p>}
      <p className="dashboard-chart-note">Hai nhóm được thống kê riêng; cần hoàn tiền chưa có nghĩa đã hoàn tiền. Số liệu không phải lợi nhuận hay số dư ngân hàng.</p>
    </section>
  );
}

export default function DashboardCharts({ data }) {
  return <div className="dashboard-charts">
    <BookingChart bookings={data.bookings} />
    <PaymentChart successfulAmount={data.successfulAmount} refundRequiredAmount={data.refundRequiredAmount} />
  </div>;
}
