import React, { useState, useEffect } from 'react';
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
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'orders' | 'merchant'
  
  // Cart & Audit States
  const [cartData, setCartData] = useState({ items: [], total_amount: 0, total_items: 0 });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Checkout Modal State from Cart Drawer
  const [cartCheckoutOrder, setCartCheckoutOrder] = useState(null);

  // Load persisted user on initial mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setCurrentUser(parsed);
      setActiveTab(parsed.role === 'merchant' ? 'merchant' : 'customer');
    }
  }, []);

  const fetchCart = async () => {
    if (!currentUser || currentUser.role === 'merchant') return;
    try {
      const res = await fetch(`http://localhost:8000/api/cart/${currentUser.id}`);
      const data = await res.json();
      setCartData(data);
    } catch (err) {
      console.error('Cart fetch error:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/audit-logs');
      const data = await res.json();
      setAuditLogs(data.audit_logs || []);
    } catch (err) {
      console.error('Audit fetch error:', err);
    }
  };

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
  }, [currentUser]);

  const handleLogin = (userObj) => {
    setCurrentUser(userObj);
    localStorage.setItem('currentUser', JSON.stringify(userObj));
    if (userObj.role === 'merchant') {
      setActiveTab('merchant');
    } else {
      setActiveTab('customer');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCartData({ items: [], total_amount: 0, total_items: 0 });
  };

  const handleRemoveCartItem = async (itemId) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`http://localhost:8000/api/cart/${currentUser.id}/items/${itemId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      setCartData(data);
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCartCheckout = async () => {
    if (!currentUser || cartData.items.length === 0) return;
    try {
      const res = await fetch('http://localhost:8000/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
          setActiveTab={setActiveTab}
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
