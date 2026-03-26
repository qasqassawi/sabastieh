import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Catalog from './pages/Catalog';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import Welcome from './pages/Welcome';
import { CartProvider } from './context/CartContext';
import { BakeryProvider } from './context/BakeryContext';
import { GoogleMapsProvider } from './context/GoogleMapsContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import PWAInstallPrompt from './components/PWAInstallPrompt';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userName = localStorage.getItem('userName');
  if (!userName) {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <BakeryProvider>
        <CartProvider>
          <GoogleMapsProvider>
            <AppContent />
          </GoogleMapsProvider>
        </CartProvider>
      </BakeryProvider>
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/welcome';

  // Initialize Firebase Push Notifications (only runs on native Android)
  usePushNotifications();

  return (
    <div className="app-layout">
      {!isWelcomePage && <Navbar />}
      <PWAInstallPrompt>
        <main className={!isWelcomePage ? "main-content" : "welcome-layout"}>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
            <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </PWAInstallPrompt>
    </div>
  );
}

export default App;
