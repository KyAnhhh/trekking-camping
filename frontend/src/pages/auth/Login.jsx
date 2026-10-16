import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { authService } from "../../api/authService";
import AuthShell from "../../components/common/AuthShell";
import { errorMessage } from "../../utils/tour";
export default function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { login } = useContext(AuthContext),
    location = useLocation(),
    navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { token, user } = (
        await authService.login({ email: email.trim(), password })
      ).data.data;
      const rawRole = user.role?.name || user.role || "ROLE_USER";
      const role = rawRole.startsWith("ROLE_") ? rawRole : "ROLE_" + rawRole;
      login({
        token,
        role,
        username: user.username || user.email,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      });
      navigate(
        location.state?.from || (role === "ROLE_ADMIN" ? "/admin" : role === "ROLE_GUIDE" ? "/guide-workspace" : "/"),
        { replace: true },
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell>
      <p className="eyebrow">CHÀO MỪNG BẠN TRỞ LẠI</p>
      <h1>Tiếp nối hành trình.</h1>
      <p className="muted">
        Đăng nhập để đặt tour và theo dõi chuyến đi của bạn.
      </p>
      {location.state?.registered && (
        <div className="notice notice-success" role="status">
          Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.
        </div>
      )}
      <form className="form-stack" onSubmit={submit}>
        {location.state?.passwordReset && (
          <div className="notice notice-success" role="status">
            Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.
          </div>
        )}
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}
        <label className="field">
          Email
          <input
            autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@example.com"
          />
        </label>
        <label className="field">
          Mật khẩu
          <span className="password-field">
            <input
              autoComplete="current-password"
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <button className="btn full-width" disabled={busy}>
          {busy ? "Đang đăng nhập..." : "Đăng nhập"}
          <ArrowRight size={17} />
        </button>
        <Link className="text-link" to="/forgot-password">
          Quên mật khẩu?
        </Link>
      </form>
      <p className="auth-switch">
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>
    </AuthShell>
  );
}
