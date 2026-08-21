import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/UI/Modal';

interface Transfer {
  id: string;
  transferNo: string;
  status: string;
  quantity: number;
  batch: string;
  item: { name: string; sku: string };
  sourceLocation: { name: string };
  destLocation: { name: string };
  createdBy: { name: string; email: string };
  createdAt: string;
}

export default function Transfers() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'OPERATIONS_USER';

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    itemId: '',
    batch: 'DEFAULT',
    sourceLocationId: '',
    destLocationId: '',
    quantity: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trfRes, itemsRes, locRes] = await Promise.all([
        api.get('/transfers'),
        canManage ? api.get('/inventory/items') : Promise.resolve({ data: [] }),
        canManage ? api.get('/inventory/locations') : Promise.resolve({ data: [] })
      ]);
      setTransfers(trfRes.data);
      if (canManage) {
        setItems(itemsRes.data);
        setLocations(locRes.data);
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transfers');
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
    if (formData.sourceLocationId === formData.destLocationId) {
      setFormError('Source and destination locations must be different');
      return;
    }
    try {
      await api.post('/transfers', {
        ...formData,
        quantity: Number(formData.quantity)
      });
      setIsModalOpen(false);
      setFormData({ itemId: '', batch: 'DEFAULT', sourceLocationId: '', destLocationId: '', quantity: 0 });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create transfer');
    }
  };

  const handleAction = async (id: string, action: 'dispatch' | 'receive') => {
    try {
      await api.post(`/transfers/${id}/${action}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} transfer`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED': return <span className="badge badge-secondary">REQUESTED</span>;
      case 'DISPATCHED': return <span className="badge badge-warning" style={{ backgroundColor: 'var(--warning-color)', color: '#000' }}>DISPATCHED</span>;
      case 'RECEIVED': return <span className="badge badge-success" style={{ backgroundColor: 'var(--success-color)' }}>RECEIVED</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Internal Transfers</h1>
          <p className="page-subtitle">Move stock between locations with dispatch and receipt workflow.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Create Transfer
          </button>
        )}
      </header>

      {error && <div className="error-alert">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-spinner" style={{ padding: '2rem', textAlign: 'center' }}>Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No internal transfers found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transfer No.</th>
                  <th>Item</th>
                  <th>Batch</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th>Status</th>
                  <th>Date</th>
                  {canManage && <th style={{ textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {transfers.map(trf => (
                  <tr key={trf.id}>
                    <td style={{ fontWeight: 'bold' }}>{trf.transferNo}</td>
                    <td>
                      <div>{trf.item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{trf.item.sku}</div>
                    </td>
                    <td>{trf.batch}</td>
                    <td>{trf.sourceLocation.name}</td>
                    <td>{trf.destLocation.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{trf.quantity}</td>
                    <td>{getStatusBadge(trf.status)}</td>
                    <td>{new Date(trf.createdAt).toLocaleDateString()}</td>
                    {canManage && (
                      <td style={{ textAlign: 'center' }}>
                        {trf.status === 'REQUESTED' && (
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleAction(trf.id, 'dispatch')}>
                            Dispatch
                          </button>
                        )}
                        {trf.status === 'DISPATCHED' && (
                          <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleAction(trf.id, 'receive')}>
                            Receive
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
        title="Create Internal Transfer"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" form="create-transfer-form">Create Transfer</button>
          </>
        }
      >
        {formError && <div className="error-alert">{formError}</div>}
        
        <form id="create-transfer-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Item</label>
            <select className="form-control" value={formData.itemId} onChange={e => setFormData({...formData, itemId: e.target.value})} required>
              <option value="">Select an Item...</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Batch</label>
            <input type="text" className="form-control" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} required />
          </div>

          <div className="form-group">
            <label>Source Location</label>
            <select className="form-control" value={formData.sourceLocationId} onChange={e => setFormData({...formData, sourceLocationId: e.target.value})} required>
              <option value="">Select Source Location...</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Destination Location</label>
            <select className="form-control" value={formData.destLocationId} onChange={e => setFormData({...formData, destLocationId: e.target.value})} required>
              <option value="">Select Destination Location...</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <input type="number" className="form-control" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} required />
          </div>
        </form>
      </Modal>
    </div>
  );
}
