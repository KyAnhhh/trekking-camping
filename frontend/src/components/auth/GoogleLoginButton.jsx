import { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../api/authService';
import { errorMessage } from '../../utils/tour';

const DEFAULT_GOOGLE_CLIENT_ID = '454601127943-6hc8m8v0gcgstafovi5ibmoingg48825.apps.googleusercontent.com';

export default function GoogleLoginButton({ onError }) {
  const { login } = useContext(AuthContext);
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [busy, setBusy] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const buttonContainerRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      onError?.(
        language === 'en'
          ? 'Failed to receive credentials from Google.'
          : 'Không nhận được thông tin xác thực từ Google.'
      );
      return;
    }

    setBusy(true);
    try {
      const res = await authService.googleLogin({ idToken: response.credential });
      const { token, user } = res.data.data;
      const rawRole = user.role?.name || user.role || 'ROLE_USER';
      const role = rawRole.startsWith('ROLE_') ? rawRole : 'ROLE_' + rawRole;

      login({
        token,
        role,
        username: user.username || user.email,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      });

      const destination =
        location.state?.from ||
        (role === 'ROLE_ADMIN' ? '/admin' : role === 'ROLE_GUIDE' ? '/guide-workspace' : '/');
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = errorMessage(err);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // 1. Tải Google Identity Services (GIS)
    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-jssdk');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setGisLoaded(true);
      script.onerror = () => {
        setGisLoaded(false);
        onError?.(
          language === 'en'
            ? 'Could not connect to Google services. Please check your network.'
            : 'Không thể kết nối đến dịch vụ Google. Vui lòng kiểm tra lại mạng.'
        );
      };
      document.body.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setGisLoaded(true));
    }
  }, [language, onError]);

  useEffect(() => {
    if (!gisLoaded || !window.google?.accounts?.id || !buttonContainerRef.current) return;

    try {
      // 2. Khởi tạo GIS với Google Client ID chính thức của người dùng
      window.google.accounts.id.initialize({
        client_id: googleClientId.trim(),
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // 3. Render nút Google chính hãng với theme đồng bộ
      buttonContainerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        type: 'standard',
        theme: theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 380,
        locale: language === 'en' ? 'en' : 'vi',
      });
    } catch (err) {
      console.warn('Google Identity Services render error:', err);
    }
  }, [gisLoaded, googleClientId, theme, language]);

  const handleCustomButtonClick = () => {
    if (busy) return;
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // OneTap prompt bị chặn hoặc không hiển thị, GIS button trong container vẫn là điểm click trực tiếp
        }
      });
    } else {
      onError?.(
        language === 'en'
          ? 'Connecting to Google, please try again in a moment...'
          : 'Đang kết nối tới Google, vui lòng thử lại sau giây lát...'
      );
    }
  };

  return (
    <div className="google-auth-wrapper">
      {/* Vùng hiển thị nút Google Identity Services chính thức */}
      <div className="google-gis-container" ref={buttonContainerRef} />

      {/* Fallback button hiển thị khi script GIS chưa kịp nạp */}
      <button
        type="button"
        className="btn-google-auth"
        onClick={handleCustomButtonClick}
        disabled={busy}
        aria-label={t('auth.google_signin')}
      >
        <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{busy ? t('common.loading') : t('auth.google_signin')}</span>
      </button>
    </div>
  );
}
