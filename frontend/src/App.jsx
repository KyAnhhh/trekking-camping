import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ChatProvider } from './context/ChatContext';
import { BookingSocketProvider } from './context/BookingSocketContext';
import RealtimeBookingToast from './components/common/RealtimeBookingToast';
import AppRoutes from './routes/AppRoutes';
import { FavoritesProvider } from './context/FavoritesContext';
import { CompareProvider } from './context/CompareContext';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <CompareProvider>
              <FavoritesProvider>
                <ChatProvider>
                  <BookingSocketProvider>
                    <AppRoutes />
                    <RealtimeBookingToast />
                  </BookingSocketProvider>
                </ChatProvider>
              </FavoritesProvider>
            </CompareProvider>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
