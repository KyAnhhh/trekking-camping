import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import AppRoutes from './routes/AppRoutes';
import { FavoritesProvider } from './context/FavoritesContext';
import { CompareProvider } from './context/CompareContext';
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CompareProvider><FavoritesProvider><ChatProvider>
          <AppRoutes />
        </ChatProvider></FavoritesProvider></CompareProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
