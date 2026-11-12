-- ===================================================================
-- MỞ RỘNG DỮ LIỆU ĐA DẠNG CHO WEBSITE TREKKING & CAMPING (11/2026)
-- Bổ sung:
-- 1. 3 Hướng dẫn viên mới (Tây Bắc, Duyên hải Cực Đông, Rừng nhiệt đới)
-- 2. 8 Tour mới đa dạng miền & cấp độ (Tà Xùa, Bạch Mộc Lương Tử,
--    Núi Chúa - Vĩnh Hy, Mũi Đôi Cực Đông, Nam Cát Tiên - Bàu Sấu,
--    Núi Bà Đen Ma Thiên Lãnh, Chư Yang Sin, SUP Hồ Tuyền Lâm)
-- 3. Lịch trình chi tiết theo ngày cho từng tour mới
-- 4. Lịch khởi hành OPEN (Tháng 11/2026 - 01/2027) & CLOSED (Tháng 07-10/2026)
-- 5. Trang bị cung cấp & cho thuê cho từng tour
-- 6. Album ảnh (3 ảnh/tour cho toàn bộ 14 tour, URL Unsplash HTTP 200)
-- 7. Phân công HDV, Booking đa tháng cho biểu đồ doanh thu, Review & Báo cáo chuyến đi
-- 8. Làm mới chỉ mục TOUR_INFO trong vector_store để AI tự đồng bộ 14 tour
-- ===================================================================

BEGIN;

-- 1. Bổ sung 3 Hướng dẫn viên mới (id 6..8)
INSERT INTO guides (id, code, full_name, avatar_url, bio, experience_since, specialties, languages, phone, email, active, user_id)
VALUES
    (6, 'HDV-006', 'Trần Quốc Bảo', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
     'Chuyên gia dẫn tuyến ven biển và núi khô hạn Nam Trung Bộ (Mũi Đôi Cực Đông, VQG Núi Chúa). Có bằng cứu hộ biển và kỹ năng định vị ghềnh đá.',
     2019, 'Nhảy ghềnh đá ven biển, Cắm trại bãi hoang, Lặn ngắm san hô, Sơ cứu say nắng', 'Tiếng Việt, Tiếng Anh', '0915667788', 'quocbao.guide@trekkingcamping.com', true, NULL),
    (7, 'HDV-007', 'Vũ Minh Thảo', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
     'Nữ thủ lĩnh dày dạn kinh nghiệm trên các sống núi Tây Bắc trên 2.800m như Bạch Mộc Lương Tử, Tà Xùa, Lảo Thẩn. Tận tâm điều tiết nhịp thở và hỗ trợ đoàn.',
     2018, 'Trekking núi cao Tây Bắc, Rừng rêu cổ thụ, Nhiếp ảnh săn mây', 'Tiếng Việt, Tiếng Anh', '0932778899', 'minhthao.guide@trekkingcamping.com', true, NULL),
    (8, 'HDV-008', 'Lê Hoàng Minh Quân', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
     'Chuyên dẫn cung rừng mưa nhiệt đới Đông Nam Bộ và mái nhà Tây Nguyên Chư Yang Sin. Am hiểu kỹ năng sinh tồn, xử lý côn trùng và băng rừng dài ngày.',
     2017, 'Rừng nguyên sinh, Chèo SUP hồ núi, Định vị GPS, Nấu ăn dã ngoại', 'Tiếng Việt, Tiếng Anh', '0978445566', 'minhquan.guide@trekkingcamping.com', true, NULL)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    specialties = EXCLUDED.specialties,
    languages = EXCLUDED.languages,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    active = EXCLUDED.active;

-- 2. Bổ sung 8 Tour mới đa dạng miền, thời lượng và độ khó (id 7..14)
INSERT INTO tours (
    id, title, slug, summary, description, location, duration_days, duration_nights, difficulty_level,
    price_per_pax, max_capacity, is_active, emergency_hotline, insurance_info, safety_tips, required_gear,
    trek_distance_km, trek_total_ascent_m, trek_max_altitude_m, trek_active_hours, trek_medical_hours,
    trek_customers_per_guide, trek_pickup, trek_assembly, trek_months, trek_requirements, trek_source,
    trek_verified_on, created_at, updated_at
)
VALUES
    (7, 'Tà Xùa - Sống Lưng Khủng Long & Rừng Rêu Cổ Thụ', 'ta-xua-song-lung-khung-long',
     'Chinh phục sống núi Háng Đồng lơ lửng giữa biển mây cuồn cuộn và bước vào khu rừng rêu nguyên sinh huyền bí vùng Bắc Yên.',
     'Cung đường trekking 2 ngày 1 đêm kết hợp ngắm mây trên Sống Lưng Khủng Long nổi tiếng và xuyên tán rừng rêu đỗ quyên phủ kín địa y xanh thẫm.',
     'Bắc Yên, Sơn La', 2, 1, 2, 2450000, 16, true, '0212-3860-115',
     'Bảo hiểm du lịch mạo hiểm mức 80.000.000 VNĐ/người.',
     'Đoạn sống núi hai bên là dốc sâu và gió lớn, luôn giữ ba điểm tiếp xúc và đi đúng lối mòn.',
     'Giày trekking bám bùn đất, Áo gió chống thấm, Găng tay leo núi, Đèn pin đội đầu, Túi giữ nhiệt.',
     18.0, 1150, 2865, 6.5, 3.0, 5, '06:30 sáng tại Trung tâm Thị trấn Bắc Yên (Sơn La)', 'Bến xe Mỹ Đình (Hà Nội) / Bắc Yên',
     '10,11,12,01,02,03,04', 'Thể lực trung bình khá, không sợ độ cao, đi bộ dốc liên tục 5-6 giờ/ngày.',
     'Khảo sát thực địa cung Hang Chú - Bản Công 2026.', DATE '2026-10-25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (8, 'Bạch Mộc Lương Tử (Kỳ Quan San) - Chạm Đỉnh Biển Mây', 'bach-moc-luong-tu-3n2d',
     'Thử thách bản thân trên cung đường Top 4 đỉnh núi cao nhất Việt Nam với điểm ngắm bình minh Núi Muối 2.100m huyền thoại.',
     'Hành trình 3 ngày 2 đêm băng qua rừng trúc lùn, vách đá dựng đứng và biển mây bất tận nối liền Lai Châu và Lào Cai lên chóp 3.046m.',
     'Bát Xát, Lào Cai - Lai Châu', 3, 2, 3, 4250000, 12, true, '0214-3882-999',
     'Bảo hiểm mạo hiểm nâng cao mức đền bù tối đa 150.000.000 VNĐ.',
     'Thời tiết trên lán 2.100m và đỉnh 3.046m rét buốt về đêm (3-8°C), tuyệt đối giữ khô áo giữ nhiệt.',
     'Giày cổ cao chống lật cổ chân, Áo lông vũ, Quần áo giữ nhiệt, Gậy trekking đôi, Miếng dán nhiệt.',
     30.0, 2050, 3046, 8.5, 4.5, 4, '06:00 sáng tại Bản Kỳ Quan San (Sàng Ma Sáo, Bát Xát)', 'TP. Lào Cai / Thị xã Sa Pa',
     '10,11,12,01,02,03', 'Đã có kinh nghiệm trekking ít nhất 1 cung núi trên 2.000m, tim mạch và khớp gối tốt.',
     'Quy chuẩn an toàn tuyến leo núi Bát Xát - Phong Thổ.', DATE '2026-10-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (9, 'Trekking Vườn Quốc Gia Núi Chúa & Vịnh Vĩnh Hy', 'nui-chua-vinh-hy',
     'Khám phá hệ sinh thái rừng khô hạn độc nhất Đông Nam Á, cắm trại bên Công viên Đá ven biển và lặn ngắm san hô Vĩnh Hy.',
     'Sự kết hợp hiếm có giữa trekking xuyên rừng gai, chinh phục thảo nguyên đá triệu năm nhìn thẳng ra vịnh xanh ngọc bích và đêm lửa trại bên sóng biển.',
     'Ninh Hải, Ninh Thuận', 2, 1, 2, 2550000, 16, true, '0259-3876-119',
     'Bảo hiểm du lịch rừng - biển mức 80.000.000 VNĐ.',
     'Nắng gió vùng bán sa mạc gắt vào trưa, cần bù điện giải liên tục và đội mũ rộng vành.',
     'Mũ chống nắng và khăn đa năng, Áo dài tay thoát mồ hôi, Bình nước 2L, Giày bám đá, Đồ bơi.',
     20.0, 880, 1039, 6.0, 2.0, 5, '07:00 sáng tại Trạm Kiểm lâm Thái An (VQG Núi Chúa)', 'TP. Phan Rang - Tháp Chàm',
     '01,02,03,04,05,06,07,08', 'Sức khỏe tốt, chịu nắng gió khá, biết bơi là lợi thế khi chèo kayak/lặn.',
     'Báo cáo tuyến sinh thái VQG Núi Chúa.', DATE '2026-10-24', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (10, 'Mũi Đôi Cực Đông - Đón Bình Minh Đầu Tiên Đất Liền', 'mui-doi-cuc-dong',
     'Băng qua đồi cát trắng Đầm Môn, rừng cây bụi ven biển và nhảy ghềnh đá hoa cương chạm chóp inox Cực Đông Tổ Quốc.',
     'Hành trình giàu cảm xúc đưa bạn qua bãi Cỏ Ống, cắm trại trên cát trắng Bãi Rạng và leo ghềnh đá lúc 4h30 sáng đón tia nắng đầu tiên Việt Nam.',
     'Vạn Ninh, Khánh Hòa', 2, 1, 2, 2650000, 15, true, '0258-3840-115',
     'Bảo hiểm du lịch thám hiểm mức 100.000.000 VNĐ.',
     'Khu vực nhảy ghềnh đá trơn khi thủy triều lên, bắt buộc đi theo dây an toàn và chỉ dẫn của Guide.',
     'Giày độ bám tốt trên đá granite, Găng tay vải dày, Bình nước tối thiểu 2.5L, Kem chống nắng, Đèn pin.',
     24.0, 450, 280, 7.0, 2.5, 5, '07:00 sáng tại Ngã ba Đầm Môn (Vạn Thạnh, Vạn Ninh)', 'TP. Nha Trang / Sân bay Cam Ranh',
     '01,02,03,04,05,06,07,08,09', 'Thể lực dẻo dai chịu được nắng gió đồi cát, khéo léo giữ thăng bằng trên ghềnh đá.',
     'Dữ liệu lộ trình Đầm Môn - Bãi Rạng cập nhật 2026.', DATE '2026-10-22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (11, 'Xuyên Rừng Nguyên Sinh Nam Cát Tiên & Bàu Sấu Hoang Dã', 'nam-cat-tien-bau-sau',
     'Hòa mình vào lá phổi xanh Nam Bộ, đi bộ dưới tán cổ thụ 500 năm tuổi, chèo thuyền ngắm cá sấu xiêm và trải nghiệm Night Safari.',
     'Tour sinh thái nhẹ nhàng phù hợp người mới bắt đầu và gia đình yêu thiên nhiên: đạp xe băng rừng, trekking 5km vào hồ Bàu Sấu yên bình và ngắm sao đêm.',
     'Tân Phú, Đồng Nai', 2, 1, 1, 1950000, 20, true, '0251-3669-228',
     'Bảo hiểm du lịch nội địa mức 60.000.000 VNĐ.',
     'Khu vực rừng ẩm có vắt và muỗi, sử dụng vớ chống vắt và không lại gần mép nước Bàu Sấu ngoài cầu gỗ.',
     'Giày thể thao hoặc giày trek nhẹ, Vớ dài chống vắt, Thuốc xịt côn trùng, Bình nước cá nhân, Ống nhòm.',
     14.0, 180, 220, 4.0, 1.5, 7, '08:00 sáng tại Cổng VQG Nam Cát Tiên (Tân Phú)', 'TP. Hồ Chí Minh (Quận 1 / Hàng Xanh)',
     '11,12,01,02,03,04,05,06', 'Phù hợp người mới bắt đầu, trẻ em từ 8 tuổi đi cùng phụ huynh.',
     'Thông tin bảo tồn VQG Cát Tiên.', DATE '2026-10-27', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (12, 'Núi Bà Đen Cung Ma Thiên Lãnh - Rèn Luyện Cuối Tuần', 'nui-ba-den-ma-thien-lanh',
     'Cung trek trong ngày lý tưởng gần Sài Gòn thử thách sức bền qua những tảng đá chồng kỳ vĩ đến chóp đỉnh 986m nóc nhà Nam Bộ.',
     'Chinh phục cung Ma Thiên Lãnh hoang sơ với nhiều đoạn leo dốc đá kỹ thuật dưới tán rừng mát, ăn trưa dã ngoại trên đỉnh và xuống bằng cung Cột Điện.',
     'TP. Tây Ninh, Tây Ninh', 1, 0, 2, 950000, 18, true, '0276-3822-119',
     'Bảo hiểm tai nạn dã ngoại mức 50.000.000 VNĐ.',
     'Nhiều hốc đá sâu và dốc đứng, không mang balo quá nặng và luôn kiểm tra độ bám của đá trước khi bước.',
     'Giày bám đá tốt, Găng tay chống trầy, Gậy leo núi, Nước điện giải 2L, Trái cây/Thanh năng lượng.',
     11.0, 920, 986, 6.5, 1.0, 6, '06:00 sáng tại Chân thung lũng Ma Thiên Lãnh (Tây Ninh)', 'TP. Hồ Chí Minh / Trung tâm Tây Ninh',
     '01,02,03,04,05,10,11,12', 'Có nền tảng thể lực đi bộ 4-5km, phù hợp luyện tập trước các chuyến núi cao.',
     'Khảo sát định kỳ đội dẫn đường Tây Ninh.', DATE '2026-10-28', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (13, 'Chư Yang Sin - Chinh Phục Mái Nhà Tây Nguyên', 'chu-yang-sin-mai-nha-tay-nguyen',
     'Hành trình 3 ngày 2 đêm xuyên rừng pơ mu cổ thụ, băng qua những thác nước trắng xóa chạm đỉnh 2.442m hùng vĩ nhất Đắk Lắk.',
     'Cung đường dành cho trekker yêu sự hoang sơ tuyệt đối với hệ sinh thái thông hai lá dẹt đặc hữu và thảm thực vật chuyển tầng rõ rệt từ 500m lên 2.442m.',
     'Krông Bông, Đắk Lắk', 3, 2, 3, 3950000, 12, true, '0262-3645-115',
     'Bảo hiểm mạo hiểm chuyên sâu mức 120.000.000 VNĐ.',
     'Đường dốc dài và ẩm ướt quanh năm, giữ khoảng cách an toàn khi vượt suối đá trơn.',
     'Giày trekking gai sâu, Vớ chống vắt, Balo có bọc chống mưa, Áo ấm ngủ đêm, Túi chống thấm đồ cá nhân.',
     36.0, 1850, 2442, 8.0, 4.0, 4, '06:30 sáng tại Trạm Kiểm lâm Krông Kmar (VQG Chư Yang Sin)', 'TP. Buôn Ma Thuột / Bến xe Krông Bông',
     '12,01,02,03,04', 'Thể lực bền bỉ, đã từng đi tour từ 2N1Đ trở lên, không ngại đường rừng nguyên sinh.',
     'Dữ liệu VQG Chư Yang Sin và handbook tour_chu_yang_sin.txt.', DATE '2026-10-29', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (14, 'Chèo SUP Bình Minh Hồ Tuyền Lâm & Glamping Rừng Thông', 'ho-tuyen-lam-sup-glamping',
     'Thư giãn cuối tuần giữa mặt hồ phẳng lặng phủ sương sớm, chèo SUP ngắm rừng lá phong và thưởng thức BBQ ấm cúng dưới tán thông Đà Lạt.',
     'Chuyến dã ngoại nhẹ nhàng cho nhóm bạn và gia đình: học kỹ thuật chèo ván đứng SUP cơ bản, đi bộ ven rừng thông 5km và nghỉ đêm lều glamping nệm êm.',
     'TP. Đà Lạt, Lâm Đồng', 2, 1, 1, 1650000, 20, true, '0263-3829-115',
     'Bảo hiểm du lịch và thể thao nước mức 60.000.000 VNĐ.',
     'Bắt buộc mặc áo phao đúng quy cách trong suốt thời gian chèo SUP trên hồ, giữ ấm sau khi lên bờ.',
     'Trang phục mau khô khi chèo SUP, Áo khoác len/lông vũ buổi tối, Giày sneaker êm, Kem chống nắng.',
     5.0, 120, 1500, 3.0, 0.5, 8, '13:30 chiều tại Bến Thuyền Tuyền Lâm (Đà Lạt)', 'Trung tâm TP. Đà Lạt',
     '01,02,03,04,05,06,07,08,09,10,11,12', 'Mọi lứa tuổi từ 7 tuổi, không yêu cầu biết bơi vì có áo phao & HDV kèm sát.',
     'Kiểm định an toàn thể thao nước Hồ Tuyền Lâm 2026.', DATE '2026-10-30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    description = EXCLUDED.description,
    location = EXCLUDED.location,
    duration_days = EXCLUDED.duration_days,
    duration_nights = EXCLUDED.duration_nights,
    difficulty_level = EXCLUDED.difficulty_level,
    price_per_pax = EXCLUDED.price_per_pax,
    max_capacity = EXCLUDED.max_capacity,
    is_active = EXCLUDED.is_active;

-- 3. Lịch trình theo ngày cho 8 tour mới (id 14..32)
INSERT INTO tour_itineraries (id, tour_id, day_number, title, description, created_at)
VALUES
    -- Tour 7: Tà Xùa (2 ngày)
    (14, 7, 1, 'Ngày 1: Bắc Yên - Sống Lưng Khủng Long - Rừng Rêu - Lán 2.500m', 'Đón đoàn tại Bắc Yên, di chuyển tới điểm xuất phát leo sống núi Háng Đồng. Xuyên qua rừng rêu nguyên sinh phủ địa y rậm rạp, ngắm biển mây hoàng hôn tại lán gỗ.', CURRENT_TIMESTAMP),
    (15, 7, 2, 'Ngày 2: Đón Bình Minh Trên Sống Núi - Chạm Đỉnh Gió - Trở Về', 'Chinh phục mỏm cao nhất Tà Xùa trong ánh nắng sớm. Thưởng thức bữa trưa nóng hổi cùng đồng bào Mông trước khi xuống núi trở về Bắc Yên.', CURRENT_TIMESTAMP),
    -- Tour 8: Bạch Mộc Lương Tử (3 ngày)
    (16, 8, 1, 'Ngày 1: Bản Kỳ Quan San - Dốc Trúc - Lán Núi Muối (2.100m)', 'Bắt đầu từ bản Kỳ Quan San qua suối đá và rừng thảo quả. Vượt dốc lên điểm hạ trại Núi Muối 2.100m kịp đón hoàng hôn đỏ rực giữa biển mây.', CURRENT_TIMESTAMP),
    (17, 8, 2, 'Ngày 2: Chạm Đỉnh Bạch Mộc Lương Tử 3.046m - Lán Núi Muối', '04:30 xuất phát chinh phục vách đá Sống Lưng Khủng Long Bạch Mộc. Đón khoảnh khắc chạm chóp 3.046m kiêu hãnh và quay lại Núi Muối nghỉ đêm.', CURRENT_TIMESTAMP),
    (18, 8, 3, 'Ngày 3: Ngắm Biển Mây Núi Muối - Xuống Núi Về Sa Pa', 'Thức dậy giữa biển mây ôm trọn Núi Muối, dùng bữa sáng nóng và trekking trở về bản Kỳ Quan San, xe đưa về Sa Pa.', CURRENT_TIMESTAMP),
    -- Tour 9: Núi Chúa - Vĩnh Hy (2 ngày)
    (19, 9, 1, 'Ngày 1: Rừng Khô Hạn Thái An - Đỉnh Đá Đỏ - Cắm Trại Bãi Thịt', 'Trekking xuyên vùng lõi VQG Núi Chúa ngắm thảm thực vật xương rồng độc đáo. Hạ trại bên bãi biển hoang sơ vắng bóng người.', CURRENT_TIMESTAMP),
    (20, 9, 2, 'Ngày 2: Công Viên Đá - Lặn San Hô Vịnh Vĩnh Hy - Kết Thúc', 'Tham quan Công viên Đá ven biển triệu năm tuổi, di chuyển ra vịnh Vĩnh Hy chèo kayak và lặn ngắm san hô trước khi kết thúc.', CURRENT_TIMESTAMP),
    -- Tour 10: Mũi Đôi Cực Đông (2 ngày)
    (21, 10, 1, 'Ngày 1: Đầm Môn - Đồi Cát - Rừng Bụi - Hạ Trại Bãi Rạng', 'Vượt qua những đồi cát vàng rực và đoạn đường rừng ven biển. Đến Bãi Rạng tắm biển xanh trong và thưởng thức BBQ hải sản tươi.', CURRENT_TIMESTAMP),
    (22, 10, 2, 'Ngày 2: Nhảy Ghềnh Đá Chạm Chóp Cực Đông - Đi Cano Về Bờ', '04:30 mang đèn pin vượt ghềnh đá hoa cương đến chóp inox Mũi Đôi đón ánh bình minh đầu tiên trên đất liền, về bờ bằng cano/đường bộ.', CURRENT_TIMESTAMP),
    -- Tour 11: Nam Cát Tiên - Bàu Sấu (2 ngày)
    (23, 11, 1, 'Ngày 1: Cây Tùng Cổ Thụ - Xuyên Rừng 5km - Hồ Bàu Sấu', 'Check-in cây Tùng 500 năm tuổi, trekking cung đường bằng phẳng vào Trạm Kiểm lâm Bàu Sấu. Chèo xuồng gỗ ngắm hoàng hôn cùng đàn cá sấu.', CURRENT_TIMESTAMP),
    (24, 11, 2, 'Ngày 2: Bình Minh Bàu Sấu - Đạp Xe Thăm Thú - Trở Về TP.HCM', 'Nghe tiếng vượn hót lúc rạng đông trên cầu gỗ, đạp xe trở ra khu trung tâm thăm Đảo Tiên trước khi lên xe về thành phố.', CURRENT_TIMESTAMP),
    -- Tour 12: Núi Bà Đen Ma Thiên Lãnh (1 ngày)
    (25, 12, 1, 'Ngày 1: Thung Lũng Ma Thiên Lãnh - Đỉnh 986m - Xuống Cung Cột Điện', '06:00 khởi động leo ghềnh đá Ma Thiên Lãnh xuyên tán cây rừng mát rượi. Chạm đỉnh núi Bà Đen 986m nghỉ trưa và hạ sơn theo đường Cột Điện.', CURRENT_TIMESTAMP),
    -- Tour 13: Chư Yang Sin (3 ngày)
    (26, 13, 1, 'Ngày 1: Krông Kmar - Rừng Thông Hai Lá Dẹt - Bãi Trại 1.600m', 'Xuất phát từ trạm kiểm lâm vượt thác Đắk Tua hùng vĩ, băng qua rừng thông cổ thụ quý hiếm đến bãi trại cao độ 1.600m.', CURRENT_TIMESTAMP),
    (27, 13, 2, 'Ngày 2: Chạm Đỉnh Chư Yang Sin 2.442m - Rừng Rêu Đỗ Quyên', 'Leo liên tục qua rừng lùn phủ rêu để chạm nóc nhà Tây Nguyên 2.442m trong sương mù bảng lảng, sau đó về lán thưởng thức cơm lam gà nướng.', CURRENT_TIMESTAMP),
    (28, 13, 3, 'Ngày 3: Vượt Suối Cạn - Quay Lại Trạm Kiểm Lâm Krông Kmar', 'Thu dọn trại đúng chuẩn Leave No Trace, đổ dốc về chân núi ngắm lại dòng thác xanh trong và dùng bữa trưa tổng kết.', CURRENT_TIMESTAMP),
    -- Tour 14: Hồ Tuyền Lâm SUP & Glamping (2 ngày)
    (29, 14, 1, 'Ngày 1: Nhận Lều Glamping - Đi Bộ Rừng Thông - Tiệc BBQ Sưởi Ấm', 'Check-in lều glamping view hồ Tuyền Lâm, đi bộ dạo rừng thông ven hồ 5km, tối quây quần bên bếp lửa nướng BBQ và nghe acoustic.', CURRENT_TIMESTAMP),
    (30, 14, 2, 'Ngày 2: Chèo SUP Đón Bình Minh Trên Mặt Hồ Sương - Rừng Lá Phong', '05:45 hạ thủy ván SUP lướt giữa mặt hồ tĩnh lặng đầy sương khói, ghé thăm rặng lá phong và dùng bữa sáng bên hồ trước khi check-out.', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 4. Lịch Khởi Hành (OPEN cho cuối 11/2026 - 01/2027 & CLOSED quá khứ 07-10/2026)
INSERT INTO tour_schedules (
    id, tour_id, departure_date, return_date, available_slots, status,
    pickup_at, pickup_point, guide_name, guide_phone, created_at
)
VALUES
    -- Lịch OPEN sắp tới (201..218)
    (201, 7, DATE '2026-11-21', DATE '2026-11-22', 12, 'OPEN', TIMESTAMP '2026-11-21 06:30:00', 'Trung tâm Thị trấn Bắc Yên, Sơn La', 'Vũ Minh Thảo', '0932778899', CURRENT_TIMESTAMP),
    (202, 7, DATE '2026-12-05', DATE '2026-12-06', 14, 'OPEN', TIMESTAMP '2026-12-05 06:30:00', 'Trung tâm Thị trấn Bắc Yên, Sơn La', 'Vũ Minh Thảo', '0932778899', CURRENT_TIMESTAMP),
    (203, 8, DATE '2026-11-27', DATE '2026-11-29', 9,  'OPEN', TIMESTAMP '2026-11-27 06:00:00', 'Bản Kỳ Quan San, Sàng Ma Sáo, Bát Xát', 'Vũ Minh Thảo', '0932778899', CURRENT_TIMESTAMP),
    (204, 8, DATE '2026-12-18', DATE '2026-12-20', 11, 'OPEN', TIMESTAMP '2026-12-18 06:00:00', 'Bản Kỳ Quan San, Sàng Ma Sáo, Bát Xát', 'Lê Hoàng Long', '0938112233', CURRENT_TIMESTAMP),
    (205, 9, DATE '2026-11-28', DATE '2026-11-29', 14, 'OPEN', TIMESTAMP '2026-11-28 07:00:00', 'Trạm Kiểm lâm Thái An, Ninh Hải, Ninh Thuận', 'Trần Quốc Bảo', '0915667788', CURRENT_TIMESTAMP),
    (206, 9, DATE '2026-12-26', DATE '2026-12-27', 16, 'OPEN', TIMESTAMP '2026-12-26 07:00:00', 'Trạm Kiểm lâm Thái An, Ninh Hải, Ninh Thuận', 'Trần Quốc Bảo', '0915667788', CURRENT_TIMESTAMP),
    (207, 10, DATE '2026-11-21', DATE '2026-11-22', 11, 'OPEN', TIMESTAMP '2026-11-21 07:00:00', 'Ngã ba Đầm Môn, Vạn Ninh, Khánh Hòa', 'Trần Quốc Bảo', '0915667788', CURRENT_TIMESTAMP),
    (208, 10, DATE '2027-01-01', DATE '2027-01-02', 13, 'OPEN', TIMESTAMP '2027-01-01 07:00:00', 'Ngã ba Đầm Môn, Vạn Ninh, Khánh Hòa', 'Trần Quốc Bảo', '0915667788', CURRENT_TIMESTAMP),
    (209, 11, DATE '2026-11-21', DATE '2026-11-22', 18, 'OPEN', TIMESTAMP '2026-11-21 08:00:00', 'Cổng VQG Nam Cát Tiên, Tân Phú, Đồng Nai', 'Lê Hoàng Minh Quân', '0978445566', CURRENT_TIMESTAMP),
    (210, 11, DATE '2026-12-12', DATE '2026-12-13', 20, 'OPEN', TIMESTAMP '2026-12-12 08:00:00', 'Cổng VQG Nam Cát Tiên, Tân Phú, Đồng Nai', 'Lê Hoàng Minh Quân', '0978445566', CURRENT_TIMESTAMP),
    (211, 12, DATE '2026-11-22', DATE '2026-11-22', 15, 'OPEN', TIMESTAMP '2026-11-22 06:00:00', 'Thung lũng Ma Thiên Lãnh, Tây Ninh', 'Lê Hoàng Minh Quân', '0978445566', CURRENT_TIMESTAMP),
    (212, 12, DATE '2026-12-06', DATE '2026-12-06', 18, 'OPEN', TIMESTAMP '2026-12-06 06:00:00', 'Thung lũng Ma Thiên Lãnh, Tây Ninh', 'Nguyễn Hoàng Nam', '0912345678', CURRENT_TIMESTAMP),
    (213, 13, DATE '2026-12-11', DATE '2026-12-13', 10, 'OPEN', TIMESTAMP '2026-12-11 06:30:00', 'Trạm Kiểm lâm Krông Kmar, Đắk Lắk', 'Phạm Vũ Linh', '0945223344', CURRENT_TIMESTAMP),
    (214, 13, DATE '2027-01-08', DATE '2027-01-10', 12, 'OPEN', TIMESTAMP '2027-01-08 06:30:00', 'Trạm Kiểm lâm Krông Kmar, Đắk Lắk', 'Đặng Hữu Tài', '0966334455', CURRENT_TIMESTAMP),
    (215, 14, DATE '2026-11-28', DATE '2026-11-29', 16, 'OPEN', TIMESTAMP '2026-11-28 13:30:00', 'Bến Thuyền Hồ Tuyền Lâm, Đà Lạt', 'Trần Thị Bích Ngọc', '0922334455', CURRENT_TIMESTAMP),
    (216, 14, DATE '2026-12-19', DATE '2026-12-20', 18, 'OPEN', TIMESTAMP '2026-12-19 13:30:00', 'Bến Thuyền Hồ Tuyền Lâm, Đà Lạt', 'Trần Thị Bích Ngọc', '0922334455', CURRENT_TIMESTAMP),
    -- Thêm lịch đầu tháng 01/2027 cho tour 1 và 3
    (217, 1, DATE '2027-01-09', DATE '2027-01-11', 16, 'OPEN', TIMESTAMP '2027-01-09 06:00:00', 'Ngã ba Tà Hine, Đức Trọng, Lâm Đồng', 'Nguyễn Hoàng Nam', '0912345678', CURRENT_TIMESTAMP),
    (218, 3, DATE '2027-01-16', DATE '2027-01-17', 12, 'OPEN', TIMESTAMP '2027-01-16 06:30:00', 'Cổng Trạm Tôn VQG Hoàng Liên, Sa Pa', 'Lê Hoàng Long', '0938112233', CURRENT_TIMESTAMP),

    -- Lịch quá khứ CLOSED (219..226) trải đều tháng 06-10/2026 phục vụ Review, Báo cáo chuyến đi & Biểu đồ doanh thu
    (219, 7,  DATE '2026-07-18', DATE '2026-07-19', 0, 'CLOSED', TIMESTAMP '2026-07-18 06:30:00', 'Thị trấn Bắc Yên, Sơn La', 'Vũ Minh Thảo', '0932778899', CURRENT_TIMESTAMP),
    (220, 8,  DATE '2026-08-14', DATE '2026-08-16', 0, 'CLOSED', TIMESTAMP '2026-08-14 06:00:00', 'Bản Kỳ Quan San, Bát Xát', 'Vũ Minh Thảo', '0932778899', CURRENT_TIMESTAMP),
    (221, 9,  DATE '2026-08-22', DATE '2026-08-23', 0, 'CLOSED', TIMESTAMP '2026-08-22 07:00:00', 'Trạm Kiểm lâm Thái An', 'Trần Quốc Bảo', '0915667788', CURRENT_TIMESTAMP),
    (222, 10, DATE '2026-09-12', DATE '2026-09-13', 0, 'CLOSED', TIMESTAMP '2026-09-12 07:00:00', 'Ngã ba Đầm Môn, Vạn Ninh', 'Trần Quốc Bảo', '0915667788', CURRENT_TIMESTAMP),
    (223, 11, DATE '2026-09-26', DATE '2026-09-27', 0, 'CLOSED', TIMESTAMP '2026-09-26 08:00:00', 'Cổng VQG Nam Cát Tiên', 'Lê Hoàng Minh Quân', '0978445566', CURRENT_TIMESTAMP),
    (224, 12, DATE '2026-10-04', DATE '2026-10-04', 0, 'CLOSED', TIMESTAMP '2026-10-04 06:00:00', 'Thung lũng Ma Thiên Lãnh', 'Lê Hoàng Minh Quân', '0978445566', CURRENT_TIMESTAMP),
    (225, 13, DATE '2026-06-19', DATE '2026-06-21', 0, 'CLOSED', TIMESTAMP '2026-06-19 06:30:00', 'Trạm Krông Kmar, Đắk Lắk', 'Phạm Vũ Linh', '0945223344', CURRENT_TIMESTAMP),
    (226, 14, DATE '2026-10-24', DATE '2026-10-25', 0, 'CLOSED', TIMESTAMP '2026-10-24 13:30:00', 'Bến Thuyền Hồ Tuyền Lâm', 'Trần Thị Bích Ngọc', '0922334455', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    departure_date = EXCLUDED.departure_date,
    return_date = EXCLUDED.return_date,
    available_slots = EXCLUDED.available_slots,
    status = EXCLUDED.status;

-- 5. Trang bị Tour (id 11..42)
INSERT INTO tour_gears (id, tour_id, gear_name, is_provided, rental_price)
VALUES
    (11, 7, 'Lều/Chăn ấm tiêu chuẩn lán núi Tây Bắc', true, 0),
    (12, 7, 'Áo mưa bộ dã ngoại chống gió rét', true, 0),
    (13, 7, 'Gậy trekking đôi hợp kim nhôm', false, 40000),
    (14, 7, 'Đèn pin đội đầu siêu sáng 350 Lumens', false, 30000),
    (15, 8, 'Đinh bám giày chống trượt vách băng/bùn', true, 0),
    (16, 8, 'Túi ngủ giữ ấm mức 0°C chuyên dụng', true, 0),
    (17, 8, 'Áo khoác lông vũ chịu lạnh núi cao', false, 90000),
    (18, 8, 'Balo trợ lực 45L kèm áo bọc chống nước', false, 80000),
    (19, 9, 'Lều cắm trại thông gió 2 cửa bãi biển', true, 0),
    (20, 9, 'Áo phao & Kính lặn ngắm san hô Vĩnh Hy', true, 0),
    (21, 9, 'Găng tay chống nắng UPF50+', false, 25000),
    (22, 9, 'Thảm cách nhiệt trải lều cá nhân', true, 0),
    (23, 10, 'Đèn pin đội đầu vượt ghềnh sáng sớm', true, 0),
    (24, 10, 'Lều dã ngoại Bãi Rạng & Nước ngọt tráng người', true, 0),
    (25, 10, 'Găng tay leo ghềnh đá bám tốt', true, 0),
    (26, 10, 'Gậy trekking gấp gọn', false, 35000),
    (27, 11, 'Vớ chống vắt rừng nhiệt đới Cát Tiên', true, 0),
    (28, 11, 'Xe đạp địa hình dạo rừng & Vé tàu/xuồng Bàu Sấu', true, 0),
    (29, 11, 'Ống nhòm quan sát chim thú hoang dã', false, 50000),
    (30, 11, 'Thuốc xịt chống côn trùng thảo mộc', true, 0),
    (31, 12, 'Găng tay leo đá chống trầy xước', true, 0),
    (32, 12, 'Nước điện giải & Bộ sơ cứu y tế nhóm', true, 0),
    (33, 12, 'Gậy leo dốc đá hỗ trợ đầu gối', false, 30000),
    (34, 13, 'Vớ chống vắt & Bạt che mưa rừng nguyên sinh', true, 0),
    (35, 13, 'Lều 2 lớp chống mưa lớn & Tấm cách nhiệt', true, 0),
    (36, 13, 'Balo 50L chống thấm chuyên sâu', false, 80000),
    (37, 13, 'Túi khô 20L đựng đồ điện tử qua suối', false, 35000),
    (38, 14, 'Ván SUP hơi, Mái chèo & Áo phao đạt chuẩn', true, 0),
    (39, 14, 'Lều Glamping nệm êm + Chăn ấm + Đèn lều', true, 0),
    (40, 14, 'Túi chống nước điện thoại khi chèo SUP', true, 0)
ON CONFLICT (id) DO UPDATE SET
    gear_name = EXCLUDED.gear_name,
    is_provided = EXCLUDED.is_provided,
    rental_price = EXCLUDED.rental_price;

-- 6. Bộ sưu tập Ảnh cho tất cả 14 tour (mỗi tour có 1 cover + 2 ảnh gallery, tổng 42 ảnh verified HTTP 200)
INSERT INTO tour_images (id, tour_id, image_url, is_cover, created_at)
VALUES
    -- Gallery bổ sung cho Tour 1..6 (id 7..18)
    (7,  1, 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (8,  1, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (9,  2, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (10, 2, 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (11, 3, 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (12, 3, 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (13, 4, 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (14, 4, 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (15, 5, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (16, 5, 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (17, 6, 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (18, 6, 'https://images.unsplash.com/photo-1537905569824-f89f14cceb68?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),

    -- Tour 7: Tà Xùa
    (19, 7, 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80', true,  CURRENT_TIMESTAMP),
    (20, 7, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (21, 7, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),

    -- Tour 8: Bạch Mộc Lương Tử
    (22, 8, 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80', true,  CURRENT_TIMESTAMP),
    (23, 8, 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (24, 8, 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),

    -- Tour 9: Núi Chúa - Vĩnh Hy
    (25, 9, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', true,  CURRENT_TIMESTAMP),
    (26, 9, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (27, 9, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),

    -- Tour 10: Mũi Đôi Cực Đông
    (28, 10, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80', true,  CURRENT_TIMESTAMP),
    (29, 10, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (30, 10, 'https://images.unsplash.com/photo-1537905569824-f89f14cceb68?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),

    -- Tour 11: Nam Cát Tiên - Bàu Sấu
    (31, 11, 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80', true,  CURRENT_TIMESTAMP),
    (32, 11, 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (33, 11, 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),

    -- Tour 12: Núi Bà Đen Ma Thiên Lãnh
    (34, 12, 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80', true,  CURRENT_TIMESTAMP),
    (35, 12, 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (36, 12, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),

    -- Tour 13: Chư Yang Sin
    (37, 13, 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=80', true,  CURRENT_TIMESTAMP),
    (38, 13, 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (39, 13, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),

    -- Tour 14: Hồ Tuyền Lâm SUP & Glamping
    (40, 14, 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1200&q=80', true,  CURRENT_TIMESTAMP),
    (41, 14, 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP),
    (42, 14, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80', false, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    image_url = EXCLUDED.image_url,
    is_cover = EXCLUDED.is_cover;

-- 7. Phân công HDV cho các lịch trình mới (id 101..120)
INSERT INTO schedule_guides (id, schedule_id, guide_id, role, response_status, responded_at)
VALUES
    (101, 201, 7, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (102, 202, 7, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (103, 203, 7, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (104, 204, 3, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (105, 205, 6, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (106, 206, 6, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (107, 207, 6, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (108, 208, 6, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (109, 209, 8, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (110, 210, 8, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (111, 211, 8, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (112, 212, 1, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (113, 213, 4, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (114, 214, 5, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (115, 215, 2, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (116, 216, 2, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (117, 219, 7, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (118, 220, 7, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (119, 221, 6, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (120, 222, 6, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (121, 223, 8, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (122, 224, 8, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (123, 225, 4, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (124, 226, 2, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 8. Đơn đặt tour đa tháng (id 101..114) & Thanh toán (id 101..114)
-- Tạo dữ liệu doanh thu trải đều tháng 06, 07, 08, 09, 10, 11/2026 trên biểu đồ Dashboard
INSERT INTO bookings (
    id, booking_code, user_id, schedule_id, number_of_pax, total_amount,
    contact_name, contact_email, contact_phone, medical_conditions,
    emergency_contact_name, emergency_contact_phone, special_requirements,
    status, participation_status, participation_revision, participation_deadline,
    passenger_revision, created_at, updated_at
)
VALUES
    -- Tháng 06/2026 (Chư Yang Sin - COMPLETED)
    (101, 'BK-202606-101', 4, 225, 2, 7900000, 'Trần Hoàng Minh', 'hoangminh@gmail.com', '0918123456', 'Bình thường', 'Trần Văn Hùng', '0918999888', 'Cần túi khô 20L', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-06-10 09:00:00', TIMESTAMP '2026-06-21 17:00:00'),
    -- Tháng 07/2026 (Tà Xùa - COMPLETED)
    (102, 'BK-202607-102', 5, 219, 3, 7350000, 'Lê Thủy Tiên', 'thuytien.le@gmail.com', '0934567890', 'Không có bệnh lý', 'Lê Minh Tuấn', '0934111222', 'Thuê 3 bộ gậy đôi', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-07-08 14:20:00', TIMESTAMP '2026-07-19 16:00:00'),
    -- Tháng 08/2026 (Bạch Mộc Lương Tử & Núi Chúa - COMPLETED)
    (103, 'BK-202608-103', 6, 220, 2, 8500000, 'Trần Đức Duy', 'ducduy.photo@gmail.com', '0977889900', 'Thể lực tốt', 'Nguyễn Thu Trang', '0977333444', 'Mang máy ảnh DSLR', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-08-03 10:15:00', TIMESTAMP '2026-08-16 17:30:00'),
    (104, 'BK-202608-104', 7, 221, 2, 5100000, 'Đặng Phương Anh', 'phuonganh.camp@gmail.com', '0905112233', 'Không', 'Đặng Quốc Bảo', '0905999000', 'Không ăn hải sản có vỏ 1 người', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-08-14 11:30:00', TIMESTAMP '2026-08-23 16:45:00'),
    -- Tháng 09/2026 (Mũi Đôi & Nam Cát Tiên - COMPLETED)
    (105, 'BK-202609-105', 8, 222, 2, 5300000, 'Phạm Tuấn Anh', 'tuananh.hiker@gmail.com', '0966445566', 'Tốt', 'Phạm Hồng Nhung', '0966222333', 'Về bờ bằng cano', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-09-02 15:00:00', TIMESTAMP '2026-09-13 15:00:00'),
    (106, 'BK-202609-106', 9, 223, 3, 5850000, 'Nguyễn Khánh Ly', 'khanhly.travel@gmail.com', '0988776655', 'Không', 'Nguyễn Văn An', '0988111999', 'Đoàn có 1 bé 10 tuổi', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-09-18 09:40:00', TIMESTAMP '2026-09-27 16:00:00'),
    -- Tháng 10/2026 (Núi Bà Đen & Hồ Tuyền Lâm - COMPLETED)
    (107, 'BK-202610-107', 3, 224, 4, 3800000, 'Nguyễn Văn Khám Phá', 'user@trekkingcamping.com', '0987654321', 'Không có bệnh lý', 'Nguyễn Thị Hoa', '0981112233', 'Đi theo nhóm bạn', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-01 08:20:00', TIMESTAMP '2026-10-04 17:30:00'),
    (108, 'BK-202610-108', 4, 226, 2, 3300000, 'Trần Hoàng Minh', 'hoangminh@gmail.com', '0918123456', 'Không', 'Trần Văn Hùng', '0918999888', 'Lều view thẳng mặt hồ', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-16 12:10:00', TIMESTAMP '2026-10-25 11:30:00'),
    -- Tháng 11/2026 (Lịch sắp tới - CONFIRMED & PENDING)
    (109, 'BK-202611-109', 5, 201, 2, 4900000, 'Lê Thủy Tiên', 'thuytien.le@gmail.com', '0934567890', 'Bình thường', 'Lê Minh Tuấn', '0934111222', 'Cần thêm gậy trekking', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-11-04 10:00:00', CURRENT_TIMESTAMP),
    (110, 'BK-202611-110', 7, 207, 2, 5300000, 'Đặng Phương Anh', 'phuonganh.camp@gmail.com', '0905112233', 'Không', 'Đặng Quốc Bảo', '0905999000', 'Đặt thêm áo phao', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-11-07 14:25:00', CURRENT_TIMESTAMP),
    (111, 'BK-202611-111', 8, 215, 2, 3300000, 'Phạm Tuấn Anh', 'tuananh.hiker@gmail.com', '0966445566', 'Không', 'Phạm Hồng Nhung', '0966222333', 'Yêu cầu hướng dẫn chèo SUP người mới', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-11-09 16:40:00', CURRENT_TIMESTAMP),
    (112, 'BK-202611-112', 6, 203, 1, 4250000, 'Trần Đức Duy', 'ducduy.photo@gmail.com', '0977889900', 'Ổn định', 'Nguyễn Thu Trang', '0977333444', 'Cần áo ấm âm độ', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-11-10 09:30:00', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    participation_status = EXCLUDED.participation_status;

INSERT INTO payment_transactions (id, booking_id, transaction_code, payment_method, amount, status, paid_at)
VALUES
    (101, 101, 'VNP-20260610-101', 'VNPAY_SANDBOX', 7900000, 'SUCCESS', TIMESTAMP '2026-06-10 09:05:00'),
    (102, 102, 'VNP-20260708-102', 'VNPAY_SANDBOX', 7350000, 'SUCCESS', TIMESTAMP '2026-07-08 14:25:00'),
    (103, 103, 'VNP-20260803-103', 'VNPAY_SANDBOX', 8500000, 'SUCCESS', TIMESTAMP '2026-08-03 10:20:00'),
    (104, 104, 'MOMO-20260814-104', 'MOMO_SANDBOX', 5100000, 'SUCCESS', TIMESTAMP '2026-08-14 11:34:00'),
    (105, 105, 'VNP-20260902-105', 'VNPAY_SANDBOX', 5300000, 'SUCCESS', TIMESTAMP '2026-09-02 15:05:00'),
    (106, 106, 'MOMO-20260918-106', 'MOMO_SANDBOX', 5850000, 'SUCCESS', TIMESTAMP '2026-09-18 09:44:00'),
    (107, 107, 'VNP-20261001-107', 'VNPAY_SANDBOX', 3800000, 'SUCCESS', TIMESTAMP '2026-10-01 08:25:00'),
    (108, 108, 'VNP-20261016-108', 'VNPAY_SANDBOX', 3300000, 'SUCCESS', TIMESTAMP '2026-10-16 12:15:00'),
    (109, 109, 'VNP-20261104-109', 'VNPAY_SANDBOX', 4900000, 'SUCCESS', TIMESTAMP '2026-11-04 10:05:00'),
    (110, 110, 'MOMO-20261107-110', 'MOMO_SANDBOX', 5300000, 'SUCCESS', TIMESTAMP '2026-11-07 14:30:00'),
    (111, 111, 'VNP-20261109-111', 'VNPAY_SANDBOX', 3300000, 'SUCCESS', TIMESTAMP '2026-11-09 16:45:00'),
    (112, 112, 'VNP-20261110-112', 'VNPAY_SANDBOX', 4250000, 'SUCCESS', TIMESTAMP '2026-11-10 09:35:00')
ON CONFLICT (id) DO UPDATE SET
    transaction_code = EXCLUDED.transaction_code,
    payment_method = EXCLUDED.payment_method,
    status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    paid_at = EXCLUDED.paid_at;

-- 9. Đánh giá Tour (Tour Reviews - id 101..110)
INSERT INTO tour_reviews (id, tour_id, user_id, booking_id, rating, comment, is_verified_buyer, is_approved, created_at)
VALUES
    (101, 13, 4, 101, 5, 'Chư Yang Sin thực sự hoang sơ và hùng vĩ. Rừng thông 2 lá dẹt rất ấn tượng, anh Linh guide giữ nhịp đi cực chuẩn giúp cả đoàn về trạm an toàn.', true, true, TIMESTAMP '2026-06-22 10:00:00'),
    (102, 7,  5, 102, 5, 'Sống lưng khủng long Tà Xùa săn mây sáng sớm đẹp ná thở! Rừng rêu ma mị như cổ tích. Chị Thảo hỗ trợ đoàn rất nhiệt tình.', true, true, TIMESTAMP '2026-07-20 14:00:00'),
    (103, 8,  6, 103, 5, 'Cảnh bình minh ở đồi Núi Muối trên đường lên Bạch Mộc Lương Tử xứng đáng 10/10! Đường khá dốc và dài nhưng cảm giác lên chóp 3.046m quá tự hào.', true, true, TIMESTAMP '2026-08-17 09:30:00'),
    (104, 9,  7, 104, 4, 'Cung Núi Chúa nắng gió đúng chất bán sa mạc nhưng view vịnh Vĩnh Hy nhìn từ trên đỉnh cực kỳ đã mắt. Tối BBQ bên bãi biển rất vui.', true, true, TIMESTAMP '2026-08-24 11:20:00'),
    (105, 10, 8, 105, 5, 'Khoảnh khắc đứng ở Mũi Đôi Cực Đông đón tia nắng đầu tiên của đất nước thật khó quên! Đoạn nhảy ghềnh đá có anh Bảo guide chỉ từng bước nên rất an toàn.', true, true, TIMESTAMP '2026-09-14 08:45:00'),
    (106, 11, 9, 106, 5, 'Rừng Nam Cát Tiên rất xanh và dễ đi, bé nhà mình 10 tuổi rất thích đoạn đi thuyền trên hồ Bàu Sấu ngắm chim và cá sấu từ xa.', true, true, TIMESTAMP '2026-09-28 16:15:00'),
    (107, 12, 3, 107, 4, 'Cung Ma Thiên Lãnh nhiều đoạn leo ghềnh đá phê thực sự, hợp đi cuối tuần rèn thể lực. Chỉ mất 1 ngày từ Sài Gòn rất tiện lợi.', true, true, TIMESTAMP '2026-10-05 19:00:00'),
    (108, 14, 4, 108, 5, 'Sáng sớm chèo SUP trên mặt hồ Tuyền Lâm mờ sương như tranh thủy mặc, lều glamping sạch và ấm. Tuyệt vời để recharge sau tuần làm việc!', true, true, TIMESTAMP '2026-10-26 10:30:00'),
    -- Duyệt thêm review Tour 4 & 6 lên trang chủ
    (109, 7,  7, 109, 5, 'Chuẩn bị trước chuyến Tà Xùa tháng 11 rất chu đáo, nhân viên tư vấn check ảnh giày qua AI giúp mình đổi kịp đôi giày bám bùn.', true, false, CURRENT_TIMESTAMP),
    (110, 10, 5, 110, 5, 'Lịch khởi hành Mũi Đôi linh hoạt, phản hồi xác nhận vé rất nhanh.', true, false, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    is_approved = EXCLUDED.is_approved;

-- 10. Báo cáo chuyến đi mẫu bổ sung (id 101..103 cho lịch 219, 220, 222)
INSERT INTO guide_trip_reports (id, schedule_id, guide_id, summary, incidents, suggestions, status, admin_note, reviewed_by, created_at, reviewed_at)
VALUES
    (101, 219, 7, 'Đoàn 12 khách hoàn thành tuyến Tà Xùa - Sống lưng khủng long đúng giờ, thời tiết có biển mây dày lúc 06h30.',
     'Có 1 đoạn sình trơn sau mưa đêm tại dốc rừng rêu, đã hỗ trợ gậy và bọc giày an toàn cho cả đoàn.',
     'Nên nhắc khách chuẩn bị vớ dài và bao balo chống mưa kỹ vào tháng 7-8.', 'REVIEWED', 'Đã ghi nhận vào checklist chuẩn bị Tà Xùa.', 'admin@trekkingcamping.com', TIMESTAMP '2026-07-19 20:00:00', TIMESTAMP '2026-07-20 09:00:00'),
    (102, 220, 7, 'Đoàn 8 khách chạm đỉnh Bạch Mộc Lương Tử 3.046m lúc 09h45, sức khỏe cả đoàn ổn định, quay về lán Núi Muối đúng lịch.',
     'Nhiệt độ ban đêm xuống 6°C, 2 khách hơi lạnh bàn chân đã được cấp miếng dán nhiệt dự phòng.',
     'Tăng thêm 2 bộ miếng dán giữ nhiệt trong túi y tế đoàn cho tuyến trên 3.000m.', 'REVIEWED', 'Đã cập nhật định mức túi y tế mùa đông.', 'admin@trekkingcamping.com', TIMESTAMP '2026-08-16 21:00:00', TIMESTAMP '2026-08-17 10:00:00'),
    (103, 222, 6, 'Đoàn 10 khách chinh phục Mũi Đôi Cực Đông đón bình minh thành công lúc 05h28, quay về bờ bằng cano lúc 10h00.',
     'Không có sự cố chấn thương; có 1 khách hết nước sớm ở đoạn đồi cát đã được tiếp nước từ porter.',
     'Nhấn mạnh yêu cầu mỗi khách mang tối thiểu 2.5L nước trước giờ xuất phát Đầm Môn.', 'SUBMITTED', NULL, NULL, TIMESTAMP '2026-09-13 18:30:00', NULL)
ON CONFLICT (id) DO NOTHING;

-- 11. Yêu thích tour mẫu (Tour Favorites)
INSERT INTO tour_favorites (tour_id, user_id, created_at)
VALUES
    (1, 3, CURRENT_TIMESTAMP),
    (3, 3, CURRENT_TIMESTAMP),
    (7, 3, CURRENT_TIMESTAMP),
    (10, 3, CURRENT_TIMESTAMP),
    (8, 4, CURRENT_TIMESTAMP),
    (14, 4, CURRENT_TIMESTAMP),
    (7, 5, CURRENT_TIMESTAMP),
    (11, 5, CURRENT_TIMESTAMP)
ON CONFLICT (tour_id, user_id) DO NOTHING;

-- 12. Xóa cache TOUR_INFO cũ để SemanticTourSearchService / DataIngestionService tự nạp lại toàn bộ 14 tour
DELETE FROM vector_store WHERE metadata->>'category' = 'TOUR_INFO';

-- 13. Đồng bộ lại toàn bộ Sequences
SELECT setval(pg_get_serial_sequence('guides', 'id'), COALESCE(MAX(id), 1)) FROM guides;
SELECT setval(pg_get_serial_sequence('tours', 'id'), COALESCE(MAX(id), 1)) FROM tours;
SELECT setval(pg_get_serial_sequence('tour_itineraries', 'id'), COALESCE(MAX(id), 1)) FROM tour_itineraries;
SELECT setval(pg_get_serial_sequence('tour_schedules', 'id'), COALESCE(MAX(id), 1)) FROM tour_schedules;
SELECT setval(pg_get_serial_sequence('tour_gears', 'id'), COALESCE(MAX(id), 1)) FROM tour_gears;
SELECT setval(pg_get_serial_sequence('tour_images', 'id'), COALESCE(MAX(id), 1)) FROM tour_images;
SELECT setval(pg_get_serial_sequence('schedule_guides', 'id'), COALESCE(MAX(id), 1)) FROM schedule_guides;
SELECT setval(pg_get_serial_sequence('bookings', 'id'), COALESCE(MAX(id), 1)) FROM bookings;
SELECT setval(pg_get_serial_sequence('payment_transactions', 'id'), COALESCE(MAX(id), 1)) FROM payment_transactions;
SELECT setval(pg_get_serial_sequence('tour_reviews', 'id'), COALESCE(MAX(id), 1)) FROM tour_reviews;
SELECT setval(pg_get_serial_sequence('guide_trip_reports', 'id'), COALESCE(MAX(id), 1)) FROM guide_trip_reports;

COMMIT;
