import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound, CheckCircle2 } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { accountService } from "../../api/accountService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { errorMessage } from "../../utils/tour";

const load = async () => (await accountService.me()).data.data;
export default function Profile() {
  const { data, loading, error, reload } = useResource(load);
  const { updateProfile, clearSession } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState("");
  useEffect(() => {
    if (data)
      setForm({ fullName: data.fullName || "", phone: data.phone || "" });
  }, [data]);
  async function submit(event, password = false) {
    event.preventDefault();
    if (busy) return;
    setFailure("");
    setNotice("");
    if (password && passwords.newPassword !== passwords.confirm) {
      setFailure("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      if (password) {
        await accountService.changePassword({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        });
        clearSession();
        navigate("/login", { replace: true, state: { passwordReset: true } });
      } else {
        const profile = (await accountService.update(form)).data.data;
        updateProfile(profile);
        setNotice("Đã lưu thông tin cá nhân.");
      }
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <EmptyState
        error
        title="Chưa tải được tài khoản"
        description={error}
        onRetry={reload}
      />
    );
  return (
    <div className="container page-space">
      <header className="page-heading">
        <p className="eyebrow">TÀI KHOẢN CỦA TÔI</p>
        <h1>Thông tin người đồng hành.</h1>
      </header>

      {/* Card nhận diện tài khoản & Avatar */}
      <div className="panel profile-hero-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
        {data?.avatarUrl ? (
          <img
            src={data.avatarUrl}
            alt={data.fullName || "Avatar"}
            style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--forest)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--mist)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserRound size={36} />
          </div>
        )}
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem' }}>{data?.fullName || data?.email}</h2>
          <p className="muted" style={{ margin: '0 0 8px' }}>{data?.email}</p>
          {data?.authProvider === 'GOOGLE' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: '#eaf4ee', color: '#1f5f3e', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> Tài khoản đã liên kết Google
            </span>
          )}
        </div>
      </div>
      {notice && (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      )}
      {failure && (
        <p className="notice notice-error" role="alert">
          {failure}
        </p>
      )}
      <div className="admin-detail-grid">
        <section className="panel">
          <h2>Thông tin cá nhân</h2>
          <form className="form-stack" onSubmit={submit}>
            <fieldset className="form-stack" disabled={busy}>
              <label className="field">
                Email đăng nhập
                <input type="email" value={data?.email || ""} readOnly />
              </label>
              <label className="field">
                Họ tên
                <input
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Số điện thoại
                <input
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  pattern={"[+0-9 \\(\\).\\-]{6,30}"}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <button className="btn">
                {busy ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </fieldset>
          </form>
        </section>
        <section className="panel">
          <h2>Đổi mật khẩu</h2>
          <p className="muted">
            Sau khi đổi, mọi phiên đăng nhập sẽ kết thúc. Mật khẩu mới từ 8 ký
            tự, tối đa 72 byte.
          </p>
          <form className="form-stack" onSubmit={(e) => submit(e, true)}>
            <fieldset className="form-stack" disabled={busy}>
              {[
                ["currentPassword", "Mật khẩu hiện tại"],
                ["newPassword", "Mật khẩu mới"],
                ["confirm", "Nhập lại mật khẩu mới"],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    type="password"
                    required
                    minLength={key === "currentPassword" ? undefined : 8}
                    maxLength={72}
                    autoComplete={
                      key === "currentPassword"
                        ? "current-password"
                        : "new-password"
                    }
                    value={passwords[key]}
                    onChange={(e) =>
                      setPasswords({ ...passwords, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <button className="btn btn-outline">
                Đổi mật khẩu và đăng nhập lại
              </button>
            </fieldset>
          </form>
        </section>
      </div>
    </div>
  );
}
