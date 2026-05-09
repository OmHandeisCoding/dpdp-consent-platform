import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Helper to simulate webhook payloads
const triggerWebhook = async (url: string, payload: any) => {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`Webhook triggered: ${url}`, payload);
  } catch (error) {
    console.error(`Failed to trigger webhook ${url}`, error);
  }
};

// --- FIDUCIARY REGISTRATION ---
// Mock endpoint to register a Fiduciary and get an API key
app.post('/api/fiduciary/register', async (req, res) => {
  const { name, callbackUrl } = req.body;
  const fiduciary = await prisma.fiduciary.create({
    data: {
      name,
      callbackUrl,
      apiKey: `API_KEY_${Math.random().toString(36).substring(7)}`,
    },
  });
  res.json(fiduciary);
});

// --- CONSENT REQUEST INITIATION (Called by Dummy Bank) ---
app.post('/api/requests', async (req, res) => {
  const { apiKey, userPhone, purposeText, dataItems } = req.body;
  
  // Authenticate fiduciary
  const fiduciary = await prisma.fiduciary.findUnique({ where: { apiKey } });
  if (!fiduciary) return res.status(401).json({ error: 'Invalid API Key' });

  // Find or create user based on phone mapping
  let user = await prisma.user.findUnique({ where: { phone: userPhone } });
  if (!user) {
    user = await prisma.user.create({ data: { phone: userPhone, name: `User ${userPhone}` } });
  }

  // Generate Consent Request
  const request = await prisma.consentRequest.create({
    data: {
      fiduciaryId: fiduciary.id,
      userId: user.id,
      purposeText,
      dataItems: JSON.stringify(dataItems),
    },
  });

  res.json(request);
});

// --- USER ENDPOINTS (Called by CM User App) ---
app.get('/api/users/:phone/requests', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { phone: req.params.phone } });
  if (!user) return res.json([]);
  
  const requests = await prisma.consentRequest.findMany({
    where: { userId: user.id, status: 'PENDING' },
    include: { fiduciary: true }
  });
  res.json(requests);
});

app.post('/api/requests/:id/approve', async (req, res) => {
  const request = await prisma.consentRequest.findUnique({
    where: { id: req.params.id },
    include: { fiduciary: true }
  });
  if (!request) return res.status(404).json({ error: 'Not found' });

  // Update request status
  await prisma.consentRequest.update({
    where: { id: request.id },
    data: { status: 'APPROVED' }
  });

  // Generate cryptographic artefact
  const signature = `SIGNED_${Buffer.from(request.id).toString('base64')}`;
  const artefact = await prisma.consentArtefact.create({
    data: {
      userId: request.userId,
      fiduciaryId: request.fiduciaryId,
      purposeText: request.purposeText,
      dataItems: request.dataItems,
      signature,
    }
  });

  // Trigger webhook to Fiduciary
  triggerWebhook(request.fiduciary.callbackUrl, {
    event: 'CONSENT_GRANTED',
    artefact,
  });

  res.json(artefact);
});

app.post('/api/requests/:id/deny', async (req, res) => {
  await prisma.consentRequest.update({
    where: { id: req.params.id },
    data: { status: 'DENIED' }
  });
  res.json({ success: true });
});

app.get('/api/users/:phone/consents', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { phone: req.params.phone } });
  if (!user) return res.json([]);
  
  const consents = await prisma.consentArtefact.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
    include: { fiduciary: true }
  });
  res.json(consents);
});

app.post('/api/consents/:id/revoke', async (req, res) => {
  const artefact = await prisma.consentArtefact.findUnique({
    where: { id: req.params.id },
    include: { fiduciary: true }
  });
  if (!artefact) return res.status(404).json({ error: 'Not found' });

  await prisma.consentArtefact.update({
    where: { id: artefact.id },
    data: { status: 'REVOKED', revokedAt: new Date() }
  });

  // Trigger webhook to Fiduciary
  triggerWebhook(artefact.fiduciary.callbackUrl, {
    event: 'CONSENT_REVOKED',
    artefactId: artefact.id,
  });

  res.json({ success: true });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`CM Backend running on port ${PORT}`);
});
