import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

const Transfers: React.FC = () => (
  <div>
    <div className="page-header">
      <div>
        <h1 className="page-title">Internal Transfers</h1>
        <p className="page-subtitle">Move stock between locations with dispatch and receipt workflow</p>
      </div>
    </div>
    <div className="placeholder-card">
      <ArrowLeftRight size={48} color="var(--primary)" />
      <h2>Internal Transfers Module</h2>
      <p>Coming in Phase 4 — will handle transfer requests, dispatch (source deduction), and receipt (destination addition) with full DB transaction safety.</p>
    </div>
  </div>
);

export default Transfers;
