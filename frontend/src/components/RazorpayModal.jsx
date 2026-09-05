import React, { useState } from 'react';
import { CreditCard, AlertTriangle, RefreshCw, CheckCircle, X, ShieldAlert, Zap, Lock, Smartphone, Landmark, Banknote } from 'lucide-react';

export default function RazorpayModal({ orderData, onClose, onSuccess, onFailure }) {
  const [failureResult, setFailureResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'cod'
  const [isChangingMode, setIsChangingMode] = useState(false);

  if (!orderData) return null;

  const handlePaySuccess = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:8000/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderData.id,
          razorpay_payment_id: `pay_success_${Math.random().toString(36).substr(2, 9)}`,
          payment_mode: paymentMode
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
    setIsProcessing(false);
  };

  const paymentMethods = [
    { id: 'upi', name: 'UPI (GPay / PhonePe / Paytm)', desc: 'Instant 1-click test approval', icon: Smartphone },
    { id: 'card', name: 'Credit & Debit Cards', desc: 'Visa, Mastercard, RuPay', icon: CreditCard },
    { id: 'netbanking', name: 'NetBanking (Top 50+ Banks)', desc: 'HDFC, ICICI, SBI, Axis', icon: Landmark },
    { id: 'cod', name: 'Cash / Pay on Delivery', desc: 'Pay when delivered to your door', icon: Banknote }
  ];

  const selectedMethod = paymentMethods.find(m => m.id === paymentMode) || paymentMethods[0];

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 140 }}>
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
              RAZORPAY GATEWAY
            </span>
          </div>
          <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
            <Lock size={10} /> 256-Bit SSL Encrypted
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
                Your cart is still saved safely. No inventory or order was marked as paid.
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
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
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
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Order Reference: </span>
              <code style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 700 }}>{orderData.id}</code>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                ₹{(orderData.amount / 100).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Payment Method Selector & Change Mode */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Payment Mode
                </span>
                <button
                  type="button"
                  onClick={() => setIsChangingMode(prev => !prev)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#7c3aed',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {isChangingMode ? 'Done' : 'Change Mode'}
                </button>
              </div>

              {isChangingMode ? (
                /* Mode Options List */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {paymentMethods.map(m => {
                    const Icon = m.icon;
                    const isSelected = paymentMode === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setPaymentMode(m.id);
                          setIsChangingMode(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: isSelected ? '#f5f3ff' : '#f8fafc',
                          border: `1.5px solid ${isSelected ? '#7c3aed' : '#e2e8f0'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Icon size={18} color={isSelected ? '#7c3aed' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? '#7c3aed' : '#0f172a' }}>{m.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{m.desc}</div>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="pay_mode_select"
                          checked={isSelected}
                          onChange={() => {
                            setPaymentMode(m.id);
                            setIsChangingMode(false);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Selected Mode Preview */
                <div
                  onClick={() => setIsChangingMode(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#f5f3ff',
                    border: '1.5px solid #7c3aed',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <selectedMethod.icon size={20} color="#7c3aed" />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{selectedMethod.name}</div>
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{selectedMethod.desc}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>Change</span>
                </div>
              )}
            </div>

            {/* Test Mode Notification */}
            <div style={{
              background: '#fffbeb',
              border: '1px dashed #fde68a',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> RAZORPAY TEST SIMULATOR
              </div>
              <p style={{ fontSize: '0.75rem', color: '#78350f', margin: 0 }}>
                Simulate instant payment verification or test the required graceful failure recovery flow.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handlePaySuccess}
                disabled={isProcessing}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', cursor: 'pointer' }}
              >
                {isProcessing ? 'Verifying with Razorpay...' : (
                  <>
                    <CheckCircle size={18} /> Pay ₹{(orderData.amount / 100).toLocaleString('en-IN')} ({selectedMethod.name.split(' ')[0]})
                  </>
                )}
              </button>

              <button
                onClick={handleTriggerFailure}
                disabled={isProcessing}
                className="btn-danger"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', cursor: 'pointer' }}
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
