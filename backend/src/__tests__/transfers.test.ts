import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { PrismaClient, TransferStatus, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

describe('Internal Transfers Module', () => {
  let adminToken: string;
  let opsToken: string;
  let salesToken: string;
  
  let item1: any;
  let locA: any;
  let locB: any;

  beforeAll(async () => {
    // Authenticate users
    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: 'Password123' });
    adminToken = loginAdmin.body.token;

    const loginOps = await request(app).post('/api/auth/login').send({ email: 'ops@erp.com', password: 'Password123' });
    opsToken = loginOps.body.token;

    const loginSales = await request(app).post('/api/auth/login').send({ email: 'sales@erp.com', password: 'Password123' });
    salesToken = loginSales.body.token;

    // Fetch master data
    item1 = await prisma.item.findFirst();
    const locs = await prisma.location.findMany({ take: 2 });
    locA = locs[0];
    locB = locs[1];

    // Clean up old test data
    await prisma.inventoryTransaction.deleteMany({
      where: { note: { startsWith: 'Test transfer' } }
    });
    await prisma.internalTransfer.deleteMany({
      where: { notes: 'Test transfer' }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('TEST 2: Unauthorized SALES_USER cannot create transfer', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        sourceLocationId: locA.id,
        destLocationId: locB.id,
        itemId: item1.id,
        quantity: 10,
        notes: 'Test transfer'
      });
    expect(res.status).toBe(403);
  });

  it('TEST 12: Source and destination cannot be the same', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locA.id,
        destLocationId: locA.id,
        itemId: item1.id,
        quantity: 10,
        notes: 'Test transfer'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/different/i);
  });

  it('TEST 13: Invalid/zero/negative quantity rejected', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locA.id,
        destLocationId: locB.id,
        itemId: item1.id,
        quantity: -5,
        notes: 'Test transfer'
      });
    expect(res.status).toBe(400);
  });

  it('TEST 1: Cannot transfer more than available inventory', async () => {
    // Setup reliable test inventory first
    await prisma.inventory.upsert({
      where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'DEFAULT' } },
      create: { itemId: item1.id, locationId: locA.id, batch: 'DEFAULT', physicalQty: 10, reservedQty: 0 },
      update: { physicalQty: 10, reservedQty: 0 }
    });

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locA.id,
        destLocationId: locB.id,
        itemId: item1.id,
        quantity: 9999999, // Unlikely to have this much
        notes: 'Test transfer'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/more than available/i);
  });

  describe('Dispatch and Receive Workflow', () => {
    let transferId: string;
    let initialSourcePhysical: number;
    let initialDestPhysical: number;

    beforeAll(async () => {
      // Setup reliable test inventory
      await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'DEFAULT' } },
        create: { itemId: item1.id, locationId: locA.id, batch: 'DEFAULT', physicalQty: 50, reservedQty: 0 },
        update: { physicalQty: 50, reservedQty: 0 }
      });
      await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locB.id, batch: 'DEFAULT' } },
        create: { itemId: item1.id, locationId: locB.id, batch: 'DEFAULT', physicalQty: 10, reservedQty: 0 },
        update: { physicalQty: 10, reservedQty: 0 }
      });

      initialSourcePhysical = 50;
      initialDestPhysical = 10;

      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: locA.id,
          destLocationId: locB.id,
          itemId: item1.id,
          quantity: 5,
          notes: 'Test transfer workflow'
        });
      expect(res.status).toBe(201);
      transferId = res.body.id;
    });

    it('TEST 10: Cannot skip REQUESTED -> RECEIVED', async () => {
      const res = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot receive/i);
    });

    it('TEST 3: Unauthorized SALES_USER cannot dispatch', async () => {
      const res = await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });

    it('TEST 5: Successful dispatch decreases SOURCE physical quantity & TEST 6: Dest DOES NOT increase', async () => {
      const res = await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DISPATCHED');

      const sourceInv = await prisma.inventory.findUnique({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'DEFAULT' } }
      });
      const destInv = await prisma.inventory.findUnique({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locB.id, batch: 'DEFAULT' } }
      });

      expect(sourceInv!.physicalQty).toBe(initialSourcePhysical - 5);
      expect(destInv!.physicalQty).toBe(initialDestPhysical);
    });

    it('TEST 11: Cannot dispatch the same transfer twice', async () => {
      const res = await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);
      expect(res.status).toBe(400);
    });

    it('TEST 4: Unauthorized SALES_USER cannot receive', async () => {
      const res = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });

    it('TEST 7: Successful receipt increases DESTINATION quantity & TEST 8: Source is NOT deducted again & TEST 15: Dest is incremented', async () => {
      const res = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RECEIVED');

      const sourceInv = await prisma.inventory.findUnique({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'DEFAULT' } }
      });
      const destInv = await prisma.inventory.findUnique({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locB.id, batch: 'DEFAULT' } }
      });

      expect(sourceInv!.physicalQty).toBe(initialSourcePhysical - 5); // Remained the same since dispatch
      expect(destInv!.physicalQty).toBe(initialDestPhysical + 5);
    });

    it('TEST 9: Same transfer cannot be received twice', async () => {
      const res = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);
      expect(res.status).toBe(400); // 400 because status is no longer DISPATCHED
    });
  });

  describe('Destination Inventory Creation', () => {
    it('TEST 14: Destination inventory is created when the destination batch does not already exist', async () => {
      // Create a transfer with a unique batch
      const newBatch = `NEW-${Date.now()}`;
      
      // Ensure source exists
      await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: newBatch } },
        create: { itemId: item1.id, locationId: locA.id, batch: newBatch, physicalQty: 20, reservedQty: 0 },
        update: { physicalQty: 20 }
      });

      // No destination inventory for this batch yet

      const createRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceLocationId: locA.id,
          destLocationId: locB.id,
          itemId: item1.id,
          batch: newBatch,
          quantity: 2,
          notes: 'Test new batch creation'
        });
      
      const transferId = createRes.body.id;

      await request(app).post(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
      const receiveRes = await request(app).post(`/api/transfers/${transferId}/receive`).set('Authorization', `Bearer ${adminToken}`);
      
      expect(receiveRes.status).toBe(200);

      const destInv = await prisma.inventory.findUnique({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locB.id, batch: newBatch } }
      });

      expect(destInv).not.toBeNull();
      expect(destInv!.physicalQty).toBe(2);
    });
  });

  describe('Concurrency Protection', () => {
    it('TEST 16 — CONCURRENCY: Attempt two simultaneous dispatch operations against the same limited source inventory', async () => {
      // Setup limited stock: only 10 available
      await prisma.inventory.upsert({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'CONCURRENCY_BATCH' } },
        create: { itemId: item1.id, locationId: locA.id, batch: 'CONCURRENCY_BATCH', physicalQty: 10, reservedQty: 0 },
        update: { physicalQty: 10, reservedQty: 0 }
      });

      // Create two transfers requesting 10 each
      const t1 = await request(app).post('/api/transfers').set('Authorization', `Bearer ${adminToken}`)
        .send({ sourceLocationId: locA.id, destLocationId: locB.id, itemId: item1.id, batch: 'CONCURRENCY_BATCH', quantity: 10, notes: 'Concurrency 1' });
      
      const t2 = await request(app).post('/api/transfers').set('Authorization', `Bearer ${adminToken}`)
        .send({ sourceLocationId: locA.id, destLocationId: locB.id, itemId: item1.id, batch: 'CONCURRENCY_BATCH', quantity: 10, notes: 'Concurrency 2' });

      // Attempt to dispatch both exactly simultaneously
      const req1 = request(app).post(`/api/transfers/${t1.body.id}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
      const req2 = request(app).post(`/api/transfers/${t2.body.id}/dispatch`).set('Authorization', `Bearer ${adminToken}`);

      const [res1, res2] = await Promise.all([req1, req2]);

      // Exactly one must succeed, one must fail due to insufficient stock
      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      // Verify the database did not oversell
      const sourceInv = await prisma.inventory.findUnique({
        where: { itemId_locationId_batch: { itemId: item1.id, locationId: locA.id, batch: 'CONCURRENCY_BATCH' } }
      });

      expect(sourceInv!.physicalQty).toBe(0); // 10 - 10 = 0. Never below 0.
    });
  });
});
