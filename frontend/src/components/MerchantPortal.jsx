import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ShoppingBag, Plus, Sparkles, CheckCircle2, Trash2, ArrowRight, ShieldCheck, Tag, HelpCircle, Store, Sliders, Calculator, FlaskConical, AlertCircle } from 'lucide-react';
import RevenueLogo from './RevenueLogo';

export default function MerchantPortal({ currentUser, onAuditUpdate }) {
  // Enforce tenant isolation: use the merchant_id from the authenticated user only.
  const merchantId = currentUser?.merchant_id ?? currentUser?.id;
  const storeName = currentUser?.store_name ?? (currentUser?.merchant_id ? `${currentUser?.merchant_id}` : 'Store');

  const [insights, setInsights] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // What-If Simulator Interactive State
  const [simulatorProduct, setSimulatorProduct] = useState(null);
  const [adoptionRate, setAdoptionRate] = useState(30); // 30%
  const [monthlyShoppers, setMonthlyShoppers] = useState(100);

  // New Product Upload Form State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Cakes');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('20');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);

  // Campaign Approval State
  const [campaignSuccess, setCampaignSuccess] = useState(null);

  const fetchMerchantData = async () => {
    try {
      setIsLoading(true);
      const [insightsRes, prodsRes, ordersRes] = await Promise.all([
        fetch(`http://localhost:8000/api/merchant/insights?merchant_id=${merchantId}`, {
          headers: { 'x-merchant-id': merchantId }
        }),
        fetch(`http://localhost:8000/api/merchant/products?merchant_id=${merchantId}`, {
          headers: { 'x-merchant-id': merchantId }
        }),
        fetch(`http://localhost:8000/api/merchant/orders?merchant_id=${merchantId}`, {
          headers: { 'x-merchant-id': merchantId }
        })
      ]);

      const [insightsData, prodsData, ordersData] = await Promise.all([
        insightsRes.json(),
        prodsRes.json(),
        ordersRes.json()
      ]);

      setInsights(insightsData);
      const prods = Array.isArray(prodsData) ? prodsData : [];
      setProducts(prods);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      if (prods.length > 0) {
        setSimulatorProduct(prods[0]);
      } else {
        setSimulatorProduct(null);
      }
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantData();
  }, [merchantId]);

  const handleUploadProduct = async (e) => {
    e.preventDefault();
    if (!newProdName || !newProdCategory || !newProdPrice) return;

    try {
      const res = await fetch('http://localhost:8000/api/merchant/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': merchantId
        },
        body: JSON.stringify({
          name: newProdName,
          category: newProdCategory,
          price: parseFloat(newProdPrice),
          stock: parseInt(newProdStock) || 20,
          description: newProdDesc || `${newProdName} (${newProdCategory})`,
          image_url: newProdImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ type: 'success', msg: `Published ${data.name} to ${storeName} catalog!` });
        setShowUploadModal(false);
        setNewProdName('');
        setNewProdCategory('Cakes');
        setNewProdPrice('');
        setNewProdDesc('');
        setNewProdImage('');
        fetchMerchantData();
        if (onAuditUpdate) onAuditUpdate();
      } else {
        setUploadStatus({ type: 'error', msg: data.error || 'Upload failed' });
      }
    } catch (err) {
      console.error(err);
      setUploadStatus({ type: 'error', msg: 'Network error during upload' });
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm(`Are you sure you want to remove this product from ${storeName}?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/api/merchant/products/${productId}`, {
        method: 'DELETE',
        headers: { 'x-merchant-id': merchantId }
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Delete failed');
      }
      fetchMerchantData();
      if (onAuditUpdate) onAuditUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveCampaign = async (action) => {
    try {
      const res = await fetch('http://localhost:8000/api/merchant/approve-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': merchantId
        },
        body: JSON.stringify({
          title: `Campaign for ${action.target}`,
          target_segment: action.target,
          action_type: action.action_type,
          discount_value: action.discount_value
        })
      });
      const data = await res.json();
      setCampaignSuccess(data.message);
      fetchMerchantData();
      if (onAuditUpdate) onAuditUpdate();
      setTimeout(() => setCampaignSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const metrics = insights?.metrics || {};

  // What-If Simulator math from current merchant database
  const currentSimProd = simulatorProduct || products[0];
  const simBasePrice = currentSimProd ? currentSimProd.price : 500;
  const simBundleMultiplier = 1.75;
  const simBundlePrice = Math.round(simBasePrice * simBundleMultiplier);
  const baselineRevenue = monthlyShoppers * simBasePrice;
  const bundleShoppers = Math.round(monthlyShoppers * (adoptionRate / 100));
  const regularShoppers = monthlyShoppers - bundleShoppers;
  const simulatedRevenue = (regularShoppers * simBasePrice) + (bundleShoppers * simBundlePrice);
  const incrementalGain = simulatedRevenue - baselineRevenue;
  const effectiveAvgBasket = Math.round(simulatedRevenue / monthlyShoppers);

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1360px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }} className="animate-fade-in">
      
      {/* Top Bar with Read-Only Store Badge (No Cross-Tenant Dropdown) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <RevenueLogo size={32} withGlow={false} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Merchant Command Center
            </h1>
            <span style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Store size={14} /> Store: {storeName}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Your isolated product catalog, customer orders, and AI revenue opportunities for <strong>{storeName}</strong>.
          </p>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
            }}
          >
            <Plus size={16} /> Publish Product
          </button>
        </div>
      </div>

      {/* Notifications */}
      {uploadStatus && (
        <div style={{
          background: uploadStatus.type === 'error' ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${uploadStatus.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          color: uploadStatus.type === 'error' ? '#991b1b' : '#065f46',
          fontSize: '0.875rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{uploadStatus.msg}</span>
          <button onClick={() => setUploadStatus(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {campaignSuccess && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          color: '#065f46',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          ✓ {campaignSuccess}
        </div>
      )}

      {/* 1. STORE REVENUE METRICS (DATABASE GROUNDED) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Total Sales */}
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Store Revenue</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            ₹{(metrics.total_sales || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
            {metrics.paid_orders || 0} paid order(s) for {storeName}
          </div>
        </div>

        {/* Active Products */}
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Catalog Size</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {products.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
            Published in {storeName}
          </div>
        </div>

        {/* Orders Placed */}
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Orders</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {orders.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
            Conversion rate: {metrics.conversion_rate || '0%'}
          </div>
        </div>

      </div>

      {/* 2. REALISTIC WHAT-IF REVENUE STRATEGY SIMULATOR */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
        borderRadius: '24px',
        border: '1px solid #c7d2fe',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
              <FlaskConical size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                AI Basket Growth "What-If" Simulator
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Simulate potential revenue increase if shoppers accept AI-proposed bundles for <strong>{storeName}</strong> products.
              </p>
            </div>
          </div>
          <span style={{
            background: '#e0e7ff',
            color: '#3730a3',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px solid #c7d2fe'
          }}>
            🔬 Estimated / Simulation Model
          </span>
        </div>

        {products.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Add products to your catalog to run What-If simulations.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'center' }}>
            {/* Simulator Controls */}
            <div style={{ background: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Target Base Product from {storeName}:
                </label>
                <select
                  value={currentSimProd?.id || ''}
                  onChange={(e) => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) setSimulatorProduct(found);
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <span>Simulated Bundle Acceptance Rate:</span>
                  <strong style={{ color: '#4f46e5' }}>{adoptionRate}%</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="5"
                  value={adoptionRate}
                  onChange={(e) => setAdoptionRate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <span>Monthly Customer Volume:</span>
                  <strong>{monthlyShoppers} shoppers</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={monthlyShoppers}
                  onChange={(e) => setMonthlyShoppers(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Impact Calculation Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Without Bundling</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#334155', margin: '4px 0' }}>
                  ₹{simBasePrice.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Item-only Average Basket</div>
              </div>

              <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase' }}>With AI Bundles</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46', margin: '4px 0' }}>
                  ₹{effectiveAvgBasket.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                  +{Math.round(((effectiveAvgBasket - simBasePrice) / simBasePrice) * 100)}% Basket Expansion
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#ffffff', padding: '18px', borderRadius: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9 }}>Estimated Incremental Monthly Revenue</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0' }}>
                  +₹{incrementalGain.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                  Based on {adoptionRate}% of {monthlyShoppers} shoppers buying the bundle (₹{simBasePrice} → ₹{simBundlePrice}).
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. ISOLATED PRODUCTS TABLE FOR THIS MERCHANT */}
      <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Catalog Products for {storeName} ({products.length})
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Products in this table belong strictly to your store tenant and are recommended by the AI shopping assistant.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '0.85rem' }}>
            No products published yet for {storeName}. Click <strong>Publish Product</strong> to add your first store item!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>Product</th>
                  <th style={{ padding: '12px 14px' }}>Category</th>
                  <th style={{ padding: '12px 14px' }}>Price (INR)</th>
                  <th style={{ padding: '12px 14px' }}>Stock</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={p.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'}
                        alt={p.name}
                        style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>{p.category}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>₹{p.price?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', color: p.stock > 5 ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      {p.stock} units
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                        ● Live in SQL
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. ORDERS ISOLATED FOR THIS STORE */}
      <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
          Customer Orders for {storeName} ({orders.length})
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
          Orders generated by customer purchases and verified through Razorpay Test Mode.
        </p>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '0.85rem' }}>
            No customer orders placed for {storeName} yet. Complete a checkout in the Customer Shop to see real orders appear here!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Order ID</th>
                  <th style={{ padding: '10px 14px' }}>Customer</th>
                  <th style={{ padding: '10px 14px' }}>Amount</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Razorpay ID</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{o.id}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{o.customer_id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>₹{o.total_amount?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background: o.status === 'PAID' ? '#ecfdf5' : '#fef3c7',
                        color: o.status === 'PAID' ? '#059669' : '#d97706',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {o.razorpay_payment_id || o.razorpay_order_id || 'Pending'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#64748b' }}>
                      {o.created_at ? new Date(o.created_at).toLocaleString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. AI CAMPAIGN ORCHESTRATOR FOR THIS STORE */}
      {insights?.next_best_actions && insights.next_best_actions.length > 0 && (
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={18} color="#7c3aed" /> AI Campaign Orchestrator ({storeName})
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
            AI identifies inventory opportunities in your catalog and proposes bundles. Merchant approves $\rightarrow$ System executes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {insights.next_best_actions.map((act) => (
              <div key={act.id} style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase' }}>{act.target}</span>
                    <span style={{ fontSize: '0.7rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>AI Suggested</span>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: '#1e293b', marginBottom: '8px', lineHeight: 1.4 }}>{act.observation}</p>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '14px' }}>{act.recommended_action}</p>
                </div>
                <button
                  onClick={() => handleApproveCampaign(act)}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  Approve Campaign <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCT UPLOAD MODAL */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: '#ffffff', borderRadius: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase' }}>Store: {storeName}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Publish Product to {storeName} Catalog</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>

            <form onSubmit={handleUploadProduct}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strawberry Cheesecake, Running Shoes, Wireless Mouse"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cakes, Footwear, Laptops"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Price (INR ₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 799"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Available Stock</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newProdImage}
                    onChange={(e) => setNewProdImage(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows="3"
                  placeholder="Describe your product for the AI shopping assistant..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Publish to {storeName}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
