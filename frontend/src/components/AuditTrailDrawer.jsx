import React, { useState } from 'react';
import { X, FileText, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function AuditTrailDrawer({ isOpen, onClose, auditLogs }) {
  const [filter, setFilter] = useState('ALL');

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter(log => {
    if (filter === 'ALL') return true;
    if (filter === 'FAILED') return log.status === 'FAILED';
    if (filter === 'COMPLETED') return log.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="modal-overlay animate-fade-in" style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        height: '100vh',
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 40px rgba(15, 23, 42, 0.1)',
        overflowY: 'auto'
      }}>
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="#6366f1" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Audit Log & Decision Trail</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Every money action is explainable, bounded & gated</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
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
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => setFilter('ALL')} className={filter === 'ALL' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 12px', fontSize: '0.775rem' }}>
            All Logs ({auditLogs.length})
          </button>
          <button onClick={() => setFilter('COMPLETED')} className={filter === 'COMPLETED' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 12px', fontSize: '0.775rem' }}>
            ✅ Successful ({auditLogs.filter(l => l.status === 'COMPLETED').length})
          </button>
          <button onClick={() => setFilter('FAILED')} className={filter === 'FAILED' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 12px', fontSize: '0.775rem' }}>
            ⚠️ Failures / Retries ({auditLogs.filter(l => l.status === 'FAILED').length})
          </button>
        </div>

        {/* Failure Handled Gracefully Card (ShopMind Spec Requirement) */}
        <div style={{
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '0.875rem' }}>
              <ShieldAlert size={18} color="#dc2626" /> Failure Handled Gracefully
            </div>
            <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>Payment Failed</span>
          </div>

          <p style={{ fontSize: '0.775rem', color: '#9f1239', marginBottom: '10px' }}>
            10:45:21 AM • Payment Failed (UPI transaction simulated timeout). Automatic retry: NO. Customer approval: REQUIRED.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Retry Payment</button>
            <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Change Method</button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>AI Action</th>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Reason / Rationale</th>
                <th style={{ textAlign: 'center', padding: '10px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {log.timestamp}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 600, color: '#0f172a' }}>
                    <div>{log.action}</div>
                    <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>{log.agent}</span>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#475569', lineHeight: 1.35 }}>
                    {log.reason}
                    {log.permission_required && (
                      <div style={{ fontSize: '0.675rem', color: '#d97706', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                        <ShieldCheck size={10} /> Permission Gated
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {log.status === 'COMPLETED' ? (
                      <span className="badge badge-emerald">✅</span>
                    ) : log.status === 'FAILED' ? (
                      <span className="badge badge-rose">⚠️</span>
                    ) : (
                      <span className="badge badge-amber">⏳</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
