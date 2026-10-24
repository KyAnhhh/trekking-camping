-- One-time data repair for the audited academic DB, NOT a schema migration.
-- Run in an explicit transaction, after saving a before-image. Never auto-run on startup.
-- Exact IDs/slugs and expected old values intentionally fail on other datasets.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';
LOCK TABLE tours, tour_schedules, bookings IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM bookings b JOIN tour_schedules s ON s.id=b.schedule_id
    WHERE s.tour_id IN (2,3,4,5,8)
      AND s.return_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      AND b.status <> 'CANCELLED') THEN
    RAISE EXCEPTION 'Active/future bookings prevent profile changes';
  END IF;
  UPDATE tours t SET trek_assembly=p.assembly, trek_pickup=p.pickup,
    trek_source='Tham khảo đồ án; không đại diện nhà tổ chức. Nguồn: ' || p.url ||
      ' . Đối chiếu 22/10/2026 chỉ xác nhận điểm tập kết và mô tả đón khách. Chưa đủ dữ liệu tổng quãng đường đi bộ, độ cao cao nhất, tổng leo tích lũy, giờ vận động/ngày và thời gian tiếp cận y tế. Không quy đổi đoạn bơi/hang thành tổng quãng đường. Lịch đón thực tế cần xác nhận riêng.',
    trek_verified_on=DATE '2026-10-22', updated_at=localtimestamp
  FROM (VALUES
    (2,'tra-ang-1-ngay','Văn phòng Jungle Boss (tham khảo chương trình gốc)',
      'Tham khảo: đón tại điểm lưu trú khu vực Phong Nha, tập trung tại văn phòng Jungle Boss. Giờ đón cần xác nhận riêng; không phải lịch đón đã đặt.',
      'https://junglebosstours.com/vi/tour/kham-pha-tra-ang-1n'),
    (3,'cam-trai-ma-da-2-ngay-1-dem','Văn phòng Jungle Boss (tham khảo chương trình gốc)',
      'Tham khảo: khoảng 08:00 đón tại điểm lưu trú khu vực Phong Nha và tập trung tại văn phòng Jungle Boss. Cần xác nhận cho ngày đi cụ thể.',
      'https://junglebosstours.com/vi/tour/cam-trai-thung-lung-ma-da-2n1d'),
    (4,'he-thong-hang-ho-3-ngay-2-dem','Văn phòng Jungle Boss (tham khảo chương trình gốc)',
      'Tham khảo: khoảng 08:00 đón tại điểm lưu trú, về văn phòng Jungle Boss trước khi đi điểm trekking. Cần xác nhận cho ngày đi cụ thể.',
      'https://junglebosstours.com/vi/tour/kham-pha-he-thong-hang-ho-3n2d'),
    (5,'bach-ma-mao-hiem-1-ngay','Văn phòng Jungle Boss tại Huế (tham khảo chương trình gốc)',
      'Tham khảo: 07:30–08:00 đón tại trung tâm Huế, sau đó đến văn phòng gần chân núi Bạch Mã để chuẩn bị. Cần xác nhận địa chỉ và giờ cụ thể.',
      'https://junglebosstours.com/vi/tour/kham-pha-bach-ma-1-ngay')
  ) AS p(id,slug,assembly,pickup,url)
  WHERE t.id=p.id AND t.slug=p.slug AND t.trek_assembly IS NULL
    AND t.trek_pickup IS NULL AND t.trek_source IS NULL AND t.trek_verified_on IS NULL;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>4 THEN RAISE EXCEPTION 'Expected four unchanged source profiles, got %',n; END IF;

  UPDATE tours SET trek_total_ascent_m=NULL, trek_active_hours=NULL, trek_medical_hours=NULL,
    trek_source=trek_source || ' Rà soát 22/10/2026: chủ website xác nhận 3332 m, 3.5 giờ/ngày và 2.5 giờ tiếp cận y tế là số kiểm thử; đã gỡ, không phải dữ liệu thực địa.',
    updated_at=localtimestamp
  WHERE id=8 AND slug='tham-khao-thac-k50-2n1d-202610'
    AND trek_total_ascent_m=3332 AND trek_active_hours=3.5 AND trek_medical_hours=2.5
    AND trek_source IS NOT NULL AND length(trek_source)<1700;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'K50 values changed since audit'; END IF;
END $$;
