const { Resend } = require('resend');

const resend   = new Resend(process.env.RESEND_API_KEY);
const FROM     = 'NBTech Careers <no-reply@updates.navabharathtechnologies.com>';
const HR_EMAIL = process.env.HR_EMAIL || 'hr@navabharathtechnologies.com';
const PORTAL   = 'https://www.navabharathtechnologies.com/openings.html';

// Human-readable status labels
const STATUS_LABELS = {
  APPLIED:             '📩 Application Received',
  SCREENING:           '🔍 Under Screening',
  INTERVIEW_SCHEDULED: '📅 Interview Scheduled',
  INTERVIEW_COMPLETED: '✅ Interview Completed',
  OFFER_EXTENDED:      '🎉 Offer Extended',
  HIRED:               '🎊 Congratulations — You\'re Hired!',
  REJECTED:            '🙏 Application Closed',
  WITHDRAWN:           '↩️ Application Withdrawn',
};

// ── Welcome email on registration ──────────────────────────────
async function sendWelcomeEmail({ to, name }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Navabharath Technologies Careers Portal',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1a3c87;">Welcome, ${name}! 🎉</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now browse open positions and submit your application.</p>
        <a href="${PORTAL}" style="display:inline-block;background:#1a3c87;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View Open Jobs →</a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Navabharath Technologies · Mysore, India</p>
      </div>
    `,
  });
}

// ── Application received confirmation ──────────────────────────
async function sendApplicationConfirmation({ to, name, jobTitle, applicationId }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Application Received — ${jobTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1a3c87;">Hi ${name},</h2>
        <p>We've received your application for <strong>${jobTitle}</strong>.</p>
        <p style="background:#f1f5f9;padding:12px;border-radius:8px;">
          Application ID: <code>${applicationId}</code>
        </p>
        <p>Our team will review it and update you at every stage. Track your status anytime on the portal.</p>
        <a href="${PORTAL}" style="display:inline-block;background:#1a3c87;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Track My Application →</a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Navabharath Technologies · Mysore, India</p>
      </div>
    `,
  });
}

// ── Status update email (triggered by ATS webhook) ─────────────
async function sendStatusEmail({ to, name, jobTitle, status, note }) {
  const label = STATUS_LABELS[status] || status;
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Application Update — ${jobTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1a3c87;">Hi ${name},</h2>
        <p>Your application for <strong>${jobTitle}</strong> has a new update:</p>
        <div style="background:#eff6ff;border-left:4px solid #1a3c87;padding:16px;border-radius:8px;margin:16px 0;">
          <h3 style="margin:0;color:#1a3c87;">${label}</h3>
          ${note ? `<p style="margin:8px 0 0;color:#334155;">${note}</p>` : ''}
        </div>
        <a href="${PORTAL}" style="display:inline-block;background:#1a3c87;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View Full Status →</a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Navabharath Technologies · Mysore, India</p>
      </div>
    `,
  });
}

// ── HR notification when candidate applies ─────────────────────
async function sendHRNotification({ name, email, phone, jobTitle, resumeUrl, coverLetter }) {
  return resend.emails.send({
    from: FROM,
    to: HR_EMAIL,
    subject: `New Application — ${jobTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1a3c87;">New Job Application</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;font-weight:bold;width:140px;">Name</td><td style="padding:8px;">${name}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${email}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Phone</td><td style="padding:8px;">${phone || 'Not provided'}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:8px;font-weight:bold;">Role</td><td style="padding:8px;">${jobTitle}</td></tr>
        </table>
        ${coverLetter ? `<p><strong>Cover Letter:</strong></p><p style="white-space:pre-wrap;">${coverLetter}</p>` : ''}
        ${resumeUrl ? `<p><a href="${resumeUrl}" style="background:#1a3c87;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Download Resume →</a></p>` : ''}
      </div>
    `,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendApplicationConfirmation,
  sendStatusEmail,
  sendHRNotification,
};
