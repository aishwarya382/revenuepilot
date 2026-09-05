import React, { useState } from 'react';
import { CreditCard, AlertTriangle, RefreshCw, CheckCircle, X, ShieldAlert, Zap, Lock } from 'lucide-react';

export default function RazorpayModal({ orderData, onClose, onSuccess, onFailure }) {
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [failureResult, setFailureResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!orderData) return null;

  const handlePaySuccess = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:8000/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderData.id,
          razorpay_payment_id: `pay_success_${Math.random().toString(36).substr(2, 9)}`
        })
      });
      const data = await res.json();
      setIsProcessing(false);
      onSuccess(data);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleTriggerFailure = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:8000/api/razorpay/simulate-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderData.id,
          amount: orderData.amount / 100,
          reason: 'Test payment failure (Gateway timeout)'
        })
      });
      const data = await res.json();
      setIsProcessing(false);
      setFailureResult(data);
      if (onFailure) onFailure(data);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setFailureResult(null);
    setIsSimulatingFailure(false);
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        {/* Razorpay Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            background: '#eff6ff',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CreditCard size={20} color="#2563eb" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.05em' }}>
              RAZORPAY TEST MODE
            </span>
          </div>
          <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
            <Lock size={10} /> Secure SSL
          </span>
        </div>

        {/* Failure Handling State */}
        {failureResult ? (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Failure Warning Card */}
            <div style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e11d48', fontWeight: 800, fontSize: '1rem', marginBottom: '8px' }}>
                <ShieldAlert size={22} /> ⚠️ Payment wasn't completed.
              </div>
              <p style={{ fontSize: '0.85rem', color: '#9f1239', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>
                Your cart is still saved. No order was marked as paid.
              </p>
            </div>

            {/* AI Bounded Failure Log Details */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: '#475569'
            }}>
              <div style={{ fontWeight: 700, color: '#d97706', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} /> Graceful Failure Recovery:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>• Order Status: <strong style={{ color: '#e11d48' }}>PAYMENT_FAILED</strong></div>
                <div>• Inventory: <strong style={{ color: '#059669' }}>NOT DECREMENTED</strong></div>
                <div>• Customer Cart: <strong style={{ color: '#059669' }}>PRESERVED</strong></div>
                <div>• Audit Trail: <strong style={{ color: '#4f46e5' }}>RECORDED</strong></div>
              </div>
            </div>

            {/* Recovery Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleRetry}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <RefreshCw size={16} /> Retry Payment
              </button>

              <button
                onClick={onClose}
                className="btn-secondary"
                style={{ width: '100%', padding: '12px', fontSize: '0.85rem', justifyContent: 'center', cursor: 'pointer' }}
              >
                Return to Cart
              </button>
            </div>
          </div>
        ) : (
          /* Normal Checkout State */
          <div>
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Order ID: </span>
              <code style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 700 }}>{orderData.id}</code>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                ₹{(orderData.amount / 100).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={18} color="#4f46e5" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>UPI / Cards / NetBanking</div>
                    <div style={{ fontSize: '0.725rem', color: '#64748b' }}>Instant approval via Razorpay</div>
                  </div>
                </div>
                <input type="radio" defaultChecked name="pay_method" />
              </label>
            </div>

            {/* Judge Demo Toggle Box */}
            <div style={{
              background: '#fffbeb',
              border: '1px border-dashed #fde68a',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> JUDGE DEMO MODE
              </div>
              <p style={{ fontSize: '0.75rem', color: '#78350f' }}>
                Test the required payment failure & AI graceful recovery flow.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handlePaySuccess}
                disabled={isProcessing}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
              >
                {isProcessing ? 'Processing Payment...' : (
                  <>
                    <CheckCircle size={18} /> Pay ₹{(orderData.amount / 100).toLocaleString('en-IN')} (Success Demo)
                  </>
                )}
              </button>

              <button
                onClick={handleTriggerFailure}
                disabled={isProcessing}
                className="btn-danger"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
              >
                ⚠️ Trigger Payment Failure Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
