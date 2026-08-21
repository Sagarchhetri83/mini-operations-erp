import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Boxes, Package, ClipboardList, ArrowLeftRight, ShoppingCart } from 'lucide-react';

const DashboardCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}> = ({ icon, title, description, color }) => (
  <div className="dashboard-card">
    <div className="dashboard-card-icon" style={{ background: color }}>
      {icon}
    </div>
    <div>
      <h3 className="dashboard-card-title">{title}</h3>
      <p className="dashboard-card-desc">{description}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name}</strong> &mdash; {user?.role.replace('_', ' ')}
          </p>
        </div>
      </div>

      <div className="dashboard-hero">
        <Boxes size={40} color="var(--primary)" />
        <h2>Mini Operations ERP</h2>
        <p>Manage your inventory, work orders, transfers, and customer reservations from one place.</p>
      </div>

      <div className="dashboard-grid">
        <DashboardCard
          icon={<Package size={20} color="#fff" />}
          title="Inventory"
          description="Track items across locations and batches. Monitor physical, reserved, and available quantities."
          color="#4F46E5"
        />
        <DashboardCard
          icon={<ClipboardList size={20} color="#fff" />}
          title="Work Orders"
          description="Create and manage work orders. Automatically detect material shortages."
          color="#0891B2"
        />
        <DashboardCard
          icon={<ArrowLeftRight size={20} color="#fff" />}
          title="Internal Transfers"
          description="Move stock between locations with full dispatch and receipt workflow."
          color="#059669"
        />
        <DashboardCard
          icon={<ShoppingCart size={20} color="#fff" />}
          title="Customer Orders"
          description="Reserve stock for customers. Concurrency-safe — no double-booking."
          color="#D97706"
        />
      </div>

      <div className="card" style={{ marginTop: '24px', padding: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <strong>Phase 1 complete.</strong> Authentication and project foundation are working.
          Business screens (Inventory, Work Orders, Transfers, Customer Orders) will be implemented in subsequent phases.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
