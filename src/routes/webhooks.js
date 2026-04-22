const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

const { prisma }              = require('../lib/prisma');
const { enqueueStatusEmail }  = require('../lib/queue');

const ATS_WEBHOOK_SECRET = process.env.ATS_WEBHOOK_SECRET;

const VALID_STATUSES = [
  'APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED',
  'OFFER_EXTENDED', 'HIRED', 'REJECTED', 'WITHDRAWN',
];

// ── HMAC-SHA256 signature verification ──────────────────────────
function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader || !ATS_WEBHOOK_SECRET) return false;
  const expected = 'sha256=' +
    crypto.createHmac('sha256', ATS_WEBHOOK_SECRET)
          .update(rawBody)
          .digest('hex');
  try {
    // timingSafeEqual prevents timing attacks
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

// ── POST /api/webhooks/ats-update ───────────────────────────────
// NOTE: express.raw() is applied here (not in server.js) so we get the raw
// body needed for HMAC verification BEFORE JSON parsing.
router.post(
  '/ats-update',
  express.raw({ type: 'application/json' }),
  async (req, res) => {

    // 1. Verify HMAC signature
    const sig = req.headers['x-ats-signature'];
    if (!verifySignature(req.body, sig)) {
      console.warn('⚠️  Webhook: invalid signature from', req.ip);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // 2. Parse body
    let payload;
    try {
      payload = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const { eventId, atsAppId, newStatus, note, updatedBy } = payload;

    // 3. Field validation
    if (!eventId || !atsAppId || !newStatus) {
      return res.status(400).json({
        error: 'Missing required fields: eventId, atsAppId, newStatus',
      });
    }
    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({ error: `Invalid status: ${newStatus}` });
    }

    // 4. Idempotency — ignore if already processed
    const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existing) {
      console.log(`ℹ️  Webhook duplicate ignored: ${eventId}`);
      return res.status(200).json({ message: 'Already processed' });
    }

    // 5. Find application by atsAppId
    const application = await prisma.application.findUnique({
      where:   { atsAppId },
      include: { candidate: true, job: true },
    });

    if (!application) {
      console.warn(`⚠️  Webhook: no application found for atsAppId=${atsAppId}`);
      // Return 200 so ATS doesn't retry on a known-bad ID; log it for debugging
      await prisma.webhookEvent.create({
        data: { source: 'ats', eventId, payload, status: 'failed' },
      });
      return res.status(200).json({ message: 'Application not found — logged' });
    }

    // 6. Atomic update: application status + audit event + idempotency record
    await prisma.$transaction([
      prisma.application.update({
        where: { id: application.id },
        data:  { status: newStatus },
      }),
      prisma.applicationEvent.create({
        data: {
          applicationId: application.id,
          fromStatus:    application.status,
          toStatus:      newStatus,
          note:          note || null,
          changedBy:     updatedBy || 'hr',
        },
      }),
      prisma.webhookEvent.create({
        data: { source: 'ats', eventId, payload, status: 'processed' },
      }),
    ]);

    // 7. Queue status email (retried up to 5× with exponential backoff)
    enqueueStatusEmail({
      to:       application.candidate.email,
      name:     application.candidate.name,
      jobTitle: application.job.title,
      status:   newStatus,
      note:     note || null,
    }).catch((e) => console.error('Failed to enqueue status email:', e.message));

    console.log(`✔ Status synced: app=${application.id} → ${newStatus}`);
    return res.status(200).json({ message: 'Status updated successfully' });
  }
);

module.exports = router;
