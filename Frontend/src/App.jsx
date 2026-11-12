// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserHomePage from './pages/UserHomePage';
import UserDashboard from './pages/UserDashboard';
import MarketPage from './pages/MarketPage';
import TransactionsPage from './pages/TransactionsPage';
import ProfilePage from './pages/ProfilePage';
import VerificationPage from './pages/VerificationPage';
import ReferralsPage from './pages/ReferralsPage';
import TermsPolicyPage from './pages/TermsPolicyPage';
import AboutUsPage from './pages/AboutUsPage';
import SimplexChannelPage from './pages/SimplexChannelPage';
import AdminDashboard from './pages/AdminDashboard';
import { useAuthStore } from './store/useAuthStore';

function App() {
  const { isAuthenticated, role } = useAuthStore();

  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/simplex-channel" element={<SimplexChannelPage />} />

      {/* Protected User Dashboard Routes */}
      <Route element={<ProtectedRoute allowedRoles={['user']} />}>
        <Route path="/dashboard-home" element={<UserHomePage />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        <Route path="/referrals-page" element={<ReferralsPage />} />
        <Route path="/terms-policy" element={<TermsPolicyPage />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      {/* Smart Fallback Redirect based on Role */}
      <Route
        path="*"
        element={
          !isAuthenticated ? (
            <Navigate to="/" replace />
          ) : role === 'admin' ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/dashboard-home" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;