function normalizeLead(lead = {}) {
  return {
    id: lead.id || '',
    buyer_name: lead.buyer_name || '',
    company_name: lead.company_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    destination_country: lead.destination_country || '',
    product: lead.product || lead.product_name || '',
    quantity: lead.quantity || '',
    incoterm: lead.incoterm || 'FOB',
    deadline: lead.deadline || '',
    notes: lead.notes || ''
  };
}

export async function sendLeadEmails(lead = {}) {
  const payload = normalizeLead(lead);
  try {
    const response = await fetch('/api/lead-email/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    return { ok: Boolean(result.ok), data: result, error: null };
  } catch (error) {
    console.error('[lead-email] request failed safely', {
      lead_id: payload.id || 'draft',
      message: error?.message || 'Unknown lead email request failure'
    });
    return { ok: false, data: null, error };
  }
}
