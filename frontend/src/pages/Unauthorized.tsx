import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

const Unauthorized: React.FC = () => (
  <div className="auth-page">
    <div className="auth-card" style={{ textAlign: 'center' }}>
      <ShieldX size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        You do not have permission to access this page.
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  </div>
);

export default Unauthorized;
