import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// CM Backend URL for sending requests
const CM_URL = process.env.CM_URL || 'http://localhost:4000';

// --- INITIAL CONFIGURATION WIZARD ---
app.post('/api/config', async (req, res) => {
  const { companyName, cmApiKey } = req.body;
  let config = await prisma.fiduciaryConfig.findFirst();
  if (config) {
    config = await prisma.fiduciaryConfig.update({
      where: { id: config.id },
      data: { companyName, cmApiKey }
    });
  } else {
    config = await prisma.fiduciaryConfig.create({
      data: { companyName, cmApiKey }
    });
  }
  res.json(config);
});

app.get('/api/config', async (req, res) => {
  const config = await prisma.fiduciaryConfig.findFirst();
  res.json(config || { companyName: 'Dummy Bank', cmApiKey: null });
});

// --- PURPOSES (DPO DASHBOARD) ---
app.get('/api/purposes', async (req, res) => {
  const purposes = await prisma.purpose.findMany();
  res.json(purposes);
});

app.post('/api/purposes', async (req, res) => {
  const { name, description, dataItems } = req.body;
  const purpose = await prisma.purpose.create({
    data: { name, description, dataItems: JSON.stringify(dataItems) }
  });
  res.json(purpose);
});

// --- CONSENT INITIATION (DUMMY BANK WIDGET) ---
// This is called by the frontend widget to start a consent request
app.post('/api/consent/initiate', async (req, res) => {
  const { phone, purposeId } = req.body;
  
  const purpose = await prisma.purpose.findUnique({ where: { id: purposeId } });
  if (!purpose) return res.status(404).json({ error: 'Purpose not found' });

  const config = await prisma.fiduciaryConfig.findFirst();
  if (!config || !config.cmApiKey) return res.status(500).json({ error: 'Fiduciary not configured' });

  // Call the CM Backend to initiate the request
  try {
    const response = await fetch(`${CM_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.cmApiKey,
        userPhone: phone,
        purposeText: purpose.description,
        dataItems: JSON.parse(purpose.dataItems)
      })
    });
    
    const requestData = await response.json();
    res.json(requestData);
  } catch(e) {
    res.status(500).json({ error: 'Failed to communicate with CM', details: (e as Error).message });
  }
});

// --- CM WEBHOOK RECEIVER ---
app.post('/api/webhook', async (req, res) => {
  const { event, artefact, artefactId } = req.body;
  console.log(`Received Webhook Action: ${event}`);

  if (event === 'CONSENT_GRANTED' && artefact) {
    // Resolve the customer phone — artefact.user may or may not be populated
    const phone: string = artefact.user?.phone ?? artefact.userId;

    let customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: artefact.user?.name ?? 'Verified Customer', phone }
      });
    }

    // Upsert to avoid duplicate key on re-runs
    await prisma.consentLog.upsert({
      where: { id: artefact.id },
      create: {
        id: artefact.id,
        customerId: customer.id,
        purposeText: artefact.purposeText,
        dataItems: artefact.dataItems,
        signature: artefact.signature,
        status: 'ACTIVE'
      },
      update: { status: 'ACTIVE', revokedAt: null }
    });

  } else if (event === 'CONSENT_REVOKED') {
    // User withdrew consent via CM, we must revoke our local log
    await prisma.consentLog.updateMany({
      where: { id: artefactId },
      data: { status: 'REVOKED', revokedAt: new Date() }
    });
  }

  res.json({ received: true });
});

// --- AUDIT LOGS (DPO DASHBOARD) ---
app.get('/api/audit', async (req, res) => {
  const logs = await prisma.consentLog.findMany({ include: { customer: true } });
  res.json(logs);
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`Fiduciary Backend running on port ${PORT}`);
});
