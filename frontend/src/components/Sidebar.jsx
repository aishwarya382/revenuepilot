import React from 'react';
import { Package, FileText, ShieldCheck, Zap, Store } from 'lucide-react';

export default function Sidebar({ currentUser, activeTab, setActiveTab, onOpenAuditLog }) {
  const isMerchant = currentUser?.role === 'merchant';

  return (
    <aside style={{
      width: '240px',
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: 'calc(100vh - 65px)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div>
        {/* Role Mode Banner */}
        <div style={{
          background: isMerchant ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #4f46e5, #3b82f6)',
          color: '#ffffff',
          padding: '12px',
          borderRadius: '14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
        }}>
          <span style={{ fontSize: '1.2rem' }}>{isMerchant ? '💼' : '🛍️'}</span>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isMerchant ? 'MERCHANT MODE' : 'CUSTOMER MODE'}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
              {isMerchant ? 'Catalog & Orders Control' : 'AI Shopping Assistant'}
            </div>
          </div>
        </div>

        {/* CUSTOMER NAVIGATION */}
        {!isMerchant ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', padding: '6px 10px' }}>
              SHOPPING
            </div>

            <button
              onClick={() => setActiveTab('customer')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'customer' ? '#f3e8ff' : 'transparent',
                color: activeTab === 'customer' ? '#7c3aed' : '#475569',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Zap size={16} /> AI Shopping Assistant
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'orders' ? '#f3e8ff' : 'transparent',
                color: activeTab === 'orders' ? '#7c3aed' : '#475569',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Package size={16} /> My Orders
            </button>
          </div>
        ) : (
          /* MERCHANT NAVIGATION */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', padding: '6px 10px' }}>
              MERCHANT COMMAND
            </div>

            <button
              onClick={() => setActiveTab('merchant')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'merchant' ? '#f3e8ff' : 'transparent',
                color: activeTab === 'merchant' ? '#7c3aed' : '#475569',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Store size={16} /> Dashboard & Catalog
            </button>

            <button
              onClick={onOpenAuditLog}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <FileText size={16} /> AI Audit Trail
            </button>
          </div>
        )}
      </div>

      {/* Safety & Integrity Footer */}
      <div style={{
        background: '#f8fafc',
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        fontSize: '0.725rem',
        color: '#64748b',
        lineHeight: 1.4
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 700, marginBottom: '4px' }}>
          <ShieldCheck size={14} /> Database-Grounded AI
        </div>
        Verified catalog results with Razorpay test checkout.
      </div>
    </aside>
  );
}
