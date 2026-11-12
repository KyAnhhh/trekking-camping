import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { authService } from "../../api/authService";
import AuthShell from "../../components/common/AuthShell";
import GoogleLoginButton from "../../components/auth/GoogleLoginButton";
import { errorMessage } from "../../utils/tour";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { login } = useContext(AuthContext);
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

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
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider || "LOCAL",
      });
      navigate(
        location.state?.from || (role === "ROLE_ADMIN" ? "/admin" : role === "ROLE_GUIDE" ? "/guide-workspace" : "/"),
        { replace: true }
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <p className="eyebrow">{t('auth.welcome_back')}</p>
      <h1>{t('auth.login_title')}</h1>
      <p className="muted">
        {t('auth.login_desc')}
      </p>

      {location.state?.registered && (
        <div className="notice notice-success" role="status">
          Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.
        </div>
      )}

      {/* Đăng nhập nhanh bằng tài khoản Google (GIS) */}
      <GoogleLoginButton onError={(msg) => setError(msg)} />

      <div className="auth-divider">
        <span>{t('auth.or_divider')}</span>
      </div>

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
          {t('auth.email')}
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
          {t('auth.password')}
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
          {busy ? t('auth.logging_in') : t('auth.login_btn')}
          <ArrowRight size={17} />
        </button>
        <Link className="text-link" to="/forgot-password">
          {t('auth.forgot_password')}
        </Link>
      </form>
      <p className="auth-switch">
        {t('auth.no_account')}{" "}
        <Link to="/register">{t('auth.register_now')}</Link>
      </p>
    </AuthShell>
  );
}
