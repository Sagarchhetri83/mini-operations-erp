import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { PrismaClient, WorkOrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

let adminToken = '';
let salesToken = '';
let testItem: any;
let testLocation: any;
let assignedUser: any;
let testWorkOrder: any;

beforeAll(async () => {
  // Login
  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: 'Password123' });
  adminToken = adminRes.body.token;

  const salesRes = await request(app).post('/api/auth/login').send({ email: 'sales1@erp.com', password: 'Password123' });
  salesToken = salesRes.body.token;

  // Create a clean item and location for testing
  assignedUser = await prisma.user.findFirst({ where: { role: 'OPERATIONS_USER' } });
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@erp.com' } });
  const category = await prisma.category.findFirst();
  testLocation = await prisma.location.create({
    data: { name: `WO-LOC-${Date.now()}`, code: `WO-LOC-${Date.now()}` }
  });
  testItem = await prisma.item.create({
    data: { name: `WO-ITEM-${Date.now()}`, sku: `WO-SKU-${Date.now()}`, categoryId: category!.id, unit: 'pcs' }
  });

  await prisma.workOrder.deleteMany({
    where: { workOrderNo: 'WO-TEST-100' }
  });

  // Create one existing work order
  testWorkOrder = await prisma.workOrder.create({
    data: {
      workOrderNo: 'WO-TEST-100',
      itemId: testItem.id,
      locationId: testLocation.id,
      assignedUserId: assignedUser.id,
      requiredQty: 50,
      status: WorkOrderStatus.ASSIGNED,
      createdById: adminUser!.id
    }
  });
});

describe('Work Orders API Tests', () => {
  it('Unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/work-orders');
    expect(res.status).toBe(401);
  });

  it('Authenticated user can list work orders', async () => {
    const res = await request(app)
      .get('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('SALES_USER cannot create work order and receives 403', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        itemId: testItem.id,
        locationId: testLocation.id,
        assignedUserId: assignedUser.id,
        requiredQty: 100
      });
    
    expect(res.status).toBe(403);
  });

  it('Missing item/location/assigned user returns appropriate error', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: testItem.id,
        // locationId missing
        assignedUserId: assignedUser.id,
        requiredQty: 100
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('are required');
  });

  it('Invalid required quantity returns 400', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: testItem.id,
        locationId: testLocation.id,
        assignedUserId: assignedUser.id,
        requiredQty: -50
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('positive number');
  });

  it('No inventory means availableQty = 0 and shortage equals requiredQty', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: testItem.id,
        locationId: testLocation.id,
        assignedUserId: assignedUser.id,
        requiredQty: 100
      });
    
    expect(res.status).toBe(201);
    expect(res.body.requiredQty).toBe(100);
    expect(res.body.availableQty).toBe(0);
    expect(res.body.calculatedShortage).toBe(100);
  });

  it('SALES_USER cannot modify status', async () => {
    const res = await request(app)
      .put(`/api/work-orders/${testWorkOrder.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'IN_PROGRESS' });
    
    expect(res.status).toBe(403);
  });

  it('ASSIGNED → IN_PROGRESS succeeds', async () => {
    const res = await request(app)
      .put(`/api/work-orders/${testWorkOrder.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('Invalid status transition returns 400 (IN_PROGRESS -> ASSIGNED)', async () => {
    const res = await request(app)
      .put(`/api/work-orders/${testWorkOrder.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ASSIGNED' });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('transition from IN_PROGRESS');
  });

  it('IN_PROGRESS → COMPLETED succeeds', async () => {
    const res = await request(app)
      .put(`/api/work-orders/${testWorkOrder.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' });
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
  });

  it('COMPLETED cannot transition back', async () => {
    const res = await request(app)
      .put(`/api/work-orders/${testWorkOrder.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot transition status of a COMPLETED work order');
  });

  it('Shortage calculation is correct with inventory', async () => {
    // Add some inventory
    await prisma.inventory.create({
      data: {
        itemId: testItem.id,
        locationId: testLocation.id,
        batch: 'TEST-BATCH-WO',
        physicalQty: 60,
        reservedQty: 20
      }
    });

    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: testItem.id,
        locationId: testLocation.id,
        assignedUserId: assignedUser.id,
        requiredQty: 100 // available is 60 - 20 = 40. Shortage = 60
      });
    
    expect(res.status).toBe(201);
    expect(res.body.availableQty).toBe(40);
    expect(res.body.calculatedShortage).toBe(60);
  });
});
