-- Academic demo copies only. Run inside a transaction with a before-image backup.
-- No departure schedules, bookings or images are copied.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='20s';
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';
LOCK TABLE tours,tour_itineraries,tour_gears IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE p record; original tours%ROWTYPE; new_id bigint;
BEGIN
 FOR p IN SELECT * FROM (VALUES
  (1,'trekking-ta-nang-phan-dung-3n2d',30.0,1200,900,6.0,3.0),
  (2,'tra-ang-1-ngay',4.0,200,150,3.0,1.0),
  (3,'cam-trai-ma-da-2-ngay-1-dem',12.0,400,450,4.5,2.0),
  (4,'he-thong-hang-ho-3-ngay-2-dem',22.0,600,1100,7.0,4.0),
  (5,'bach-ma-mao-hiem-1-ngay',8.0,1400,600,5.0,1.5),
  (6,'tham-khao-bidoup-nui-ba-2n1d-202610',24.0,2200,1400,7.0,4.0),
  (7,'tham-khao-lao-than-2n1d-202610',16.0,2800,1000,6.0,3.0),
  (8,'tham-khao-thac-k50-2n1d-202610',10.0,1000,500,4.0,2.0)
 ) AS x(id,slug,distance,altitude,ascent,hours,medical)
 LOOP
  SELECT * INTO STRICT original FROM tours WHERE id=p.id AND slug=p.slug;
  IF EXISTS(SELECT 1 FROM tours WHERE slug='mo-phong-radar-'||p.slug) THEN
    RAISE EXCEPTION 'Demo copy already exists; refusing duplicate or overwrite';
  END IF;
  INSERT INTO tours(title,slug,location,duration_days,duration_nights,difficulty_level,price_per_pax,max_capacity,
    summary,description,required_gear,safety_tips,insurance_info,is_active,created_at,updated_at,
    trek_distance_km,trek_max_altitude_m,trek_total_ascent_m,trek_active_hours,trek_medical_hours,
    trek_medical_notes,trek_months,trek_pickup,trek_assembly,trek_customers_per_guide,trek_requirements,trek_source,trek_verified_on)
  VALUES('[MÔ PHỎNG] '||original.title,'mo-phong-radar-'||original.slug,original.location,
    original.duration_days,original.duration_nights,original.difficulty_level,original.price_per_pax,original.max_capacity,
    'DỮ LIỆU MÔ PHỎNG: chỉ demo biểu đồ 5 chỉ số; không dùng để tư vấn hoặc đặt chuyến đi thực tế.',
    'Bản sao phục vụ đồ án của tour ID '||original.id||'. Toàn bộ 5 chỉ số radar là số tổng hợp, không phải số đo thực địa. Giá, mức độ khó và sức chứa được sao chép để trình diễn giao diện; không phải báo giá hoặc cam kết dịch vụ. Không có lịch mở bán. Lịch trình/trang bị chỉ là nội dung tham khảo được sao chép, không xác nhận tính khả thi.',
    'Mô phỏng/tham khảo: '||coalesce(original.required_gear,''),
    'Không dùng các chỉ số của bản mô phỏng để quyết định tham gia, đánh giá sức khỏe hoặc lập phương án cứu hộ.',
    'Không có hợp đồng bảo hiểm cho bản mô phỏng.',true,localtimestamp,localtimestamp,
    p.distance,p.altitude,p.ascent,p.hours,p.medical,
    'GIẢ LẬP: thời gian tới trạm hỗ trợ hư cấu trong kịch bản kiểm thử; không phải ước tính cứu hộ hoặc tiếp cận cơ sở y tế thực tế.',
    NULL,'Không tổ chức đón khách; đây là bản trình diễn.','Điểm tập kết giả lập — không sử dụng thực tế',4,
    'Chỉ dùng kiểm thử giao diện. Không xác nhận đủ điều kiện tham gia hoặc đủ sức khỏe.',
    'Dữ liệu tổng hợp cho đồ án, được người dùng cho phép tạo ngày 22/10/2026. Tất cả 5 chỉ số đều mô phỏng, không lấy từ nhà tổ chức. Ngày xác minh chỉ là ngày kiểm tra dữ liệu demo, không phải xác minh thực địa.',DATE '2026-10-22')
  RETURNING id INTO new_id;
  INSERT INTO tour_itineraries(tour_id,day_number,title,description,created_at)
    SELECT new_id,day_number,'[MÔ PHỎNG] '||title,
      'Tham khảo cho bản demo, không phải lịch trình đã xác nhận. '||coalesce(description,''),localtimestamp
    FROM tour_itineraries WHERE tour_id=original.id;
  INSERT INTO tour_gears(tour_id,gear_name,is_provided,rental_price)
    SELECT new_id,'[MÔ PHỎNG] '||gear_name,is_provided,rental_price FROM tour_gears WHERE tour_id=original.id;
 END LOOP;
END $$;
