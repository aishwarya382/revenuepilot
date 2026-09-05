import React from 'react';
import { ShoppingCart, Zap, LogOut, ShieldCheck, Package, RefreshCw } from 'lucide-react';
import RevenueLogo from './RevenueLogo';

export default function Header({ currentUser, activeTab, setActiveTab, onOpenAuditLog, onOpenCart, cartCount = 0, onLogout, onSwitchMode }) {
  const isMerchant = currentUser?.role === 'merchant';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 28px',
      borderBottom: '1px solid #e2e8f0',
      background: '#ffffff',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Brand & Left Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab(isMerchant ? 'merchant' : 'customer')}>
          <RevenueLogo size={36} withGlow={true} />
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Revenue Pilot <span style={{ background: 'linear-gradient(135deg, #9333ea, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
            </h1>
            <span style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Commerce Intelligence
            </span>
          </div>
        </div>

        {/* Role-Isolated Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.875rem', fontWeight: 600 }}>
          {!isMerchant ? (
            <>
              <span
                style={{ color: activeTab === 'customer' ? '#7c3aed' : '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setActiveTab('customer')}
              >
                <Zap size={15} /> AI Shopping Assistant
              </span>
              <span
                style={{ color: activeTab === 'orders' ? '#7c3aed' : '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setActiveTab('orders')}
              >
                <Package size={15} /> My Orders
              </span>
            </>
          ) : (
            <span
              style={{ color: activeTab === 'merchant' ? '#7c3aed' : '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setActiveTab('merchant')}
            >
              💼 Merchant Dashboard
            </span>
          )}
        </nav>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        
        {/* Real Live Cart Button (Customer Only) */}
        {!isMerchant && (
          <button
            onClick={onOpenCart}
            style={{
              position: 'relative',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '8px 14px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#0f172a',
              fontSize: '0.85rem',
              fontWeight: 700
            }}
          >
            <ShoppingCart size={17} color="#7c3aed" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span style={{
                background: '#7c3aed',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '2px 7px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}>
                {cartCount}
              </span>
            )}
          </button>
        )}

        {/* Audit Trail Button */}
        <button
          onClick={onOpenAuditLog}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '8px 12px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#475569',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <ShieldCheck size={16} color="#059669" />
          <span>Audit Log</span>
        </button>

        {/* User Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '10px', borderLeft: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{currentUser?.name || 'User'}</div>
            <div style={{ fontSize: '0.7rem', color: isMerchant ? '#7c3aed' : '#059669', fontWeight: 600, textTransform: 'capitalize' }}>
              {isMerchant ? 'Merchant Admin' : 'Customer Account'}
            </div>
          </div>
          {onSwitchMode && (
            <button
              onClick={onSwitchMode}
              title={`Switch to ${isMerchant ? 'Customer' : 'Merchant'} Mode`}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.725rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={12} color="#7c3aed" />
              <span>{isMerchant ? 'Customer Mode' : 'Merchant Mode'}</span>
            </button>
          )}
          <button
            onClick={onLogout}
            title="Sign Out"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '8px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>

      </div>
    </header>
  );
}
