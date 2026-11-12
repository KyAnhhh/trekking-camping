import { useLanguage } from '../../context/LanguageContext';

const FAQ_DATA = {
  vi: [
    {
      q: 'Tôi mới bắt đầu, nên chọn tour thế nào?',
      a: 'Bắt đầu từ bộ lọc độ khó (mức Dễ) và số ngày ngắn (1–2 ngày). Sau đó đọc quãng đường, thời gian vận động, lịch trình và yêu cầu tham gia của từng tour. Nếu cần, hãy hỏi trợ lý AI trước khi đặt.',
    },
    {
      q: 'Tạo đơn có đồng nghĩa đã thanh toán không?',
      a: 'Chưa. Sau khi tạo đơn, mở Chuyến đi của tôi để xem trạng thái và hoàn tất khai báo tham gia. Chỉ thực hiện thanh toán khi đơn đủ điều kiện.',
    },
    {
      q: 'AI có tự đặt tour hoặc giữ chỗ cho tôi không?',
      a: 'AI giúp tìm hiểu và đề xuất hành trình. Bạn luôn là người kiểm tra thông tin và chủ động xác nhận ở biểu mẫu đặt tour.',
    },
    {
      q: 'Tôi có cần mang lều và trang bị riêng?',
      a: 'Mỗi tour có danh sách khác nhau. Hãy xem phần Chuẩn bị hành trang trong chi tiết tour để biết danh mục đồ được cấp và đồ cần tự mang.',
    },
    {
      q: 'Tôi muốn thay đổi hoặc hủy đơn thì làm sao?',
      a: 'Mở chi tiết đơn trong mục Chuyến đi của tôi để gửi yêu cầu hủy hoặc liên hệ đội ngũ quản trị xử lý hoàn tiền theo chính sách tour.',
    },
  ],
  en: [
    {
      q: 'I am a beginner. How should I choose my first trek?',
      a: 'Start with the Easy difficulty filter and shorter duration (1–2 days). Review total distance, daily hiking hours, and elevation gain in the itinerary. You can also ask our AI assistant for advice.',
    },
    {
      q: 'Does creating a booking mean I am charged immediately?',
      a: 'No. After submitting a booking, open My Trips to review requirements and health declarations. You only complete payment once your booking is officially accepted.',
    },
    {
      q: 'Does the AI automatically book or hold slots for me?',
      a: 'AI assists with recommendations and gear advice. You always retain full control to confirm details and submit your reservation.',
    },
    {
      q: 'Do I need to carry my own tent and sleeping bag?',
      a: 'Each expedition varies. Check the Equipment section on the tour page to see which gear is provided and what personal items you must carry.',
    },
    {
      q: 'How do I modify or cancel my reservation?',
      a: 'Open your reservation in My Trips to manage actions. Cancellation and refund rules depend on the lead time and tour operator policy.',
    },
  ],
};

export default function TravelFaq() {
  const { language } = useLanguage();
  const items = FAQ_DATA[language] || FAQ_DATA.vi;

  return (
    <div className="travel-faq">
      {items.map((item, idx) => (
        <details key={idx}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
