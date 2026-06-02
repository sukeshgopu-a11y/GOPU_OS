import { backendStatus, requireSupabaseSession } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';

function response(data, error = null) {
  return { ok: !error, data, error, backend: backendStatus };
}

function inr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function numberFromMetadata(metadata = {}, keys = []) {
  for (const key of keys) {
    const value = Number(metadata[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function normalizePaymentVaultRow(row = {}) {
  const metadata = row.masked_metadata || {};
  const vendor = row.vendor_name || 'Renewal';
  const amount = Number(row.amount || metadata.required_amount_inr || metadata.amount_inr || 0);
  const limitTotal = numberFromMetadata(metadata, ['limit_total', 'monthly_limit_inr', 'vendor_limit_inr']) || Math.max(amount, 1000);
  const limitUsed = numberFromMetadata(metadata, ['limit_used', 'used_amount_inr']) || amount;
  const expiryDate = metadata.expiry_date || metadata.renewal_date || metadata.next_renewal_date || row.created_at;

  return {
    payment: {
      id: row.id,
      vendor,
      category: row.category || metadata.service_type || 'Renewal',
      amountInr: amount,
      reason: row.payment_reason || metadata.renewal_reason || 'Renewal tracking',
      paymentStatus: row.payment_status,
      approvalStatus: row.approval_status,
      tokenizedReference: row.tokenized_reference,
      receiptStatus: row.receipt_url ? 'Receipt saved' : 'Awaiting receipt',
      riskLevel: metadata.risk_level || (row.approval_status === 'Pending Approval' ? 'High' : 'Medium'),
      renewalType: metadata.service_type || row.category || 'Renewal',
      limit_used: limitUsed,
      limit_total: limitTotal,
      usage_percentage: limitTotal > 0 ? Math.round((limitUsed / limitTotal) * 100) : 0,
      linkedWorkflows: ['Payment Vault'],
      raw: row
    },
    forecast: {
      id: `renewal-${row.id}`,
      vendor,
      title: `${vendor} ${metadata.service_type || row.category || 'renewal'}`,
      expectedDate: expiryDate,
      projectedAmount: inr(amount),
      forecastType: metadata.service_type || row.category || 'Renewal',
      status: row.payment_status || row.approval_status || 'Monitoring'
    }
  };
}

export async function getPaymentVaultRenewals(tenantId = demoTenantId) {
  const { client, error } = await requireSupabaseSession();
  if (error) return response({ payments: [], forecasts: [] }, null);

  const { data, error: queryError } = await client
    .from('payment_vault')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (queryError) return response({ payments: [], forecasts: [] }, queryError);

  const normalized = (data || []).map(normalizePaymentVaultRow);
  return response({
    payments: normalized.map((item) => item.payment),
    forecasts: normalized.map((item) => item.forecast),
    rows: data || []
  });
}
