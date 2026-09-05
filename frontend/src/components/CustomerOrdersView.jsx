import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle2, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CustomerOrdersView({ currentUser, onNavigateToShop }) {
  const customerId = currentUser?.id || 'cust_demo_01';
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:8000/api/orders/customer/${customerId}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [customerId]);

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            My Orders
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Verified order history and Razorpay payment records.
          </p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
          Refresh Orders
        </button>
      </div>

      {isLoading ? (
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center' }}>
          <Clock size={32} color="#7c3aed" className="pulse-glow" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Loading your verified orders...</h3>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <ShoppingBag size={28} color="#94a3b8" />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>No Orders Placed Yet</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '360px', margin: '0 auto 24px auto' }}>
            Ask our AI shopping assistant to find products and place your first order.
          </p>
          <button onClick={onNavigateToShop} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
            Start Shopping with AI <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                padding: '20px 24px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
              }}
            >
              {/* Order Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>
                    Order ID: <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.id}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Placed on: {order.created_at ? new Date(order.created_at).toLocaleString() : 'Recent'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: order.status === 'PAID' ? '#ecfdf5' : order.status === 'FAILED' ? '#fef2f2' : '#eff6ff',
                    color: order.status === 'PAID' ? '#059669' : order.status === 'FAILED' ? '#dc2626' : '#2563eb',
                    border: `1px solid ${order.status === 'PAID' ? '#a7f3d0' : order.status === 'FAILED' ? '#fecaca' : '#bfdbfe'}`
                  }}>
                    {order.status === 'PAID' ? '✓ PAID (Razorpay)' : order.status}
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{order.total_amount?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Order Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {order.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={16} color="#7c3aed" />
                        <span style={{ fontWeight: 600 }}>{it.name}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>× {it.quantity}</span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        ₹{(it.price * it.quantity)?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>1 Verified Item / Bundle</div>
                )}
              </div>

              {/* Razorpay Meta Footer */}
              <div style={{ background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', fontSize: '0.72rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>Razorpay Order: <code>{order.razorpay_order_id || 'N/A'}</code></span>
                <span>Payment ID: <code>{order.razorpay_payment_id || 'Test Payment'}</code></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
