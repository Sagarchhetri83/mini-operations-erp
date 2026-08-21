import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/UI/Modal';

interface WorkOrder {
  id: string;
  workOrderNo: string;
  status: string;
  requiredQty: number;
  availableQty: number;
  calculatedShortage: number;
  item: { name: string; sku: string };
  location: { name: string };
  assignedUser: { name: string; email: string };
}

export default function WorkOrders() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'OPERATIONS_USER';

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    itemId: '',
    locationId: '',
    assignedUserId: '',
    requiredQty: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [woRes, itemsRes, locRes, usersRes] = await Promise.all([
        api.get('/work-orders'),
        canManage ? api.get('/inventory/items') : Promise.resolve({ data: [] }),
        canManage ? api.get('/inventory/locations') : Promise.resolve({ data: [] }),
        canManage ? api.get('/auth/users').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      setWorkOrders(woRes.data);
      if (canManage) {
        setItems(itemsRes.data);
        setLocations(locRes.data);
        setUsers(usersRes.data);
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [canManage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/work-orders', {
        ...formData,
        requiredQty: Number(formData.requiredQty)
      });
      setIsModalOpen(false);
      setFormData({ itemId: '', locationId: '', assignedUserId: '', requiredQty: 0 });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create work order');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.put(`/work-orders/${id}`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return <span className="badge badge-secondary">ASSIGNED</span>;
      case 'IN_PROGRESS': return <span className="badge badge-warning" style={{ backgroundColor: 'var(--warning-color)', color: '#000' }}>IN PROGRESS</span>;
      case 'COMPLETED': return <span className="badge badge-success" style={{ backgroundColor: 'var(--success-color)' }}>COMPLETED</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Work Orders</h1>
          <p className="page-subtitle">Manage production runs and track material shortages.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Create Work Order
          </button>
        )}
      </header>

      {error && <div className="error-alert">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-spinner" style={{ padding: '2rem', textAlign: 'center' }}>Loading work orders...</div>
        ) : workOrders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No work orders found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>WO No.</th>
                  <th>Item</th>
                  <th>Location</th>
                  <th style={{ textAlign: 'right' }}>Required</th>
                  <th style={{ textAlign: 'right' }}>Available</th>
                  <th style={{ textAlign: 'right' }}>Shortage</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  {canManage && <th style={{ textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {workOrders.map(wo => (
                  <tr key={wo.id}>
                    <td style={{ fontWeight: 'bold' }}>{wo.workOrderNo}</td>
                    <td>
                      <div>{wo.item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{wo.item.sku}</div>
                    </td>
                    <td>{wo.location.name}</td>
                    <td style={{ textAlign: 'right' }}>{wo.requiredQty}</td>
                    <td style={{ textAlign: 'right' }}>{wo.availableQty}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: wo.calculatedShortage > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                      {wo.calculatedShortage}
                    </td>
                    <td>{wo.assignedUser.name}</td>
                    <td>{getStatusBadge(wo.status)}</td>
                    {canManage && (
                      <td style={{ textAlign: 'center' }}>
                        {wo.status === 'ASSIGNED' && (
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleStatusChange(wo.id, 'IN_PROGRESS')}>
                            Start
                          </button>
                        )}
                        {wo.status === 'IN_PROGRESS' && (
                          <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleStatusChange(wo.id, 'COMPLETED')}>
                            Complete
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
        title="Create Work Order"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" form="create-wo-form">Create Work Order</button>
          </>
        }
      >
        {formError && <div className="error-alert">{formError}</div>}
        
        <form id="create-wo-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Item</label>
            <select className="form-control" value={formData.itemId} onChange={e => setFormData({...formData, itemId: e.target.value})} required>
              <option value="">Select an Item...</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Location</label>
            <select className="form-control" value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})} required>
              <option value="">Select a Location...</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Required Quantity</label>
            <input type="number" className="form-control" min="1" value={formData.requiredQty} onChange={e => setFormData({...formData, requiredQty: parseInt(e.target.value) || 0})} required />
          </div>

          <div className="form-group">
            <label>Assign To (Operations User)</label>
            <select className="form-control" value={formData.assignedUserId} onChange={e => setFormData({...formData, assignedUserId: e.target.value})} required>
              <option value="">Select User...</option>
              {users.filter(u => u.role === 'OPERATIONS_USER').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
