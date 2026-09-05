import React from 'react';
import { ShieldCheck, HelpCircle, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

export default function BoundedAICard({ cardData, onApprove, onDecline, isProcessing }) {
  if (!cardData) return null;

  return (
    <div className="glass-panel pulse-glow animate-fade-in" style={{
      padding: '24px',
      border: '1px solid #c7d2fe',
      background: '#ffffff',
      borderRadius: '16px',
      marginTop: '20px',
      boxShadow: '0 8px 24px rgba(79, 70, 229, 0.08)'
    }}>
      {/* Header Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#059669" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#0f172a' }}>
            Bounded & Gated AI Decision Engine
          </span>
        </div>
        <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Lock size={12} /> Permission Gated
        </span>
      </div>

      <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '16px' }}>
        The AI has generated a revenue-optimized recommendation. Action is strictly bounded and will not charge or modify your cart without explicit approval.
      </p>

      {/* Grid Rationale Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Reason */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>
            📌 Reason / Intent
          </div>
          <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4 }}>
            {cardData.reason}
          </div>
        </div>

        {/* Upsell / Cross-sell */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '4px' }}>
            🛍️ Cross-sell / Upsell
          </div>
          <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4 }}>
            {cardData.upsell}
          </div>
        </div>

        {/* Expected Benefit */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>
            💡 Expected Benefit
          </div>
          <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4 }}>
            {cardData.expected_benefit}
          </div>
        </div>

        {/* Permission Required */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>
            🛡️ Gate & Permission
          </div>
          <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4 }}>
            {cardData.permission}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '16px',
        borderTop: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Approved Bundle Price: </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginLeft: '6px' }}>
            ₹{cardData.price?.toLocaleString('en-IN')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onDecline}
            className="btn-secondary"
            disabled={isProcessing}
            style={{ fontSize: '0.85rem' }}
          >
            Decline
          </button>

          <button
            onClick={onApprove}
            className="btn-primary"
            disabled={isProcessing}
            style={{ fontSize: '0.9rem', padding: '10px 22px' }}
          >
            {isProcessing ? 'Initiating Razorpay...' : (
              <>
                <CheckCircle2 size={18} /> Approve & Checkout <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
