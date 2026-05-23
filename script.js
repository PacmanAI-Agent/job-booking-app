// ==== CONFIG – put your Airtable details here ====
const AIRTABLE_API_KEY = 'YOUR_AIRTABLE_API_KEY';
const BASE_ID       = 'appX0OtnSWt8JOKvh';
const TABLE_ID      = 'tblHkIbvRNOcx6lVQ';   // Fleet Management table

// ====================================================

const form = document.getElementById('bookingForm');
// Pull company name from URL query string (e.g. ?company=Acme) and store it
const urlParams = new URLSearchParams(window.location.search);
const companyName = urlParams.get('company') || '';
// Set hidden field value
const companyInput = document.getElementById('company');
if (companyInput) companyInput.value = companyName;
// Show on page
const companyDisplay = document.getElementById('companyDisplay');
if (companyDisplay) companyDisplay.textContent = companyName ? `Company: ${companyName}` : '';
const statusEl = document.getElementById('status');

// Auto‑fill today’s date
document.getElementById('date').valueAsDate = new Date();

form.addEventListener('submit', async e => {
  e.preventDefault();
  statusEl.textContent = 'Sending…';

  const formData = new FormData(form);
  const fields = {};

  // Simple scalar fields (including Company)
  ['Contact','Destination','Address','Description','Phone','Date','Company'].forEach(k => {
    const v = formData.get(k);
    if (v) fields[k] = v;
  });

  // Checkboxes
  fields.PickUp = formData.get('PickUp') ? 'Yes' : 'No';
  fields.DropOff = formData.get('DropOff') ? 'Yes' : 'No';

  // Attachments – upload each file then store URLs
  const attachments = formData.getAll('Attachments');
  if (attachments.length) {
    const uploaded = await Promise.all(attachments.map(uploadFile));
    fields.Attachments = uploaded.map(u => ({url:u}));
  }

  try {
    const resp = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({fields})
    });
    if (!resp.ok) throw new Error(`Airtable error ${resp.status}`);
    await resp.json();
    statusEl.textContent = '✅ Job booked!';
    form.reset();
    document.getElementById('date').valueAsDate = new Date();
  } catch (err) {
    console.error(err);
    statusEl.textContent = '❌ Failed – check console';
  }
});

// Helper – upload a file to Airtable's attachment endpoint
async function uploadFile(file) {
  const uploadResp = await fetch('https://api.airtable.com/v0/meta/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    body: file
  });
  if (!uploadResp.ok) throw new Error('Upload failed');
  const json = await uploadResp.json();
  return json.url; // direct URL to the stored file
}