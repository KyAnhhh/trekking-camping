import { useCallback, useEffect, useState } from "react";
import { participationService } from "../../api/participationService";
import useResource from "../../hooks/useResource";
import { errorMessage } from "../../utils/tour";
import LoadingSpinner from "../common/LoadingSpinner";
import EmptyState from "../common/EmptyState";
import Modal from "../common/Modal";
const labels = {
  LEGACY: "Đơn cũ · chưa áp dụng khai báo mới",
  INCOMPLETE: "Chưa đủ khai báo",
  REVIEW_REQUIRED: "Chờ người phụ trách xem xét",
  NEEDS_CONTACT: "Cần trao đổi với người phụ trách",
  UNSUPPORTED: "Chưa đáp ứng được nhu cầu hỗ trợ",
  READY: "Đã hoàn tất xem xét yêu cầu tham gia",
};
const empty = () => ({
  name: "",
  support: "",
  notes: "",
  emergencyName: "",
  emergencyPhone: "",
  acknowledged: false,
});
export default function ParticipationPanel({
  bookingId,
  admin = false,
  bookingStatus,
  onSaved,
}) {
  const load = useCallback(
    async () => (await participationService.get(bookingId, admin)).data.data,
    [bookingId, admin],
  );
  const { data, loading, error, reload } = useResource(load);
  const [people, setPeople] = useState([]),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [decision, setDecision] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  useEffect(() => {
    if (data)
      setPeople(
        data.declaration?.people ||
          Array.from({ length: data.numberOfPax }, empty),
      );
  }, [data]);
  const update = (i, k, v) =>
    setPeople((old) => old.map((p, n) => (n === i ? { ...p, [k]: v } : p)));
  async function action(task) {
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      await task();
      setDecision(null);
      reload();
      onSaved?.();
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <LoadingSpinner label="Đang tải khai báo riêng tư..." />;
  if (error)
    return (
      <EmptyState
        error
        title="Chưa tải được khai báo"
        description={error}
        onRetry={reload}
      />
    );
  if (!data) return null;
  return (
    <section className="panel health-panel">
      <p className="eyebrow">CHUẨN BỊ CÙNG NGƯỜI ĐỒNG HÀNH</p>
      <h2>Khai báo người tham gia</h2>
      <p role="status">
        <strong>{labels[data.status] || data.status}</strong>
      </p>
      {data.declaration?.reviewNote && (
        <p className="notice preserve-lines">
          <strong>Người phụ trách: </strong>
          {data.declaration.reviewNote}
        </p>
      )}
      <p className="small muted">
        Đây là xem xét yêu cầu hỗ trợ, không phải xác nhận y tế. Thông tin chỉ
        dành cho tài khoản đặt và người quản trị phụ trách; không gửi đến AI.
        Nội dung khai báo được mã hóa khi lưu và xóa theo lịch lưu trữ sau
        chuyến đi.
      </p>
      {data.deadline && bookingStatus === "PENDING" && (
        <p className="notice">
          Thời hạn giữ chỗ / thanh toán:{" "}
          {new Date(data.deadline).toLocaleString("vi-VN")}. Đơn chưa thanh toán
          sẽ được giải phóng sau hạn; giao dịch đang đối soát cần được xử lý
          trước.
        </p>
      )}
      <details>
        <summary>Yêu cầu chuyến đi cần xác nhận</summary>
        <p className="preserve-lines">{data.requirements}</p>
      </details>
      {failure && (
        <p className="notice notice-error" role="alert">
          {failure}
        </p>
      )}
      {admin ? (
        <>
          {!data.declaration ? (
            <p>Chưa có khai báo hoặc đã xóa theo thời hạn lưu trữ.</p>
          ) : (
            data.declaration.people.map((p, i) => (
              <article className="health-person" key={i}>
                <h3>
                  Người {i + 1}: {p.name}
                </h3>
                <p>
                  {p.support === "PRIVATE"
                    ? "Muốn trao đổi riêng"
                    : p.support === "SUPPORT"
                      ? "Có nhu cầu hỗ trợ"
                      : "Không khai báo nhu cầu hỗ trợ"}
                </p>
                <p className="preserve-lines">{p.notes}</p>
                <p>
                  Liên hệ khẩn cấp: {p.emergencyName} · {p.emergencyPhone}
                </p>
                <p className="small muted">
                  Đã xác nhận quyền khai báo và đọc yêu cầu:{" "}
                  {p.acknowledged ? "Có" : "Chưa"}
                </p>
              </article>
            ))
          )}
          {data.editable && data.declaration && (
            <div className="payment-actions">
              {[
                ["READY", "Hoàn tất xem xét"],
                ["NEEDS_CONTACT", "Cần trao đổi"],
                ["UNSUPPORTED", "Chưa thể đáp ứng"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  disabled={busy}
                  className="btn btn-outline"
                  onClick={() => setDecision(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {data.editable ? (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                action(() =>
                  participationService.submit(bookingId, {
                    revision: data.revision,
                    people,
                  }),
                );
              }}
            >
              <fieldset disabled={busy}>
                <p>
                  Khai báo riêng cho đủ {data.numberOfPax} người. Mọi khai báo
                  mới hoặc chỉnh sửa cần người phụ trách xem xét trước thanh
                  toán. Nếu muốn trao đổi riêng, không cần ghi chi tiết bệnh sử.
                </p>
                {people.map((p, i) => (
                  <div className="health-person form-stack" key={i}>
                    <h3>Người tham gia {i + 1}</h3>
                    <label className="field">
                      Họ tên
                      <input
                        required
                        maxLength={150}
                        value={p.name}
                        onChange={(e) => update(i, "name", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      Nhu cầu hỗ trợ
                      <select
                        required
                        value={p.support}
                        onChange={(e) => update(i, "support", e.target.value)}
                      >
                        <option value="">
                          Chọn theo xác nhận của người tham gia
                        </option>
                        <option value="NONE">
                          Không khai báo nhu cầu hỗ trợ
                        </option>
                        <option value="SUPPORT">
                          Có tình trạng hoặc nhu cầu cần lưu ý
                        </option>
                        <option value="PRIVATE">Muốn trao đổi riêng</option>
                      </select>
                    </label>
                    <label className="field">
                      Lưu ý muốn chia sẻ (tùy chọn)
                      <textarea
                        maxLength={2000}
                        rows="2"
                        value={p.notes}
                        onChange={(e) => update(i, "notes", e.target.value)}
                      />
                    </label>
                    <div className="form-row">
                      <label className="field">
                        Người liên hệ khẩn cấp
                        <input
                          required
                          maxLength={150}
                          value={p.emergencyName}
                          onChange={(e) =>
                            update(i, "emergencyName", e.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        Điện thoại khẩn cấp
                        <input
                          required
                          type="tel"
                          maxLength={30}
                          pattern={"[+0-9 \\(\\).\\-]{6,30}"}
                          value={p.emergencyPhone}
                          onChange={(e) =>
                            update(i, "emergencyPhone", e.target.value)
                          }
                        />
                      </label>
                    </div>
                    <label className="checkbox-row">
                      <input
                        required
                        type="checkbox"
                        checked={p.acknowledged}
                        onChange={(e) =>
                          update(i, "acknowledged", e.target.checked)
                        }
                      />
                      Tôi là người này hoặc đại diện được phép; người tham
                      gia/đại diện đã đọc yêu cầu chuyến đi và đồng ý chia sẻ
                      thông tin cho việc tổ chức, hỗ trợ chuyến đi.
                    </label>
                  </div>
                ))}
                <button className="btn" disabled={busy}>
                  {busy ? "Đang gửi..." : "Gửi khai báo để xem xét"}
                </button>
              </fieldset>
            </form>
          ) : (
            <p>
              Đơn không còn mở chỉnh sửa khai báo. Nếu cần thay đổi hỗ trợ, hãy
              liên hệ người phụ trách; không tạo khai báo mới để thay thế thông
              tin đang dùng cho chuyến đã thanh toán.
            </p>
          )}
          {!data.editable && data.declaration && (
            <details>
              <summary>Xem thông tin đã khai báo</summary>
              {people.map((p, i) => (
                <div key={i}>
                  <h3>{p.name}</h3>
                  <p>{p.notes || p.support}</p>
                  <p>
                    {p.emergencyName} · {p.emergencyPhone}
                  </p>
                </div>
              ))}
            </details>
          )}
          {data.declaration &&
            ["CANCELLED", "COMPLETED"].includes(bookingStatus) && (
              <button
                className="btn btn-outline"
                disabled={busy}
                onClick={() => setDecision("DELETE")}
              >
                Xóa nội dung khai báo
              </button>
            )}
        </>
      )}
      {decision && (
        <Modal
          title={
            decision === "DELETE"
              ? "Xóa nội dung khai báo?"
              : "Xác nhận kết quả xem xét?"
          }
          onClose={() => !busy && setDecision(null)}
        >
          <p>
            {decision === "DELETE"
              ? "Nội dung sẽ bị xóa; nhật ký thao tác không chứa bệnh sử được giữ để kiểm tra truy cập."
              : "Chỉ hoàn tất khi đã trao đổi và xử lý nhu cầu hỗ trợ. Thao tác này không thay thế xác nhận của chuyên gia y tế."}
          </p>
          {failure && (
            <p role="alert" className="notice notice-error">
              {failure}
            </p>
          )}
          {decision !== "DELETE" && (
            <label className="field">
              Lý do / hướng dẫn tiếp theo cho khách
              <textarea
                rows="3"
                maxLength={1000}
                disabled={busy}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </label>
          )}
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              action(() =>
                decision === "DELETE"
                  ? participationService.remove(bookingId)
                  : participationService.review(bookingId, {
                      revision: data.revision,
                      decision,
                      note: reviewNote,
                    }),
              )
            }
          >
            Xác nhận
          </button>
        </Modal>
      )}
    </section>
  );
}
