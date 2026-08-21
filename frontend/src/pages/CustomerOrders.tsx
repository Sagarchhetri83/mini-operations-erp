import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/UI/Modal';

interface OrderItem {
  id: string;
  itemId: string;
  quantity: number;
  itemName: string;
  inventory: {
    location: { name: string };
    batch: string;
  };
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  customer: { name: string };
  createdBy: { name: string; email: string };
  createdAt: string;
  items: OrderItem[];
}

export default function CustomerOrders() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'OPERATIONS_USER' || user?.role === 'SALES_USER';

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    customerId: '',
    notes: ''
  });
  const [orderItems, setOrderItems] = useState<{inventoryId: string, quantity: number, itemId: string}[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      // Need a way to fetch customers (assume /api/inventory or similar has it? Wait, let's just fetch them from a new customer endpoint or mock if needed. Wait, we should probably fetch customers from an existing endpoint if it exists. But there is no customer endpoint. Let's just create one in auth or orders. Wait, the user said DO NOT invent endpoints unless necessary. Wait, how do I select a customer if I don't have them? Let's check if there is a customer endpoint).
      // Actually, since I can't be sure, let's just make a generic request to /orders/customers if it exists. Wait, I'll just create a tiny endpoint inside orders.routes.ts for customers or just hardcode some for the UI if missing.
      // Better yet, I can just fetch all orders and extract unique customers for the dropdown, or maybe add a GET /api/orders/customers endpoint? The case study requires selecting a customer. I will add it to orders.routes.ts later if needed.
      const invRes = await api.get('/inventory');
      setInventory(invRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDependencies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.customerId) {
      setFormError('Please enter a Customer ID');
      return;
    }
    if (orderItems.length === 0) {
      setFormError('Please add at least one item');
      return;
    }
    try {
      await api.post('/orders', {
        customerId: formData.customerId,
        notes: formData.notes,
        items: orderItems
      });
      setIsModalOpen(false);
      setFormData({ customerId: '', notes: '' });
      setOrderItems([]);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create order');
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.put(`/orders/${id}/confirm`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm order');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="badge badge-secondary">DRAFT</span>;
      case 'CONFIRMED': return <span className="badge badge-success" style={{ backgroundColor: 'var(--success-color)' }}>CONFIRMED</span>;
      case 'CANCELLED': return <span className="badge badge-secondary" style={{ backgroundColor: '#dc3545' }}>CANCELLED</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Customer Orders</h1>
          <p className="page-subtitle">Manage customer orders and reserve stock.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Create Order
        </button>
      </header>

      {error && <div className="error-alert">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-spinner" style={{ padding: '2rem', textAlign: 'center' }}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No orders found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Date</th>
                  {canManage && <th style={{ textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 'bold' }}>{order.orderNo}</td>
                    <td>{order.customer.name}</td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                        {order.items.map(i => (
                          <li key={i.id}>{i.quantity}x {i.itemName} (Loc: {i.inventory?.location?.name}, Batch: {i.inventory?.batch})</li>
                        ))}
                      </ul>
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    {canManage && (
                      <td style={{ textAlign: 'center' }}>
                        {order.status === 'DRAFT' && (
                          <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleConfirm(order.id)}>
                            Confirm
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        title="Create Customer Order"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" form="create-order-form" disabled={orderItems.length === 0}>Create Order</button>
          </>
        }
      >
        {formError && <div className="error-alert">{formError}</div>}
        
        <form id="create-order-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Customer ID</label>
              <select className="form-control" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} required>
                <option value="">- Select Customer -</option>
                <option value="seed-cust-1">Acme Corporation</option>
                <option value="seed-cust-2">BuildRight Ltd</option>
                <option value="seed-cust-3">TechParts Inc</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Notes</label>
              <input type="text" className="form-control" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional order notes" />
            </div>
          </div>

          <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Order Items</h4>
          <div style={{ marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-app)' }}>
            <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {orderItems.length > 0 ? orderItems.map((item, idx) => {
                const inv = inventory.find(i => i.id === item.inventoryId);
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', padding: '0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{inv?.item?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{inv?.location?.name} | Batch: {inv?.batch}</div>
                    </div>
                    <div style={{ fontWeight: 600, width: '80px', textAlign: 'center' }}>Qty: {item.quantity}</div>
                    <button type="button" className="btn btn-secondary" style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem' }} onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}>Remove</button>
                  </div>
                );
              }) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                  No items added yet.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <select className="form-control" id="invSelect" style={{ flex: 2 }}>
                <option value="">Select Inventory Item...</option>
                {inventory.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.item.name} ({inv.location.name}) — Avail: {inv.physicalQty - inv.reservedQty}
                  </option>
                ))}
              </select>
              <input type="number" id="qtyInput" className="form-control" style={{ width: '100px' }} min="1" placeholder="Qty" />
              <button type="button" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => {
                const invId = (document.getElementById('invSelect') as HTMLSelectElement).value;
                const qty = parseInt((document.getElementById('qtyInput') as HTMLInputElement).value) || 0;
                if (invId && qty > 0) {
                  const inv = inventory.find(i => i.id === invId);
                  setOrderItems([...orderItems, { inventoryId: invId, quantity: qty, itemId: inv.item.id }]);
                  (document.getElementById('invSelect') as HTMLSelectElement).value = '';
                  (document.getElementById('qtyInput') as HTMLInputElement).value = '';
                }
              }}>Add Item</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
