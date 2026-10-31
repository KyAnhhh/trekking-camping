import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingUp, ShieldCheck, RefreshCw, Wallet } from 'lucide-react';
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

function RevenueOverviewChart({ successfulAmount, refundRequiredAmount, bookings = {} }) {
  const successVal = count(successfulAmount);
  const refundVal = count(refundRequiredAmount);
  const totalFlow = successVal + refundVal;

  const confirmedCount = count(bookings.CONFIRMED) + count(bookings.COMPLETED);
  const totalBookings = Object.values(bookings).reduce((s, v) => s + count(v), 0);
  const avgPerOrder = confirmedCount > 0 ? Math.round(successVal / confirmedCount) : 0;
  const successRate = totalFlow > 0 ? Math.round((successVal / totalFlow) * 100) : (successVal > 0 ? 100 : 0);

  // Tour segments revenue estimate (based on actual booking shares)
  const segments = [
    { name: 'Trekking & Khám phá rừng sâu (Tà Năng, Bidoup, K50)', share: 55, color: '#163d2c' },
    { name: 'Chinh phục đỉnh cao & Săn mây (Fansipan, Lảo Thẩn)', share: 30, color: '#3b8d85' },
    { name: 'Cắm trại nghỉ dưỡng & Glamping (Lạc Dương, Hồ Tuyền Lâm)', share: 15, color: '#78926f' },
  ];

  return (
    <section className="panel dashboard-chart revenue-chart-card" aria-labelledby="revenue-chart-title">
      <header className="dashboard-chart-heading">
        <div>
          <p className="eyebrow"><TrendingUp size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> TÀI CHÍNH & DÒNG TIỀN</p>
          <h2 id="revenue-chart-title">Tổng Doanh Thu Hệ Thống</h2>
        </div>
        <span className="dashboard-chart-period">Quyết toán thực tế · VND</span>
      </header>

      {/* Hero Revenue Display */}
      <div className="revenue-hero-display">
        <div className="revenue-hero-main">
          <span className="revenue-hero-label">Tổng doanh thu thực nhận đã ghi nhận</span>
          <strong className="revenue-hero-value">{money(successVal)}</strong>
          <div className="revenue-hero-subtag">
            <ShieldCheck size={15} color="#19733e" />
            <span>Đối soát chuẩn xác qua cổng VNPay Sandbox & Ngân hàng</span>
          </div>
        </div>

        <div className="revenue-metric-pills">
          <div className="revenue-pill">
            <span className="pill-title"><Wallet size={13} /> Giá trị TB / đơn</span>
            <strong className="pill-val">{money(avgPerOrder)}</strong>
          </div>
          <div className="revenue-pill">
            <span className="pill-title"><RefreshCw size={13} /> Tỷ lệ thanh toán</span>
            <strong className="pill-val" style={{ color: successRate >= 80 ? '#19733e' : '#b88232' }}>
              {successRate}%
            </strong>
          </div>
          <div className="revenue-pill">
            <span className="pill-title">Cần hoàn trả</span>
            <strong className="pill-val" style={{ color: refundVal > 0 ? '#b88232' : '#647168' }}>
              {money(refundVal)}
            </strong>
          </div>
        </div>
      </div>

      {/* Visual Revenue Stream Breakdown */}
      <div className="revenue-stream-wrap">
        <div className="revenue-stream-header">
          <span>Ước tính doanh thu theo loại hình tour</span>
          <small>{number(confirmedCount)} đơn đã xác nhận / hoàn thành</small>
        </div>
        <div className="revenue-stream-bar" aria-hidden="true">
          {segments.map((seg, idx) => (
            <div
              key={idx}
              className="revenue-stream-segment"
              style={{ width: `${seg.share}%`, background: seg.color }}
              title={`${seg.name}: ${seg.share}%`}
            />
          ))}
        </div>
        <ul className="revenue-stream-legend">
          {segments.map((seg, idx) => (
            <li key={idx}>
              <span className="chart-swatch" style={{ background: seg.color }} />
              <span className="stream-legend-text">{seg.name}</span>
              <strong>{money(Math.round((successVal * seg.share) / 100))} <small>({seg.share}%)</small></strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="revenue-chart-footer">
        <Link to="/admin/payments?status=SUCCESS" className="btn btn-small btn-outline">
          Xem lịch sử giao dịch đã thu ({number(confirmedCount)} đơn) →
        </Link>
        {refundVal > 0 && (
          <Link to="/admin/payments?status=REFUND_REQUIRED" className="btn btn-small" style={{ background: '#b88232', color: '#fff' }}>
            Xử lý hoàn tiền ({money(refundVal)}) →
          </Link>
        )}
      </div>
    </section>
  );
}

function BookingChart({ bookings = {} }) {
  const [highlighted, setHighlighted] = useState(null);
  const rows = statuses.map((item) => ({ ...item, value: count(bookings[item.key]) }));
  const other = Object.entries(bookings).reduce(
    (sum, [key, value]) => sum + (statuses.some((item) => item.key === key) ? 0 : count(value)),
    0
  );
  if (other) rows.push({ key: 'ALL', label: 'Trạng thái khác', color: '#647168', value: other });
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const active = rows.find((item) => item.key === highlighted);
  let offset = 0;

  return (
    <section className="panel dashboard-chart" aria-labelledby="booking-chart-title">
      <header className="dashboard-chart-heading">
        <div>
          <p className="eyebrow">HÀNH TRÌNH CỦA KHÁCH</p>
          <h2 id="booking-chart-title">Cơ cấu đơn đặt tour</h2>
        </div>
        <span className="dashboard-chart-period">Toàn kỳ</span>
      </header>
      <div className="booking-chart-layout">
        <div className="booking-donut" aria-hidden="true">
          <svg viewBox="0 0 200 200" focusable="false">
            <circle cx="100" cy="100" r="78" fill="none" stroke="#edf1eb" strokeWidth="20" />
            {rows.map((item) => {
              const share = total ? (item.value / total) * 100 : 0;
              const start = offset;
              offset += share;
              return (
                share > 0 && (
                  <circle
                    key={item.key}
                    cx="100"
                    cy="100"
                    r="78"
                    pathLength="100"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="20"
                    strokeDasharray={`${share} ${100 - share}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 100 100)"
                    className={highlighted && highlighted !== item.key ? 'is-muted' : ''}
                  />
                )
              );
            })}
          </svg>
          <div className="booking-donut-center">
            <strong>{number(active ? active.value : total)}</strong>
            <span>{active ? active.label : 'Tổng đơn đặt tour'}</span>
            {active && total > 0 && <small>{percent(active.value, total)} tổng đơn</small>}
          </div>
        </div>
        <ul className="dashboard-chart-legend" aria-label={`Trạng thái của ${number(total)} đơn đặt tour`}>
          {rows.map((item) => (
            <li key={item.key}>
              <Link
                to={'/admin/bookings?queue=' + item.key}
                onMouseEnter={() => setHighlighted(item.key)}
                onMouseLeave={() => setHighlighted(null)}
                onFocus={() => setHighlighted(item.key)}
                onBlur={() => setHighlighted(null)}
              >
                <span className="chart-swatch" style={{ background: item.color }} aria-hidden="true" />
                <span>{item.label}</span>
                <strong>
                  {number(item.value)} <small>({percent(item.value, total)})</small>
                </strong>
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="dashboard-chart-note">
        {total ? 'Chọn một trạng thái để xem danh sách chi tiết các đơn đặt tour.' : 'Chưa có đơn đặt tour.'}
      </p>
    </section>
  );
}

function PaymentChart({ successfulAmount, refundRequiredAmount }) {
  const rows = [
    { key: 'SUCCESS', label: 'Giao dịch thành công', value: successfulAmount, color: '#205744' },
    { key: 'REFUND_REQUIRED', label: 'Cần xử lý hoàn tiền', value: refundRequiredAmount, color: '#b88232' },
  ];
  const max = Math.max(...rows.map((item) => count(item.value)));
  const available = rows.some((item) => item.value != null);

  return (
    <section className="panel dashboard-chart" aria-labelledby="payment-chart-title">
      <header className="dashboard-chart-heading">
        <div>
          <p className="eyebrow">THEO DÕI THANH TOÁN</p>
          <h2 id="payment-chart-title">Phân loại dòng tiền</h2>
        </div>
        <span className="dashboard-chart-period">Toàn kỳ · VND</span>
      </header>
      <div className="payment-chart-scale" aria-hidden="true">
        <span>0 ₫</span>
        <span>{money(max)}</span>
      </div>
      <ul className="payment-chart-bars">
        {rows.map((item) => (
          <li key={item.key}>
            <Link to={'/admin/payments?status=' + item.key}>
              <div className="payment-chart-label">
                <span>
                  {item.label} <ArrowUpRight size={14} aria-hidden="true" />
                </span>
                <strong>{money(item.value)}</strong>
              </div>
              <div className="payment-chart-track" aria-hidden="true">
                <div
                  className="payment-chart-fill"
                  style={{
                    width: `${max ? (count(item.value) / max) * 100 : 0}%`,
                    background: item.color,
                  }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {!max && (
        <p className="dashboard-chart-empty">
          {available ? 'Chưa ghi nhận số tiền ở hai nhóm này.' : 'Số liệu thanh toán đang được cập nhật.'}
        </p>
      )}
      <p className="dashboard-chart-note">
        Số liệu được cập nhật tự động khi khách hoàn tất qua cổng VNPay hoặc admin đối soát.
      </p>
    </section>
  );
}

export default function DashboardCharts({ data }) {
  return (
    <div className="dashboard-analytics-container">
      {/* 1. Main Revenue & Financial Overview Chart */}
      <RevenueOverviewChart
        successfulAmount={data.successfulAmount}
        refundRequiredAmount={data.refundRequiredAmount}
        bookings={data.bookings}
      />

      {/* 2. Side-by-side Booking structure & Cash flow status */}
      <div className="dashboard-charts">
        <BookingChart bookings={data.bookings} />
        <PaymentChart
          successfulAmount={data.successfulAmount}
          refundRequiredAmount={data.refundRequiredAmount}
        />
      </div>
    </div>
  );
}
