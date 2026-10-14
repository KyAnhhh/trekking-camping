import { Link } from "react-router-dom";
import { ArrowUpRight, Backpack, Compass, Leaf, Map } from "lucide-react";
import "../../styles/editorial.css";

export default function Handbook() {
  return (
    <div className="container field-journal">
      <header className="journal-heading">
        <p className="eyebrow">CẨM NANG TREKKING & CAMPING</p>
        <h1>Chuẩn bị kỹ.<br /><span>Đi nhẹ lòng hơn.</span></h1>
        <p>Từ việc chọn cung đường đến soạn ba lô, những ghi chú này giúp bạn bắt đầu một chuyến đi có chuẩn bị.</p>
      </header>
      <div className="journal-layout">
        <aside className="journal-index">
          <p className="eyebrow">TRONG CẨM NANG NÀY</p>
          <nav aria-label="Mục lục cẩm nang">
            <a href="#chon-hanh-trinh"><Map size={18} aria-hidden="true" />Chọn hành trình</a>
            <a href="#soan-ba-lo"><Backpack size={18} aria-hidden="true" />Soạn ba lô</a>
            <a href="#truoc-khi-di"><Compass size={18} aria-hidden="true" />Trước khi lên đường</a>
            <a href="#di-co-trach-nhiem"><Leaf size={18} aria-hidden="true" />Đi có trách nhiệm</a>
          </nav>
          <p>Mỗi cung đường có yêu cầu riêng. Hãy đối chiếu danh sách chuẩn bị của tour và trao đổi với người tổ chức.</p>
        </aside>
        <div className="journal-articles">
          <article id="chon-hanh-trinh" aria-labelledby="choose-heading">
            <span className="journal-topic">HIỂU CUNG ĐƯỜNG</span>
            <h2 id="choose-heading">Chọn tour từ những thông số cụ thể</h2>
            <p>Trong trang chi tiết tour, đọc phần tổng quan hành trình cùng lịch khởi hành. Nhãn độ khó là điểm bắt đầu; các thông số bên dưới giúp bạn đặt câu hỏi rõ hơn.</p>
            <dl className="journal-facts">
              <div><dt>Quãng đường & thời gian hoạt động</dt><dd>Xem số kilômét, số giờ di chuyển mỗi ngày và thời gian nghỉ trong lịch trình.</dd></div>
              <div><dt>Độ cao & độ dốc</dt><dd>Phân biệt độ cao đỉnh với tổng độ cao phải leo. Hai tour cùng độ dài có thể đòi hỏi mức vận động khác nhau.</dd></div>
              <div><dt>Hỗ trợ trên hành trình</dt><dd>Đọc ghi chú tiếp cận y tế, yêu cầu tham gia và phân công hướng dẫn viên nếu đã được cập nhật.</dd></div>
            </dl>
            <p>Thông số chưa có thì cần hỏi lại. Một con số trong tổng quan tour không tự xác nhận chuyến đi phù hợp với mọi người.</p>
            <Link className="text-link" to="/tours">Xem các hành trình <ArrowUpRight size={17} /></Link>
          </article>
          <article id="soan-ba-lo" aria-labelledby="packing-heading">
            <span className="journal-topic">CHUẨN BỊ TRANG BỊ</span>
            <h2 id="packing-heading">Soạn theo nhu cầu của chuyến đi</h2>
            <p>Kiểm tra mục trang bị của tour để biết đồ được cung cấp, đồ có thể thuê và đồ cần tự mang. Đừng mặc định lều, túi ngủ hay đồ ăn đều đã bao gồm.</p>
            <ul className="journal-list">
              <li>Chuẩn bị bản đồ hoặc thông tin tuyến đường, điện thoại và nguồn điện dự phòng; biết cách sử dụng trước khi đi.</li>
              <li>Mang lớp áo phù hợp thời tiết, đồ che mưa và vật dụng chống nắng.</li>
              <li>Kiểm tra đèn cá nhân, pin, nước và thức ăn dự phòng phù hợp hành trình.</li>
              <li>Trao đổi với người tổ chức về đồ sơ cứu, dụng cụ sửa chữa và phương án trú tạm khi kế hoạch thay đổi.</li>
            </ul>
            <p className="journal-source">Tham khảo cách phân nhóm trang bị: <a href="https://www.nps.gov/articles/10essentials.htm" target="_blank" rel="noopener noreferrer">National Park Service — Ten Essentials (tiếng Anh)</a>. Đây là ghi chú khởi đầu, không phải danh sách đầy đủ cho mọi tour.</p>
          </article>
          <article id="truoc-khi-di" aria-labelledby="departure-heading">
            <span className="journal-topic">KIỂM TRA LẦN CUỐI</span>
            <h2 id="departure-heading">Chốt thông tin trước ngày khởi hành</h2>
            <ul className="journal-list">
              <li>Kiểm tra lại giờ, địa điểm đón và đầu mối liên hệ được người tổ chức xác nhận.</li>
              <li>Xem thông tin thời tiết, tình trạng tuyến đường và kế hoạch thay thế cùng người tổ chức.</li>
              <li>Chia sẻ lịch trình và thời gian dự kiến trở về với một người tin cậy.</li>
              <li>Đọc yêu cầu tham gia trong đơn đặt tour; gửi thông tin cá nhân cần thiết qua biểu mẫu riêng thay vì chat công khai.</li>
            </ul>
            <p>Khi dùng trợ lý AI, bạn có thể nêu điểm đến, ngày đi, số người và ngân sách. Trước khi đặt, kiểm tra lại lịch và giá trên thẻ tour hoặc bản tóm tắt đơn.</p>
            <p className="journal-source">Tham khảo chuẩn bị trước chuyến đi: <a href="https://www.nps.gov/articles/hiking-safety.htm" target="_blank" rel="noopener noreferrer">National Park Service — Hike Smart (tiếng Anh)</a>.</p>
          </article>
          <article id="di-co-trach-nhiem" aria-labelledby="responsible-heading">
            <span className="journal-topic">GIỮ GÌN NƠI MÌNH ĐẾN</span>
            <h2 id="responsible-heading">Mang kỷ niệm về, giữ thiên nhiên ở lại</h2>
            <p>Đi theo lối được hướng dẫn và chọn nơi cắm trại phù hợp để hạn chế tác động lên cây cỏ. Gom rác, kể cả thức ăn thừa, để mang đến nơi xử lý phù hợp.</p>
            <p>Quan sát động vật từ xa, không cho ăn; để đá, cây và những gì bạn tìm thấy ở nguyên vị trí. Giữ tiếng ồn vừa phải để những người khác cũng có thể tận hưởng không gian.</p>
            <p className="journal-source">Đọc thêm: <a href="https://lnt.org/why/7-principles/" target="_blank" rel="noopener noreferrer">Leave No Trace — The 7 Principles (tiếng Anh)</a>.</p>
          </article>
        </div>
      </div>
      <section className="journal-next" aria-labelledby="journal-next-heading">
        <div><p className="eyebrow">TỪ CHUẨN BỊ ĐẾN HÀNH TRÌNH</p><h2 id="journal-next-heading">Bạn đang nghĩ đến chuyến đi nào?</h2></div>
        <div className="content-links"><Link className="btn" to="/chat">Hỏi AI <ArrowUpRight size={18} /></Link><Link className="btn btn-outline" to="/contact">Liên hệ & hỗ trợ</Link></div>
      </section>
    </div>
  );
}
