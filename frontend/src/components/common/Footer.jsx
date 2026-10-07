import { Link } from 'react-router-dom';
import { ArrowUpRight, Leaf } from 'lucide-react';
import { Brand } from './Navbar';
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Brand />
            <p>
              Những hành trình gần thiên nhiên hơn.
              <br />
              Bắt đầu từ một bước chân của bạn.
            </p>
          </div>
          <div>
            <h3>Khám phá</h3>
            <Link to="/tours">
              Các chuyến đi <ArrowUpRight size={14} />
            </Link>
            <Link to="/tours?difficulty=1">Dành cho người mới</Link>
            <Link to="/tours?duration=short">Chuyến đi ngắn ngày</Link>
          </div>
          <div>
            <h3>Đồng hành cùng bạn</h3>
            <Link to="/chat">Hỏi trợ lý hành trình</Link>
            <Link to="/my-bookings">Theo dõi đặt tour</Link>
            <Link to="/register">Tạo tài khoản</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Trek & Camp</span>
          <span>
            <Leaf size={15} /> Chỉ để lại những dấu chân.
          </span>
        </div>
      </div>
    </footer>
  );
}
