import { createClient } from '@supabase/supabase-js';

const demoTenantId = '11111111-1111-1111-1111-111111111111';

function env(name) {
  return process.env[name]?.trim() || '';
}

export function getSupabaseClient() {
  const url = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isMarketingCommand(text = '') {
  return /\b(promote|grow|boost|campaign|get\s+\d+\s+followers|increase\s+followers|social\s+media|run\s+ads?|digital\s+marketing|get\s+likes|grow\s+page)\b/i.test(text);
}

export function parseMarketingCommand(text = '') {
  const lower = text.toLowerCase();
  const platforms = ['instagram', 'linkedin', 'youtube', 'facebook', 'twitter'];
  const platform = platforms.find(p => lower.includes(p)) || 'Instagram';

  const goalTypes = ['followers', 'likes', 'reach', 'engagement', 'views'];
  const goalType = goalTypes.find(g => lower.includes(g)) || 'followers';

  const targetMatch = text.match(/(\d[\d,]*)\s*(?:followers?|likes?|reach|views?)/i);
  const targetValue = targetMatch ? parseInt(targetMatch[1].replace(/,/g, ''), 10) : 1000;

  const actions = ['promote', 'boost', 'grow', 'increase', 'run'];
  const action = actions.find(a => lower.includes(a)) || 'promote';

  const budgetMatch = text.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)/i);
  const budgetHint = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, ''), 10) : null;

  return { platform, goalType, targetValue, action, budgetHint, rawText: text };
}

export function estimateBudget(platform, targetValue) {
  // Research-verified CPF (cost per follower) benchmarks for Indian market
  const cpf = { instagram: 0.8, facebook: 0.5, linkedin: 3, youtube: 1.2 };
  const rate = cpf[platform?.toLowerCase()] || 1;
  const estimated = Math.ceil((targetValue || 1000) * rate);
  return Math.max(200, Math.min(estimated, 5000));
}

export async function getOrCreateWallet(client) {
  const { data } = await client.from('cfo_wallet').select('*').eq('tenant_id', demoTenantId).maybeSingle();
  if (data) return data;
  const seed = { tenant_id: demoTenantId, balance: 1000.00, auto_topup_threshold: 100.00, auto_topup_amount: 500.00, transactions: [] };
  const { data: created } = await client.from('cfo_wallet').insert(seed).select('*').maybeSingle();
  return created || { ...seed, id: 'local' };
}

export async function deductWallet(client, campaignId, amount, description) {
  const wallet = await getOrCreateWallet(client);
  const newBalance = Math.max(0, Number(wallet.balance) - Number(amount));
  const tx = { id: crypto.randomUUID(), type: 'spend', amount: -amount, description, campaign_id: campaignId, at: new Date().toISOString() };
  const transactions = [...(wallet.transactions || []), tx];
  await client.from('cfo_wallet').update({ balance: newBalance, transactions, updated_at: new Date().toISOString() }).eq('tenant_id', demoTenantId);
  return { newBalance, tx };
}

export async function topupWallet(client, amount, note = 'Manual top-up') {
  const wallet = await getOrCreateWallet(client);
  const newBalance = Number(wallet.balance) + Number(amount);
  const tx = { id: crypto.randomUUID(), type: 'topup', amount: +amount, description: note, at: new Date().toISOString() };
  const transactions = [...(wallet.transactions || []), tx];
  await client.from('cfo_wallet').update({ balance: newBalance, transactions, updated_at: new Date().toISOString() }).eq('tenant_id', demoTenantId);
  return { newBalance, tx };
}

export async function routeMarketingCommand(client, cmd, slackEvent) {
  const campaignId = crypto.randomUUID();
  const budgetRequested = cmd.budgetHint || estimateBudget(cmd.platform, cmd.targetValue);

  // Create campaign record
  const { data: campaign } = await client.from('cmo_campaigns').insert({
    id: campaignId,
    tenant_id: demoTenantId,
    platform: cmd.platform,
    goal_type: cmd.goalType,
    target_value: cmd.targetValue,
    action: cmd.action,
    status: 'pending_budget',
    budget_requested: budgetRequested,
    slack_channel: slackEvent.channel,
    slack_thread_ts: slackEvent.ts,
    slack_user_id: slackEvent.user,
    metadata: { raw_text: cmd.rawText }
  }).select('id,status').maybeSingle();

  // COO → CMO routing message
  await client.from('agent_messages').insert({
    tenant_id: demoTenantId,
    campaign_id: campaignId,
    from_agent: 'COO',
    to_agent: 'CMO',
    message_type: 'marketing_command',
    payload: { cmd, slack_channel: slackEvent.channel, slack_ts: slackEvent.ts },
    status: 'processed',
    processed_at: new Date().toISOString()
  });

  // CMO → CFO budget request
  await client.from('agent_messages').insert({
    tenant_id: demoTenantId,
    campaign_id: campaignId,
    from_agent: 'CMO',
    to_agent: 'CFO',
    message_type: 'budget_request',
    payload: { budget_requested: budgetRequested, platform: cmd.platform, goal_type: cmd.goalType, target_value: cmd.targetValue },
    status: 'pending'
  });

  const wallet = await getOrCreateWallet(client);
  const balance = Number(wallet.balance);
  const needsApproval = budgetRequested > 500;
  const hasBalance = balance >= budgetRequested;

  if (hasBalance && !needsApproval) {
    // Auto-approve: deduct and activate
    await deductWallet(client, campaignId, budgetRequested, `${cmd.platform} ${cmd.goalType} campaign`);
    await client.from('cmo_campaigns').update({ status: 'active', budget_allocated: budgetRequested, started_at: new Date().toISOString() }).eq('id', campaignId);
    await client.from('agent_messages').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('campaign_id', campaignId).eq('message_type', 'budget_request');
    return { campaignId, cmd, budgetRequested, walletStatus: 'auto_approved', balance: balance - budgetRequested };
  }

  // Needs founder approval — update campaign status
  await client.from('cmo_campaigns').update({ status: 'pending_founder_approval' }).eq('id', campaignId);
  return { campaignId, cmd, budgetRequested, walletStatus: 'pending_approval', balance, needsApproval, hasBalance };
}

export async function processBudgetDecision(client, campaignId, approved, topupAmount = 0) {
  if (topupAmount > 0) {
    await topupWallet(client, topupAmount, 'Founder top-up via Slack approval');
  }

  const { data: campaign } = await client.from('cmo_campaigns').select('*').eq('id', campaignId).maybeSingle();
  if (!campaign) return { ok: false, message: 'Campaign not found' };

  if (!approved) {
    await client.from('cmo_campaigns').update({ status: 'rejected' }).eq('id', campaignId);
    await client.from('agent_messages').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('campaign_id', campaignId).eq('message_type', 'budget_request');
    return { ok: true, status: 'rejected' };
  }

  const wallet = await getOrCreateWallet(client);
  const budget = Number(campaign.budget_requested);
  await deductWallet(client, campaignId, budget, `${campaign.platform} ${campaign.goal_type} campaign`);
  await client.from('cmo_campaigns').update({ status: 'active', budget_allocated: budget, started_at: new Date().toISOString() }).eq('id', campaignId);
  await client.from('agent_messages').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('campaign_id', campaignId).eq('message_type', 'budget_request');

  // CFO → CMO: budget approved
  await client.from('agent_messages').insert({
    tenant_id: demoTenantId,
    campaign_id: campaignId,
    from_agent: 'CFO',
    to_agent: 'CMO',
    message_type: 'budget_approved',
    payload: { budget_allocated: budget, wallet_balance: Number(wallet.balance) - budget },
    status: 'processed',
    processed_at: new Date().toISOString()
  });

  return { ok: true, status: 'active', budgetAllocated: budget };
}

export async function buildDailyBriefingPayload(client) {
  const [campaignsRes, walletRes, approvalsRes] = await Promise.all([
    client.from('cmo_campaigns').select('id,platform,goal_type,target_value,current_value,status,budget_spent,budget_allocated,started_at').in('status', ['active', 'paused', 'pending_founder_approval']).order('created_at', { ascending: false }).limit(10),
    client.from('cfo_wallet').select('balance,auto_topup_threshold,transactions').eq('tenant_id', demoTenantId).maybeSingle(),
    client.from('founder_approvals').select('title,amount,status').eq('status', 'Pending Approval').limit(5)
  ]);

  const campaigns = campaignsRes.data || [];
  const wallet = walletRes.data || { balance: 0, auto_topup_threshold: 100 };
  const approvals = approvalsRes.data || [];

  return { campaigns, wallet, approvals, generatedAt: new Date().toISOString() };
}

function getISTPeriod() {
  const now = new Date();
  const istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() >= 30 ? 0.5 : 0);
  if (istHour < 11) return 'Morning';
  if (istHour < 16) return 'Afternoon';
  return 'Evening';
}

export function buildBriefingSlackText(payload) {
  const { campaigns, wallet, approvals } = payload;
  const period = getISTPeriod();
  const active = campaigns.filter(c => c.status === 'active');
  const pending = campaigns.filter(c => c.status === 'pending_founder_approval');
  const balance = Number(wallet?.balance ?? 0);
  const lowBalance = balance < Number(wallet?.auto_topup_threshold ?? 100);

  const lines = [
    `*GOPU OS ${period} Briefing* | ${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`,
    ''
  ];

  if (active.length) {
    lines.push('*Active Campaigns*');
    active.forEach(c => {
      const pct = c.target_value > 0 ? Math.round((c.current_value / c.target_value) * 100) : 0;
      lines.push(`  - ${c.platform}: ${c.current_value}/${c.target_value} ${c.goal_type} (${pct}%) | Spent: ₹${c.budget_spent || 0}`);
    });
    lines.push('');
  } else {
    lines.push('No active campaigns running.');
    lines.push('');
  }

  if (pending.length) {
    lines.push(`*Pending Your Approval* (${pending.length})`);
    pending.forEach(c => lines.push(`  - ${c.platform} ${c.goal_type} campaign — budget ₹${c.budget_requested}`));
    lines.push('');
  }

  lines.push(`*CFO Creative Wallet*: ₹${balance.toFixed(0)}`);
  if (lowBalance) lines.push(`  ⚠️ Balance below ₹${wallet.auto_topup_threshold} — auto top-up will request your approval`);

  if (approvals.length) {
    lines.push('');
    lines.push(`*Pending Founder Approvals* (${approvals.length})`);
    approvals.forEach(a => lines.push(`  - ${a.title} (${a.amount})`));
  }

  return lines.join('\n');
}
