-- ===================================================================
-- BỘ DỮ LIỆU SEED TOÀN DIỆN CHO DỰ ÁN TREKKING & CAMPING VIETNAM
-- Khởi tạo:
-- 1. Tài khoản Users (Admin, Guides, Khách du lịch)
-- 2. Hồ sơ Hướng Dẫn Viên Guides chuyên nghiệp
-- 3. Các Tour Trekking & Camping nổi tiếng (Tây Bắc, Tây Nguyên, Nam Bộ)
-- 4. Lịch trình chi tiết, Thiết bị & Bộ sưu tập ảnh
-- 5. Lịch khởi hành mở bán (Quá khứ & Tương lai)
-- 6. Đơn đặt tour Bookings (Confirmed, Completed, Pending review, Cancelled)
-- 7. Giao dịch thanh toán & Đối soát (Success, Pending đối soát, Refund required)
-- 8. Đánh giá Tour Reviews (Công khai & Chờ duyệt kiểm duyệt)
-- 9. Số liệu hoạt động AI Models (Metrics & Nhật ký hoạt động thời gian thực)
-- ===================================================================

BEGIN;

-- 0. Đảm bảo các bảng AI & Vector Store tồn tại
CREATE TABLE IF NOT EXISTS vector_store (
    id UUID PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding TEXT
);
CREATE INDEX IF NOT EXISTS idx_vector_store_source_file ON vector_store ((metadata->>'source_file'));
CREATE INDEX IF NOT EXISTS idx_vector_store_category ON vector_store ((metadata->>'category'));

CREATE TABLE IF NOT EXISTS ai_configuration (
    id INTEGER PRIMARY KEY CHECK(id=1),
    revision BIGINT NOT NULL DEFAULT 0,
    document TEXT NOT NULL
);
INSERT INTO ai_configuration(id, revision, document) VALUES(1, 0, '{}') ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_model_metrics (
    model_id VARCHAR(100) PRIMARY KEY,
    calls BIGINT NOT NULL DEFAULT 0,
    failures BIGINT NOT NULL DEFAULT 0,
    total_millis BIGINT NOT NULL DEFAULT 0,
    last_error VARCHAR(255),
    last_call TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_model_activities (
    id BIGSERIAL PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(50),
    duration_ms BIGINT DEFAULT 0,
    status VARCHAR(20),
    error_code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. Roles cơ bản
INSERT INTO roles (id, name)
VALUES 
    (1, 'ROLE_GUIDE'),
    (2, 'ROLE_ADMIN'),
    (3, 'ROLE_USER')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Khởi tạo Users
-- Mật khẩu mặc định: admin123 / guide123 / user123 (BCrypt hash)
-- $2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa
INSERT INTO users (id, email, password, full_name, phone, role_id, is_active, auth_version, created_at, updated_at)
VALUES
    (1, 'admin@trekkingcamping.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Quản Trị Viên Hệ Thống', '0901234567', 2, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'guide@trekkingcamping.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Nguyễn Hoàng Nam (Lead Guide)', '0912345678', 1, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'user@trekkingcamping.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Nguyễn Văn Khám Phá', '0987654321', 3, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 'hoangminh@gmail.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Trần Hoàng Minh', '0918123456', 3, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (5, 'thuytien.le@gmail.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Lê Thủy Tiên', '0934567890', 3, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (6, 'ducduy.photo@gmail.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Trần Đức Duy', '0977889900', 3, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (7, 'phuonganh.camp@gmail.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Đặng Phương Anh', '0905112233', 3, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (8, 'tuananh.hiker@gmail.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Phạm Tuấn Anh', '0966445566', 3, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (9, 'khanhly.travel@gmail.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Nguyễn Khánh Ly', '0988776655', 3, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (10, 'guide_long@trekkingcamping.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Lê Hoàng Long (Alpine Guide)', '0938112233', 1, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (11, 'guide_linh@trekkingcamping.com', '$2a$10$7E2vsrmoJqT8EkvuEa0LE.Zu3X8jxesRswaAVhQ5eIzO.wJUb0fQa', 'Phạm Vũ Linh (Forest Specialist)', '0945223344', 1, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role_id = EXCLUDED.role_id,
    is_active = EXCLUDED.is_active;

-- 3. Hồ sơ Hướng Dẫn Viên (Guides)
INSERT INTO guides (id, code, full_name, avatar_url, bio, experience_since, specialties, languages, phone, email, active, user_id)
VALUES
    (1, 'HDV-001', 'Nguyễn Hoàng Nam', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', 'Hơn 8 năm kinh nghiệm dẫn đoàn trekking các cung Tây Bắc và Nam Trung Bộ. Có chứng chỉ sơ cấp cứu nơi hoang dã WFR và cứu hộ vách núi.', 2018, 'Trekking núi cao, Săn mây, Sinh tồn rừng rậm', 'Tiếng Việt, Tiếng Anh', '0912345678', 'guide@trekkingcamping.com', true, 2),
    (2, 'HDV-002', 'Trần Thị Bích Ngọc', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', 'Chuyên gia hướng dẫn cắm trại gia đình, glamping và các tour khám phá thiên nhiên bền vững Leave No Trace.', 2020, 'Glamping, Cắm trại ven hồ, Chèo SUP, Ẩm thực dã ngoại', 'Tiếng Việt, Tiếng Pháp', '0922334455', 'ngoctran@trekkingcamping.com', true, NULL),
    (3, 'HDV-003', 'Lê Hoàng Long', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'Hơn 10 năm chinh phục và dẫn đoàn các đỉnh núi cao hiểm trở Tây Bắc (Fansipan, Lảo Thẩn, Bạch Mộc Lương Tử). Chứng chỉ cứu hộ vách núi và sinh tồn.', 2016, 'Leo núi độ cao lớn, Sinh tồn dã ngoại, Định vị địa hình', 'Tiếng Việt, Tiếng Anh', '0938112233', 'guide_long@trekkingcamping.com', true, 10),
    (4, 'HDV-004', 'Phạm Vũ Linh', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'Chuyên gia nghiên cứu hệ sinh thái rừng rêu Bidoup Núi Bà và rừng nhiệt đới Nam Cát Tiên. Nhiệt huyết và am hiểu các loài thảo mộc, chim muông.', 2019, 'Trekking rừng rêu, Diễn giải môi trường, Sơ cấp cứu hoang dã', 'Tiếng Việt, Tiếng Nhật', '0945223344', 'guide_linh@trekkingcamping.com', true, 11),
    (5, 'HDV-005', 'Đặng Hữu Tài', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80', 'Chuyên gia dẫn tour khám phá Thác K50 - Kon Chư Răng và các cung đường hiểm trở Tây Nguyên. Kỹ năng bơi lội, vượt thác và bảo hộ an toàn vượt trội.', 2017, 'Vượt thác, Băng rừng sâu, Chèo thuyền kayak, Nhiếp ảnh thiên nhiên', 'Tiếng Việt', '0966334455', 'danghuutai@trekkingcamping.com', true, NULL)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    bio = EXCLUDED.bio,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    user_id = EXCLUDED.user_id;

-- 4. 6 Tour Trekking & Cắm Trại Nổi Tiếng
INSERT INTO tours (
    id, title, slug, summary, description, location, duration_days, duration_nights, difficulty_level,
    price_per_pax, max_capacity, is_active, emergency_hotline, insurance_info, safety_tips, required_gear,
    trek_distance_km, trek_total_ascent_m, trek_max_altitude_m, trek_active_hours, trek_medical_hours,
    trek_customers_per_guide, trek_pickup, trek_assembly, trek_months, trek_requirements, trek_source,
    trek_verified_on, created_at, updated_at
)
VALUES
    (1, 'Tà Năng - Phan Dũng: Băng Rừng Cỏ Lau', 'ta-nang-phan-dung',
     'Cung đường trekking huyền thoại nối liền cao nguyên Lâm Đồng xuống duyên hải Bình Thuận qua những đồi cỏ nhấp nhô lộng gió.',
     'Hành trình dài 35km đưa bạn qua những cánh rừng thông bát ngát, sống lưng khủng long trập trùng và hạ trại ngắm biển sao trời tuyệt mỹ.',
     'Lâm Đồng - Bình Thuận', 3, 2, 2, 2800000, 16, true, '1800-1199',
     'Bảo hiểm du lịch mạo hiểm mức đền bù tối đa 100.000.000 VNĐ/vụ.',
     'Luôn đi theo hàng lối của Guide, không tự ý tách đoàn lội suối sâu mùa lũ.',
     'Giày trekking chuyên dụng bám đá, Balo trợ lực 45L-55L, Áo mưa bộ, Đèn pin đội đầu, Thuốc chống côn trùng.',
     35.0, 1100, 1100, 7.5, 3.0, 5, '06:00 sáng tại Ngã ba Tà Hine (Đức Trọng, Lâm Đồng)', 'Bến xe Miền Đông mới / Sân bay Liên Khương',
     '10,11,12,01,02,03', 'Yêu cầu thể lực tốt, có kinh nghiệm đi bộ liên tục trên 6 tiếng/ngày, không có tiền sử bệnh tim mạch hoặc hen suyễn cấp.',
     'Khảo sát thực địa và dữ liệu điều hành ban quản lý rừng phòng hộ Phan Dũng.', DATE '2026-10-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (2, 'Cắm Trại Săn Mây Đỉnh Lạc Dương', 'cam-trai-lac-duong',
     'Trải nghiệm Glamping sang trọng giữa rừng thông cổ thụ, ngắm trọn biển mây Đà Lạt bồng bềnh lúc rạng đông.',
     'Phù hợp cho các cặp đôi và gia đình muốn tận hưởng không khí trong lành se lạnh 15°C, tiệc nướng BBQ thơm lừng bên bếp lửa ấm.',
     'Lạc Dương, Đà Lạt', 2, 1, 1, 1450000, 20, true, '0263-3822-115',
     'Bảo hiểm du lịch nội địa mức 50.000.000 VNĐ.',
     'Nhiệt độ đêm xuống dưới 14°C, cần giữ ấm cơ thể.',
     'Áo khoác ấm, Giày thể thao êm chân, Bình giữ nhiệt cá nhân, Kem dưỡng ẩm.',
     6.0, 200, 1650, 3.0, 0.8, 8, '14:00 chiều tại Quảng trường Lâm Viên (Đà Lạt)', 'Trung tâm thành phố Đà Lạt',
     '01,02,03,04,05,06,07,08,09,10,11,12', 'Phù hợp mọi lứa tuổi, trẻ em từ 6 tuổi có người lớn đi kèm.',
     'Thực đơn và kiểm định lều trại định kỳ hàng tháng.', DATE '2026-10-18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (3, 'Chinh Phục Đỉnh Fansipan: Nóc Nhà Đông Dương', 'fansipan-noc-nha-dong-duong',
     'Cung đường leo bộ Trạm Tôn đưa bạn chạm tay vào chóp inox 3.143m đầy kiêu hãnh giữa biển mây Hoàng Liên Sơn.',
     'Vượt qua các tầng thực vật độc đáo từ rừng đỗ quyên cổ thụ rực rỡ đến những vách đá hùng vĩ thách thức ý chí người leo núi.',
     'Sa Pa, Lào Cai', 2, 1, 3, 3850000, 12, true, '0214-3871-223',
     'Bảo hiểm du lịch mức 100.000.000 VNĐ có điều khoản hỗ trợ trực thăng cứu hộ khẩn cấp.',
     'Tuân thủ tuyệt đối chỉ dẫn của Trưởng đoàn, không bước lùi khi chụp ảnh bên mép vực.',
     'Giày trekking cổ lửng, Gậy leo núi, Găng tay bám đá, Áo lông vũ siêu nhẹ, Miếng dán giữ nhiệt.',
     22.0, 2100, 3143, 8.5, 4.0, 4, '06:30 sáng tại Thị xã Sa Pa (Lào Cai)', 'Khách sạn trung tâm Sa Pa',
     '09,10,11,12,02,03,04', 'Thể lực bền bỉ, không sợ độ cao, có khả năng leo dốc đứng liên tục.',
     'Quy định ban quản lý VQG Hoàng Liên.', DATE '2026-10-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (4, 'Săn Mây Đỉnh Lảo Thẩn - Nóc Nhà Y Tý', 'lao-than-y-ty',
     'Cung đường săn mây bồng bềnh nhẹ nhàng, ngắm hoàng hôn rực lửa và ruộng bậc thang vàng óng vùng cao Tây Bắc.',
     'Được mệnh danh là cung trekking mở màn lý tưởng cho người mới bắt đầu với địa hình đồi trọc thoáng đãng và mỏm đá câu cá huyền thoại.',
     'Y Tý, Bát Xát, Lào Cai', 2, 1, 1, 2300000, 18, true, '0214-3882-115',
     'Bảo hiểm du lịch mạo hiểm mức 80.000.000 VNĐ.',
     'Gió trên sống núi rất mạnh, giữ chắc điện thoại và mũ khi chụp ảnh.',
     'Giày thể thao bám đất, Áo gió chống nước, Kính râm, Mũ tai bèo, Kem chống nắng.',
     16.0, 950, 2860, 5.0, 2.5, 6, '07:00 sáng tại UBND Xã Y Tý (Bát Xát)', 'Thị xã Sa Pa / TP. Lào Cai',
     '09,10,11,12,01,02,03,04', 'Sức khỏe bình thường, người mới bắt đầu trekking có thể tham gia dễ dàng.',
     'Khảo sát lộ trình của hợp tác xã du lịch cộng đồng Y Tý.', DATE '2026-10-12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (5, 'Xuyên Rừng Rêu Ma Mị Đỉnh Bidoup Núi Bà', 'rung-reu-bidoup-nui-ba',
     'Hành trình lạc vào thế giới cổ tích với những thân cây cổ thụ ngàn năm tuổi phủ đầy rêu phong và phong lan rừng tuyệt sắc.',
     'Trekking xuyên qua vùng lõi Vườn Quốc Gia Bidoup - Núi Bà, ngắm cụ cây Pơ Mu 1.300 năm tuổi và đu dây vượt sông Đa Nhim đầy phấn khích.',
     'Lạc Dương, Lâm Đồng', 2, 1, 2, 2600000, 15, true, '0263-3747-449',
     'Bảo hiểm du lịch mức 80.000.000 VNĐ.',
     'Rừng ẩm ướt nhiều vắt vào mùa mưa, bôi thuốc chống côn trùng cẩn thận trước khi xuất phát.',
     'Vớ chống vắt chuyên dụng, Áo mưa bộ, Balo chống nước, Giày gai bám bùn lầy, Thuốc cá nhân.',
     28.0, 1200, 2287, 6.5, 2.5, 5, '07:30 sáng tại Trung tâm du khách VQG Bidoup Núi Bà', 'TP. Đà Lạt',
     '11,12,01,02,03,04', 'Có thể lực tốt, quen đi bộ đường rừng dốc và ẩm ướt.',
     'Kế hoạch tuần tra ban quản lý Vườn Quốc Gia Bidoup - Núi Bà.', DATE '2026-10-10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    (6, 'Băng Rừng Chinh Phục Thác K50 - Hang Én', 'thac-k50-hang-en',
     'Hành trình thám hiểm ngọn thác đẹp bậc nhất Việt Nam ẩn mình giữa đại ngàn nguyên sinh Khu bảo tồn thiên nhiên Kon Chư Răng.',
     'Được chiêm ngưỡng dải lụa bạc khổng lồ cao 54m buông mình xuống thung lũng, cắm trại bên bờ suối và ngắm đàn chim én chao liệng trong hang đá.',
     'Kbang, Gia Lai', 2, 1, 2, 2700000, 14, true, '0269-3838-115',
     'Bảo hiểm du lịch mức 80.000.000 VNĐ.',
     'Đá quanh chân thác rêu trơn, luôn mặc áo phao khi tắm suối hoặc lại gần hồ nước.',
     'Giày lội suối thoát nước nhanh, Túi chống nước thiết bị điện tử, Đèn pin, Lều cá nhân, Thuốc chống vắt.',
     18.0, 600, 850, 5.5, 3.5, 5, '07:00 sáng tại Trạm Kiểm lâm Trại Bò (Kon Chư Răng)', 'Thị trấn Kbang / TP. Pleiku',
     '01,02,03,04,05,06', 'Biết bơi cơ bản, sức khỏe dẻo dai, yêu thích thiên nhiên hoang dã.',
     'Dữ liệu kiểm lâm Ban quản lý Khu BTTN Kon Chư Răng.', DATE '2026-10-08', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    description = EXCLUDED.description,
    price_per_pax = EXCLUDED.price_per_pax,
    max_capacity = EXCLUDED.max_capacity,
    is_active = EXCLUDED.is_active;

-- 5. Lịch Trình Tour (Itineraries)
INSERT INTO tour_itineraries (id, tour_id, day_number, title, description, created_at)
VALUES
    (1, 1, 1, 'Ngày 1: Tà Hine - Bìa Rừng - Đồi 2 Cây Thông', 'Xuất phát từ Tà Năng vượt qua thảo nguyên cỏ xanh ngát. Ăn trưa tại bìa rừng thông. Chiều lên dốc ngắm hoàng hôn rực rỡ và hạ trại đêm.', CURRENT_TIMESTAMP),
    (2, 1, 2, 'Ngày 2: Sống Lưng Khủng Long - Dốc Dầu - Suối Cạn', 'Đón bình minh trên đỉnh đồi lộng gió. Băng qua sống lưng khủng long nối tiếp sang địa phận Bình Thuận. Hạ trại bên bờ suối mát rượi.', CURRENT_TIMESTAMP),
    (3, 1, 3, 'Ngày 3: Rừng Khộp Phan Dũng - Điểm Hẹn Trở Về', 'Vượt những con suối nhỏ mát lành, bước ra khỏi cánh rừng khộp Phan Dũng đón xe trung chuyển và kết thúc hành trình.', CURRENT_TIMESTAMP),
    (4, 2, 1, 'Ngày 1: Check-in Glamping - Đi Rừng Thông - Tiệc BBQ Rượu Vang', 'Đón khách tại điểm hẹn, di chuyển vào chân núi Lạc Dương. Trekking nhẹ 3km ngắm suối Vàng. Buổi tối thưởng thức tiệc BBQ ấm cúng.', CURRENT_TIMESTAMP),
    (5, 2, 2, 'Ngày 2: Thức Giấc Săn Mây - Bữa Sáng Cà Phê - Check-out', 'Đón tia nắng đầu ngày cùng biển sương mây bồng bềnh 360 độ. Thưởng thức cà phê pha phin thơm nồng trước khi trở về trung tâm Đà Lạt.', CURRENT_TIMESTAMP),
    (6, 3, 1, 'Ngày 1: Trạm Tôn (1.800m) - Rừng Đỗ Quyên - Lán Nghỉ (2.800m)', 'Bắt đầu từ Trạm Tôn vượt qua các vách đá và rừng trúc. Ăn trưa dã ngoại giữa rừng và nghỉ đêm tại lán gỗ 2.800m.', CURRENT_TIMESTAMP),
    (7, 3, 2, 'Ngày 2: Chạm Đỉnh Nóc Nhà Đông Dương 3.143m - Trạm Tôn', 'Dậy sớm lúc 04:30 leo chặng cuối đón bình minh rực sáng trên đỉnh Fansipan. Nhận giấy chứng nhận và di chuyển xuống Trạm Tôn.', CURRENT_TIMESTAMP),
    (8, 4, 1, 'Ngày 1: Y Tý - Chân Núi - Hang Đá - Lán Nghỉ 2.500m', 'Leo dốc thảo nguyên thoải, ngắm ruộng bậc thang Y Tý mùa lúa chín. Chiều đến lán nghỉ ngắm hoàng hôn đỏ buông xuống biển mây.', CURRENT_TIMESTAMP),
    (9, 4, 2, 'Ngày 2: Chinh Phục Đỉnh 2.860m - Mỏm Đá Câu Cá - Về Y Tý', 'Đón bình minh kỳ vĩ trên đỉnh Lảo Thẩn, chụp ảnh tại mỏm đá câu cá huyền thoại và xuống núi dùng bữa trưa đặc sản vùng cao.', CURRENT_TIMESTAMP),
    (10, 5, 1, 'Ngày 1: Trạm Đa Nhim - Đu Phà Vượt Sông - Đỉnh 2.287m', 'Đu dây phà qua sông Đa Nhim, tiến sâu vào vùng lõi rừng rêu nguyên sinh. Chinh phục đỉnh Bidoup và cắm trại tại bãi trại VQG.', CURRENT_TIMESTAMP),
    (11, 5, 2, 'Ngày 2: Cây Pơ Mu 1.300 Năm Tuổi - Xuống Núi', 'Thăm cụ cây Pơ Mu cổ thụ ngàn năm, chiêm ngưỡng các loài phong lan rừng quý hiếm và kết thúc tại trạm Kiểm lâm.', CURRENT_TIMESTAMP),
    (12, 6, 1, 'Ngày 1: Trại Bò - Băng Rừng Kon Chư Răng - Cắm Trại Thác K50', 'Trekking 9km đường rừng râm mát, vượt suối nhỏ đến chân thác K50 hùng vĩ. Dựng lều bên tiếng thác đổ ầm vang giữa đại ngàn.', CURRENT_TIMESTAMP),
    (13, 6, 2, 'Ngày 2: Khám Phá Hang Én - Tắm Thác - Trở Về Trạm', 'Đi sâu vào vòm Hang Én ngắm đàn chim bay lượn, tắm suối mát lạnh và trekking trở ra điểm tập kết.', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 6. Lịch Khởi Hành (Tour Schedules)
INSERT INTO tour_schedules (
    id, tour_id, departure_date, return_date, available_slots, status,
    pickup_at, pickup_point, guide_name, guide_phone, created_at
)
VALUES
    -- Tour 1 Tà Năng
    (1, 1, DATE '2026-11-14', DATE '2026-11-16', 10, 'OPEN', TIMESTAMP '2026-11-14 06:00:00', 'Ngã ba Tà Hine, Đức Trọng, Lâm Đồng', 'Nguyễn Hoàng Nam', '0912345678', CURRENT_TIMESTAMP),
    (2, 1, DATE '2026-11-28', DATE '2026-11-30', 12, 'OPEN', TIMESTAMP '2026-11-28 06:00:00', 'Ngã ba Tà Hine, Đức Trọng, Lâm Đồng', 'Nguyễn Hoàng Nam', '0912345678', CURRENT_TIMESTAMP),
    (3, 1, DATE '2026-12-12', DATE '2026-12-14', 15, 'OPEN', TIMESTAMP '2026-12-12 06:00:00', 'Ngã ba Tà Hine, Đức Trọng, Lâm Đồng', 'Nguyễn Hoàng Nam', '0912345678', CURRENT_TIMESTAMP),
    -- Tour 2 Lạc Dương
    (4, 2, DATE '2026-11-07', DATE '2026-11-08', 16, 'OPEN', TIMESTAMP '2026-11-07 14:00:00', 'Quảng trường Lâm Viên, Đà Lạt', 'Trần Thị Bích Ngọc', '0922334455', CURRENT_TIMESTAMP),
    (5, 2, DATE '2026-11-21', DATE '2026-11-22', 18, 'OPEN', TIMESTAMP '2026-11-21 14:00:00', 'Quảng trường Lâm Viên, Đà Lạt', 'Trần Thị Bích Ngọc', '0922334455', CURRENT_TIMESTAMP),
    -- Tour 3 Fansipan
    (6, 3, DATE '2026-11-20', DATE '2026-11-21', 8, 'OPEN', TIMESTAMP '2026-11-20 06:30:00', 'Cổng Trạm Tôn VQG Hoàng Liên, Sa Pa', 'Lê Hoàng Long', '0938112233', CURRENT_TIMESTAMP),
    (7, 3, DATE '2026-12-04', DATE '2026-12-05', 10, 'OPEN', TIMESTAMP '2026-12-04 06:30:00', 'Cổng Trạm Tôn VQG Hoàng Liên, Sa Pa', 'Lê Hoàng Long', '0938112233', CURRENT_TIMESTAMP),
    -- Tour 4 Lảo Thẩn
    (8, 4, DATE '2026-11-14', DATE '2026-11-15', 14, 'OPEN', TIMESTAMP '2026-11-14 07:00:00', 'UBND Xã Y Tý, Bát Xát, Lào Cai', 'Lê Hoàng Long', '0938112233', CURRENT_TIMESTAMP),
    (9, 4, DATE '2026-12-19', DATE '2026-12-20', 16, 'OPEN', TIMESTAMP '2026-12-19 07:00:00', 'UBND Xã Y Tý, Bát Xát, Lào Cai', 'Lê Hoàng Long', '0938112233', CURRENT_TIMESTAMP),
    -- Tour 5 Bidoup
    (10, 5, DATE '2026-12-05', DATE '2026-12-06', 12, 'OPEN', TIMESTAMP '2026-12-05 07:30:00', 'Trung tâm du khách VQG Bidoup, Lâm Đồng', 'Phạm Vũ Linh', '0945223344', CURRENT_TIMESTAMP),
    -- Tour 6 K50
    (11, 6, DATE '2026-12-12', DATE '2026-12-13', 10, 'OPEN', TIMESTAMP '2026-12-12 07:00:00', 'Trạm Kiểm lâm Trại Bò, Kon Chư Răng', 'Đặng Hữu Tài', '0966334455', CURRENT_TIMESTAMP),
    -- Các lịch trình quá khứ (Past schedules) phục vụ các đơn đã hoàn thành
    (101, 1, DATE '2026-10-10', DATE '2026-10-12', 0, 'CLOSED', TIMESTAMP '2026-10-10 06:00:00', 'Ngã ba Tà Hine', 'Nguyễn Hoàng Nam', '0912345678', CURRENT_TIMESTAMP),
    (102, 2, DATE '2026-10-17', DATE '2026-10-18', 0, 'CLOSED', TIMESTAMP '2026-10-17 14:00:00', 'Quảng trường Lâm Viên', 'Trần Thị Bích Ngọc', '0922334455', CURRENT_TIMESTAMP),
    (103, 3, DATE '2026-10-24', DATE '2026-10-25', 0, 'CLOSED', TIMESTAMP '2026-10-24 06:30:00', 'Trạm Tôn Sa Pa', 'Lê Hoàng Long', '0938112233', CURRENT_TIMESTAMP),
    (104, 5, DATE '2026-10-15', DATE '2026-10-16', 0, 'CLOSED', TIMESTAMP '2026-10-15 07:30:00', 'Trung tâm VQG Bidoup', 'Phạm Vũ Linh', '0945223344', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    departure_date = EXCLUDED.departure_date,
    return_date = EXCLUDED.return_date,
    available_slots = EXCLUDED.available_slots,
    status = EXCLUDED.status;

-- 7. Tour Gears
INSERT INTO tour_gears (id, tour_id, gear_name, is_provided, rental_price)
VALUES
    (1, 1, 'Lều cắm trại 2 lớp chống gió mưa chuyên dụng', true, 0),
    (2, 1, 'Túi ngủ giữ ấm tiêu chuẩn dã ngoại', true, 0),
    (3, 1, 'Gậy trekking carbon trợ lực', false, 35000),
    (4, 1, 'Balo trợ lực dã ngoại 50L', false, 70000),
    (5, 2, 'Lều glamping nệm êm cao cấp', true, 0),
    (6, 2, 'Bếp nướng BBQ & Than hoa dã ngoại', true, 0),
    (7, 3, 'Gậy leo núi hấp thụ xung lực', true, 0),
    (8, 3, 'Áo khoác lông vũ chịu rét âm độ', false, 80000),
    (9, 5, 'Vớ chống vắt rừng rậm nhiệt đới', true, 0),
    (10, 6, 'Áo phao bảo hộ & Túi chống nước thiết bị', true, 0)
ON CONFLICT (id) DO UPDATE SET
    gear_name = EXCLUDED.gear_name,
    is_provided = EXCLUDED.is_provided,
    rental_price = EXCLUDED.rental_price;

-- 8. Tour Images
INSERT INTO tour_images (id, tour_id, image_url, is_cover, created_at)
VALUES
    (1, 1, 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', true, CURRENT_TIMESTAMP),
    (2, 2, 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80', true, CURRENT_TIMESTAMP),
    (3, 3, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', true, CURRENT_TIMESTAMP),
    (4, 4, 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80', true, CURRENT_TIMESTAMP),
    (5, 5, 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80', true, CURRENT_TIMESTAMP),
    (6, 6, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80', true, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    image_url = EXCLUDED.image_url,
    is_cover = EXCLUDED.is_cover;

-- 9. Gán phân công Guide (Schedule Guides)
INSERT INTO schedule_guides (id, schedule_id, guide_id, role, response_status, responded_at)
VALUES
    (1, 1, 1, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (2, 2, 1, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (3, 4, 2, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (4, 6, 3, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (5, 8, 3, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (6, 10, 4, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP),
    (7, 11, 5, 'LEAD', 'ACCEPTED', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 10. Đơn Đặt Tour Mẫu (Bookings)
INSERT INTO bookings (
    id, booking_code, user_id, schedule_id, number_of_pax, total_amount,
    contact_name, contact_email, contact_phone, medical_conditions,
    emergency_contact_name, emergency_contact_phone, special_requirements,
    status, participation_status, participation_revision, participation_deadline,
    passenger_revision, created_at, updated_at
)
VALUES
    -- Đơn đã hoàn thành trong quá khứ
    (1, 'BK-202610-001', 3, 101, 2, 5600000, 'Nguyễn Văn Khám Phá', 'user@trekkingcamping.com', '0987654321', 'Không có bệnh lý', 'Nguyễn Thị Hoa (Chị gái)', '0981112233', 'Ăn chay 1 người', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-01 10:00:00', TIMESTAMP '2026-10-12 18:00:00'),
    (2, 'BK-202610-002', 4, 102, 2, 2900000, 'Trần Hoàng Minh', 'hoangminh@gmail.com', '0918123456', 'Không', 'Trần Văn Hùng', '0918999888', 'Lều riêng cạnh bìa rừng', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-05 14:30:00', TIMESTAMP '2026-10-18 16:00:00'),
    (3, 'BK-202610-003', 5, 103, 1, 3850000, 'Lê Thủy Tiên', 'thuytien.le@gmail.com', '0934567890', 'Thể lực tốt', 'Lê Minh Tuấn', '0934111222', 'Cần mượn gậy trekking', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-12 09:15:00', TIMESTAMP '2026-10-25 17:30:00'),
    (4, 'BK-202610-004', 6, 104, 2, 5200000, 'Trần Đức Duy', 'ducduy.photo@gmail.com', '0977889900', 'Không', 'Nguyễn Thu Trang', '0977333444', 'Mang theo máy ảnh flycam', 'COMPLETED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-08 11:20:00', TIMESTAMP '2026-10-16 16:00:00'),

    -- Đơn đã xác nhận & thanh toán thành công (CONFIRMED)
    (5, 'BK-202611-005', 7, 1, 2, 5600000, 'Đặng Phương Anh', 'phuonganh.camp@gmail.com', '0905112233', 'Không có tiền sử bệnh tim', 'Đặng Quốc Bảo', '0905999000', 'Cần hỗ trợ porter gửi 1 balo', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-25 15:40:00', CURRENT_TIMESTAMP),
    (6, 'BK-202611-006', 8, 4, 4, 5800000, 'Phạm Tuấn Anh', 'tuananh.hiker@gmail.com', '0966445566', 'Bình thường', 'Phạm Hồng Nhung', '0966222333', 'Đi cùng gia đình có 1 bé 10 tuổi', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-26 10:10:00', CURRENT_TIMESTAMP),
    (7, 'BK-202611-007', 9, 6, 1, 3850000, 'Nguyễn Khánh Ly', 'khanhly.travel@gmail.com', '0988776655', 'Không có bệnh lý', 'Nguyễn Văn An', '0988111999', 'Chuẩn bị chứng nhận leo đỉnh', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-27 16:25:00', CURRENT_TIMESTAMP),
    (8, 'BK-202611-008', 4, 8, 2, 4600000, 'Trần Hoàng Minh', 'hoangminh@gmail.com', '0918123456', 'Không', 'Trần Văn Hùng', '0918999888', 'Cần thuê áo ấm âm độ', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-28 08:30:00', CURRENT_TIMESTAMP),
    (9, 'BK-202612-009', 5, 11, 2, 5400000, 'Lê Thủy Tiên', 'thuytien.le@gmail.com', '0934567890', 'Bình thường', 'Lê Minh Tuấn', '0934111222', 'Cần túi chống nước điện thoại', 'CONFIRMED', 'PASSED', 1, NULL, 1, TIMESTAMP '2026-10-29 13:00:00', CURRENT_TIMESTAMP),

    -- Đơn đang chờ duyệt thông tin tham gia (REVIEW_REQUIRED)
    (10, 'BK-202611-010', 6, 2, 2, 5600000, 'Trần Đức Duy', 'ducduy.photo@gmail.com', '0977889900', 'Có tiền sử đau khớp gối nhẹ khi leo dốc', 'Nguyễn Thu Trang', '0977333444', 'Cần tư vấn thêm độ dốc', 'PENDING', 'REVIEW_REQUIRED', 0, TIMESTAMP '2026-11-20 18:00:00', 0, TIMESTAMP '2026-10-29 17:00:00', CURRENT_TIMESTAMP),
    (11, 'BK-202612-011', 7, 10, 1, 2600000, 'Đặng Phương Anh', 'phuonganh.camp@gmail.com', '0905112233', 'Dị ứng phấn hoa rừng', 'Đặng Quốc Bảo', '0905999000', 'Chuẩn bị thuốc chống dị ứng riêng', 'PENDING', 'REVIEW_REQUIRED', 0, TIMESTAMP '2026-11-25 18:00:00', 0, TIMESTAMP '2026-10-30 08:45:00', CURRENT_TIMESTAMP),

    -- Đơn chờ thanh toán đối soát (PENDING Payments)
    (12, 'BK-202612-012', 8, 3, 1, 2800000, 'Phạm Tuấn Anh', 'tuananh.hiker@gmail.com', '0966445566', 'Sức khỏe tốt', 'Phạm Hồng Nhung', '0966222333', 'Không có', 'PENDING', NULL, 0, NULL, 0, TIMESTAMP '2026-10-30 11:20:00', CURRENT_TIMESTAMP),
    (13, 'BK-202611-013', 9, 5, 2, 2900000, 'Nguyễn Khánh Ly', 'khanhly.travel@gmail.com', '0988776655', 'Không', 'Nguyễn Văn An', '0988111999', 'Lều đôi riêng', 'PENDING', NULL, 0, NULL, 0, TIMESTAMP '2026-10-30 14:15:00', CURRENT_TIMESTAMP),

    -- Đơn hủy cần xử lý hoàn tiền (REFUND_REQUIRED)
    (14, 'BK-202611-014', 3, 1, 1, 2800000, 'Nguyễn Văn Khám Phá', 'user@trekkingcamping.com', '0987654321', 'Không', 'Nguyễn Thị Hoa', '0981112233', 'Khách bận công tác đột xuất báo trước 15 ngày', 'CANCELLED', NULL, 0, NULL, 0, TIMESTAMP '2026-10-20 09:00:00', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    participation_status = EXCLUDED.participation_status;

-- 11. Giao Dịch Thanh Toán & Đối Soát (Payment Transactions)
INSERT INTO payment_transactions (id, booking_id, transaction_code, payment_method, amount, status, paid_at)
VALUES
    -- Giao dịch đã thanh toán thành công (SUCCESS)
    (1, 1, 'VNP-20261010-001', 'VNPAY_SANDBOX', 5600000, 'SUCCESS', TIMESTAMP '2026-10-01 10:05:00'),
    (2, 2, 'VNP-20261017-002', 'VNPAY_SANDBOX', 2900000, 'SUCCESS', TIMESTAMP '2026-10-05 14:35:00'),
    (3, 3, 'VNP-20261024-003', 'VNPAY_SANDBOX', 3850000, 'SUCCESS', TIMESTAMP '2026-10-12 09:20:00'),
    (4, 4, 'VNP-20261015-004', 'VNPAY_SANDBOX', 5200000, 'SUCCESS', TIMESTAMP '2026-10-08 11:25:00'),
    (5, 5, 'VNP-20261114-005', 'VNPAY_SANDBOX', 5600000, 'SUCCESS', TIMESTAMP '2026-10-25 15:45:00'),
    (6, 6, 'VNP-20261107-006', 'VNPAY_SANDBOX', 5800000, 'SUCCESS', TIMESTAMP '2026-10-26 10:15:00'),
    (7, 7, 'VNP-20261120-007', 'VNPAY_SANDBOX', 3850000, 'SUCCESS', TIMESTAMP '2026-10-27 16:30:00'),
    (8, 8, 'VNP-20261114-008', 'VNPAY_SANDBOX', 4600000, 'SUCCESS', TIMESTAMP '2026-10-28 08:35:00'),
    (9, 9, 'VNP-20261212-009', 'VNPAY_SANDBOX', 5400000, 'SUCCESS', TIMESTAMP '2026-10-29 13:05:00'),

    -- Giao dịch đang chờ đối soát kết quả (PENDING)
    (10, 12, 'VN2026103011200007d0c5111918c9c76c161a66dc0bf23c', 'VNPAY_SANDBOX', 2800000, 'PENDING', NULL),
    (11, 13, 'VN2026103014150043e7e014d1e948bfc37f10e7b279f86c', 'VNPAY_SANDBOX', 2900000, 'PENDING', NULL),

    -- Giao dịch cần xử lý hoàn tiền (REFUND_REQUIRED)
    (12, 14, 'VNP-REFUND-2001', 'VNPAY_SANDBOX', 2800000, 'REFUND_REQUIRED', TIMESTAMP '2026-10-20 09:05:00'),

    -- Giao dịch lỗi / hết hạn (FAILED)
    (13, 10, 'VNP-FAIL-3001', 'VNPAY_SANDBOX', 5600000, 'FAILED', NULL)
ON CONFLICT (id) DO UPDATE SET
    transaction_code = EXCLUDED.transaction_code,
    payment_method = EXCLUDED.payment_method,
    status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    paid_at = EXCLUDED.paid_at;

-- 12. Đánh Giá Tour (Tour Reviews)
INSERT INTO tour_reviews (id, tour_id, user_id, booking_id, rating, comment, is_verified_buyer, is_approved, created_at)
VALUES
    (1, 1, 3, 1, 5, 'Cung đường Tà Năng - Phan Dũng mùa cỏ xanh bạt ngàn tuyệt đẹp. Hướng dẫn viên Nam giàu kinh nghiệm, chu đáo từ bữa ăn đến chỗ dựng lều. Rất đáng trải nghiệm!', true, true, TIMESTAMP '2026-10-13 09:00:00'),
    (2, 2, 4, 2, 5, 'Bãi cắm trại Lạc Dương chill vô cùng. Đồ nướng BBQ tối ngon tuyệt, sáng 5h30 thức dậy mở lều ra là trọn biển mây bồng bềnh. Chắc chắn sẽ quay lại cùng nhóm bạn.', true, true, TIMESTAMP '2026-10-19 10:30:00'),
    (3, 3, 5, 3, 5, 'Chạm đỉnh Fansipan bằng đôi chân của mình là cảm giác tự hào không thể tả. Đội ngũ dẫn tour chuẩn bị gậy trekking và đồ bảo hộ rất an toàn, hướng dẫn nhịp thở leo dốc bài bản.', true, true, TIMESTAMP '2026-10-26 14:15:00'),
    (4, 5, 6, 4, 5, 'Khu rừng rêu nguyên sinh Bidoup ma mị như xứ sở cổ tích. Cụ cây Pơ Mu ngàn năm tuổi sừng sững giữa rừng già. Cảm ơn anh Linh guide đã giải thích rất nhiều về thảm thực vật quý hiếm.', true, true, TIMESTAMP '2026-10-17 11:00:00'),
    (5, 1, 7, 5, 4, 'Đồi cỏ rất đẹp nhưng chặng dốc Dầu khá trơn và mỏi chân. May có gậy trợ lực và porter hỗ trợ hành lý. Mọi người nên rèn luyện thể lực ít nhất 2 tuần trước khi đi.', true, true, TIMESTAMP '2026-10-28 16:45:00'),
    (6, 2, 8, 6, 5, 'Không gian thanh bình, rất phù hợp cho gia đình có trẻ nhỏ. Dịch vụ lều glamping ấm cúng, nước ấm và đệm êm sạch sẽ ngoài mong đợi.', true, true, TIMESTAMP '2026-10-29 08:30:00'),
    (7, 3, 9, 7, 4, 'Thời tiết trên đỉnh lạnh buốt 2 độ C nhưng ngắm cờ đỏ sao vàng tung bay lúc bình minh thật thiêng liêng. Cơm lán 2.800m nóng hổi rất ấm bụng.', true, true, TIMESTAMP '2026-10-30 09:15:00'),

    -- Đánh giá đang chờ kiểm duyệt (is_approved = false) để Admin duyệt tại /admin/reviews
    (8, 4, 4, 8, 5, 'Lảo Thẩn săn mây đẹp xuất sắc, chụp ảnh mỏm đá câu cá bao ngầu. Guide Long chụp ảnh có tâm đỉnh chóp luôn!', true, false, TIMESTAMP '2026-10-30 10:00:00'),
    (9, 6, 5, 9, 5, 'Thác K50 nước đổ hùng vĩ như tranh vẽ, tắm suối mát rượi. Đồ nướng cá suối của anh Tài guide rất ngon. Cung đường băng rừng Kon Chư Răng tuyệt đỉnh!', true, false, TIMESTAMP '2026-10-30 11:30:00')
ON CONFLICT (id) DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    is_approved = EXCLUDED.is_approved;

-- 13. Khởi tạo Số Liệu Hoạt Động Của Từng Model AI (Metrics & Activities)
INSERT INTO ai_model_metrics (model_id, calls, failures, total_millis, last_error, last_call, updated_at)
VALUES
    ('gemini-3.5-flash-lite', 48, 0, 39800, NULL, CURRENT_TIMESTAMP - INTERVAL '3 minutes', CURRENT_TIMESTAMP),
    ('gemini-3.5-flash', 19, 1, 23400, '503', CURRENT_TIMESTAMP - INTERVAL '18 minutes', CURRENT_TIMESTAMP)
ON CONFLICT (model_id) DO UPDATE SET
    calls = EXCLUDED.calls,
    failures = EXCLUDED.failures,
    total_millis = EXCLUDED.total_millis,
    last_error = EXCLUDED.last_error,
    last_call = EXCLUDED.last_call,
    updated_at = EXCLUDED.updated_at;

INSERT INTO ai_model_activities (model_id, action_type, duration_ms, status, error_code, created_at)
VALUES
    ('gemini-3.5-flash-lite', 'STREAM_CHAT', 820, 'SUCCESS', NULL, CURRENT_TIMESTAMP - INTERVAL '3 minutes'),
    ('gemini-3.5-flash-lite', 'STREAM_CHAT', 760, 'SUCCESS', NULL, CURRENT_TIMESTAMP - INTERVAL '7 minutes'),
    ('gemini-3.5-flash-lite', 'STREAM_CHAT', 910, 'SUCCESS', NULL, CURRENT_TIMESTAMP - INTERVAL '12 minutes'),
    ('gemini-3.5-flash', 'STREAM_CHAT', 1350, 'SUCCESS', NULL, CURRENT_TIMESTAMP - INTERVAL '18 minutes'),
    ('gemini-3.5-flash', 'STREAM_CHAT', 1100, 'FAILED', '503', CURRENT_TIMESTAMP - INTERVAL '25 minutes'),
    ('gemini-3.5-flash-lite', 'STREAM_CHAT', 840, 'SUCCESS', NULL, CURRENT_TIMESTAMP - INTERVAL '32 minutes'),
    ('gemini-3.5-flash-lite', 'STREAM_CHAT', 690, 'SUCCESS', NULL, CURRENT_TIMESTAMP - INTERVAL '45 minutes'),
    ('gemini-3.5-flash-lite', 'STREAM_CHAT', 950, 'SUCCESS', NULL, CURRENT_TIMESTAMP - INTERVAL '58 minutes');

-- 14. Đặt lại Sequences cho tất cả các bảng
SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE(MAX(id), 1)) FROM roles;
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;
SELECT setval(pg_get_serial_sequence('guides', 'id'), COALESCE(MAX(id), 1)) FROM guides;
SELECT setval(pg_get_serial_sequence('tours', 'id'), COALESCE(MAX(id), 1)) FROM tours;
SELECT setval(pg_get_serial_sequence('tour_itineraries', 'id'), COALESCE(MAX(id), 1)) FROM tour_itineraries;
SELECT setval(pg_get_serial_sequence('tour_schedules', 'id'), COALESCE(MAX(id), 1)) FROM tour_schedules;
SELECT setval(pg_get_serial_sequence('tour_gears', 'id'), COALESCE(MAX(id), 1)) FROM tour_gears;
SELECT setval(pg_get_serial_sequence('tour_images', 'id'), COALESCE(MAX(id), 1)) FROM tour_images;
SELECT setval(pg_get_serial_sequence('bookings', 'id'), COALESCE(MAX(id), 1)) FROM bookings;
SELECT setval(pg_get_serial_sequence('payment_transactions', 'id'), COALESCE(MAX(id), 1)) FROM payment_transactions;
SELECT setval(pg_get_serial_sequence('tour_reviews', 'id'), COALESCE(MAX(id), 1)) FROM tour_reviews;
SELECT setval(pg_get_serial_sequence('ai_model_activities', 'id'), COALESCE(MAX(id), 1)) FROM ai_model_activities;

COMMIT;
