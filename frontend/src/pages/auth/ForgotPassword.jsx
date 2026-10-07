import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../api/authService";
import AuthShell from "../../components/common/AuthShell";
import { errorMessage } from "../../utils/tour";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      setSuccess((await authService.forgotPassword(email.trim())).data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell>
      <p className="eyebrow">LẤY LẠI QUYỀN TRUY CẬP</p>
      <h1>Quên mật khẩu?</h1>
      <p className="muted">
        Nhập email đăng ký để nhận liên kết đặt lại mật khẩu có hiệu lực trong
        15 phút.
      </p>
      {success && (
        <div className="notice notice-success" role="status">
          {success}
        </div>
      )}
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          Email đăng ký
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn full-width" disabled={busy}>
          {busy ? "Đang gửi yêu cầu..." : "Gửi liên kết đặt lại"}
        </button>
      </form>
      <p className="auth-switch">
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </AuthShell>
  );
}
