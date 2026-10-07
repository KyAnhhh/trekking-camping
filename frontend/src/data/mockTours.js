export const mockTours = [
  {
    id: 1,
    title: "Tà Năng - Phan Dũng: Băng Rừng Cỏ Lau",
    slug: "ta-nang-phan-dung",
    location: "Lâm Đồng - Bình Thuận",
    duration: "3 Ngày 2 Đêm",
    difficulty: "Trung Bình", // Dễ, Trung Bình, Mạo Hiểm
    price: 2800000,
    bannerUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200",
    description: "Cung đường trekking huyền thoại đi qua 3 tỉnh Lâm Đồng, Ninh Thuận, Bình Thuận với những đồi cỏ lau chập chùng bát ngát.",
    highlights: [
      "Đón bình minh và hoàng hôn rực rỡ trên sống lưng khủng long",
      "Thưởng thức BBQ cắm trại đêm giữa thiên nhiên đại ngàn",
      "Chinh phục cột mốc giao điểm 3 tỉnh Lâm Đồng - Ninh Thuận - Bình Thuận",
      "Đội ngũ Porter địa phương nhiệt tình, chuẩn bị sẵn lều trại & bữa ăn"
    ],
    itinerary: [
      { day: "Ngày 1", title: "TP.HCM - Tà Năng - Đồi Cỏ Lau", content: "Di chuyển từ đêm hôm trước. Bắt đầu trekking từ ngã ba Tà Hine qua các đồi cỏ xanh ngát. Cắm trại đêm tại đỉnh đồi 1100m." },
      { day: "Ngày 2", title: "Sống Lưng Khủng Long - Thác Yaly", content: "Đón bình minh, tiếp tục hành trình băng qua các con dốc huyền thoại. Hạ trại bên suối mát rượi." },
      { day: "Ngày 3", title: "Phan Dũng - TP.HCM", content: "Trekking ra khỏi rừng Phan Dũng, xe grab/xe ôm địa phương đón ra điểm tập kết. Trở về TP.HCM." }
    ],
    included: ["Xe đưa đón 2 chiều", "Toàn bộ bữa ăn trong tour", "Lều cắm trại, túi ngủ cách nhiệt", "Hướng dẫn viên & Porter", "Bảo hiểm du lịch 50,000,000 VNĐ"],
    excluded: ["Chi phí cá nhân ngoài chương trình", "Tiền tip cho HDV và Porter"],
  },
  {
    id: 2,
    title: "Cắm Trại Săn Mây Đỉnh Lạc Dương",
    slug: "cam-trai-lac-duong",
    location: "Đà Lạt, Lâm Đồng",
    duration: "2 Ngày 1 Đêm",
    difficulty: "Dễ",
    price: 1450000,
    bannerUrl: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=1200",
    description: "Trải nghiệm cắm trại cao cấp (Glamping) giữa rừng thông nguyên sinh, ngắm trọn biển mây Đà Lạt bồng bềnh lúc rạng sáng.",
    highlights: [
      "Săn biển mây 360 độ từ đỉnh núi cao 1700m",
      "Tiệc nướng BBQ beefsteak, rượu vang trong đêm se lạnh",
      "Lều trại cao cấp chống nước trang bị đầy đủ đệm và túi ngủ ấm"
    ],
    itinerary: [
      { day: "Ngày 1", title: "Đón Khách - Trekking Nhẹ - Tiệc BBQ", content: "Tập kết tại Đà Lạt, di chuyển vào chân núi Lạc Dương. Trekking nhẹ 3km lên bãi cắm trại. Thưởng thức BBQ đêm." },
      { day: "Ngày 2", title: "Săn Mây - Bữa Sáng Coffee - Hạ Núi", content: "Thức dậy lúc 5:30 AM săn mây, nhâm nhi cà phê nóng. Check-out bãi trại và di chuyển về lại trung tâm." }
    ],
    included: ["Lều glamping sang xịn", "Bữa tối BBQ + Bữa sáng cà phê", "HDV hỗ trợ chụp ảnh"],
    excluded: ["Phương tiện di chuyển đến Đà Lạt"],
  },
  {
    id: 3,
    title: "Chinh Phục Fansipan Đường Bạc",
    slug: "fansipan-duong-bac",
    location: "Sa Pa, Lào Cai",
    duration: "2 Ngày 1 Đêm",
    difficulty: "Mạo Hiểm",
    price: 3900000,
    bannerUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200",
    description: "Cung đường chinh phục nóc nhà Đông Dương bằng đường bộ truyền thống dành cho những người có thể lực và đam mê thử thách.",
    highlights: [
      "Chạm tay vào cột mốc 3,143m Fansipan bằng chính đôi chân của mình",
      "Vượt qua những cánh rừng trúc, rừng đỗ quyên cổ thụ Hoàng Liên Sơn",
      "Nghỉ đêm tại lán trạm 2,800m đầy kỷ niệm"
    ],
    itinerary: [
      { day: "Ngày 1", title: "Trạm Tôn - Lán 2,800m", content: "Xuất phát từ Trạm Tôn (1,800m). Bắt đầu leo qua các vách đá và rừng trúc. Ăn trưa dọc đường, tối ngủ tại lán 2,800m." },
      { day: "Ngày 2", title: "Chạm Đỉnh 3,143m - Trạm Tôn", content: "Dậy sớm leo chặng cuối lên đỉnh Fansipan. Ngắm toàn cảnh dãy Hoàng Liên Sơn. Xuống núi về Trạm Tôn." }
    ],
    included: ["Vé tham quan VQG Hoàng Liên", "Lán nghỉ đêm", "Porter vác đồ chung", "Cúp/Giấy chứng nhận chinh phục Fansipan"],
    excluded: ["Vé cáp treo nếu lượt về chọn đi cáp"],
  }
];