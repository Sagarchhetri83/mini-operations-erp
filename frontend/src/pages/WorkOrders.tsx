import React from 'react';
import { ClipboardList } from 'lucide-react';

const WorkOrders: React.FC = () => (
  <div>
    <div className="page-header">
      <div>
        <h1 className="page-title">Work Orders</h1>
        <p className="page-subtitle">Create and track production work orders with shortage detection</p>
      </div>
    </div>
    <div className="placeholder-card">
      <ClipboardList size={48} color="var(--primary)" />
      <h2>Work Orders Module</h2>
      <p>Coming in Phase 3 — will support creating work orders and automatically calculating material shortages.</p>
    </div>
  </div>
);

export default WorkOrders;
