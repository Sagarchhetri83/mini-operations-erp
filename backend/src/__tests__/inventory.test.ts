import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let adminToken = '';
let salesToken = '';
let testItem: any;
let testLocation: any;
let existingInventory: any;

beforeAll(async () => {
  // Login to get tokens
  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: 'Password123' });
  adminToken = adminRes.body.token;

  const salesRes = await request(app).post('/api/auth/login').send({ email: 'sales@erp.com', password: 'Password123' });
  salesToken = salesRes.body.token;

  // Get test item and location
  testItem = await prisma.item.findFirst();
  testLocation = await prisma.location.findFirst();

  // Cleanup potential previous test runs
  await prisma.inventoryTransaction.deleteMany({
    where: { inventory: { batch: { startsWith: 'TEST-BATCH' } } }
  });
  await prisma.inventory.deleteMany({
    where: { batch: { startsWith: 'TEST-BATCH' } }
  });

  // Create an initial inventory record to test against
  existingInventory = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batch: {
        itemId: testItem.id,
        locationId: testLocation.id,
        batch: 'TEST-BATCH-1',
      }
    },
    update: {
      physicalQty: 100,
      reservedQty: 20
    },
    create: {
      itemId: testItem.id,
      locationId: testLocation.id,
      batch: 'TEST-BATCH-1',
      physicalQty: 100,
      reservedQty: 20
    }
  });
});

describe('Inventory API Tests', () => {
  it('GET /api/inventory - Unauthenticated users cannot access', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });

  it('GET /api/inventory - Available quantity is correctly calculated', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const inv = res.body.find((i: any) => i.id === existingInventory.id);
    expect(inv).toBeDefined();
    expect(inv.physicalQty).toBe(100);
    expect(inv.reservedQty).toBe(20);
    expect(inv.availableQty).toBe(80); // 100 - 20
  });

  it('POST /api/inventory - SALES_USER cannot create inventory (Role Authorization)', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        itemId: testItem.id,
        locationId: testLocation.id,
        batch: 'NEW-BATCH',
        physicalQty: 50
      });
    
    expect(res.status).toBe(403);
  });

  it('POST /api/inventory - Cannot create duplicate Item + Location + Batch', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: testItem.id,
        locationId: testLocation.id,
        batch: 'TEST-BATCH-1', // Same as existingInventory
        physicalQty: 50
      });
    
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('POST /api/inventory - Cannot create with negative quantity', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: testItem.id,
        locationId: testLocation.id,
        batch: 'TEST-BATCH-NEG',
        physicalQty: -10
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('non-negative number');
  });

  it('POST /api/inventory - Can create valid inventory', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: testItem.id,
        locationId: testLocation.id,
        batch: 'TEST-BATCH-2',
        physicalQty: 75
      });
    
    expect(res.status).toBe(201);
    expect(res.body.physicalQty).toBe(75);
    expect(res.body.availableQty).toBe(75);
  });

  it('PUT /api/inventory/:id - Cannot update into negative available quantity', async () => {
    // existingInventory has physical: 100, reserved: 20
    const res = await request(app)
      .put(`/api/inventory/${existingInventory.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        physicalQty: 10 // Less than reserved 20
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('negative available quantity');
  });

  it('PUT /api/inventory/:id - Can adjust physical quantity', async () => {
    const res = await request(app)
      .put(`/api/inventory/${existingInventory.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        physicalQty: 150
      });
    
    expect(res.status).toBe(200);
    expect(res.body.physicalQty).toBe(150);
    expect(res.body.reservedQty).toBe(20);
    expect(res.body.availableQty).toBe(130);
  });
});
