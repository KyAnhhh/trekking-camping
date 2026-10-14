import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, CalendarDays, Copy, ArrowUpRight } from 'lucide-react';
import TravelFaq from '../../components/common/TravelFaq';

// Optional public contact information, never credentials. No submission endpoint exists.
const emailValue = (import.meta.env.VITE_CONTACT_EMAIL || '').trim();
const supportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) ? emailValue : '';

export default function Contact() {
  const [subject, setSubject] = useState('Tư vấn hành trình');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const content = `Nội dung hỗ trợ: ${subject}\n\n${message.trim()}`;
  const copy = async (event) => {
    event.preventDefault(); setNotice(''); setFailure('');
    try {
      await navigator.clipboard.writeText(content);
      setNotice('Đã sao chép nội dung. Chưa có thông tin nào được gửi; bạn có thể dán vào kênh liên hệ đã được xác nhận.');
    } catch { setFailure('Trình duyệt chưa cho phép sao chép. Bạn có thể chọn và sao chép trực tiếp nội dung đã nhập.'); }
  };
  return <div className="container page-space">
    <header className="page-heading"><p className="eyebrow">LIÊN HỆ & HỖ TRỢ</p><h1>Cùng làm rõ trước khi lên đường.</h1><p>Chọn nơi phù hợp để tìm thông tin về tour, kiểm tra đơn hoặc chuẩn bị câu hỏi cho người phụ trách.</p></header>
    <div className="contact-layout">
      <div className="contact-options">
        <article className="contact-option"><MessageCircle size={24} /><div><h2>Thông tin trước chuyến đi</h2><p>Hỏi trợ lý AI về tour và cách chuẩn bị. Với thông tin chưa rõ, cần xác nhận lại từ người tổ chức.</p><Link className="text-link" to="/chat">Hỏi AI <ArrowUpRight size={17} /></Link></div></article>
        <article className="contact-option"><CalendarDays size={24} /><div><h2>Đơn đặt tour của bạn</h2><p>Xem trạng thái, khai báo tham gia và thông tin thanh toán trong từng đơn. Chuẩn bị mã đơn khi cần trao đổi.</p><Link className="text-link" to="/my-bookings">Chuyến đi của tôi <ArrowUpRight size={17} /></Link></div></article>
        <article className="contact-option"><Mail size={24} /><div><h2>Liên hệ trực tiếp</h2>{supportEmail ? <><p>Gửi nội dung đến email hỗ trợ được website công bố.</p><a className="text-link contact-email" href={`mailto:${supportEmail}`}>{supportEmail}</a></> : <p>Website chưa công bố email hoặc hotline hỗ trợ chung. Với một tour cụ thể, xem thông tin liên hệ được công bố trong chi tiết tour hoặc đơn của bạn.</p>}</div></article>
      </div>
      <form className="contact-compose form-stack" onSubmit={copy}>
        <h2>Chuẩn bị nội dung cần hỗ trợ</h2><p className="small muted">Biểu mẫu này giúp soạn và sao chép câu hỏi, không gửi yêu cầu lên hệ thống. Tránh nhập thông tin sức khỏe, mật khẩu hoặc thông tin thẻ.</p>
        <label className="field">Chủ đề<select value={subject} onChange={(e) => { setSubject(e.target.value); setNotice(''); }}><option>Tư vấn hành trình</option><option>Hỗ trợ đơn đặt tour</option><option>Góp ý website</option></select></label>
        <label className="field">Nội dung<textarea required minLength={5} maxLength={2000} value={message} onChange={(e) => { setMessage(e.target.value); setNotice(''); }} placeholder="Bạn muốn được làm rõ điều gì? Nếu hỏi về đơn đã đặt, có thể ghi mã đơn." /></label>
        {notice && <p className="notice notice-success" role="status">{notice}</p>}
        {failure && <p className="notice notice-error" role="alert">{failure}</p>}
        <button className="btn" type="submit"><Copy size={17} />Sao chép nội dung</button>
        {supportEmail && message.trim().length >= 5 && <a className="text-link" href={`mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.trim())}`}>Mở ứng dụng email <ArrowUpRight size={17} /></a>}
      </form>
    </div>
    <section className="contact-faq"><p className="eyebrow">CÓ THỂ BẠN ĐANG TÌM</p><h2>Câu hỏi thường gặp</h2><TravelFaq /></section>
  </div>;
}
