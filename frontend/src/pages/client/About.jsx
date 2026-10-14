import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { forest } from "../../utils/tour";
import "../../styles/editorial.css";
import Reveal from '../../components/common/Reveal';

export default function About() {
  return (
    <div className="container field-journal">
      <section className="about-intro" aria-labelledby="about-heading">
        <div className="journal-heading">
          <p className="eyebrow">VỀ CHÚNG TÔI · TREK & CAMP</p>
          <h1 id="about-heading">Gần thiên nhiên hơn.<br /><span>Bắt đầu từ sự thấu hiểu.</span></h1>
          <p>Một chuyến đi bắt đầu từ nhiều câu hỏi: đi đâu, cần chuẩn bị gì, lịch trình nào phù hợp? Trek & Camp được xây dựng để giúp bạn tìm hiểu trước khi lựa chọn.</p>
          <Link className="text-link" to="/tours">Khám phá tour <ArrowUpRight size={18} /></Link>
        </div>
        <figure className="about-image">
          <img src={forest} alt="Không gian cây xanh giữa thiên nhiên" width="640" height="720" />
          <figcaption>Hiểu hành trình trước mỗi bước chân.</figcaption>
        </figure>
      </section>
      <section className="about-purpose" aria-labelledby="purpose-heading">
        <p className="eyebrow">VÌ SAO CÓ TREK & CAMP?</p>
        <div>
          <h2 id="purpose-heading">Đưa thông tin cần thiết về cùng một nơi</h2>
          <p>Trek & Camp là dự án đồ án tốt nghiệp về trợ lý thông minh hỗ trợ tư vấn, gợi ý lịch trình và đặt tour trekking/camping. Website kết nối việc khám phá tour, trò chuyện với AI và quản lý chuyến đi trong một trải nghiệm.</p>
          <p>Dữ liệu tour có thể được sử dụng để tham khảo và minh họa học thuật. Lịch khởi hành, giá và thông tin tổ chức cần được xác nhận với đơn vị cung cấp trước một chuyến đi thực tế.</p>
        </div>
      </section>
      <section className="about-journey" aria-labelledby="journey-heading">
        <p className="eyebrow">TỪ Ý TƯỞNG ĐẾN CHUYẾN ĐI</p>
        <h2 id="journey-heading">Chủ động ở từng bước lựa chọn</h2>
        <ol>
          <li><span aria-hidden="true">01</span><div><h3>Tìm hiểu hành trình</h3><p>Khám phá tour, đọc lịch trình, thông số hành trình và thông tin hướng dẫn viên khi được công bố.</p><Link to="/tours">Xem tour <ArrowUpRight size={16} /></Link></div></li>
          <li><span aria-hidden="true">02</span><div><h3>Trao đổi nhu cầu</h3><p>Hỏi AI về tour hoặc tạo gợi ý lịch trình theo mong muốn. Đối chiếu nguồn và hỏi lại khi thông tin chưa rõ.</p><Link to="/planner">Lập lịch trình <ArrowUpRight size={16} /></Link></div></li>
          <li><span aria-hidden="true">03</span><div><h3>Kiểm tra và xác nhận</h3><p>Xem kỹ ngày đi, số khách, giá và yêu cầu tham gia trước khi đặt. Theo dõi trạng thái và các bước tiếp theo trong tài khoản.</p><Link to="/my-bookings">Chuyến đi của tôi <ArrowUpRight size={16} /></Link></div></li>
        </ol>
      </section>
      <Reveal className="about-purpose" aria-labelledby="about-information-heading">
        <p className="eyebrow">THÔNG TIN ĐỂ BẠN CHỦ ĐỘNG</p>
        <div><h2 id="about-information-heading">AI hỗ trợ tìm hiểu, bạn quyết định hành trình</h2><p>Trợ lý có thể gợi ý tour và trả lời từ kho thông tin của website. Hãy mở nguồn tham khảo, kiểm tra lịch và xem lại tóm tắt trước khi xác nhận đơn. Khi thiếu thông tin, việc hỏi lại giúp tránh hiểu nhầm.</p><p>Hướng dẫn viên được phân công theo từng lịch khởi hành. Hồ sơ công khai trong chi tiết tour giúp bạn tìm hiểu người đồng hành khi thông tin đã được cập nhật.</p><div className="content-links"><Link className="text-link" to="/contact">Tìm hỗ trợ <ArrowUpRight size={17} /></Link><Link className="text-link" to="/destinations">Khám phá điểm đến <ArrowUpRight size={17} /></Link></div></div>
      </Reveal>
      <section className="journal-next" aria-labelledby="about-next-heading">
        <div><p className="eyebrow">ĐỒNG HÀNH TỪ KHÂU CHUẨN BỊ</p><h2 id="about-next-heading">Một chút chuẩn bị, nhiều điều để khám phá.</h2></div>
        <Link className="btn" to="/handbook">Đọc cẩm nang <ArrowUpRight size={18} /></Link>
      </section>
    </div>
  );
}
