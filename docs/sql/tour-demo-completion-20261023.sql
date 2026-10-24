-- Explicit user-approved synthetic data. Run inside a transaction after an external backup.
-- Not an application migration. No real operator departures or medical eligibility claims.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';
LOCK TABLE tours,tour_schedules,bookings,tour_itineraries,tour_gears,tour_images IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE t tours%ROWTYPE; route integer; d integer; dep date; need integer; inserted integer;
        requirement text; kit text; marker text := '[DEMO-20261023]';
BEGIN
 IF (SELECT count(*) FROM tours)<>16 OR EXISTS(SELECT 1 FROM tours WHERE id NOT BETWEEN 1 AND 16) THEN
   RAISE EXCEPTION 'Tour inventory changed; re-audit before running';
 END IF;
 IF EXISTS(SELECT 1 FROM bookings b JOIN tour_schedules s ON s.id=b.schedule_id
   WHERE s.return_date>=DATE '2026-10-23' AND b.status<>'CANCELLED') THEN
   RAISE EXCEPTION 'Active booking guard: do not change accepted requirements';
 END IF;
 FOR t IN SELECT * FROM tours ORDER BY id LOOP
  IF t.duration_days NOT BETWEEN 1 AND 3 OR t.max_capacity<1 THEN RAISE EXCEPTION 'Unexpected tour duration/capacity'; END IF;
  route := CASE WHEN t.id>8 THEN t.id-8 ELSE t.id END;
  requirement := marker||' MÔ PHỎNG ĐỒ ÁN — không phải điều kiện chính thức của nhà tổ chức.'||E'\n'||
   'Trước khi xác nhận: điền thông tin từng thành viên; đọc lịch trình, trang bị và quy định; trao đổi riêng với người phụ trách về nhu cầu hỗ trợ. Không đăng thông tin sức khỏe trong chat công khai.'||E'\n'||
   'Trong hành trình: đi cùng đoàn, tuân thủ hướng dẫn, không tự tách nhóm hoặc vào khu vực chưa được cho phép. Báo người phụ trách nếu không thể tiếp tục; lịch có thể thay đổi theo đánh giá tại chỗ.'||E'\n'||
   CASE WHEN route IN (2,3,4,5) THEN 'Kịch bản có khu vực hang, suối hoặc đá ướt: chỉ tiếp cận khi người phụ trách cho phép; hoạt động dưới nước/kỹ thuật cần trang bị và giám sát riêng. Bảng dữ liệu không xác nhận khách có thể bơi hoặc thực hiện kỹ thuật.'
     ELSE 'Kịch bản đi bộ địa hình và nghỉ ngoài trời: chuẩn bị đồ cá nhân phù hợp, trao đổi trước khả năng mang hành lý và nhu cầu nghỉ; không tự suy ra mức thể lực phù hợp từ biểu đồ radar.' END||E'\n'||
   'Trường hợp cần đánh giá sức khỏe, trao đổi với chuyên gia y tế phù hợp và đơn vị tổ chức. AI/website không chẩn đoán hoặc cấp xác nhận đủ sức khỏe.';
  kit := marker||' Checklist mô phỏng, khách tự chuẩn bị; không phải cam kết bao gồm trong giá: giày có độ bám, ba lô cá nhân, áo mưa, bình nước, quần áo thay, túi giữ đồ khô, vật dụng vệ sinh và đèn cá nhân.'||
   CASE WHEN t.duration_days>1 THEN ' Thêm đồ giữ ấm và đồ ngủ phù hợp; xác nhận riêng lều, túi ngủ và đồ dùng trại với người phụ trách.' ELSE '' END||
   ' Đồ dùng cá nhân đặc thù cần trao đổi trước chuyến đi; danh sách cuối cùng phải được đơn vị tổ chức xác nhận.';
  UPDATE tours SET
   trek_requirements=CASE WHEN position(marker in COALESCE(trek_requirements,''))>0 THEN trek_requirements ELSE concat_ws(E'\n\n',NULLIF(trim(trek_requirements),''),requirement) END,
   required_gear=CASE WHEN position(marker in COALESCE(required_gear,''))>0 THEN required_gear ELSE concat_ws(E'\n\n',NULLIF(trim(required_gear),''),kit) END,
   trek_months=COALESCE(NULLIF(trim(trek_months),''),'11,12'),
   trek_customers_per_guide=COALESCE(trek_customers_per_guide,4),
   trek_pickup=COALESCE(NULLIF(trim(trek_pickup),''),'MÔ PHỎNG: tập trung lúc 07:00 ngày khởi hành tại điểm hẹn demo. Không đến địa điểm thực tế theo dữ liệu này.'),
   trek_assembly=COALESCE(NULLIF(trim(trek_assembly),''),'Điểm tập kết MÔ PHỎNG cho đồ án; chưa có điểm hẹn vận hành.'),
   trek_source=CASE WHEN position(marker in COALESCE(trek_source,''))>0 THEN trek_source ELSE concat_ws(E'\n',NULLIF(trek_source,''),marker||' Bổ sung yêu cầu, checklist, tháng và tỷ lệ hỗ trợ còn thiếu bằng dữ liệu giả lập; không xác nhận thời tiết, hướng dẫn viên hoặc lịch mở bán thật.') END,
   updated_at=CURRENT_TIMESTAMP
  WHERE id=t.id AND position(marker in COALESCE(trek_requirements,''))=0;
  FOR d IN 1..t.duration_days LOOP
   IF NOT EXISTS(SELECT 1 FROM tour_itineraries WHERE tour_id=t.id AND day_number=d) THEN
    INSERT INTO tour_itineraries(tour_id,day_number,title,description,created_at) VALUES(t.id,d,
     '[MÔ PHỎNG] Ngày '||d||CASE WHEN d=t.duration_days THEN ': thu dọn trại và kết thúc' ELSE ': khám phá và nghỉ trại' END,
     marker||' Lịch trình mẫu phục vụ đồ án, không phải tuyến hoặc giờ vận hành thực tế. '||
     CASE WHEN d=t.duration_days THEN '07:00 chuẩn bị và kiểm tra đồ cá nhân; 08:00 thu dọn khu vực nghỉ; 09:00 di chuyển cùng đoàn theo tuyến giả lập; 12:00 nghỉ và tổng kết; 15:00 kết thúc tại điểm hẹn demo. Thời gian và điểm hẹn cần xác nhận riêng nếu tổ chức thật.'
     ELSE '07:00 chuẩn bị và phổ biến kế hoạch; 08:00 đi bộ theo nhóm trên tuyến giả lập; 12:00 nghỉ; 14:00 tiếp tục khám phá theo hướng dẫn; 16:00 về khu vực trại; 18:00 sinh hoạt và nghỉ. Không dùng lịch này để tự dẫn đường.' END,CURRENT_TIMESTAMP);
   END IF;
  END LOOP;
  SELECT GREATEST(0,2-count(*)) INTO need FROM tour_schedules WHERE tour_id=t.id AND status='OPEN' AND departure_date>DATE '2026-10-23' AND available_slots>0;
  inserted := 0;
  FOREACH dep IN ARRAY ARRAY[DATE '2026-11-07',DATE '2026-11-21',DATE '2026-12-05',DATE '2026-12-19'] LOOP
   EXIT WHEN inserted>=need;
   IF NOT EXISTS(SELECT 1 FROM tour_schedules WHERE tour_id=t.id AND departure_date=dep) THEN
    INSERT INTO tour_schedules(tour_id,departure_date,return_date,available_slots,status,pickup_at,pickup_point,created_at)
    VALUES(t.id,dep,dep+t.duration_days-1,LEAST(t.max_capacity,12),'OPEN',dep+TIME '07:00',
     marker||' MÔ PHỎNG ĐỒ ÁN — lịch và chỗ thử nghiệm, không phải mở bán thật. Điểm hẹn giả lập; không đến đây để tham gia tour.',CURRENT_TIMESTAMP);
    inserted:=inserted+1;
   END IF;
  END LOOP;
  IF inserted<need THEN RAISE EXCEPTION 'Insufficient demo departure dates'; END IF;
  -- Keep the existing tour banner. Gallery images are uploaded by the owner later.
 END LOOP;
END $$;
