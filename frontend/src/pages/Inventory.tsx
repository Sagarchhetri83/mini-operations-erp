import React from 'react';
import { Package } from 'lucide-react';

const Inventory: React.FC = () => (
  <div>
    <div className="page-header">
      <div>
        <h1 className="page-title">Inventory</h1>
        <p className="page-subtitle">Manage items, locations, batches and stock levels</p>
      </div>
    </div>
    <div className="placeholder-card">
      <Package size={48} color="var(--primary)" />
      <h2>Inventory Module</h2>
      <p>Coming in Phase 2 — will display all inventory records with physical, reserved, and available quantities.</p>
    </div>
  </div>
);

export default Inventory;
