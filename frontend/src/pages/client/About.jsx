import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { forest } from "../../utils/tour";
import "../../styles/editorial.css";
import Reveal from '../../components/common/Reveal';
import { useLanguage } from '../../context/LanguageContext';

export default function About() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  return (
    <div className="container field-journal">
      <section className="about-intro" aria-labelledby="about-heading">
        <div className="journal-heading">
          <p className="eyebrow">{isEn ? 'ABOUT US · TREK & CAMP' : 'VỀ CHÚNG TÔI · TREK & CAMP'}</p>
          <h1 id="about-heading">
            {isEn ? 'Closer to Nature.' : 'Gần thiên nhiên hơn.'}
            <br />
            <span>{isEn ? 'Begins with Deep Understanding.' : 'Bắt đầu từ sự thấu hiểu.'}</span>
          </h1>
          <p>
            {isEn
              ? 'An expedition begins with many questions: where to venture, what gear to pack, which itinerary fits best? Trek & Camp is designed to illuminate your path before you commit.'
              : 'Một chuyến đi bắt đầu từ nhiều câu hỏi: đi đâu, cần chuẩn bị gì, lịch trình nào phù hợp? Trek & Camp được xây dựng để giúp bạn tìm hiểu trước khi lựa chọn.'}
          </p>
          <Link className="text-link" to="/tours">
            {isEn ? 'Explore tours' : 'Khám phá tour'} <ArrowUpRight size={18} />
          </Link>
        </div>
        <figure className="about-image">
          <img src={forest} alt="Không gian cây xanh giữa thiên nhiên" width="640" height="720" />
          <figcaption>{isEn ? 'Understand every trail before each step.' : 'Hiểu hành trình trước mỗi bước chân.'}</figcaption>
        </figure>
      </section>

      <section className="about-purpose" aria-labelledby="purpose-heading">
        <p className="eyebrow">{isEn ? 'WHY TREK & CAMP?' : 'VÌ SAO CÓ TREK & CAMP?'}</p>
        <div>
          <h2 id="purpose-heading">{isEn ? 'Bringing all essential information together' : 'Đưa thông tin cần thiết về cùng một nơi'}</h2>
          <p>
            {isEn
              ? 'Trek & Camp is a graduation project developing an intelligent trail assistant supporting tour consultation, custom itineraries, and outdoor expeditions. The platform integrates tour discovery, AI conversation, and trip management into one seamless experience.'
              : 'Trek & Camp là dự án đồ án tốt nghiệp về trợ lý thông minh hỗ trợ tư vấn, gợi ý lịch trình và đặt tour trekking/camping. Website kết nối việc khám phá tour, trò chuyện với AI và quản lý chuyến đi trong một trải nghiệm.'}
          </p>
          <p>
            {isEn
              ? 'Tour data is curated for educational illustration and inspiration. Departure dates, pricing, and operational logistics should be confirmed with organizers for actual field trips.'
              : 'Dữ liệu tour có thể được sử dụng để tham khảo và minh họa học thuật. Lịch khởi hành, giá và thông tin tổ chức cần được xác nhận với đơn vị cung cấp trước một chuyến đi thực tế.'}
          </p>
        </div>
      </section>

      <section className="about-journey" aria-labelledby="journey-heading">
        <p className="eyebrow">{isEn ? 'FROM IDEA TO THE TRAIL' : 'TỪ Ý TƯỞNG ĐẾN CHUYẾN ĐI'}</p>
        <h2 id="journey-heading">{isEn ? 'Informed decisions at every milestone' : 'Chủ động ở từng bước lựa chọn'}</h2>
        <ol>
          <li>
            <span aria-hidden="true">01</span>
            <div>
              <h3>{isEn ? 'Explore Itineraries' : 'Tìm hiểu hành trình'}</h3>
              <p>
                {isEn
                  ? 'Inspect trails, read day-by-day itineraries, terrain difficulty parameters, and assigned guides.'
                  : 'Khám phá tour, đọc lịch trình, thông số hành trình và thông tin hướng dẫn viên khi được công bố.'}
              </p>
              <Link to="/tours">
                {isEn ? 'View tours' : 'Xem tour'} <ArrowUpRight size={16} />
              </Link>
            </div>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <div>
              <h3>{isEn ? 'Consult with AI' : 'Trao đổi nhu cầu'}</h3>
              <p>
                {isEn
                  ? 'Ask our AI assistant about gear requirements or generate personalized itineraries based on your schedule.'
                  : 'Hỏi AI về tour hoặc tạo gợi ý lịch trình theo mong muốn. Đối chiếu nguồn và hỏi lại khi thông tin chưa rõ.'}
              </p>
              <Link to="/planner">
                {isEn ? 'Trip planner' : 'Lập lịch trình'} <ArrowUpRight size={16} />
              </Link>
            </div>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <div>
              <h3>{isEn ? 'Confirm & Prepare' : 'Kiểm tra và xác nhận'}</h3>
              <p>
                {isEn
                  ? 'Carefully check departure dates, party size, pricing, and health requirements before booking.'
                  : 'Xem kỹ ngày đi, số khách, giá và yêu cầu tham gia trước khi đặt. Theo dõi trạng thái và các bước tiếp theo trong tài khoản.'}
              </p>
              <Link to="/my-bookings">
                {isEn ? 'My bookings' : 'Chuyến đi của tôi'} <ArrowUpRight size={16} />
              </Link>
            </div>
          </li>
        </ol>
      </section>

      <Reveal className="about-purpose" aria-labelledby="about-information-heading">
        <p className="eyebrow">{isEn ? 'EMPOWERING YOUR JOURNEY' : 'THÔNG TIN ĐỂ BẠN CHỦ ĐỘNG'}</p>
        <div>
          <h2 id="about-information-heading">
            {isEn ? 'AI assists your discovery; You decide the path' : 'AI hỗ trợ tìm hiểu, bạn quyết định hành trình'}
          </h2>
          <p>
            {isEn
              ? 'Our assistant recommends tours and answers questions from our verified knowledge repository. Always review summaries before confirming bookings.'
              : 'Trợ lý có thể gợi ý tour và trả lời từ kho thông tin của website. Hãy mở nguồn tham khảo, kiểm tra lịch và xem lại tóm tắt trước khi xác nhận đơn. Khi thiếu thông tin, việc hỏi lại giúp tránh hiểu nhầm.'}
          </p>
          <div className="content-links">
            <Link className="text-link" to="/contact">
              {isEn ? 'Get support' : 'Tìm hỗ trợ'} <ArrowUpRight size={17} />
            </Link>
            <Link className="text-link" to="/destinations">
              {isEn ? 'Discover destinations' : 'Khám phá điểm đến'} <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </Reveal>

      <section className="journal-next" aria-labelledby="about-next-heading">
        <div>
          <p className="eyebrow">{isEn ? 'PREPARED FOR ADVENTURE' : 'ĐỒNG HÀNH TỪ KHÂU CHUẨN BỊ'}</p>
          <h2 id="about-next-heading">
            {isEn ? 'A little preparation, wonders to discover.' : 'Một chút chuẩn bị, nhiều điều để khám phá.'}
          </h2>
        </div>
        <Link className="btn" to="/handbook">
          {isEn ? 'Read Handbook' : 'Đọc cẩm nang'} <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
  );
}
