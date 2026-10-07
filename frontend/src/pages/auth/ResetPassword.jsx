import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../api/authService";
import AuthShell from "../../components/common/AuthShell";
import { errorMessage } from "../../utils/tour";

export default function ResetPassword() {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
  );
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname,
    );
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("Hai mật khẩu chưa trùng khớp.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Mật khẩu tối đa 72 byte.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authService.resetPassword(token, password);
      ["token", "role", "username"].forEach((key) =>
        localStorage.removeItem(key),
      );
      window.dispatchEvent(new Event("auth:expired"));
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell>
      <p className="eyebrow">BẢO VỆ TÀI KHOẢN</p>
      <h1>Đặt mật khẩu mới.</h1>
      <p className="muted">
        Dùng ít nhất 8 ký tự. Sau khi đổi, các phiên đăng nhập cũ sẽ hết hiệu
        lực.
      </p>
      {!token ? (
        <div className="notice notice-error">
          Thiếu liên kết hợp lệ.{" "}
          <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          <label className="field">
            Mật khẩu mới
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="field">
            Nhập lại mật khẩu
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button className="btn full-width" disabled={busy}>
            {busy ? "Đang cập nhật..." : "Lưu mật khẩu mới"}
          </button>
        </form>
      )}
      <p className="auth-switch">
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </AuthShell>
  );
}
