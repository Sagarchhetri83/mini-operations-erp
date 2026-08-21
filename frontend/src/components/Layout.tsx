import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Package,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: ('ADMIN' | 'OPERATIONS_USER' | 'SALES_USER')[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/inventory',
    icon: <Package size={16} />,
    label: 'Inventory',
    roles: ['ADMIN', 'OPERATIONS_USER'],
  },
  {
    to: '/work-orders',
    icon: <ClipboardList size={16} />,
    label: 'Work Orders',
    roles: ['ADMIN', 'OPERATIONS_USER'],
  },
  {
    to: '/transfers',
    icon: <ArrowLeftRight size={16} />,
    label: 'Internal Transfers',
    roles: ['ADMIN', 'OPERATIONS_USER'],
  },
  {
    to: '/orders',
    icon: <ShoppingCart size={16} />,
    label: 'Customer Orders',
    roles: ['ADMIN', 'SALES_USER'],
  },
];

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  const roleLabel = {
    ADMIN: 'Administrator',
    OPERATIONS_USER: 'Operations',
    SALES_USER: 'Sales',
  }[user.role];

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Boxes size={18} color="#fff" />
          </div>
          <span className="sidebar-title">Ops ERP</span>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">{roleLabel}</span>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="top-header">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="header-right">
            <span className="header-role-badge">{user.role}</span>
          </div>
        </header>

        <div className="workspace">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
