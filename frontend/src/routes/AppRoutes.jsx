import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ClientLayout from "../layouts/ClientLayout";
import Home from "../pages/client/Home";
const Login = lazy(() => import("../pages/auth/Login"));
const Profile = lazy(() => import("../pages/client/Profile"));
const Planner = lazy(() => import("../pages/client/Planner"));
const Register = lazy(() => import("../pages/auth/Register"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const ChatPage = lazy(() => import("../pages/client/ChatPage"));
const Handbook = lazy(() => import("../pages/client/Handbook"));
const About = lazy(() => import("../pages/client/About"));
const Destinations = lazy(() => import("../pages/client/Destinations"));
const Contact = lazy(() => import("../pages/client/Contact"));
const TourList = lazy(() => import("../pages/client/TourList"));
const TourDetail = lazy(() => import("../pages/client/TourDetail"));
const Booking = lazy(() => import("../pages/client/Booking"));
const MyBookings = lazy(() => import("../pages/client/MyBookings"));
const BookingDetail = lazy(() => import("../pages/client/BookingDetail"));
const MomoReturn = lazy(() => import("../pages/client/MomoReturn"));
const VnpayReturn = lazy(() => import("../pages/client/VnpayReturn"));
const AdminBookings = lazy(() => import("../pages/admin/AdminBookings"));
const AdminPayments = lazy(() => import("../pages/admin/AdminPayments"));
const AdminReviews = lazy(() => import("../pages/admin/AdminReviews"));
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const Dashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminTours = lazy(() => import("../pages/admin/AdminTours"));
const AdminTourDetail = lazy(() => import("../pages/admin/AdminTourDetail"));
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers"));
const AdminKnowledge = lazy(() => import("../pages/admin/AdminKnowledge"));
function NotFound() {
  return (
    <div className="container not-found">
      <p className="eyebrow">404 / LẠC ĐƯỜNG MỘT CHÚT</p>
      <h1>Cung đường này chưa có trên bản đồ.</h1>
      <p className="muted">
        Trang bạn tìm không tồn tại hoặc đã thay đổi đường dẫn.
      </p>
      <Link className="btn" to="/">
        Về trang chủ
      </Link>
    </div>
  );
}
const AdminGuides = lazy(() => import("../pages/admin/AdminGuides"));
const GuideProfile = lazy(() => import("../pages/client/GuideProfile"));
export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner label="Đang mở trang..." />}>
      <Routes>
        <Route element={<ClientLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="planner"
            element={
              <ProtectedRoute>
                <Planner />
              </ProtectedRoute>
            }
          />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="handbook" element={<Handbook />} />
          <Route path="about" element={<About />} />
          <Route path="destinations" element={<Destinations />} />
          <Route path="contact" element={<Contact />} />
          <Route path="tours" element={<TourList />} />
          <Route path="tours/:slug" element={<TourDetail />} />
          <Route path="guides/:id" element={<GuideProfile />} />
          <Route
            path="tours/:slug/booking"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
          <Route
            path="my-bookings/:id"
            element={
              <ProtectedRoute>
                <BookingDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment/momo/return"
            element={
              <ProtectedRoute>
                <MomoReturn />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment/vnpay/return"
            element={
              <ProtectedRoute>
                <VnpayReturn />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={["ROLE_ADMIN", "ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="tours" element={<AdminTours />} />
          <Route path="tours/:slug" element={<AdminTourDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="guides" element={<AdminGuides />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="bookings/:id" element={<BookingDetail admin />} />
          <Route path="knowledge" element={<AdminKnowledge />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
