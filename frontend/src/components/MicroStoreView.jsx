import React, { useState, useEffect } from 'react';
import { Store, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Tag, Zap } from 'lucide-react';

export default function MicroStoreView({ onSelectBundle }) {
  const [activePersona, setActivePersona] = useState('college');
  const [microStore, setMicroStore] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/micro-store/${activePersona}`)
      .then(res => res.json())
      .then(data => setMicroStore(data))
      .catch(console.error);
  }, [activePersona]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }} className="animate-fade-in">
      {/* Header & Persona Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <Store size={24} color="#0284c7" /> AI Personal Micro-Store Generator
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Dynamic storefront generator producing custom micro-stores from the same merchant catalog based on customer intent.
          </p>
        </div>

        {/* Persona Switcher Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActivePersona('college')}
            className={activePersona === 'college' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            🎓 College Setup
          </button>
          <button
            onClick={() => setActivePersona('gaming')}
            className={activePersona === 'gaming' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            🎮 Gaming Setup
          </button>
          <button
            onClick={() => setActivePersona('budget')}
            className={activePersona === 'budget' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            💰 Budget Setup
          </button>
          <button
            onClick={() => setActivePersona('creator')}
            className={activePersona === 'creator' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            📱 Creator Vlogging
          </button>
        </div>
      </div>

      {microStore && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Micro-Store Hero Banner */}
          <div className="glass-panel" style={{
            padding: '28px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #eef2ff 100%)',
            border: '1px solid #bae6fd',
            borderRadius: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="badge badge-indigo">{microStore.hero_bundle?.badge}</span>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Zero-Discount Priority</span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              {microStore.persona_title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '20px' }}>
              {microStore.subtitle}
            </p>

            {/* AI Curated Hero Bundle */}
            <div style={{
              background: '#ffffff',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                  AI Curated Micro-Store Bundle
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                  {microStore.hero_bundle?.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Includes: {microStore.hero_bundle?.items.join(' + ')}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <span style={{ textDecoration: 'line-through', fontSize: '0.85rem', color: '#94a3b8' }}>
                    ₹{microStore.hero_bundle?.original_price?.toLocaleString('en-IN')}
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
                    ₹{microStore.hero_bundle?.price?.toLocaleString('en-IN')}
                  </div>
                </div>

                <button
                  onClick={() => onSelectBundle(microStore.hero_bundle)}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                >
                  <CheckCircle2 size={18} /> Buy Curated Bundle
                </button>
              </div>
            </div>
          </div>

          {/* Micro-Store Curated Catalog Cards */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', color: '#475569' }}>
              Curated Catalog Products for this Persona
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {microStore.products?.map((prod) => (
                <div key={prod.id} className="glass-panel glass-panel-hover" style={{ padding: '18px', background: '#ffffff' }}>
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', marginBottom: '12px' }}
                  />
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase' }}>
                    {prod.category}
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '4px 0 8px 0', color: '#0f172a' }}>
                    {prod.name}
                  </h4>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>
                    ₹{prod.price?.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
