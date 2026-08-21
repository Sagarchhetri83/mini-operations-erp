import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface InventoryItem {
  id: string;
  itemId: string;
  locationId: string;
  batch: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  item: {
    name: string;
    sku: string;
    category: {
      name: string;
    }
  };
  location: {
    name: string;
  };
}

interface Item {
  id: string;
  name: string;
  sku: string;
}

interface Location {
  id: string;
  name: string;
}

export default function Inventory() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'OPERATIONS_USER';

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    itemId: '',
    locationId: '',
    batch: '',
    physicalQty: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, itemsRes, locRes] = await Promise.all([
        api.get('/inventory'),
        canManage ? api.get('/inventory/items') : Promise.resolve({ data: [] }),
        canManage ? api.get('/inventory/locations') : Promise.resolve({ data: [] })
      ]);
      setInventory(invRes.data);
      if (canManage) {
        setItems(itemsRes.data);
        setLocations(locRes.data);
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load inventory');
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
      await api.post('/inventory', {
        ...formData,
        physicalQty: Number(formData.physicalQty)
      });
      setIsModalOpen(false);
      setFormData({ itemId: '', locationId: '', batch: '', physicalQty: 0 });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create inventory record');
    }
  };

  const handleAdjustQuantity = async (id: string, currentQty: number, reservedQty: number) => {
    const newQtyStr = prompt(`Enter new physical quantity (must be >= ${reservedQty}):`, currentQty.toString());
    if (newQtyStr === null) return;
    
    const newQty = parseInt(newQtyStr, 10);
    if (isNaN(newQty) || newQty < 0) {
      alert('Please enter a valid non-negative number.');
      return;
    }

    try {
      await api.put(`/inventory/${id}`, { physicalQty: newQty });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update inventory');
    }
  };

  return (
    <div className="fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">View and manage stock levels across all locations.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Receive Stock
          </button>
        )}
      </header>

      {error && <div className="error-alert">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-spinner" style={{ padding: '2rem', textAlign: 'center' }}>Loading inventory...</div>
        ) : inventory.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No inventory records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Batch</th>
                  <th style={{ textAlign: 'right' }}>Physical</th>
                  <th style={{ textAlign: 'right' }}>Reserved</th>
                  <th style={{ textAlign: 'right' }}>Available</th>
                  {canManage && <th style={{ textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {inventory.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.item.name}</td>
                    <td><span className="badge badge-secondary">{inv.item.sku}</span></td>
                    <td>{inv.item.category.name}</td>
                    <td>{inv.location.name}</td>
                    <td>{inv.batch}</td>
                    <td style={{ textAlign: 'right' }}>{inv.physicalQty}</td>
                    <td style={{ textAlign: 'right', color: inv.reservedQty > 0 ? 'var(--warning-color)' : 'inherit' }}>
                      {inv.reservedQty}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: inv.availableQty === 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                      {inv.availableQty}
                    </td>
                    {canManage && (
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          onClick={() => handleAdjustQuantity(inv.id, inv.physicalQty, inv.reservedQty)}
                        >
                          Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h2 style={{ marginTop: 0 }}>Receive New Stock</h2>
            {formError && <div className="error-alert">{formError}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item</label>
                <select 
                  className="form-control" 
                  value={formData.itemId} 
                  onChange={e => setFormData({...formData, itemId: e.target.value})}
                  required
                >
                  <option value="">Select an Item...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Location</label>
                <select 
                  className="form-control" 
                  value={formData.locationId} 
                  onChange={e => setFormData({...formData, locationId: e.target.value})}
                  required
                >
                  <option value="">Select a Location...</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Batch Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.batch}
                  onChange={e => setFormData({...formData, batch: e.target.value})}
                  required 
                  placeholder="e.g. BATCH-2026-X"
                />
              </div>

              <div className="form-group">
                <label>Physical Quantity</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="0"
                  value={formData.physicalQty}
                  onChange={e => setFormData({...formData, physicalQty: parseInt(e.target.value) || 0})}
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Receive Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
