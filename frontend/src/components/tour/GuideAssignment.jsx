import { useEffect, useState } from "react";
import { guideService } from "../../api/guideService";
import Modal from "../common/Modal";
import { dateLabel, errorMessage } from "../../utils/tour";
export default function GuideAssignment({ schedule, onClose, onSaved }) {
  const [rows, setRows] = useState([]),
    [lead, setLead] = useState(""),
    [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  const [legacy, setLegacy] = useState(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoaded(false);
    setError("");
    Promise.all([guideService.list(), guideService.team(schedule.id)])
      .then(([list, team]) => {
        if (cancelled) return;
        setRows(list.data.data);
        const members = team.data.data.guides;
        setLead(members.find((m) => m.role === "LEAD")?.guide.code || "");
        setHelpers(
          members
            .filter((m) => m.role === "ASSISTANT")
            .map((m) => m.guide.code),
        );
        setLegacy(team.data.data.legacyGuideName);
        setLoaded(true);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schedule.id, retry]);
  async function save(event) {
    event.preventDefault();
    if (busy || !loaded) return;
    setBusy(true);
    setError("");
    try {
      const payload = lead
        ? [
            { guideCode: lead, role: "LEAD" },
            ...helpers
              .filter((code) => code !== lead)
              .map((guideCode) => ({ guideCode, role: "ASSISTANT" })),
          ]
        : [];
      await guideService.assign(schedule.id, payload);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Phân công hướng dẫn viên"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        {dateLabel(schedule.departureDate)} — {dateLabel(schedule.returnDate)}
      </p>
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      {loading ? (
        <p>Đang tải đội ngũ...</p>
      ) : !loaded ? (
        <button className="btn" onClick={() => setRetry((n) => n + 1)}>
          Thử lại
        </button>
      ) : (
        <form className="form-stack" onSubmit={save}>
          {legacy && (
            <p className="notice">
              Thông tin cũ: {legacy}. Lưu phân công sẽ thay thế thông tin nhập
              tay bằng hồ sơ đã chọn.
            </p>
          )}
          <fieldset className="form-stack" disabled={busy}>
            <label className="field">
              Trưởng đoàn
              <select
                value={lead}
                onChange={(e) => {
                  setLead(e.target.value);
                  setHelpers((current) =>
                    current.filter((code) => code !== e.target.value),
                  );
                }}
              >
                <option value="">Chưa phân công / gỡ phân công</option>
                {rows
                  .filter((g) => g.active)
                  .map((g) => (
                    <option key={g.profile.id} value={g.profile.code}>
                      {g.profile.fullName} · {g.profile.code}
                    </option>
                  ))}
              </select>
            </label>
            <p className="small muted">
              Hệ thống kiểm tra trùng ngày khi lưu. Chuyến đã đầy khách vẫn được
              tính vào lịch làm việc.
            </p>
            {lead && (
              <>
                <strong>Người hỗ trợ</strong>
                {rows
                  .filter((g) => g.active && g.profile.code !== lead)
                  .map((g) => (
                    <label className="checkbox-field" key={g.profile.id}>
                      <input
                        type="checkbox"
                        checked={helpers.includes(g.profile.code)}
                        onChange={(e) =>
                          setHelpers((current) =>
                            e.target.checked
                              ? [...current, g.profile.code]
                              : current.filter(
                                  (code) => code !== g.profile.code,
                                ),
                          )
                        }
                      />
                      {g.profile.fullName}
                    </label>
                  ))}
              </>
            )}
            <button className="btn">
              {busy ? "Đang lưu..." : "Lưu phân công"}
            </button>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
