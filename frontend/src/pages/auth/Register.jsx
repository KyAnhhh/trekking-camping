import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authService } from '../../api/authService';
import { useLanguage } from '../../context/LanguageContext';
import AuthShell from '../../components/common/AuthShell';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import { errorMessage } from '../../utils/tour';

export default function Register() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { t } = useLanguage();
  const navigate = useNavigate();

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận chưa trùng khớp.');
      return;
    }
    if (new TextEncoder().encode(form.password).length > 72) {
      setError('Mật khẩu không được vượt quá 72 byte.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await authService.register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      navigate('/login', { state: { registered: true }, replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <p className="eyebrow">TREK & CAMP</p>
      <h1>{t('auth.register_title')}</h1>
      <p className="muted">{t('auth.register_desc')}</p>

      {/* Đăng ký & Đăng nhập nhanh qua Google */}
      <GoogleLoginButton onError={(msg) => setError(msg)} />

      <div className="auth-divider">
        <span>{t('auth.or_divider')}</span>
      </div>

      <form className="form-stack" onSubmit={submit}>
        {error && (
          <div role="alert" className="notice notice-error">
            {error}
          </div>
        )}
        <label className="field">
          {t('auth.full_name')}
          <input
            required
            name="fullName"
            autoComplete="name"
            value={form.fullName}
            onChange={change}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            {t('auth.email')}
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={change}
            />
          </label>
          <label className="field">
            {t('auth.phone')}
            <input
              required
              type="tel"
              name="phone"
              autoComplete="tel"
              value={form.phone}
              onChange={change}
            />
          </label>
        </div>
        <label className="field">
          {t('auth.password')}
          <input
            required
            minLength={8}
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={change}
          />
          <small className="muted">Ít nhất 8 ký tự.</small>
        </label>
        <label className="field">
          {t('auth.confirm_password')}
          <input
            required
            type="password"
            name="confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={change}
          />
        </label>
        <button className="btn full-width" disabled={busy}>
          {busy ? t('auth.registering') : t('auth.register_btn')}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">
        {t('auth.have_account')} <Link to="/login">{t('auth.signin_now')}</Link>
      </p>
    </AuthShell>
  );
}
