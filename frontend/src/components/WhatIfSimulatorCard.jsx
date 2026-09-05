import React from 'react';
import { FlaskConical, TrendingUp, CheckCircle2, Award, Zap, ShieldCheck } from 'lucide-react';

export default function WhatIfSimulatorCard({ simulationData, onSelectStrategy }) {
  if (!simulationData || simulationData.length === 0) return null;

  return (
    <div className="glass-panel animate-fade-in" style={{
      padding: '22px',
      border: '1px solid #c7d2fe',
      background: '#ffffff',
      borderRadius: '16px',
      marginTop: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FlaskConical size={22} color="#7c3aed" className="pulse-glow" />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>AI "What-If" Revenue Strategy Simulator</h3>
            <p style={{ fontSize: '0.725rem', color: '#64748b' }}>Simulating conversion probability across candidate intervention strategies</p>
          </div>
        </div>
        <span className="badge badge-indigo">
          <ShieldCheck size={12} /> Zero-Discount Protocol
        </span>
      </div>

      {/* Strategies Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {simulationData.map((strat) => (
          <div
            key={strat.id}
            onClick={() => onSelectStrategy(strat)}
            className="glass-panel-hover"
            style={{
              padding: '16px',
              borderRadius: '14px',
              border: strat.is_recommended ? '2px solid #059669' : '1px solid #e2e8f0',
              background: strat.is_recommended ? '#ecfdf5' : '#f8fafc',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {strat.is_recommended && (
              <span className="badge badge-emerald" style={{ position: 'absolute', top: '-10px', right: '12px', fontSize: '0.65rem' }}>
                <Award size={12} /> Best Value ⭐ (Optimal Utility)
              </span>
            )}

            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>
              {strat.name}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              {strat.title}
            </div>

            {/* Conversion Probability Bar */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Predicted Buy Chance:</span>
                <strong style={{ color: strat.is_recommended ? '#059669' : '#475569' }}>{strat.conversion_prob}</strong>
              </div>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${strat.conversion_score}%`,
                  background: strat.is_recommended ? 'var(--gradient-brand)' : '#4f46e5',
                  borderRadius: '3px'
                }} />
              </div>
            </div>

            {/* Price & Items */}
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              ₹{strat.price?.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.35 }}>
              • {strat.items.join(', ')}
            </div>

            <div style={{ fontSize: '0.675rem', color: '#d97706', marginTop: '8px', fontWeight: 600 }}>
              🛡️ Margin Loss: {strat.margin_loss}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
