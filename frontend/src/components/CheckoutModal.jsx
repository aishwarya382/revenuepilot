import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Smartphone,
  Landmark,
  Banknote,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Package,
  ArrowRight,
  X,
  Plus,
  Lock,
  RefreshCw
} from 'lucide-react';

export default function CheckoutModal({
  isOpen,
  onClose,
  items,
  currentUser,
  token,
  onOrderCompleted,
  onNavigateToOrders
}) {
  // Step 1: 'address' | Step 2: 'summary' | Step 3: 'payment' | Step 4: 'confirmation' | 'failure'
  const [step, setStep] = useState('address');

  // Address State
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    full_name: currentUser?.name || '',
    phone_number: '',
    house_flat_building: '',
    street_area: '',
    city: '',
    state: '',
    pin_code: '',
    landmark: '',
    is_default: 1
  });
  const [addressError, setAddressError] = useState('');

  // Summary State (Backend-Calculated)
  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Payment Method State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CARD'); // 'CARD' | 'UPI' | 'NETBANKING' | 'COD'
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [createdRazorpayOrder, setCreatedRazorpayOrder] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  // Confirmed Order Result
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const customerId = currentUser?.id || 'cust_demo_01';

  // Fetch Saved Addresses
  const fetchAddresses = useCallback(async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`http://localhost:8000/api/customer/addresses?customer_id=${customerId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSavedAddresses(data);
        if (data.length > 0) {
          const defaultAddr = data.find(a => a.is_default === 1) || data[0];
          setSelectedAddressId(defaultAddr.id);
          setIsAddingNewAddress(false);
        } else {
          setIsAddingNewAddress(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    }
  }, [customerId, token]);

  // Fetch Authoritative Backend Summary
  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('http://localhost:8000/api/checkout/summary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_id: customerId,
          items: items && items.length > 0 ? items : undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to calculate summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [customerId, items, token]);

  useEffect(() => {
    if (isOpen) {
      setStep('address');
      setPaymentError(null);
      setConfirmedOrder(null);
      fetchAddresses();
      fetchSummary();
    }
  }, [isOpen, fetchAddresses, fetchSummary]);

  if (!isOpen) return null;

  const activeAddress = savedAddresses.find(a => a.id === selectedAddressId) || null;

  // Save new address handler
  const handleSaveAddress = async (e) => {
    if (e) e.preventDefault();
    setAddressError('');

    if (!addressForm.full_name.trim() || addressForm.full_name.trim().length < 2) {
      setAddressError('Please enter your full name (at least 2 characters).');
      return;
    }
    const cleanPhone = addressForm.phone_number.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setAddressError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!addressForm.house_flat_building.trim()) {
      setAddressError('Please enter House / Flat / Building.');
      return;
    }
    if (!addressForm.street_area.trim()) {
      setAddressError('Please enter Street / Area.');
      return;
    }
    if (!addressForm.city.trim()) {
      setAddressError('Please enter City.');
      return;
    }
    if (!addressForm.state.trim()) {
      setAddressError('Please enter State.');
      return;
    }
    if (!/^\d{6}$/.test(addressForm.pin_code.trim())) {
      setAddressError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('http://localhost:8000/api/customer/address', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...addressForm,
          customer_id: customerId
        })
      });
      const data = await res.json();
      if (res.ok && data.address) {
        setSavedAddresses(prev => [data.address, ...prev.filter(a => a.id !== data.address.id)]);
        setSelectedAddressId(data.address.id);
        setIsAddingNewAddress(false);
        setStep('summary');
      } else {
        setAddressError(data.error || 'Failed to save address.');
      }
    } catch (err) {
      console.error(err);
      setAddressError('Failed to connect to address service.');
    }
  };

  const handleProceedFromAddress = () => {
    if (isAddingNewAddress) {
      handleSaveAddress();
    } else {
      if (!selectedAddressId) {
        setAddressError('Please select or add a delivery address.');
        return;
      }
      setStep('summary');
    }
  };

  // Place Cash on Delivery (COD) Order
  const handlePlaceCodOrder = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('http://localhost:8000/api/checkout/cod', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_id: customerId,
          address_id: selectedAddressId,
          shipping_address: activeAddress,
          items: items && items.length > 0 ? items : undefined
        })
      });
      const data = await res.json();
      setIsProcessingPayment(false);

      if (res.ok && data.status === 'SUCCESS') {
        setConfirmedOrder(data);
        setStep('confirmation');
        if (onOrderCompleted) onOrderCompleted(data);
      } else {
        setPaymentError(data.error || 'Could not place Cash on Delivery order.');
        setStep('failure');
      }
    } catch (err) {
      console.error(err);
      setIsProcessingPayment(false);
      setPaymentError('Network error while placing Cash on Delivery order.');
      setStep('failure');
    }
  };

  // Initiate Online Payment (Razorpay Test Mode)
  const handleInitiateOnlinePayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('http://localhost:8000/api/razorpay/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_id: customerId,
          payment_method: selectedPaymentMethod,
          address_id: selectedAddressId,
          shipping_address: activeAddress,
          items: items && items.length > 0 ? items : undefined
        })
      });
      const order = await res.json();
      if (!res.ok || !order.id) {
        setIsProcessingPayment(false);
        setPaymentError(order.error || 'Failed to initialize payment gateway.');
        setStep('failure');
        return;
      }

      setCreatedRazorpayOrder(order);
      // Execute Razorpay Test Verification
      await handleVerifyRazorpay(order.id, selectedPaymentMethod);
    } catch (err) {
      console.error(err);
      setIsProcessingPayment(false);
      setPaymentError('Payment initialization failed. Please try again.');
      setStep('failure');
    }
  };

  // Verify Razorpay Payment on backend
  const handleVerifyRazorpay = async (razorpayOrderId, mode) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('http://localhost:8000/api/razorpay/verify-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: `pay_test_${Math.random().toString(36).substr(2, 9)}`,
          payment_mode: mode,
          customer_id: customerId
        })
      });
      const data = await res.json();
      setIsProcessingPayment(false);

      if (res.ok && data.status === 'SUCCESS') {
        setConfirmedOrder(data);
        setStep('confirmation');
        if (onOrderCompleted) onOrderCompleted(data);
      } else {
        setPaymentError(data.message || 'Payment verification failed.');
        setStep('failure');
      }
    } catch (err) {
      console.error(err);
      setIsProcessingPayment(false);
      setPaymentError('Payment verification failed.');
      setStep('failure');
    }
  };

  // Simulate payment failure for testing
  const handleSimulatePaymentFailure = async () => {
    setIsProcessingPayment(true);
    try {
      const rzpId = createdRazorpayOrder?.id || `rzp_sim_${Date.now()}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('http://localhost:8000/api/razorpay/simulate-failure', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          razorpay_order_id: rzpId,
          amount: summary?.total_amount || 500,
          reason: 'Card declined / Gateway timeout simulation',
          customer_id: customerId
        })
      });
      const data = await res.json();
      setIsProcessingPayment(false);
      setPaymentError(data.message || 'Payment was not completed.');
      setStep('failure');
    } catch (err) {
      console.error(err);
      setIsProcessingPayment(false);
      setPaymentError('Payment was not completed.');
      setStep('failure');
    }
  };

  const paymentOptions = [
    {
      id: 'CARD',
      name: 'Credit / Debit Card',
      desc: 'Visa, Mastercard, RuPay cards',
      icon: CreditCard,
      badge: 'Instant'
    },
    {
      id: 'UPI',
      name: 'UPI',
      desc: 'Google Pay, PhonePe, Paytm, BHIM',
      icon: Smartphone,
      badge: 'Popular'
    },
    {
      id: 'NETBANKING',
      name: 'Net Banking',
      desc: 'Pay directly via your bank account',
      icon: Landmark,
      badge: 'All Banks'
    },
    {
      id: 'COD',
      name: 'Cash on Delivery',
      desc: 'Pay in cash when order arrives at your door',
      icon: Banknote,
      badge: 'Pay Later'
    }
  ];

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 130 }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(15, 23, 42, 0.22)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Header with Steps */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#faf5ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Secure Checkout
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
                  🔒 256-Bit SSL Encrypted
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            {[
              { id: 'address', label: '1. Address' },
              { id: 'summary', label: '2. Summary' },
              { id: 'payment', label: '3. Payment' },
              { id: 'confirmation', label: '4. Done' }
            ].map((s) => {
              const isCompleted =
                (s.id === 'address' && step !== 'address') ||
                (s.id === 'summary' && (step === 'payment' || step === 'confirmation')) ||
                (s.id === 'payment' && step === 'confirmation');
              const isCurrent = step === s.id;

              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '0.72rem',
                    fontWeight: isCurrent || isCompleted ? 700 : 500,
                    background: isCurrent ? '#7c3aed' : isCompleted ? '#ecfdf5' : '#f1f5f9',
                    color: isCurrent ? '#ffffff' : isCompleted ? '#059669' : '#64748b',
                    border: isCompleted ? '1px solid #a7f3d0' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {isCompleted ? `✓ ${s.label.split('. ')[1]}` : s.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {/* =======================================================
              STEP 1: DELIVERY ADDRESS
              ======================================================= */}
          {step === 'address' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#7c3aed" /> Select Delivery Address
                </h4>
                {savedAddresses.length > 0 && !isAddingNewAddress && (
                  <button
                    onClick={() => setIsAddingNewAddress(true)}
                    style={{
                      background: '#f3e8ff',
                      color: '#7c3aed',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Add New Address
                  </button>
                )}
              </div>

              {addressError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <AlertCircle size={16} /> {addressError}
                </div>
              )}

              {/* Saved Addresses Radio Cards */}
              {!isAddingNewAddress && savedAddresses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '14px',
                          border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                          background: isSelected ? '#faf5ff' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <input
                          type="radio"
                          name="addressRadio"
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr.id)}
                          style={{ marginTop: '3px', accentColor: '#7c3aed' }}
                        />
                        <div style={{ flex: 1, fontSize: '0.83rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a' }}>{addr.full_name}</span>
                            {addr.is_default === 1 && (
                              <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                Default
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#475569', lineHeight: 1.4 }}>
                            {addr.house_flat_building}, {addr.street_area}
                          </div>
                          <div style={{ color: '#64748b', fontWeight: 600 }}>
                            {addr.city}, {addr.state} - <strong>{addr.pin_code}</strong>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
                            📞 {addr.phone_number} {addr.landmark ? `• Landmark: ${addr.landmark}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Address Form */}
              {isAddingNewAddress && (
                <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Priya Patel"
                        value={addressForm.full_name}
                        onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={addressForm.phone_number}
                        onChange={(e) => setAddressForm({ ...addressForm, phone_number: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      House / Flat / Building *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 402, Sunshine Heights"
                      value={addressForm.house_flat_building}
                      onChange={(e) => setAddressForm({ ...addressForm, house_flat_building: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Street / Area *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MG Road, Near Central Park"
                      value={addressForm.street_area}
                      onChange={(e) => setAddressForm({ ...addressForm, street_area: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        City *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mumbai"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        State *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Maharashtra"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        PIN Code (6 digits) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 400001"
                        maxLength={6}
                        value={addressForm.pin_code}
                        onChange={(e) => setAddressForm({ ...addressForm, pin_code: e.target.value.replace(/\D/g, '') })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Behind Metro Station"
                      value={addressForm.landmark}
                      onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewAddress(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: '4px 0'
                      }}
                    >
                      ← Cancel and use saved address
                    </button>
                  )}
                </form>
              )}

              {/* Step 1 Continue Button */}
              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={handleProceedFromAddress}
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
                    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)'
                  }}
                >
                  {isAddingNewAddress ? 'Save Address & Continue' : 'Continue to Order Summary'} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 2: ORDER SUMMARY (BACKEND-CALCULATED)
              ======================================================= */}
          {step === 'summary' && (
            <div className="animate-fade-in">
              {isLoadingSummary ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <RefreshCw size={28} className="pulse-glow" color="#7c3aed" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Calculating verified catalog pricing...</p>
                </div>
              ) : (
                <>
                  {/* Delivery Address Pill */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                      <MapPin size={18} color="#7c3aed" />
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          Deliver to: {activeAddress?.full_name} ({activeAddress?.pin_code})
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          {activeAddress?.house_flat_building}, {activeAddress?.street_area}, {activeAddress?.city}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep('address')}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>

                  {/* Itemized Order List */}
                  <div style={{ marginBottom: '18px' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                      Cart Items ({summary?.items?.length || 0})
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {summary?.items?.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: '10px', border: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Package size={16} color="#7c3aed" />
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Qty: {it.quantity} × ₹{it.price?.toLocaleString('en-IN')} • {it.merchant_name}</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            ₹{it.item_total?.toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Backend Calculation Breakdown */}
                  <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px 18px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px' }}>
                      <span>Subtotal</span>
                      <span>₹{summary?.subtotal?.toLocaleString('en-IN') || 0}</span>
                    </div>

                    {summary?.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#059669', fontWeight: 700, marginBottom: '6px' }}>
                        <span>Discount ({summary.discount_reason || 'Applied'})</span>
                        <span>- ₹{summary.discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', marginBottom: '10px' }}>
                      <span>Delivery Shipping</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>FREE</span>
                    </div>

                    <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      <span>Total Amount Payable</span>
                      <span style={{ color: '#7c3aed' }}>₹{summary?.total_amount?.toLocaleString('en-IN') || 0}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setStep('address')}
                      style={{
                        flex: 1,
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => setStep('payment')}
                      style={{
                        flex: 2,
                        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
                      }}
                    >
                      Select Payment Method <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* =======================================================
              STEP 3: SELECT PAYMENT METHOD
              ======================================================= */}
          {step === 'payment' && (
            <div className="animate-fade-in">
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                Choose Payment Method
              </h4>

              {/* Payment Option Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {paymentOptions.map((opt) => {
                  const isSelected = selectedPaymentMethod === opt.id;
                  const Icon = opt.icon;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedPaymentMethod(opt.id)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        background: isSelected ? '#faf5ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isSelected ? '#7c3aed' : '#f1f5f9', color: isSelected ? '#ffffff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                            {opt.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {opt.desc}
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: isSelected ? '#ede9fe' : '#f1f5f9', color: isSelected ? '#7c3aed' : '#64748b' }}>
                        {opt.badge}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Final Payable Callout */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total to Pay:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{summary?.total_amount?.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                  Method: <strong style={{ color: '#7c3aed' }}>{selectedPaymentMethod}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button
                  onClick={() => setStep('summary')}
                  disabled={isProcessingPayment}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: isProcessingPayment ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← Back
                </button>

                <button
                  onClick={selectedPaymentMethod === 'COD' ? handlePlaceCodOrder : handleInitiateOnlinePayment}
                  disabled={isProcessingPayment}
                  style={{
                    flex: 2,
                    background: selectedPaymentMethod === 'COD' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)'
                  }}
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw size={16} className="spin-animation" /> Processing...
                    </>
                  ) : selectedPaymentMethod === 'COD' ? (
                    `Place Order (Pay ₹${summary?.total_amount?.toLocaleString('en-IN')} on Delivery)`
                  ) : (
                    `Pay ₹${summary?.total_amount?.toLocaleString('en-IN')} via Razorpay`
                  )}
                </button>
              </div>

              {/* Optional Test Simulation Failure Trigger */}
              {selectedPaymentMethod !== 'COD' && (
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={handleSimulatePaymentFailure}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '0.72rem',
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    (Developer Test: Simulate Gateway Payment Failure)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =======================================================
              STEP 4: ORDER CONFIRMATION
              ======================================================= */}
          {step === 'confirmation' && confirmedOrder && (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 8px 24px rgba(22, 163, 74, 0.2)' }}>
                <CheckCircle2 size={36} />
              </div>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                ✓ Order Confirmed!
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                Thank you for your order with Revenue Pilot AI.
              </p>

              {/* Order Details Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', textAlign: 'left', marginBottom: '24px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Order ID</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{confirmedOrder.order_id}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Payment Mode</span>
                  <span style={{ fontWeight: 700, color: confirmedOrder.payment_status === 'PAID' ? '#059669' : '#d97706' }}>
                    {confirmedOrder.payment_method} ({confirmedOrder.payment_status === 'PAID' ? 'PAID ✓' : 'Cash on Delivery'})
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Total Amount</span>
                  <span style={{ fontWeight: 800, color: '#7c3aed', fontSize: '0.95rem' }}>
                    ₹{confirmedOrder.total_amount?.toLocaleString('en-IN') || confirmedOrder.amount?.toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Estimated Delivery</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>2-4 business days</span>
                </div>

                {confirmedOrder.shipping_address && (
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Delivery Address</span>
                    <div style={{ color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>
                      {confirmedOrder.shipping_address.full_name}<br />
                      {confirmedOrder.shipping_address.house_flat_building}, {confirmedOrder.shipping_address.street_area}<br />
                      {confirmedOrder.shipping_address.city}, {confirmedOrder.shipping_address.state} - {confirmedOrder.shipping_address.pin_code}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToOrders) onNavigateToOrders();
                  }}
                  style={{
                    flex: 1,
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View My Orders
                </button>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              FAILURE HANDLING STATE
              ======================================================= */}
          {step === 'failure' && (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <AlertCircle size={32} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Payment was not completed
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '380px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                {paymentError || 'The transaction could not be verified. Don\'t worry, your cart remains intact and no amount was charged.'}
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setPaymentError(null);
                    setStep('payment');
                  }}
                  style={{
                    flex: 1,
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setPaymentError(null);
                    setStep('payment');
                  }}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Change Payment Method
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
