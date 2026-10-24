-- User requested filling missing radar values on IDs 1-8 with synthetic data.
-- Requires external before-image and explicit transaction. Not an automatic migration.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='20s';
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';
LOCK TABLE tours,tour_schedules,bookings IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE p record; t tours%ROWTYPE; n integer;
BEGIN
 IF EXISTS(SELECT 1 FROM bookings b JOIN tour_schedules s ON s.id=b.schedule_id
   WHERE s.tour_id BETWEEN 1 AND 8
   AND s.return_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
   AND b.status <> 'CANCELLED') THEN
   RAISE EXCEPTION 'Booking guard: cannot change active trip profiles';
 END IF;
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
  SELECT * INTO STRICT t FROM tours WHERE id=p.id AND slug=p.slug;
  IF t.trek_total_ascent_m IS NOT NULL OR t.trek_active_hours IS NOT NULL OR t.trek_medical_hours IS NOT NULL
    OR (p.id<=5 AND (t.trek_distance_km IS NOT NULL OR t.trek_max_altitude_m IS NOT NULL))
    OR (p.id>=6 AND (t.trek_distance_km IS NULL OR t.trek_max_altitude_m IS NULL)) THEN
    RAISE EXCEPTION 'Profile changed since audit; refusing overwrite';
  END IF;
  UPDATE tours SET
    trek_distance_km=COALESCE(trek_distance_km,p.distance),
    trek_max_altitude_m=COALESCE(trek_max_altitude_m,p.altitude),
    trek_total_ascent_m=p.ascent,trek_active_hours=p.hours,trek_medical_hours=p.medical,
    title='[MÔ PHỎNG] '||title,
    summary='MÔ PHỎNG ĐỒ ÁN: biểu đồ chứa số liệu tổng hợp, không dùng cho chuyến đi thực tế. '||COALESCE(summary,''),
    description='MÔ PHỎNG ĐỒ ÁN — cập nhật 22/10/2026. '||
      CASE WHEN p.id<=5 THEN 'Cả 5 chỉ số radar được điền bằng số liệu giả lập. '
      ELSE 'Giữ nguyên quãng đường/độ cao tham khảo; tổng leo, giờ vận động và giờ tiếp cận y tế được điền bằng số liệu giả lập. ' END||
      'Không phải số đo thực địa, xác nhận sức khỏe hoặc phương án cứu hộ. Không dùng các giá trị này để tư vấn chuyến đi thực tế.'||E'\n\n'||COALESCE(description,''),
    trek_medical_notes='GIẢ LẬP cho đồ án: thời gian đến trạm hỗ trợ hư cấu trong kịch bản demo, không phải thời gian cứu hộ hoặc tiếp cận cơ sở y tế thực tế.',
    trek_source='MÔ PHỎNG theo yêu cầu chủ website ngày 22/10/2026. '||
      CASE WHEN p.id<=5 THEN '5/5 chỉ số radar là dữ liệu tổng hợp. '
      ELSE 'Chỉ tổng leo, giờ vận động/ngày và giờ tiếp cận y tế là dữ liệu tổng hợp; quãng đường và độ cao giữ nguyên. ' END||
      'Ngày xác minh là ngày kiểm tra dữ liệu demo, không phải xác minh thực địa. Nguồn/ghi chú trước đây: '||COALESCE(trek_source,'Chưa có.'),
    trek_verified_on=DATE '2026-10-22',updated_at=localtimestamp
  WHERE id=p.id AND slug=p.slug;
 END LOOP;
 SELECT count(*) INTO n FROM tours WHERE id BETWEEN 1 AND 8
   AND trek_distance_km IS NOT NULL AND trek_max_altitude_m IS NOT NULL
   AND trek_total_ascent_m IS NOT NULL AND trek_active_hours IS NOT NULL AND trek_medical_hours IS NOT NULL
   AND length(trek_source)<=2000 AND length(title)<=255;
 IF n<>8 THEN RAISE EXCEPTION 'Post-update validation failed'; END IF;
END $$;
