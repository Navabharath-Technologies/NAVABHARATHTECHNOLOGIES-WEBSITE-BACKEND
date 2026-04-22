/**
 * ATS (Applicant Tracking System) Integration
 *
 * Replace the fetch logic below with the actual API of your HR tool:
 *   - Zoho Recruit: https://www.zoho.com/recruit/developer-guide/apiv2/
 *   - Freshteam:    https://developers.freshteam.com/api/#candidates
 *   - Custom ATS:   adjust endpoint and payload as needed
 *
 * Returns atsAppId on success, null on failure (graceful degradation).
 */
async function pushToATS({ jobTitle, candidateName, email, phone, resumeUrl, coverLetter, atsJobId }) {
  const ATS_API_URL = process.env.ATS_API_URL;
  const ATS_API_KEY = process.env.ATS_API_KEY;

  if (!ATS_API_URL || !ATS_API_KEY) {
    console.warn('⚠️  ATS integration not configured — skipping sync (set ATS_API_URL + ATS_API_KEY)');
    return null;
  }

  try {
    const response = await fetch(`${ATS_API_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ATS_API_KEY}`,
      },
      body: JSON.stringify({
        jobId:      atsJobId,
        candidate: {
          name:  candidateName,
          email,
          phone: phone || '',
        },
        resumeUrl,
        coverLetter: coverLetter || '',
      }),
      signal: AbortSignal.timeout(10_000), // 10-second timeout
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`ATS returned ${response.status}: ${body}`);
    }

    const data = await response.json();
    console.log(`✔ Application pushed to ATS — atsAppId: ${data.id}`);
    return data.id; // Save this as application.atsAppId

  } catch (err) {
    // Non-fatal: the application is already saved locally. ATS sync can be retried manually.
    console.error('❌ ATS push failed (non-fatal):', err.message);
    return null;
  }
}

module.exports = { pushToATS };
