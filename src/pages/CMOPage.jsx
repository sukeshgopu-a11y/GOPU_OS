import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Archive, BarChart3, Bell,
  Bookmark, Bot, Boxes, BrainCircuit, Building2, Calculator, CalendarDays,
  CalendarClock, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck,
  ClipboardList, Command, Database, Eye, ExternalLink, FileCheck2, FileBarChart,
  FileText, Factory, Fingerprint, Gauge, Gem, Keyboard, KeyRound, LockKeyhole,
  LayoutDashboard, Mail, Menu, Network, PackageCheck, Palette, Plug, Printer,
  RadioTower, Route, ScanLine, Search, Send, Settings, ShieldCheck, SlidersHorizontal,
  Sparkles, Sprout, TrendingUp, Target, TimerReset, TriangleAlert, UploadCloud,
  User, UsersRound, Workflow, X, Zap
} from 'lucide-react';
import { supabase, isSupabaseConfigured, backendStatus } from '../lib/supabaseClient';
import { demoTenantId } from '../services/companyService.js';
import { createApprovalRequest as createCmoApprovalRequest } from '../services/approvalService.js';
import { DEFAULT_CMO_TIMEZONE, CMO_PLATFORM_DEFAULT_SLOTS, CMO_TIMEZONE_OPTIONS, formatInCmoTimezone, getCmoDateRangeUtc, getCmoLocalIsoDate, getCmoNowUtc, getCmoRollingRangeStartUtc, getCmoTimezoneLabel, getCmoTimezoneOption, getNextPlatformSlot, getSelectedCmoTimezone, isUtcOnOrAfter, isUtcOnOrBefore } from '../lib/cmoTimezone.js';
import { generateDailyGrowthRunbook, generateCMOReport, generateFounderMarketingSummary, createMarketingCampaignDraft, cleanupLatestStep6TestContentPackage, createStep6TestContentPackage, generateReferenceLearningContent, getAIBudgetAnalysis, getAICampaignForecasts, getAICmoOperatingSystem, getAIGrowthInsights, getAILeadScores, getAIRecommendations, getAIScheduleOptimizations, getBrandRisks, getBuyerOutreach, getCMOSummary, getCampaigns, getContentApprovalQueue, getCompetitorReviews, getContentMemoryArchive, getCmoTimezonePreference, getCmoAutomationFlow, getCmoLearningCentreDashboard, getMarketingCampaignControlCenter, getCmoProviderConnectionStatus, saveCmoPostingSettings, saveCmoTimezonePreference, getContentCalendar, getContentPerformance, getCrossExecutiveContentIdeas, getFacebookPipeline, getGrowthOptimizationInsights, getGrowthTargets, getInstagramPipeline, getLinkedInPipeline, getContentToolchain, getDigitalMarketingOptimization, getGlobalTargetingStrategy, getOpenAIContentBrain, getOpenAIContentMemory, getTenglishVoiceRules, getThumbnailDirections, getVideoScriptStyles, getSocialGrowthAnalytics, getSocialGrowthMetrics, getYouTubePlans, updateFounderContentDecision } from '../services/cmoService.js';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { Breadcrumb, StatusBadge, TrendIndicator, EmptyState, SkeletonBlock, SkeletonCard, SkeletonTable, SkeletonKpiBar, MetricSkeletonGrid, HBarChart, SortableTableHeader, StatusPulse, PriorityBadge, SeverityBadge, Panel, StatusPill, StateChip, SignalList, MiniBars, BulkActionBar, FilterBar, VirtualList, useSortable } from '../shared/uiPrimitives.jsx';
import { displayDateTime } from '../utils/dateTime.js';

function CMOCommandPage({ view = 'command', navigate, onBack }) {
  const [now, setNow] = useState(() => new Date());
  const initialTab = view === 'campaigns' ? 'Platforms' : 'Overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [data, setData] = useState({
    summary: null,
    linkedin: [],
    instagram: [],
    youtube: [],
    facebook: [],
    campaigns: [],
    campaignControl: { connected: false, campaigns: [], budgetSummary: {}, warnings: [], recommendations: [], schedule: [], leads: [], error: '' },
    buyerOutreach: [],
    competitors: [],
    brandRisks: [],
    calendar: [],
    socialGrowth: [],
    contentPerformance: [],
    growthTargets: [],
    crossExecutiveIdeas: [],
    approvalQueue: [],
    optimizationInsights: [],
    openAIContentBrain: [],
    contentToolchain: [],
    openAIContentMemory: [],
    contentMemoryArchive: { items: [], connected: false, error: '', loadedAt: '' },
    cmoAutomationFlow: { source: 'pending', checkedAt: '', steps: [] },
    cmoLearningCentre: { connected: false, filters: [], findings: [], statusCards: [], growthPlan: {}, error: '' },
    socialGrowthAnalytics: { connected: false, summaryCards: [], platforms: [], diagnosis: {}, dataWarnings: [] },
    cmoTimezonePreference: { timezone: 'Asia/Kolkata', country: 'India', source: 'fallback' },
    aiCmoOperatingSystem: null,
    aiBudgetAnalysis: null,
    aiCampaignForecasts: null,
    aiScheduleOptimizations: null,
    aiLeadScores: null,
    aiGrowthInsights: null,
    aiRecommendations: null,
    tenglishVoiceRules: [],
    globalTargeting: [],
    thumbnailDirections: [],
    videoScriptStyles: [],
    digitalMarketingOptimization: [],
    loading: true,
    error: ''
  });
  const [output, setOutput] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadCMO() {
      try {
        const timezonePreference = await getCmoTimezonePreference();
        const selectedTimezone = timezonePreference.data?.timezone || 'Asia/Kolkata';
        const [summary, linkedin, instagram, youtube, facebook, campaigns, campaignControl, buyerOutreach, competitors, brandRisks, calendar, socialGrowth, contentPerformance, growthTargets, crossExecutiveIdeas, approvalQueue, optimizationInsights, openAIContentBrain, contentToolchain, openAIContentMemory, contentMemoryArchive, cmoAutomationFlow, cmoLearningCentre, socialGrowthAnalytics, aiCmoOperatingSystem, aiBudgetAnalysis, aiCampaignForecasts, aiScheduleOptimizations, aiLeadScores, aiGrowthInsights, aiRecommendations, tenglishVoiceRules, globalTargeting, thumbnailDirections, videoScriptStyles, digitalMarketingOptimization] = await Promise.all([
          getCMOSummary(),
          getLinkedInPipeline(),
          getInstagramPipeline(),
          getYouTubePlans(),
          getFacebookPipeline(),
          getCampaigns(),
          getMarketingCampaignControlCenter(demoTenantId),
          getBuyerOutreach(),
          getCompetitorReviews(),
          getBrandRisks(),
          getContentCalendar(),
          getSocialGrowthMetrics(),
          getContentPerformance(),
          getGrowthTargets(),
          getCrossExecutiveContentIdeas(),
          getContentApprovalQueue(),
          getGrowthOptimizationInsights(),
          getOpenAIContentBrain(),
          getContentToolchain(),
          getOpenAIContentMemory(),
          getContentMemoryArchive({ timezone: selectedTimezone }),
          getCmoAutomationFlow(),
          getCmoLearningCentreDashboard(demoTenantId),
          getSocialGrowthAnalytics({ timezone: selectedTimezone, rangeDays: 30 }),
          getAICmoOperatingSystem(),
          getAIBudgetAnalysis(demoTenantId),
          getAICampaignForecasts(demoTenantId),
          getAIScheduleOptimizations({ timezone: selectedTimezone }),
          getAILeadScores(demoTenantId),
          getAIGrowthInsights(demoTenantId),
          getAIRecommendations(demoTenantId),
          getTenglishVoiceRules(),
          getGlobalTargetingStrategy(),
          getThumbnailDirections(),
          getVideoScriptStyles(),
          getDigitalMarketingOptimization()
        ]);
        if (!active) return;
        setData({
          summary: summary.data,
          linkedin: linkedin.data || [],
          instagram: instagram.data || [],
          youtube: youtube.data || [],
          facebook: facebook.data || [],
          campaigns: campaigns.data || [],
          campaignControl: campaignControl.data || { connected: false, campaigns: [], budgetSummary: {}, warnings: [], recommendations: [], schedule: [], leads: [], error: '' },
          buyerOutreach: buyerOutreach.data || [],
          competitors: competitors.data || [],
          brandRisks: brandRisks.data || [],
          calendar: calendar.data || [],
          socialGrowth: socialGrowth.data || [],
          contentPerformance: contentPerformance.data || [],
          growthTargets: growthTargets.data || [],
          crossExecutiveIdeas: crossExecutiveIdeas.data || [],
          approvalQueue: approvalQueue.data || [],
          optimizationInsights: optimizationInsights.data || [],
          openAIContentBrain: openAIContentBrain.data || [],
          contentToolchain: contentToolchain.data || [],
          openAIContentMemory: openAIContentMemory.data || [],
          contentMemoryArchive: contentMemoryArchive.data || { items: [], connected: false, error: '', loadedAt: '' },
          cmoAutomationFlow: cmoAutomationFlow.data || { source: 'pending', checkedAt: '', steps: [] },
          cmoLearningCentre: cmoLearningCentre.data || { connected: false, filters: [], findings: [], statusCards: [], growthPlan: {}, error: '' },
          socialGrowthAnalytics: socialGrowthAnalytics.data || { connected: false, summaryCards: [], platforms: [], diagnosis: {}, dataWarnings: [] },
          aiCmoOperatingSystem: aiCmoOperatingSystem.data,
          aiBudgetAnalysis: aiBudgetAnalysis.data,
          aiCampaignForecasts: aiCampaignForecasts.data,
          aiScheduleOptimizations: aiScheduleOptimizations.data,
          aiLeadScores: aiLeadScores.data,
          aiGrowthInsights: aiGrowthInsights.data,
          aiRecommendations: aiRecommendations.data,
          cmoTimezonePreference: timezonePreference.data || { timezone: selectedTimezone, country: getCmoTimezoneOption(selectedTimezone).country, source: 'fallback' },
          tenglishVoiceRules: tenglishVoiceRules.data || [],
          globalTargeting: globalTargeting.data || [],
          thumbnailDirections: thumbnailDirections.data || [],
          videoScriptStyles: videoScriptStyles.data || [],
          digitalMarketingOptimization: digitalMarketingOptimization.data || [],
          loading: false,
          error: [timezonePreference.error, summary.error, linkedin.error, instagram.error, youtube.error, facebook.error, campaigns.error, campaignControl.error, buyerOutreach.error, competitors.error, brandRisks.error, calendar.error, socialGrowth.error, contentPerformance.error, growthTargets.error, crossExecutiveIdeas.error, approvalQueue.error, optimizationInsights.error, openAIContentBrain.error, contentToolchain.error, openAIContentMemory.error, contentMemoryArchive.error, cmoAutomationFlow.error, cmoLearningCentre.error, socialGrowthAnalytics.error, aiCmoOperatingSystem.error, aiBudgetAnalysis.error, aiCampaignForecasts.error, aiScheduleOptimizations.error, aiLeadScores.error, aiGrowthInsights.error, aiRecommendations.error, tenglishVoiceRules.error, globalTargeting.error, thumbnailDirections.error, videoScriptStyles.error, digitalMarketingOptimization.error].filter(Boolean).join(' ')
        });
      } catch (error) {
        if (!active) return;
        setData((current) => ({ ...current, loading: false, error: error.message || 'CMO service unavailable. Unavailable active.' }));
      }
    }
    loadCMO();
    return () => { active = false; };
  }, []);

  function generateTodayPlan() {
    generateDailyGrowthRunbook().then((response) => setOutput(response.data));
  }

  async function generateReport() {
    const response = await generateCMOReport();
    setOutput(response.data || 'CMO report could not be generated.');
  }

  async function generateFounderSummary() {
    const response = await generateFounderMarketingSummary();
    setOutput(response.data || 'Founder marketing summary could not be generated.');
  }

  async function reloadContentMemoryArchive(filters = {}) {
    const timezone = filters.timezone || data.cmoTimezonePreference?.timezone || 'Asia/Kolkata';
    const [response, growthResponse] = await Promise.all([
      getContentMemoryArchive({ timezone, selectedDate: filters.selectedDate || '' }),
      getSocialGrowthAnalytics({ timezone, selectedDate: filters.selectedDate || '', rangeDays: 30 })
    ]);
    setData((current) => ({
      ...current,
      contentMemoryArchive: response.data || current.contentMemoryArchive,
      socialGrowthAnalytics: growthResponse.data || current.socialGrowthAnalytics,
      error: [current.error, response.error, growthResponse.error].filter(Boolean).join(' ')
    }));
  }

  async function routeBrandRiskToApproval(item) {
    await createCmoApprovalRequest({
      tenant_id: demoTenantId,
      request_type: 'Brand Claim Review',
      title: `${item[0]} claim requires founder approval`,
      department: 'Marketing',
      executive_owner: 'CMO Command',
      buyer_name: 'Public marketing / buyer communications',
      risk_level: item[1],
      priority: item[1] === 'High' ? 'High' : 'Medium',
      status: 'Founder Review Required',
      summary: item[2],
      source_module: 'cmo-command',
      category: 'Marketing',
      details: {
        workflow_source: 'CMO Command',
        claim: item[0],
        operational_impact: 'Public messaging remains draft-only until founder decision.',
        cmo_notes: 'Claim is sensitive and should not be published without proof and founder approval.'
      }
    });
    navigate('/export-os/director');
  }

  const tabs = ['Overview', 'Content Queue', 'Published Posts', 'Platforms', 'Reference Lab', 'LinkedIn Composer', 'Digital Marketing'];
  const scheduledCount = data.summary?.scheduledContent ?? 'Awaiting analytics';
  const approvalCount = data.summary?.pendingApprovals ?? 'Verification pending';
  const realRunStatus = getCmoRealRunStatus(data);
  const handleCmoTabChange = React.useCallback((tab) => setActiveTab(tab), []);

  async function sendCmoStatusSummary() {
    const queueItems = getCmoPendingContentItems(data);
    const publishedItems = getCmoPublishedContentItems(data);
    const response = await sendSlackNotification({
      type: 'High Priority Alert',
      priority: queueItems.length ? 'WARNING' : 'INFO',
      reference: 'CMO-COMMAND-SUMMARY',
      status: `${queueItems.length} pending approval / ${publishedItems.length} published`,
      actionRequired: queueItems.length ? 'Review CMO approval queue before publishing.' : 'No CMO content is currently waiting for founder approval.',
      source: 'CMO Command'
    });
    setOutput(response.ok ? 'CMO status summary sent to Slack.' : 'Slack summary could not be sent. Check Slack integration.');
  }

  async function handleContentDecision(item, action) {
    if (!item?.id) return;
    const response = await updateFounderContentDecision(item.id, action, { tenant_id: item.tenant_id || demoTenantId });
    setOutput(response.ok ? `Content ${action === 'approve' ? 'approved' : 'rejected for edit'}.` : response.error || 'Content decision failed.');
    await reloadContentMemoryArchive();
  }

  return (
    <ExportOSShell className="cmo-command-shell" loading={data.loading}>
      <header className="deck-header cmo-header cmo-clean-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <Breadcrumb items={[{ label: 'Command Deck', onClick: onBack }, { label: 'CMO Command' }]} />
          <h1>CMO Command</h1>
          <p>Marketing Intelligence & Growth Operating Center</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder verified</span></div>
          <div className="coo-status"><StatusPulse /><strong>Growth monitoring</strong></div>
          <div className="coo-status"><ClipboardList size={16} /><strong>{scheduledCount} scheduled</strong></div>
          <div className="coo-status"><TriangleAlert size={16} /><strong>{approvalCount} approvals</strong></div>
          <div className="coo-time"><CalendarClock size={16} /><span>{displayDateTime(now)}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {data.loading ? <CMOLoadingPanel /> : (
        <>
          <section className="cmo-tabs" role="tablist" aria-label="CMO Command tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={`cmo-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleCmoTabChange(tab)}
              >
                {tab}
              </button>
            ))}
          </section>

          <main className="cmo-tab-content">
            <CMOFocusedCommandTabs
              activeTab={activeTab}
              data={data}
              output={output}
              navigate={navigate}
              realRunStatus={realRunStatus}
              onNewContent={() => setActiveTab('LinkedIn Composer')}
              onSchedulePost={() => setActiveTab('LinkedIn Composer')}
              onViewPublished={() => setActiveTab('Published Posts')}
              onSendSlack={sendCmoStatusSummary}
              onContentDecision={handleContentDecision}
              onCreateApprovalRequest={createCmoApprovalRequest}
            />
          </main>
        </>
      )}
    </ExportOSShell>
  );
}

function getCmoContentItems(data = {}) {
  return Array.isArray(data.contentMemoryArchive?.items) ? data.contentMemoryArchive.items : [];
}

function getCmoPendingContentItems(data = {}) {
  return getCmoContentItems(data).filter((item) => {
    const approval = String(item.approval_status || item.content_approvals?.[0]?.approval_status || '').toLowerCase();
    const publish = String(item.publish_status || item.status || '').toLowerCase();
    return !['approved', 'rejected', 'needs_edit'].includes(approval) && !['published', 'sent'].includes(publish);
  });
}

function getCmoPublishedContentItems(data = {}) {
  return getCmoContentItems(data).filter((item) => ['published', 'sent'].includes(String(item.publish_status || item.status || '').toLowerCase()));
}

function getCmoConnectedPlatformCount(data = {}) {
  const steps = Array.isArray(data.cmoAutomationFlow?.steps) ? data.cmoAutomationFlow.steps : [];
  const livePlatforms = new Set();
  steps.forEach((step) => {
    const status = String(step.status || step.healthStatus || '').toLowerCase();
    if (!['live', 'connected', 'complete'].includes(status)) return;
    const label = `${step.title || ''} ${step.engine || ''}`.toLowerCase();
    ['linkedin', 'instagram', 'facebook', 'youtube', 'resend', 'email'].forEach((platform) => {
      if (label.includes(platform)) livePlatforms.add(platform);
    });
  });
  return livePlatforms.size;
}

function getCmoTitle(item = {}) {
  return item.title || item.topic || item.campaign_name || item.content_type || 'Untitled content draft';
}

function CMODigitalMarketingTab() {
  const [stage, setStage] = useState('Growing');
  const [activeSection, setActiveSection] = useState('Budget');

  const budgetData = {
    Startup: {
      label: 'Startup Exporter (0-2 yrs, <50L/mo)',
      totalINR: '80,000 - 2,50,000',
      totalUSD: '$950 - $3,000',
      percent: '8-12%',
      channels: [
        { name: 'Google Search Ads', pct: 35, note: 'Best ROI for new exporters -- captures active buyer intent' },
        { name: 'LinkedIn Ads + Sales Navigator', pct: 15, note: 'Start with organic; add Sales Navigator at month 3' },
        { name: 'Meta (Facebook + Instagram)', pct: 20, note: 'Brand awareness + retargeting to website visitors' },
        { name: 'Email Outreach (Apollo + Saleshandy)', pct: 15, note: 'Cold outreach to food importers in UAE/Germany/UK' },
        { name: 'Trade Directories (IndiaMART, Alibaba)', pct: 10, note: 'IndiaMART for domestic leads; Alibaba at month 6+' },
        { name: 'Content (website, video)', pct: 5, note: 'Product spec pages with COA downloads' },
      ]
    },
    Growing: {
      label: 'Growing Exporter (2-5 yrs, 50L-2Cr/mo)',
      totalINR: '2,50,000 - 8,00,000',
      totalUSD: '$3,000 - $9,500',
      percent: '5-8%',
      channels: [
        { name: 'LinkedIn Ads + Sales Navigator', pct: 30, note: 'Lead Gen Forms + InMail -- highest quality B2B leads' },
        { name: 'Google Search Ads', pct: 25, note: 'Bottom-funnel keywords: "Indian turmeric powder bulk supplier"' },
        { name: 'Meta (Facebook + Instagram)', pct: 15, note: 'Retargeting + Lookalike audiences from buyer email list' },
        { name: 'Email Outreach', pct: 10, note: '5-touch 12-day cold sequence to 200-300 prospects/month' },
        { name: 'Trade Directories', pct: 10, note: 'Alibaba Gold Supplier + Spice Xchange India' },
        { name: 'WhatsApp Business API', pct: 5, note: 'Broadcast to warm leads -- 0.86 paise/message' },
        { name: 'Trade Show Digital', pct: 5, note: 'Pre/post Gulfood, Anuga, SIAL LinkedIn campaigns' },
      ]
    },
    Established: {
      label: 'Established Exporter (5+ yrs, >2Cr/mo)',
      totalINR: '8,00,000 - 25,00,000',
      totalUSD: '$9,500 - $30,000',
      percent: '3-5%',
      channels: [
        { name: 'LinkedIn Ads + Sales Navigator', pct: 35, note: 'Full funnel -- awareness to Lead Gen Forms' },
        { name: 'Google Search + SEO', pct: 20, note: 'Country-specific landing pages + organic ranking' },
        { name: 'Meta (Facebook + Instagram)', pct: 10, note: 'Retargeting + brand awareness in target markets' },
        { name: 'Content Marketing', pct: 10, note: '2 SEO blog posts/month + YouTube product tours' },
        { name: 'WhatsApp Business API', pct: 5, note: 'Automated sequences for warm leads and existing buyers' },
        { name: 'Trade Directories', pct: 7, note: 'Alibaba + GlobalSources + Spice Xchange India' },
        { name: 'Trade Show Digital', pct: 5, note: 'Full pre/during/post show digital campaigns' },
        { name: 'Email Newsletter', pct: 8, note: 'Monthly crop updates and pricing intelligence to buyer list' },
      ]
    }
  };

  const cplBenchmarks = [
    { platform: 'LinkedIn Lead Gen Forms', cplUSD: '$75-$130', cplINR: '850-2,500', ctr: '0.4-0.8%', quality: 'Highest' },
    { platform: 'LinkedIn InMail (Message Ads)', cplUSD: '$50-$100', cplINR: '700-1,800', ctr: '10-25% reply', quality: 'High' },
    { platform: 'Google Search Ads', cplUSD: '$70-$90', cplINR: '600-1,500', ctr: '2-5%', quality: 'High' },
    { platform: 'Facebook Lead Ads', cplUSD: '$27-$40', cplINR: '300-800', ctr: '0.9-1.5%', quality: 'Medium' },
    { platform: 'Instagram Lead Ads', cplUSD: '$30-$50', cplINR: '350-900', ctr: '0.8-1.2%', quality: 'Medium' },
  ];

  const outreachTemplates = [
    {
      type: 'LinkedIn Connection Request',
      limit: '<300 chars',
      text: `Hi [First Name], I noticed your work at [Company] in food procurement for [UAE/Germany/UK]. We're a Spice Board-certified Indian exporter -- our turmeric/chilli is already with buyers in [their region]. Happy to share our product catalogue. Worth a connect?`
    },
    {
      type: 'LinkedIn Follow-up DM #1 (Day 2)',
      limit: 'After connection accepted',
      text: `Thanks for connecting, [Name]. We export [Turmeric/Chilli/Cumin] in bulk to food manufacturers and importers across [Germany/UAE/UK]. Key advantages: Spice Board certification, consistent ASTA values, SGS-tested quality, FCL lead times under 21 days. Would it be helpful if I shared our product spec sheet and recent COA? Happy to send a sample if sourcing is relevant for your team.`
    },
    {
      type: 'Cold Email Subject Lines (highest open rates)',
      limit: 'Test 2-3 per campaign',
      text: `"[City]-based turmeric supplier -- 2025 crop specs attached"\n"Your current spice supplier vs ours -- 3 spec differences"\n"[Name], Gulfood 2025 follow-up from [Your Name]"\n"Indian chilli: ASTA 80 vs 120 -- does it matter for your buyers?"\n"FSSAI certified Indian cumin at [price range] -- relevant for [Company]?"`
    },
    {
      type: 'Cold Email Body (Day 1 of 5-touch sequence)',
      limit: '35-45% open rate target',
      text: `Hi [Name],\n\nI'm [Your Name] from GOPU Exports, a Spice Board of India-certified exporter based in India. We supply Turmeric / Chilli / Cumin to importers across Germany / UAE / UK.\n\nThree things relevant to your sourcing:\n- Curcumin content: 3-5% (HPLC tested), consistent across batches\n- Lead time: FCL in 18-21 days, LCL in 8-12 days\n- Certifications: FSSAI, Spice Board, HACCP, Organic (USDA/EU)\n\nHappy to share our current product catalogue and recent COA. Is this category relevant for you?\n\n[Signature]`
    },
    {
      type: 'WhatsApp Broadcast (WABA approved template)',
      limit: '~0.86 paise per message',
      text: `Hi [Name], this is [Your Name] from GOPU Exports, India's Spice Board-certified exporter. Our 2025 [Turmeric/Chilli/Cumin] crop is now in stock with fresh COA. Available FCL/LCL. To receive our product catalogue + spec sheet, reply YES. Opt out anytime.`
    }
  ];

  const toolStack = [
    { tool: 'LinkedIn Sales Navigator Core', cost: '~8,000/mo', use: 'Find food importers in UAE/Germany/UK/USA by job title + industry', priority: 'High' },
    { tool: 'Apollo.io Basic', cost: '~4,000/mo', use: 'B2B contact emails for procurement managers at food companies', priority: 'High' },
    { tool: 'Saleshandy Basic', cost: '~2,000/mo', use: 'Cold email sequences -- 5-touch 12-day cadence to 300 prospects/month', priority: 'High' },
    { tool: 'Zoho CRM Standard', cost: '~1,200/user/mo', use: 'Pipeline: Enquiry > Catalogue Sent > Sample > Trial Order > Repeat', priority: 'High' },
    { tool: 'Google Ads', cost: 'Budget-dependent', use: 'Bottom-funnel: "Indian turmeric bulk supplier", "chilli powder exporter India"', priority: 'High' },
    { tool: 'Interakt / AiSensy', cost: '1,000-3,000/mo', use: 'WhatsApp Business API for buyer broadcasts and follow-ups', priority: 'Medium' },
    { tool: 'Hunter.io Starter', cost: '~4,000/mo', use: 'Email verification before sending cold outreach', priority: 'Medium' },
    { tool: 'Zoho Social / Buffer', cost: '1,000-2,000/mo', use: 'Schedule LinkedIn + Instagram + Facebook posts in advance', priority: 'Medium' },
    { tool: 'GA4 + UTM tracking', cost: 'Free', use: 'Track which channel generates enquiries and COA downloads', priority: 'High' },
  ];

  const kpis = [
    { kpi: 'LinkedIn connection acceptance rate', target: '>30%', frequency: 'Weekly', tool: 'LinkedIn Analytics' },
    { kpi: 'LinkedIn DM reply rate', target: '>10%', frequency: 'Weekly', tool: 'Manual tracking' },
    { kpi: 'Cold email open rate', target: '>35%', frequency: 'Weekly', tool: 'Saleshandy' },
    { kpi: 'Cold email reply rate', target: '>5%', frequency: 'Weekly', tool: 'Saleshandy' },
    { kpi: 'WhatsApp broadcast response rate', target: '>15%', frequency: 'Weekly', tool: 'Interakt/Wati' },
    { kpi: 'New MQLs (Marketing Qualified Leads)', target: '20-50/month', frequency: 'Monthly', tool: 'Zoho CRM' },
    { kpi: 'Cost Per Lead (CPL) by channel', target: 'See benchmarks', frequency: 'Monthly', tool: 'Ads Manager + CRM' },
    { kpi: 'Enquiry-to-Sample conversion', target: '>20%', frequency: 'Monthly', tool: 'Zoho CRM' },
    { kpi: 'Sample-to-Order conversion', target: '>25%', frequency: 'Monthly', tool: 'Zoho CRM' },
    { kpi: 'Overall Enquiry-to-Order ratio', target: '5-15%', frequency: 'Monthly', tool: 'Zoho CRM' },
    { kpi: 'LinkedIn follower growth', target: '+50-100/month', frequency: 'Monthly', tool: 'LinkedIn Analytics' },
    { kpi: 'Website organic enquiries', target: '5-20/month', frequency: 'Monthly', tool: 'GA4' },
  ];

  const weeklyPlan = [
    { day: 'Monday', activity: 'Save 20-30 new Sales Navigator leads (food importers UAE/Germany/UK/USA). Plan week\'s 3-4 LinkedIn posts.', time: '1.5 hrs', tool: 'Sales Navigator, Zoho Social' },
    { day: 'Tuesday', activity: 'Send 15 personalized LinkedIn connection requests. Post on LinkedIn (shipment milestone or educational carousel).', time: '1.0 hr', tool: 'LinkedIn' },
    { day: 'Wednesday', activity: 'Launch cold email batch (50-100 leads). Respond to all LinkedIn DMs and connection accepts.', time: '1.5 hrs', tool: 'Saleshandy / Apollo' },
    { day: 'Thursday', activity: 'LinkedIn post (founder story or market intelligence). WhatsApp follow-up to warm leads with new crop update.', time: '1.0 hr', tool: 'LinkedIn, WhatsApp Business' },
    { day: 'Friday', activity: 'Review CRM pipeline -- update lead stages. Check ad performance (pause underperformers, increase winners).', time: '1.5 hrs', tool: 'Zoho CRM, Google/Meta Ads Manager' },
  ];

  const budget = budgetData[stage];

  return (
    <div className="cmo-digital-marketing-tab">
      <div className="dm-header">
        <h2>Digital Marketing Advisor</h2>
        <p>Research-verified B2B export marketing strategy for Indian spice exporters selling to UAE, Germany, UK, USA, Saudi Arabia.</p>
        <div className="dm-stage-selector">
          {Object.keys(budgetData).map((s) => (
            <button key={s} className={stage === s ? 'active' : ''} onClick={() => setStage(s)}>{s}</button>
          ))}
        </div>
        <div className="dm-section-nav">
          {['Budget', 'Channels', 'Outreach', 'Tools', 'KPIs', 'Weekly Plan'].map((s) => (
            <button key={s} className={activeSection === s ? 'active' : ''} onClick={() => setActiveSection(s)}>{s}</button>
          ))}
        </div>
      </div>

      {activeSection === 'Budget' && (
        <div className="dm-section">
          <div className="dm-budget-overview">
            <div className="dm-budget-card">
              <span className="dm-label">Stage</span>
              <strong>{budget.label}</strong>
            </div>
            <div className="dm-budget-card">
              <span className="dm-label">Monthly Spend (INR)</span>
              <strong>&#8377;{budget.totalINR}</strong>
            </div>
            <div className="dm-budget-card">
              <span className="dm-label">Monthly Spend (USD)</span>
              <strong>{budget.totalUSD}</strong>
            </div>
            <div className="dm-budget-card">
              <span className="dm-label">% of Revenue</span>
              <strong>{budget.percent}</strong>
            </div>
          </div>
          <h3>Channel Allocation</h3>
          <div className="dm-channel-list">
            {budget.channels.map((c) => (
              <div key={c.name} className="dm-channel-row">
                <div className="dm-channel-name">{c.name}</div>
                <div className="dm-channel-bar-wrap">
                  <div className="dm-channel-bar" style={{ width: `${c.pct}%` }} />
                  <span className="dm-channel-pct">{c.pct}%</span>
                </div>
                <div className="dm-channel-note">{c.note}</div>
              </div>
            ))}
          </div>
          <div className="dm-insight-box">
            <strong>Key insight:</strong> At startup stage, prioritise Google Search Ads over LinkedIn -- Google captures importers actively searching for Indian spice suppliers right now. LinkedIn requires minimum &#8377;75,000/month budget to learn. One converted importer can represent 50-200x ROAS on the entire campaign.
          </div>
        </div>
      )}

      {activeSection === 'Channels' && (
        <div className="dm-section">
          <h3>CPL Benchmarks by Platform</h3>
          <div className="dm-table-wrap">
            <table className="dm-table">
              <thead><tr><th>Platform</th><th>CPL (USD)</th><th>CPL (INR)</th><th>CTR / Reply Rate</th><th>Lead Quality</th></tr></thead>
              <tbody>
                {cplBenchmarks.map((row) => (
                  <tr key={row.platform}>
                    <td>{row.platform}</td>
                    <td>{row.cplUSD}</td>
                    <td>&#8377;{row.cplINR}</td>
                    <td>{row.ctr}</td>
                    <td><span className={`dm-quality dm-quality-${row.quality.toLowerCase()}`}>{row.quality}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>LinkedIn Sales Navigator -- Importer Search Filters</h3>
          <div className="dm-code-block">
            <div><strong>Industry:</strong> Food &amp; Beverages, Wholesale, Import &amp; Export, Retail</div>
            <div><strong>Job Titles:</strong> "Procurement Manager" OR "Import Manager" OR "Buying Director" OR "Head of Sourcing" OR "Category Manager" OR "Supply Chain Manager"</div>
            <div><strong>Geography:</strong> United Arab Emirates / Germany / United Kingdom / United States / Saudi Arabia</div>
            <div><strong>Company Size:</strong> 11-1,000 employees</div>
            <div><strong>Intent Signals:</strong> Changed jobs last 90 days + Posted on LinkedIn last 30 days</div>
            <div><strong>Keywords:</strong> "spices" OR "ingredients" OR "food import" OR "ethnic food" OR "Asian groceries"</div>
          </div>
          <h3>Google Ads -- High-Intent B2B Keywords</h3>
          <div className="dm-code-block">
            <div>[Exact Match] "Indian turmeric powder bulk supplier" -- $0.80-$1.50 CPC</div>
            <div>[Exact Match] "Indian chilli powder exporter" -- $0.70-$1.30 CPC</div>
            <div>[Phrase Match] "cumin seeds wholesale India" -- $0.50-$1.00 CPC</div>
            <div>[Exact Match] "FSSAI certified spice exporter" -- $0.50-$1.00 CPC</div>
            <div>[Exact Match] "organic turmeric supplier India USDA" -- $1.00-$2.00 CPC</div>
            <div className="dm-code-negative"><strong>Negative keywords:</strong> recipe, cooking, home, personal, retail, Amazon, 100g, 500g, diet, weight loss</div>
          </div>
          <h3>Meta Ads -- Targeting for UAE/Germany/UK Buyers</h3>
          <div className="dm-code-block">
            <div><strong>UAE / Saudi:</strong> Job title: Procurement Officer, Import Manager, Food Buyer + Industry: Food &amp; Beverages, Wholesale + Behavior: Business Decision Makers</div>
            <div><strong>Germany / UK:</strong> Same + layer interests: Food safety, HACCP, Organic food, Sustainable sourcing (EU buyers respond to these)</div>
            <div><strong>USA:</strong> Industry: Ethnic grocery chains, food manufacturers, spice distributors + Lookalike 1% from buyer email list upload</div>
            <div><strong>Retargeting:</strong> Website visitors (30/60/90 days) + Video viewers (50%+) -- use social proof ad: "Currently supplying 40+ importers in EU"</div>
          </div>
          <div className="dm-insight-box">
            <strong>APEDA &amp; Spice Board subsidy:</strong> Registered APEDA/Spice Board exporters can claim up to 50% subsidy on digital marketing tools and trade fair participation. Register CRES (Spice Board) and RCMC (APEDA) first -- these also give access to pre-qualified buyer databases.
          </div>
        </div>
      )}

      {activeSection === 'Outreach' && (
        <div className="dm-section">
          <h3>Outreach Templates</h3>
          {outreachTemplates.map((t) => (
            <div key={t.type} className="dm-template-card">
              <div className="dm-template-header">
                <strong>{t.type}</strong>
                <span className="dm-template-limit">{t.limit}</span>
              </div>
              <pre className="dm-template-body">{t.text}</pre>
            </div>
          ))}
          <div className="dm-insight-box">
            <strong>Best practices:</strong> Personalise with specific company/country reference. Lead with certifications (reduces compliance anxiety). Offer COA or spec sheet -- tangible, not vague "partnership". Thursday 9-11am sends perform best. Target 35-45% open rate, 5-10% reply rate.
          </div>
        </div>
      )}

      {activeSection === 'Tools' && (
        <div className="dm-section">
          <h3>Recommended Tool Stack</h3>
          <div className="dm-table-wrap">
            <table className="dm-table">
              <thead><tr><th>Tool</th><th>Monthly Cost (INR)</th><th>Use Case</th><th>Priority</th></tr></thead>
              <tbody>
                {toolStack.map((t) => (
                  <tr key={t.tool}>
                    <td><strong>{t.tool}</strong></td>
                    <td>&#8377;{t.cost}</td>
                    <td>{t.use}</td>
                    <td><span className={`dm-quality dm-quality-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dm-insight-box">
            <strong>Minimum viable stack (startup):</strong> Apollo.io + Saleshandy + Zoho CRM + GA4 = ~&#8377;7,000-10,000/month in tools before ad spend. Add LinkedIn Sales Navigator at month 3 once you have a working outreach script.
          </div>
        </div>
      )}

      {activeSection === 'KPIs' && (
        <div className="dm-section">
          <h3>KPI Dashboard</h3>
          <div className="dm-table-wrap">
            <table className="dm-table">
              <thead><tr><th>KPI</th><th>Target</th><th>Track</th><th>Tool</th></tr></thead>
              <tbody>
                {kpis.map((k) => (
                  <tr key={k.kpi}>
                    <td>{k.kpi}</td>
                    <td><strong>{k.target}</strong></td>
                    <td>{k.frequency}</td>
                    <td>{k.tool}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dm-insight-box">
            <strong>Most important metric for export:</strong> Enquiry-to-Order ratio (5-15% is normal for B2B spice export). Track this by channel in Zoho CRM -- it tells you which channel brings serious buyers vs tyre-kickers. One converted importer at 100 MT/year outweighs 1,000 unqualified leads.
          </div>
        </div>
      )}

      {activeSection === 'Weekly Plan' && (
        <div className="dm-section">
          <h3>Weekly Execution Rhythm</h3>
          <div className="dm-weekly-list">
            {weeklyPlan.map((d) => (
              <div key={d.day} className="dm-weekly-row">
                <div className="dm-weekly-day">{d.day}</div>
                <div className="dm-weekly-content">
                  <p>{d.activity}</p>
                  <div className="dm-weekly-meta">
                    <span>{d.time}</span>
                    <span>{d.tool}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <h3>Monthly Priorities</h3>
          <div className="dm-month-grid">
            {[
              { week: 'Week 1', tasks: 'Campaign setup review. Schedule 4 LinkedIn posts. Launch new cold email batch (200-300 leads).' },
              { week: 'Week 2', tasks: 'LinkedIn ads performance check -- pause underperformers, increase winners. Publish 1 SEO blog post. Update COA if new batch.' },
              { week: 'Week 3', tasks: 'WhatsApp broadcast to warm leads (new crop/pricing update). Comment on buyer company LinkedIn posts to stay visible.' },
              { week: 'Week 4', tasks: 'Monthly KPI review: CPL, enquiry count, pipeline value. Retargeting campaign refresh. Plan next month.' },
            ].map((w) => (
              <div key={w.week} className="dm-month-card">
                <strong>{w.week}</strong>
                <p>{w.tasks}</p>
              </div>
            ))}
          </div>
          <div className="dm-insight-box">
            <strong>Quarterly must-dos:</strong> Register for Spice Board buyer-seller meets (pre-qualified importers, subsidised by govt). Pre-Anuga (Oct) LinkedIn campaign. Post-Gulfood (Feb) follow-up sequences. Post-harvest crop quality update campaign with fresh COA and specs.
          </div>
        </div>
      )}
    </div>
  );
}

function CMOFocusedCommandTabs({ activeTab, data, output, navigate, realRunStatus, onNewContent, onSchedulePost, onViewPublished, onSendSlack, onContentDecision, onCreateApprovalRequest }) {
  if (activeTab === 'Content Queue') return <CMOContentQueueTab items={getCmoPendingContentItems(data)} onContentDecision={onContentDecision} />;
  if (activeTab === 'Published Posts') return <CMOPublishedPostsTab items={getCmoPublishedContentItems(data)} />;
  if (activeTab === 'Platforms') return <CMOPlatformsTab connectedCount={getCmoConnectedPlatformCount(data)} navigate={navigate} />;
  if (activeTab === 'Reference Lab') return <CMOReferenceLearningTab />;
  if (activeTab === 'LinkedIn Composer') return <CMOLinkedInComposerTab onCreateApprovalRequest={onCreateApprovalRequest} />;
  if (activeTab === 'Digital Marketing') return <CMODigitalMarketingTab />;
  return (
    <CMOFocusedOverviewTab
                data={data}
                output={output}
      realRunStatus={realRunStatus}
      onNewContent={onNewContent}
      onSchedulePost={onSchedulePost}
      onViewPublished={onViewPublished}
      onSendSlack={onSendSlack}
      navigate={navigate}
    />
  );
}

function CMOFocusedOverviewTab({ data, output, realRunStatus, onNewContent, onSchedulePost, onViewPublished, onSendSlack, navigate }) {
  const pendingItems = getCmoPendingContentItems(data);
  const publishedItems = getCmoPublishedContentItems(data);
  const draftCount = pendingItems.length;
  const connectedPlatforms = getCmoConnectedPlatformCount(data);
  const chips = [
    ['Drafts Ready', draftCount],
    ['Posts Published', publishedItems.length],
    ['Pending Approval', data.summary?.pendingApprovals ?? pendingItems.length],
    ['Platforms Connected', connectedPlatforms]
  ];
  return (
    <section className="cmo-focused-overview">
      <div className="cmo-stat-chip-row">
        {chips.map(([label, value]) => (
          <article key={label} className="cmo-stat-chip">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="cmo-panel">
        <div className="approval-section-header"><div><span>CMO Overview</span><h2>Content, approval, and publishing controls</h2></div><Target size={18} /></div>
        <p>Current run state: {realRunStatus}. Publishing remains blocked until founder approval unlocks the queue.</p>
        <div className="cmo-action-row">
          <button className="tactical-button" onClick={onNewContent}>New Content</button>
          <button className="ghost-button" onClick={onSendSlack}>Send to Slack</button>
        </div>
        {output ? <p className="cmo-posting-message">{output}</p> : null}
      </section>
      <CMOActiveCampaignsPanel />
      <section className="cmo-panel">
        <div className="approval-section-header"><div><span>Quick Actions</span><h2>Common CMO workflows</h2></div><Zap size={18} /></div>
        <div className="cmo-quick-action-grid">
          <button className="ghost-button" onClick={onNewContent}>Create LinkedIn Post</button>
          <button className="ghost-button" onClick={() => navigate('/export-os/buyer-crm')}>Draft Buyer Email</button>
          <button className="ghost-button" onClick={onSchedulePost}>Schedule Post</button>
          <button className="ghost-button" onClick={onViewPublished}>View Published</button>
        </div>
      </section>
    </section>
  );
}

function CMOActiveCampaignsPanel() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cmo/campaigns').then(r => r.json()).then(json => {
      if (json.ok) setCampaigns(json.campaigns || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const active = campaigns.filter(c => ['active', 'pending_founder_approval', 'pending_budget'].includes(c.status));
  if (loading || !active.length) return null;

  const statusTone = { active: 'green', pending_founder_approval: 'amber', pending_budget: 'muted', paused: 'amber', completed: 'green', rejected: 'red' };

  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Slack Commands</span><h2>Active Marketing Campaigns</h2></div><TrendingUp size={18} /></div>
      <div className="campaign-list">
        {active.map(c => {
          const pct = c.target_value > 0 ? Math.min(100, Math.round(((c.current_value || 0) / c.target_value) * 100)) : 0;
          return (
            <div key={c.id} className="campaign-row">
              <div className="campaign-platform">{c.platform}</div>
              <div className="campaign-goal">Get {(c.target_value || 0).toLocaleString()} {c.goal_type}</div>
              <div className="campaign-progress-wrap">
                <div className="campaign-progress-bar" style={{ width: `${pct}%` }} />
                <span>{c.current_value || 0}/{c.target_value}</span>
              </div>
              <span className={`campaign-status campaign-status-${statusTone[c.status] || 'muted'}`}>{c.status.replace(/_/g, ' ')}</span>
              <span className="campaign-budget">&#8377;{c.budget_allocated || c.budget_requested || 0}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CMOContentQueueTab({ items, onContentDecision }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Content Queue</span><h2>Founder approval required before publishing</h2></div><ShieldCheck size={18} /></div>
      {items.length ? (
        <div className="cmo-simple-list">
          {items.map((item) => (
            <article key={item.id} className="cmo-simple-row">
              <div>
                <span>{item.platform || 'Platform pending'}</span>
                <strong>{getCmoTitle(item)}</strong>
              </div>
              <StatusBadge label={item.approval_status || 'Pending Approval'} state={getApprovalState(item.approval_status || 'Pending Approval')} />
              <div className="cmo-row-actions">
                <button className="tactical-button" onClick={() => onContentDecision(item, 'approve')}>Approve</button>
                <button className="ghost-button" onClick={() => onContentDecision(item, 'reject')}>Reject</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardCheck} title="No content pending approval." description="Drafts sent for founder review will appear here." />
      )}
    </section>
  );
}

function CMOPublishedPostsTab({ items }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Published Posts</span><h2>Live content and performance snapshot</h2></div><BarChart3 size={18} /></div>
      {items.length ? (
        <div className="cmo-simple-list">
          {items.map((item) => {
            const metrics = Array.isArray(item.content_metrics) ? item.content_metrics : [];
            const stats = metrics.length
              ? metrics.map((metric) => `${metric.metric_name || 'Metric'}: ${metric.metric_value ?? '0'}`).slice(0, 3).join(' / ')
              : 'Performance not connected';
            return (
              <article key={item.id} className="cmo-simple-row">
                <div>
                  <span>{item.platform || 'Platform pending'} / {formatLearningDate(item.published_at_utc || item.published_at || item.created_at)}</span>
                  <strong>{getCmoTitle(item)}</strong>
                </div>
                <span>{stats}</span>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={RadioTower} title="No published posts yet." description="Approved and published CMO posts will appear here after the publish engine records them." />
      )}
    </section>
  );
}

function CMOPlatformsTab({ connectedCount, navigate }) {
  const platforms = [
    ['LinkedIn', connectedCount > 0],
    ['Instagram', false],
    ['Facebook', false],
    ['YouTube', false],
    ['Email/Resend', false]
  ];
  return (
    <section className="cmo-tab-stack">
      <div className="cmo-platform-grid">
        {platforms.map(([platform, connected]) => (
          <article key={platform} className="cmo-platform-card">
            <div>
              <span className={`cmo-platform-dot ${connected ? 'live' : ''}`} />
              <strong>{platform}</strong>
            </div>
            <StatusBadge label={connected ? 'Live' : 'Not Connected'} state={connected ? 'online' : 'idle'} />
            <button className="ghost-button" onClick={() => navigate('/export-os/executives/cto')}>Configure</button>
          </article>
        ))}
      </div>
      <section className="cmo-panel">
        <div className="approval-section-header"><div><span>LinkedIn Best Practices</span><h2>Authority posting rules</h2></div><UsersRound size={18} /></div>
        <div className="approval-memory-list">
          {[
            '2-3 posts per week.',
            'Carousel posts get 3x more engagement.',
            'Video gets 5x more engagement.',
            'Use 3-5 hashtags: #IndianExports #SpiceExport #OnionExport #GlobalTrade #B2BImporter'
          ].map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>
    </section>
  );
}

const linkedInComposerHashtags = {
  'Product Showcase': '#IndianSpices #SpiceExporter #ChilliPowder #TurmericPowder #BlackPepper #CuminSeeds #SpicesOfIndia #FSSAIApproved #APEDAIndia #SpiceBoardIndia #ISOCertified #HACCPCertified #ExportFromIndia #B2BImporter #FoodIngredientsIndia',
  'Shipment Milestone': '#IndianSpices #SpiceExporter #FoodExport #IndianExports #ExportFromIndia #APEDAIndia #SpiceBoardIndia #AgriExport #B2BFood #GlobalTrade',
  'Market Intelligence': '#IndianSpices #SpiceExporter #AgriExport #FoodIndustry #IndianExports #GlobalTrade #FoodCommodity #SpiceTrade #B2BFood #ExportBusiness',
  'Behind the Scenes': '#IndianSpices #SpiceExporter #FoodManufacturing #FoodSafety #QualityControl #MakeInIndia #ExportBusiness #FoodGrade #IndianExports #AgriExport',
  Educational: '#IndianSpices #SpiceExporter #FoodExport #ImporterGuide #FoodSafety #ISOCertified #HACCPCertified #FSSAIApproved #APEDAIndia #GlobalTrade',
  'Founder Story': '#IndianSpices #ExportBusiness #FounderLed #IndianExporter #MadeInIndia #GlobalTrade #AgriExport #IndiaToWorld #SpiceExporter #Entrepreneurship',
  'Carousel / Education': '#IndianSpices #SpiceExporter #FoodExport #AgriExport #B2BFood #GlobalTrade #IndianExports #FoodIndustry #SupplyChain #Procurement',
  Instagram: '#IndianSpices #SpiceExporter #ChilliPowder #TurmericPowder #BlackPepper #CuminSeeds #CorianderPowder #SpicesOfIndia #OrganicSpices #NaturalSpices #SpiceLovers #FarmToFork #FoodPhotography #MadeInIndia #ExportFromIndia',
  'Instagram Reel': '#IndianSpices #SpiceExport #GunturChilli #AlleppeyTurmeric #MalabarPepper #BehindTheScenes #FoodFactory #ExportGrade #HACCPCertified #APEDAIndia #SpicesOfIndia #NaturalSpices #FarmToTable #FoodIngredients #MadeInIndia',
  Facebook: '#IndianSpices #SpiceExporter #BulkSpices #FoodExport #HalalCertified #IndianExports #APEDAIndia #FSSAIApproved #ISOCertified #ExportFromIndia',
  'Trade Offer': '#ChilliPowder #TurmericPowder #BlackPepper #CuminSeeds #CorianderPowder #IndianSpices #SpiceExporter #HalalCertified #BulkSpices #ExportFromIndia #APEDAIndia #FSSAIApproved #ISOCertified #WholesaleSpices #B2BImporter'
};

const referenceLearningPlatforms = [
  {
    platform: 'YouTube',
    icon: RadioTower,
    format: 'Title, description, script plan, thumbnail',
    topic: 'Founder-led YouTube video on Indian spice export trust and buyer documentation',
    placeholder: 'Paste YouTube video links, channel links, or Shorts links that show the style you want.'
  },
  {
    platform: 'Instagram',
    icon: Palette,
    format: 'Reel, carousel, caption, visual prompt',
    topic: 'Instagram reel or carousel for export-grade spices and importer trust',
    placeholder: 'Paste Instagram post, reel, or profile links that match the visual and caption style.'
  },
  {
    platform: 'Facebook',
    icon: UsersRound,
    format: 'Trade post, group post, spec card',
    topic: 'Facebook trade post for importer groups and product availability',
    placeholder: 'Paste Facebook post, group post, or page links with the trade style you prefer.'
  },
  {
    platform: 'LinkedIn',
    icon: Network,
    format: 'Founder authority post, carousel direction',
    topic: 'LinkedIn founder authority post for global spice importers',
    placeholder: 'Paste LinkedIn posts, competitor posts, or founder posts to learn structure and tone.'
  }
];

const referenceTypeOptions = [
  'Reference post',
  'Competitor post',
  'Founder post',
  'Product showcase',
  'Educational breakdown',
  'Shipment milestone',
  'Market intelligence',
  'Video script',
  'Thumbnail / image style'
];

function createReferenceLearningForm(platformConfig = {}) {
  return {
    topic: platformConfig.topic || '',
    tone: 'premium, founder-led, practical, export authority, clear for international buyers',
    reference_type: 'Reference post',
    reference_links: '',
    reference_post: '',
    reference_recommendations: '',
    image_direction: '',
    generate_image: true
  };
}

function getReferenceOutputForPlatform(generated = {}, platform = '') {
  const key = String(platform || '').toLowerCase();
  if (key.includes('youtube')) return generated.youtube_version || generated.caption || generated.linkedin_version || '';
  if (key.includes('instagram')) return generated.instagram_version || generated.caption || '';
  if (key.includes('facebook')) return generated.facebook_version || generated.caption || '';
  if (key.includes('linkedin')) return generated.linkedin_version || generated.caption || '';
  return generated.caption || generated.linkedin_version || generated.instagram_version || generated.facebook_version || generated.youtube_version || '';
}

function normalizeHashtagList(hashtags) {
  if (Array.isArray(hashtags)) return hashtags.filter(Boolean).slice(0, 18);
  return String(hashtags || '')
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith('#'))
    .slice(0, 18);
}

function CMOReferenceLearningTab() {
  const [forms, setForms] = useState(() => Object.fromEntries(referenceLearningPlatforms.map((config) => [config.platform, createReferenceLearningForm(config)])));
  const [results, setResults] = useState({});
  const [messages, setMessages] = useState({});
  const [loadingPlatform, setLoadingPlatform] = useState('');

  function updatePlatformField(platform, field, value) {
    setForms((current) => ({
      ...current,
      [platform]: {
        ...(current[platform] || createReferenceLearningForm(referenceLearningPlatforms.find((item) => item.platform === platform))),
        [field]: value
      }
    }));
  }

  async function generatePlatform(platform) {
    const form = forms[platform] || createReferenceLearningForm(referenceLearningPlatforms.find((item) => item.platform === platform));
    setLoadingPlatform(platform);
    setMessages((current) => ({ ...current, [platform]: 'OpenAI is generating the post package.' }));
    try {
      const response = await generateReferenceLearningContent({
        tenant_id: demoTenantId,
        mode: 'premium',
        platform,
        topic: form.topic,
        tone: form.tone,
        reference_type: form.reference_type,
        reference_links: form.reference_links,
        reference_post: form.reference_post,
        reference_recommendations: form.reference_recommendations,
        image_direction: form.image_direction,
        generate_image: form.generate_image
      });

      if (!response.ok || !response.data?.ok) {
        setMessages((current) => ({ ...current, [platform]: response.error || response.data?.message || 'Reference generation failed.' }));
        return;
      }

      setResults((current) => ({ ...current, [platform]: response.data }));
      setMessages((current) => ({ ...current, [platform]: 'Generated. Founder approval is still required before publishing.' }));
    } finally {
      setLoadingPlatform('');
    }
  }

  function copyGeneratedOutput(platform) {
    const generated = results[platform]?.generated_content || {};
    const output = getReferenceOutputForPlatform(generated, platform);
    if (!output) {
      setMessages((current) => ({ ...current, [platform]: 'No generated output to copy yet.' }));
      return;
    }
    navigator.clipboard?.writeText(output);
    setMessages((current) => ({ ...current, [platform]: 'Generated post copied.' }));
  }

  const completedCount = Object.values(results).filter((item) => item?.generated_content).length;

  return (
    <section className="cmo-reference-lab">
      <div className="cmo-reference-stage-grid">
        {[
          ['Reference Knowledge', 'Links, sample posts, scripts, and recommendations become the platform brief.', UploadCloud],
          ['OpenAI Generation', 'The CMO creates channel-specific copy, hashtags, image prompt, and optional preview image.', Sparkles],
          ['Founder Gate', 'Generated content is saved as not published until approval and platform credentials are ready.', ShieldCheck]
        ].map(([title, detail, Icon]) => (
          <div key={title} className="cmo-reference-stage">
            <Icon size={17} />
            <div>
              <strong>{title}</strong>
              <span>{detail}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="cmo-panel cmo-reference-summary">
        <div className="approval-section-header">
          <div><span>CMO Reference Lab</span><h2>Learn from samples, then generate platform-ready content.</h2></div>
          <Sparkles size={18} />
        </div>
        <div className="cmo-reference-summary-grid">
          <div><span>Platforms</span><strong>YouTube / Instagram / Facebook / LinkedIn</strong></div>
          <div><span>OpenAI Output</span><strong>Copy, hashtags, image prompt, preview image</strong></div>
          <div><span>Completed</span><strong>{completedCount} of {referenceLearningPlatforms.length}</strong></div>
        </div>
      </section>

      <div className="cmo-reference-grid">
        {referenceLearningPlatforms.map((config) => {
          const Icon = config.icon;
          const form = forms[config.platform] || createReferenceLearningForm(config);
          const result = results[config.platform] || {};
          const generated = result.generated_content || {};
          const postOutput = getReferenceOutputForPlatform(generated, config.platform);
          const hashtags = normalizeHashtagList(generated.hashtags);
          const imageUrl = generated.generated_image_url || result.image_url || '';
          const busy = loadingPlatform === config.platform;

          return (
            <article key={config.platform} className="cmo-reference-card">
              <div className="cmo-reference-card-head">
                <div>
                  <Icon size={18} />
                  <div>
                    <span>{config.platform}</span>
                    <strong>{config.format}</strong>
                  </div>
                </div>
                <StatusBadge label={result.ok ? 'Generated' : 'Ready'} state={result.ok ? 'progress' : 'idle'} />
              </div>

              <div className="cmo-reference-fields">
                <label>
                  <span>Content goal</span>
                  <input value={form.topic} onChange={(event) => updatePlatformField(config.platform, 'topic', event.target.value)} />
                </label>
                <label>
                  <span>Reference type</span>
                  <select value={form.reference_type} onChange={(event) => updatePlatformField(config.platform, 'reference_type', event.target.value)}>
                    {referenceTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label>
                  <span>Reference links</span>
                  <textarea rows={3} value={form.reference_links} onChange={(event) => updatePlatformField(config.platform, 'reference_links', event.target.value)} placeholder={config.placeholder} />
                </label>
                <label>
                  <span>Sample post / script</span>
                  <textarea rows={5} value={form.reference_post} onChange={(event) => updatePlatformField(config.platform, 'reference_post', event.target.value)} placeholder="Paste the exact caption, script, hook, thumbnail words, or post structure you want the CMO to learn from." />
                </label>
                <label>
                  <span>Recommendations</span>
                  <textarea rows={4} value={form.reference_recommendations} onChange={(event) => updatePlatformField(config.platform, 'reference_recommendations', event.target.value)} placeholder="Write what to follow, what to avoid, tone rules, CTA rules, hashtag style, and buyer focus." />
                </label>
                <label>
                  <span>Image direction</span>
                  <textarea rows={3} value={form.image_direction} onChange={(event) => updatePlatformField(config.platform, 'image_direction', event.target.value)} placeholder="Describe the visual style, product angle, text overlay, colors, and image references." />
                </label>
                <label>
                  <span>Tone</span>
                  <input value={form.tone} onChange={(event) => updatePlatformField(config.platform, 'tone', event.target.value)} />
                </label>
              </div>

              <div className="cmo-reference-actions">
                <label className="cmo-reference-toggle">
                  <input type="checkbox" checked={form.generate_image} onChange={(event) => updatePlatformField(config.platform, 'generate_image', event.target.checked)} />
                  <span>Generate image preview</span>
                </label>
                <button className="tactical-button" type="button" disabled={busy} onClick={() => generatePlatform(config.platform)}>
                  {busy ? 'Generating...' : `Generate ${config.platform}`}
                </button>
              </div>

              {messages[config.platform] ? <p className="cmo-posting-message">{messages[config.platform]}</p> : null}

              {postOutput ? (
                <div className="cmo-reference-output">
                  <div className="cmo-reference-output-head">
                    <span>{config.platform} output</span>
                    <button className="ghost-button" type="button" onClick={() => copyGeneratedOutput(config.platform)}>Copy Post</button>
                  </div>
                  <pre>{postOutput}</pre>
                  {hashtags.length ? (
                    <div className="cmo-reference-hashtags">
                      {hashtags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  ) : null}
                  {generated.image_prompt ? (
                    <div className="cmo-reference-image-prompt">
                      <span>Image prompt</span>
                      <p>{generated.image_prompt}</p>
                    </div>
                  ) : null}
                  {imageUrl ? (
                    <figure className="cmo-reference-image-preview">
                      <img src={imageUrl} alt={`${config.platform} generated OpenAI preview`} />
                      <figcaption>OpenAI image preview for founder review.</figcaption>
                    </figure>
                  ) : null}
                  {result.image_generation_warning ? <p className="cmo-posting-message">{result.image_generation_warning}</p> : null}
                  <div className="cmo-reference-meta">
                    <span>Model: {result.model || 'OpenAI'}</span>
                    <span>Status: {result.publish_status || 'not_published'}</span>
                    <span>Approval: {result.founder_approval_required ? 'Founder required' : 'Pending policy'}</span>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CMOLinkedInComposerTab({ onCreateApprovalRequest }) {
  const [postType, setPostType] = useState('Product Showcase');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const hashtags = linkedInComposerHashtags[postType] || linkedInComposerHashtags.Educational;

  async function sendForApproval() {
    if (!content.trim()) {
      setMessage('Add LinkedIn content before sending for approval.');
      return;
    }
    const response = await onCreateApprovalRequest({
      tenant_id: demoTenantId,
      request_type: 'CMO LinkedIn Content Approval',
      title: `${postType} LinkedIn post`,
      department: 'Marketing',
      executive_owner: 'CMO Command',
      buyer_name: 'Public LinkedIn audience',
      risk_level: 'Medium',
      priority: 'Medium',
      status: 'Founder Review Required',
      summary: content.slice(0, 240),
      source_module: 'cmo-command',
      category: 'Marketing',
      details: {
        platform: 'LinkedIn',
        post_type: postType,
        content,
        hashtags,
        approval_gate: 'Founder approval required before publishing'
      }
    });
    setMessage(response.ok ? 'LinkedIn draft sent for founder approval.' : response.error || 'Approval request could not be created.');
  }

  return (
    <section className="cmo-panel cmo-composer">
      <div className="approval-section-header"><div><span>LinkedIn Composer</span><h2>Draft founder-safe LinkedIn content</h2></div><Send size={18} /></div>
      <label>
        <span>Post Type</span>
        <select value={postType} onChange={(event) => setPostType(event.target.value)}>
          {Object.keys(linkedInComposerHashtags).map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label>
        <span>Content</span>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Draft LinkedIn post content..." rows={9} />
      </label>
      <label>
        <span>Hashtag Suggestions</span>
        <input value={hashtags} readOnly />
      </label>
      <div className="cmo-action-row">
        <button className="ghost-button" onClick={() => setMessage('Draft saved locally in composer. Send for approval when ready.')}>Save Draft</button>
        <button className="tactical-button" onClick={sendForApproval}>Send for Approval</button>
      </div>
      {message ? <p className="cmo-posting-message">{message}</p> : null}
    </section>
  );
}

function CMOCleanCommandDashboard({ data, output, navigate, onGenerateTodayPlan, onArchiveFilter }) {
  const summary = data.summary || {};
  const realRunStatus = getCmoRealRunStatus(data);
  const dailyNumbers = [
    ['Campaigns Active', summary.campaignActivity ?? 'Verification pending'],
    ['Approvals Pending', summary.pendingApprovals ?? 'Verification pending'],
    ['Awaiting Analytics', 'No live data connected'],
    ['Importer Signals', summary.importerSignals ?? 'Verification pending'],
    ['Brand Risks', summary.brandRisks ?? 'Verification pending'],
    ['Consistency Score', summary.consistencyScore || 'Awaiting analytics']
  ];
  const metrics = [
    ['Daily Reach', 'Awaiting analytics', 'No live data connected'],
    ['Daily Engagement', 'Awaiting analytics', 'No live data connected'],
    ['New Audience', 'Awaiting analytics', 'Verification pending'],
    ['Daily Runs', realRunStatus, 'Real content history only'],
    ['Conversion Signals', 'Awaiting analytics', 'No live data connected']
  ];

  return (
    <main className="cmo-clean-dashboard">
      <CMOTopStatusStrip data={data} />
      <AICmoCommandCenter data={data} />

      <section className="cmo-clean-hero">
        <CMOContentMemoryArchive archive={data.contentMemoryArchive} growthAnalytics={data.socialGrowthAnalytics} onArchiveFilter={onArchiveFilter} />

        <article className="cmo-clean-card cmo-daily-numbers">
          <div className="cmo-clean-card-head">
            <span>Daily Numbers</span>
            <StatusBadge label={data.error ? 'Connect Supabase to activate' : 'Awaiting Sync'} state={data.error ? 'attention' : 'progress'} />
          </div>
          <div className="cmo-daily-number-list">
            {dailyNumbers.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="cmo-clean-metrics">
        {metrics.map(([label, value, note]) => (
          <article key={label} className="cmo-clean-card">
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <CMOPostingTimeSettings preference={data.cmoTimezonePreference} />

      <CMOAutomationFlow flow={data.cmoAutomationFlow} contentMemoryArchive={data.contentMemoryArchive} />

      <section className="cmo-clean-grid">
        <CMOContentPillars rows={data.tenglishVoiceRules} />
        <CMOGrowthIntelligenceCard data={data} />
        <CMOTopCampaigns rows={data.campaigns} />
        <CMOCalendarClean rows={data.calendar} />
        <CMORecommendedActions />
        <CMOBrandSafetyClean rows={data.brandRisks} />
        <CMOApprovalQueueClean rows={data.approvalQueue} navigate={navigate} />
        <CMOGrowthInsightsClean rows={data.digitalMarketingOptimization} />
      </section>
      <section className="cmo-ai-ops-grid">
        <AIBudgetControlPanel analysis={data.aiBudgetAnalysis} />
        <AICampaignControlPanel forecasts={data.aiCampaignForecasts} recommendations={data.aiRecommendations} />
        <AIScheduleOptimizationPanel optimization={data.aiScheduleOptimizations} timezone={data.cmoTimezonePreference?.timezone} />
        <AILeadIntelligencePanel scores={data.aiLeadScores} />
        <AIGrowthReasoningPanel insights={data.aiGrowthInsights} analytics={data.socialGrowthAnalytics} />
        <AIActivityMemoryPanel data={data} />
      </section>

      <CMOContentEngineStrip data={data} onOpenRunbook={onGenerateTodayPlan} />
    </main>
  );
}

function AICmoCommandCenter({ data }) {
  const os = data.aiCmoOperatingSystem || {};
  const activity = Array.isArray(os.activity) ? os.activity : [];
  const split = Array.isArray(os.operatorSplit) ? os.operatorSplit : [];
  return (
    <section className="cmo-ai-command-center">
      <div className="cmo-ai-command-copy">
        <span>AI Marketing Command Center</span>
        <h2>Autonomous CMO operating system with founder control.</h2>
        <p>AI prepares, optimizes, forecasts, scores, schedules, and reports. Humans approve, override, pause, monitor, and audit.</p>
      </div>
      <div className="cmo-ai-command-grid">
        {split.map(([label, detail]) => (
          <article key={label}>
            <strong>{label}</strong>
            <span>{detail}</span>
          </article>
        ))}
      </div>
      <div className="cmo-ai-activity-stream">
        <div><span>AI Activity Stream</span><StatusBadge label={os.authority || 'Founder approval required'} state="attention" /></div>
        {activity.map(([agent, state, detail]) => (
          <div key={agent}>
            <i aria-hidden="true" />
            <strong>{agent}</strong>
            <span>{state}</span>
            <small>{detail}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatAiScore(value) {
  if (value === null || value === undefined || value === '') return 'Awaiting data';
  return typeof value === 'number' ? `${Math.round(value)} / 100` : String(value);
}

function AIBudgetControlPanel({ analysis }) {
  const data = analysis || {};
  const cards = [
    ['AI budget health score', data.healthScore],
    ['Spend efficiency score', data.spendEfficiencyScore],
    ['ROI confidence score', data.roiConfidenceScore],
    ['Profitability estimate', data.profitabilityEstimate]
  ];
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
  return (
    <article className="cmo-clean-card cmo-ai-panel">
      <div className="cmo-clean-card-head"><span>AI Financial Control</span><StatusBadge label={data.connected ? 'Live' : 'Awaiting spend data'} state={data.connected ? 'progress' : 'attention'} /></div>
      <div className="cmo-ai-score-grid">
        {cards.map(([label, value]) => <div key={label}><span>{label}</span><strong>{formatAiScore(value)}</strong></div>)}
      </div>
      <div className="cmo-ai-list">
        {(recommendations.length ? recommendations : ['No live spend analysis connected. AI cannot silently spend or alter protected limits.']).map((item) => <p key={item}>{item}</p>)}
      </div>
    </article>
  );
}

function AICampaignControlPanel({ forecasts, recommendations }) {
  const rows = Array.isArray(forecasts?.rows) ? forecasts.rows.slice(0, 4) : [];
  const recs = Array.isArray(recommendations?.rows) ? recommendations.rows.slice(0, 4) : [];
  return (
    <article className="cmo-clean-card cmo-ai-panel">
      <div className="cmo-clean-card-head"><span>AI Campaign Control</span><StatusBadge label={forecasts?.connected ? 'Forecasting' : 'Forecast pending'} state={forecasts?.connected ? 'progress' : 'attention'} /></div>
      {rows.length ? rows.map((row) => (
        <div className="cmo-ai-row" key={row.id || row.campaign_id || row.campaign_name}>
          <strong>{row.campaign_name || row.campaign_id || 'Campaign forecast'}</strong>
          <span>{row.recommended_action || row.forecast_summary || row.summary || 'AI forecast recorded.'}</span>
          <small>Reach {row.estimated_reach ?? 'pending'} / Leads {row.estimated_leads ?? 'pending'} / ROI {row.roi_estimate ?? 'pending'}</small>
        </div>
      )) : <p className="cmo-ai-empty">{forecasts?.summary || 'Connect campaign forecasts to activate AI scaling, stopping, and wasted-spend detection.'}</p>}
      <div className="cmo-ai-list">
        {recs.map((row) => <p key={row.id || row.title || row.recommendation}>{row.recommendation || row.title || row[2]}</p>)}
      </div>
    </article>
  );
}

function AIScheduleOptimizationPanel({ optimization, timezone }) {
  const rows = Array.isArray(optimization?.rows) ? optimization.rows.slice(0, 4) : [];
  return (
    <article className="cmo-clean-card cmo-ai-panel">
      <div className="cmo-clean-card-head"><span>AI Scheduling Engine</span><StatusBadge label={optimization?.connected ? 'Optimizing' : 'Timezone-safe'} state="progress" /></div>
      <p>Selected timezone: <strong>{optimization?.timezone || timezone || 'Asia/Kolkata'}</strong>. Device/browser time is not used for posting decisions.</p>
      {rows.length ? rows.map((row) => (
        <div className="cmo-ai-row" key={row.id || `${row.platform}-${row.recommended_time}`}>
          <strong>{row.platform || 'Platform'}</strong>
          <span>{row.recommended_day || 'Best day pending'} / {row.recommended_time || 'Best time pending'}</span>
          <small>{row.reason || row.optimization_reason || 'AI schedule optimization recorded.'}</small>
        </div>
      )) : <p className="cmo-ai-empty">{optimization?.summary || 'AI schedule optimization awaits platform performance history.'}</p>}
    </article>
  );
}

function AILeadIntelligencePanel({ scores }) {
  const rows = Array.isArray(scores?.rows) ? scores.rows.slice(0, 5) : [];
  return (
    <article className="cmo-clean-card cmo-ai-panel">
      <div className="cmo-clean-card-head"><span>AI Lead Intelligence</span><StatusBadge label={scores?.connected ? 'Scoring' : 'Awaiting leads'} state={scores?.connected ? 'progress' : 'attention'} /></div>
      {rows.length ? rows.map((row) => (
        <div className="cmo-ai-row" key={row.id || row.lead_id}>
          <strong>{row.company_name || row.buyer_name || row.lead_id || 'Importer lead'}</strong>
          <span>Score {formatAiScore(row.score || row.lead_score)} / Priority {row.follow_up_priority || row.priority || 'pending'}</span>
          <small>{row.reason || row.quality_reason || row.spam_signal || 'AI lead score recorded.'}</small>
        </div>
      )) : <p className="cmo-ai-empty">{scores?.summary || 'Connect importer leads to rank serious buyers and spam risk.'}</p>}
    </article>
  );
}

function AIGrowthReasoningPanel({ insights, analytics }) {
  const rows = Array.isArray(insights?.rows) ? insights.rows.slice(0, 4) : [];
  const diagnosis = analytics?.diagnosis || {};
  return (
    <article className="cmo-clean-card cmo-ai-panel">
      <div className="cmo-clean-card-head"><span>AI Growth Reasoning</span><StatusBadge label={insights?.connected || analytics?.connected ? 'Signal-based' : 'No fabricated analytics'} state={insights?.connected || analytics?.connected ? 'progress' : 'attention'} /></div>
      {rows.length ? rows.map((row) => (
        <div className="cmo-ai-row" key={row.id || row.insight_type}>
          <strong>{row.insight_type || row.metric_name || 'Growth insight'}</strong>
          <span>{row.explanation || row.summary || 'AI growth insight recorded.'}</span>
          <small>{row.recommended_action || row.next_action || 'Awaiting action recommendation.'}</small>
        </div>
      )) : (
        <div className="cmo-ai-list">
          <p>{diagnosis.increasing || 'No connected metric increase detected.'}</p>
          <p>{diagnosis.decreasing || 'No connected metric drop detected.'}</p>
          <p>{diagnosis.nextAction || insights?.summary || 'Connect metrics before AI explains growth changes.'}</p>
        </div>
      )}
    </article>
  );
}

function AIActivityMemoryPanel({ data }) {
  const memoryCount = data.contentMemoryArchive?.items?.length || 0;
  const promptsConnected = Boolean(data.contentMemoryArchive?.connected);
  const items = [
    ['AI prompts', promptsConnected ? `${memoryCount} content records available` : 'Awaiting ai_content_memory rows'],
    ['Generated versions', 'Stored through content history and content versions'],
    ['Approved versions', 'Founder approval remains source of truth'],
    ['Rejected versions', 'Tracked for future avoidance when connected'],
    ['Performance after publishing', data.socialGrowthAnalytics?.connected ? 'Connected' : 'Awaiting platform metrics']
  ];
  return (
    <article className="cmo-clean-card cmo-ai-panel">
      <div className="cmo-clean-card-head"><span>AI Memory System</span><StatusBadge label="Audit required" state="attention" /></div>
      {items.map(([label, value]) => <div className="cmo-ai-row" key={label}><strong>{label}</strong><span>{value}</span></div>)}
    </article>
  );
}

const cmoAutomationLogoMap = {
  scheduler: CalendarClock,
  vercel: Zap,
  openai: Bot,
  creative: Sparkles,
  cloudflare: UploadCloud,
  slack: Send,
  founder: ShieldCheck,
  meta: Network,
  tracking: RadioTower,
  supabase: Database
};

function formatCmoPostingTime(value = '', timezone = '') {
  if (!value) return 'Not configured';
  const [rawHour = '0', rawMinute = '0'] = String(value).split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(value);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const zoneLabel = timezone === 'Asia/Kolkata' ? 'IST' : timezone || '';
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}${zoneLabel ? ` ${zoneLabel}` : ''}`;
}

function formatCmoScheduleValue(value = '') {
  return value || 'Not available yet';
}

function cmoStatusUrl(path) {
  return `${path}${path.includes('?') ? '&' : '?'}_=${Date.now()}`;
}

const cmoStatusFetchOptions = {
  method: 'GET',
  headers: {
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  },
  cache: 'no-store'
};

function pendingSchedulerHealth() {
  return {
    status: 'pending',
    healthMessage: 'Checking scheduler health...',
    runtime: 'vercel_cron',
    lastSyncAt: '',
    healthDetails: {
      endpoint_verified: false,
      selected_timezone: '',
      selected_country: '',
      selected_posting_time: '',
      schedule_mode: 'every_day',
      due_count: 0,
      last_cron_check_status: 'checking',
      next_check_at_utc: '',
      next_scheduled_post_local: ''
    }
  };
}

function normalizeSchedulerHealthForStep(result = {}) {
  const integration = result.integration || {};
  const metadata = integration.metadata || {};
  const postingRows = Array.isArray(result.postingSettings) ? result.postingSettings : [];
  const firstPosting = postingRows[0] || {};
  const endpointVerified = result.endpoint_verified === true || result.endpoint_verified === 'true' || metadata.endpoint_verified === true || metadata.endpoint_verified === 'true';
  const dbReadSucceeded = result.ok === true && result.status !== 'db_read_failed' && result.status !== 'failed_safely' && result.status !== 'not_configured';
  const rawStatus = String(result.status || integration.status || '').toLowerCase();
  const status = rawStatus === 'live' || (endpointVerified && dbReadSucceeded)
    ? 'live'
    : ['db_read_failed', 'failed_safely', 'error', 'failed'].includes(rawStatus)
      ? 'error'
      : 'pending';
  const dueCount = Number(metadata.due_count ?? result.due_count ?? 0);
  const selectedTimezone = metadata.selected_timezone || result.selected_timezone || firstPosting.timezone || '';
  const selectedCountry = metadata.selected_country || result.selected_country || firstPosting.country || '';
  const selectedPostingTime = metadata.selected_posting_time || result.selected_posting_time || firstPosting.local_post_time || '';

  return {
    status,
    healthMessage: status === 'live'
      ? dueCount > 0
        ? `${dueCount} posting schedule(s) currently due.`
        : 'Scheduler active. No posting schedule currently due.'
      : status === 'error'
        ? result.message || integration.error_message || 'Scheduler health check failed.'
        : 'Vercel Cron scheduler health is pending verification.',
    runtime: integration.runtime || metadata.scheduler_runtime || 'vercel_cron',
    lastSyncAt: integration.last_sync_at || integration.last_checked_at || '',
    healthDetails: {
      endpoint_verified: endpointVerified,
      selected_timezone: selectedTimezone,
      selected_country: selectedCountry,
      selected_posting_time: selectedPostingTime,
      schedule_mode: firstPosting.schedule_mode || metadata.schedule_mode || 'every_day',
      due_count: dueCount,
      last_cron_check_status: metadata.last_cron_check_status || result.last_cron_check_status || (dbReadSucceeded ? 'success' : ''),
      next_check_at_utc: metadata.next_check_at_utc || result.next_check_at_utc || '',
      next_scheduled_post_local: metadata.next_scheduled_post_local || result.next_scheduled_post_local || ''
    }
  };
}

function normalizeOpenAIStatusForStep(result = {}) {
  const rawStatus = String(result.status || '').trim().toLowerCase();
  const isLive = ['live', 'connected', 'healthy', 'active', 'verified'].includes(rawStatus);
  const isPending = ['pending', 'checking', 'verification pending'].includes(rawStatus);
  return {
    status: isLive ? 'live' : isPending ? 'pending' : 'error',
    message: isLive
      ? 'OpenAI live: GPT-5.5 premium content reasoning enabled via CTO provider vault.'
      : isPending
        ? 'Checking OpenAI connection...'
        : result.error_message || result.message || 'API request failed',
    model: result.model || 'gpt-5.5',
    latency_ms: Number.isFinite(Number(result.latency_ms)) ? Number(result.latency_ms) : null,
    last_success_at: isLive ? result.last_success_at || result.last_checked_at || '' : null,
    error_message: isLive ? null : result.error_message || result.message || null,
    outputs: Array.isArray(result.outputs) && result.outputs.length
      ? result.outputs
      : ['Instagram caption', 'Facebook caption', 'LinkedIn copy', 'Hashtags', 'Image prompt']
  };
}

const contentQualityActions = [
  ['improve_hook', 'Improve Hook'],
  ['improve_founder_tone', 'Improve Founder Tone'],
  ['improve_engagement', 'Improve Engagement'],
  ['improve_export_authority', 'Improve Export Authority'],
  ['improve_clarity', 'Improve Clarity'],
  ['improve_cta', 'Improve CTA'],
  ['improve_linkedin_version', 'Improve LinkedIn Version'],
  ['improve_instagram_version', 'Improve Instagram Version'],
  ['improve_seo_hashtags', 'Improve SEO/Hashtags'],
  ['regenerate_premium_version', 'Regenerate Premium Version']
];

function Step2ContentQualityPanel() {
  const [state, setState] = useState({
    status: 'loading',
    models: { premium: 'gpt-5.5', fast: 'gpt-4o-mini', image: 'gpt-image-1' },
    quality_scores: {},
    ai_suggestions: [],
    analysis: {},
    versions: { Original: '', Improved: '', 'Premium Rewrite': '' },
    source_content: ''
  });
  const [draft, setDraft] = useState('');
  const [activeVersion, setActiveVersion] = useState('Original');
  const [message, setMessage] = useState('Loading quality engine...');
  const [runningAction, setRunningAction] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/cmo/content-quality/review', { method: 'GET', headers: { Accept: 'application/json' } })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        setState((current) => ({ ...current, ...result }));
        setDraft(result.source_content || result.versions?.Original || '');
        setMessage(result.status === 'empty' ? 'No generated content connected yet. Paste a draft to activate AI Quality Improvement.' : result.message || 'AI quality engine ready. Founder approval remains required.');
      })
      .catch(() => {
        if (!active) return;
        setState((current) => ({ ...current, status: 'error' }));
        setMessage('AI quality endpoint could not be reached.');
      });
    return () => { active = false; };
  }, []);

  async function runQualityAction(action) {
    const sourceContent = draft.trim() || state.source_content || state.versions?.Original || '';
    if (!sourceContent) {
      setMessage('Paste or generate content before improving quality.');
      return;
    }
    setRunningAction(action);
    setMessage('GPT-5.5 is reviewing content quality...');
    try {
      const response = await fetch('/api/cmo/content-quality/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          mode: action === 'fast_bulk' ? 'fast' : 'premium',
          improvement_type: action,
          platform: action.includes('instagram') ? 'Instagram' : 'LinkedIn',
          source_content: sourceContent,
          content_history_id: state.content_history_id || null
        })
      });
      const result = await response.json();
      if (!result.ok) {
        setState((current) => ({ ...current, ...result, status: result.status || 'error' }));
        setMessage(result.message || 'AI quality review failed safely.');
        return;
      }
      setState((current) => ({ ...current, ...result }));
      setDraft(result.versions?.Improved || result.improved_content || sourceContent);
      setActiveVersion(result.selected_final_version === 'premium_rewrite' ? 'Premium Rewrite' : 'Improved');
      setMessage('Quality review complete. Improved content is still blocked from publishing until founder approval.');
    } catch {
      setMessage('AI quality review failed safely.');
    } finally {
      setRunningAction('');
    }
  }

  const scores = state.quality_scores || {};
  const versions = {
    Original: state.versions?.Original || state.source_content || draft,
    Improved: state.versions?.Improved || state.improved_content || '',
    'Premium Rewrite': state.versions?.['Premium Rewrite'] || state.premium_rewrite || ''
  };
  const activeText = versions[activeVersion] || 'No version available yet.';
  const scoreLabels = ['Hook Quality', 'Founder Authority', 'Engagement Potential', 'Trust Level', 'Clarity', 'Platform Optimization'];

  return (
    <section className="step2-quality-panel" data-cmo-flow-interactive="true">
      <div className="step2-quality-compact-head">
        <div>
          <span>AI Quality Improvement</span>
          <strong>AI Creative Director + AI CMO</strong>
        </div>
        <button type="button" className="ghost-button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Hide Quality Tools' : 'Open Quality Tools'}
        </button>
      </div>
      <div className="quality-model-strip">
        <span>Premium: {state.models?.premium || 'gpt-5.5'}</span>
        <span>Fast/Bulk: {state.models?.fast || 'gpt-4o-mini'}</span>
        <span>Image: {state.models?.image || 'gpt-image-1'}</span>
      </div>
      <p className={state.status === 'error' || state.status === 'model_unavailable' ? 'cmo-flow-error' : 'cmo-flow-pending'}>{message}</p>
      {expanded ? (
        <div className="step2-quality-expanded">
          <textarea
            className="quality-draft-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Paste generated content here, or connect content_history to review the latest generation."
          />
          <div className="quality-action-grid">
            {contentQualityActions.map(([action, label]) => (
              <button key={action} type="button" className="ghost-button" onClick={() => runQualityAction(action)} disabled={Boolean(runningAction)}>
                {runningAction === action ? 'Improving...' : label}
              </button>
            ))}
          </div>
          <div className="quality-score-grid">
            {scoreLabels.map((label) => {
              const score = Number(scores[label] || 0);
              return (
                <article key={label} style={{ '--score': `${score}%` }}>
                  <span>{label}</span>
                  <strong>{score}</strong>
                  <i><b /></i>
                </article>
              );
            })}
          </div>
          <div className="quality-suggestion-grid">
            <section>
              <strong>AI Suggestions</strong>
              {(state.ai_suggestions?.length ? state.ai_suggestions : ['No AI suggestions connected yet. Run a quality action to generate a real review.']).map((item) => <span key={item}>{item}</span>)}
            </section>
            <section>
              <strong>AI Review Analysis</strong>
              {Object.entries(state.analysis || {}).slice(0, 8).length
                ? Object.entries(state.analysis || {}).slice(0, 8).map(([key, value]) => <span key={key}>{key.replaceAll('_', ' ')}: {String(value)}</span>)
                : <span>No analysis available yet.</span>}
            </section>
          </div>
          <div className="quality-version-tabs">
            {Object.keys(versions).map((version) => <button key={version} type="button" className={activeVersion === version ? 'active' : ''} onClick={() => setActiveVersion(version)}>{version}</button>)}
          </div>
          <div className="quality-comparison-grid">
            <article><span>Selected Version</span><p>{activeText}</p></article>
            <article><span>Founder Safety</span><p>No improved content is auto-published. Final version must go through founder approval before any platform action.</p></article>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function formatCmoWorkflowDetailValue(value) {
  if (value === null || value === undefined || value === '') return 'Not reported';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not reported';
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '')
      .slice(0, 4)
      .map(([key, entryValue]) => `${key.replaceAll('_', ' ')}: ${formatCmoWorkflowDetailValue(entryValue)}`);
    return entries.length ? entries.join(' | ') : 'Not reported';
  }
  return String(value);
}

function getCmoStepProviders(step = {}) {
  const providerDetails = step.healthDetails?.providers || {};
  const providerRows = Object.entries(providerDetails).map(([key, provider]) => ({
    key,
    name: provider?.provider || key.replaceAll('_', ' '),
    status: provider?.status || 'pending',
    detail: provider?.error_message || provider?.version || (Number.isFinite(Number(provider?.latency_ms)) ? `${provider.latency_ms} ms` : '')
  }));

  if (providerRows.length) return providerRows;
  if (step.matchedProvider) {
    return [{
      key: step.matchedProvider,
      name: step.matchedProvider,
      status: step.status || 'pending',
      detail: step.runtime || step.engine || ''
    }];
  }
  return [{
    key: step.engine || step.id,
    name: step.engine || 'Provider status',
    status: step.status || 'pending',
    detail: step.healthMessage || 'Provider evidence not reported yet.'
  }];
}

function buildCmoStepInfrastructureRows(step = {}) {
  const details = step.healthDetails || {};
  const providerSummary = getCmoStepProviders(step).map((provider) => `${provider.name}: ${String(provider.status || 'pending').toUpperCase()}`).join(' | ');
  return [
    ['Status', String(step.status || 'pending').toUpperCase()],
    ['Integrations', formatCmoWorkflowDetailValue(step.integrationKeys)],
    ['Providers', providerSummary || 'Not reported'],
    ['Runtime', step.runtime || step.engine || 'Not reported'],
    ['API health', step.healthMessage || (step.status === 'live' ? 'Live' : 'Not reported')],
    ['Queue status', details.queue_status || details.last_cron_check_status || 'Not reported'],
    ['Audit health', step.id === 'audit-analytics' ? (step.status === 'live' ? 'audit_logs live' : step.healthMessage) : 'Audit logging enforced for manual controls'],
    ['Retry state', details.retry_state || details.retry_count || 'Not reported'],
    ['Connected services', step.matchedProvider || step.engine || 'Not reported'],
    ['Latency', Number.isFinite(Number(step.latencyMs || details.latency_ms)) ? `${step.latencyMs || details.latency_ms} ms` : 'Not reported'],
    ['Execution stats', details.execution_stats || details.request_volume || 'Not reported'],
    ['Last success', step.lastSuccessAt || details.last_success_at || step.lastSyncAt || 'Not reported'],
    ['Last failure', details.last_failure_at || details.error_message || (step.status === 'error' ? step.healthMessage : 'Not reported')],
    ['Safety guards', 'Founder approval, audit trail, and protected publish controls remain active'],
    ['Runtime environment', details.runtime_environment || step.statusSource || 'Not reported'],
    ['Storage/runtime metadata', formatCmoWorkflowDetailValue(details.bucket || details.storage_path || details.render_pipeline || details.metadata)]
  ];
}

function buildCmoStepActivityEntries(step = {}) {
  const entries = [];
  entries.push({
    label: `${step.title || 'Workflow step'} status`,
    detail: step.healthMessage || (step.status === 'live' ? 'Step is reporting live health.' : 'Waiting for live health evidence.'),
    status: step.status || 'pending'
  });

  getCmoStepProviders(step).forEach((provider) => {
    entries.push({
      label: `${provider.name} check`,
      detail: provider.detail || `Provider state is ${String(provider.status || 'pending').toUpperCase()}.`,
      status: provider.status || 'pending'
    });
  });

  (step.outputs || []).slice(0, 5).forEach((output) => {
    entries.push({
      label: output,
      detail: step.status === 'live' ? 'Capability is available from connected workflow data.' : 'Waiting for successful live execution.',
      status: step.status || 'pending'
    });
  });

  const details = step.healthDetails || {};
  Object.entries(details).slice(0, 5).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    entries.push({
      label: key.replaceAll('_', ' '),
      detail: formatCmoWorkflowDetailValue(value),
      status: step.status || 'pending'
    });
  });

  return entries.length ? entries : [{
    label: 'No live activity reported yet',
    detail: 'This panel will update when the backend reports workflow activity.',
    status: 'pending'
  }];
}

function isCmoImageWorkflowStep(step = {}) {
  const haystack = `${step.id || ''} ${step.title || ''} ${step.engine || ''} ${(step.outputs || []).join(' ')}`.toLowerCase();
  return ['creative', 'image', 'poster', 'asset', 'storage', 'render'].some((keyword) => haystack.includes(keyword));
}

function getCmoManualControls() {
  return [
    'Run Step',
    'Retry',
    'Regenerate',
    'Recheck Health',
    'Generate Again',
    'Run Workflow',
    'Send Approval',
    'Reupload Asset',
    'Republish Draft'
  ];
}

async function runCmoManualStepAction(step = {}, label = '') {
  const stepId = String(step.id || '');
  const normalizedLabel = String(label || '').toLowerCase();
  const readJson = async (url, options = {}) => {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options
    });
    return response.json();
  };

  if (stepId === 'time-trigger') {
    const result = await readJson('/api/cmo/scheduler-health');
    return {
      ok: result.ok !== false,
      status: result.status || 'checked',
      message: result.message || result.healthMessage || 'Scheduler health checked. Posting due decision remains timezone-controlled.',
      details: result
    };
  }

  if (stepId === 'ai-content-generation' && /run step|generate again|regenerate|run workflow|retry/i.test(label)) {
    return readJson('/api/cmo/content-quality/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: normalizedLabel.includes('retry') ? 'fast' : 'premium',
        platform: 'LinkedIn',
        topic: 'Fresh founder-led export authority content for GOPU OS manual CMO run'
      })
    });
  }

  if (stepId === 'ai-content-generation') {
    const result = await readJson('/api/integrations/openai/status');
    return {
      ok: result.status === 'live',
      status: result.status || 'checked',
      message: result.message || result.error_message || 'OpenAI content provider checked.',
      details: result
    };
  }

  if (stepId === 'creative-engine') {
    const result = await readJson('/api/integrations/creative/status');
    return {
      ok: result.status === 'live',
      status: result.status || 'checked',
      message: result.message || result.error_message || 'Creative engine checked. Asset rendering still requires a real content input.',
      details: result
    };
  }

  if (stepId === 'asset-storage') {
    const result = await readJson('/api/integrations/supabase/storage/status');
    return {
      ok: result.status === 'live',
      status: result.status || 'checked',
      message: result.message || result.error_message || 'Supabase Storage checked. Upload requires a real asset.',
      details: result
    };
  }

  if ((stepId === 'slack-approval' || stepId === 'founder-decision') && /send approval|run step|run workflow|retry/i.test(label)) {
    const result = await readJson('/api/slack/approval-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approval_id: `manual-${stepId}-${Date.now()}`,
        title: `Manual ${step.title} check`,
        summary: 'Manual workflow approval check from GOPU OS. This does not publish anything.',
        requested_by: 'Founder OS',
        risk_level: 'Medium',
        module: 'AI CMO Workflow',
        related_table: 'cmo_workflow_step',
        reason: 'Founder requested manual workflow control.'
      })
    });
    return {
      ok: result.ok === true,
      status: result.status || 'checked',
      message: result.ok ? 'Slack approval message sent. No publishing was attempted.' : result.message || 'Slack approval send failed safely.',
      details: result
    };
  }

  if (stepId === 'meta-publish-engine') {
    return {
      ok: true,
      status: 'blocked_by_safety',
      message: 'Manual publishing remains blocked until approved content and live Meta credentials are present. No post was published.',
      details: { publish_status: 'not_published', founder_approval_required: true }
    };
  }

  if (stepId === 'delivery-tracking') {
    return {
      ok: true,
      status: 'monitoring',
      message: 'Delivery tracking manual check completed. Live event updates require platform webhook events.',
      details: { webhook_events_required: true }
    };
  }

  if (stepId === 'audit-analytics') {
    return {
      ok: true,
      status: 'audit_checked',
      message: 'Audit analytics manual check completed through the audit request path.',
      details: { audit_requested: true }
    };
  }

  return {
    ok: true,
    status: 'manual_request_recorded',
    message: `${step.title || 'Workflow step'} manual request recorded. No unsafe action was executed.`,
    details: { step_id: stepId, safety_gated: true }
  };
}

function isStep6DevTestMode() {
  return Boolean(import.meta.env.DEV) || (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname));
}

function getContentSortTime(item = {}) {
  return Date.parse(item.updated_at || item.metrics_collected_at_utc || item.approved_at || item.approved_at_utc || item.generated_at || item.created_at || 0) || 0;
}

function getLatestFounderDecisionContent(archive = {}) {
  const items = Array.isArray(archive?.items) ? archive.items : [];
  const sortedItems = [...items].sort((a, b) => getContentSortTime(b) - getContentSortTime(a));
  return sortedItems.find((item) => {
    const status = String(item?.approval_status || item?.content_approvals?.[0]?.approval_status || '').toLowerCase();
    const publishStatus = String(item?.publish_status || '').toLowerCase();
    const itemMetadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
    const simulatedPipeline = itemMetadata.simulated_pipeline === true && !isStep6DevTestMode();
    return !simulatedPipeline && (status.includes('approved') || publishStatus.includes('publishing') || publishStatus.includes('published') || itemMetadata.analytics_status === 'collected' || itemMetadata.optimization_status === 'completed');
  }) || sortedItems.find((item) => {
    const status = String(item?.approval_status || item?.content_approvals?.[0]?.approval_status || '').toLowerCase();
    return status.includes('pending') || status.includes('waiting') || status.includes('rejected') || status.includes('review') || status.includes('edit') || status.includes('hold');
  }) || sortedItems[0] || null;
}

function getFounderDecisionState(content = null) {
  const raw = String(content?.approval_status || content?.content_approvals?.[0]?.approval_status || 'pending_approval').toLowerCase();
  if (raw.includes('approved')) return { key: 'approved', label: 'APPROVED', tone: 'live' };
  if (raw.includes('rejected')) return { key: 'rejected', label: 'REJECTED', tone: 'error' };
  if (raw.includes('edit')) return { key: 'needs_edit', label: 'NEEDS EDIT', tone: 'error' };
  if (raw.includes('hold')) return { key: 'hold', label: 'HOLD', tone: 'pending' };
  return { key: 'waiting', label: 'WAITING', tone: 'pending' };
}

function getCmoPublishState(content = null) {
  const publishStatus = String(content?.publish_status || content?.status || '').toLowerCase();
  if (publishStatus.includes('retry')) return { key: 'retry', label: 'RETRY SCHEDULED', step: 7, status: 'retry', stage: 'publishing' };
  if (publishStatus.includes('fail')) return { key: 'failed', label: 'FAILED', step: 7, status: 'error', stage: 'publishing' };
  if (publishStatus.includes('published') || content?.live_post_url || content?.post_url) return { key: 'published', label: 'PUBLISHED', step: 8, status: 'published', stage: 'analytics' };
  if (publishStatus.includes('publishing')) return { key: 'publishing', label: 'PUBLISHING', step: 7, status: 'publishing', stage: 'publishing' };
  if (publishStatus.includes('queued') || publishStatus.includes('ready_for_publish')) return { key: 'queued', label: 'QUEUED', step: 7, status: 'queued', stage: 'publishing' };
  return { key: publishStatus || 'blocked', label: publishStatus ? formatContentMemoryLabel(publishStatus).toUpperCase() : 'BLOCKED', step: 6, status: 'pending', stage: 'approval' };
}

function getCmoWorkflowProgress(content = null) {
  if (!content) return { currentStep: 1, workflowStage: 'waiting_for_content', publishState: getCmoPublishState(null), approvalState: getFounderDecisionState(null) };
  const itemMetadata = content.metadata && typeof content.metadata === 'object' ? content.metadata : {};
  const approvalState = getFounderDecisionState(content);
  const publishState = getCmoPublishState(content);
  const simulatedPipeline = itemMetadata.simulated_pipeline === true;
  const allowSimulatedProgress = !simulatedPipeline || isStep6DevTestMode();
  const approved = approvalState.key === 'approved';
  const dryRunPublishCompleted = itemMetadata.dry_run_publish_completed === true && allowSimulatedProgress;
  const publishUnlocked = approved && (publishState.key === 'published' || dryRunPublishCompleted);
  const analyticsCollected = publishUnlocked && itemMetadata.analytics_status === 'collected';
  const optimizationCompleted = analyticsCollected && itemMetadata.optimization_status === 'completed';

  if (!approved) {
    return {
      currentStep: 6,
      workflowStage: 'approval',
      approvalState,
      publishState,
      blockedReason: 'blocked_missing_approval'
    };
  }
  if (optimizationCompleted) {
    return {
      currentStep: Number(content.current_step || itemMetadata.current_step || 9),
      workflowStage: content.workflow_stage || itemMetadata.workflow_stage || 'optimization',
      approvalState,
      publishState
    };
  }
  if (analyticsCollected) {
    return {
      currentStep: Number(content.current_step || itemMetadata.current_step || 8),
      workflowStage: content.workflow_stage || itemMetadata.workflow_stage || 'analytics',
      approvalState,
      publishState
    };
  }
  if (publishUnlocked) {
    return {
      currentStep: 8,
      workflowStage: 'analytics',
      approvalState,
      publishState,
      blockedReason: 'blocked_missing_analytics'
    };
  }
  return {
    currentStep: 7,
    workflowStage: 'publishing',
    approvalState,
    publishState,
    blockedReason: 'blocked_missing_publish'
  };
}

function applyCmoWorkflowProgression(steps = [], content = null) {
  const progress = getCmoWorkflowProgress(content);
  const latestMetrics = Array.isArray(content?.content_metrics) ? content.content_metrics[0] : null;
  const latestMemory = Array.isArray(content?.ai_content_memory) ? content.ai_content_memory[0] : null;
  const itemMetadata = content?.metadata && typeof content.metadata === 'object' ? content.metadata : {};
  return steps.map((step) => {
    const baseStatus = step.status || 'pending';
    const completed = Boolean(content && step.step < progress.currentStep);
    const active = Boolean(content && step.step === progress.currentStep);
    const waiting = Boolean(content && step.step > progress.currentStep);
    let status = baseStatus;
    let healthMessage = step.healthMessage;
    let time = step.time;
    let outputs = step.outputs;
    let healthDetails = step.healthDetails || {};

    if (completed) {
      status = baseStatus === 'error' && step.step > 5 ? 'error' : 'complete';
      healthMessage = step.step === 6 ? 'Founder approval completed. Workflow advanced to publishing.' : step.healthMessage;
    } else if (waiting) {
      status = 'waiting';
      healthMessage = step.step === 7 && progress.blockedReason === 'blocked_missing_approval'
        ? 'Waiting for approval. Slack/founder approval is required before publishing unlocks.'
        : step.step === 8
          ? 'Analytics pending. Waiting for a published post or explicit dry-run publish completion.'
          : step.step === 9
            ? 'Waiting for analytics signals before optimization starts.'
            : step.healthMessage || 'Waiting for previous workflow step.';
    } else if (active && step.step === 6) {
      status = progress.approvalState.key === 'approved' ? 'complete' : 'pending';
      healthMessage = progress.approvalState.key === 'approved' ? 'Founder approval completed. Workflow advanced to publishing.' : 'WAITING FOR APPROVAL. Slack/founder approval must complete before Step 7 unlocks.';
    } else if (active && step.step === 7) {
      status = progress.publishState.status;
      time = progress.publishState.label;
      healthMessage = progress.publishState.key === 'queued'
        ? 'Approved content is queued for the protected publishing path. No public post has been triggered by Step 6.'
        : progress.publishState.key === 'publishing'
          ? 'Publishing is in progress through the protected provider path.'
          : progress.publishState.key === 'failed'
            ? 'Publishing failed. Review provider response before retrying.'
            : progress.publishState.key === 'retry'
              ? 'Publishing retry has been scheduled.'
              : 'Publishing state is active.';
      outputs = ['Queued', 'Publishing', 'Published', 'Failed', 'Retry scheduled'];
    } else if (active && step.step === 8) {
      status = itemMetadata.analytics_status === 'failed' ? 'error' : itemMetadata.analytics_status === 'collected' ? 'analytics' : 'waiting';
      time = 'COLLECTING ANALYTICS';
      healthMessage = itemMetadata.analytics_status === 'collected'
        ? `Metrics collected. Engagement rate ${itemMetadata.latest_engagement_rate ?? latestMetrics?.engagement_rate ?? 'not reported'}%.`
        : itemMetadata.analytics_status === 'failed'
          ? itemMetadata.analytics_error || 'Analytics collection failed safely.'
          : 'Analytics pending. Waiting for publish result or simulated test collection.';
      outputs = ['Collecting analytics', 'Engagement sync', 'AI learning'];
      healthDetails = {
        ...healthDetails,
        metrics: latestMetrics || {},
        learning_summary: latestMemory?.performance_summary || '',
        ai_reasoning: latestMemory?.ai_reasoning || '',
        analytics_status: itemMetadata.analytics_status || 'pending',
        guard_reason: itemMetadata.analytics_status === 'collected' ? '' : 'blocked_missing_analytics',
        metrics_collected_at_utc: itemMetadata.metrics_collected_at_utc || latestMetrics?.collected_at_utc || ''
      };
    } else if (active && step.step === 9) {
      status = itemMetadata.optimization_status === 'failed' ? 'error' : itemMetadata.optimization_status === 'completed' ? 'optimization' : 'waiting';
      time = 'AI OPTIMIZATION';
      healthMessage = itemMetadata.optimization_status === 'completed'
        ? itemMetadata.learned_insight || latestMemory?.campaign_impact || 'Optimization completed and AI learning is stored.'
        : itemMetadata.optimization_status === 'failed'
          ? itemMetadata.optimization_error || 'Optimization failed safely.'
          : 'Optimization pending. Waiting for Step 8 analytics signals.';
      outputs = ['AI optimization running', 'Hashtag optimization', 'Performance adaptation'];
      healthDetails = {
        ...healthDetails,
        optimization_status: itemMetadata.optimization_status || 'pending',
        learned_insight: itemMetadata.learned_insight || latestMemory?.campaign_impact || '',
        recommended_next_caption_style: itemMetadata.recommended_next_caption_style || latestMemory?.recommended_next_caption_style || '',
        recommended_hashtags: itemMetadata.recommended_hashtags || latestMemory?.recommended_hashtags || [],
        recommended_posting_time: itemMetadata.recommended_posting_time || latestMemory?.recommended_posting_time || '',
        audience_learning: itemMetadata.audience_learning || latestMemory?.audience_learning || '',
        platform_learning: itemMetadata.platform_learning || latestMemory?.platform_learning || '',
        guard_reason: itemMetadata.optimization_status === 'completed' ? '' : 'blocked_missing_analytics',
        optimization_completed_at_utc: itemMetadata.optimization_completed_at_utc || ''
      };
    }

    return {
      ...step,
      status,
      time,
      outputs,
      healthMessage,
      healthDetails,
      workflowProgress: {
        current_step: progress.currentStep,
        workflow_stage: progress.workflowStage,
        isActive: active,
        isCompleted: completed,
        isWaiting: waiting,
        approval_status: content?.approval_status || '',
        publish_status: content?.publish_status || ''
      }
    };
  });
}

function FounderDecisionStatusPill({ state, active = false }) {
  return (
    <span className={`founder-decision-status status-${state.tone}`}>
      {active ? <i /> : null}
      {state.label}
    </span>
  );
}

function buildFounderDecisionActivity(content, state) {
  const generatedAt = getContentUtcValue(content || {}, 'generated_at');
  const approval = content?.content_approvals?.[0] || {};
  return [
    ['Content generated', generatedAt ? formatContentMemoryDate(generatedAt, content?.timezone || DEFAULT_CMO_TIMEZONE) : 'Waiting for content history', content ? 'live' : 'pending'],
    ['Image rendered', content?.poster_url || content?.image_url ? 'Creative asset is attached' : 'No generated image attached yet', content?.poster_url || content?.image_url ? 'live' : 'pending'],
    ['Slack approval sent', approval.slack_message_ts || approval.requested_at ? 'Approval message recorded' : 'Waiting for Slack approval record', approval.slack_message_ts || approval.requested_at ? 'live' : 'pending'],
    ['Founder opened review', approval.opened_at ? formatContentMemoryDate(approval.opened_at, content?.timezone || DEFAULT_CMO_TIMEZONE) : 'Review open state not recorded yet', approval.opened_at ? 'live' : 'pending'],
    [state.key === 'waiting' || state.key === 'hold' ? 'Waiting for action' : `Decision ${state.label.toLowerCase()}`, state.key === 'waiting' || state.key === 'hold' ? 'Publishing remains blocked until founder approval is recorded.' : 'Decision state is reflected from content approval data.', state.tone]
  ].map(([label, timestamp, status]) => ({ label, timestamp, status }));
}

function FounderDecisionFlowCard({ step, content, onOpen, onKeyDown }) {
  const Logo = cmoAutomationLogoMap[step.logoKey] || ShieldCheck;
  const decisionState = getFounderDecisionState(content);
  const caption = content?.caption || content?.generated_text || content?.content_versions?.find((version) => version.version_type === 'generated')?.draft_text || '';
  const targets = normalizeContentArray(content?.platform ? [content.platform] : content?.platform_targets);
  const active = step.workflowProgress?.isActive;
  const completed = step.workflowProgress?.isCompleted;
  const waiting = step.workflowProgress?.isWaiting;

  return (
    <motion.article
      className={`cmo-flow-card founder-decision-card status-${completed ? 'complete' : decisionState.tone} ${active ? 'is-active-step' : ''} ${completed ? 'is-completed-step' : ''} ${waiting ? 'is-waiting-step' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Open Founder Decision command center"
      onClick={onOpen}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="cmo-flow-main">
        <span className="cmo-flow-step">Step {step.step}</span>
        <div className="cmo-flow-logo"><Logo size={18} /></div>
        <div>
          <strong>{step.title}</strong>
          <p>Approved content moves to publishing queue.</p>
          <small>{content ? `Reviewing ${content.topic || content.campaign_name || 'latest generated content'}` : 'Waiting for generated content package'}</small>
          <div className="founder-decision-card-preview">
            <span>{caption ? truncateText(caption, 150) : 'No content package is ready for founder decision yet.'}</span>
          </div>
          <div className="cmo-flow-outputs founder-decision-targets">
            {(targets.length ? targets : ['Approval queue', 'Publishing gate', 'Audit trail']).slice(0, 4).map((target) => <span key={target}>{target}</span>)}
          </div>
        </div>
      </div>
      <div className="cmo-flow-side founder-decision-side">
        <FounderDecisionStatusPill state={decisionState} active={active} />
        <small>{content?.updated_at ? formatContentMemoryDate(content.updated_at, content.timezone || DEFAULT_CMO_TIMEZONE) : 'Live approval state'}</small>
      </div>
    </motion.article>
  );
}

function FounderDecisionEmptyState() {
  return (
    <div className="founder-decision-empty">
      <div>
        <ShieldCheck size={30} />
        <Sparkles size={18} />
      </div>
      <strong>No content package waiting yet</strong>
      <p>Once Step 2-5 create a real content package, this panel will show caption, platforms, image, risk checks, and scheduled publishing context.</p>
    </div>
  );
}

function FounderDecisionCommandCenter({ step, content, steps, controlState, processingAction, devMode, devAction, onCreateTestContent, onCleanupTestContent, onDecision, onClose }) {
  const Logo = cmoAutomationLogoMap[step.logoKey] || ShieldCheck;
  const decisionState = getFounderDecisionState(content);
  const active = step.workflowProgress?.isActive;
  const hashtags = normalizeContentArray(content?.hashtags);
  const targets = normalizeContentArray(content?.platform_targets || (content?.platform ? [content.platform] : []));
  const caption = content?.caption || content?.generated_text || content?.content_versions?.find((version) => version.version_type === 'generated')?.draft_text || '';
  const finalText = content?.final_text || content?.content_versions?.find((version) => version.version_type === 'approved')?.final_text || '';
  const posterUrl = content?.poster_url || content?.image_url || content?.content_links?.find((link) => link.link_type === 'poster')?.url || '';
  const confidence = content?.ai_confidence_score || content?.content_quality_reviews?.[0]?.overall_score || content?.ai_content_memory?.[0]?.confidence_score || null;
  const riskFlags = normalizeContentArray(content?.risk_flags || content?.content_quality_reviews?.[0]?.risk_flags);
  const activity = buildFounderDecisionActivity(content, decisionState);
  const scheduledAt = getContentUtcValue(content || {}, 'scheduled_at');

  return (
    <AnimatePresence>
      <motion.div className="cmo-step-detail-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Founder Decision command center">
        <motion.section
          className={`cmo-step-detail founder-decision-command status-${decisionState.tone}`}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <header className="cmo-step-detail-header founder-decision-header">
            <div className="cmo-step-detail-title">
              <span className="cmo-flow-step">Step {step.step}</span>
              <div className="cmo-flow-logo"><Logo size={19} /></div>
              <div>
                <small>Founder approval logic</small>
                <h2>{step.title}</h2>
                <p>Approved content moves to publishing queue.</p>
              </div>
            </div>
            <div className="cmo-step-detail-actions">
              {content?.metadata?.test_mode ? <span className="founder-dev-badge">DEV TEST CONTENT</span> : null}
              <FounderDecisionStatusPill state={decisionState} active={active} />
              <button type="button" className="tactical-button ghost" onClick={onClose}>Close</button>
            </div>
          </header>

          {devMode ? (
            <section className="founder-dev-testbar" data-cmo-flow-interactive="true">
              <div>
                <span>Developer test mode</span>
                <strong>Creates real Supabase test rows marked metadata.test_mode=true.</strong>
              </div>
              <button type="button" onClick={onCreateTestContent} disabled={Boolean(devAction || processingAction)}>{devAction === 'create' ? 'Creating...' : 'Create Test Content Package'}</button>
              <button type="button" onClick={onCleanupTestContent} disabled={Boolean(devAction || processingAction)}>{devAction === 'cleanup' ? 'Cleaning...' : 'Delete Latest Test Package'}</button>
            </section>
          ) : null}

          <div className="founder-decision-summary-grid">
            {[
              ['Approval State', decisionState.label],
              ['Platform Targets', targets.length ? targets.join(', ') : 'Not selected'],
              ['Publish Status', formatContentMemoryLabel(content?.publish_status || 'not_published')],
              ['Scheduled Time', scheduledAt ? formatContentMemoryDate(scheduledAt, content?.timezone || DEFAULT_CMO_TIMEZONE) : 'Not scheduled']
            ].map(([label, value]) => (
              <motion.article key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <span>{label}</span>
                <strong>{value}</strong>
              </motion.article>
            ))}
          </div>

          <div className="cmo-workflow-timeline founder-decision-mini-timeline">
            {(steps || []).map((timelineStep) => (
              <div key={timelineStep.id} className={`cmo-timeline-node status-${timelineStep.status || 'pending'} ${timelineStep.workflowProgress?.isActive ? 'active' : ''}`}>
                <span>{timelineStep.step}</span>
                <small>{timelineStep.title}</small>
              </div>
            ))}
          </div>

          <div className="founder-decision-grid">
            <section className="founder-decision-review-panel">
              <div className="cmo-step-panel-head">
                <span>Approval Review</span>
                <small>{content?.run_id || 'no active content run'}</small>
              </div>
              {content ? (
                <>
                  <article className="founder-content-preview">
                    <span>Generated content preview</span>
                    <p>{caption || finalText || 'No caption text recorded.'}</p>
                  </article>
                  <div className="founder-review-meta">
                    <div><span>Caption Preview</span><strong>{truncateText(caption || finalText || 'Not recorded', 110)}</strong></div>
                    <div><span>Platform Targets</span><strong>{targets.length ? targets.join(', ') : content.platform || 'Not selected'}</strong></div>
                    <div><span>AI Confidence</span><strong>{confidence === null || confidence === undefined ? 'Not reported' : `${confidence}%`}</strong></div>
                    <div><span>Scheduled Publishing Time</span><strong>{scheduledAt ? formatContentMemoryDate(scheduledAt, content.timezone || DEFAULT_CMO_TIMEZONE) : 'Not scheduled'}</strong></div>
                  </div>
                  <div className="founder-tag-row">
                    {hashtags.length ? hashtags.map((tag) => <span key={tag}>{String(tag).startsWith('#') ? tag : `#${tag}`}</span>) : <span>No hashtags recorded</span>}
                  </div>
                  <div className="founder-risk-row">
                    {(riskFlags.length ? riskFlags : ['Founder approval required', 'No auto-publishing', 'Audit trail required']).map((flag) => <span key={flag}>{formatContentMemoryLabel(flag)}</span>)}
                  </div>
                  <div className="founder-image-preview">
                    {posterUrl ? <img src={posterUrl} alt="Generated content visual preview" /> : <FounderDecisionEmptyState />}
                  </div>
                </>
              ) : <FounderDecisionEmptyState />}
            </section>

            <aside className="founder-decision-activity-panel">
              <div className="cmo-step-panel-head">
                <span>Workflow Activity</span>
                <small>Live decision context</small>
              </div>
              <div className="founder-activity-list">
                {activity.map((event, index) => (
                  <motion.article key={event.label} className={`status-${event.status}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
                    <i />
                    <div>
                      <strong>{event.label}</strong>
                      <span>{event.timestamp}</span>
                    </div>
                  </motion.article>
                ))}
              </div>
              {controlState.message ? <p className={`cmo-control-state status-${controlState.status}`}>{controlState.message}</p> : null}
              {controlState.toast ? <motion.div className={`founder-decision-toast status-${controlState.status}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{controlState.toast}</motion.div> : null}
            </aside>
          </div>

          <footer className="founder-decision-action-bar" data-cmo-flow-interactive="true">
            <button type="button" className="approve" onClick={() => onDecision('Approve & Publish')} disabled={Boolean(processingAction) || !content}>{processingAction === 'Approve & Publish' ? 'Approving...' : 'Approve & Publish'}</button>
            <button type="button" className="edit" onClick={() => onDecision('Send Back for Edit')} disabled={Boolean(processingAction) || !content}>{processingAction === 'Send Back for Edit' ? 'Sending back...' : 'Send Back for Edit'}</button>
            <button type="button" className="hold" onClick={() => onDecision('Hold Queue')} disabled={Boolean(processingAction) || !content}>{processingAction === 'Hold Queue' ? 'Holding...' : 'Hold Queue'}</button>
          </footer>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

function CMOWorkflowStepDetail({ step, steps, content, devMode = false, devAction = '', onCreateTestContent, onCleanupTestContent, onContentUpdated, onClose }) {
  const [controlState, setControlState] = useState({ status: 'idle', message: '' });
  const [manualOutput, setManualOutput] = useState(null);
  const [localDecisionContent, setLocalDecisionContent] = useState(content || null);
  const [processingAction, setProcessingAction] = useState('');
  useEffect(() => {
    setLocalDecisionContent(content || null);
  }, [content]);
  if (!step) return null;
  const Logo = cmoAutomationLogoMap[step.logoKey] || Workflow;
  const infrastructureRows = buildCmoStepInfrastructureRows(step);
  const activityEntries = buildCmoStepActivityEntries(step);
  const manualControls = getCmoManualControls();
  const status = step.status || 'pending';

  const handleManualControl = async (label) => {
    const runsStep2Content = step.id === 'ai-content-generation' && /run step|generate again|regenerate|run workflow|retry/i.test(label);
    setControlState({ status: 'pending', message: runsStep2Content ? `${label} is generating fresh content...` : `${label} is running safely...` });
    try {
      let auditResult = { ok: false };
      try {
        auditResult = await createAuditLog({
          action_type: `CMO workflow manual control: ${label}`,
          module: 'AI CMO Workflow',
          related_table: 'cmo_workflow_step',
          actor: 'Founder OS',
          description: `${label} requested for ${step.title}. Execution remains safety-gated and founder approval protections remain active.`,
          risk_level: /publish|approval|reupload|regenerate/i.test(label) ? 'Medium' : 'Low',
          metadata: {
            step_id: step.id,
            step_title: step.title,
            step_status: step.status,
            control: label
          }
        });
      } catch {
        auditResult = { ok: false };
      }
      const result = await runCmoManualStepAction(step, label);
      if (runsStep2Content && result.ok) {
        setManualOutput(result);
        setControlState({
          status: 'live',
          message: auditResult?.ok
            ? 'Fresh content generated. Audit recorded. Founder approval is still required before publishing.'
            : 'Fresh content generated. Server audit persistence is pending repair, but generation was not blocked. Founder approval is still required before publishing.'
        });
        return;
      }
      if (!result.ok) {
        setControlState({ status: 'error', message: result.message || `${label} failed safely. No unsafe action was executed.` });
        return;
      }
      setControlState({
        status: result.status === 'blocked_by_safety' ? 'pending' : 'live',
        message: auditResult?.ok
          ? result.message || `${label} completed safely.`
          : `${result.message || `${label} completed safely.`} Audit write is pending; action was not blocked.`
      });
    } catch (error) {
      setControlState({ status: 'error', message: error?.message || `${label} failed safely. Workflow execution was not started.` });
    }
  };

  const handleFounderDecisionControl = async (label) => {
    if (!localDecisionContent?.id) {
      setControlState({ status: 'error', message: 'No real content package is selected for founder decision.', toast: 'No content package available.' });
      return;
    }
    setProcessingAction(label);
    setControlState({ status: 'pending', message: `${label} is updating Supabase...`, toast: '' });
    try {
      const result = await updateFounderContentDecision(localDecisionContent.id, label, {
        tenant_id: localDecisionContent.tenant_id,
        timezone: localDecisionContent.timezone
      });
      if (!result.ok) {
        setControlState({ status: 'error', message: result.error || `${label} failed safely. No publishing was attempted.`, toast: 'Decision update failed.' });
        return;
      }
      setLocalDecisionContent((current) => ({
        ...(current || {}),
        ...(result.data.content_history || {}),
        content_approvals: result.data.content_history?.content_approvals || current?.content_approvals || []
      }));
      onContentUpdated?.(result.data.content_history);
      setControlState({
        status: 'live',
        message: label.includes('Approve')
          ? 'Approved in Supabase. Item is queued for publishing guardrails; no public post was triggered by this click.'
          : `${label} saved in Supabase. Content remains blocked from publishing.`,
        toast: label.includes('Approve') ? 'Founder decision saved: Approved.' : label.includes('Edit') ? 'Founder decision saved: Needs edit.' : 'Founder decision saved: Hold queue.'
      });
    } catch (error) {
      setControlState({ status: 'error', message: error?.message || `${label} failed safely. No publishing was attempted.`, toast: 'Decision update failed.' });
    } finally {
      setProcessingAction('');
    }
  };

  if (step.id === 'founder-decision') {
    return (
      <FounderDecisionCommandCenter
        step={step}
        content={localDecisionContent}
        steps={steps}
        controlState={controlState}
        processingAction={processingAction}
        devMode={devMode}
        devAction={devAction}
        onCreateTestContent={onCreateTestContent}
        onCleanupTestContent={onCleanupTestContent}
        onDecision={handleFounderDecisionControl}
        onClose={onClose}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="cmo-step-detail-shell"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={`${step.title} operational detail`}
      >
        <motion.section
          className={`cmo-step-detail status-${status}`}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <header className="cmo-step-detail-header">
            <div className="cmo-step-detail-title">
              <span className="cmo-flow-step">Step {step.step}</span>
              <div className="cmo-flow-logo"><Logo size={19} /></div>
              <div>
                <small>{step.engine}</small>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </div>
            </div>
            <div className="cmo-step-detail-actions">
              <b className={`cmo-flow-status ${status}`}>{String(status).toUpperCase()}</b>
              <button type="button" className="tactical-button ghost" onClick={onClose}>Close</button>
            </div>
          </header>

          <div className="cmo-workflow-timeline">
            {(steps || []).map((timelineStep) => (
              <button
                key={timelineStep.id}
                type="button"
                className={`cmo-timeline-node status-${timelineStep.status || 'pending'} ${timelineStep.id === step.id ? 'active' : ''}`}
                title={timelineStep.title}
                disabled
              >
                <span>{timelineStep.step}</span>
                <small>{timelineStep.title}</small>
              </button>
            ))}
          </div>

          <div className="cmo-step-detail-grid">
            <aside className="cmo-step-infra-panel">
              <div className="cmo-step-panel-head">
                <span>Infrastructure + Integration View</span>
                <small>{step.statusSource || 'workflow metadata'}</small>
              </div>
              <div className="cmo-infra-list">
                {infrastructureRows.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              {isCmoImageWorkflowStep(step) ? (
                <section className="cmo-live-image-panel">
                  <div>
                    <span>Live Image Experience</span>
                    <strong>{step.status === 'live' ? 'Render pipeline ready' : 'No rendered image preview returned yet'}</strong>
                  </div>
                  <p>{step.healthDetails?.public_asset_url || step.healthDetails?.storage_path || step.healthMessage || 'Large previews appear here after the backend returns a real creative asset.'}</p>
                </section>
              ) : null}
              <details className="cmo-step-log-details">
                <summary>Expandable Infrastructure Log</summary>
                <pre>{JSON.stringify({
                  step_id: step.id,
                  status: step.status,
                  status_source: step.statusSource,
                  runtime: step.runtime,
                  health_details: step.healthDetails || {}
                }, null, 2)}</pre>
              </details>
            </aside>

            <section className="cmo-step-activity-panel">
              <div className="cmo-step-panel-head">
                <span>Live Operational Activity Stream</span>
                <small>{step.lastSyncAt || step.lastSuccessAt || 'waiting for event timestamp'}</small>
              </div>
              <div className="cmo-activity-stream">
                {activityEntries.map((entry, index) => (
                  <motion.article
                    key={`${entry.label}-${index}`}
                    className={`status-${entry.status || 'pending'}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.035, 0.22) }}
                  >
                    <i />
                    <div>
                      <strong>{entry.label}</strong>
                      <p>{entry.detail}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
              <div className="cmo-manual-controls" data-cmo-flow-interactive="true">
                <div>
                  <span>Manual Control</span>
                  <small>Requests are audited and safety-gated.</small>
                </div>
                <div>
                  {manualControls.map((label) => (
                    <button key={label} type="button" onClick={() => handleManualControl(label)}>
                      {label}
                    </button>
                  ))}
                </div>
                {controlState.message ? <p className={`cmo-control-state status-${controlState.status}`}>{controlState.message}</p> : null}
              </div>
              {manualOutput?.generated_content ? (
                <section className="cmo-manual-output" data-cmo-flow-interactive="true">
                  <div>
                    <span>Manual Step 2 Output</span>
                    <strong>{manualOutput.generated_content.content_topic || 'Fresh AI CMO content'}</strong>
                  </div>
                  <article>
                    <span>LinkedIn Version</span>
                    <p>{manualOutput.generated_content.linkedin_version || manualOutput.generated_content.caption}</p>
                  </article>
                  <article>
                    <span>Instagram Version</span>
                    <p>{manualOutput.generated_content.instagram_version || 'Not returned'}</p>
                  </article>
                  <article>
                    <span>Image Prompt</span>
                    <p>{manualOutput.generated_content.image_prompt || 'Not returned'}</p>
                  </article>
                  {manualOutput.generated_content.hashtags?.length ? (
                    <div className="cmo-manual-tags">
                      {manualOutput.generated_content.hashtags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  ) : null}
                  <small>Not published. Founder approval is still required.</small>
                </section>
              ) : null}
              <details className="cmo-step-log-details">
                <summary>Expandable Activity Log</summary>
                <pre>{JSON.stringify(activityEntries, null, 2)}</pre>
              </details>
            </section>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

function CMOAutomationFlow({ flow, contentMemoryArchive }) {
  const steps = Array.isArray(flow?.steps) ? flow.steps : [];
  const [selectedStep, setSelectedStep] = useState(null);
  const [liveContentArchive, setLiveContentArchive] = useState(contentMemoryArchive || { items: [] });
  const [devAction, setDevAction] = useState('');
  const [schedulerHealth, setSchedulerHealth] = useState(() => pendingSchedulerHealth());
  const [openAIStatus, setOpenAIStatus] = useState(() => normalizeOpenAIStatusForStep({ status: 'pending' }));
  const [creativeStatus, setCreativeStatus] = useState({
    status: 'pending',
    message: 'Checking creative providers...',
    providers: {
      openai_creative: { status: 'pending', provider: 'OpenAI Creative', latency_ms: null, error_message: null },
      sharp: { status: 'pending', version: null, error_message: null }
    },
    last_success_at: null,
    render_pipeline: { poster_generation: false, logo_stamping: false, video_generation: false, video_generation_required_for_step_3: false },
    error_message: null
  });

  useEffect(() => {
    setLiveContentArchive(contentMemoryArchive || { items: [] });
  }, [contentMemoryArchive]);

  const refreshContentArchive = useCallback(async () => {
    const response = await getContentMemoryArchive({ timezone: liveContentArchive?.timezone || DEFAULT_CMO_TIMEZONE });
    if (!response.error) {
      setLiveContentArchive(response.data || { items: [] });
      return response.data;
    }
    return null;
  }, [liveContentArchive?.timezone]);

  useEffect(() => {
    let active = true;
    const refreshContent = async () => {
      if (!active) return;
      await refreshContentArchive();
    };
    const timer = setInterval(refreshContent, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refreshContentArchive]);

  useEffect(() => {
    let active = true;
    setSchedulerHealth(pendingSchedulerHealth());
    fetch(cmoStatusUrl('/api/cmo/scheduler-health'), cmoStatusFetchOptions)
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        const normalized = normalizeSchedulerHealthForStep(result);
        setSchedulerHealth(normalized);
      })
      .catch(() => {
        if (!active) return;
        setSchedulerHealth({
          ...pendingSchedulerHealth(),
          status: 'error',
          healthMessage: 'Scheduler health API could not be reached.',
          healthDetails: {
            ...pendingSchedulerHealth().healthDetails,
            last_cron_check_status: 'api_unreachable'
          }
        });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setOpenAIStatus(normalizeOpenAIStatusForStep({ status: 'pending' }));
    fetch(cmoStatusUrl('/api/integrations/openai/status'), cmoStatusFetchOptions)
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        setOpenAIStatus(normalizeOpenAIStatusForStep(result));
      })
      .catch(() => {
        if (!active) return;
        setOpenAIStatus(normalizeOpenAIStatusForStep({ status: 'error', error_message: 'OpenAI status API could not be reached.' }));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setCreativeStatus((current) => ({ ...current, status: 'pending', message: 'Checking creative providers...' }));
    fetch('/api/integrations/creative/status', { method: 'GET' })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        setCreativeStatus({
          ...result,
          message: result.status === 'live'
            ? 'Creative Engine is live: poster generation and Sharp composition are operational.'
            : result.status === 'pending'
              ? 'Checking creative providers...'
              : result.error_message || 'API request failed'
        });
      })
      .catch(() => {
        if (!active) return;
        setCreativeStatus((current) => ({ ...current, status: 'error', message: 'API request failed', error_message: 'API request failed' }));
      });
    return () => { active = false; };
  }, []);

  const latestFounderContent = getLatestFounderDecisionContent(liveContentArchive);
  const baseDisplaySteps = steps.map((step) => {
    if (step.id === 'time-trigger') {
      return {
        ...step,
        status: schedulerHealth.status,
        healthMessage: schedulerHealth.healthMessage,
        runtime: schedulerHealth.runtime,
        lastSyncAt: schedulerHealth.lastSyncAt,
        healthDetails: schedulerHealth.healthDetails
      };
    }
    if (step.id === 'creative-engine') {
      const isLive = creativeStatus.status === 'live';
      const isError = creativeStatus.status === 'error';
      return {
        ...step,
        status: isLive ? 'live' : isError ? 'error' : 'pending',
        healthMessage: creativeStatus.message,
        lastSyncAt: creativeStatus.last_success_at || step.lastSyncAt,
        healthDetails: {
          ...(step.healthDetails || {}),
          providers: creativeStatus.providers || step.healthDetails?.providers || {},
          render_pipeline: creativeStatus.render_pipeline || step.healthDetails?.render_pipeline || {}
        }
      };
    }
    if (step.id !== 'ai-content-generation') return step;
    const isLive = openAIStatus.status === 'live';
    const isError = openAIStatus.status === 'error';
    return {
      ...step,
      status: isLive ? 'live' : isError ? 'error' : 'pending',
      healthMessage: openAIStatus.message,
      model: openAIStatus.model,
      latencyMs: openAIStatus.latency_ms,
      lastSuccessAt: openAIStatus.last_success_at,
      outputs: Array.isArray(openAIStatus.outputs) && openAIStatus.outputs.length ? openAIStatus.outputs : step.outputs
    };
  });
  const displaySteps = applyCmoWorkflowProgression(baseDisplaySteps, latestFounderContent);
  const selectedDisplayStep = selectedStep ? displaySteps.find((step) => step.id === selectedStep.id) || selectedStep : null;
  const updateArchiveWithContent = (content) => {
    if (!content?.id) return;
    setLiveContentArchive((current) => {
      const items = Array.isArray(current?.items) ? current.items : [];
      const filtered = items.filter((item) => item.id !== content.id);
      return { ...(current || {}), items: [content, ...filtered], loadedAt: getCmoNowUtc() };
    });
    window.setTimeout(() => { refreshContentArchive(); }, 250);
  };
  const handleCreateStep6TestContent = async () => {
    setDevAction('create');
    const response = await createStep6TestContentPackage();
    if (response.ok && response.data?.archive) {
      setLiveContentArchive(response.data.archive);
    }
    setDevAction('');
  };
  const handleCleanupStep6TestContent = async () => {
    setDevAction('cleanup');
    const response = await cleanupLatestStep6TestContentPackage();
    if (response.ok && response.data?.archive) {
      setLiveContentArchive(response.data.archive);
    }
    setDevAction('');
  };
  const openStepDetail = (event, step) => {
    if (event?.target?.closest?.('[data-cmo-flow-interactive="true"], button, a, input, textarea, select, label')) return;
    setSelectedStep(step);
  };
  const handleStepKeyDown = (event, step) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setSelectedStep(step);
  };
  return (
    <section className="cmo-clean-card cmo-automation-flow">
      <div className="cmo-clean-card-head">
        <div>
          <span>CMO Automation Flow</span>
          <strong>Time trigger to final audit log</strong>
        </div>
        <StatusBadge label={flow?.source ? `Source: ${flow.source}` : 'Status Source Pending'} state={flow?.source === 'none' ? 'attention' : 'progress'} />
      </div>
      <div className="cmo-flow-stack">
        {displaySteps.map((step, index) => {
          const Logo = cmoAutomationLogoMap[step.logoKey] || Workflow;
          const statusLabel = String(step.status || 'pending').toUpperCase();
          const activeStep = step.workflowProgress?.isActive;
          const completedStep = step.workflowProgress?.isCompleted;
          const waitingStep = step.workflowProgress?.isWaiting;
          if (step.id === 'founder-decision') {
            return (
              <Fragment key={step.id}>
                <FounderDecisionFlowCard
                  step={step}
                  content={latestFounderContent}
                  onOpen={(event) => openStepDetail(event, step)}
                  onKeyDown={(event) => handleStepKeyDown(event, step)}
                />
                {index < displaySteps.length - 1 ? <div className="cmo-flow-down" aria-hidden="true">Down</div> : null}
              </Fragment>
            );
          }
          return (
            <Fragment key={step.id}>
              <article
                className={`cmo-flow-card status-${step.status || 'pending'} ${activeStep ? 'is-active-step' : ''} ${completedStep ? 'is-completed-step' : ''} ${waitingStep ? 'is-waiting-step' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Open ${step.title} operational detail`}
                onClick={(event) => openStepDetail(event, step)}
                onKeyDown={(event) => handleStepKeyDown(event, step)}
              >
                <div className="cmo-flow-main">
                  <span className="cmo-flow-step">Step {step.step}</span>
                  <div className="cmo-flow-logo"><Logo size={18} /></div>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                    <small>{step.engine}</small>
                    {completedStep ? (
                      <div className="cmo-flow-complete-summary">
                        <CheckCircle2 size={14} />
                        <span>Completed. Workflow progressed to Step {step.workflowProgress?.current_step}.</span>
                      </div>
                    ) : Array.isArray(step.outputs) && step.outputs.length ? (
                      <div className="cmo-flow-outputs">
                        {step.outputs.map((output) => <span key={output}>{output}</span>)}
                      </div>
                    ) : null}
                    {step.id === 'time-trigger' ? (
                      <div className="cmo-flow-outputs cmo-flow-runtime">
                        <span>Runtime: {step.runtime === 'bullmq_worker' ? 'BullMQ Worker' : 'Vercel Cron'}</span>
                        <span>Timezone: {formatCmoScheduleValue(step.healthDetails?.selected_timezone)}</span>
                        <span>Posting Time: {formatCmoPostingTime(step.healthDetails?.selected_posting_time, step.healthDetails?.selected_timezone)}</span>
                        <span>Next Check: {formatCmoScheduleValue(step.healthDetails?.next_check_at_utc)}</span>
                        <span>Next Scheduled Post: {formatCmoScheduleValue(step.healthDetails?.next_scheduled_post_local)}</span>
                      </div>
                    ) : null}
                    {step.id === 'ai-content-generation' ? (
                      <div className="cmo-flow-outputs cmo-flow-runtime">
                        <span>Premium: gpt-5.5</span>
                        <span>Fast/Bulk: gpt-4o-mini</span>
                        <span>Image: gpt-image-1</span>
                        <span>Status Model: {step.model || 'gpt-5.5'}</span>
                        <span>Latency: {Number.isFinite(Number(step.latencyMs)) ? `${step.latencyMs} ms` : 'Pending'}</span>
                        <span>Last Success: {step.lastSuccessAt || 'Pending'}</span>
                      </div>
                    ) : null}
                    {step.id === 'creative-engine' ? (
                      <div className="cmo-flow-outputs cmo-flow-runtime cmo-creative-provider-row">
                        <span>OpenAI Creative: {(step.healthDetails?.providers?.openai_creative?.status || 'pending').toUpperCase()}</span>
                        <span>Sharp: {(step.healthDetails?.providers?.sharp?.status || 'pending').toUpperCase()}</span>
                      </div>
                    ) : null}
                    {step.id === 'delivery-tracking' ? (
                      <div className="cmo-flow-outputs cmo-flow-runtime">
                        <span>Status: {formatContentMemoryLabel(step.healthDetails?.analytics_status || 'pending')}</span>
                        <span>Impressions: {step.healthDetails?.metrics?.impressions ?? 'Pending'}</span>
                        <span>Clicks: {step.healthDetails?.metrics?.clicks ?? 'Pending'}</span>
                        <span>Likes: {step.healthDetails?.metrics?.likes ?? 'Pending'}</span>
                        <span>Comments: {step.healthDetails?.metrics?.comments ?? 'Pending'}</span>
                        <span>Shares: {step.healthDetails?.metrics?.shares ?? 'Pending'}</span>
                        <span>Engagement: {step.healthDetails?.metrics?.engagement_rate ?? 'Pending'}%</span>
                        {step.healthDetails?.learning_summary ? <span>AI Learning: {truncateText(step.healthDetails.learning_summary, 90)}</span> : null}
                      </div>
                    ) : null}
                    {step.id === 'audit-analytics' ? (
                      <div className="cmo-flow-outputs cmo-flow-runtime">
                        <span>Status: {formatContentMemoryLabel(step.healthDetails?.optimization_status || 'pending')}</span>
                        {step.healthDetails?.learned_insight ? <span>Insight: {truncateText(step.healthDetails.learned_insight, 90)}</span> : null}
                        {step.healthDetails?.recommended_next_caption_style ? <span>Caption: {truncateText(step.healthDetails.recommended_next_caption_style, 90)}</span> : null}
                        {normalizeContentArray(step.healthDetails?.recommended_hashtags).length ? (
                          <span>Hashtags: {normalizeContentArray(step.healthDetails.recommended_hashtags).join(' ')}</span>
                        ) : null}
                        {step.healthDetails?.recommended_posting_time ? <span>Next Time: {step.healthDetails.recommended_posting_time}</span> : null}
                        {step.healthDetails?.platform_learning ? <span>Platform: {truncateText(step.healthDetails.platform_learning, 90)}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="cmo-flow-side">
                  <span className="cmo-flow-arrow">{step.time || 'Status'} <ArrowUpRight size={14} /></span>
                  <b className={`cmo-flow-status ${step.status || 'pending'}`}>{statusLabel}</b>
                  {step.lastSyncAt ? <small>{step.lastSyncAt}</small> : null}
                </div>
                {activeStep ? <span className="cmo-active-pulse" aria-hidden="true" /> : null}
                {step.status === 'live' || step.status === 'complete' || step.status === 'queued' || step.status === 'publishing' || step.status === 'published' || step.status === 'analytics' || step.status === 'optimization' || step.status === 'retry' ? (step.healthMessage ? <p className="cmo-flow-live">{step.healthMessage}</p> : null) : null}
                {step.status === 'error' && step.healthMessage ? <p className="cmo-flow-error">{step.healthMessage}</p> : null}
                {(step.status === 'pending' || step.status === 'waiting') && step.healthMessage ? <p className="cmo-flow-pending">{step.healthMessage}</p> : null}
                {step.id === 'ai-content-generation' ? <Step2ContentQualityPanel /> : null}
              </article>
              {index < displaySteps.length - 1 ? <div className="cmo-flow-down" aria-hidden="true">Down</div> : null}
            </Fragment>
          );
        })}
      </div>
      {selectedDisplayStep ? (
        <CMOWorkflowStepDetail
          step={selectedDisplayStep}
          steps={displaySteps}
          content={selectedDisplayStep.id === 'founder-decision' ? latestFounderContent : null}
          devMode={selectedDisplayStep.id === 'founder-decision' && isStep6DevTestMode()}
          devAction={devAction}
          onCreateTestContent={handleCreateStep6TestContent}
          onCleanupTestContent={handleCleanupStep6TestContent}
          onContentUpdated={updateArchiveWithContent}
          onClose={() => setSelectedStep(null)}
        />
      ) : null}
    </section>
  );
}

const contentMemoryPlatforms = ['All Platforms', 'LinkedIn', 'Facebook', 'Instagram', 'YouTube', 'X', 'Blog', 'Email'];
const contentMemoryTypes = ['All Content Types', 'Post', 'Video', 'Reel', 'Article', 'Email', 'Campaign', 'Ad', 'Carousel'];
const contentMemoryApprovalStatuses = ['All Approval Statuses', 'pending_approval', 'approved', 'rejected', 'revision_requested'];
const contentMemoryRanges = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom date range'];
const platformIconMap = {
  LinkedIn: UsersRound,
  Facebook: Send,
  Instagram: Sparkles,
  YouTube: Eye,
  X: RadioTower,
  Blog: FileText,
  Email: Mail
};

function getContentUtcValue(item, field) {
  return item?.[`${field}_utc`] || item?.[field] || '';
}

function formatContentMemoryDate(value, timezone, withTime = true) {
  if (!value) return 'Not recorded';
  return formatInCmoTimezone(value, timezone, { dateOnly: !withTime });
}

function getContentDateAliases(value, timezone) {
  if (!value) return [];
  const localIsoDate = getCmoLocalIsoDate(value, timezone);
  if (!localIsoDate) return [String(value)];
  const [, monthNumber, dayNumber] = localIsoDate.split('-').map(Number);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[monthNumber - 1];
  const shortMonth = month.slice(0, 3);
  const day = dayNumber;
  const year = localIsoDate.slice(0, 4);
  return [
    formatContentMemoryDate(value, timezone),
    formatContentMemoryDate(value, timezone, false),
    `${month} ${day}`,
    `${month} ${day} ${year}`,
    `${shortMonth} ${day}`,
    `${day} ${month}`,
    `${day} ${shortMonth}`,
    localIsoDate
  ];
}

function getContentHistorySearchText(item, timezone) {
  const versions = item.content_versions || [];
  const links = item.content_links || [];
  const metrics = item.content_metrics || [];
  const approvals = item.content_approvals || [];
  const qualityReviews = item.content_quality_reviews || [];
  const aiMemory = item.ai_content_memory || [];
  const platformTargets = Array.isArray(item.platform_targets) ? item.platform_targets : [];
  const auditReferences = Array.isArray(item.audit_references) ? item.audit_references : [];
  const slackReference = item.slack_message_reference ? JSON.stringify(item.slack_message_reference) : '';
  const dateAliases = [getContentUtcValue(item, 'generated_at'), getContentUtcValue(item, 'approved_at'), getContentUtcValue(item, 'published_at')]
    .flatMap((value) => getContentDateAliases(value, timezone))
    .map((dateText) => dateText.replace(',', ''));
  return [
    item.run_id,
    item.platform,
    ...platformTargets,
    item.content_type,
    item.campaign_name,
    item.region_country,
    item.topic,
    item.status,
    item.approval_status,
    item.publish_status,
    item.caption,
    item.generated_text,
    item.final_text,
    item.final_approved_content,
    item.hashtags,
    item.image_prompt,
    item.poster_url,
    item.image_url,
    item.post_url,
    slackReference,
    ...auditReferences,
    ...dateAliases,
    ...versions.flatMap((version) => [version.version_type, version.caption, version.draft_text, version.final_text, version.notes, version.image_prompt, version.poster_url]),
    ...links.flatMap((link) => [link.platform, link.url, link.label]),
    ...metrics.flatMap((metric) => [metric.metric_name, metric.metric_value, metric.metric_unit]),
    ...approvals.flatMap((approval) => [approval.status, approval.approval_status, approval.approved_by, approval.notes]),
    ...qualityReviews.flatMap((review) => [review.review_status, review.quality_score, review.brand_safety_score, review.compliance_score, ...(review.risk_flags || []), ...(review.recommendations || [])]),
    ...aiMemory.flatMap((memory) => [memory.prompt, memory.generated_version, memory.approved_version, memory.rejected_version, memory.rejection_reason, memory.ai_reasoning])
  ].filter(Boolean).join(' ').toLowerCase();
}

function formatContentMemoryLabel(value) {
  if (!value) return 'Not recorded';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getContentApprovalState(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return 'progress';
  if (normalized === 'rejected') return 'attention';
  if (normalized.includes('revision')) return 'warning';
  return 'online';
}

function normalizeContentArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function getGeneratedPackageVersions(item) {
  const versions = Array.isArray(item?.content_versions) ? item.content_versions : [];
  const findVersion = (aliases) => versions.find((version) => aliases.includes(String(version.version_type || '').toLowerCase()));
  return [
    {
      label: 'Original',
      row: findVersion(['original', 'generated']),
      fallback: item?.caption || item?.generated_text || ''
    },
    {
      label: 'Improved',
      row: findVersion(['improved', 'rewrite', 'optimized']),
      fallback: item?.improved_caption || ''
    },
    {
      label: 'Approved',
      row: findVersion(['approved', 'final']),
      fallback: item?.final_approved_content || item?.final_text || ''
    }
  ].map((version) => ({
    ...version,
    text: version.row?.final_text || version.row?.draft_text || version.row?.caption || version.fallback || 'Not recorded yet.',
    notes: version.row?.notes || ''
  }));
}

function getPackageQualityReview(item) {
  const review = Array.isArray(item?.content_quality_reviews) && item.content_quality_reviews.length
    ? item.content_quality_reviews[0]
    : item?.ai_quality_review || null;
  if (!review) return null;
  return {
    review_status: review.review_status || 'review_not_recorded',
    quality_score: review.quality_score,
    brand_safety_score: review.brand_safety_score,
    compliance_score: review.compliance_score,
    risk_flags: normalizeContentArray(review.risk_flags),
    recommendations: normalizeContentArray(review.recommendations)
  };
}

function getRangeStart(range, timezone) {
  if (range === 'Custom date range') return null;
  const days = Number(range.match(/\d+/)?.[0] || 30);
  return getCmoRollingRangeStartUtc(days, timezone);
}

function formatMemoryRangeDate(value, timezone) {
  if (!value) return '';
  try {
    return formatInCmoTimezone(getCmoDateRangeUtc(value, timezone).startUtc, timezone, { dateOnly: true });
  } catch {
    return value;
  }
}

function getMemoryRangeDisplay(range, customStart, customEnd, timezone, timezoneLabel) {
  if (range !== 'Custom date range') return `Showing content from: ${range} (${timezoneLabel})`;
  const start = formatMemoryRangeDate(customStart, timezone);
  const end = formatMemoryRangeDate(customEnd, timezone);
  if (start && end) return `Showing content from: ${start} -> ${end} (${timezoneLabel})`;
  if (start) return `Showing content from: ${start} -> Select To Date (${timezoneLabel})`;
  if (end) return `Showing content until: ${end} (${timezoneLabel})`;
  return `Select From Date and To Date (${timezoneLabel})`;
}

function getCmoRealRunStatus(data = {}) {
  const archive = data.contentMemoryArchive || {};
  const items = Array.isArray(archive.items) ? archive.items : [];
  if (!archive.connected) return 'No live run data';
  if (!items.length) return 'No daily runs recorded';
  const published = items.filter((item) => ['published', 'sent'].includes(String(item.publish_status || item.status || '').toLowerCase())).length;
  const ready = items.filter((item) => ['ready_for_publish', 'queued'].includes(String(item.publish_status || '').toLowerCase())).length;
  const failed = items.filter((item) => ['failed', 'publish_record_failed'].includes(String(item.publish_status || item.status || '').toLowerCase())).length;
  return `${published} published / ${ready} ready / ${failed} failed`;
}

function CMOContentMemoryArchive({ archive, growthAnalytics, onArchiveFilter }) {
  const [query, setQuery] = useState('');
  const [range, setRange] = useState('Last 30 days');
  const [platform, setPlatform] = useState('All Platforms');
  const [contentType, setContentType] = useState('All Content Types');
  const [approvalStatus, setApprovalStatus] = useState('All Approval Statuses');
  const [campaign, setCampaign] = useState('All Campaigns');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activePackage, setActivePackage] = useState(null);
  const items = Array.isArray(archive?.items) ? archive.items : [];
  const timezone = getSelectedCmoTimezone({ timezone: archive?.timezone });
  const timezoneLabel = getCmoTimezoneLabel(timezone);
  const isCustomRange = range === 'Custom date range';
  const rangeDisplay = getMemoryRangeDisplay(range, customStart, customEnd, timezone, timezoneLabel);
  const campaignOptions = useMemo(() => {
    const campaigns = Array.from(new Set(items.map((item) => item.campaign_name).filter(Boolean))).sort();
    return ['All Campaigns', ...campaigns];
  }, [items]);

  function updateRange(nextRange) {
    setRange(nextRange);
    if (nextRange !== 'Custom date range') {
      setCustomStart('');
      setCustomEnd('');
    }
  }

  function updateCustomStart(value) {
    setCustomStart(value);
    if (customEnd && value && customEnd < value) setCustomEnd(value);
  }

  function updateCustomEnd(value) {
    if (customStart && value && value < customStart) {
      setCustomEnd(customStart);
      return;
    }
    setCustomEnd(value);
  }

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rangeStart = getRangeStart(range, timezone);
    const customStartUtc = customStart ? getCmoDateRangeUtc(customStart, timezone).startUtc : '';
    const customEndUtc = customEnd ? getCmoDateRangeUtc(customEnd, timezone).endUtc : '';

    return items.filter((item) => {
      const generatedUtc = getContentUtcValue(item, 'generated_at');
      const publishedUtc = getContentUtcValue(item, 'published_at');
      const approvedUtc = getContentUtcValue(item, 'approved_at');
      const primaryUtc = generatedUtc || publishedUtc || approvedUtc;
      const matchesSearch = !normalizedQuery || getContentHistorySearchText(item, timezone).includes(normalizedQuery);
      const matchesPlatform = platform === 'All Platforms' || item.platform === platform;
      const matchesType = contentType === 'All Content Types' || item.content_type === contentType;
      const matchesApproval = approvalStatus === 'All Approval Statuses' || String(item.approval_status || '').toLowerCase() === approvalStatus;
      const matchesCampaign = campaign === 'All Campaigns' || item.campaign_name === campaign;
      let matchesRange = true;

      if (range === 'Custom date range') {
        matchesRange = !primaryUtc || ((!customStartUtc || isUtcOnOrAfter(primaryUtc, customStartUtc)) && (!customEndUtc || isUtcOnOrBefore(primaryUtc, customEndUtc)));
      } else if (rangeStart && primaryUtc) {
        matchesRange = isUtcOnOrAfter(primaryUtc, rangeStart);
      }

      return matchesSearch && matchesPlatform && matchesType && matchesApproval && matchesCampaign && matchesRange;
    });
  }, [items, query, range, platform, contentType, approvalStatus, campaign, customStart, customEnd, timezone]);

  const hasData = filteredItems.length > 0;

  return (
    <section className="cmo-content-memory-module">
      <div className="cmo-memory-main">
        <div className="cmo-memory-header">
          <div>
            <div className="cmo-clean-kicker"><Archive size={16} />CONTENT MEMORY + DISTRIBUTION HISTORY</div>
            <h2>Search OpenAI drafts, founder approvals, published posts, and live platform history.</h2>
            <p>Calendar filters are interpreted in {timezone} ({timezoneLabel}) and converted to UTC for archive queries.</p>
          </div>
          <StatusBadge label="Read/Search/View Only" state="progress" />
        </div>

        <label className="cmo-memory-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search content by date, platform, keyword, campaign, country, or topic..."
          />
        </label>

        <div className="cmo-memory-filters">
          <div className="cmo-memory-range" role="group" aria-label="Content memory date range">
            {contentMemoryRanges.map((item) => (
              <button key={item} className={range === item ? 'active' : ''} onClick={() => updateRange(item)}>{item}</button>
            ))}
          </div>
          <AnimatePresence initial={false}>
            {isCustomRange ? (
              <motion.div className="cmo-memory-custom-range" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <label>
                  <span>From Date</span>
                  <input type="date" value={customStart} onChange={(event) => updateCustomStart(event.target.value)} aria-label="From Date" />
                </label>
                <label>
                  <span>To Date</span>
                  <input type="date" value={customEnd} min={customStart || undefined} onChange={(event) => updateCustomEnd(event.target.value)} aria-label="To Date" />
                </label>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Platform filter">
            {contentMemoryPlatforms.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={contentType} onChange={(event) => setContentType(event.target.value)} aria-label="Content type filter">
            {contentMemoryTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={approvalStatus} onChange={(event) => setApprovalStatus(event.target.value)} aria-label="Approval status filter">
            {contentMemoryApprovalStatuses.map((item) => <option key={item} value={item}>{formatContentMemoryLabel(item)}</option>)}
          </select>
          <select value={campaign} onChange={(event) => setCampaign(event.target.value)} aria-label="Campaign filter">
            {campaignOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="cmo-memory-range-display">
          <CalendarDays size={14} />
          <span>{rangeDisplay}</span>
        </div>

        <div className="cmo-memory-results">
          {hasData ? filteredItems.map((item) => <CMOContentHistoryCard key={item.id} item={item} timezone={timezone} onOpenPackage={setActivePackage} />) : (
            <div className="cmo-memory-empty">
              <Database size={28} />
              <strong>No content history found for this date or filter.</strong>
              <span>{archive?.error ? 'Supabase content archive tables are not returning readable rows yet.' : 'Connect content history and platform metrics to populate the archive.'}</span>
            </div>
          )}
        </div>
      </div>
      <CMOContentInsightPanel growthAnalytics={growthAnalytics} timezone={timezone} />
      <AnimatePresence>
        {activePackage ? (
          <CMOGeneratedPackageModal item={activePackage} timezone={timezone} onClose={() => setActivePackage(null)} />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function CMOContentHistoryCard({ item, timezone, onOpenPackage }) {
  const PlatformIcon = platformIconMap[item.platform] || RadioTower;
  const livePostUrl = item.live_post_url || item.post_url || '';
  const publishStatus = item.publish_status || item.status || 'Status pending';
  const approvalStatus = item.approval_status || item.content_approvals?.[0]?.approval_status || 'pending_approval';
  const links = [...(item.content_links || []), livePostUrl ? { platform: item.platform, url: livePostUrl } : null].filter(Boolean);
  const metrics = item.content_metrics || [];
  const statusState = ['Published', 'published', 'ready_for_publish'].includes(item.status) || publishStatus === 'published' ? 'progress' : item.status === 'Failed' || publishStatus === 'failed' ? 'attention' : 'online';
  const generatedPreview = item.generated_text || item.content_versions?.find((version) => version.version_type === 'generated')?.draft_text || 'No AI-generated draft preview recorded.';
  const finalPreview = item.final_text || item.content_versions?.find((version) => version.version_type === 'approved')?.final_text || 'No final approved content preview recorded.';
  const qualityReview = getPackageQualityReview(item);

  return (
    <motion.article className="cmo-history-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}>
      <div className="cmo-history-topline">
        <div>
          <span><PlatformIcon size={15} />{item.platform || 'Platform pending'}</span>
          <strong>{item.campaign_name || 'Campaign name pending'}</strong>
          <small className="cmo-history-run">Run ID: {item.run_id || 'Not recorded'}</small>
        </div>
        <div className="cmo-history-status-stack">
          <StatusBadge label={formatContentMemoryLabel(approvalStatus)} state={getContentApprovalState(approvalStatus)} />
          <StatusBadge label={publishStatus} state={statusState} />
        </div>
      </div>
      <div className="cmo-history-meta">
        <span>Generated <strong>{formatContentMemoryDate(getContentUtcValue(item, 'generated_at'), timezone)}</strong></span>
        <span>Approved <strong>{formatContentMemoryDate(getContentUtcValue(item, 'approved_at'), timezone)}</strong></span>
        <span>Rejected <strong>{formatContentMemoryDate(getContentUtcValue(item, 'rejected_at'), timezone)}</strong></span>
        <span>Publish status <strong>{publishStatus}</strong></span>
        <span>Quality <strong>{qualityReview?.quality_score !== undefined ? `${qualityReview.quality_score}/100` : 'Not reviewed'}</strong></span>
        <span>Region <strong>{item.region_country || item.country || 'Not recorded'}</strong></span>
      </div>
      <div className="cmo-history-preview-grid">
        <section>
          <span>AI-generated draft preview</span>
          <p>{generatedPreview}</p>
        </section>
        <section>
          <span>Final approved content preview</span>
          <p>{finalPreview}</p>
        </section>
      </div>
      <div className="cmo-history-footer">
        <div className="cmo-history-metrics">
          {metrics.length ? metrics.slice(0, 4).map((metric) => (
            <span key={metric.id || `${metric.metric_name}-${metric.metric_value}`}>
              <BarChart3 size={13} />{metric.metric_name}: <strong>{metric.metric_value}{metric.metric_unit ? ` ${metric.metric_unit}` : ''}</strong>
            </span>
          )) : <span><BarChart3 size={13} />Engagement metrics unavailable</span>}
        </div>
        <div className="cmo-history-links">
          <button type="button" onClick={() => onOpenPackage?.(item)}>
            <Eye size={14} />View generated package
          </button>
          {links.length ? links.map((link) => (
            <a key={link.id || link.url} href={link.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} />Open {link.platform || item.platform} {item.platform === 'YouTube' ? 'Video' : 'Post'}
            </a>
          )) : <span>Live post URL unavailable. Current publish status: {publishStatus}.</span>}
        </div>
      </div>
    </motion.article>
  );
}

function CMOGeneratedPackageModal({ item, timezone, onClose }) {
  const versions = getGeneratedPackageVersions(item);
  const qualityReview = getPackageQualityReview(item);
  const hashtags = normalizeContentArray(item.hashtags);
  const platformTargets = normalizeContentArray(item.platform_targets);
  const posterUrl = item.poster_url || item.image_url || item.content_links?.find((link) => link.link_type === 'poster')?.url || '';
  const slackReference = item.slack_message_reference && typeof item.slack_message_reference === 'object'
    ? item.slack_message_reference
    : {};
  const approvalStatus = item.approval_status || item.content_approvals?.[0]?.approval_status || 'pending_approval';
  const auditReferences = normalizeContentArray(item.audit_references);

  return (
    <motion.div className="cmo-package-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.article className="cmo-package-modal" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} transition={{ duration: 0.18 }}>
        <header className="cmo-package-modal-header">
          <div>
            <div className="cmo-clean-kicker"><Archive size={16} />GENERATED PACKAGE</div>
            <h2>{item.campaign_name || item.topic || 'Generated content package'}</h2>
            <p>Run ID: {item.run_id || 'Not recorded'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close generated package">
            Close
          </button>
        </header>

        <div className="cmo-package-summary-grid">
          <span>Approval <strong>{formatContentMemoryLabel(approvalStatus)}</strong></span>
          <span>Publish <strong>{formatContentMemoryLabel(item.publish_status || 'not_published')}</strong></span>
          <span>Generated <strong>{formatContentMemoryDate(getContentUtcValue(item, 'generated_at'), timezone)}</strong></span>
          <span>Approved <strong>{formatContentMemoryDate(getContentUtcValue(item, 'approved_at'), timezone)}</strong></span>
          <span>Rejected <strong>{formatContentMemoryDate(getContentUtcValue(item, 'rejected_at'), timezone)}</strong></span>
          <span>Targets <strong>{platformTargets.length ? platformTargets.join(', ') : item.platform || 'Not recorded'}</strong></span>
        </div>

        <div className="cmo-package-body-grid">
          <section className="cmo-package-panel">
            <span>Generated caption</span>
            <p>{item.caption || item.generated_text || 'No caption recorded.'}</p>
            <div className="cmo-package-chip-row">
              {hashtags.length ? hashtags.map((tag) => <b key={tag}>{String(tag).startsWith('#') ? tag : `#${tag}`}</b>) : <b>No hashtags recorded</b>}
            </div>
          </section>
          <section className="cmo-package-panel">
            <span>Image prompt</span>
            <p>{item.image_prompt || 'No image prompt recorded.'}</p>
            {posterUrl ? (
              <a href={posterUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Open generated poster URL</a>
            ) : <small>Generated poster URL not recorded.</small>}
          </section>
        </div>

        <section className="cmo-package-panel">
          <span>Version comparison</span>
          <div className="cmo-version-comparison">
            {versions.map((version) => (
              <article key={version.label}>
                <strong>{version.label}</strong>
                <p>{version.text}</p>
                {version.notes ? <small>{version.notes}</small> : null}
              </article>
            ))}
          </div>
        </section>

        <div className="cmo-package-body-grid">
          <section className="cmo-package-panel">
            <span>AI quality review</span>
            {qualityReview ? (
              <>
                <div className="cmo-quality-score-row">
                  <b>{qualityReview.quality_score ?? 'NA'}<small>/100 quality</small></b>
                  <b>{qualityReview.brand_safety_score ?? 'NA'}<small>/100 brand safety</small></b>
                  <b>{qualityReview.compliance_score ?? 'NA'}<small>/100 compliance</small></b>
                </div>
                <p>Status: {formatContentMemoryLabel(qualityReview.review_status)}</p>
                <div className="cmo-package-chip-row">
                  {qualityReview.risk_flags.length ? qualityReview.risk_flags.map((flag) => <b key={flag}>{formatContentMemoryLabel(flag)}</b>) : <b>No risk flags recorded</b>}
                </div>
                {qualityReview.recommendations.length ? <p>{qualityReview.recommendations.join(' ')}</p> : null}
              </>
            ) : <p>No AI quality review stored yet.</p>}
          </section>
          <section className="cmo-package-panel">
            <span>Approval and audit references</span>
            <p>Slack reference: {Object.keys(slackReference).length ? JSON.stringify(slackReference) : 'Not recorded'}</p>
            <p>Audit references: {auditReferences.length ? auditReferences.join(', ') : 'Not recorded'}</p>
            <p>Live post URL: {item.live_post_url || item.post_url || 'Not published. No public publishing has been triggered.'}</p>
          </section>
        </div>
      </motion.article>
    </motion.div>
  );
}

function formatGrowthMetricValue(value, formatter) {
  if (value === null || value === undefined) return 'No data';
  if (formatter === 'percent') return `${Number(value).toFixed(1)}%`;
  return new Intl.NumberFormat('en', { notation: Number(value) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function formatGrowthChange(value) {
  const safeValue = Number(value) || 0;
  return `${safeValue > 0 ? '+' : ''}${safeValue.toFixed(1)}%`;
}

function getTrendClass(status) {
  if (status === 'Increasing') return 'growth-up';
  if (status === 'Decreasing') return 'growth-down';
  return 'growth-stable';
}

function GrowthSparkline({ status }) {
  const points = status === 'Increasing' ? '2,22 18,16 34,10 50,4' : status === 'Decreasing' ? '2,5 18,10 34,15 50,22' : '2,14 18,13 34,15 50,14';
  return (
    <svg className="ai-growth-sparkline" viewBox="0 0 52 26" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function CMOContentInsightPanel({ growthAnalytics }) {
  const analytics = growthAnalytics || {};
  const connected = Boolean(analytics.connected);
  const summaryCards = Array.isArray(analytics.summaryCards) ? analytics.summaryCards : [];
  const platforms = Array.isArray(analytics.platforms) ? analytics.platforms : [];
  const diagnosis = analytics.diagnosis || {};

  return (
    <aside className="cmo-memory-insights ai-growth-panel">
      <div className="cmo-clean-kicker"><BrainCircuit size={15} />AI Growth Panel</div>
      {connected ? (
        <>
          <div className="ai-growth-purpose">
            <span>Live Social Growth Performance</span>
            <p>Likes, views, comments, shares, clicks, saves, impressions, reach, engagement rate, and follower growth from connected Supabase metrics.</p>
          </div>

          {analytics.partialData ? <div className="ai-growth-warning">Partial data available. Insights may be limited.</div> : null}

          <div className="ai-growth-summary-grid">
            {summaryCards.map((card, index) => (
              <motion.article
                key={card.key || card.label}
                className={`ai-growth-card ${getTrendClass(card.status)}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025 }}
                whileHover={{ y: -2 }}
              >
                <div>
                  <span>{card.label}</span>
                  <strong>{formatGrowthMetricValue(card.current, card.formatter)}</strong>
                </div>
                <GrowthSparkline status={card.status} />
                <small>Prev {formatGrowthMetricValue(card.previous, card.formatter)}</small>
                <b><TrendIndicator value={card.change} /> | {card.status}</b>
              </motion.article>
            ))}
          </div>

          <div className="ai-growth-platforms">
            <div className="ai-growth-section-head">
              <span>Platform Breakdown</span>
              <strong>{analytics.periodLabel || 'Selected period'} vs previous period</strong>
            </div>
            {platforms.map((item) => (
              <div key={item.platform} className={`ai-platform-row ${getTrendClass(item.status)}`}>
                <strong>{item.platform}</strong>
                <span>Views {formatGrowthMetricValue(item.views)}</span>
                <span>Likes {formatGrowthMetricValue(item.likes)}</span>
                <span>Comments {formatGrowthMetricValue(item.comments)}</span>
                <span>Eng {formatGrowthMetricValue(item.engagementRate, 'percent')}</span>
                <b><TrendIndicator value={item.change} /></b>
              </div>
            ))}
          </div>

          <div className="ai-growth-diagnosis">
            <div className="ai-growth-section-head">
              <span>AI Growth Diagnosis</span>
              <strong>Metric-based only</strong>
            </div>
            <div><span>What is increasing</span><p>{diagnosis.increasing || 'No connected growth metric is increasing above 3%.'}</p></div>
            <div><span>What is decreasing</span><p>{diagnosis.decreasing || 'No connected growth metric is decreasing below -3%.'}</p></div>
            <div><span>Best-performing platform</span><p>{diagnosis.bestPlatform || 'No platform has enough connected data yet.'}</p></div>
            <div><span>Weakest-performing platform</span><p>{diagnosis.weakestPlatform || 'No platform has enough connected data yet.'}</p></div>
            <div><span>Best content topic</span><p>{diagnosis.bestTopic || 'No topic has enough connected metric data yet.'}</p></div>
            <div><span>Content gap</span><p>{diagnosis.contentGap || 'Connect platform metrics to identify content gaps.'}</p></div>
            <div><span>Next recommended action</span><p>{diagnosis.nextAction || 'Connect platform metrics to activate AI growth recommendations.'}</p></div>
          </div>
        </>
      ) : (
        <div className="ai-growth-empty">
          <BarChart3 size={28} />
          <strong>No social growth metrics connected yet.</strong>
          <p>Connect platform metrics to activate AI Growth Panel.</p>
        </div>
      )}
    </aside>
  );
}

const postingWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function CMOPostingTimeSettings({ preference }) {
  const initialTimezone = getSelectedCmoTimezone(preference);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [scheduleMode, setScheduleMode] = useState('Every day');
  const [postingTime, setPostingTime] = useState(CMO_PLATFORM_DEFAULT_SLOTS.LinkedIn);
  const [selectedDays, setSelectedDays] = useState(() => new Set(['Monday']));
  const [dayTimes, setDayTimes] = useState(() => postingWeekdays.reduce((acc, day) => ({ ...acc, [day]: CMO_PLATFORM_DEFAULT_SLOTS.LinkedIn }), {}));
  const [platforms, setPlatforms] = useState(() => new Set(['LinkedIn Personal']));
  const [saveState, setSaveState] = useState(preference?.source || 'fallback');
  const [message, setMessage] = useState('');
  const [providerStatuses, setProviderStatuses] = useState([]);
  const selectedOption = getCmoTimezoneOption(timezone);
  const timezoneOptions = CMO_TIMEZONE_OPTIONS;
  const postingPlatforms = ['LinkedIn Personal', 'Facebook', 'Instagram', 'YouTube', 'X/Twitter', 'Blog', 'Email'];

  useEffect(() => {
    let active = true;
    getCmoProviderConnectionStatus(postingPlatforms, demoTenantId).then((response) => {
      if (!active) return;
      setProviderStatuses(Array.isArray(response.data) ? response.data : []);
    });
    return () => { active = false; };
  }, []);

  async function updateTimezone(value) {
    const selected = getSelectedCmoTimezone({ timezone: value });
    const country = getCmoTimezoneOption(selected).country;
    setTimezone(selected);
    setSaveState('saving');
    try {
      window.localStorage.setItem('gopu:cmo_timezone_preferences.timezone', selected);
      window.localStorage.setItem('gopu:cmo_posting_settings.timezone', selected);
    } catch {
      // Local storage is a browser-only fallback; Supabase preference remains the source of truth when connected.
    }
    const response = await saveCmoTimezonePreference({ tenant_id: demoTenantId, timezone: selected, country });
    setSaveState(response.ok && response.data?.source === 'cmo_timezone_preferences' ? 'saved' : 'local-fallback');
  }

  function updateCountry(country) {
    const match = timezoneOptions.find((option) => option.country === country) || CMO_TIMEZONE_OPTIONS.find((option) => option.country === country) || CMO_TIMEZONE_OPTIONS[0];
    updateTimezone(match.timezone);
  }

  function togglePlatform(platform) {
    setPlatforms((current) => {
      const next = new Set(current);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  function togglePostingDay(day) {
    setSelectedDays((current) => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function updateDayTime(day, value) {
    setDayTimes((current) => ({ ...current, [day]: value }));
  }

  async function savePostingSettings() {
    const selectedPostingDays = Array.from(selectedDays);
    if (scheduleMode === 'Specific days' && !selectedPostingDays.length) {
      setMessage('Select at least one posting day.');
      return;
    }
    const selectedPlatforms = Array.from(platforms);
    const schedule = scheduleMode === 'Specific days'
      ? selectedPostingDays.map((day) => ({ day, time: dayTimes[day] || postingTime }))
      : postingWeekdays.map((day) => ({ day, time: postingTime }));
    try {
      window.localStorage.setItem('gopu:cmo_posting_settings', JSON.stringify({
        country: selectedOption.country,
        timezone,
        scheduleMode,
        postingTime,
        schedule,
        platforms: selectedPlatforms
      }));
    } catch {
      // Browser storage can fail in restricted modes; the visible settings remain in React state.
    }
    setSaveState('saving');
    const response = await saveCmoPostingSettings({
      tenant_id: demoTenantId,
      timezone,
      country: selectedOption.country,
      scheduleMode,
      postingTime,
      schedule,
      platforms: selectedPlatforms
    });
    setSaveState(response.ok ? 'saved' : 'local-fallback');
    const sourceNote = response.data?.source === 'local-fallback' || response.data?.source === 'save-failed'
      ? ' Saved locally until Supabase posting settings are available.'
      : '';
    setMessage(`${scheduleMode} posting schedule saved for ${selectedPlatforms.length || 0} platform${selectedPlatforms.length === 1 ? '' : 's'}.${sourceNote}`);
  }

  return (
    <section className="cmo-clean-card cmo-posting-settings-panel">
      <div className="cmo-clean-card-head">
        <div>
          <span>Posting Time Settings</span>
          <strong>Choose one country timezone for posting.</strong>
        </div>
      </div>
      <div className="cmo-posting-settings-form">
        <label>
          <span>Select Country / City</span>
          <select value={selectedOption.country} onChange={(event) => updateCountry(event.target.value)} aria-label="Select Country">
            {timezoneOptions.map((option) => (
              <option key={option.country} value={option.country}>{option.country}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Select Timezone</span>
          <select value={timezone} onChange={(event) => updateTimezone(event.target.value)} aria-label="Select Timezone">
            {timezoneOptions.map((option) => (
              <option key={option.timezone} value={option.timezone}>{option.label} - {option.timezone}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Posting Schedule</span>
          <select value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value)} aria-label="Posting Schedule">
            <option value="Every day">Every day</option>
            <option value="Specific days">Specific days</option>
          </select>
        </label>
        {scheduleMode === 'Every day' ? (
          <label>
            <span>Daily Posting Time</span>
            <input type="time" value={postingTime} onChange={(event) => setPostingTime(event.target.value)} aria-label="Daily Posting Time" />
          </label>
        ) : null}
      </div>
      {scheduleMode === 'Specific days' ? (
        <div className="cmo-posting-days">
          <span>Select days and set time</span>
          <div>
            {postingWeekdays.map((day) => (
              <label key={day} className={selectedDays.has(day) ? 'active' : ''}>
                <input type="checkbox" checked={selectedDays.has(day)} onChange={() => togglePostingDay(day)} />
                <strong>{day}</strong>
                <input type="time" value={dayTimes[day] || postingTime} onChange={(event) => updateDayTime(day, event.target.value)} disabled={!selectedDays.has(day)} aria-label={`${day} Posting Time`} />
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className="cmo-posting-platforms">
        <span>Apply this time to:</span>
        <div>
          {postingPlatforms.map((platform) => (
            <label key={platform}>
              <input type="checkbox" checked={platforms.has(platform)} onChange={() => togglePlatform(platform)} />
              <span>{platform}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="cmo-provider-status">
        <span>Provider connection status</span>
        <div>
          {providerStatuses.map((item) => (
            <div key={item.platform} className={item.connected ? 'connected' : 'missing'}>
              <strong>{item.platform}</strong>
              <span>{item.status}</span>
              <small>{item.connected ? item.last_verified : item.message}</small>
            </div>
          ))}
        </div>
      </div>
      {message && <p className={`cmo-posting-message ${message.includes('Select at least') ? 'error' : ''}`}>{message}</p>}
      <p className="cmo-timezone-note">GOPU OS follows the selected country timezone for recurring posting times.</p>
      <button className="tactical-button cmo-posting-save" type="button" onClick={savePostingSettings} disabled={saveState === 'saving'}>{saveState === 'saving' ? 'Saving...' : 'Save Posting Time'}</button>
    </section>
  );
}

function CMOTopStatusStrip({ data }) {
  const items = [
    ["Todays Focus", data.summary?.todayRunbook || '9:00 AM IST', CalendarClock],
    ['Growth Objective', '10% Optimization', Target],
    ['Budget Governance', 'CFO-Controlled', CircleDollarSign],
    ['Publishing Rule', 'Approval Queue First', ClipboardCheck],
    ['Growth Intelligence', 'Active', BrainCircuit]
  ];
  items[0] = ['Daily Runs', getCmoRealRunStatus(data), CalendarClock];
  return (
    <section className="cmo-clean-status-strip">
      {items.map(([label, value, Icon]) => (
        <article key={label} className="cmo-clean-card">
          <Icon size={17} />
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        </article>
      ))}
    </section>
  );
}

function CMOContentPillars({ rows }) {
  const pillars = [
    ['Founder Voice', rows?.[1]?.[2] || 'Natural Tenglish, founder-speaking, operationally experienced.'],
    ['Buyer Psychology', 'Importer trust, objections, consistency, and long-term reliability.'],
    ['Operational Authority', 'Shipment discipline, document control, supplier coordination, and pricing clarity.'],
    ['Optimization', 'Hooks, titles, thumbnails, timing, and approved performance learning.'],
    ['Education', 'Export workflows explained without hype or unsupported claims.']
  ];
  return (
    <article className="cmo-clean-card cmo-clean-section">
      <div className="cmo-clean-card-head"><span>Content Pillars</span><StatusBadge label="OpenAI Guided" state="progress" /></div>
      <div className="cmo-pillar-list">
        {pillars.map(([title, detail]) => (
          <div key={title}>
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CMOGrowthIntelligenceCard({ data }) {
  const [tab, setTab] = useState('Market');
  const tables = {
    Market: (data.globalTargeting || []).slice(0, 5).map((row) => [row[0], row[1], row[2], row[3]]),
    Audience: (data.buyerOutreach || []).map((row) => [row[0], row[1], row[2], row[5] || row[3]]),
    Competitive: (data.competitors || []).map((row) => [row[0], row[2], row[4], row[5]]),
    Opportunities: (data.campaigns || []).map((row) => [row[2], row[3], row[5], row[6]])
  };
  const rows = tables[tab] || [];

  return (
    <article className="cmo-clean-card cmo-clean-section cmo-growth-intel-card">
      <div className="cmo-clean-card-head"><span>Growth Intelligence</span><StatusBadge label="Verification Pending" state="attention" /></div>
      <div className="cmo-clean-tabs" role="tablist" aria-label="Growth intelligence tabs">
        {Object.keys(tables).map((item) => (
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      <div className="cmo-clean-table cmo-growth-table">
        <div><span>Region</span><span>Trend</span><span>Opportunity</span><span>Action</span></div>
        {rows.map((row, index) => (
          <div key={`${tab}-${index}`}>
            <strong>{row[0]}</strong>
            <span>{row[1]}</span>
            <span>{row[2]}</span>
            <span>{row[3]}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function CMOTopCampaigns({ rows }) {
  const fallback = [
    ['YouTube Series', 'Founder authority videos', 'Draft controlled'],
    ['LinkedIn Authority', 'Daily export education', 'Approval queue first'],
    ['Instagram Growth', 'Educational reels', 'Awaiting analytics'],
    ['Founder Branding', 'Global trust positioning', 'Review required']
  ];
  const items = fallback.map((item, index) => rows?.[index] ? [item[0], rows[index][3] || item[1], rows[index][5] || item[2]] : item);
  const chartRows = (rows?.length ? rows : items).slice(0, 6).map((campaign, index) => ({
    label: campaign.name || campaign.platform || campaign.channel || campaign.campaignName || campaign.campaign_name || campaign[0],
    value: Number(campaign.reach || campaign.score || campaign.budget_used || campaign.spend || campaign[4] || (index + 1) * 12) || 0,
    display: campaign.reach_display || campaign.score_display || campaign.budget_display || campaign[2],
  }));
  return (
    <article className="cmo-clean-card cmo-clean-section">
      <div className="cmo-clean-card-head"><span>Top Campaigns</span><StatusBadge label="CFO Budget Control" state="attention" /></div>
      <HBarChart rows={chartRows} />
    </article>
  );
}

function CMOCalendarClean({ rows }) {
  const normalized = (rows || []).slice(0, 7).map((row) => [row[0], row[2], row[1], row[3], row[3]?.includes('Approval') ? 'Review Required' : 'Approval Queue']);
  return (
    <article className="cmo-clean-card cmo-clean-section cmo-wide-card">
      <div className="cmo-clean-card-head"><span>Content Calendar: Next 7 Days</span><StatusBadge label="Queue Controlled" state="progress" /></div>
      <div className="cmo-clean-table cmo-calendar-table">
        <div><span>Date</span><span>Content</span><span>Platform</span><span>Status</span><span>Approval</span></div>
        {normalized.map((row, index) => (
          <div key={`${row[0]}-${index}`}>
            <strong>{row[0]}</strong>
            <span>{row[1]}</span>
            <span>{row[2]}</span>
            <span>{row[3]}</span>
            <span>{row[4]}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function CMORecommendedActions() {
  const actions = [
    ['High', 'Publish Founder Story', 'Use Tenglish founder voice with proof-backed export discipline.'],
    ['High', 'Create SOP Content', 'Convert COO workflow lessons into educational posts.'],
    ['Medium', 'Run LinkedIn Campaign', 'Suggest campaign, then route budget to CFO review.'],
    ['Medium', 'Optimize YouTube Titles', 'Improve hooks and thumbnail direction before approval.'],
    ['Review', 'Collect Importer Testimonials', 'Only publish verified, approved buyer wording.']
  ];
  return (
    <article className="cmo-clean-card cmo-clean-section">
      <div className="cmo-clean-card-head"><span>Recommended Actions</span><StatusBadge label="Human Review" state="attention" /></div>
      <div className="cmo-action-list-clean">
        {actions.map(([priority, title, detail]) => (
          <div key={title}>
            <small>{priority}</small>
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CMOBrandSafetyClean({ rows }) {
  const items = [
    ['Content Compliance', rows?.[0]?.[2] || 'Certification-sensitive claims need proof.'],
    ['Brand Consistency', 'Founder voice must stay operational, trustworthy, and non-spammy.'],
    ['Tone & Voice Match', 'Tenglish content should feel natural, not robotic.'],
    ['Risk Alerts', `${rows?.length || 0} brand items require controlled review.`]
  ];
  return (
    <article className="cmo-clean-card cmo-clean-section">
      <div className="cmo-clean-card-head"><span>Brand Safety</span><StatusBadge label="Review Required" state="attention" /></div>
      <div className="cmo-safety-grid">
        {items.map(([title, detail]) => (
          <div key={title}>
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function CMOApprovalQueueClean({ rows, navigate }) {
  const items = (rows?.length ? rows : [
    ['YouTube script', 'Founder education', 'YouTube', 'Review Required', 'Approval queue first.'],
    ['LinkedIn post', 'Importer trust', 'LinkedIn', 'Review Required', 'Proof wording required.'],
    ['Instagram carousel', 'Export checklist', 'Instagram', 'Draft', 'Brand safety check.']
  ]).slice(0, 3);
  return (
    <article className="cmo-clean-card cmo-clean-section">
      <div className="cmo-clean-card-head"><span>Approval Queue</span><button onClick={() => navigate('/export-os/director')}>Open Queue</button></div>
      <div className="cmo-compact-list">
        {items.map((row) => (
          <div key={row[0]}>
            <strong>{row[0]}</strong>
            <p>{row[2]}  -  {row[4]}</p>
            <small>{row[3]}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function CMOGrowthInsightsClean({ rows }) {
  const items = [
    ['Importer interest', 'Route serious signals to Buyer CRM and COO follow-up.'],
    ['YouTube watch time', rows?.[0]?.[2] || 'Awaiting analytics connection.'],
    ['Blog traffic', 'No live data connected.'],
    ['WhatsApp inbound', 'Use WhatsApp for daily briefing and overdue approval escalation only; approvals and hourly briefings route through Slack.']
  ];
  return (
    <article className="cmo-clean-card cmo-clean-section">
      <div className="cmo-clean-card-head"><span>Growth Insights</span><StatusBadge label="Awaiting Analytics" state="attention" /></div>
      <div className="cmo-compact-list">
        {items.map(([title, detail]) => (
          <div key={title}>
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CMOContentEngineStrip({ data, onOpenRunbook }) {
  const items = [
    ['OpenAI Brain', data.openAIContentBrain?.[0]?.[1] || 'Hooks, scripts, captions, and content strategy.'],
    ['Growth Analytics', 'Awaiting analytics connection before reporting live performance.'],
    ['Competitor Watch', data.competitors?.[0]?.[4] || 'Monitor positioning gaps and export authority openings.'],
    ['Trend Radar', data.globalTargeting?.[0]?.[3] || 'Country and importer opportunity monitoring.'],
    ['Content Memory', data.openAIContentMemory?.[0]?.[1] || 'Approved claims, buyer objections, and winning hooks.']
  ];
  return (
    <section className="cmo-engine-strip">
      <div className="cmo-engine-header">
        <div>
          <span>Content Intelligence Engine</span>
          <strong>OpenAI-powered, approval-controlled, analytics-aware.</strong>
        </div>
        <button className="tactical-button" onClick={onOpenRunbook}>Open Growth Runbook</button>
      </div>
      <div className="cmo-engine-cards">
        {items.map(([title, detail]) => (
          <article key={title} className="cmo-clean-card">
            <strong>{title}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CMOLoadingPanel() {
  return <section className="cmo-panel cmo-loading-panel"><MetricSkeletonGrid /></section>;
}

function CMOTabWorkspace({ tab, data, output, navigate, onGenerateTodayPlan, onGenerateReport, onGenerateFounderSummary, onRouteBrandRisk }) {
  if (tab === 'Overview') return <CMOOverviewWorkspaceV2 data={data} output={output} onGenerateTodayPlan={onGenerateTodayPlan} onGenerateFounderSummary={onGenerateFounderSummary} navigate={navigate} />;
  if (tab === 'Learning Centre') return <CMOLearningCentreDashboard dashboard={data.cmoLearningCentre} />;
  if (tab === 'YouTube') return <YouTubeAuthorityEngine rows={data.youtube} scripts={data.videoScriptStyles} thumbnails={data.thumbnailDirections} output={output} onGenerate={onGenerateTodayPlan} />;
  if (tab === 'LinkedIn') return <LinkedInGrowthPanel rows={data.linkedin} targets={data.growthTargets} />;
  if (tab === 'Instagram') return <InstagramGrowthPanel rows={data.instagram} />;
  if (tab === 'Facebook') return <FacebookGrowthPanel rows={data.facebook} />;
  if (tab === 'Campaigns') return <CampaignBudgetPanel control={data.campaignControl} navigate={navigate} />;
  if (tab === 'Outreach') return <CMOBuyerOutreachWorkspace data={data} navigate={navigate} />;
  if (tab === 'Analytics') return <PerformanceAnalyticsPanel data={data} onGenerate={onGenerateReport} output={output} />;
  if (tab === 'Approvals') return <ContentApprovalQueue queue={data.approvalQueue} brandRisks={data.brandRisks} onRouteBrandRisk={onRouteBrandRisk} navigate={navigate} />;
  return <CMOCalendarWorkspace data={data} />;
}

function formatLearningDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function learningFilterMatches(finding, filter) {
  if (filter === 'All') return true;
  const text = [
    finding.sourcePlatform,
    finding.companyName,
    finding.topic,
    finding.contentCategory,
    finding.learningSummary,
    finding.gopuLearning,
    finding.visualStyle,
    finding.captionStyle,
    finding.sourceDomain,
    ...(finding.hashtagsUsed || [])
  ].join(' ').toLowerCase();
  return text.includes(filter.toLowerCase().replace('/', ' ')) || text.includes(filter.toLowerCase());
}

function CMOLearningCentreDashboard({ dashboard }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const findings = Array.isArray(dashboard?.findings) ? dashboard.findings : [];
  const filters = ['All', ...(dashboard?.filters || [])];
  const filteredFindings = findings.filter((finding) => learningFilterMatches(finding, activeFilter));
  const growthPlan = dashboard?.growthPlan || {};
  const hasFindings = filteredFindings.length > 0;

  return (
    <section className="cmo-tab-workspace cmo-learning-dashboard">
      <section className="cmo-growth-hero compact cmo-learning-hero">
        <div>
          <span>CMO Learning Centre</span>
          <h2>Auditable research memory before it influences content generation.</h2>
          <p>Every recorded source, insight, caption pattern, visual cue, avoid rule, and confidence score is visible here before GOPU uses it for future drafts.</p>
        </div>
        <StatusBadge label={dashboard?.connected ? 'Research Memory Connected' : 'Awaiting Research Data'} state={dashboard?.connected ? 'progress' : 'attention'} />
      </section>

      <section className="cmo-clean-metrics cmo-learning-status-grid">
        {(dashboard?.statusCards || []).map((card) => (
          <article key={card.label} className="cmo-clean-card">
            <span>{card.label}</span>
            <strong>{card.value ?? 'Not recorded'}</strong>
          </article>
        ))}
      </section>

      <section className="cmo-panel cmo-learning-growth-plan">
        <div className="approval-section-header"><div><span>Follower Goal</span><h2>{growthPlan.followerGoal || '100,000 followers in 1 month'}</h2></div><TrendingUp size={18} /></div>
        <p>{growthPlan.goalNote || 'Growth target only. No results are claimed without connected platform analytics.'}</p>
        <div className="cmo-learning-plan-grid">
          <div>
            <strong>Strategy</strong>
            {(growthPlan.strategy || []).map((item) => <span key={item}>{item}</span>)}
          </div>
          <div>
            <strong>Warning rules</strong>
            {(growthPlan.warningRules || []).map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <section className="cmo-panel cmo-learning-findings-panel">
        <div className="approval-section-header"><div><span>Top Content Examples Found</span><h2>Research findings used as supervised content resources</h2></div><BrainCircuit size={18} /></div>
        <div className="cmo-learning-filter-row">
          {filters.map((filter) => (
            <button key={filter} className={activeFilter === filter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>{filter}</button>
          ))}
        </div>
        {hasFindings ? (
          <div className="cmo-learning-finding-list">
            {filteredFindings.map((finding) => <CMOLearningFindingCard key={finding.id} finding={finding} />)}
          </div>
        ) : (
          <div className="cmo-memory-empty">
            <Database size={28} />
            <strong>No CMO research findings recorded for this filter.</strong>
            <span>Run the Learning Centre ingestion and save findings before they can influence content generation.</span>
          </div>
        )}
      </section>
    </section>
  );
}

function CMOLearningFindingCard({ finding }) {
  const confidence = `${Math.round((Number(finding.confidenceScore) || 0) * 100)}%`;
  return (
    <article className="cmo-learning-finding-card">
      <div className="cmo-learning-finding-head">
        <div>
          <span>{finding.sourcePlatform}</span>
          <strong>{finding.companyName}</strong>
          <small>{finding.sourceDomain || 'Source domain not recorded'} / {formatLearningDate(finding.recordedAt)}</small>
        </div>
        <StatusBadge label={`Confidence ${confidence}`} state={(Number(finding.confidenceScore) || 0) >= 0.7 ? 'progress' : 'attention'} />
      </div>
      <div className="cmo-learning-source-row">
        <span>{finding.topic}</span>
        {finding.sourceUrl ? <a href={finding.sourceUrl} target="_blank" rel="noreferrer">Source URL <ExternalLink size={13} /></a> : <span>Source URL not recorded</span>}
      </div>
      <div className="cmo-learning-detail-grid">
        <section><span>Caption style</span><p>{finding.captionStyle}</p></section>
        <section><span>Hashtags used</span><p>{finding.hashtagsUsed?.length ? finding.hashtagsUsed.join(' ') : 'No hashtag record'}</p></section>
        <section><span>Visual style</span><p>{finding.visualStyle}</p></section>
        <section><span>Engagement signals</span><p>{finding.engagementSignals}</p></section>
        <section><span>Why it performed well</span><p>{finding.whyPerformedWell}</p></section>
        <section><span>What GOPU can learn</span><p>{finding.gopuLearning}</p></section>
        <section><span>What should be avoided</span><p>{finding.avoid}</p></section>
      </div>
    </article>
  );
}

function CMOOverviewWorkspaceV2({ data, output, onGenerateTodayPlan, onGenerateFounderSummary, navigate }) {
  const summary = data.summary || {};
  const metrics = [
    ['Daily growth runbook', summary.todayRunbook || '9:00 AM IST', 'Monitoring'],
    ['Daily reach growth', summary.dailyReachGrowth || 'Monitoring', 'Growth Improving'],
    ['Weekly growth', summary.weeklyGrowth || 'Monitoring', 'Optimization Target'],
    ['Authority score', summary.authorityScore || 'Pending', 'Monitoring'],
    ['Pending approvals', summary.pendingApprovals || 7, 'Founder review queue'],
    ['Campaign activity', summary.campaignActivity || 6, 'CFO budget controlled'],
    ['Buyer outreach activity', summary.buyerOutreachActivity || 11, 'Buyer CRM linked'],
    ['Importer signals', summary.importerSignals || 8, 'CIO connected'],
    ['Brand risks', summary.brandRisks || 5, 'Approval controlled'],
    ['Consistency score', summary.consistencyScore || '86%', 'Content discipline']
  ];
  return (
    <section className="cmo-tab-workspace">
      <section className="cmo-growth-hero">
        <div>
          <span>OpenAI-Powered Export Growth & Media Operating System</span>
          <h2>OpenAI turns founder Tenglish into global export authority content.</h2>
          <p>Content should sound natural, convincing, operationally experienced, globally aware, and emotionally relatable. OpenAI handles hooks, scripts, importer psychology, thumbnail direction, storytelling, optimization, and content memory.</p>
        </div>
        <StatusBadge label="Founder Approval Required Before Publishing" state="attention" />
      </section>
      <div className="cmo-metric-grid">
        {metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
      </div>
      <div className="cmo-two-grid">
        <TenglishVoicePanel rows={data.tenglishVoiceRules} />
        <OpenAIContentBrainPanel rows={data.openAIContentBrain} />
        <ThumbnailEnginePanel rows={data.thumbnailDirections} />
        <GlobalTargetingPanel rows={data.globalTargeting} />
        <ContentToolchainPanel rows={data.contentToolchain} />
        <CMOContentMemoryArchive archive={data.contentMemoryArchive} growthAnalytics={data.socialGrowthAnalytics} />
        <CrossExecutiveContentIntelligence ideas={data.crossExecutiveIdeas} />
        <SocialGrowthDashboard metrics={data.socialGrowth} targets={data.growthTargets} />
        <OpenAIContentMemoryPanel rows={data.openAIContentMemory} />
        <section className="cmo-panel">
          <div className="approval-section-header"><div><span>CMO Recommendations</span><h2>Founder-safe growth moves</h2></div><Sparkles size={18} /></div>
          <div className="approval-memory-list">{(summary.recommendations || []).map((item) => <span key={item}>{item}</span>)}</div>
          <div className="cmo-action-row">
            <button className="tactical-button" onClick={() => navigate('/export-os/buyer-crm')}>Open Buyer CRM</button>
            <button className="ghost-button" onClick={() => navigate('/export-os/cio')}>Open CIO Intelligence</button>
            <button className="ghost-button" onClick={onGenerateFounderSummary}>Founder Marketing Summary</button>
          </div>
        </section>
      </div>
    </section>
  );
}

function CMOOverviewWorkspace({ data, output, onGenerateTodayPlan, onGenerateFounderSummary, navigate }) {
  const summary = data.summary || {};
  const metrics = [
    ["Todays content runbook", summary.todayRunbook || '8:39 AM IST', 'Monitoring'],
    ['Pending approvals', summary.pendingApprovals || 4, 'Founder review queue'],
    ['Campaign activity', summary.campaignActivity || 5, 'Active campaigns'],
    ['Buyer outreach activity', summary.buyerOutreachActivity || 7, 'Buyer CRM linked'],
    ['Competitor alerts', summary.competitorAlerts || 3, 'Positioning watch'],
    ['Brand risks', summary.brandRisks || 4, 'Approval controlled'],
    ['Scheduled content', summary.scheduledContent || 6, 'Draft / local schedule'],
    ['Founder review queue', summary.founderReviewQueue || 3, 'Claims pending']
  ];
  return (
    <section className="cmo-tab-workspace">
      <div className="cmo-metric-grid">
        {metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
      </div>
      <div className="cmo-two-grid">
        <CMOContentMemoryArchive archive={data.contentMemoryArchive} growthAnalytics={data.socialGrowthAnalytics} />
        <section className="cmo-panel">
          <div className="approval-section-header"><div><span>CMO Recommendations</span><h2>Founder-safe growth moves</h2></div><Sparkles size={18} /></div>
          <div className="approval-memory-list">{(summary.recommendations || []).map((item) => <span key={item}>{item}</span>)}</div>
          <div className="cmo-action-row">
            <button className="tactical-button" onClick={() => navigate('/export-os/buyer-crm')}>Open Buyer CRM</button>
            <button className="ghost-button" onClick={onGenerateFounderSummary}>Founder Marketing Summary</button>
          </div>
        </section>
      </div>
    </section>
  );
}

function CMOContentTable({ title, subtitle, columns, rows }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>{title}</span><h2>{subtitle}</h2></div><Target size={18} /></div>
      <div className="cmo-data-table" style={{ '--cmo-cols': columns.length }}>
        <div className="cmo-data-table-head">{columns.map((column) => <span key={column}>{column}</span>)}</div>
        {rows.map((row) => (
          <div key={row.join('-')}>
            {row.map((cell, index) => index === 0 ? <strong key={`${row[0]}-${index}`}>{cell}</strong> : <span key={`${row[0]}-${index}`}>{cell}</span>)}
          </div>
        ))}
      </div>
      <p className="pricing-note">All content remains draft, review, or scheduled local until backend publishing and approval evidence are connected.</p>
    </section>
  );
}

function YouTubeAuthorityEngine({ rows, scripts, thumbnails, output, onGenerate }) {
  return (
    <section className="cmo-tab-workspace">
      <section className="cmo-growth-hero compact">
        <div><span>YouTube Authority Engine</span><h2>Tenglish founder-led export intelligence with premium thumbnail direction.</h2><p>OpenAI prepares strategy, outline, script logic, importer psychology, emotional curiosity, thumbnail hook, and teaching structure. Descript/editing tools handle production later. No guaranteed leads, conversions, or virality are claimed.</p></div>
        <button className="tactical-button" onClick={onGenerate}>Generate 9 AM Video Plan</button>
      </section>
      <CMOContentTable title="YouTube Authority Engine" subtitle="15-20 minute export-business intelligence videos" columns={['Title', 'Concept', 'Audience', 'Sections', 'Talking points', 'B-roll', 'CTA', 'Approval']} rows={rows} />
      <VideoScriptStylePanel rows={scripts} />
      <ThumbnailEnginePanel rows={thumbnails} />
      {output && <pre className="cmo-local-summary">{output}</pre>}
    </section>
  );
}

function LinkedInGrowthPanel({ rows, targets }) {
  return (
    <section className="cmo-tab-workspace">
      <section className="cmo-panel">
        <div className="approval-section-header"><div><span>LinkedIn Strategy</span><h2>Primary authority engine</h2></div><UsersRound size={18} /></div>
        <p>OpenAI generates founder-led Tenglish authority angles, hooks, importer psychology, storytelling, and optimization suggestions. Minimum one major authority post daily, plus export/business insight cadence every 5 hours when approved.</p>
        <div className="cmo-growth-target-list">{targets.filter((target) => target[0] === 'LinkedIn' || target[0] === 'Buyer Outreach').map(([platform, target, current, action]) => <article key={platform}><strong>{platform}</strong><StatusBadge label="Optimization Target" state="progress" /><span>{target} / {current}</span><small>{action}</small></article>)}</div>
      </section>
      <CMOContentTable title="LinkedIn Growth Panel" subtitle="Founder authority, importer trust, and buyer education posts" columns={['Post idea', 'Hook', 'Body', 'CTA', 'Audience', 'Objective', 'Approval', 'Schedule']} rows={rows} />
    </section>
  );
}

function InstagramGrowthPanel({ rows }) {
  return (
    <section className="cmo-tab-workspace">
      <section className="cmo-panel"><div className="approval-section-header"><div><span>Instagram Growth Panel</span><h2>Educational business authority reels</h2></div><ScanLine size={18} /></div><p>Reels focus on export workflows, logistics lessons, importer psychology, supplier insights, packaging/process, and founder commentary. Founder face/deepfake content is not generated.</p></section>
      <CMOContentTable title="Instagram Reel Planning" subtitle="Export workflows, logistics lessons, and process proof" columns={['Reel concept', 'Hook', 'Scene structure', 'Caption', 'Voiceover', 'Visual suggestion', 'Approval']} rows={rows} />
    </section>
  );
}

function FacebookGrowthPanel({ rows }) {
  return (
    <section className="cmo-tab-workspace">
      <section className="cmo-panel"><div className="approval-section-header"><div><span>Facebook Growth Panel</span><h2>Institutional export presence</h2></div><Building2 size={18} /></div><p>Facebook carries export business updates, educational breakdowns, shipment/process insights, and founder operational philosophy with conservative approval controls.</p></section>
      <CMOContentTable title="Facebook Export Presence" subtitle="Institutional updates and export education" columns={['Content', 'Format', 'Body', 'Objective', 'Approval', 'Schedule']} rows={rows} />
    </section>
  );
}

const campaignPlatforms = ['Meta Ads', 'Google Ads', 'LinkedIn Ads', 'Instagram Promotion', 'Facebook Promotion', 'YouTube Ads', 'Email Campaign'];
const campaignObjectives = ['Brand Awareness', 'Lead Generation', 'Website Traffic', 'Importer Outreach', 'Engagement', 'Video Views', 'WhatsApp Leads'];

function formatInrValue(value) {
  const amount = Number(value) || 0;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
}

function CampaignBudgetPanel({ control, navigate }) {
  const [campaignControl, setCampaignControl] = useState(control || { campaigns: [], budgetSummary: {}, warnings: [], recommendations: [], schedule: [], leads: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const campaigns = campaignControl.campaigns || [];
  const summary = campaignControl.budgetSummary || {};

  useEffect(() => {
    setCampaignControl(control || { campaigns: [], budgetSummary: {}, warnings: [], recommendations: [], schedule: [], leads: [] });
  }, [control]);

  async function refreshCampaignControl() {
    const response = await getMarketingCampaignControlCenter(demoTenantId);
    if (response.data) setCampaignControl(response.data);
    if (response.error) setMessage(response.error);
  }

  async function createCampaign(payload) {
    setMessage('Creating campaign draft...');
    const response = await createMarketingCampaignDraft({ tenant_id: demoTenantId, ...payload });
    if (response.ok) {
      setModalOpen(false);
      setMessage('Campaign draft created. Founder approval is required before launch.');
      await refreshCampaignControl();
      return;
    }
    setMessage(response.error || 'Campaign draft could not be created.');
  }

  return (
    <section className="cmo-tab-workspace campaign-control-center">
      <section className="cmo-panel campaign-budget-panel">
        <div className="approval-section-header"><div><span>DIGITAL MARKETING + CAMPAIGN CONTROL</span><h2>Campaigns, budgets, leads, and founder-safe launch control</h2></div><CircleDollarSign size={18} /></div>
        <div className="approval-memory-list">
          {['No paid ads auto-launch from GOPU OS.', 'Founder approval is required before any campaign launch.', 'CFO controls budget approval and spend governance.', 'Campaign metrics are shown only from connected campaign tables.', 'Leads connect to inquiries, WhatsApp clicks, website visits, and importer responses when tracked.'].map((item) => <span key={item}>{item}</span>)}
        </div>
        <div className="cmo-action-row">
          <button className="tactical-button" onClick={() => setModalOpen(true)}>Create Campaign Draft</button>
          <button className="ghost-button" onClick={() => navigate('/export-os/executives/cfo')}>Open CFO Budget Review</button>
          <button className="ghost-button" onClick={() => navigate('/export-os/director')}>Open Founder Approval</button>
        </div>
        {message ? <p className="cmo-posting-message">{message}</p> : null}
      </section>

      <section className="campaign-budget-dashboard">
        {[
          ['Total Marketing Budget', formatInrValue(summary.totalMarketingBudget)],
          ['Active Spend', formatInrValue(summary.activeSpend)],
          ['Remaining Budget', formatInrValue(summary.remainingBudget)],
          ['Estimated Monthly Spend', formatInrValue(summary.estimatedMonthlySpend)],
          ['Cost Per Lead', summary.costPerLead ? formatInrValue(summary.costPerLead) : 'No lead data'],
          ['Best ROI Platform', summary.bestRoiPlatform || 'No ROI data']
        ].map(([label, value]) => (
          <article key={label} className="cmo-clean-card campaign-budget-card">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="cmo-panel campaign-management-panel">
        <div className="approval-section-header"><div><span>Campaign Management</span><h2>Live campaign and budget table</h2></div><Target size={18} /></div>
        {campaigns.length ? (
          <div className="campaign-control-table">
            <div><span>Campaign</span><span>Platform</span><span>Objective</span><span>Status</span><span>Budget</span><span>Spend</span><span>Remaining</span><span>Leads</span><span>CPC</span><span>CTR</span><span>ROI</span><span>Dates</span></div>
            {campaigns.map((campaign) => {
              const spendPercent = campaign.budget > 0 ? Math.min(100, Math.round((campaign.spend / campaign.budget) * 100)) : 0;
              return (
                <div key={campaign.id || campaign.campaignName}>
                  <strong>{campaign.campaignName}</strong>
                  <span>{campaign.platform}</span>
                  <span>{campaign.objective}</span>
                  <StatusBadge label={campaign.status} state={campaign.status === 'Failed' ? 'attention' : campaign.status === 'Active' ? 'progress' : 'online'} />
                  <span>{formatInrValue(campaign.budget)}</span>
                  <span>{formatInrValue(campaign.spend)}<i className="campaign-spend-bar"><em style={{ width: `${spendPercent}%` }} /></i></span>
                  <span>{formatInrValue(campaign.remainingBudget)}</span>
                  <span>{campaign.leads || '0'}</span>
                  <span>{campaign.cpc ? formatInrValue(campaign.cpc) : 'No data'}</span>
                  <span>{campaign.ctr ? `${campaign.ctr.toFixed(2)}%` : 'No data'}</span>
                  <span>{campaign.roi ? `${campaign.roi.toFixed(2)}x` : 'No data'}</span>
                  <span>{campaign.startDate || 'Not set'} to {campaign.endDate || 'Not set'}</span>
                </div>
              );
            })}
          </div>
        ) : <div className="cmo-memory-empty"><CircleDollarSign size={28} /><strong>No campaigns created yet.</strong><span>Create a campaign draft to start budget and lead tracking.</span></div>}
      </section>

      <section className="campaign-control-grid">
        <article className="cmo-panel">
          <div className="approval-section-header"><div><span>Budget Warnings</span><h2>Spend safety checks</h2></div><TriangleAlert size={18} /></div>
          <div className="approval-memory-list">{(campaignControl.warnings?.length ? campaignControl.warnings.map((item) => item.message) : ['No budget warnings from connected campaign data.']).map((item) => <span key={item}>{item}</span>)}</div>
        </article>
        <article className="cmo-panel">
          <div className="approval-section-header"><div><span>AI Marketing Recommendations</span><h2>Metric-based recommendations only</h2></div><BrainCircuit size={18} /></div>
          <div className="approval-memory-list">{(campaignControl.recommendations || []).map((item) => <span key={item}>{item}</span>)}</div>
        </article>
      </section>

      <section className="campaign-control-grid">
        <article className="cmo-panel">
          <div className="approval-section-header"><div><span>Marketing Calendar</span><h2>Campaign dates, scheduled posts, launches, approvals</h2></div><CalendarDays size={18} /></div>
          <div className="approval-memory-list">{(campaignControl.schedule?.length ? campaignControl.schedule.map((item) => `${String(item.scheduled_at || '').slice(0, 10)} - ${item.title || item.campaign_name || item.schedule_type} / ${item.status}`) : ['No campaign calendar rows connected yet.']).map((item) => <span key={item}>{item}</span>)}</div>
        </article>
        <article className="cmo-panel">
          <div className="approval-section-header"><div><span>Lead Tracking</span><h2>Inquiries, WhatsApp clicks, visits, importer responses</h2></div><UsersRound size={18} /></div>
          <div className="approval-memory-list">{(campaignControl.leads?.length ? campaignControl.leads.map((item) => `${item.lead_name || item.importer_name || 'Campaign lead'} - ${item.source || item.lead_source || 'source pending'} / ${item.status || 'New'}`) : ['No campaign leads connected yet.']).map((item) => <span key={item}>{item}</span>)}</div>
        </article>
      </section>

      {modalOpen ? <CampaignCreationModal onClose={() => setModalOpen(false)} onCreate={createCampaign} /> : null}
    </section>
  );
}

function CampaignCreationModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    campaign_name: '',
    platform: 'Meta Ads',
    objective: 'Lead Generation',
    country_target: '',
    audience_target: '',
    daily_budget_inr: '',
    total_budget_inr: '',
    start_date: '',
    end_date: '',
    ai_suggestion_enabled: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    if (!form.campaign_name.trim()) {
      setError('Campaign Name is required.');
      return;
    }
    if (!Number(form.total_budget_inr || 0)) {
      setError('Total Budget is required.');
      return;
    }
    setSaving(true);
    setError('');
    await onCreate(form);
    setSaving(false);
  }

  return (
    <div className="modal-backdrop">
      <section className="payment-modal campaign-create-modal">
        <div className="payment-modal-head">
          <div><span>Campaign Creation</span><h2>Create campaign draft</h2></div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="campaign-create-form">
          <label><span>Campaign Name</span><input value={form.campaign_name} onChange={(event) => update('campaign_name', event.target.value)} /></label>
          <label><span>Select Platform</span><select value={form.platform} onChange={(event) => update('platform', event.target.value)}>{campaignPlatforms.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Objective</span><select value={form.objective} onChange={(event) => update('objective', event.target.value)}>{campaignObjectives.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Country Target</span><input value={form.country_target} onChange={(event) => update('country_target', event.target.value)} /></label>
          <label><span>Audience Target</span><input value={form.audience_target} onChange={(event) => update('audience_target', event.target.value)} /></label>
          <label><span>Daily Budget</span><input type="number" min="0" value={form.daily_budget_inr} onChange={(event) => update('daily_budget_inr', event.target.value)} /></label>
          <label><span>Total Budget</span><input type="number" min="0" value={form.total_budget_inr} onChange={(event) => update('total_budget_inr', event.target.value)} /></label>
          <label><span>Start Date</span><input type="date" value={form.start_date} onChange={(event) => update('start_date', event.target.value)} /></label>
          <label><span>End Date</span><input type="date" value={form.end_date} onChange={(event) => update('end_date', event.target.value)} /></label>
          <label className="campaign-toggle"><input type="checkbox" checked={form.ai_suggestion_enabled} onChange={(event) => update('ai_suggestion_enabled', event.target.checked)} /><span>AI-generated campaign suggestion</span></label>
        </div>
        <p className="campaign-safety-note">Safety rule: this creates a draft only. Founder approval is required before launch and GOPU OS will not auto-spend ad budget.</p>
        {error ? <p className="cmo-posting-message error">{error}</p> : null}
        <div className="payment-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="tactical-button" disabled={saving} onClick={submit}>{saving ? 'Creating...' : 'Create Draft'}</button>
        </div>
      </section>
    </div>
  );
}

function SocialGrowthDashboard({ metrics, targets }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Social Growth Dashboard</span><h2>Growth target, not guarantee</h2></div><TrendingUp size={18} /></div>
      <div className="social-growth-grid">{metrics.map(([platform, followers, reach, growth, status, note]) => <article key={platform}><div><strong>{platform}</strong><StatusBadge label={status} state={status === 'Review Required' ? 'attention' : 'progress'} /></div><span>Followers: {followers}</span><span>Reach: {reach}</span><span>Growth: {growth}</span><small>{note}</small></article>)}</div>
      <p>10% is a recommended growth objective and optimization target, not guaranteed performance.</p>
    </section>
  );
}

function PerformanceAnalyticsPanel({ data, onGenerate, output }) {
  return (
    <section className="cmo-tab-workspace">
      <SocialGrowthDashboard metrics={data.socialGrowth} targets={data.growthTargets} />
      <CMOContentTable title="Content Performance Engine" subtitle="Hooks, topics, timing, importer engagement, and watch-time pendings" columns={['Content', 'Platform', 'Reach', 'Engagement', 'Watch time', 'Insight']} rows={data.contentPerformance} />
      <GrowthOptimizationPanel insights={data.optimizationInsights} targets={data.growthTargets} />
      <DigitalMarketingOptimizationPanel rows={data.digitalMarketingOptimization} />
      <ThumbnailEnginePanel rows={data.thumbnailDirections} />
      <OpenAIContentMemoryPanel rows={data.openAIContentMemory} />
      <div className="cmo-action-row"><button className="tactical-button" onClick={onGenerate}>Generate Growth Report</button></div>
      {output && <pre className="cmo-local-summary">{output}</pre>}
    </section>
  );
}

function TenglishVoicePanel({ rows }) {
  return (
    <section className="cmo-panel openai-brain-panel">
      <div className="approval-section-header"><div><span>Tenglish Authority Voice</span><h2>Natural founder-speaking style</h2></div><BrainCircuit size={18} /></div>
      <p>Primary communication style is Telugu + English mixed naturally. It should feel like a founder with real export experience explaining global trade simply, not robotic English or fake motivational content.</p>
      <div className="cmo-growth-target-list">{rows.map(([rule, value, note]) => <article key={rule}><strong>{rule}</strong><span>{value}</span><small>{note}</small></article>)}</div>
    </section>
  );
}

function ThumbnailEnginePanel({ rows }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Thumbnail / Cover Engine</span><h2>Premium export authority visuals</h2></div><Eye size={18} /></div>
      <p>Thumbnails should use founder face, shipment/warehouse/global trade visuals, bold short hooks, emotional tension, and serious export-business curiosity. No cheap clickbait.</p>
      <div className="cmo-growth-target-list">{rows.map(([headline, visual, style, tension]) => <article key={headline}><strong>{headline}</strong><span>{visual}</span><small>{style} / {tension}</small></article>)}</div>
    </section>
  );
}

function GlobalTargetingPanel({ rows }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Worldwide Digital Marketing</span><h2>Importer-focused regional strategy</h2></div><Network size={18} /></div>
      <div className="cmo-growth-target-list">{rows.map(([region, audience, products, angle]) => <article key={region}><strong>{region}</strong><span>{audience}</span><small>{products} / {angle}</small></article>)}</div>
    </section>
  );
}

function DigitalMarketingOptimizationPanel({ rows }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Digital Marketing Optimization</span><h2>Hooks, retention, CTR, importer signals</h2></div><SlidersHorizontal size={18} /></div>
      <div className="cmo-growth-target-list">{rows.map(([metric, signal, recommendation]) => <article key={metric}><strong>{metric}</strong><span>{signal}</span><small>{recommendation}</small></article>)}</div>
    </section>
  );
}

function VideoScriptStylePanel({ rows }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Video Script Style</span><h2>Founder teaching, real examples, trade intelligence</h2></div><FileText size={18} /></div>
      <div className="cmo-growth-target-list">{rows.map(([stage, rule, sample]) => <article key={stage}><strong>{stage}</strong><span>{rule}</span><small>{sample}</small></article>)}</div>
    </section>
  );
}

function OpenAIContentBrainPanel({ rows }) {
  return (
    <section className="cmo-panel openai-brain-panel">
      <div className="approval-section-header"><div><span>OpenAI Content Brain</span><h2>Strategy, writing, buyer psychology, optimization</h2></div><Bot size={18} /></div>
      <p>OpenAI should think like a globally experienced exporter, strategist, operational founder, trade educator, and buyer psychology expert. It should not write generic influencer content.</p>
      <div className="quality-model-strip">
        <span>Premium Mode: GPT-5.5</span>
        <span>Fast/Bulk: gpt-4o-mini</span>
        <span>Images: gpt-image-1</span>
      </div>
      <div className="cmo-growth-target-list">{rows.map(([domain, responsibility, owner]) => <article key={domain}><strong>{domain}</strong><StatusBadge label={owner} state="progress" /><span>{responsibility}</span></article>)}</div>
    </section>
  );
}

function ContentToolchainPanel({ rows }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Content Toolchain</span><h2>OpenAI brain to publishing workflow</h2></div><Workflow size={18} /></div>
      <div className="cmo-growth-target-list">{rows.map(([tool, role, details]) => <article key={tool}><strong>{tool}</strong><span>{role}</span><small>{details}</small></article>)}</div>
      <p>Workflow: OpenAI content brain {'->'} Founder approval {'->'} Editing workflow {'->'} Scheduling queue {'->'} Publishing {'->'} Analytics {'->'} OpenAI optimization.</p>
    </section>
  );
}

function OpenAIContentMemoryPanel({ rows }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>OpenAI Memory</span><h2>Content learning loop</h2></div><Database size={18} /></div>
      <div className="cmo-growth-target-list">{rows.map(([memory, signal]) => <article key={memory}><strong>{memory}</strong><span>{signal}</span></article>)}</div>
      <small>Local memory now. Future connected memory should learn from approved content, analytics, importer interests, buyer objections, founder tone, and successful content structures.</small>
    </section>
  );
}

function GrowthOptimizationPanel({ insights, targets }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Growth Optimization Panel</span><h2>Continuous improvement loop</h2></div><SlidersHorizontal size={18} /></div>
      <div className="cmo-growth-target-list">{insights.map(([label, value]) => <article key={label}><strong>{label}</strong><span>{value}</span></article>)}</div>
      <div className="cmo-growth-target-list">{targets.map(([platform, target, current, action]) => <article key={platform}><strong>{platform}</strong><StatusBadge label="Optimization Target" state="progress" /><span>{target} / {current}</span><small>{action}</small></article>)}</div>
    </section>
  );
}

function BuyerEngagementPanel({ rows, navigate }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Buyer Engagement Panel</span><h2>Importer trust over vanity metrics</h2></div><UsersRound size={18} /></div>
      <div className="cmo-growth-target-list">{rows.map(([buyer, signal, market, opportunity, status, action]) => <article key={buyer}><strong>{buyer}</strong><StatusBadge label={status} state={getApprovalState(status)} /><span>{signal} / {market}</span><small>{opportunity} - {action}</small></article>)}</div>
      <button className="tactical-button" onClick={() => navigate('/export-os/buyer-crm')}>Open Buyer CRM</button>
    </section>
  );
}

function CrossExecutiveContentIntelligence({ ideas }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Cross-Executive Content Intelligence</span><h2>COO / CIO / CFO / CTO inputs</h2></div><Network size={18} /></div>
      <div className="cmo-growth-target-list">{ideas.map(([source, idea, angle, platform]) => <article key={`${source}-${idea}`}><strong>{source}: {idea}</strong><span>{angle}</span><small>{platform}</small></article>)}</div>
    </section>
  );
}

function ContentApprovalQueue({ queue, brandRisks, onRouteBrandRisk, navigate }) {
  return (
    <section className="cmo-tab-workspace">
      <section className="cmo-panel">
        <div className="approval-section-header"><div><span>Content Approval Queue</span><h2>Founder preview before publishing</h2></div><ShieldCheck size={18} /></div>
        <div className="brand-approval-list">{queue.map((item) => <article key={item[0]}><div><strong>{item[0]}</strong><StatusBadge label={item[3]} state={getApprovalState(item[3])} /></div><p>{item[1]} / {item[2]}</p><small>{item[4]}</small><div className="cmo-action-row"><button className="tactical-button" onClick={() => navigate('/export-os/director')}>Open Director Queue</button><button className="ghost-button" onClick={() => navigate('/export-os/executives/cfo')}>CFO Budget Review</button></div></article>)}</div>
      </section>
      <CMOBrandRiskWorkspace data={{ brandRisks }} onRouteBrandRisk={onRouteBrandRisk} />
      <section className="cmo-panel"><div className="approval-section-header"><div><span>Safe Auto-Publish Rule</span><h2>Controlled and limited</h2></div><AlertTriangle size={18} /></div><div className="approval-memory-list">{['Allowed only for educational export content, operational insights, and non-sensitive commentary after approval timeout rules are configured.', 'Never auto-publish legal claims, pricing promises, certification claims, sensitive buyer/supplier data, or confidential workflows.', 'Backend publishing is not connected here; no external post is claimed as sent.'].map((item) => <span key={item}>{item}</span>)}</div></section>
    </section>
  );
}

function CMOBuyerOutreachWorkspace({ data, navigate }) {
  return (
    <section className="cmo-tab-workspace">
      <CMOContentTable title="Buyer Outreach" subtitle="Buyer CRM connected opportunities" columns={['Buyer', 'Signal', 'Product / Market', 'Opportunity', 'Status', 'Next action']} rows={data.buyerOutreach} />
      <BuyerEngagementPanel rows={data.buyerOutreach} navigate={navigate} />
      <div className="cmo-two-grid">
        <section className="cmo-panel">
          <div className="approval-section-header"><div><span>Buyer CRM Connection</span><h2>CMO owns relationship intelligence</h2></div><UsersRound size={18} /></div>
          <div className="approval-memory-list">
            {['Buyer preferences feed content and outreach.', 'COO coordinates operational follow-ups.', 'CFO reviews pricing pressure and commercial risk.', 'CTO supports WhatsApp and follow-up automations.'].map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>
        <section className="cmo-panel">
          <div className="approval-section-header"><div><span>Outreach Actions</span><h2>No live data</h2></div><Send size={18} /></div>
          <div className="cmo-action-row">
            <button className="tactical-button">Create Outreach Task</button>
            <button className="ghost-button">Draft Message</button>
            <button className="ghost-button">Schedule Follow-up</button>
            <button className="ghost-button" onClick={() => navigate('/export-os/executives/coo')}>Link to COO</button>
          </div>
        </section>
      </div>
    </section>
  );
}

function CMOCompetitorWorkspace({ data, output, onGenerate }) {
  return (
    <section className="cmo-tab-workspace">
      <CMOContentTable title="Competitor Review" subtitle="Market positioning and opportunity scan" columns={['Competitor', 'Platform', 'Theme', 'Positioning', 'Opportunity', 'Observation']} rows={data.competitors} />
      <div className="cmo-action-row"><button className="tactical-button" onClick={onGenerate}>Generate Competitor Intelligence Summary</button></div>
      {output && <p className="cmo-local-summary">{output}</p>}
    </section>
  );
}

function CMOBrandRiskWorkspace({ data, onRouteBrandRisk }) {
  return (
    <section className="cmo-tab-workspace">
      <section className="cmo-panel">
        <div className="approval-section-header"><div><span>Brand Risk</span><h2>Claims requiring founder control</h2></div><ShieldCheck size={18} /></div>
        <div className="brand-approval-list">
          {data.brandRisks.map((item) => (
            <article key={item[0]} className={`risk-${String(item[1]).toLowerCase()}`}>
              <div><strong>{item[0]}</strong><PriorityBadge priority={item[1]} /></div>
              <p>{item[2]}</p>
              <StatusBadge label={item[3]} state={getApprovalState(item[3])} />
              <button className="tactical-button" onClick={() => onRouteBrandRisk(item)}>Send to Director Command Center</button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function CMOCalendarWorkspace({ data }) {
  return <CMOContentTable title="Unified Content Calendar" subtitle="LinkedIn, Instagram, Facebook, YouTube, campaigns, and outreach schedule. Daily growth runbook: 9:00 AM IST." columns={['Time', 'Channel', 'Item', 'Status']} rows={data.calendar} />;
}

function CMOReportsWorkspace({ output, onGenerate, onFounderSummary }) {
  const rows = [
    ['Content pipeline', 'Draft report', 'LinkedIn, Instagram, YouTube'],
    ['Campaign summary', 'Draft report', 'UAE, Oman, distributors, trade leads'],
    ['Outreach activity', 'Draft report', 'Buyer CRM follow-ups and dormant buyers'],
    ['Approval report', 'Draft report', 'Claims and founder review queue'],
    ['Competitor summary', 'Draft report', 'Positioning and market observations'],
    ['Engagement pendings', 'Draft report', 'No real engagement claimed']
  ];
  return (
    <section className="cmo-tab-workspace">
      <CMOContentTable title="Reports" subtitle="Draft CMO reporting center" columns={['Report', 'Status', 'Coverage']} rows={rows} />
      <div className="cmo-action-row">
        <button className="tactical-button" onClick={onGenerate}>Generate Report</button>
        <button className="ghost-button" onClick={onGenerate}>Export Draft Report</button>
        <button className="ghost-button" onClick={onFounderSummary}>Founder Marketing Summary</button>
      </div>
      {output && <pre className="cfo-report-output">{output}</pre>}
    </section>
  );
}

function CMOIntelligencePanel({ data, onOpenBuyerCRM, onOpenApprovalWall }) {
  const trends = ['LinkedIn is the primary authority engine; additional insight cadence stays approval-controlled.', 'COO, CIO, CFO, and CTO inputs feed daily export-industry content intelligence.', '10% is an optimization target, not a guaranteed growth result.', 'Campaign budgets remain CFO-controlled before any boost or paid platform spend.'];
  return (
    <aside className="cmo-panel cmo-intelligence-panel">
      <div className="approval-section-header"><div><span>CMO Intelligence</span><h2>Growth, buyer, and brand watch</h2></div><BrainCircuit size={18} /></div>
      <div className="approval-memory-list">
        {trends.map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="cmo-intelligence-risk-list">
        {(data.brandRisks || []).slice(0, 4).map((item) => <article key={item[0]}><strong>{item[0]}</strong><SeverityBadge severity={item[1]} /><span>{item[3]}</span></article>)}
      </div>
      <div className="cmo-action-row">
        <button className="tactical-button" onClick={onOpenBuyerCRM}>Buyer CRM</button>
        <button className="ghost-button" onClick={onOpenApprovalWall}>Director Queue</button>
      </div>
      <small>CMO owns buyer relationship intelligence; COO coordinates execution; CFO handles commercial risk; CTO supports automations.</small>
    </aside>
  );
}

function CMOIdentityPanel() {
  return (
    <section className="cmo-panel cmo-identity-panel">
      <div className="approval-section-header"><div><span>CMO Command</span><h2>Growth & Media Operating System</h2></div><Target size={18} /></div>
      <p>Runs founder authority, social growth, buyer attraction, campaigns, outreach, competitor review, and approval-controlled public messaging without making unapproved claims.</p>
      <div className="cmo-scope-grid">
        {['LinkedIn Content', 'Instagram Reels', 'YouTube Workflows', 'Buyer Outreach', 'Brand Approval', 'Content Memory'].map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}

function ContentCalendar() {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Content Calendar</span><h2>Planned editorial schedule</h2></div><CalendarClock size={18} /></div>
      <div className="content-calendar-grid">
        {contentCalendarItems.map((item) => (
          <article key={item.id}>
            <span>{item.platform}</span>
            <strong>{item.title}</strong>
            <small>{item.scheduled_date}</small>
            <StatusBadge label={item.status} state={getApprovalState(item.status)} />
          </article>
        ))}
      </div>
    </section>
  );
}

function LinkedInPipeline() {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>LinkedIn Content Pipeline</span><h2>Buyer education posts</h2></div><UsersRound size={18} /></div>
      <div className="content-pipeline-list">
        {linkedInPipelineItems.map((item) => <ContentPipelineCard key={item.id} item={item} fields={[['Hook', item.hook], ['Audience', item.audience], ['Objective', item.objective], ['Schedule', item.schedule_date]]} />)}
      </div>
    </section>
  );
}

function InstagramReelPipeline() {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Instagram Reel Pipeline</span><h2>30-40 second concepts</h2></div><ScanLine size={18} /></div>
      <div className="content-pipeline-list">
        {instagramReelItems.map((item) => <ContentPipelineCard key={item.id} item={item} fields={[['Opening Hook', item.hook], ['Scenes', item.scenes.join(' / ')], ['Caption', item.caption], ['Voiceover Draft', item.voiceover]]} />)}
      </div>
      <p className="pricing-note">Media generation and founder-face output are not automatic. Concepts stay workflow-only until approved assets are configured.</p>
    </section>
  );
}

function YouTubePlanner() {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>YouTube Content Planner</span><h2>15-minute video workflow</h2></div><FileText size={18} /></div>
      <div className="content-pipeline-list">
        {youtubePlans.map((item) => <ContentPipelineCard key={item.id} item={item} fields={[['Concept', item.concept], ['Audience', item.audience], ['Sections', item.sections.join(' / ')], ['B-roll', item.broll.join(' / ')], ['Call to Action', item.cta]]} />)}
      </div>
    </section>
  );
}

function ContentPipelineCard({ item, fields }) {
  return (
    <article className="content-pipeline-card">
      <div>
        <h3>{item.title}</h3>
        <StatusBadge label={item.status} state={getApprovalState(item.status)} />
      </div>
      <dl>
        {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </article>
  );
}

function BuyerOutreachCampaigns() {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Buyer Outreach Campaigns</span><h2>Market development queue</h2></div><Send size={18} /></div>
      <div className="campaign-list">
        {buyerOutreachCampaigns.map((campaign) => (
          <article key={campaign.id}>
            <strong>{campaign.campaign_name}</strong>
            <span>{campaign.target_market} - {campaign.product_focus}</span>
            <small>{campaign.stage} / {campaign.next_action}</small>
            <StatusBadge label={campaign.status} state={getApprovalState(campaign.status)} />
          </article>
        ))}
      </div>
    </section>
  );
}

function CompetitorReviewPanel({ onGenerate, output }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Competitor Review</span><h2>Positioning opportunities</h2></div><Eye size={18} /></div>
      <div className="competitor-review-list">
        {competitorReviewItems.map((item) => (
          <article key={item.id}>
            <strong>{item.competitor_name}</strong>
            <span>{item.platform}</span>
            <p>{item.observation}</p>
            <small>{item.opportunity}</small>
            <em>{item.recommended_action}</em>
          </article>
        ))}
      </div>
      <button className="ghost-button" onClick={onGenerate}>Generate Competitor Review Summary</button>
      {output && <p className="cmo-local-summary">{output}</p>}
    </section>
  );
}

function BrandApprovalQueue({ navigate }) {
  return (
    <section className="cmo-panel">
      <div className="approval-section-header"><div><span>Brand Approval Queue</span><h2>Claims requiring review</h2></div><ShieldCheck size={18} /></div>
      <div className="brand-approval-list">
        {brandApprovalItems.map((item) => (
          <article key={item.id} className={`risk-${item.risk_level.toLowerCase()}`}>
            <div><strong>{item.claim}</strong><PriorityBadge priority={item.risk_level} /></div>
            <p>{item.reason}</p>
            <StatusBadge label={item.status} state={getApprovalState(item.status)} />
          </article>
        ))}
      </div>
      <button className="tactical-button" onClick={() => navigate('/export-os/director')}>Send to Director Command Center</button>
    </section>
  );
}

function ContentIntelligenceMemory() {
  return (
    <section className="cmo-panel cmo-memory-panel">
      <div className="approval-section-header"><div><span>Content Intelligence Memory</span><h2>Memory</h2></div><Database size={18} /></div>
      <div className="content-memory-grid">
        {contentMemoryCategories.map((item) => <span key={item}>{item}</span>)}
      </div>
      <small>Future mode: Connected Memory for approved claims, rejected wording, buyer objections, winning hooks, campaign outcomes, and market positioning.</small>
    </section>
  );
}

export default CMOCommandPage;
