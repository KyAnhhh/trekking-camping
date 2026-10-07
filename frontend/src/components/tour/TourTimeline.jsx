export default function TourTimeline({ items = [] }) {
  return items.length ? (
    <ol className="tour-timeline">
      {items.map((item) => (
        <li key={item.id}>
          <span className="day-marker">Ngày {item.dayNumber}</span>
          <div>
            <h3>{item.title}</h3>
            <p className="preserve-lines">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <p className="muted">Lịch trình chi tiết đang được cập nhật.</p>
  );
}
