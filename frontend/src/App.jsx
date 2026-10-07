import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import AppRoutes from './routes/AppRoutes';
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ChatProvider>
          <AppRoutes />
        </ChatProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
