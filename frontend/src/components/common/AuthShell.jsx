import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { forest } from '../../utils/tour';
export default function AuthShell({ children }) {
  return (
    <div className="container auth-layout">
      <div className="auth-story">
        <img src={forest} alt="Ánh sáng xuyên qua tán rừng" />
        <div>
          <Compass size={36} strokeWidth={1.2} />
          <h2>
            Một bước nhỏ.
            <br />
            Một hành trình mới.
          </h2>
          <p>Những cung đường đẹp đang chờ bạn phía trước.</p>
        </div>
      </div>
      <section className="auth-form">
        <Link className="back-link" to="/">
          <ArrowLeft size={15} />
          Về trang chủ
        </Link>
        {children}
      </section>
    </div>
  );
}
