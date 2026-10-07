import { useCallback } from "react";
import { mediaUrl } from "../../utils/tour";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  Mountain,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { tourApi } from "../../api/tourService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import TourTimeline from "../../components/tour/TourTimeline";
import GuideTeam from "../../components/tour/GuideTeam";
import {
  dateLabel,
  duration,
  formatDifficulty,
  isBookable,
  money,
  tourImage,
} from "../../utils/tour";
export default function TourDetail() {
  const { slug } = useParams();
  const loader = useCallback(async () => {
    const tour = (await tourApi.getTourBySlug(slug)).data.data;
    const results = await Promise.allSettled([
      tourApi.getItineraries(tour.id),
      tourApi.getGears(tour.id),
      tourApi.getSchedules(tour.id),
      tourApi.getImages(tour.id),
    ]);
    const read = (index) =>
      results[index].status === "fulfilled"
        ? results[index].value.data.data
        : [];
    return {
      tour,
      itineraries: read(0),
      gears: read(1),
      schedules: read(2),
      images: read(3),
      partialError: results.some((r) => r.status === "rejected"),
    };
  }, [slug]);
  const { data, loading, error, reload } = useResource(loader);
  if (loading) return <LoadingSpinner label="Đang mở hành trình..." />;
  if (error || !data)
    return (
      <div className="container page-space">
        <EmptyState
          error
          title="Không thể mở chuyến đi"
          description={error}
          onRetry={reload}
        >
          <Link to="/tours" className="text-link">
            Quay lại danh sách
          </Link>
        </EmptyState>
      </div>
    );
  const { tour, itineraries, gears, schedules, partialError } = data;
  const openSchedules = schedules
    .filter(isBookable)
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  return (
    <div className="container page-space">
      <Link className="back-link" to="/tours">
        <ArrowLeft size={16} /> Tất cả hành trình
      </Link>
      <header className="detail-heading">
        <p className="eyebrow">
          <MapPin size={14} />
          {tour.location}
        </p>
        <h1>{tour.title}</h1>
        <div className="detail-meta">
          <span>
            <Clock3 size={17} />
            {duration(tour)}
          </span>
          <span>
            <Mountain size={17} />
            {formatDifficulty(tour.difficultyLevel)}
          </span>
          {tour.maxCapacity && (
            <span>
              <Users size={17} />
              Tối đa {tour.maxCapacity} người
            </span>
          )}
        </div>
      </header>
      <figure className="detail-cover">
        <img
          src={tourImage(tour)}
          alt={tour.bannerUrl ? tour.title : "Phong cảnh núi — ảnh minh họa"}
        />
        {!tour.bannerUrl && <figcaption>Ảnh phong cảnh minh họa</figcaption>}
      </figure>
      {!!data.images?.length && (
        <div
          className="tour-photo-grid client-photo-grid"
          aria-label="Ảnh chuyến đi"
        >
          {data.images.map((photo) => (
            <img
              key={photo.id}
              src={mediaUrl(photo.imageUrl)}
              alt={"Hình ảnh " + tour.title}
              loading="lazy"
            />
          ))}
        </div>
      )}
      <div className="detail-layout">
        <div className="detail-sections">
          {partialError && (
            <div className="notice notice-error" role="alert">
              Một phần lịch trình hoặc lịch khởi hành chưa tải được.{" "}
              <button className="text-btn" onClick={reload}>
                Thử lại
              </button>
            </div>
          )}
          <nav className="detail-tabs" aria-label="Thông tin tour">
            <a href="#overview">Tổng quan</a>
            <a href="#itinerary">Lịch trình</a>
            <a href="#equipment">Chuẩn bị</a>
            <a href="#departures">Khởi hành</a>
          </nav>
          <section id="overview" className="detail-section">
            <p className="eyebrow">VỀ CHUYẾN ĐI</p>
            <h2>Một hành trình đáng nhớ.</h2>
            <p className="preserve-lines">
              {tour.description ||
                tour.summary ||
                "Thông tin chuyến đi đang được cập nhật."}
            </p>
          </section>
          <section id="itinerary" className="detail-section">
            <h2>Lịch trình từng ngày</h2>
            <TourTimeline items={itineraries} />
          </section>
          <section id="equipment" className="detail-section">
            <h2>Gói ghém cho chuyến đi</h2>
            {tour.requiredGear && (
              <div className="soft-panel">
                <h3>Bạn cần mang theo</h3>
                <p className="preserve-lines">{tour.requiredGear}</p>
              </div>
            )}
            <div className="gear-list">
              {gears.map((gear) => (
                <div key={gear.id}>
                  <PackageCheck size={20} />
                  <span>
                    <strong>{gear.gearName}</strong>
                    <small>
                      {gear.isProvided
                        ? "Được cung cấp trong tour"
                        : "Thuê thêm: " + money(gear.rentalPrice)}
                    </small>
                  </span>
                </div>
              ))}
            </div>
            {!gears.length && (
              <p className="muted">
                Danh sách trang bị được cung cấp đang cập nhật.
              </p>
            )}
          </section>
          <section className="detail-section">
            <h2>An toàn trên cung đường</h2>
            <p className="preserve-lines">
              {tour.safetyTips ||
                "Hãy liên hệ đơn vị tổ chức để xác nhận các yêu cầu an toàn trước chuyến đi."}
            </p>
            {tour.insuranceInfo && (
              <div className="notice">
                <ShieldCheck size={20} />
                <span>{tour.insuranceInfo}</span>
              </div>
            )}
            {tour.emergencyHotline && (
              <p>
                Liên hệ hỗ trợ:{" "}
                <a className="text-link" href={"tel:" + tour.emergencyHotline}>
                  {tour.emergencyHotline}
                </a>
              </p>
            )}
          </section>
          <section id="departures" className="detail-section">
            <h2>Lịch khởi hành</h2>
            {openSchedules.length ? (
              <div className="departure-list">
                {openSchedules.map((schedule) => (
                  <div key={schedule.id}>
                    <CalendarDays size={22} />
                    <div>
                      <strong>
                        {dateLabel(schedule.departureDate)} —{" "}
                        {dateLabel(schedule.returnDate)}
                      </strong>
                      <small>Còn {schedule.availableSlots} chỗ</small>
                      <GuideTeam
                        members={schedule.guides}
                        legacyName={schedule.guideName}
                      />
                    </div>
                    <Link
                      className="btn btn-small btn-outline"
                      to={
                        "/tours/" +
                        tour.slug +
                        "/booking?schedule=" +
                        schedule.id
                      }
                    >
                      Chọn lịch <ArrowUpRight size={15} />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                Chưa có lịch khởi hành còn chỗ. Bạn có thể quay lại sau để xem
                lịch mới.
              </p>
            )}
          </section>
        </div>
        <aside className="booking-summary">
          <p className="eyebrow">CHUYẾN ĐI CỦA BẠN</p>
          <div className="price-display">
            {money(tour.pricePerPax)}
            <small>/ người</small>
          </div>
          <div className="summary-row">
            <span>Thời gian</span>
            <strong>{duration(tour)}</strong>
          </div>
          <div className="summary-row">
            <span>Độ khó</span>
            <strong>{formatDifficulty(tour.difficultyLevel)}</strong>
          </div>
          {openSchedules.length > 0 ? (
            <Link
              className="btn full-width"
              to={"/tours/" + tour.slug + "/booking"}
            >
              Chọn ngày & đặt tour <ArrowRightIcon />
            </Link>
          ) : (
            <p className="notice">Chưa có lịch khả dụng</p>
          )}
          <Link
            className="btn btn-outline full-width"
            to={"/chat?tour=" + encodeURIComponent(tour.title)}
          >
            <Sparkles size={17} />
            Hỏi trợ lý về tour này
          </Link>
          <p className="small muted">
            Kiểm tra lịch trình, sức khỏe và trang bị trước khi đặt chỗ.
          </p>
        </aside>
      </div>
    </div>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={18} />;
}
