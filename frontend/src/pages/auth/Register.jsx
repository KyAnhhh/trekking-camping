import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authService } from '../../api/authService';
import AuthShell from '../../components/common/AuthShell';
import { errorMessage } from '../../utils/tour';
export default function Register() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
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
      <p className="eyebrow">BẮT ĐẦU CÙNG TREK & CAMP</p>
      <h1>Hẹn bạn ngoài thiên nhiên.</h1>
      <p className="muted">Tạo tài khoản để lưu dấu những chuyến đi của mình.</p>
      <form className="form-stack" onSubmit={submit}>
        {error && (
          <div role="alert" className="notice notice-error">
            {error}
          </div>
        )}
        <label className="field">
          Họ và tên
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
            Email
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
            Số điện thoại
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
          Mật khẩu
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
          Nhập lại mật khẩu
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
          {busy ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthShell>
  );
}
