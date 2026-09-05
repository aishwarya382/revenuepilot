import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CustomerPortal from './components/CustomerPortal';
import CustomerOrdersView from './components/CustomerOrdersView';
import MerchantPortal from './components/MerchantPortal';
import AuditTrailDrawer from './components/AuditTrailDrawer';
import CartDrawer from './components/CartDrawer';
import RazorpayModal from './components/RazorpayModal';

export default function App() {
  const { user: currentUser, token, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'orders' | 'merchant'
  
  // Cart & Audit States
  const [cartData, setCartData] = useState({ items: [], total_amount: 0, total_items: 0 });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Checkout Modal State from Cart Drawer
  const [cartCheckoutOrder, setCartCheckoutOrder] = useState(null);

  // Sync activeTab when user logs in or role changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'merchant') {
        setActiveTab('merchant');
      } else {
        setActiveTab(prev => (prev === 'merchant' ? 'customer' : prev));
      }
    }
  }, [currentUser]);

  const fetchCart = useCallback(async () => {
    if (!currentUser || currentUser.role === 'merchant') return;
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`http://localhost:8000/api/cart/${currentUser.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCartData(data);
      }
    } catch (err) {
      console.error('Cart fetch error:', err);
    }
  }, [currentUser, token]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('http://localhost:8000/api/audit-logs', { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.audit_logs || []);
      }
    } catch (err) {
      console.error('Audit fetch error:', err);
    }
  }, [token]);

  useEffect(() => {
    if (currentUser) {
      fetchCart();
      fetchAuditLogs();
      const interval = setInterval(() => {
        fetchAuditLogs();
        fetchCart();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchCart, fetchAuditLogs]);

  const handleLogout = () => {
    logout();
    setCartData({ items: [], total_amount: 0, total_items: 0 });
  };

  const handleRemoveCartItem = async (itemId) => {
    if (!currentUser) return;
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`http://localhost:8000/api/cart/${currentUser.id}/items/${itemId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setCartData(data);
        fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCartCheckout = async () => {
    if (!currentUser || cartData.items.length === 0) return;
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('http://localhost:8000/api/razorpay/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: cartData.total_amount,
          customer_id: currentUser.id,
          items: cartData.items
        })
      });
      const order = await res.json();
      setIsCartOpen(false);
      setCartCheckoutOrder(order);
    } catch (err) {
      console.error(err);
    }
  };

  // Prevent flash while verifying active session on page refresh
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px auto'
          }} />
          <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
            Restoring RevenuePilot AI session...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLogin={() => {}} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          // Prevent role violations on client navigation
          if (currentUser.role === 'customer' && tab === 'merchant') return;
          if (currentUser.role === 'merchant' && tab !== 'merchant') return;
          setActiveTab(tab);
        }}
        onOpenAuditLog={() => setIsAuditOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        cartCount={cartData.total_items || 0}
        onLogout={handleLogout}
      />

      {/* Main Body Split: Left Sidebar + Right Dynamic Main View */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (currentUser.role === 'customer' && tab === 'merchant') return;
            if (currentUser.role === 'merchant' && tab !== 'merchant') return;
            setActiveTab(tab);
          }}
          onOpenAuditLog={() => setIsAuditOpen(true)}
        />

        <main style={{ flex: 1, background: '#f8fafc', minWidth: 0 }}>
          {/* CUSTOMER VIEWS */}
          {currentUser.role === 'customer' && (
            <>
              {activeTab === 'customer' && (
                <CustomerPortal
                  currentUser={currentUser}
                  onCartUpdate={fetchCart}
                  onAuditUpdate={fetchAuditLogs}
                />
              )}
              {activeTab === 'orders' && (
                <CustomerOrdersView
                  currentUser={currentUser}
                  onNavigateToShop={() => setActiveTab('customer')}
                />
              )}
            </>
          )}

          {/* MERCHANT VIEWS */}
          {currentUser.role === 'merchant' && (
            <MerchantPortal currentUser={currentUser} onAuditUpdate={fetchAuditLogs} />
          )}
        </main>
      </div>

      {/* Cart Drawer Modal */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartData={cartData}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleCartCheckout}
      />

      {/* Audit Trail Drawer Modal */}
      <AuditTrailDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        auditLogs={auditLogs}
      />

      {/* Razorpay Checkout Modal for Cart */}
      {cartCheckoutOrder && (
        <RazorpayModal
          orderData={cartCheckoutOrder}
          onClose={() => setCartCheckoutOrder(null)}
          onSuccess={() => {
            setCartCheckoutOrder(null);
            fetchCart();
            fetchAuditLogs();
            setActiveTab('orders'); // Jump to orders view
          }}
          onFailure={() => {
            fetchAuditLogs();
          }}
        />
      )}

    </div>
  );
}
