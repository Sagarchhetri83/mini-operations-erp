import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Customer Orders Module', () => {
  let adminToken: string;
  let opsToken: string;
  let salesToken: string;
  
  let item1: any;
  let item2: any;
  let locA: any;
  let customer1: any;

  beforeAll(async () => {
    // Authenticate users
    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: 'Password123' });
    adminToken = loginAdmin.body.token;

    const loginOps = await request(app).post('/api/auth/login').send({ email: 'ops1@erp.com', password: 'Password123' });
    opsToken = loginOps.body.token;

    const loginSales = await request(app).post('/api/auth/login').send({ email: 'sales1@erp.com', password: 'Password123' });
    salesToken = loginSales.body.token;

    // Fetch master data
    const items = await prisma.item.findMany({ take: 2 });
    item1 = items[0];
    item2 = items[1];
    
    locA = await prisma.location.findFirst();

    // Create a customer
    customer1 = await prisma.customer.create({
      data: { name: 'Test Customer', email: 'test@customer.com' }
    });

    // Clean up old test data
    await prisma.inventoryTransaction.deleteMany({
      where: { note: { startsWith: 'Stock reserved for order' } }
    });
    await prisma.orderItem.deleteMany({});
    await prisma.customerOrder.deleteMany({
      where: { customerId: customer1.id }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('TEST: Unauthorized access to orders is rejected', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('TEST: Creation fails with missing customer', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        items: [{ inventoryId: 'some-id', itemId: item1.id, quantity: 10 }]
      });
    expect(res.status).toBe(400);
  });

  it('TEST: Creation fails with invalid quantity', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: customer1.id,
        items: [{ inventoryId: 'some-id', itemId: item1.id, quantity: -5 }]
      });
    expect(res.status).toBe(400);
  });

  describe('Reservation and Confirmation Workflow', () => {
    let orderId: string;
    let inv1Id: string;
    let inv2Id: string;

    beforeAll(async () => {
      // Setup reliable test inventory
      const inv1 = await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'ORDER_BATCH_1' } },
        create: { itemId: item1.id, locationId: locA.id, batch: 'ORDER_BATCH_1', physicalQty: 100, reservedQty: 0 },
        update: { physicalQty: 100, reservedQty: 0 }
      });
      const inv2 = await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item2.id, locationId: locA.id, batch: 'ORDER_BATCH_2' } },
        create: { itemId: item2.id, locationId: locA.id, batch: 'ORDER_BATCH_2', physicalQty: 50, reservedQty: 0 },
        update: { physicalQty: 50, reservedQty: 0 }
      });
      inv1Id = inv1.id;
      inv2Id = inv2.id;
    });

    it('TEST: SALES_USER can create DRAFT order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: customer1.id,
          items: [
            { inventoryId: inv1Id, itemId: item1.id, quantity: 10 },
            { inventoryId: inv2Id, itemId: item2.id, quantity: 5 }
          ]
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('DRAFT');
      orderId = res.body.id;
    });

    it('TEST: SALES_USER cannot confirm order (RBAC)', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });

    it('TEST: Valid DRAFT -> CONFIRMED reservation increments reservedQty and creates audit', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${opsToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CONFIRMED');

      const inv1 = await prisma.inventory.findUnique({ where: { id: inv1Id } });
      const inv2 = await prisma.inventory.findUnique({ where: { id: inv2Id } });

      expect(inv1!.physicalQty).toBe(100);
      expect(inv1!.reservedQty).toBe(10); // incremented

      expect(inv2!.physicalQty).toBe(50);
      expect(inv2!.reservedQty).toBe(5); // incremented
    });

    it('TEST: Duplicate confirmation returns error and does NOT reserve twice', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(400); // Because status is no longer DRAFT

      const inv1 = await prisma.inventory.findUnique({ where: { id: inv1Id } });
      expect(inv1!.reservedQty).toBe(10); // Still 10, not 20
    });
  });

  describe('Atomicity and Concurrency', () => {
    let invFailId: string;
    let invSuccessId: string;

    beforeAll(async () => {
      const invF = await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'ATOM_FAIL' } },
        create: { itemId: item1.id, locationId: locA.id, batch: 'ATOM_FAIL', physicalQty: 5, reservedQty: 0 },
        update: { physicalQty: 5, reservedQty: 0 }
      });
      const invS = await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item2.id, locationId: locA.id, batch: 'ATOM_SUCC' } },
        create: { itemId: item2.id, locationId: locA.id, batch: 'ATOM_SUCC', physicalQty: 100, reservedQty: 0 },
        update: { physicalQty: 100, reservedQty: 0 }
      });
      invFailId = invF.id;
      invSuccessId = invS.id;
    });

    it('TEST: If one item fails, ALL reservations roll back (Atomicity)', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customer1.id,
          items: [
            { inventoryId: invSuccessId, itemId: item2.id, quantity: 50 }, // Should succeed in vacuum
            { inventoryId: invFailId, itemId: item1.id, quantity: 10 } // Will fail (only 5 physical)
          ]
        });
      
      const atomOrderId = createRes.body.id;

      const res = await request(app)
        .put(`/api/orders/${atomOrderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Insufficient stock/i);

      // Verify rollback
      const invS = await prisma.inventory.findUnique({ where: { id: invSuccessId } });
      const invF = await prisma.inventory.findUnique({ where: { id: invFailId } });

      expect(invS!.reservedQty).toBe(0); // Rolled back!
      expect(invF!.reservedQty).toBe(0);
    });

    it('TEST 6 - CONCURRENCY: Simultaneous confirmations cannot oversell', async () => {
      // Setup limited stock: only 10 physical, 0 reserved
      const concInv = await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'CONC_BATCH' } },
        create: { itemId: item1.id, locationId: locA.id, batch: 'CONC_BATCH', physicalQty: 10, reservedQty: 0 },
        update: { physicalQty: 10, reservedQty: 0 }
      });

      // Order A needs 7
      const oA = await request(app).post('/api/orders').set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: customer1.id, items: [{ inventoryId: concInv.id, itemId: item1.id, quantity: 7 }] });
      
      // Order B needs 7
      const oB = await request(app).post('/api/orders').set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: customer1.id, items: [{ inventoryId: concInv.id, itemId: item1.id, quantity: 7 }] });

      // Confirm exactly simultaneously
      const req1 = request(app).put(`/api/orders/${oA.body.id}/confirm`).set('Authorization', `Bearer ${adminToken}`);
      const req2 = request(app).put(`/api/orders/${oB.body.id}/confirm`).set('Authorization', `Bearer ${adminToken}`);

      const [res1, res2] = await Promise.all([req1, req2]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400); // One MUST fail

      // Check DB
      const finalInv = await prisma.inventory.findUnique({ where: { id: concInv.id } });
      expect(finalInv!.physicalQty).toBe(10);
      expect(finalInv!.reservedQty).toBe(7); // Never 14
    });
  });
});
