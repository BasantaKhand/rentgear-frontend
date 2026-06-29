import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';

import Home from './pages/Home';
import Equipment from './pages/Equipment';
import EquipmentDetail from './pages/EquipmentDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MyBookings from './pages/MyBookings';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';

import Dashboard from './pages/admin/Dashboard';
import ManageEquipment from './pages/admin/ManageEquipment';
import ManageBookings from './pages/admin/ManageBookings';
import ManageUsers from './pages/admin/ManageUsers';
import Reports from './pages/admin/Reports';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="app-container">
            <Navbar />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/equipment/:id" element={<EquipmentDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes (require login) */}
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes (require admin role) */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Dashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/equipment"
                element={
                  <AdminRoute>
                    <ManageEquipment />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/bookings"
                element={
                  <AdminRoute>
                    <ManageBookings />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <ManageUsers />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <AdminRoute>
                    <Reports />
                  </AdminRoute>
                }
              />
            </Routes>
            <Footer />
          </div>
          <Toaster position="top-right" />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
