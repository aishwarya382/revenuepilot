import React from 'react';
import { ShoppingCart, Trash2, ArrowRight } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose, cartData, onRemoveItem, onCheckout }) {
  if (!isOpen) return null;

  const items = cartData?.items || [];
  const totalAmount = cartData?.total_amount || 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 130,
          fontFamily: "'Inter', sans-serif"
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Your Cart</h3>
              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{items.length} verified items</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700 }}>
            ✕
          </button>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {items.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <ShoppingCart size={24} color="#94a3b8" />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Your cart is empty</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '240px' }}>
                Ask the AI assistant for any product to add it to your cart.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id || item.item_id || item.product_id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  alignItems: 'center'
                }}
              >
                <img
                  src={item.image_url || item.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80'}
                  alt={item.name}
                  style={{ width: '54px', height: '54px', borderRadius: '8px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Qty: {item.quantity} × ₹{item.price?.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7c3aed' }}>
                    ₹{item.item_total?.toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id || item.item_id || item.product_id)}
                  title="Remove from cart"
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#dc2626',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout */}
        {items.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Total Payable:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <button
              onClick={onCheckout}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '14px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)'
              }}
            >
              Proceed to Checkout <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
