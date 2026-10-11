import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from './components/AnimatedBackground.js';
import { Navbar } from './components/Navbar.js';
import { useAuthStore } from './store/authStore.js';

// Lazy-loaded pages for code splitting
import { lazy, Suspense } from 'react';
const LandingPage = lazy(() => import('./pages/LandingPage.js'));
const LoginPage = lazy(() => import('./pages/LoginPage.js'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.js'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.js'));
const ChatPage = lazy(() => import('./pages/ChatPage.js'));
const ContactsPage = lazy(() => import('./pages/ContactsPage.js'));
const CallsPage = lazy(() => import('./pages/CallsPage.js'));
const SecurityPage = lazy(() => import('./pages/SecurityPage.js'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.js'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.js'));
const AboutPage = lazy(() => import('./pages/AboutPage.js'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="relative">
      <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
      <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10 border-b-cyan-400/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
    </div>
  </div>
);

// Protected Route guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

// Public Route guard (redirects to /chat if already logged in)
const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/chat" replace />;

  return <>{children}</>;
};

// Import call overlay components
import { IncomingCallDialog } from './components/IncomingCallDialog.js';
import { CallScreen } from './components/CallScreen.js';
import { ToastNotifications } from './components/ToastNotifications.js';

// Routes wrapper with animation
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <ContactsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calls"
            element={
              <ProtectedRoute>
                <CallsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <SecurityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

// App root — wraps everything
function AppContent() {
  const { checkAuth } = useAuthStore();
  const location = useLocation();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Pages that show full-screen background (no navbar overlay needed)
  const noNavbarPages: string[] = [];
  const showNavbar = !noNavbarPages.includes(location.pathname);

  return (
    <div className="relative min-h-screen text-[#F5F5F5]">
      {/* Always-present animated background */}
      <AnimatedBackground />

      {/* Navigation bar */}
      {showNavbar && <Navbar />}

      {/* Page content */}
      <div className="relative z-10">
        <AnimatedRoutes />
      </div>

      {/* Global call UI overlays (visible app-wide) */}
      <IncomingCallDialog />
      <CallScreen />

      {/* Toast notifications */}
      <ToastNotifications />
    </div>
  );
}

// App entry point with Router
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
