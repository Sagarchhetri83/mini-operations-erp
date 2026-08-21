import React from 'react';
import { ShoppingCart } from 'lucide-react';

const CustomerOrders: React.FC = () => (
  <div>
    <div className="page-header">
      <div>
        <h1 className="page-title">Customer Orders</h1>
        <p className="page-subtitle">Create customer orders and reserve stock with concurrency protection</p>
      </div>
    </div>
    <div className="placeholder-card">
      <ShoppingCart size={48} color="var(--primary)" />
      <h2>Customer Orders Module</h2>
      <p>Coming in Phase 5 — will support creating orders, reserving stock atomically, and preventing over-reservation even under concurrent requests.</p>
    </div>
  </div>
);

export default CustomerOrders;
