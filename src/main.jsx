import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Archive,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  BrainCircuit,
  Building2,
  Calculator,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  ClipboardCheck,
  ClipboardList,
  Command,
  Database,
  Eye,
  ExternalLink,
  FileCheck2,
  FileBarChart,
  FileText,
  Factory,
  Fingerprint,
  Gauge,
  Gem,
  Keyboard,
  KeyRound,
  LockKeyhole,
  LayoutDashboard,
  Mail,
  Menu,
  Network,
  PackageCheck,
  Palette,
  Plug,
  Printer,
  RadioTower,
  Route,
  ScanLine,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  TrendingUp,
  Target,
  TimerReset,
  TriangleAlert,
  UploadCloud,
  User,
  UsersRound,
  Workflow,
  X,
  Zap
} from 'lucide-react';
import {
  CFOIcon,
  CIOIcon,
  CMOIcon,
  COOIcon,
  CTOIcon,
  DirectorIcon,
  ExportOSIcon,
  GopuLogoMark,
  GopuWordmark,
  LearningIcon,
  PlantOSIcon
} from './components/brand/BrandIcons.jsx';
import {
  Breadcrumb,
  BulkActionBar,
  EmptyState,
  FilterBar,
  HBarChart,
  MetricSkeletonGrid,
  MiniBars,
  Panel,
  PriorityBadge,
  SeverityBadge,
  SignalList,
  SkeletonBlock,
  SkeletonCard,
  SkeletonKpiBar,
  SkeletonTable,
  SortableTableHeader,
  StateChip,
  StatusBadge,
  StatusPill,
  StatusPulse,
  TrendIndicator,
  VirtualList,
  useSortable
} from './components/shared/Primitives.jsx';
import { announceToSR, getRouteAnnouncement, highlightMatch } from './utils/ui.jsx';
import { cachedRead } from './services/performanceCache.js';

export {
  Breadcrumb,
  BulkActionBar,
  EmptyState,
  FilterBar,
  HBarChart,
  MetricSkeletonGrid,
  MiniBars,
  Panel,
  PriorityBadge,
  SeverityBadge,
  SignalList,
  SkeletonBlock,
  SkeletonCard,
  SkeletonKpiBar,
  SkeletonTable,
  SortableTableHeader,
  StateChip,
  StatusBadge,
  StatusPill,
  StatusPulse,
  TrendIndicator,
  VirtualList,
  useSortable
};

// GOPU Brand Identity
import { backendStatus, supabaseConfigStatus, supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { ctoLabels } from '../GOPU_OS/cto/labels.js';
import {
  DEFAULT_CMO_TIMEZONE,
  CMO_PLATFORM_DEFAULT_SLOTS,
  CMO_TIMEZONE_OPTIONS,
  formatInCmoTimezone,
  getCmoDateRangeUtc,
  getCmoLocalIsoDate,
  getCmoNowUtc,
  getCmoRollingRangeStartUtc,
  getCmoTimezoneLabel,
  getCmoTimezoneOption,
  getNextPlatformSlot,
  getSelectedCmoTimezone,
  isUtcOnOrAfter,
  isUtcOnOrBefore
} from './lib/cmoTimezone.js';
import {
  demoTenantId,
  getCompanyAuditLog,
  getCompanyDocuments,
  getCompanyProfile,
  getCompanyRegistrations,
  getDocumentDefaults,
  getLutDetails,
  saveCompanyDocument,
  saveCompanyProfile,
  saveCompanyRegistration,
  saveDocumentDefaults,
  saveLutDetails
} from './services/companyService.js';
import {
  addApprovalComment,
  approveRequest,
  createApprovalRequest,
  escalateRequest,
  getApprovalQueue,
  needsReviewRequest,
  rejectRequest,
  requestSensitiveActionApproval,
  requestRevision
} from './services/approvalService.js';
import {
  directorBranches,
  getDirectorCommandData
} from './services/directorService.js';
import {
  backendStatus as invoiceBackendStatus,
  buildCompanySnapshotFromVault,
  createInvoiceCompanySnapshot,
  createInvoiceDraftFromVault,
  demoTenantId as invoiceTenantId,
  validateInvoice as validateInvoiceFromService,
  writeInvoiceAuditLog
} from './services/invoiceService.js';
import {
  createAutomationLogEntry,
  loadAutomationCenter
} from './services/automationService.js';
import { createAuditLog, listAuditLogs } from './services/auditService.js';
import {
  createSecurityAuditEvent,
  loadSecurityDashboard
} from './services/securityService.js';
import {
  addTaskComment,
  createTaskFromWorkflow,
  escalateTask as escalateWorkflowTask,
  getCOOTaskSummary,
  getTasks,
  updateTaskStatus as updateWorkflowTaskStatus,
  writeTaskAuditLog
} from './services/taskService.js';
import {
  createCOOFollowupTask,
  generateCOODailyPlan,
  generateFounderOperationsSummary,
  getApprovalDependencies,
  getBlockedWorkflows,
  getCOOSummary,
  getInvoiceDocumentReadiness,
  getOperationsControlBoard,
  getSOPImprovementWatch,
  getSupplierShipmentFollowups,
  getTodayPriorities
} from './services/cooService.js';
import {
  createShipment,
  generateShipmentReference,
  getNextShipmentAction,
  getShipmentStatus,
  getShipmentTrackerData,
  shipmentDocumentChecklist,
  shipmentStages,
  updateShipment,
  verifyShipmentCompany
} from './services/shipmentService.js';
import {
  createPaymentRequirement,
  generateFounderTechnicalSummary,
  getCTODashboard,
  getIncidents,
  getLiveIntegrationStatus,
  getSubscriptionWatch,
  getSystemHealthSummary
} from './services/ctoService.js';
import { getPaymentVaultRenewals } from './services/renewalService.js';
import {
  generateCFOReport,
  getCFODashboard,
  generateFounderFinancialSummary,
  getCFOSummary,
  getFinancialRisks,
  getMonthlyProfit,
  getMarginAnalytics,
  getPayables,
  getPaymentVaultSummary,
  getRecurringPayments,
  getReceivables,
  getRenewalForecast,
  getWeeklyProfit,
  initiatePayment
} from './services/cfoService.js';
import {
  generateDailyGrowthRunbook,
  generateCMOReport,
  generateFounderMarketingSummary,
  createMarketingCampaignDraft,
  cleanupLatestStep6TestContentPackage,
  createStep6TestContentPackage,
  getAIBudgetAnalysis,
  getAICampaignForecasts,
  getAICmoOperatingSystem,
  getAIGrowthInsights,
  getAILeadScores,
  getAIRecommendations,
  getAIScheduleOptimizations,
  getBrandRisks,
  getBuyerOutreach,
  getCMOSummary,
  getCampaigns,
  getContentApprovalQueue,
  getCompetitorReviews,
  getContentMemoryArchive,
  getCmoTimezonePreference,
  getCmoAutomationFlow,
  getCmoLearningCentreDashboard,
  getMarketingCampaignControlCenter,
  getCmoProviderConnectionStatus,
  saveCmoPostingSettings,
  saveCmoTimezonePreference,
  getContentCalendar,
  getContentPerformance,
  getCrossExecutiveContentIdeas,
  getFacebookPipeline,
  getGrowthOptimizationInsights,
  getGrowthTargets,
  getInstagramPipeline,
  getLinkedInPipeline,
  getContentToolchain,
  getDigitalMarketingOptimization,
  getGlobalTargetingStrategy,
  getOpenAIContentBrain,
  getOpenAIContentMemory,
  getTenglishVoiceRules,
  getThumbnailDirections,
  getVideoScriptStyles,
  getSocialGrowthAnalytics,
  getSocialGrowthMetrics,
  getYouTubePlans,
  updateFounderContentDecision
} from './services/cmoService.js';
import { getFounderMobileCommandData } from './services/mobileCommandService.js';
import {
  escalateNotification,
  getNotificationCenterData,
  markNotificationViewed
} from './services/notificationService.js';
import {
  createGuidanceApproval,
  createGuidanceTask,
  generateCommunicationDraft,
  getWorkflowGuidanceDashboard,
  runCustomerVerification,
  runWorkflowCrossCheck
} from './services/workflowGuidanceService.js';
import {
  escalateExecutiveConflict,
  generateFounderWarRoomSummary,
  getExecutiveSyncDashboard
} from './services/executiveSyncService.js';
import {
  generateMarketOpportunitySummary,
  getMarketIntelligenceDashboard
} from './services/marketIntelligenceService.js';
import {
  addImporterFounderNote,
  assignImporterOwner,
  convertImporterToBuyerCRM,
  generateImporterEmailDraft,
  generateImporterWhatsAppDraft,
  getImporterById,
  getImporterIntelligenceDashboard,
  searchImporters,
  verifyImporter
} from './services/importerIntelligenceService.js';
import { createLeadDraft, leadService } from './services/leadService.js';
import { sendLeadEmails } from './services/leadEmailService.js';
import {
  getSlackNotificationActivity,
  sendSlackNotification
} from './services/slackNotificationService.js';
import { getTrustCenterData } from './services/trustCenterService.js';
import './styles.css';
import './premium.css';

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Lazy-loaded route pages ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
const DirectorCommandCenter   = React.lazy(() => import('./pages/DirectorPage.jsx'));
const DirectorDecisionDetailPage = React.lazy(() => import('./pages/DirectorPage.jsx').then(m => ({ default: m.DirectorDecisionDetailPage })));
const FounderApprovalWall     = React.lazy(() => import('./pages/DirectorPage.jsx').then(m => ({ default: m.FounderApprovalWall })));
const ApprovalConfirmationModal = React.lazy(() => import('./pages/DirectorPage.jsx').then(m => ({ default: m.ApprovalConfirmationModal })));
const PricingEnginePage       = React.lazy(() => import('./pages/PricingPage.jsx'));
const QuotationSopPricingPage = React.lazy(() => import('./pages/PricingPage.jsx').then(m => ({ default: m.QuotationSopPricingPage })));
const CTOCommandPage          = React.lazy(() => import('./pages/CTOPage.jsx'));
const IntegrationsVault       = React.lazy(() => import('./pages/CTOPage.jsx').then(m => ({ default: m.IntegrationsVault })));
const CMOCommandPage          = React.lazy(() => import('./pages/CMOPage.jsx'));
const CompanyMasterDataVault  = React.lazy(() => import('./pages/CompanyMasterDataPage.jsx'));
const COOCommandPage          = React.lazy(() => import('./pages/COOPage.jsx'));
const LearningCentrePage      = React.lazy(() => import('./pages/LearningCentrePage.jsx'));
const ShipmentsPage           = React.lazy(() => import('./pages/ShipmentsPage.jsx'));
const TasksPage               = React.lazy(() => import('./pages/TasksPage.jsx'));
const WarehouseDashboard      = React.lazy(() => import('./pages/WarehousePage.jsx'));
const WorkflowDependencyEngine = React.lazy(() => import('./pages/WorkflowPage.jsx'));
const WorkflowJourneyDashboard = React.lazy(() => import('./pages/WorkflowPage.jsx').then(m => ({ default: m.WorkflowJourneyDashboard })));
const WorkflowDetailPage       = React.lazy(() => import('./pages/WorkflowPage.jsx').then(m => ({ default: m.WorkflowDetailPage })));
const SupplierProcurementDashboard = React.lazy(() => import('./pages/SuppliersPage.jsx'));
const AutomationCenter      = React.lazy(() => import('./pages/AutomationPage.jsx'));
const SecurityDashboard     = React.lazy(() => import('./pages/SecurityPage.jsx'));


const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Command },
  { id: 'price', label: 'Price Engine', icon: CircleDollarSign },
  { id: 'co', label: 'CO Workflow', icon: ClipboardCheck },
  { id: 'shipments', label: 'Shipment Tracking', icon: Route },
  { id: 'reports', label: 'Reports & Analytics', icon: FileBarChart },
  { id: 'learning-centre', label: 'Learning Centre', icon: BrainCircuit },
  { id: 'orders', label: 'Orders', icon: Boxes },
  { id: 'ai', label: 'AI Assistant Console', icon: Bot },
  { id: 'admin', label: 'Admin Settings', icon: Settings }
];

const metrics = [];

const alerts = [];

const shipments = [];

const feed = [];

const KEYBOARD_SHORTCUTS = [
  {
    section: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'K'], action: 'Command palette', desc: 'Open the global command palette' },
      { keys: ['Ctrl', '/'], action: 'Focus search', desc: 'Jump to the search input' },
      { keys: ['Ctrl', 'B'], action: 'Toggle sidebar', desc: 'Collapse or expand the sidebar' },
      { keys: ['G', 'H'], action: 'Go to Home', desc: 'Navigate to Executive Command Deck' },
      { keys: ['G', 'A'], action: 'Go to Analytics', desc: 'Open analytics dashboard' },
      { keys: ['G', 'S'], action: 'Go to Shipments', desc: 'Open shipment tracking' },
    ],
  },
  {
    section: 'Actions',
    shortcuts: [
      { keys: ['Ctrl', 'N'], action: 'New command', desc: 'Create a new executive command' },
      { keys: ['Ctrl', 'E'], action: 'Export CSV', desc: 'Export current view as CSV' },
      { keys: ['Ctrl', 'Enter'], action: 'Submit / Approve', desc: 'Submit form or approve selected item' },
      { keys: ['Ctrl', 'Z'], action: 'Undo', desc: 'Undo last action' },
    ],
  },
  {
    section: 'Selection & Lists',
    shortcuts: [
      { keys: ['Up', 'Down'], action: 'Navigate list', desc: 'Move focus up or down in any list' },
      { keys: ['Space'], action: 'Select row', desc: 'Toggle selection of focused row' },
      { keys: ['Ctrl', 'A'], action: 'Select all', desc: 'Select all rows in current view' },
      { keys: ['Esc'], action: 'Clear selection', desc: 'Deselect all / close panel' },
    ],
  },
  {
    section: 'Filters',
    shortcuts: [
      { keys: ['F'], action: 'Focus filter bar', desc: 'Jump to the filter search input' },
      { keys: ['Ctrl', 'Shift', 'X'], action: 'Clear filters', desc: 'Reset all active filters' },
    ],
  },
  {
    section: 'System',
    shortcuts: [
      { keys: ['?'], action: 'Shortcuts', desc: 'Show this keyboard shortcuts reference' },
      { keys: ['Ctrl', 'D'], action: 'Toggle dark mode', desc: 'Switch between dark and light theme' },
      { keys: ['Ctrl', 'Shift', 'L'], action: 'End Session', desc: 'Securely end current session' },
    ],
  },
];

const executiveCommandDeck = [
  {
    id: 'director',
    name: 'Director Command',
    title: 'Operating Director',
    role: 'Runs the central operating command layer, connects every executive branch, owns decisions, approvals, escalations, and cross-functional direction.',
    status: 'Online',
    category: 'Operating Center',
    current_focus: 'Executive alignment, blocked workflow decisions, approval control, branch coordination, and founder-ready priorities.',
    key_modules: ['Decision Queue', 'Branch Control', 'Approvals', 'Escalations', 'Executive Sync'],
    route: '/export-os/director',
    last_checked_at: new Date().toISOString(),
    icon: DirectorIcon,
    tone: 'cyan'
  },
  {
    id: 'coo',
    name: 'COO Command',
    title: 'Chief Operating Officer',
    role: 'Runs end-to-end export operations for Indian spices and agri commodities. Manages container stuffing, shipping bill (SB) filing via CHA, phytosanitary inspections (APEDA/PQ), fumigation scheduling, BL/AWB coordination, and supplier follow-up. Tracks LEO (Let Export Order), DPD (Direct Port Delivery), and port cutoff compliance at JNPT, Mundra, and Chennai. Prevents MRL rejections and LC document mismatches.',
    status: 'Online',
    category: 'Operations',
    current_focus: 'Container dispatch, SB filing, phyto certificate issuance, supplier delivery adherence, COO review queue clearance.',
    kpis: ['Shipments dispatched vs. planned', 'Container stuffing %', 'Documentation TAT (hrs)', 'Supplier delivery adherence %', 'Quality rejection rate %', 'Port cutoff compliance', 'Fumigation certificate TAT'],
    key_modules: ['Shipment Execution', 'SB & Customs Docs', 'Supplier Follow-up', 'Quality & Claims', 'Phyto & Fumigation'],
    domain_terms: ['SB', 'BL', 'CHA', 'LEO', 'DPD', 'Phyto', 'CO', 'APEDA', 'FIEO', 'Stuffing', 'MRL', 'FOB', 'CIF', 'Fumigation'],
    route: '/export-os/executives/coo',
    last_checked_at: new Date().toISOString(),
    icon: COOIcon,
    tone: 'cyan'
  },
  {
    id: 'cto',
    name: 'CTO Command',
    title: 'Chief Technology Officer',
    role: 'Manages the Export OS platform reliability, Supabase RLS and edge functions, Slack webhook health, shipment data sync pipelines, and API integrations. Maintains HS code and Incoterm lookup tables, export document generation accuracy, and buyer/pricing data security. Monitors CRON jobs, ENV secrets rotation, and system uptime.',
    status: 'Online',
    category: 'Technology',
    current_focus: 'API uptime, Supabase edge function health, Slack event delivery, shipment record integrity, document generation accuracy.',
    kpis: ['API uptime %', 'Shipment sync latency (ms)', 'Document generation error rate', 'Webhook delivery success %', 'Supabase edge function errors', 'Alert response time', 'Active integrations live'],
    key_modules: ['API & Integrations', 'Supabase & RLS', 'Slack Webhooks', 'Document Engine', 'Security & Secrets'],
    domain_terms: ['RLS', 'Edge Functions', 'Webhook', 'CRON', 'ENV secrets', 'REST API', 'Supabase', 'Vercel', 'OpenAI'],
    route: '/export-os/executives/cto',
    last_checked_at: new Date().toISOString(),
    icon: CTOIcon,
    tone: 'blue'
  },
  {
    id: 'cmo',
    name: 'CMO Command',
    title: 'Chief Marketing Officer',
    role: 'Drives B2B buyer acquisition and brand positioning for Indian spice and agri exports. Manages RFQ pipeline from Alibaba, TradeIndia, and IndiaMART, LinkedIn content on crop updates and certifications, trade show follow-ups (Gulfood, SIAL, Anuga), and product spec sheet distribution. Tracks ASTA color values, moisture %, HS codes, and Kharif/Rabi crop season communications.',
    status: 'Online',
    category: 'Growth',
    current_focus: 'RFQ response speed, LinkedIn buyer outreach, sample dispatch-to-order conversion, trade show lead nurturing.',
    kpis: ['New RFQs received', 'RFQ response time (hrs)', 'LinkedIn reach & connections', 'Sample-to-order conversion %', 'Trade show pipeline value', 'Country revenue concentration %', 'Active buyer conversations'],
    key_modules: ['RFQ Pipeline', 'LinkedIn & Content', 'Sample Management', 'Trade Shows', 'Product Catalogue'],
    domain_terms: ['RFQ', 'PI (Proforma Invoice)', 'ASTA', 'HS Code', 'FOB Offer', 'Kharif', 'Rabi', 'B2B Portal', 'Gulfood', 'SIAL', 'FSSAI', 'Organic', 'Halal', 'Kosher'],
    route: '/export-os/executives/cmo',
    last_checked_at: new Date().toISOString(),
    icon: CMOIcon,
    tone: 'cyan'
  },
  {
    id: 'cfo',
    name: 'CFO Command',
    title: 'Chief Financial Officer',
    role: 'Manages export finance, forex risk, and working capital for spice and agri commodity exports. Tracks USD/INR realization vs. forward cover, LC document compliance, BRC/FIRC reconciliation, RoDTEP and duty drawback ledgers, EDPMS filings, and packing credit (PCFC) utilization. Flags FEMA non-compliance on overdue payments and margin erosion from input cost inflation at APMC mandis.',
    status: 'Online',
    category: 'Finance',
    current_focus: 'USD realization rate, LC discrepancy prevention, RoDTEP credit tracking, CFO pricing review queue, forex forward cover.',
    kpis: ['USD/INR realization vs. forward cover', 'Outstanding LC value', 'Forex P&L on open positions', 'Debtor aging (30/60/90d)', 'RoDTEP & Drawback receivables', 'Working capital utilization %', 'Margin per shipment %'],
    key_modules: ['Forex & Forward Cover', 'LC Management', 'BRC/FIRC Reconciliation', 'RoDTEP & Drawback', 'PCFC & Working Capital'],
    domain_terms: ['BRC', 'FIRC', 'EDPMS', 'RoDTEP', 'Duty Drawback', 'AD Code', 'LC', 'DA', 'DP', 'TT', 'PCFC', 'SDF', 'FEMA', 'Forward Cover', 'MEP'],
    route: '/export-os/executives/cfo',
    last_checked_at: new Date().toISOString(),
    icon: CFOIcon,
    tone: 'amber'
  },
  {
    id: 'cio',
    name: 'CIO Command',
    title: 'Chief Intelligence Officer',
    role: 'Runs global importer intelligence for Indian spice and agri exports. Monitors Volza, Zauba, and ImportGenius for competitor shipment data, scores buyers on payment history and country risk, tracks DGFT policy changes (MEP, export quotas), and benchmarks FOB prices vs. NCDEX/APMC mandi rates. Maps APEDA and Spice Board corridors, monitors EU MRL tightening and SPS regulation changes at destination.',
    status: 'Online',
    category: 'Intelligence',
    current_focus: 'New importer discovery, buyer credit scoring, MEP compliance, DGFT policy alerts, competitor price benchmarking.',
    kpis: ['New importers identified', 'Buyer credit score updates', 'Country import volume trend', 'Competitor price movement', 'DGFT policy changes tracked', 'SPS regulation alerts', 'Market intelligence reports/week'],
    key_modules: ['Importer Database', 'Buyer Scoring', 'DGFT & MEP Alerts', 'Price Benchmarking', 'SPS & Compliance'],
    domain_terms: ['MEP', 'DGFT', 'NCDEX', 'APMC', 'ITC-HS', 'Zauba', 'Volza', 'SPS', 'Country Risk', 'CAGR', 'APEDA', 'Spice Board', 'ImportGenius'],
    route: '/export-os/executives/cio',
    last_checked_at: new Date().toISOString(),
    icon: CIOIcon,
    tone: 'blue'
  },
  {
    id: 'learning-centre',
    name: 'Learning Centre',
    title: 'Research Ingestion',
    role: 'Streams read-only public research findings into executive knowledge storage with source traceability and pgvector retrieval.',
    status: 'Ready',
    category: 'Knowledge',
    current_focus: 'COO, CFO, CTO, CMO, and CIO public-source summaries with audit logs and no execution.',
    key_modules: ['Research Runs', 'Findings Stream', 'Vector Memory', 'Intelligence Report'],
    route: '/export-os/learning-centre',
    last_checked_at: new Date().toISOString(),
    icon: LearningIcon,
    tone: 'blue'
  }
];

const executiveStatusUpdates = [];

const founderReviewQueue = [];

const executiveActivityTimeline = [];

const forexTickerItems = [];

const exportNewsItems = [];

function getCommandRuntimeStatus(commandId) {
  const update = executiveStatusUpdates.find((item) => item.command_id === commandId);
  if (!update) return { label: 'Online', state: 'online' };
  if (update.risk_level === 'High') return { label: 'Error', state: 'error' };
  if (update.requires_founder_review) return { label: 'Attention', state: 'attention' };
  if (['Sync pending', 'Draft prepared', 'Monitoring'].includes(update.status) || update.message.toLowerCase().includes('ready')) {
    return { label: 'In Progress', state: 'progress' };
  }
  return { label: 'Online', state: 'online' };
}

function formatDisplayDate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Live feed';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function fetchForexRates(previousRates = []) {
  const pairs = [
    { pair: 'USD/INR', base: 'usd' },
    { pair: 'EUR/INR', base: 'eur' },
    { pair: 'AED/INR', base: 'aed' },
    { pair: 'AUD/INR', base: 'aud' },
    { pair: 'GBP/INR', base: 'gbp' }
  ];

  const updatedAt = new Date().toISOString();
  const results = await Promise.all(pairs.map(async (item) => {
    const endpoints = [
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${item.base}.json`,
      `https://latest.currency-api.pages.dev/v1/currencies/${item.base}.json`
    ];
    let payload;
    for (const endpoint of endpoints) {
      try {
        payload = await fetchJson(endpoint);
        break;
      } catch {
        payload = null;
      }
    }
    if (!payload?.[item.base]?.inr) throw new Error(`Missing INR rate for ${item.base}`);
    const rate = Number(payload[item.base].inr);
    const previous = previousRates.find((rateItem) => rateItem.pair === item.pair);
    const parsedPreviousRate = previous ? Number(previous.rawRate ?? previous.rate) : rate;
    const previousRate = Number.isFinite(parsedPreviousRate) ? parsedPreviousRate : rate;
    const diff = rate - previousRate;
    return {
      pair: item.pair,
      rate: rate.toFixed(2),
      rawRate: rate,
      change: diff === 0 ? '0.00' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`,
      direction: diff >= 0 ? 'up' : 'down',
      updated_at: updatedAt,
      source: 'Currency API'
    };
  }));

  return results;
}

function parseGdeltDate(value) {
  if (!value || value.length < 15) return new Date();
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`;
  return new Date(iso);
}

function inferNewsCategory(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('forex') || lower.includes('currency') || lower.includes('rupee') || lower.includes('dollar')) return 'Forex';
  if (lower.includes('commodity') || lower.includes('oil') || lower.includes('grain') || lower.includes('gold')) return 'Commodity Markets';
  if (lower.includes('customs') || lower.includes('exim') || lower.includes('export') || lower.includes('import')) return 'Export Policy';
  if (/\bports?\b/.test(lower)) return 'Port Updates';
  if (lower.includes('shipping') || lower.includes('freight') || lower.includes('vessel')) return 'Shipping';
  if (lower.includes('agreement') || lower.includes('tariff') || lower.includes('policy')) return 'Trade Agreements';
  if (lower.includes('logistics') || lower.includes('supply')) return 'Logistics';
  return 'Export Policy';
}

function decodeNewsText(value = '') {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value.replace(/\s+/g, ' ').trim();
}

function splitGoogleNewsTitle(title = '', fallbackSource = 'Google News') {
  const cleaned = decodeNewsText(title);
  const separatorIndex = cleaned.lastIndexOf(' - ');
  if (separatorIndex === -1) return { headline: cleaned, source: fallbackSource };
  return {
    headline: cleaned.slice(0, separatorIndex).trim(),
    source: cleaned.slice(separatorIndex + 3).trim() || fallbackSource
  };
}

async function fetchGoogleExportNews() {
  const query = encodeURIComponent('export OR import OR shipping OR logistics OR forex OR port OR "trade agreement" when:7d');
  const rssUrl = encodeURIComponent(`https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`);
  const payload = await fetchJson(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const mapped = items
    .filter((item) => item.title && item.link)
    .slice(0, 6)
    .map((item, index) => {
      const { headline, source } = splitGoogleNewsTitle(item.title, item.author || 'Google News');
      const publishedDate = item.pubDate ? new Date(item.pubDate.replace(' ', 'T')) : new Date();
      return {
        id: `${item.guid || item.link}-${index}`,
        headline,
        summary: `Latest trade headline from ${source}. Open the source to read the full publisher article.`,
        category: inferNewsCategory(headline),
        source,
        published_at: publishedDate.toISOString(),
        url: item.link,
        live: true,
        feed: 'Live Google News feed'
      };
    });
  if (!mapped.length) throw new Error('No Google News export headlines found');
  return mapped;
}

async function fetchLatestExportNews() {
  try {
    const googleNews = await fetchGoogleExportNews();
    if (googleNews.length) return googleNews;
  } catch {
    // Continue to the GDELT source below.
  }

  const query = encodeURIComponent('(export OR trade OR shipping OR logistics OR forex OR "trade agreement" OR port) sourcelang:english');
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&format=json&maxrecords=12&sort=datedesc`;
  try {
    const payload = await fetchJson(url);
    const articles = Array.isArray(payload.articles) ? payload.articles : [];
    const mapped = articles
      .filter((article) => article.title && article.url)
      .slice(0, 6)
      .map((article, index) => {
        const publishedDate = parseGdeltDate(article.seendate);
        return {
          id: `${article.url}-${index}`,
          headline: article.title.replace(/\s+/g, ' ').trim(),
          summary: `Live trade intelligence from ${article.domain}. Open the source to read the full publisher article.`,
          category: inferNewsCategory(article.title),
          source: article.domain || 'GDELT',
          published_at: publishedDate.toISOString(),
          url: article.url,
          live: true,
          feed: 'Live GDELT feed'
        };
      });
    if (mapped.length) return mapped;
  } catch {
    // Fallback below uses a CORS-enabled live Google News feed wrapper.
  }

  const fallbackPayload = await fetchJson('https://ok.surf/api/v1/cors/news-feed');
  const fallbackItems = Object.entries(fallbackPayload || {}).flatMap(([feedCategory, feedItems]) => (
    Array.isArray(feedItems) ? feedItems.map((item) => ({ ...item, feedCategory })) : []
  ));
  const keywords = ['export', 'trade', 'shipping', 'logistics', 'forex', 'currency', 'port', 'oil', 'tariff', 'supply'];
  const filtered = fallbackItems.filter((item) => keywords.some((keyword) => item.title?.toLowerCase().includes(keyword)));
  const sourceItems = filtered.length >= 6 ? filtered : fallbackItems;
  const fetchedAt = new Date().toISOString();
  return sourceItems.slice(0, 6).map((item, index) => ({
    id: `${item.link || item.title}-${index}`,
    headline: decodeNewsText(item.title),
    summary: `Live headline from ${item.source || item.feedCategory || 'news feed'}. Open the source to read the full publisher article.`,
    category: inferNewsCategory(`${item.title} ${item.feedCategory}`),
    source: item.source || item.feedCategory || 'Google News',
    published_at: fetchedAt,
    url: item.link,
    live: true,
    feed: 'Live news feed'
  }));
}

function useLiveForexRates() {
  const [rates, setRates] = useState(forexTickerItems);
  const [status, setStatus] = useState('Rates load when live refresh completes');

  useEffect(() => {
    let disposed = false;
    let currentRates = rates;

    async function refreshRates() {
      try {
        const nextRates = await fetchForexRates(currentRates);
        if (!disposed) {
          currentRates = nextRates;
          setRates(nextRates);
          setStatus(`Live rates refreshed ${formatDisplayDate(new Date())}`);
        }
      } catch {
        if (!disposed) setStatus('Live forex unavailable');
      }
    }

    refreshRates();
    const timer = window.setInterval(refreshRates, 60000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  return { rates, status };
}

function useLiveExportNews() {
  const [items, setItems] = useState(exportNewsItems);
  const [status, setStatus] = useState('News loads when live feed connects');

  useEffect(() => {
    let disposed = false;

    async function refreshNews() {
      try {
        const liveItems = await fetchLatestExportNews();
        if (!disposed && liveItems.length) {
          setItems(liveItems);
          setStatus(`Latest live news fetched ${formatDisplayDate(new Date())}`);
        }
      } catch {
        if (!disposed) setStatus('Live news unavailable');
      }
    }

    refreshNews();
    const timer = window.setInterval(refreshNews, 60000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  return { items, status };
}

const operatingSpineModules = [
  {
    id: 'company-master-data',
    title: 'Company Master Data',
    route: '/export-os/company-master-data',
    status: 'Foundation Layer',
    description: 'Company identity, registrations, document defaults, approval rules, and memory-ready tenant data.',
    modules: ['Legal Identity', 'Licenses', 'Document Defaults', 'Approval Rules']
  },
  {
    id: 'approval-wall',
    title: 'Director Command Center',
    route: '/export-os/director',
    status: 'Decision Layer',
    description: 'Centralized director queue for sensitive executive decisions, blocked workflows, escalations, approvals, and clarification requests.',
    modules: ['Director Queue', 'Risk Review', 'Executive Notes', 'Audit Trail']
  },
  {
    id: 'pricing-engine',
    title: 'Pricing Engine',
    route: '/export-os/pricing-engine',
    status: 'Commercial Layer',
    description: 'Quotation pricing, margin validation, freight logic, market checks, and founder approval routing.',
    modules: ['Quote Inputs', 'Margins', 'Forex', 'CFO Review']
  },
  {
    id: 'document-factory',
    title: 'Document Factory',
    route: '/export-os/document-factory',
    status: 'Invoice Control',
    description: 'LUT export invoice drafts, validation, approval routing, PDF-ready previews, and document audit trails.',
    modules: ['LUT Invoice', 'Validation', 'PDF Draft', 'Email Draft']
  },
  {
    id: 'task-followup-engine',
    title: 'Task & Follow-up Engine',
    route: '/export-os/tasks',
    status: 'Execution Layer',
    description: 'Internal task ownership, deadlines, reminders, blocked work, and founder escalation control.',
    modules: ['Tasks', 'Follow-ups', 'Escalations', 'Audit Trail']
  },
  {
    id: 'content-engine',
    title: 'Daily Content Engine',
    route: '/export-os/content-engine',
    status: 'Growth Layer',
    description: 'Daily content runbook, LinkedIn posts, Reels concepts, YouTube planning, and brand approval routing.',
    modules: ['Runbook', 'Pipelines', 'Campaigns', 'Brand Memory']
  },
  {
    id: 'morning-briefing',
    title: 'Founder Morning Briefing',
    route: '/export-os/morning-briefing',
    status: 'Intelligence Layer',
    description: 'Daily executive briefing consolidating COO, CFO, CTO, and CMO risks, approvals, blockers, and priorities.',
    modules: ['Executive Summary', 'Risks', 'Approvals', 'Action Plan']
  },
  {
    id: 'whatsapp-command',
    title: 'WhatsApp Founder Command',
    route: '/export-os/whatsapp-command',
    status: 'Mobile Command Layer',
    description: 'Parse founder WhatsApp instructions into structured leads, pricing requests, invoices, tasks, approvals, and briefings.',
    modules: ['Inbox', 'Parser', 'Routing', 'Response Drafts']
  },
  {
    id: 'automation-center',
    title: 'Workflow Automation Layer',
    route: '/export-os/automation-center',
    status: 'Automation Layer',
    description: 'Controlled workflow triggers, event routing, retries, logs, notifications, approvals, and n8n readiness.',
    modules: ['Triggers', 'Events', 'Retries', 'n8n Prep']
  },
  {
    id: 'security-governance',
    title: 'Security & Access Control',
    route: '/export-os/security',
    status: 'Governance Layer',
    description: 'Role-based permissions, founder security controls, sessions, audit visibility, and tenant isolation.',
    modules: ['Users', 'Roles', 'Sessions', 'Security Audit']
  },
  {
    id: 'payment-vault',
    title: 'Payment Vault',
    route: '/export-os/payment-vault',
    status: 'Financial Audit Center',
    description: 'Infrastructure payments, renewal records, receipts, OTP challenge events, vendor trust, and financial audit trails.',
    modules: ['Payments', 'Receipts', 'Vendors', 'Audit']
  },
  {
    id: 'warehouse-inventory',
    title: 'Warehouse Intelligence',
    route: '/export-os/warehouse',
    status: 'Stock Operations Layer',
    description: 'Inventory visibility, batch tracking, stock movement, dispatch readiness, packing materials, and warehouse risks.',
    modules: ['Inventory', 'Batches', 'Movements', 'Dispatch']
  },
  {
    id: 'supplier-procurement',
    title: 'Supplier & Procurement',
    route: '/export-os/suppliers',
    status: 'Supply Operations Layer',
    description: 'Supplier reliability, product availability, procurement requests, follow-ups, price history, and quality issues.',
    modules: ['Suppliers', 'Availability', 'Procurement', 'Follow-ups']
  },
  {
    id: 'buyer-crm',
    title: 'Buyer CRM',
    route: '/export-os/buyers',
    status: 'Customer Intelligence Layer',
    description: 'Export buyer profiles, enquiry history, quote value, invoice/shipment history, follow-ups, preferences, and buyer risk.',
    modules: ['Buyers', 'Enquiries', 'Quotes', 'Risk']
  },
  {
    id: 'importer-intelligence',
    title: 'CIO Importer Intelligence',
    route: '/export-os/cio',
    status: 'Global Intelligence Layer',
    description: 'Importer discovery, buyer verification, trade corridor signals, APEDA and Spice Board opportunity mapping, and CTO-owned source ingestion for 1000+ verified records.',
    modules: ['Importers', 'Trade Signals', 'Outreach', 'CTO Source Setup']
  },
  {
    id: 'founder-intelligence',
    title: 'Founder Intelligence',
    route: '/export-os/analytics',
    status: 'Strategic Analytics Layer',
    description: 'Executive analytics for company health, workflow bottlenecks, commercial risk, buyers, suppliers, inventory, technology, and marketing.',
    modules: ['Analytics', 'Risk', 'Reports', 'Recommendations']
  }
];

const vaultHealthItems = [
  { label: 'Company Profile', status: 'Draft', tone: 'draft' },
  { label: 'Export Registrations', status: 'Needs Review', tone: 'attention' },
  { label: 'License Documents', status: 'Missing Uploads', tone: 'error' },
  { label: 'Invoice Defaults', status: 'Draft', tone: 'draft' },
  { label: 'Document Fields', status: 'Sync Pending', tone: 'progress' },
  { label: 'Approval Rules', status: 'Founder Review Required', tone: 'attention' }
];

const registrationRecords = [
  'IEC Number',
  'GST Number',
  'PAN Number',
  'FSSAI License Number',
  'APEDA Registration',
  'Spice Board Registration',
  'MSME / Udyam Registration',
  'Importer/Exporter Code Validity',
  'Other Certification Number'
].map((name, index) => ({
  id: `registration-${index}`,
  name,
  status: index < 3 ? 'Needs Review' : 'Missing',
  review: index % 2 === 0 ? 'Founder Review Required' : 'Draft'
}));

const companyDocuments = [
  'IEC Certificate',
  'GST Certificate',
  'FSSAI License',
  'Spice Board Certificate',
  'APEDA Certificate',
  'Company Incorporation / Registration',
  'PAN Document',
  'Bank Letter / Cancelled Cheque',
  'Product Test Reports',
  'Organic Certificate',
  'Phytosanitary Documents',
  'Quality Certificates',
  'Other Export Documents'
].map((name, index) => ({
  id: `document-${index}`,
  name,
  upload_status: index < 2 ? 'Draft pending' : index % 3 === 0 ? 'Missing upload' : 'Needs Review',
  expiry_date: index % 4 === 0 ? 'Needs expiry date' : 'Local date pending',
  last_updated: index < 2 ? 'Today' : 'Not updated',
  owner: ['Founder Office', 'Documentation', 'Compliance', 'Operations'][index % 4]
}));

const approvalRules = [
  ['Quotation approval required before buyer send', 'Sales / Pricing', 'High', 'Founder Review Required'],
  ['Invoice approval required before buyer send', 'Finance', 'High', 'Draft'],
  ['Sensitive document approval required', 'Documentation', 'Critical', 'Needs Review'],
  ['Marketing claim approval required', 'Marketing', 'Medium', 'Draft'],
  ['HS code/origin review required', 'Compliance', 'Critical', 'Founder Review Required'],
  ['Discount approval required above threshold', 'Finance', 'High', 'Draft'],
  ['Payment term approval required', 'Finance', 'High', 'Needs Review'],
  ['High-value order approval required', 'Operations', 'Critical', 'Founder Review Required']
].map(([name, department, risk, status], index) => ({ id: `approval-rule-${index}`, name, department, risk, status }));

const memoryCategories = [
  'Company legal identity',
  'License numbers',
  'Export registrations',
  'Standard invoice fields',
  'Standard quotation fields',
  'Compliance notes',
  'Product defaults',
  'Approval rules',
  'Document templates',
  'Recurring issues',
  'Founder-approved instructions'
];

const licenseExpiryRows = [
  { document: 'FSSAI License', status: 'Needs expiry date', risk: 'High', action: 'Add expiry date before document use' },
  { document: 'Spice Board Certificate', status: 'Missing upload', risk: 'Medium', action: 'Upload certificate pending for review' },
  { document: 'IEC Certificate', status: 'Draft record', risk: 'Medium', action: 'Verify IEC data against founder records' },
  { document: 'Organic Certificate', status: 'Optional / Not uploaded', risk: 'Low', action: 'Upload only if buyer or product claim requires it' }
];

const masterDataAuditTrail = [
  ['09:10', 'Founder Office', 'Company profile draft created', 'Draft'],
  ['09:22', 'System', 'Export registration field updated', 'Needs Review'],
  ['09:40', 'Documentation', 'Document upload pending generated', 'Missing'],
  ['10:05', 'Founder Office', 'Approval rule changed', 'Founder Review Required'],
  ['10:18', 'System', 'Memory sync requested', 'Connect Supabase to activate'],
  ['10:30', 'System', 'Founder review pending', 'Sync Pending']
].map(([time, user, event, status], index) => ({ id: `audit-${index}`, time, user, event, status }));

const tenantReadinessItems = [
  'Tenant company profile',
  'Legal data fields',
  'License repository',
  'Role permissions',
  'Approval rules',
  'Document defaults',
  'Memory namespace',
  'Audit logging',
  'API-ready data model'
];

const masterDataModels = [
  'company_profile',
  'company_registrations',
  'company_documents',
  'document_defaults',
  'export_field_defaults',
  'approval_rules',
  'company_memory_records',
  'master_data_audit_log'
];

const approvalWallRequests = [];

export const approvalFilters = ['All', 'Pending Approval', 'Needs Review', 'Approved', 'Rejected', 'High Risk', 'Financial', 'Compliance', 'Marketing', 'Operations'];

export const approvalAuditEvents = [
  ['09:20', 'COO submitted approval', 'COO Command', 'Waiting Founder Action'],
  ['09:35', 'CFO pricing verified', 'CFO Command', 'Review Pending'],
  ['10:05', 'Founder review pending', 'System', 'High Risk'],
  ['10:40', 'Revision requested', 'Founder Office', 'Revision Requested'],
  ['11:25', 'Approval escalated', 'COO Command', 'Escalated']
].map(([time, event, actor, status], index) => ({ id: `approval-audit-${index}`, time, event, actor, status }));

export const urgentExecutiveAlerts = [
  { title: 'API credits critically low', risk: 'Critical', owner: 'CTO Command', action: 'Review subscription and platform limit' },
  { title: 'Shipment deadline risk', risk: 'High', owner: 'COO Command', action: 'Confirm supplier packing before buyer promise' },
  { title: 'Major pricing deviation detected', risk: 'High', owner: 'CFO Command', action: 'Review margin before quote release' },
  { title: 'Missing export compliance field', risk: 'Critical', owner: 'COO Command', action: 'Complete compliance field before document use' },
  { title: 'Failed lead intake form', risk: 'Medium', owner: 'CTO Command', action: 'Check intake capture and notification flow' },
  { title: 'Subscription expiry risk', risk: 'Medium', owner: 'Founder Office', action: 'Review renewal before automation disruption' }
];

export const approvalMemoryPatterns = [
  'Low-margin quotes usually require freight confirmation before approval',
  'Origin claims require supporting document evidence',
  'Marketing claims using organic/premium/certified wording require founder review',
  'Payment term exceptions above standard terms require CFO note',
  'Repeated document correction: missing origin support reference'
];

export const approvalModels = ['founder_approvals', 'notifications', 'audit_logs', 'workflow sync'];

const pricingAuditEvents = [
  ['08:55', 'Lead intake created', 'Sales Intake', 'Draft'],
  ['09:15', 'COO route completed', 'COO Command', 'Monitoring'],
  ['09:35', 'Pricing calculation generated', 'Pricing Engine', 'Draft Prepared'],
  ['09:50', 'CFO review completed', 'CFO Command', 'Approval Pending'],
  ['10:05', 'Founder approval pending', 'Founder Office', 'Founder Review Required'],
  ['10:25', 'Revision requested', 'Founder Office', 'Revision Requested']
].map(([time, event, actor, status], index) => ({ id: `pricing-audit-${index}`, time, event, actor, status }));

const savedQuoteDrafts = [
  { id: 'GX-QTN-1042', buyer: 'Buyer pending', product: 'Product pending', destination: 'Destination pending', margin: '8.4%', status: 'Founder Approval', approval: 'Founder Review Required', updated: 'Today 10:05' },
  { id: 'GX-QTN-1041', buyer: 'Buyer pending', product: 'Product pending', destination: 'Destination pending', margin: '13.2%', status: 'CFO Review', approval: 'CFO Review Recommended', updated: 'Today 09:42' },
  { id: 'GX-QTN-1040', buyer: 'Nordic Foods AB', product: 'Turmeric powder', destination: 'Gothenburg, Sweden', margin: '15.8%', status: 'Draft', approval: 'Monitoring', updated: 'Yesterday 16:30' },
  { id: 'GX-QTN-1039', buyer: 'Pacific Retail Group', product: 'Mixed spice cartons', destination: 'Auckland, New Zealand', margin: '10.1%', status: 'Revision Required', approval: 'Revision Requested', updated: 'Yesterday 14:10' }
];

const cfoMetrics = [
  { label: 'Quotes Pending Review', value: '07', status: 'Approval Pending' },
  { label: 'Margin Risk Items', value: '03', status: 'Margin Risk' },
  { label: 'FX Watch Pairs', value: '05', status: 'FX Alert' },
  { label: 'Cash Attention Items', value: '02', status: 'Cash Attention' }
];

const cfoAlerts = [
  { title: 'Low-margin quotation detected', detail: 'Dubai quote requires founder review before buyer release.', status: 'Margin Risk', risk: 'High' },
  { title: 'AED movement risk', detail: 'AED/INR movement should be checked before final quotation validity.', status: 'FX Alert', risk: 'Medium' },
  { title: 'Discount exception repeated', detail: 'Pacific buyer requested above-threshold discount twice this month.', status: 'Founder Review Required', risk: 'Medium' }
];

const pricingModels = ['pricing_requests', 'pricing_calculations', 'market_validation', 'quote_drafts', 'pricing_audit_log'];

const LUT_EXPORT_ENDORSEMENT = 'SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX';

const invoiceModels = [
  'invoices',
  'invoice_company_snapshot',
  'invoice_buyer_snapshot',
  'invoice_line_items',
  'invoice_export_details',
  'invoice_validation_logs',
  'invoice_approval_events',
  'invoice_audit_log'
];

const invoiceDocumentTypes = [
  { id: 'proforma', name: 'Proforma Invoice', purpose: 'Pre-sale quotation-style document used before final commercial invoice.', defaultStatus: 'Founder Approval Required' },
  { id: 'lut-tax', name: 'Export Tax Invoice under LUT', purpose: 'Main export invoice under LUT/Bond without payment of IGST.', defaultStatus: 'Draft' },
  { id: 'commercial', name: 'Commercial Invoice', purpose: 'Buyer/customs-facing commercial value document for export shipment.', defaultStatus: 'Founder Approval Required' },
  { id: 'invoice-packing', name: 'Invoice-cum-Packing List', purpose: 'Combined commercial invoice and packing list where applicable.', defaultStatus: 'Draft' },
  { id: 'packing-list', name: 'Packing List', purpose: 'Shipment packing and cargo details.', defaultStatus: 'Draft' },
  { id: 'commercial-packing-package', name: 'Commercial Invoice + Packing List Package', purpose: 'Export document package view showing invoice and packing list together for review.', defaultStatus: 'Draft' },
  { id: 'buyer-copy', name: 'Buyer Invoice Copy', purpose: 'Clean buyer-facing copy after founder approval.', defaultStatus: 'Founder Approval Required' },
  { id: 'draft-copy', name: 'Draft Invoice Copy', purpose: 'Internal review copy only with draft watermark.', defaultStatus: 'Draft' },
  { id: 'revised-copy', name: 'Revised Invoice', purpose: 'Versioned invoice after founder/buyer/internal correction.', defaultStatus: 'Revision Required' },
  { id: 'void-record', name: 'Cancelled/Void Invoice', purpose: 'Track invoice cancelled before release without deleting history.', defaultStatus: 'Revision Required' }
];

const documentPackageTemplates = [
  { id: 'basic-export', name: 'Basic Export Package', items: ['Export Tax Invoice under LUT', 'Packing List', 'Buyer communication draft'] },
  { id: 'cha-review', name: 'Customs/CHA Review Package', items: ['Commercial Invoice', 'Packing List', 'LUT details snapshot', 'product/HSN/origin review notes'] },
  { id: 'buyer-release', name: 'Buyer Release Package', items: ['Approved invoice copy', 'packing list', 'payment instructions', 'buyer email draft'] },
  { id: 'internal-audit', name: 'Internal Audit Package', items: ['invoice snapshot', 'validation log', 'approval events', 'revision history', 'audit trail'] }
];

const demoCompanyVaultSnapshot = {
  company_display_name: 'GOPU Exports',
  legal_company_name: 'GOPU Exports Private Limited',
  business_type: 'Export Business',
  registered_address: 'Registered address draft from Company Master Data Vault',
  operating_address: 'Operating address draft from Company Master Data Vault',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  phone: '+91-XXXX-XXXXXX',
  email: 'email pending',
  website: 'website pending',
  authorized_person: 'Founder / Authorized Signatory',
  gstin: 'GSTIN draft - review required',
  iec: 'IEC draft - review required',
  pan: 'PAN draft - review required',
  fssai: 'FSSAI draft',
  apeda: 'APEDA draft',
  spice_board: 'Spice Board draft',
  msme_udyam: 'Udyam draft',
  invoice_prefix: 'GX-INV',
  quotation_prefix: 'GX-QTN',
  default_currency: 'USD',
  default_payment_terms: 'Advance / balance as approved',
  default_incoterm: 'CIF',
  default_port_loading: 'Chennai Port',
  default_bank_name: 'Local Bank Name',
  default_bank_account_masked: 'XXXX-XXXX-4321',
  authorized_signatory: 'Founder / Authorized Signatory',
  company_seal_status: 'Founder review required',
  default_email_footer: 'Documents subject to final approval.',
  buyer_document_note: 'Draft document for review only.',
  product_category: 'Spices',
  hs_code_placeholder: 'HSN review required',
  country_of_origin: 'India',
  packing_unit: 'Carton / bag',
  net_weight: 'Review required',
  gross_weight: 'Review required',
  quality_declaration: 'Quality declaration draft',
  shelf_life_text: 'Shelf-life subject to product QC',
  storage_instructions: 'Store in cool and dry conditions',
  compliance_note: 'Compliance note requires founder review',
  lut_arn: '',
  lut_financial_year: '',
  lut_filing_date: '',
  lut_valid_from: '',
  lut_valid_to: '',
  lut_status: 'Missing',
  lut_document_status: 'Missing upload',
  lut_founder_verified_status: 'Pending'
};

const initialInvoiceDraft = {
  id: 'invoice-draft-lut-001',
  invoice_type: 'Export Tax Invoice under LUT',
  invoice_number: 'GX-INV-DRAFT-001',
  invoice_date: new Date().toISOString().slice(0, 10),
  financial_year: '2026-27',
  quote_reference: 'GX-QTN-1042',
  buyer_reference: '',
  purchase_order_number: '',
  buyer_name: 'Draft Buyer',
  buyer_company: 'Buyer Company Draft',
  buyer_address: '',
  buyer_country: '',
  buyer_email: '',
  buyer_phone: '',
  delivery_address: '',
  destination_country: '',
  buyer_tax_id_optional: '',
  incoterm: 'CIF',
  port_of_loading: 'Chennai Port',
  port_of_discharge: '',
  final_destination: '',
  shipping_mode: 'Sea freight',
  country_of_origin: 'India',
  dispatch_date: '',
  shipment_reference_optional: '',
  currency: 'USD',
  export_mode: 'LUT/Bond Without IGST',
  payment_terms: 'Advance / balance as approved',
  freight: 240,
  insurance: 0,
  other_charges: 80,
  approval_status: 'Founder Review Required',
  status: 'Draft',
  validity: '7 days unless founder changes',
  revision_number: 'REV-00',
  revision_reason: '',
  revised_by: '',
  revised_date: '',
  cancellation_reason: '',
  cancelled_by: '',
  cancelled_at: '',
  package_count: '',
  package_type: 'Carton',
  net_weight: '',
  gross_weight: '',
  package_dimensions: '',
  marks_numbers: '',
  batch_lot: '',
  container_details: '',
  shipping_marks: '',
  company_snapshot: demoCompanyVaultSnapshot,
  items: [
    {
      item_number: 1,
      product_description: 'Premium spice product draft',
      hsn_code: '',
      quality_grade: 'Export grade',
      packing_type: 'Carton',
      quantity: 10,
      unit: 'MT',
      unit_price: 2378,
      discount: 0,
      tax_rate: 0
    }
  ]
};

const invoiceLibraryItems = [
  initialInvoiceDraft,
  {
    ...initialInvoiceDraft,
    id: 'invoice-draft-pi-002',
    invoice_type: 'Proforma Invoice',
    invoice_number: 'GX-PI-DRAFT-002',
    buyer_name: 'Buyer pending',
    buyer_company: 'Buyer pending',
    destination_country: 'Country pending',
    status: 'CFO Review Required',
    approval_status: 'CFO Review Required'
  },
  {
    ...initialInvoiceDraft,
    id: 'invoice-draft-ci-003',
    invoice_type: 'Commercial Invoice',
    invoice_number: 'GX-CI-DRAFT-003',
    buyer_name: 'Korea Foods Import Co.',
    buyer_company: 'Korea Foods Import Co.',
    destination_country: 'South Korea',
    status: 'Validation Failed',
    approval_status: 'Founder Review Required'
  },
  {
    ...initialInvoiceDraft,
    id: 'invoice-draft-pack-004',
    invoice_type: 'Packing List',
    invoice_number: 'GX-PL-DRAFT-004',
    status: 'Draft',
    approval_status: 'COO Review Required'
  },
  {
    ...initialInvoiceDraft,
    id: 'invoice-draft-combo-005',
    invoice_type: 'Invoice-cum-Packing List',
    invoice_number: 'GX-ICPL-DRAFT-005',
    status: 'Draft',
    approval_status: 'Founder Review Required'
  },
  {
    ...initialInvoiceDraft,
    id: 'invoice-draft-rev-006',
    invoice_type: 'Revised Invoice',
    invoice_number: 'GX-INV-DRAFT-001-R1',
    revision_number: 'REV-01',
    revision_reason: 'Buyer address correction pending review',
    revised_by: 'Founder UI',
    revised_date: 'Today',
    status: 'Revision Required',
    approval_status: 'Founder Review Required'
  },
  {
    ...initialInvoiceDraft,
    id: 'invoice-void-007',
    invoice_type: 'Cancelled/Void Invoice',
    invoice_number: 'GX-INV-VOID-007',
    cancellation_reason: 'Duplicate draft created before release',
    cancelled_by: 'Founder UI',
    cancelled_at: 'Today',
    status: 'Revision Required',
    approval_status: 'Revision Required'
  }
];

const pages = {
  dashboard: {
    title: 'AI Executive Command Center',
    subtitle: 'Live operating picture across pricing, clearance, logistics, orders, and AI control.',
    status: 'SYSTEM ONLINE'
  },
  price: {
    title: 'Price Engine',
    subtitle: 'Computational core for margin simulation, landed cost intelligence, and route-adjusted pricing.',
    status: 'CALCULATION CORE'
  },
  co: {
    title: 'CO Workflow',
    subtitle: 'Certificate of origin validation, chamber approvals, evidence bundles, and secure submission.',
    status: 'VALIDATION ACTIVE'
  },
  shipments: {
    title: 'Shipment Tracking',
    subtitle: 'Multi-lane telemetry, route risk, container states, and customs event correlation.',
    status: 'TRACKING LIVE'
  },
  reports: {
    title: 'Reports & Analytics',
    subtitle: 'Executive analytics for margin, clearance velocity, route exposure, and compliance throughput.',
    status: 'ANALYTICS STREAM'
  },
  'learning-centre': {
    title: 'Learning Centre',
    subtitle: 'Read-only public research ingestion for executive knowledge summaries and source-traced findings.',
    status: 'RESEARCH INGESTION'
  },
  orders: {
    title: 'Orders',
    subtitle: 'Export order command with contract values, risk states, and fulfillment workflow.',
    status: 'ORDER MATRIX'
  },
  ai: {
    title: 'AI Assistant Console',
    subtitle: 'Secure reasoning console for recommendations, anomaly analysis, and operational commands.',
    status: 'AI COPILOT ARMED'
  },
  admin: {
    title: 'Admin Settings',
    subtitle: 'Identity, policy, encryption, integrations, approval rails, and system governance.',
    status: 'SECURE ADMIN'
  }
};

function useRipple() {
  React.useEffect(() => {
    function handleClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const btn = target?.closest?.('.btn');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
}

const TOUR_STEPS = [
  {
    selector: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    desc: 'Switch between Commands, Approvals, Analytics, Shipments, Leads, and Settings from here.',
    placement: 'right',
  },
  {
    selector: '[data-tour="cmd-palette-trigger"]',
    title: 'Command Palette',
    desc: 'Press Cmd+K or Ctrl+K to open the command palette, the fastest way to navigate or run an action.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    desc: 'One-click shortcuts for your most common tasks: new command, approvals, export report.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="analytics-tab"]',
    title: 'Analytics Dashboard',
    desc: 'Track KPIs, revenue trends, and shipment status in real time across all divisions.',
    placement: 'right',
  },
  {
    selector: '[data-tour="settings-trigger"]',
    title: 'Settings & Preferences',
    desc: 'Customise your theme, accent colour, notifications, and timezone from settings.',
    placement: 'left',
  },
];

function getSpotlightRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 };
}

function cardPosition(rect, placement) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  const gap = 18;
  const width = 300;
  const maxLeft = Math.max(16, window.innerWidth - width - 16);
  const maxTop = Math.max(16, window.innerHeight - 220);
  let top = rect.top;
  let left = rect.left;

  if (placement === 'right') left = rect.left + rect.width + gap;
  else if (placement === 'left') left = rect.left - width - gap;
  else if (placement === 'bottom') top = rect.top + rect.height + gap;
  else top = rect.top - 140 - gap;

  return {
    top: Math.min(Math.max(16, top), maxTop),
    left: Math.min(Math.max(16, left), maxLeft),
  };
}

function OnboardingTour({ onDone }) {
  const [welcome, setWelcome] = React.useState(true);
  const [step, setStep] = React.useState(0);
  const [rect, setRect] = React.useState(null);

  React.useEffect(() => {
    if (welcome) return undefined;

    function updateRect() {
      setRect(getSpotlightRect(TOUR_STEPS[step]?.selector));
    }

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [step, welcome]);

  function finish() {
    try { localStorage.setItem('gopuos_tour_done', 'true'); } catch {}
    onDone();
  }

  function next() {
    if (step < TOUR_STEPS.length - 1) setStep((current) => current + 1);
    else finish();
  }

  function back() {
    if (step > 0) setStep((current) => current - 1);
  }

  if (welcome) {
    return (
      <div className="tour-welcome" role="dialog" aria-modal="true" aria-label="Welcome to Gopu OS">
        <div className="tour-welcome-card">
          <div className="tour-logo">Gopu OS</div>
          <h2>Welcome aboard</h2>
          <p>
            Your executive command centre for global trade operations.<br />
            Let's take a quick 30-second tour so you feel right at home.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setWelcome(false)}>
              Start Tour
            </button>
            <button className="btn btn-ghost" onClick={finish}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = TOUR_STEPS[step];
  const cardPos = cardPosition(rect, currentStep.placement);
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}`}>
      <div className="tour-backdrop" onClick={finish} aria-hidden="true" />
      {rect && (
        <div
          className="tour-spotlight"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          aria-hidden="true"
        />
      )}
      <div className="tour-card" style={cardPos}>
        <div className="tour-dots" aria-hidden="true">
          {TOUR_STEPS.map((_, index) => (
            <div key={index} className={`tour-dot${index === step ? ' active' : ''}`} />
          ))}
        </div>
        <h3>{currentStep.title}</h3>
        <p>{currentStep.desc}</p>
        <div className="tour-actions">
          {step > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={back}>Back</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={next} autoFocus>
            {isLast ? 'Done' : 'Next'}
          </button>
          <button className="btn-skip" onClick={finish}>Skip tour</button>
        </div>
      </div>
    </div>
  );
}

function KeyboardShortcutsModal({ onClose }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    ref.current?.focus();
  }, []);

  React.useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="kbd-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="kbd-modal" ref={ref} tabIndex={-1}>
        <div className="kbd-modal-header">
          <div>
            <h2 className="kbd-modal-title">Keyboard Shortcuts</h2>
            <p className="kbd-modal-sub">Press <kbd className="kbd">?</kbd> anytime to open this panel</p>
          </div>
          <button className="kbd-modal-close" onClick={onClose} aria-label="Close shortcuts panel">
            <X size={18} />
          </button>
        </div>

        <div className="kbd-modal-body">
          {KEYBOARD_SHORTCUTS.map((group) => (
            <section key={group.section} className="kbd-section">
              <h3 className="kbd-section-title">{group.section}</h3>
              <div className="kbd-rows">
                {group.shortcuts.map((item) => (
                  <div key={item.action} className="kbd-row">
                    <div className="kbd-row-left">
                      <span className="kbd-action">{item.action}</span>
                      <span className="kbd-desc">{item.desc}</span>
                    </div>
                    <div className="kbd-keys" aria-label={item.keys.join(' + ')}>
                      {item.keys.map((key, i) => (
                        <React.Fragment key={`${item.action}-${key}-${i}`}>
                          <kbd className="kbd">{key}</kbd>
                          {i < item.keys.length - 1 && (
                            <span className="kbd-plus" aria-hidden="true">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="kbd-modal-footer">
          <span>Mac: use <kbd className="kbd">Ctrl</kbd> &nbsp; - &nbsp; Windows/Linux: use <kbd className="kbd">Ctrl</kbd></span>
        </div>
      </div>
    </div>
  );
}

function useGlobalHotkeys({ onOpenCommandPalette, onToggleSidebar, onExportCSV, onOpenShortcuts, onNewCommand }) {
  React.useEffect(() => {
    let ghBuffer = '';
    let ghTimer = null;

    function navigateHotkey(path) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      announceToSR?.(`Navigated to ${getRouteAnnouncement(path)}`);
    }

    function handleKey(e) {
      const meta = e.metaKey || e.ctrlKey;
      const tag = e.target.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
        return;
      }
      if (meta && e.key === '/') {
        e.preventDefault();
        document.querySelector('.filter-search-input, [aria-label*="search" i], .search-shell input')?.focus();
        return;
      }
      if (meta && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewCommand?.();
        return;
      }
      if (meta && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        onExportCSV?.();
        return;
      }
      if (!inInput && e.key === '?') {
        e.preventDefault();
        onOpenShortcuts?.();
        return;
      }
      if (!inInput && e.key.toLowerCase() === 'f') {
        document.querySelector('.filter-search-input')?.focus();
        return;
      }
      if (!inInput && e.key.toLowerCase() === 'g') {
        ghBuffer = 'g';
        clearTimeout(ghTimer);
        ghTimer = setTimeout(() => { ghBuffer = ''; }, 1200);
        return;
      }
      if (ghBuffer === 'g' && !inInput) {
        ghBuffer = '';
        clearTimeout(ghTimer);
        if (e.key.toLowerCase() === 'h') navigateHotkey('/export-os');
        if (e.key.toLowerCase() === 'a') navigateHotkey('/export-os/analytics');
        if (e.key.toLowerCase() === 's') navigateHotkey('/export-os/shipments');
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => { window.removeEventListener('keydown', handleKey); clearTimeout(ghTimer); };
  }, [onOpenCommandPalette, onToggleSidebar, onExportCSV, onOpenShortcuts, onNewCommand]);
}

function useSettings() {
  const [settings, setSettings] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gopuos_settings') || 'null') || {
        profile: {
          name: 'Sukesh Reddy',
          role: 'Founder & Director',
          email: 'sukesh@gopuexports.com',
          timezone: 'Asia/Kolkata',
          currency: 'INR',
          language: 'en',
        },
        appearance: {
          theme: 'dark',
          accent: 'cyan',
          fontSize: 'md',
          reducedMotion: false,
          compactMode: false,
        },
        notifications: {
          critical: { inApp: true, email: true, whatsapp: true },
          high: { inApp: true, email: true, whatsapp: false },
          approvals: { inApp: true, email: false, whatsapp: false },
          shipments: { inApp: true, email: false, whatsapp: true },
          payments: { inApp: true, email: true, whatsapp: false },
          marketing: { inApp: false, email: false, whatsapp: false },
        },
        integrations: {
          supabaseConnected: false,
          slackWebhook: '',
          whatsappEnabled: false,
          whatsappNumber: '',
        },
      };
    } catch { return {}; }
  });

  function update(section, key, value) {
    setSettings((prev) => {
      const next = {
        ...prev,
        [section]: { ...prev[section], [key]: value },
      };
      try { localStorage.setItem('gopuos_settings', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function updateNested(section, subKey, key, value) {
    setSettings((prev) => {
      const next = {
        ...prev,
        [section]: {
          ...prev[section],
          [subKey]: { ...prev[section]?.[subKey], [key]: value },
        },
      };
      try { localStorage.setItem('gopuos_settings', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return { settings, update, updateNested };
}

function SettingsPage({ onBack }) {
  const [activeTab, setActiveTab] = React.useState('profile');
  const { settings, update, updateNested } = useSettings();
  const [sessions, setSessions] = React.useState([
    { id: 's1', device: 'Safari on iPhone', location: 'Mumbai, IN', time: '2h ago' },
    { id: 's2', device: 'Chrome on Windows', location: 'Dubai, UAE', time: '1d ago' },
  ]);
  const [pwFields, setPwFields] = React.useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = React.useState('');
  const [slackMsg, setSlackMsg] = React.useState('');
  const [saveMsg, setSaveMsg] = React.useState('');

  function showSave(msg = 'Saved') {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2500);
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'integrations', label: 'Integrations', icon: Plug },
  ];

  function ToggleRow({ label, desc, value, onChange }) {
    return (
      <div className="settings-toggle-row">
        <div className="settings-toggle-copy">
          <span className="settings-toggle-label">{label}</span>
          {desc && <span className="settings-toggle-desc">{desc}</span>}
        </div>
        <button
          role="switch"
          aria-checked={value}
          className={`settings-toggle-switch ${value ? 'on' : 'off'}`}
          onClick={() => onChange(!value)}
          aria-label={label}
        >
          <span className="settings-toggle-thumb" />
        </button>
      </div>
    );
  }

  function SelectRow({ label, value, options, onChange }) {
    return (
      <div className="settings-select-row">
        <label className="settings-select-label">{label}</label>
        <select
          className="settings-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  function InputRow({ label, value, onChange, type = 'text', placeholder = '' }) {
    return (
      <div className="settings-input-row">
        <label className="settings-input-label">{label}</label>
        <input
          type={type}
          className="settings-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
        />
      </div>
    );
  }

  function Section({ title, children }) {
    return (
      <div className="settings-section">
        <h3 className="settings-section-title">{title}</h3>
        <div className="settings-section-body">{children}</div>
      </div>
    );
  }

  const NotifRow = ({ id, label }) => (
    <tr className="notif-row">
      <td className="notif-row-label">{label}</td>
      {['inApp', 'email', 'whatsapp'].map((ch) => (
        <td key={ch} className="notif-row-cell">
          <button
            role="switch"
            aria-checked={settings.notifications?.[id]?.[ch] || false}
            className={`notif-toggle ${settings.notifications?.[id]?.[ch] ? 'on' : 'off'}`}
            onClick={() => updateNested('notifications', id, ch, !settings.notifications?.[id]?.[ch])}
            aria-label={`${label} via ${ch}`}
          />
        </td>
      ))}
    </tr>
  );

  const p = settings.profile || {};
  const a = settings.appearance || {};
  const intg = settings.integrations || {};
  const avatarInitials = (p.name || 'SR').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  async function sendSlackTest() {
    setSlackMsg('Sending...');
    try {
      const r = await fetch('/api/slack/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Test message from GOPU OS Settings ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Slack integration is working!' }),
      });
      const j = await r.json().catch(() => ({}));
      setSlackMsg(j.ok ? 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Test message sent to Slack!' : 'ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Send failed ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â check your bot token and channel ID in Vercel env vars.');
    } catch {
      setSlackMsg('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Request failed.');
    }
    setTimeout(() => setSlackMsg(''), 4000);
  }

  function handleUpdatePassword() {
    if (!pwFields.current) return setPwMsg('Enter your current password.');
    if (!pwFields.next || pwFields.next.length < 8) return setPwMsg('New password must be at least 8 characters.');
    if (pwFields.next !== pwFields.confirm) return setPwMsg('New passwords do not match.');
    setPwMsg('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Password updated successfully.');
    setPwFields({ current: '', next: '', confirm: '' });
    setTimeout(() => setPwMsg(''), 3000);
  }

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <div>
          <h1 className="settings-page-title">Settings</h1>
          <p className="settings-page-sub">Manage your profile, preferences, and integrations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {saveMsg && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success, #22c55e)' }}>{saveMsg}</span>}
          {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack}>ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Ãƒâ€šÃ‚Â Back</button>}
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Settings sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
              >
                <Icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="settings-content" role="tabpanel">
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <Section title="Your Identity">
                <div className="profile-avatar-row">
                  <div className="profile-avatar" aria-label={`Avatar for ${p.name}`}>{avatarInitials}</div>
                  <div>
                    <p className="profile-avatar-name">{p.name}</p>
                    <p className="profile-avatar-role">{p.role}</p>
                  </div>
                </div>
                <InputRow label="Full Name" value={p.name} onChange={(v) => { update('profile', 'name', v); showSave(); }} placeholder="Your full name" />
                <InputRow label="Role Title" value={p.role} onChange={(v) => { update('profile', 'role', v); showSave(); }} placeholder="e.g. Founder & Director" />
                <InputRow label="Email" value={p.email} onChange={(v) => { update('profile', 'email', v); showSave(); }} type="email" placeholder="you@company.com" />
              </Section>
              <Section title="Regional Preferences">
                <SelectRow
                  label="Timezone"
                  value={p.timezone}
                  onChange={(v) => { update('profile', 'timezone', v); showSave(); }}
                  options={[
                    { value: 'Asia/Kolkata', label: 'IST ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Asia/Kolkata (UTC+5:30)' },
                    { value: 'Asia/Dubai', label: 'GST ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Asia/Dubai (UTC+4)' },
                    { value: 'Asia/Singapore', label: 'SGT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Asia/Singapore (UTC+8)' },
                    { value: 'Europe/London', label: 'GMT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Europe/London' },
                    { value: 'America/New_York', label: 'EST ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â America/New_York' },
                    { value: 'America/Los_Angeles', label: 'PST ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â America/Los_Angeles' },
                  ]}
                />
                <SelectRow
                  label="Currency"
                  value={p.currency}
                  onChange={(v) => { update('profile', 'currency', v); showSave(); }}
                  options={[
                    { value: 'INR', label: 'INR ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Indian Rupee' },
                    { value: 'USD', label: 'USD ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â US Dollar' },
                    { value: 'EUR', label: 'EUR ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Euro' },
                    { value: 'AED', label: 'AED ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â UAE Dirham' },
                    { value: 'GBP', label: 'GBP ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â British Pound' },
                    { value: 'SGD', label: 'SGD ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Singapore Dollar' },
                  ]}
                />
              </Section>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <Section title="Theme">
                <div className="theme-toggle-row">
                  {['dark', 'light'].map((t) => (
                    <button
                      key={t}
                      className={`theme-option ${a.theme === t ? 'active' : ''}`}
                      onClick={() => {
                        update('appearance', 'theme', t);
                        document.documentElement.setAttribute('data-theme', t);
                        showSave('Theme updated');
                      }}
                      aria-pressed={a.theme === t}
                    >
                      <span className="theme-option-preview" data-theme-preview={t} />
                      <span>{t === 'dark' ? 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ Dark' : 'ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Light'}</span>
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Accent Colour">
                <div className="accent-swatch-row">
                  {[
                    { id: 'cyan', color: '#2ef2ff', label: 'Cyan' },
                    { id: 'blue', color: '#5b8cff', label: 'Blue' },
                    { id: 'green', color: '#22c55e', label: 'Green' },
                    { id: 'amber', color: '#f59e0b', label: 'Amber' },
                    { id: 'purple', color: '#a78bfa', label: 'Purple' },
                  ].map((acc) => (
                    <button
                      key={acc.id}
                      className={`accent-swatch ${a.accent === acc.id ? 'active' : ''}`}
                      style={{ '--swatch': acc.color }}
                      onClick={() => {
                        update('appearance', 'accent', acc.id);
                        document.documentElement.setAttribute('data-accent', acc.id);
                        showSave(`${acc.label} accent applied`);
                      }}
                      aria-label={`${acc.label} accent`}
                      aria-pressed={a.accent === acc.id}
                      title={acc.label}
                    />
                  ))}
                </div>
              </Section>
              <Section title="Display Options">
                <SelectRow
                  label="Font Size"
                  value={a.fontSize || 'md'}
                  onChange={(v) => {
                    update('appearance', 'fontSize', v);
                    const scales = { sm: '14px', md: '16px', lg: '18px' };
                    document.documentElement.style.fontSize = scales[v] || '16px';
                    showSave('Font size updated');
                  }}
                  options={[
                    { value: 'sm', label: 'Small (14px)' },
                    { value: 'md', label: 'Default (16px)' },
                    { value: 'lg', label: 'Large (18px)' },
                  ]}
                />
                <ToggleRow
                  label="Compact mode"
                  desc="Reduce spacing and padding throughout the UI"
                  value={a.compactMode || false}
                  onChange={(v) => {
                    update('appearance', 'compactMode', v);
                    document.documentElement.toggleAttribute('data-compact', v);
                    showSave();
                  }}
                />
                <ToggleRow
                  label="Reduce motion"
                  desc="Disable animations and transitions"
                  value={a.reducedMotion || false}
                  onChange={(v) => {
                    update('appearance', 'reducedMotion', v);
                    document.documentElement.setAttribute('data-reduced-motion', v ? 'reduce' : 'no-preference');
                    showSave();
                  }}
                />
              </Section>
            </div>
          )}

          {activeTab === 'notifications' && (
            <Section title="Alert Channels">
              <table className="notif-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Alert Type</th>
                    <th>In-App</th>
                    <th>Email</th>
                    <th>WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  <NotifRow id="critical" label="Critical Blockers" />
                  <NotifRow id="high" label="High Priority" />
                  <NotifRow id="approvals" label="Approval Requests" />
                  <NotifRow id="shipments" label="Shipment Updates" />
                  <NotifRow id="payments" label="Payment Alerts" />
                  <NotifRow id="marketing" label="Market Intelligence" />
                </tbody>
              </table>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dim)', marginTop: 'var(--space-2)' }}>
                WhatsApp alerts require Twilio to be configured in Vercel environment variables.
              </p>
            </Section>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <Section title="Active Session">
                <div className="security-session-card active-session">
                  <div>
                    <strong>This device</strong>
                    <span className="session-meta">Current browser ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â IST ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Active now</span>
                  </div>
                  <span className="session-badge current">Current</span>
                </div>
              </Section>
              {sessions.length > 0 && (
                <Section title="Other Sessions">
                  {sessions.map((s) => (
                    <div key={s.id} className="security-session-card">
                      <div>
                        <strong>{s.device}</strong>
                        <span className="session-meta">{s.location} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â {s.time}</span>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm session-revoke"
                        onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 'var(--space-2)', color: 'var(--danger, #ff4d6d)', alignSelf: 'flex-start' }}
                    onClick={() => setSessions([])}
                  >
                    Revoke all other sessions
                  </button>
                </Section>
              )}
              {sessions.length === 0 && (
                <Section title="Other Sessions">
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dim)', margin: 0 }}>No other active sessions.</p>
                </Section>
              )}
              <Section title="Change Password">
                <InputRow label="Current password" type="password" value={pwFields.current} onChange={(v) => setPwFields((p) => ({ ...p, current: v }))} placeholder="Current password" />
                <InputRow label="New password" type="password" value={pwFields.next} onChange={(v) => setPwFields((p) => ({ ...p, next: v }))} placeholder="Min 8 characters" />
                <InputRow label="Confirm new password" type="password" value={pwFields.confirm} onChange={(v) => setPwFields((p) => ({ ...p, confirm: v }))} placeholder="Repeat new password" />
                {pwMsg && (
                  <p style={{ fontSize: 'var(--text-xs)', color: pwMsg.startsWith('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦') ? 'var(--success, #22c55e)' : 'var(--danger, #ff4d6d)', margin: 0 }}>
                    {pwMsg}
                  </p>
                )}
                <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={handleUpdatePassword}>
                  Update Password
                </button>
              </Section>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <Section title="Supabase">
                <div className={`integration-status-card ${intg.supabaseConnected ? 'connected' : 'disconnected'}`}>
                  <div className="integration-status-dot" />
                  <div>
                    <strong>{intg.supabaseConnected ? 'Connected' : 'Not connected'}</strong>
                    <span className="integration-status-desc">
                      {intg.supabaseConnected
                        ? 'Live authentication and database active.'
                        : 'Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Vercel to connect.'}
                    </span>
                  </div>
                </div>
                <InputRow
                  label="Supabase Anon Key (optional override)"
                  type="password"
                  value={intg.supabaseKey || ''}
                  onChange={(v) => { update('integrations', 'supabaseKey', v); showSave(); }}
                  placeholder="eyJh..."
                />
              </Section>
              <Section title="Slack">
                <InputRow
                  label="Webhook URL"
                  value={intg.slackWebhook || ''}
                  onChange={(v) => { update('integrations', 'slackWebhook', v); showSave(); }}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={sendSlackTest}>
                    Send test message
                  </button>
                  {slackMsg && (
                    <span style={{ fontSize: 'var(--text-xs)', color: slackMsg.startsWith('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦') ? 'var(--success, #22c55e)' : 'var(--danger, #ff4d6d)' }}>
                      {slackMsg}
                    </span>
                  )}
                </div>
              </Section>
              <Section title="WhatsApp Business">
                <ToggleRow
                  label="WhatsApp notifications"
                  desc="Director approvals and critical alerts via WhatsApp"
                  value={intg.whatsappEnabled || false}
                  onChange={(v) => { update('integrations', 'whatsappEnabled', v); showSave(); }}
                />
                {intg.whatsappEnabled && (
                  <InputRow
                    label="Director WhatsApp number"
                    type="tel"
                    value={intg.whatsappNumber || ''}
                    onChange={(v) => { update('integrations', 'whatsappNumber', v); showSave(); }}
                    placeholder="+91 98765 43210"
                  />
                )}
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dim)', margin: 0 }}>
                  Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM in Vercel environment variables.
                </p>
              </Section>
              <Section title="Social Media">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  {[
                    { label: 'Meta (Facebook/Instagram)', env: 'META_ACCESS_TOKEN', key: 'metaConnected' },
                    { label: 'LinkedIn', env: 'LINKEDIN_ACCESS_TOKEN', key: 'linkedinConnected' },
                  ].map((item) => (
                    <div key={item.key} className="integration-status-card disconnected" style={{ padding: 'var(--space-3)' }}>
                      <div className="integration-status-dot" />
                      <div>
                        <strong style={{ fontSize: 'var(--text-xs)' }}>{item.label}</strong>
                        <span className="integration-status-desc">Set {item.env} in Vercel</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function usePrintReady() {
  React.useEffect(() => {
    function onBeforePrint() {
      document.documentElement.setAttribute('data-printing', 'true');
    }

    function onAfterPrint() {
      document.documentElement.removeAttribute('data-printing');
    }

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);
}

function PrintButton({ label = 'Print / Save PDF', className = '' }) {
  const [printing, setPrinting] = React.useState(false);

  function handlePrint() {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 120);
  }

  return (
    <button
      className={`btn btn-ghost btn-sm print-btn ${className}`}
      onClick={handlePrint}
      disabled={printing}
      aria-label="Print or save as PDF"
    >
      <Printer size={15} aria-hidden="true" />
      {printing ? 'Preparing...' : label}
    </button>
  );
}

const ANALYTICS_DATA = {
  '7d': {
    revenue: [42, 38, 55, 61, 49, 67, 72],
    shipments: [3, 2, 4, 5, 3, 6, 5],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    totalRevenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹48.2L',
    revenueChange: 12,
    totalShipments: 28,
    shipmentChange: 8,
    pendingApprovals: 5,
    approvalChange: -2,
    avgMargin: '18.4%',
    marginChange: 1.2,
  },
  '30d': {
    revenue: [120, 135, 118, 142, 155, 148, 163, 171, 158, 168, 175, 182, 170, 188, 195, 182, 199, 210, 198, 215, 208, 222, 218, 235, 228, 242, 238, 251, 245, 258],
    shipments: [8, 10, 7, 12, 11, 9, 14, 13, 10, 15, 12, 16, 11, 14, 18, 13, 17, 20, 15, 19, 16, 21, 18, 23, 20, 24, 22, 26, 21, 25],
    labels: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
    totalRevenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹2.14Cr',
    revenueChange: 18,
    totalShipments: 124,
    shipmentChange: 15,
    pendingApprovals: 12,
    approvalChange: -5,
    avgMargin: '19.1%',
    marginChange: 2.3,
  },
  '90d': {
    revenue: [380, 420, 395, 445, 468, 432, 478, 512, 488, 524, 506, 548, 532, 568, 552, 589, 575, 610, 592, 628, 614, 645, 630, 658, 645, 672, 660, 685, 670, 694, 682, 708, 695, 720, 708, 732, 718, 745, 730, 755, 742, 768, 755, 778, 765, 790, 778, 802, 790, 815],
    shipments: [22, 26, 24, 28, 30, 27, 32, 35, 31, 36, 34, 38, 36, 40, 38, 42, 40, 45, 43, 47, 45, 49, 47, 52, 50, 54, 52, 56, 54, 58],
    labels: ['Jan W1', 'Jan W2', 'Jan W3', 'Jan W4', 'Feb W1', 'Feb W2', 'Feb W3', 'Feb W4', 'Mar W1', 'Mar W2', 'Mar W3', 'Mar W4'],
    totalRevenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹6.8Cr',
    revenueChange: 24,
    totalShipments: 412,
    shipmentChange: 22,
    pendingApprovals: 28,
    approvalChange: -12,
    avgMargin: '20.2%',
    marginChange: 3.8,
  },
  '1yr': {
    revenue: [820, 940, 880, 1020, 980, 1150, 1080, 1240, 1180, 1320, 1260, 1420],
    shipments: [48, 56, 52, 62, 58, 70, 66, 76, 72, 82, 78, 90],
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    totalRevenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹28.4Cr',
    revenueChange: 31,
    totalShipments: 1810,
    shipmentChange: 28,
    pendingApprovals: 0,
    approvalChange: 0,
    avgMargin: '21.5%',
    marginChange: 5.2,
  },
};

const TOP_MARKETS = [
  { country: 'UAE', flag: '', revenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹8.2L', share: 72, shipments: 34, trend: 'up' },
  { country: 'Saudi Arabia', flag: '', revenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹5.6L', share: 49, shipments: 22, trend: 'up' },
  { country: 'USA', flag: '', revenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹4.1L', share: 36, shipments: 16, trend: 'stable' },
  { country: 'UK', flag: '', revenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹2.8L', share: 25, shipments: 11, trend: 'up' },
  { country: 'Germany', flag: '', revenue: 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1.9L', share: 17, shipments: 8, trend: 'down' },
];

const PRODUCT_MIX = [
  { name: 'Chilli Powder', share: 32, color: '#ef4444' },
  { name: 'Turmeric', share: 26, color: '#f59e0b' },
  { name: 'Black Pepper', share: 22, color: '#2ef2ff' },
  { name: 'Cumin / Jeera', share: 12, color: '#a78bfa' },
  { name: 'Coriander / Others', share: 8, color: '#60a5fa' },
];

function LineChart({ data, labels, color = 'var(--accent)', height = 160, title }) {
  const W = 520;
  const H = height;
  const PAD = { t: 12, r: 8, b: 28, l: 36 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const max = Math.max(...data) * 1.1 || 1;
  const min = 0;
  const range = max - min || 1;
  const gradientId = `lineGrad-${String(color).replace(/[^a-z0-9]/gi, '')}`;

  const points = data.map((v, i) => {
    const x = PAD.l + (i / (data.length - 1 || 1)) * cW;
    const y = PAD.t + cH - ((v - min) / range) * cH;
    return [x, y];
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1][0].toFixed(1)},${(PAD.t + cH).toFixed(1)} L${PAD.l},${(PAD.t + cH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: (min + range * t).toFixed(0),
    y: PAD.t + cH - t * cH,
  }));
  const labelStep = Math.ceil(labels.length / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="analytics-chart" role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t) => (
        <g key={t.val}>
          <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="var(--border)" strokeWidth="1" />
          <text x={PAD.l - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--dim)">{t.val}</text>
        </g>
      ))}
      <path d={areaD} fill={`url(#${gradientId})`} className="analytics-chart-area" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="analytics-chart-line" />
      {labels.map((label, i) => i % labelStep === 0 && (
        <text key={`${label}-${i}`} x={PAD.l + (i / (labels.length - 1 || 1)) * cW} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--dim)">{label}</text>
      ))}
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3.5" fill={color} />
    </svg>
  );
}

function BarChart({ data, labels, color = 'var(--accent)', height = 140, title }) {
  const W = 520;
  const H = height;
  const PAD = { t: 12, r: 8, b: 28, l: 32 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const max = Math.max(...data) * 1.1 || 1;
  const barW = Math.max(2, (cW / data.length) * 0.6);
  const gap = cW / data.length;
  const labelStep = Math.ceil(labels.length / 10);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="analytics-chart" role="img" aria-label={title}>
      <title>{title}</title>
      {data.map((v, i) => {
        const bH = (v / max) * cH;
        const x = PAD.l + i * gap + (gap - barW) / 2;
        const y = PAD.t + cH - bH;
        return (
          <g key={`${v}-${i}`}>
            <rect x={x} y={y} width={barW} height={bH} fill={color} opacity="0.75" rx="2" className="analytics-chart-bar" />
            {i % labelStep === 0 && (
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--dim)">{labels[i] || ''}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ segments, size = 120, title }) {
  const R = 42;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 14;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
      <title>{title}</title>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={strokeW} />
      {segments.map((seg, i) => {
        const dash = (seg.share / 100) * circ;
        const gap2 = circ - dash;
        const rot = (offset / 100) * 360 - 90;
        offset += seg.share;
        return (
          <circle
            key={`${seg.name}-${i}`}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap2}`}
            transform={`rotate(${rot} ${cx} ${cy})`}
            strokeLinecap="butt"
            className="analytics-donut-segment"
          />
        );
      })}
    </svg>
  );
}

function AnalyticsDashboard({ onBack }) {
  const [period, setPeriod] = React.useState('30d');
  const d = ANALYTICS_DATA[period];

  const periods = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1yr', label: '1 Year' },
  ];

  const chartRevenue = d.revenue.slice(-Math.min(d.revenue.length, 30));
  const chartShipments = d.shipments.slice(-Math.min(d.shipments.length, 30));
  const chartLabels = d.labels.slice(-Math.min(d.labels.length, 30));

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">Analytics</h1>
          <p className="analytics-sub">Export performance intelligence</p>
        </div>
        <div className="analytics-period-tabs" role="tablist" aria-label="Select time period">
          {periods.map((p) => (
            <button
              key={p.value}
              className={`analytics-period-tab ${period === p.value ? 'active' : ''}`}
              onClick={() => setPeriod(p.value)}
              role="tab"
              aria-selected={period === p.value}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>
        {onBack && (
          <button className="btn btn-ghost btn-sm" onClick={onBack} type="button"> Back</button>
        )}
      </div>

      <div className="analytics-kpi-row">
        {[
          { label: 'Total Revenue', value: d.totalRevenue, change: d.revenueChange, trend: 'up-good', color: '#2ef2ff' },
          { label: 'Shipments Completed', value: String(d.totalShipments), change: d.shipmentChange, trend: 'up-good', color: '#22c55e' },
          { label: 'Pending Approvals', value: String(d.pendingApprovals), change: d.approvalChange, trend: 'down-good', color: '#f59e0b' },
          { label: 'Avg Margin', value: d.avgMargin, change: d.marginChange, trend: 'up-good', color: '#a78bfa' },
        ].map((k) => (
          <div key={k.label} className="analytics-kpi-item" style={{ '--kpi-color': k.color }}>
            <span className="analytics-kpi-label">{k.label}</span>
            <strong className="analytics-kpi-value">{k.value}</strong>
            <span
              className="analytics-kpi-change"
              style={{
                color: (k.trend === 'up-good' ? k.change >= 0 : k.change < 0) ? '#22c55e' : '#ff4d6d'
              }}
            >
              {k.change >= 0 ? 'Up' : 'Down'} {Math.abs(k.change)}%
            </span>
          </div>
        ))}
      </div>

      <div className="analytics-charts-row">
        <div className="analytics-chart-card wide">
          <div className="analytics-chart-header">
            <span className="analytics-chart-title">Revenue Trend</span>
            <span className="analytics-chart-meta">INR (Lakhs)</span>
          </div>
          <LineChart data={chartRevenue} labels={chartLabels} color="#2ef2ff" title={`Revenue trend for last ${period}`} />
        </div>
        <div className="analytics-chart-card">
          <div className="analytics-chart-header">
            <span className="analytics-chart-title">Shipment Volume</span>
            <span className="analytics-chart-meta">Count</span>
          </div>
          <BarChart data={chartShipments} labels={chartLabels} color="#22c55e" height={140} title={`Shipment volume for last ${period}`} />
        </div>
      </div>

      <div className="analytics-bottom-row">
        <div className="analytics-chart-card">
          <div className="analytics-chart-header">
            <span className="analytics-chart-title">Top Export Markets</span>
          </div>
          <table className="analytics-markets-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Revenue</th>
                <th>Share</th>
                <th>Shipments</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {TOP_MARKETS.map((m) => (
                <tr key={m.country}>
                  <td><span className="market-flag">{m.flag}</span> {m.country}</td>
                  <td><strong>{m.revenue}</strong></td>
                  <td>
                    <div className="market-share-bar-wrap">
                      <div className="market-share-bar" style={{ width: `${m.share}%` }} />
                      <span>{m.share}%</span>
                    </div>
                  </td>
                  <td>{m.shipments}</td>
                  <td style={{ color: m.trend === 'up' ? '#22c55e' : m.trend === 'down' ? '#ff4d6d' : 'var(--dim)' }}>
                    {m.trend === 'up' ? 'Up' : m.trend === 'down' ? 'Down' : '--ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="analytics-chart-card product-mix-card">
          <div className="analytics-chart-header">
            <span className="analytics-chart-title">Product Mix</span>
          </div>
          <div className="product-mix-body">
            <DonutChart segments={PRODUCT_MIX} size={130} title="Export product mix by share" />
            <ul className="product-mix-legend">
              {PRODUCT_MIX.map((p) => (
                <li key={p.name} className="product-mix-item">
                  <span className="product-mix-dot" style={{ background: p.color }} />
                  <span className="product-mix-name">{p.name}</span>
                  <span className="product-mix-share">{p.share}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const LOCAL_AUTH_EMAIL = 'test@gopuexports.com';
const LOCAL_AUTH_PASSWORD = 'Test@12345';

function getLocalAuthSession() {
  return {
    access_token: 'local-test-session',
    user: {
      id: 'local-test-user',
      email: LOCAL_AUTH_EMAIL
    }
  };
}

function setLocalAuthSession(osId) {
  if (typeof window === 'undefined') return null;
  try {
    window.sessionStorage.setItem('selectedOS', osId);
    window.sessionStorage.setItem('executiveSessionState', 'Local Test Session');
  } catch {}
  return getLocalAuthSession();
}

function App() {
  useRipple();
  usePrintReady();
  const [isPending, startTransition] = React.useTransition();
  const [route, setRoute] = useState(() => window.location.pathname);
  const [authState, setAuthState] = useState(() => ({
    ready: true,
    session: getLocalAuthSession()
  }));
  const [activePage, setActivePage] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCommand, setActiveCommand] = useState('repricing');
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [showTour, setShowTour] = React.useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('gopuos_tour_done') !== 'true';
    } catch {
      return false;
    }
  });
  const current = pages[activePage];
  const isProtectedRoute = route === '/plant-os' || route === '/export-os' || route.startsWith('/export-os/');
  const handleSessionTimeout = React.useCallback(async () => {
    if (!isProtectedRoute || !authState.session) return;
    try {
      window.sessionStorage.removeItem('selectedOS');
      window.sessionStorage.removeItem('executiveSessionState');
    } catch {}
    setAuthState({ ready: true, session: null });
    navigate('/login/export');
  }, [authState.session, isProtectedRoute]);
  const { showWarning, extend } = useSessionTimeout(handleSessionTimeout, 25 * 60 * 1000);
  const sessionWarning = showWarning && isProtectedRoute && authState.session ? (
    <SessionTimeoutWarning
      onExtend={extend}
      onLogout={handleSessionTimeout}
      minutesLeft={5}
    />
  ) : null;
  const withSessionWarning = (node) => (
    <>
      <AnimatePresence>
        <motion.div
          key={route}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          style={{ minHeight: 0 }}
        >
          <React.Suspense fallback={<div className="page-loading"><span>LoadingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦</span></div>}>{node}</React.Suspense>
        </motion.div>
      </AnimatePresence>
      {sessionWarning}
      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </>
  );

  useGlobalHotkeys({
    onOpenCommandPalette: () => window.dispatchEvent(new Event('gopu:open-command-palette')),
    onToggleSidebar: () => window.dispatchEvent(new Event('gopu:toggle-sidebar')),
    onExportCSV: () => exportCSV([], [], 'current-view'),
    onOpenShortcuts: () => setShowShortcuts(true),
    onNewCommand: () => navigate('/export-os/director-console'),
  });

  React.useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route]);

  useEffect(() => {
    (async () => {
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAuthState({ ready: true, session });
          return;
        }
      }
      setAuthState({ ready: true, session: getLocalAuthSession() });
    })();
  }, []);

  useEffect(() => {
    function syncRoute() {
      setRoute(window.location.pathname);
    }

    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (route === '/export-os/agents/coo') {
      window.history.replaceState({}, '', '/export-os/executives/coo');
      setRoute('/export-os/executives/coo');
    }
  }, [route]);

  function navigate(path) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    startTransition(() => setRoute(path));
    announceToSR(`Navigated to ${getRouteAnnouncement(path)}`);
  }

  function completeLocalLogin(osId, path) {
    const session = setLocalAuthSession(osId);
    setAuthState({ ready: true, session });
    navigate(path);
  }

  useEffect(() => {
    if (route === '/' || route === '/login/export' || route === '/login/plant') {
      navigate('/export-os');
    }
  }, [route]);

  if (isProtectedRoute && !authState.ready) {
    return withSessionWarning(<AuthRouteLoading />);
  }

  if (isProtectedRoute && !authState.session) {
    const osId = route === '/plant-os' ? 'plant' : 'export';
    return withSessionWarning(<SelectedOSLogin osId={osId} onBack={() => navigate('/')} onSuccess={() => completeLocalLogin(osId, route === '/plant-os' ? '/plant-os' : '/export-os')} />);
  }

  if (route === '/' || route === '/login/export' || route === '/login/plant') {
    return null;
  }

  if (route === '/export-os/agents/coo') {
    return null;
  }

  if (route === '/plant-os') {
    return withSessionWarning(<PlantDashboard onBack={() => navigate('/')} />);
  }

  if (route === '/export-os/company-master-data') {
    return withSessionWarning(<CompanyMasterDataVault onBack={() => navigate('/export-os')} />);
  }

  if (route === '/export-os/trust-center' || route === '/export-os/company-profile' || route === '/export-os/global-presence' || route === '/export-os/certifications' || route === '/export-os/capabilities') {
    const view = route === '/export-os/company-profile' ? 'profile' : route === '/export-os/global-presence' ? 'presence' : route === '/export-os/certifications' ? 'certifications' : route === '/export-os/capabilities' ? 'capabilities' : 'overview';
    return withSessionWarning(<TrustCenterDashboard navigate={navigate} onBack={() => navigate('/export-os')} view={view} />);
  }

  if (route.startsWith('/export-os/director/decision/')) {
    const decisionId = route.replace('/export-os/director/decision/', '');
    return withSessionWarning(<DirectorDecisionDetailPage decisionId={decisionId} navigate={navigate} onBack={() => navigate('/export-os/director')} />);
  }

  if (route === '/export-os/approval-wall') {
    return withSessionWarning(<FounderApprovalWall onBack={() => navigate('/export-os')} onOpenTasks={() => navigate('/export-os/tasks')} />);
  }

  if (route === '/export-os/director' || route === '/export-os/director-console' || route === '/export-os/director-queue' || route === '/export-os/director-command-center') {
    return withSessionWarning(<DirectorCommandCenter navigate={navigate} onBack={() => navigate('/export-os')} onOpenTasks={() => navigate('/export-os/tasks')} />);
  }

  if (route === '/export-os/operating-spine' || route === '/export-os/system-architecture') {
    return withSessionWarning(<OperatingSpinePage navigate={navigate} onBack={() => navigate('/export-os')} />);
  }

  if (route === '/export-os/pricing-engine') {
    return withSessionWarning(<PricingEnginePage onBack={() => navigate('/export-os')} onOpenApprovalWall={() => navigate('/export-os/director')} onOpenTasks={() => navigate('/export-os/tasks')} />);
  }

  if (route === '/export-os/document-factory' || route === '/export-os/documents') {
    return <DocumentFactoryPage navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/tasks') {
    return <TasksPage navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/morning-briefing' || route === '/export-os/founder-briefings') {
    return <FounderMorningBriefing navigate={navigate} onBack={() => navigate('/export-os')} archiveMode={route === '/export-os/founder-briefings'} />;
  }

  if (route === '/export-os/whatsapp-command' || route === '/export-os/whatsapp-inbox') {
    return <WhatsAppFounderCommand navigate={navigate} onBack={() => navigate('/export-os')} inboxMode={route === '/export-os/whatsapp-inbox'} />;
  }

  if (route === '/export-os/automation-center' || route === '/export-os/workflow-events' || route === '/export-os/automation-logs') {
    return <AutomationCenter navigate={navigate} onBack={() => navigate('/export-os')} view={route.split('/').pop()} />;
  }

  if (route === '/export-os/notifications' || route === '/export-os/alerts' || route === '/export-os/notification-center') {
    return <NotificationCenter navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/workflow-guidance' || route === '/export-os/customer-verification' || route === '/export-os/communication-approvals') {
    const view = route === '/export-os/customer-verification' ? 'Customer Verification' : route === '/export-os/communication-approvals' ? 'Communication Approvals' : 'Workflow Guidance';
    return <WorkflowGuidanceEngine navigate={navigate} onBack={() => navigate('/export-os')} initialView={view} />;
  }

  if (route === '/export-os/workflow-engine' || route === '/export-os/workflow-dependencies') {
    return <WorkflowDependencyEngine navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/workflows' || route === '/export-os/operational-timeline') {
    return <WorkflowJourneyDashboard navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/shipments') {
    return <ShipmentsPage navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route.startsWith('/export-os/shipments/')) {
    const shipmentId = route.split('/').pop();
    return <ShipmentsPage navigate={navigate} onBack={() => navigate('/export-os/shipments')} shipmentId={shipmentId} />;
  }

  if (route.startsWith('/export-os/workflows/')) {
    const workflowId = route.split('/').pop();
    return <WorkflowDetailPage workflowId={workflowId} navigate={navigate} onBack={() => navigate('/export-os/workflows')} />;
  }

  if (route === '/export-os/executive-sync' || route === '/export-os/executive-war-room' || route === '/export-os/executive-coordination') {
    const mode = route === '/export-os/executive-war-room' ? 'War Room' : route === '/export-os/executive-coordination' ? 'Coordination' : 'Sync';
    return <ExecutiveWarRoom navigate={navigate} onBack={() => navigate('/export-os')} mode={mode} />;
  }

  if (route === '/export-os/security' || route === '/export-os/users' || route === '/export-os/roles' || route === '/export-os/access-audit') {
    return <SecurityDashboard navigate={navigate} onBack={() => navigate('/export-os')} view={route.split('/').pop()} />;
  }

  if (route === '/export-os/admin' || route === '/export-os/admin-settings' || route === '/export-os/settings') {
    return <SettingsPage onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/mobile' || route === '/export-os/founder-mobile' || route === '/export-os/mobile-approvals' || route === '/export-os/mobile-briefing') {
    const view = route === '/export-os/mobile-approvals' ? 'Approvals' : route === '/export-os/mobile-briefing' ? 'Briefings' : 'Home';
    return <FounderMobileCommandMode navigate={navigate} onBack={() => navigate('/export-os')} initialView={view} />;
  }

  if (route === '/export-os/payment-vault' || route === '/export-os/payments' || route === '/export-os/payment-audit') {
    return <PaymentVaultDashboard navigate={navigate} onBack={() => navigate('/export-os')} view={route.split('/').pop()} />;
  }

  if (route.startsWith('/export-os/payments/')) {
    const paymentId = route.split('/').pop();
    return <PaymentVaultDashboard navigate={navigate} onBack={() => navigate('/export-os/payments')} view="detail" paymentId={paymentId} />;
  }

  if (route === '/export-os/warehouse' || route === '/export-os/inventory' || route === '/export-os/stock-movement') {
    return <WarehouseDashboard navigate={navigate} onBack={() => navigate('/export-os')} view={route.split('/').pop()} />;
  }

  if (route.startsWith('/export-os/warehouse/')) {
    const warehouseId = route.split('/').pop();
    return <WarehouseDashboard navigate={navigate} onBack={() => navigate('/export-os/warehouse')} view="detail" inventoryId={warehouseId} />;
  }

  if (route === '/export-os/suppliers' || route === '/export-os/procurement' || route === '/export-os/purchase-followups') {
    return <SupplierProcurementDashboard navigate={navigate} onBack={() => navigate('/export-os')} view={route.split('/').pop()} />;
  }

  if (route.startsWith('/export-os/suppliers/')) {
    const supplierId = route.split('/').pop();
    return <SupplierProcurementDashboard navigate={navigate} onBack={() => navigate('/export-os/suppliers')} view="detail" supplierId={supplierId} />;
  }

  if (route === '/export-os/buyers' || route === '/export-os/buyer-crm' || route === '/export-os/customer-intelligence') {
    return <BuyerCRMPage navigate={navigate} onBack={() => navigate('/export-os')} view={route.split('/').pop()} />;
  }

  if (route === '/export-os/lead-intake' || route === '/export-os/leads' || route === '/export-os/leads/new') {
    return <LeadIntakeFormPage navigate={navigate} onBack={() => navigate('/export-os/director')} />;
  }

  if (route === '/export-os/executives/cio' || route === '/export-os/cio' || route === '/export-os/importer-intelligence' || route === '/export-os/importers' || route === '/export-os/buyer-outreach' || route === '/export-os/global-trade-intelligence' || route === '/export-os/trade-events' || route === '/export-os/cio-reports') {
    const view = route === '/export-os/buyer-outreach' ? 'outreach' : route === '/export-os/global-trade-intelligence' ? 'signals' : route === '/export-os/trade-events' ? 'events' : route === '/export-os/cio-reports' ? 'reports' : route === '/export-os/importers' ? 'database' : 'overview';
    return <CIOCommandPage navigate={navigate} onBack={() => navigate('/export-os')} view={view} />;
  }

  if (route.startsWith('/export-os/importers/')) {
    const importerId = route.split('/').pop();
    return <CIOCommandPage navigate={navigate} onBack={() => navigate('/export-os/importers')} view="detail" importerId={importerId} />;
  }

  if (route === '/export-os/market-intelligence') {
    return <MarketIntelligenceDashboard navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/learning-centre' || route === '/export-os/learning-centre/report') {
    return <LearningCentrePage navigate={navigate} onBack={() => navigate('/export-os')} reportMode={route.endsWith('/report')} />;
  }

  if (route.startsWith('/export-os/buyers/')) {
    const buyerId = route.split('/').pop();
    return <BuyerCRMPage navigate={navigate} onBack={() => navigate('/export-os/buyers')} view="detail" buyerId={buyerId} />;
  }

  if (route === '/export-os/analytics') {
    return <AnalyticsDashboard onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/founder-intelligence' || route === '/export-os/reports') {
    return <FounderIntelligenceDashboard navigate={navigate} onBack={() => navigate('/export-os')} view={route.split('/').pop()} />;
  }

  if (route === '/export-os/invoices') {
    return <InvoiceLibrary navigate={navigate} onBack={() => navigate('/export-os')} onOpenTasks={() => navigate('/export-os/tasks')} />;
  }

  if (route === '/export-os/invoices/new') {
    return <InvoiceBuilder navigate={navigate} invoiceId="new" onBack={() => navigate('/export-os/invoices')} onOpenTasks={() => navigate('/export-os/tasks')} />;
  }

  if (route.startsWith('/export-os/invoices/')) {
    const invoiceId = route.split('/').pop();
    return <InvoiceBuilder navigate={navigate} invoiceId={invoiceId} onBack={() => navigate('/export-os/invoices')} onOpenTasks={() => navigate('/export-os/tasks')} />;
  }

  if (route === '/export-os/executives/coo') {
    return <COOCommandPage navigate={navigate} onBack={() => navigate('/export-os')} onOpenApprovalWall={() => navigate('/export-os/director')} onOpenTasks={() => navigate('/export-os/tasks')} />;
  }

  if (route === '/export-os/executives/cfo' || route === '/export-os/finance') {
    return <PricingEnginePage onBack={() => navigate('/export-os')} onOpenApprovalWall={() => navigate('/export-os/director')} onOpenTasks={() => navigate('/export-os/tasks')} />;
  }

  if (route === '/export-os/executives/cmo' || route === '/export-os/content-engine' || route === '/export-os/content-calendar' || route === '/export-os/campaigns') {
    const view = route === '/export-os/content-calendar' ? 'calendar' : route === '/export-os/content-engine' ? 'engine' : route === '/export-os/campaigns' ? 'campaigns' : 'command';
    return <CMOCommandPage view={view} navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route === '/export-os/executives/cto/integrations' || route === '/export-os/platform-monitoring/integrations') {
    return <IntegrationsVault onBack={() => navigate('/export-os/executives/cto')} />;
  }

  if (route === '/export-os/executives/cto' || route === '/export-os/platform-monitoring') {
    return <CTOCommandPage navigate={navigate} onBack={() => navigate('/export-os')} />;
  }

  if (route !== '/export-os') {
    return <OSGateway onSelectOS={(osId) => navigate(`/login/${osId}`)} />;
  }

  return withSessionWarning(
    <>
      <ExecutiveCommandDeck navigate={navigate} showSearch={showSearch} setShowSearch={setShowSearch} setShowShortcuts={setShowShortcuts} session={authState.session} onLogout={async () => {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut();
        }
        window.sessionStorage.removeItem('selectedOS');
        window.sessionStorage.removeItem('executiveSessionState');
        window.sessionStorage.removeItem('founderSessionPin');
        window.sessionStorage.removeItem('founderSecurityPinSet');
        setAuthState({ ready: true, session: null });
        navigate('/login/export');
      }} />
      {showTour && <OnboardingTour onDone={() => setShowTour(false)} />}
    </>
  );
}

function AuthRouteLoading() {
  return (
    <main className="login-gateway tone-cyan">
      <div className="gateway-grid" />
      <section className="login-shell" aria-labelledby="auth-loading-title">
        <div className="login-brand-panel">
          <div className="login-logo-wrap">
            <GopuLogoMark size={52} />
          </div>
          <span className="selected-os-badge">GOPU Export OS</span>
          <h1 id="auth-loading-title">Checking secure session</h1>
          <p>Local authentication is verifying the current browser session.</p>
          <AuthStatusBadge status="Session Check" />
        </div>
      </section>
    </main>
  );
}

function getFounderGreetingPeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

function OSGateway({ onSelectOS }) {
  const [introComplete, setIntroComplete] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const greetingPeriod = useMemo(getFounderGreetingPeriod, []);
  const greeting = `Hello Mr. Sukesh Reddy. Good ${greetingPeriod}.`;

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroComplete(true), 3600);
    return () => window.clearTimeout(timer);
  }, []);

  function selectOS(osId) {
    setSelectedCard(osId);
    window.sessionStorage.setItem('selectedOS', osId);
    window.setTimeout(() => onSelectOS(osId), 420);
  }

  return (
    <main className="founder-gateway min-h-screen overflow-hidden">
      <div className="gateway-grid" />
      <div className="gateway-shell">
        <FounderGreeting
          greeting={greeting}
          introComplete={introComplete}
          onContinue={() => setIntroComplete(true)}
        />
        <AnimatePresence>
          {introComplete && (
            <motion.section
              className="os-selection"
              initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
              aria-labelledby="os-selection-title"
            >
              <div className="selection-copy">
                <span>Select your workspace</span>
                <h1 id="os-selection-title">Where would you like to work today?</h1>
              </div>
            <div className="os-card-grid grid">
                <OSSelectionCard
                  id="export"
                  title="GOPU Export OS"
                  subtitle="Global Trade Command System"
                  description="Manage buyers, pricing, quotations, CO workflow, shipments, documents, and export intelligence."
                  icon={ExportOSIcon}
                  selected={selectedCard === 'export'}
                  onSelect={selectOS}
                />
                <OSSelectionCard
                  id="plant"
                  title="Spice Plant OS"
                  subtitle="Factory & Processing Intelligence"
                  description="Manage raw intake, batch processing, quality checks, packing, warehouse movement, and dispatch operations."
                  icon={PlantOSIcon}
                  selected={selectedCard === 'plant'}
                  onSelect={selectOS}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

const osLoginConfig = {
  export: {
    badge: 'GOPU Export OS',
    title: 'Secure Export OS Access',
    subtitle: 'Global Trade Command System',
    button: 'Enter Export OS',
    tone: 'cyan'
  },
  plant: {
    badge: 'Spice Plant OS',
    title: 'Secure Plant OS Access',
    subtitle: 'Factory & Processing Intelligence',
    button: 'Enter Plant OS',
    tone: 'amber'
  }
};

function normalizeLoginEmail(value) {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function SelectedOSLogin({ osId, onBack, onSuccess }) {
  return <ExportOSLoginPage osId={osId} onBack={onBack} onSuccess={onSuccess} />;
}

function ExportOSLoginPage({ osId, onBack, onSuccess }) {
  const config = osLoginConfig[osId] ?? osLoginConfig.export;
  const [values, setValues] = useState({ identity: LOCAL_AUTH_EMAIL, password: LOCAL_AUTH_PASSWORD, pin: '' });
  const [errors, setErrors] = useState({});
  const [authMessage, setAuthMessage] = useState('Local test login enabled');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLoginError = Object.values(errors).some(Boolean) || /failed|invalid/i.test(authMessage);

  useEffect(() => {
    if (getLocalAuthSession()) {
      setAuthMessage('Local test session restored');
      onSuccess();
    }
  }, [osId, onSuccess]);

  function updateField(field, value) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: '' }));
  }

  async function submitLogin(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = {};
    const identity = normalizeLoginEmail(values.identity);
    if (!identity) nextErrors.identity = 'Email is required.';
    if (!values.password.trim()) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setAuthMessage('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);

    // Try real Supabase auth first
    if (isSupabaseConfigured && supabase) {
      setAuthMessage('Authenticating with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({ email: identity, password: values.password });
      if (data?.session) {
        setAuthMessage('Supabase session created');
        setIsSubmitting(false);
        onSuccess(data.session);
        return;
      }
      if (error) {
        const isWrongPassword = error.message?.toLowerCase().includes('invalid') || error.status === 400;
        setErrors({ password: isWrongPassword ? 'Invalid email or password.' : error.message });
        setAuthMessage('Authentication failed');
        setIsSubmitting(false);
        return;
      }
    }

    // Fallback: local demo login
    if (identity !== LOCAL_AUTH_EMAIL) {
      setErrors({ identity: `Use ${LOCAL_AUTH_EMAIL} for local test access.` });
      setAuthMessage(isSupabaseConfigured ? 'Authentication failed' : 'Supabase not configured ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â use local test account');
      setIsSubmitting(false);
      return;
    }
    if (values.password !== LOCAL_AUTH_PASSWORD) {
      setErrors({ password: 'Invalid local test password.' });
      setAuthMessage('Invalid local test credentials');
      setIsSubmitting(false);
      return;
    }
    setAuthMessage('Creating local test session...');
    setLocalAuthSession(osId);
    setIsSubmitting(false);
    setAuthMessage('Local test session created');
    onSuccess();
  }

  return (
    <main className={`login-gateway tone-${config.tone}`}>
      <div className="gateway-grid" />
      <button className="login-back login-back-top" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        Back to OS Selection
      </button>
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-form-panel">
          <div className="login-form-heading">
            <div className="login-logo-wrap">
              <GopuLogoMark size={52} />
            </div>
            <span>{config.badge}</span>
            <h1 id="login-title">{config.title}</h1>
            <p>Use the local test account while Supabase authentication is disabled.</p>
          </div>
          <div className={`login-auth-status ${hasLoginError ? 'status-error' : 'status-live'}`} role="status" aria-live="polite">
            <span>{authMessage}</span>
            <small>{LOCAL_AUTH_EMAIL}</small>
          </div>
          <form className="login-form" onSubmit={submitLogin} noValidate>
            <SecureField
              id="founder-identity"
              label="Email"
              type="email"
              icon={Mail}
              value={values.identity}
              error={errors.identity}
              onChange={(value) => updateField('identity', value)}
              placeholder={LOCAL_AUTH_EMAIL}
            />
            <PasswordInput
              id="founder-password"
              label="Password"
              value={values.password}
              error={errors.password}
              onChange={(value) => updateField('password', value)}
            />
            <button className="tactical-button login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login'}
              <ChevronRight size={16} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function SecureField({ id, label, type, icon: Icon, value, error, onChange, placeholder }) {
  return (
    <div className={`secure-field ${error ? 'invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div>
        <Icon size={17} />
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={type === 'password' ? 'current-password' : 'username'}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && <small id={`${id}-error`}>{error}</small>}
    </div>
  );
}

function FounderGreeting({ greeting, introComplete, onContinue }) {
  const bootLines = [
    'boot: founder identity lattice online',
    'scan: biometric command key verified',
    'mesh: encrypted OS gateway synchronized',
    'status: Founder access verified.'
  ];

  return (
    <motion.section
      className={`founder-greeting ${introComplete ? 'compact' : ''}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Founder greeting"
    >
      <div className="assistant-core" aria-hidden="true">
        <div className="gateway-orb">
          <div className="gateway-orb-ring ring-1" aria-hidden="true" />
          <div className="gateway-orb-ring ring-2" aria-hidden="true" />
          <div className="gateway-orb-ring ring-3" aria-hidden="true" />
          <div className="gateway-globe-mark">
            <GopuLogoMark size={64} />
          </div>
          <div className="gateway-node n1" aria-hidden="true" />
          <div className="gateway-node n2" aria-hidden="true" />
          <div className="gateway-node n3" aria-hidden="true" />
          <div className="gateway-trace t1" aria-hidden="true" />
          <div className="gateway-trace t2" aria-hidden="true" />
        </div>
      </div>
      <div className="greeting-copy">
        <span>GOPU FOUNDER GATEWAY</span>
        <h1 className="typing-text">{greeting}</h1>
        <p>Founder access verified.</p>
      </div>
      <div className="boot-console">
        {bootLines.map((line, index) => (
          <motion.p
            key={line}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + index * 0.42, duration: 0.42 }}
          >
            {line}
          </motion.p>
        ))}
      </div>
      {!introComplete && (
        <button className="tactical-button gateway-continue" onClick={onContinue}>
          Continue
          <ChevronRight size={16} />
        </button>
      )}
    </motion.section>
  );
}

function OSSelectionCard({ id, title, subtitle, description, icon: Icon, selected, onSelect }) {
  return (
    <motion.button
      type="button"
      className={`os-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(id)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="os-card-icon"><Icon /></div>
      <div>
        <span>{subtitle}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="os-card-footer">
        <span>{selected ? 'Starting...' : 'Launch'}</span>
        <ChevronRight size={17} />
      </div>
    </motion.button>
  );
}

function Sidebar({ activePage, setActivePage, drawerOpen, setDrawerOpen }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  React.useEffect(() => {
    function toggleSidebar() {
      setSidebarCollapsed((prev) => !prev);
    }
    window.addEventListener('gopu:toggle-sidebar', toggleSidebar);
    return () => window.removeEventListener('gopu:toggle-sidebar', toggleSidebar);
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside className={`sidebar ${drawerOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`} aria-label="Primary navigation" data-tour="sidebar">
        <div className="brand-block">
          <GopuWordmark size="sm" />
        </div>
        <nav className="nav-list stagger-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
                data-tour={item.id === 'reports' ? 'analytics-tab' : undefined}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          <Menu size={14} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
        <div className="secure-core">
          <div className="core-orbit"><ShieldCheck size={28} /></div>
          <span>Secure Core</span>
          <strong>Session encrypted</strong>
          <small>All systems online</small>
        </div>
      </aside>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`mobile-nav-btn ${activePage === item.id ? 'active' : ''}`}
              onClick={() => { setActivePage(item.id); setDrawerOpen(false); }}
              aria-label={item.label}
              aria-current={activePage === item.id ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <button className={`drawer-scrim ${drawerOpen ? 'visible' : ''}`} aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />
    </>
  );
}

function Header({ current, setDrawerOpen }) {
  return (
    <header className="system-header">
      <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}>
        <Menu size={20} />
      </button>
      <div className="header-title">
        <span>{current.status}</span>
        <strong>{current.title}</strong>
      </div>
      <div className="search-shell" role="search">
        <Search size={16} />
        <input aria-label="Command search" placeholder="Search orders, lanes, CO records..." />
      </div>
      <div className="header-cluster">
        <LiveClock />
        <StatusPill icon={LockKeyhole} label="Encrypted" tone="cyan" />
        <StatusPill icon={RadioTower} label="Syncing" tone="blue" />
      </div>
    </header>
  );
}

function PageHero({ current }) {
  return (
    <div className="page-hero">
      <div>
        <h1 id="page-title">{current.title}</h1>
        <p>{current.subtitle}</p>
      </div>
      <button className="tactical-button">
        <Zap size={16} />
        Execute Command
        <kbd className="kbd-hint">Ctrl K</kbd>
      </button>
    </div>
  );
}

function Dashboard() {
  const auditLog = approvalAuditEvents.map((event) => ({
    ...event,
    module: event.actor,
    message: event.event,
    type: event.status?.toLowerCase().includes('revision') ? 'warning' : 'success'
  }));

  return (
    <>
      <MetricGrid />
      <div className="dashboard-layout">
        <IntelligenceMap />
        <AIRecommendation />
        <OperationalAlerts />
        <ShipmentTable />
        <SystemStatus />
        <ActivityFeed />
        <section className="panel" aria-labelledby="activity-title">
          <div className="approval-section-header">
            <div>
              <span>Live Feed</span>
              <h2 id="activity-title">Recent Activity</h2>
            </div>
            <Activity size={18} aria-hidden="true" />
          </div>
          <ActivityTimeline events={auditLog || []} />
        </section>
      </div>
    </>
  );
}

function MetricGrid() {
  const [liveMetrics, setLiveMetrics] = useState(metrics);
  useEffect(() => {
    let mounted = true;
    async function fetchDashboardData() {
      try {
        const [summaryRes, approvalsRes, ordersRes] = await cachedRead('dashboard:metric-grid', 60000, () => Promise.allSettled([
          fetch('/api/coo/summary').then((r) => r.ok ? r.json() : null),
          fetch('/api/director/approvals?status=Pending').then((r) => r.ok ? r.json() : null),
          fetch('/api/export/stages').then((r) => r.ok ? r.json() : null)
        ]));
        if (!mounted) return;
        const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
        const approvals = approvalsRes.status === 'fulfilled' ? approvalsRes.value : null;
        const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : null;
        const totalLeads = summary?.data?.totalLeads ?? summary?.totalLeads ?? null;
        const pendingApprovals = Array.isArray(approvals?.data) ? approvals.data.length : (approvals?.count ?? null);
        const activeOrders = Array.isArray(orders?.data) ? orders.data.filter((o) => o.status !== 'Completed').length : (orders?.count ?? null);
        if (totalLeads !== null || pendingApprovals !== null || activeOrders !== null) {
          setLiveMetrics([
            { label: 'Total Leads', value: totalLeads !== null ? String(totalLeads) : '--', tone: 'blue', delta: '' },
            { label: 'Pending Approvals', value: pendingApprovals !== null ? String(pendingApprovals) : '--', tone: 'amber', delta: '' },
            { label: 'Active Orders', value: activeOrders !== null ? String(activeOrders) : '--', tone: 'purple', delta: '' }
          ]);
        }
      } catch (_err) {
        // fall back to hardcoded values silently
      }
    }
    fetchDashboardData();
    return () => { mounted = false; };
  }, []);
  const displayMetrics = liveMetrics.length > 0 ? liveMetrics : metrics;
  return (
    <section className="metric-grid" aria-label="Key metrics">
      {displayMetrics.map((metric, index) => (
        <article className={`metric-panel tone-${metric.tone}`} key={metric.label} style={{ '--delay': `${index * 70}ms` }}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small><TrendIndicator value={metric.delta} suffix="" /></small>
          <div className="metric-line" />
        </article>
      ))}
    </section>
  );
}

function IntelligenceMap() {
  return (
    <Panel className="map-panel span-2" title="Shipment Intelligence" action="Live route mesh">
      <div className="route-canvas" aria-label="Route intelligence visualization">
        <div className="scanline" />
        <div className="node node-a">SYD</div>
        <div className="node node-b">SIN</div>
        <div className="node node-c">DXB</div>
        <div className="node node-d">RTM</div>
        <svg viewBox="0 0 760 280" role="img" aria-label="Animated export route paths">
          <path className="route primary" d="M80 190 C220 60, 320 90, 450 130 S620 210, 705 82" />
          <path className="route secondary" d="M72 198 C250 235, 410 250, 660 172" />
          <path className="route warning" d="M170 84 C280 150, 390 170, 560 92" />
        </svg>
      </div>
    </Panel>
  );
}

function AIRecommendation() {
  return (
    <Panel title="AI Recommendation" action="Confidence 94%">
      <div className="ai-card">
        <Sparkles size={22} />
        <h3>Reroute chilled beef lane through Busan feeder window.</h3>
        <p>Projected clearance gain: 16h. Margin impact remains within shield parameters.</p>
        <button className="ghost-button">Approve analysis <ArrowUpRight size={14} /></button>
      </div>
    </Panel>
  );
}

function OperationalAlerts() {
  return (
    <Panel title="Operational Alerts" action="3 priority">
      <div className="alert-stack">
        {alerts.map((alert) => (
          <div className={`alert-row ${alert.type}`} key={alert.title}>
            <AlertTriangle size={16} />
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ShipmentTable() {
  return (
    <Panel className="span-2 table-panel" title="Active Export Matrix" action="4 high-value lanes">
      <div className="data-table" role="table" aria-label="Active shipments">
        <div className="table-row table-head" role="row">
          <span>Order</span><span>Lane</span><span>Stage</span><span>Risk</span><span>Value</span>
        </div>
        {shipments.length === 0
          ? <EmptyState icon={PackageCheck} title="No shipments" description="No active shipments found." />
          : shipments.map((shipment) => (
            <div className="table-row" role="row" key={shipment.id}>
              <span>{shipment.id}<small>{shipment.cargo}</small></span>
              <span>{shipment.lane}</span>
              <span><StateChip label={shipment.stage} /></span>
              <span className={`risk-${shipment.risk.toLowerCase()}`}>{shipment.risk}</span>
              <span>{shipment.value}</span>
            </div>
          ))}
      </div>
    </Panel>
  );
}

function SystemStatus() {
  return (
    <Panel title="System Status" action="L4 secure">
      <div className="status-stack">
        {['Pricing Core', 'CO Ledger', 'Route Telemetry', 'FX Shield'].map((label, index) => (
          <div className="status-meter" key={label}>
            <div><span>{label}</span><strong>{96 - index * 3}%</strong></div>
            <i style={{ '--width': `${96 - index * 3}%` }} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActivityFeed() {
  return (
    <Panel title="Live Activity Feed" action="Encrypted log">
      <div className="feed-list">
        {feed.map((item, index) => (
          <div className="feed-item" key={item}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PriceEngine() {
  const [margin, setMargin] = useState(18);
  const calculated = useMemo(() => (1284000 * (1 + margin / 100)).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), [margin]);
  return (
    <>
      <MetricGrid />
      <div className="split-layout">
        <Panel className="span-2" title="Margin Simulation" action="Computing">
          <div className="simulator">
            <div className="pricing-output">
              <span>Recommended Export Price</span>
              <strong>{calculated}</strong>
              <small>Risk-adjusted landed cost with shielded FX exposure.</small>
            </div>
            <label className="range-control">
              <span>Target Margin <b>{margin}%</b></span>
              <input type="range" min="8" max="32" value={margin} onChange={(event) => setMargin(Number(event.target.value))} />
            </label>
            <div className="terminal">
              <p>&gt; validating HS code matrix...</p>
              <p>&gt; synchronizing freight intelligence...</p>
              <p>&gt; margin shield locked at {margin}%</p>
            </div>
          </div>
        </Panel>
        <Panel title="Risk Analysis" action="AI weighted">
          <SignalList items={['Port congestion +2.1%', 'Currency drift -0.8%', 'Insurance uplift +1.4%', 'Cold chain premium +3.2%']} />
        </Panel>
        <Panel title="Logistics Cost Intelligence" action="Route model">
          <MiniBars values={[42, 56, 38, 72, 61, 49]} />
        </Panel>
        <Panel title="AI Pricing Recommendations" action="3 options">
          <SignalList items={['Protect premium SKUs in Korea lane', 'Hold Dubai quote for fuel index reset', 'Bundle CO fee into FOB schedule']} />
        </Panel>
      </div>
    </>
  );
}

function WorkflowPage() {
  return (
    <div className="split-layout">
      <Panel className="span-2" title="Certificate Workflow" action="Approval pending">
        <div className="workflow">
          {['Draft', 'Evidence', 'HS Validate', 'Chamber Review', 'Transmit'].map((step, index) => (
            <div className={`workflow-step ${index < 3 ? 'done' : index === 3 ? 'active' : ''}`} key={step}>
              <CheckCircle2 size={18} />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Validation States" action="Encrypted">
        <SignalList items={['Origin verified', 'Commercial invoice matched', 'Packing list locked', 'Chamber signature queued']} />
      </Panel>
      <ShipmentTable />
    </div>
  );
}

function ReportsPage() {
  return (
    <>
      <MetricGrid />
      <div className="split-layout">
        <Panel className="span-2" title="Clearance Velocity" action="30 day">
          <MiniBars values={[62, 68, 74, 79, 83, 91, 88, 96]} />
        </Panel>
        <Panel title="Margin Intelligence" action="Quarter">
          <SignalList items={['Korea +8.4%', 'Dubai +5.2%', 'Singapore +3.9%', 'Rotterdam -1.1%']} />
        </Panel>
        <Panel title="Report Queue" action="Transmission complete">
          <SignalList items={['Board export summary', 'CO audit packet', 'Route risk brief', 'FX exposure model']} />
        </Panel>
      </div>
    </>
  );
}

function OrdersPage() {
  return (
    <div className="split-layout">
      <Panel className="span-2 table-panel" title="Order Control Matrix" action="847 verified">
        <ShipmentTable />
      </Panel>
      <Panel title="Quick Commands" action="Ready">
        <SignalList items={['Create export order', 'Lock pricing', 'Request CO', 'Transmit broker pack']} />
      </Panel>
      <Panel title="Approval Gates" action="Policy enforced">
        <SignalList items={['Dual approval above $1.5M', 'FX lock required for EMEA', 'Cold chain proof mandatory']} />
      </Panel>
    </div>
  );
}

function AIConsole({ activeCommand, setActiveCommand }) {
  return (
    <div className="split-layout">
      <Panel className="span-2" title="AI Assistant Console" action="Secure reasoning">
        <div className="ai-console">
          <div className="console-log">
            <p><b>GOPU AI</b> detected a margin-risk mismatch in the Dubai grain lane.</p>
            <p><b>Action</b> Recommend quote hold until fuel index reset at 14:30 SYD.</p>
            <p><b>Evidence</b> Freight uplift exceeds contract tolerance by 1.4%.</p>
          </div>
          <div className="command-tabs">
            {['repricing', 'risk', 'documents'].map((cmd) => (
              <button className={activeCommand === cmd ? 'active' : ''} onClick={() => setActiveCommand(cmd)} key={cmd}>{cmd}</button>
            ))}
          </div>
        </div>
      </Panel>
      <AIRecommendation />
      <OperationalAlerts />
    </div>
  );
}

function AdminPage() {
  const [approvals, setApprovals] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadApprovals() {
      const result = await getApprovalQueue(demoTenantId);
      if (active) setApprovals(result.data || []);
    }
    loadApprovals();
    const refresh = (event) => setApprovals((current) => [event.detail, ...current.filter((item) => item.id !== event.detail.id)]);
    window.addEventListener('gopu:approval-created', refresh);
    return () => {
      active = false;
      window.removeEventListener('gopu:approval-created', refresh);
    };
  }, []);

  return (
    <div className="split-layout">
      <Panel title="Identity Layer" action="Locked">
        <SignalList items={['SSO enforced', 'Hardware keys required', 'Session timeout 18m', 'Admin quorum active']} />
      </Panel>
      <Panel title="Encryption Mesh" action="Verified">
        <SignalList items={['Ledger signing active', 'Broker API isolated', 'Audit stream immutable', 'Export logs sealed']} />
      </Panel>
      <Panel className="span-2" title="Policy Matrix" action="Governance">
        <div className="policy-grid">
          {['Pricing approval', 'CO submission', 'Broker transmission', 'Admin override'].map((policy) => (
            <div key={policy}><KeyRound size={18} /><span>{policy}</span><strong>Dual control</strong></div>
          ))}
        </div>
      </Panel>
      <FounderApprovalAdminQueue approvals={approvals} />
      <SlackNotificationActivityPanel />
    </div>
  );
}

function FounderApprovalAdminQueue({ approvals = [] }) {
  const pending = approvals.filter((item) => ['Pending Approval', 'Needs Review'].includes(item.status));
  return (
    <Panel className="span-2" title="Founder Approval Queue" action={`${pending.length} pending`}>
      <div className="founder-admin-approval-list">
        {(approvals.length ? approvals.slice(0, 6) : []).map((approval) => (
          <article key={approval.id}>
            <div>
              <strong>{approval.request_type}</strong>
              <span>{approval.related_record || approval.buyer_name || approval.id}</span>
            </div>
            <StatusBadge label={approval.status} state={getApprovalState(approval.status)} />
            <span>{approval.requested_by_label || approval.executive_owner || approval.requested_by}</span>
            <span>{approval.risk_level}</span>
            <small>{approval.reason || approval.summary}</small>
          </article>
        ))}
        {!approvals.length && <div className="notification-empty">No founder approvals yet. Sensitive actions will appear here when requested.</div>}
      </div>
    </Panel>
  );
}

function SlackNotificationActivityPanel() {
  const [items, setItems] = useState(() => getSlackNotificationActivity());

  useEffect(() => {
    function refresh() {
      setItems(getSlackNotificationActivity());
    }
    window.addEventListener('gopu:slack-notification-activity', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('gopu:slack-notification-activity', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <Panel className="span-2" title="Recent Alerts" action="Slack">
      <div className="slack-alert-activity">
        <div className="slack-alert-notice">
          <ShieldCheck size={18} />
          <span>Alerts use the server-side SLACK_WEBHOOK_URL only. The webhook URL is never displayed in GOPU OS.</span>
        </div>
        <div className="slack-alert-list">
          {items.slice(0, 5).map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.type}</strong>
                <span>{item.reference}</span>
              </div>
              <StatusBadge label={item.priority} state={item.priority === 'URGENT' ? 'error' : item.priority === 'WARNING' ? 'attention' : 'progress'} />
              <span>{item.status}</span>
              <time>{item.timestamp?.includes?.('T') ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : item.timestamp}</time>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Gopu OS runtime error:', error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="error-boundary-screen" role="alert">
        <div className="error-boundary-inner">
          <div className="error-boundary-icon" aria-hidden="true">
            <AlertTriangle size={40} />
          </div>
          <h1 className="error-boundary-title">Something went wrong</h1>
          <p className="error-boundary-desc">
            An unexpected error occurred in Gopu OS. Your session data is safe.
          </p>
          <details className="error-boundary-details">
            <summary>Technical details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function MobileBottomNav({ navigate, activeRoute }) {
  const tabs = [
    { label: 'Home', icon: LayoutDashboard, route: '/export-os' },
    { label: 'Approvals', icon: ClipboardCheck, route: '/export-os/approval-wall' },
    { label: 'Director', icon: DirectorIcon, route: '/export-os/director' },
    { label: 'Shipments', icon: COOIcon, route: '/export-os/executives/coo' },
    { label: 'Settings', icon: Settings, route: '/export-os/admin' },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeRoute === tab.route || activeRoute?.startsWith(`${tab.route}/`);
        return (
          <button
            key={tab.route}
            className={`mobile-nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => navigate(tab.route)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="mobile-nav-icon">
              <Icon size={22} />
              {isActive && <span className="mobile-nav-dot" aria-hidden="true" />}
            </div>
            <span className="mobile-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function useSwipeToDismiss(onDismiss, threshold = 60) {
  const ref = React.useRef(null);
  const startX = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    function onTouchStart(event) {
      startX.current = event.touches[0].clientX;
    }

    function onTouchMove(event) {
      if (startX.current === null) return;
      const dx = event.touches[0].clientX - startX.current;
      if (Math.abs(dx) > 10) {
        el.style.transform = `translateX(${dx}px)`;
        el.style.opacity = `${1 - Math.abs(dx) / 200}`;
      }
    }

    function onTouchEnd(event) {
      if (startX.current === null) return;
      const dx = event.changedTouches[0].clientX - startX.current;
      startX.current = null;
      if (Math.abs(dx) > threshold) {
        el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        el.style.transform = `translateX(${dx > 0 ? 120 : -120}%)`;
        el.style.opacity = '0';
        setTimeout(onDismiss, 200);
      } else {
        el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        el.style.transform = '';
        el.style.opacity = '';
        setTimeout(() => {
          if (el) el.style.transition = '';
        }, 200);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onDismiss, threshold]);

  return ref;
}

function MobileSheet({ open, onClose, title, children }) {
  const sheetRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      sheetRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  React.useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="mobile-sheet-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mobile-sheet" ref={sheetRef} tabIndex={-1}>
        <div className="mobile-sheet-handle" aria-hidden="true" />
        <div className="mobile-sheet-header">
          <span className="mobile-sheet-title">{title}</span>
          <button className="mobile-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mobile-sheet-body">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmClass = 'tactical-button', onConfirm, onCancel }) {
  const ref = React.useRef(null);
  useFocusTrap(ref, open);
  if (!open) return null;
  return (
    <div className="confirm-overlay" role="presentation">
      <div
        ref={ref}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <AlertTriangle size={28} className="confirm-icon" aria-hidden="true" />
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onCancel}>Cancel</button>
          <button className={confirmClass} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = React.useState({ open: false });
  const confirm = React.useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        ...options,
        onConfirm: () => { setState({ open: false }); resolve(true); },
        onCancel: () => { setState({ open: false }); resolve(false); },
      });
    });
  }, []);
  const Dialog = <ConfirmDialog {...state} />;
  return { confirm, Dialog };
}

export function useToast() {
  const [toast, setToast] = React.useState(null);
  const removeToast = React.useCallback(() => setToast(null), []);
  const swipeRef = useSwipeToDismiss(removeToast);
  const show = React.useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const ToastUI = toast ? (
    <div ref={swipeRef} className={`toast-strip ${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'success' && <CheckCircle2 size={15} />}
      {toast.type === 'error' && <AlertTriangle size={15} />}
      {toast.type === 'warning' && <TriangleAlert size={15} />}
      {toast.message}
    </div>
  ) : null;
  return { show, ToastUI };
}

function LiveClock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <time
      className="live-clock"
      dateTime={time.toISOString()}
      aria-label={`Current time: ${time.toLocaleTimeString()}`}
    >
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </time>
  );
}

function ConnectionBanner() {
  const [offline, setOffline] = React.useState(!navigator.onLine);
  React.useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!offline) return null;
  return (
    <div className="connection-banner" role="alert" aria-live="assertive">
      <AlertTriangle size={14} aria-hidden="true" />
      You are offline --ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â changes may not save until connection is restored.
    </div>
  );
}

function Tooltip({ text, children }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="tooltip-bubble" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}

function TopLoadingBar({ loading }) {
  const [width, setWidth] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (loading) {
      setVisible(true);
      setWidth(0);
      const t1 = setTimeout(() => setWidth(40), 50);
      const t2 = setTimeout(() => setWidth(70), 400);
      const t3 = setTimeout(() => setWidth(90), 900);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setWidth(100);
      const t = setTimeout(() => { setVisible(false); setWidth(0); }, 400);
      return () => clearTimeout(t);
    }
  }, [loading]);
  if (!visible) return null;
  return (
    <div
      className="top-loading-bar"
      role="progressbar"
      aria-label="Loading"
      aria-valuenow={width}
      style={{ width: `${width}%`, opacity: width === 100 ? 0 : 1 }}
    />
  );
}

function SessionTimeoutWarning({ onExtend, onLogout, minutesLeft = 5 }) {
  return (
    <div className="confirm-overlay" role="alertdialog" aria-modal="true"
      aria-labelledby="timeout-title" aria-describedby="timeout-msg">
      <div className="confirm-dialog" style={{ borderColor: 'rgba(255,90,90,0.3)' }}>
        <TimerReset size={28} style={{ color: 'var(--warning)' }} aria-hidden="true" />
        <h2 id="timeout-title">Session expiring soon</h2>
        <p id="timeout-msg">
          Your session will expire in <strong>{minutesLeft} minutes</strong> due to inactivity.
          Stay signed in or you will be logged out automatically.
        </p>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onLogout}>Sign out now</button>
          <button className="tactical-button" onClick={onExtend}>Stay signed in</button>
        </div>
      </div>
    </div>
  );
}

function useSessionTimeout(onTimeout, timeoutMs = 25 * 60 * 1000, warningMs = 5 * 60 * 1000) {
  const [showWarning, setShowWarning] = React.useState(false);
  const warningTimer = React.useRef(null);
  const logoutTimer = React.useRef(null);
  const reset = React.useCallback(() => {
    setShowWarning(false);
    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);
    warningTimer.current = setTimeout(() => setShowWarning(true), timeoutMs - warningMs);
    logoutTimer.current = setTimeout(() => onTimeout(), timeoutMs);
  }, [onTimeout, timeoutMs, warningMs]);
  React.useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [reset]);
  return { showWarning, extend: reset };
}

export const Pagination = React.memo(function Pagination({ total, perPage = 20, page, onPage }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="page-btn"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`page-btn ${p === page ? 'active' : ''}`}
          onClick={() => onPage(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button
        className="page-btn"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Âº
      </button>
    </nav>
  );
});

function useFocusTrap(ref, isActive) {
  React.useEffect(() => {
    if (!isActive || !ref.current) return;
    const focusable = ref.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const previouslyFocused = document.activeElement;
    if (first) first.focus();
    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      if (focusable.length === 1) { e.preventDefault(); return; }
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused) previouslyFocused.focus();
    };
  }, [isActive, ref]);
}

function ScrollToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const workspace = document.querySelector('.workspace');
    const target = workspace || document.scrollingElement || document.documentElement;
    if (!target) return undefined;

    const readScrollTop = () => (workspace ? workspace.scrollTop : window.scrollY || document.documentElement.scrollTop);
    const onScroll = () => setVisible(readScrollTop() > 400);
    const listenerTarget = workspace || window;
    listenerTarget.addEventListener('scroll', onScroll);
    onScroll();
    return () => listenerTarget.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      className="scroll-top-btn"
      onClick={() => {
        const workspace = document.querySelector('.workspace');
        if (workspace) {
          workspace.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      aria-label="Scroll to top"
    >
      Up
    </button>
  );
}

export function ProgressBar({ value, max = 100, color = 'var(--cyan)', label, showValue = true }) {
  const numericValue = Number(value) || 0;
  const pct = Math.min(100, Math.max(0, (numericValue / max) * 100));
  return (
    <div className="progress-bar-wrap" role="progressbar"
      aria-valuenow={numericValue} aria-valuemin={0} aria-valuemax={max}
      aria-label={label || `${pct.toFixed(0)}%`}>
      {(label || showValue) && (
        <div className="progress-bar-header">
          {label && <span className="progress-bar-label">{label}</span>}
          {showValue && <span className="progress-bar-value">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Sparkline({ data = [], color = 'var(--cyan)', height = 36, width = 120 }) {
  const gradientId = React.useId();
  if (!data || data.length < 2) return null;
  const nums = data.map(Number).filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const points = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastPct = ((nums[nums.length - 1] - min) / range);
  const lastX = width;
  const lastY = height - lastPct * (height - 4) - 2;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      aria-hidden="true"
      overflow="visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}

function RingProgress({ value, max = 100, size = 56, stroke = 4, color = 'var(--cyan)', label }) {
  const numericValue = Number(value) || 0;
  const pct = Math.min(100, Math.max(0, (numericValue / max) * 100));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="ring-progress" style={{ width: size, height: size }}
      role="img" aria-label={label || `${pct.toFixed(0)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 700ms var(--ease)' }}
        />
      </svg>
      <span className="ring-progress-label">
        {pct.toFixed(0)}<small>%</small>
      </span>
    </div>
  );
}

function getNotificationSection(item) {
  const type = String(item.notification_type || item.source_module || '').toLowerCase();
  const severity = String(item.severity || '').toLowerCase();
  const status = String(item.status || '').toLowerCase();
  if (severity === 'critical') return 'Critical Alerts';
  if (type.includes('approval') || status.includes('review') || status.includes('approval')) return 'Pending Reviews';
  if (type.includes('shipment') || type.includes('logistic')) return 'Shipment Risks';
  if (type.includes('payment') || type.includes('financial') || type.includes('cfo')) return 'Payment Alerts';
  if (type.includes('technical') || type.includes('cto')) return 'Technical Incidents';
  if (type.includes('opportunity') || type.includes('lead') || type.includes('cmo') || type.includes('cio')) return 'Strategic Opportunities';
  if (status.includes('escalated')) return 'Executive Escalations';
  return 'Executive Escalations';
}

function normalizeTopNotification(item) {
  return {
    id: item.id,
    section: getNotificationSection(item),
    title: item.title || item.message || 'Notification',
    message: item.message || item.description || 'Workflow notification requires review.',
    severity: item.severity || item.priority || 'Attention',
    owner: item.owner || item.source_module || item.notification_type || 'GOPU OS',
    route: item.linked_route || item.route || '/export-os/notification-center',
    status: item.status || 'Monitoring',
    created_at: item.created_at,
    viewed_by_founder: item.viewed_by_founder
  };
}

function NotificationCentre({ open, onClose, notifications = [] }) {
  const ref = React.useRef(null);
  useFocusTrap(ref, open);
  const groups = React.useMemo(() => {
    const critical = notifications.filter((n) => ['critical', 'high risk'].includes(String(n.severity || n.type || '').toLowerCase()) || n.type === 'error');
    const warnings = notifications.filter((n) => ['warning', 'attention', 'review required', 'high'].includes(String(n.severity || n.type || '').toLowerCase()) || n.type === 'warning');
    const info = notifications.filter((n) => !critical.includes(n) && !warnings.includes(n));
    return [
      { key: 'critical', label: 'Critical', items: critical, cls: 'error' },
      { key: 'warnings', label: 'Warnings', items: warnings, cls: 'warning' },
      { key: 'info', label: 'Updates', items: info, cls: 'info' },
    ].filter((g) => g.items.length > 0);
  }, [notifications]);

  return (
    <>
      <div
        className={`notif-backdrop ${open ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={ref}
        className={`notif-panel ${open ? 'open' : ''}`}
        aria-label="Notification centre"
        aria-hidden={!open}
      >
        <header className="notif-header">
          <div>
            <span className="notif-eyebrow">Live Feed</span>
            <h2>Notifications</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close notifications">
            <ArrowLeft size={16} />
          </button>
        </header>

        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All clear"
            description="No active alerts or notifications."
          />
        ) : (
          <div className="notif-scroll" aria-live="polite" aria-relevant="additions removals">
            {groups.map((group) => (
              <section key={group.key}>
                <div className={`notification-group-header ${group.cls}`}>
                  <span>{group.label}</span>
                  <span className="notif-count">{group.items.length}</span>
                </div>
                {group.items.map((n, i) => (
                  <div key={i} className={`notif-item notif-${group.cls}`}>
                    <div className="notif-item-body">
                      <strong>{n.title || n.message}</strong>
                      {n.detail && <p>{n.detail}</p>}
                    </div>
                    <time className="notification-timestamp">
                      {n.time || n.created_at
                        ? new Date(n.time || n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Now'}
                    </time>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}

function SettingsPanel({ open, onClose, prefs, onPref }) {
  const ref = React.useRef(null);
  useFocusTrap(ref, open);
  return (
    <>
      <div className={`notif-backdrop ${open ? 'visible' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        className={`notif-panel settings-panel ${open ? 'open' : ''}`}
        aria-label="Settings"
        aria-hidden={!open}
      >
        <header className="notif-header">
          <div>
            <span className="notif-eyebrow">Preferences</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <ArrowLeft size={16} />
          </button>
        </header>
        <div className="settings-body">
          <section className="settings-section">
            <h3 className="settings-section-title">Display</h3>
            <SettingToggle
              label="Compact mode"
              description="Reduce padding for denser information view"
              value={prefs.compact}
              onChange={(v) => onPref('compact', v)}
            />
            <SettingToggle
              label="Reduced motion"
              description="Disable animations and transitions"
              value={prefs.reducedMotion}
              onChange={(v) => onPref('reducedMotion', v)}
            />
            <SettingToggle
              label="Show live clock"
              description="Display current time in the header"
              value={prefs.showClock}
              onChange={(v) => onPref('showClock', v)}
            />
            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">Appearance</span>
                <span className="setting-desc">Switch between dark and light mode</span>
              </div>
              <div className="view-toggle">
                <button
                  className={`view-toggle-btn ${prefs.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => onPref('theme', 'dark')}
                  aria-pressed={prefs.theme === 'dark'}
                  aria-label="Dark mode"
                >
                  Dark
                </button>
                <button
                  className={`view-toggle-btn ${prefs.theme === 'light' ? 'active' : ''}`}
                  onClick={() => onPref('theme', 'light')}
                  aria-pressed={prefs.theme === 'light'}
                  aria-label="Light mode"
                >
                  Light
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">Accent colour</span>
                <span className="setting-desc">Choose the interface highlight colour</span>
              </div>
              <div className="accent-swatches" role="radiogroup" aria-label="Accent colour">
                {[
                  { key: 'cyan', color: '#2ef2ff' },
                  { key: 'blue', color: '#5b8cff' },
                  { key: 'green', color: '#3ddc84' },
                  { key: 'amber', color: '#ffb547' },
                  { key: 'purple', color: '#a78bfa' },
                ].map((a) => (
                  <button
                    key={a.key}
                    className={`accent-swatch ${prefs.accent === a.key ? 'active' : ''}`}
                    style={{ background: a.color }}
                    onClick={() => onPref('accent', a.key)}
                    role="radio"
                    aria-checked={prefs.accent === a.key}
                    aria-label={`${a.key} accent`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Notifications</h3>
            <SettingToggle
              label="Critical alerts"
              description="Show error and blocked workflow alerts"
              value={prefs.alertsCritical}
              onChange={(v) => onPref('alertsCritical', v)}
            />
            <SettingToggle
              label="Approval reminders"
              description="Notify when approvals are pending over 2 hours"
              value={prefs.alertsApprovals}
              onChange={(v) => onPref('alertsApprovals', v)}
            />
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Data</h3>
            <SettingToggle
              label="Auto-refresh dashboard"
              description="Reload metrics every 5 minutes"
              value={prefs.autoRefresh}
              onChange={(v) => onPref('autoRefresh', v)}
            />
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dim)', marginBottom: 'var(--space-2)' }}>
                Onboarding
              </p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  localStorage.removeItem('gopuos_tour_done');
                  window.location.reload();
                }}
              >
                Restart welcome tour
              </button>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function SettingToggle({ label, description, value, onChange }) {
  const id = React.useId();
  return (
    <label className="setting-row" htmlFor={id}>
      <div className="setting-copy">
        <span className="setting-label">{label}</span>
        <span className="setting-desc">{description}</span>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={value}
        className={`toggle-switch ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <span className="toggle-thumb" />
      </button>
    </label>
  );
}

function UserChip({ session, onSettings }) {
  const email = session?.user?.email || 'Founder';
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <button className="user-chip" onClick={onSettings} aria-label="Open settings" data-tour="settings-trigger">
      <span className="user-avatar" aria-hidden="true">{initials}</span>
      <span className="user-email">{email.split('@')[0]}</span>
      <Settings size={13} aria-hidden="true" />
    </button>
  );
}

const COMMAND_ITEMS = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', category: 'Navigate', icon: 'Gauge', page: 'dashboard' },
  { id: 'nav-shipments', label: 'Go to Shipments', category: 'Navigate', icon: 'Route', page: 'shipments' },
  { id: 'nav-approvals', label: 'Go to Approvals', category: 'Navigate', icon: 'ShieldCheck', page: 'approvals' },
  { id: 'nav-tasks', label: 'Go to Tasks', category: 'Navigate', icon: 'ClipboardList', page: 'tasks' },
  { id: 'nav-cfo', label: 'Open CFO Finance', category: 'Navigate', icon: 'CircleDollarSign', page: 'cfo' },
  { id: 'nav-coo', label: 'Open COO Operations', category: 'Navigate', icon: 'Workflow', page: 'coo' },
  { id: 'nav-cmo', label: 'Open CMO Marketing', category: 'Navigate', icon: 'TrendingUp', page: 'cmo' },
  { id: 'nav-cto', label: 'Open CTO Command', category: 'Navigate', icon: 'Database', page: 'cto' },
  { id: 'nav-director', label: 'Open Director Console', category: 'Navigate', icon: 'Target', page: 'director' },
  { id: 'nav-invoices', label: 'Go to Invoices', category: 'Navigate', icon: 'FileText', page: 'invoices' },
  { id: 'nav-leads', label: 'Go to Leads / CIO', category: 'Navigate', icon: 'UsersRound', page: 'leads' },
  { id: 'nav-vault', label: 'Go to Payment Vault', category: 'Navigate', icon: 'LockKeyhole', page: 'payment-vault' },
  { id: 'nav-security', label: 'Go to Security', category: 'Navigate', icon: 'Fingerprint', page: 'security' },
  { id: 'nav-learning', label: 'Go to Learning Centre', category: 'Navigate', icon: 'BrainCircuit', page: 'learning' },
  { id: 'action-shipment', label: 'Create New Shipment', category: 'Actions', icon: 'PackageCheck', page: 'shipments' },
  { id: 'action-invoice', label: 'Create New Invoice', category: 'Actions', icon: 'FileBarChart', page: 'invoices' },
  { id: 'action-approvals', label: 'Review Pending Approvals', category: 'Actions', icon: 'CheckCircle2', page: 'approvals' },
  { id: 'action-briefing', label: 'Run Daily Briefing', category: 'Actions', icon: 'Zap', page: 'dashboard' },
  { id: 'action-settings', label: 'Open Settings', category: 'Settings', icon: 'Settings', action: 'settings' },
  { id: 'action-signout', label: 'Sign Out', category: 'Settings', icon: 'LockKeyhole', action: 'signout' },
];

const ICON_MAP = {
  Gauge, Route, ShieldCheck, ClipboardList, CircleDollarSign,
  Workflow, TrendingUp, Database, Target, FileText, UsersRound,
  LockKeyhole, Fingerprint, BrainCircuit, PackageCheck,
  FileBarChart, CheckCircle2, Zap, Settings,
};

function CommandPalette({ open, onClose, onNavigate, onAction }) {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebounce(query, 250);
  const [cursor, setCursor] = React.useState(0);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!debouncedQuery.trim()) return COMMAND_ITEMS;
    const q = debouncedQuery.toLowerCase();
    return COMMAND_ITEMS.filter(
      (item) =>
        item.label?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.page?.toLowerCase().includes(q)
    );
  }, [debouncedQuery]);

  const grouped = React.useMemo(() => {
    const map = {};
    filtered.forEach((item) => {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return Object.entries(map);
  }, [filtered]);

  const flat = filtered;

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[cursor];
      if (item) runItem(item);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  function runItem(item) {
    onClose();
    if (item.action === 'settings') { onAction('settings'); return; }
    if (item.action === 'signout') { onAction('signout'); return; }
    if (item.page) onNavigate(item.page);
  }

  React.useEffect(() => {
    const el = listRef.current?.querySelector('.cmd-item.active');
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" role="presentation" onClick={onClose}>
      <div
        className="cmd-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmd-search-row">
          <Search size={16} className="cmd-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKey}
            placeholder="Search pages, actions, settings..."
            aria-label="Command search"
            aria-autocomplete="list"
            aria-controls="cmd-list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-esc-hint">ESC</kbd>
        </div>

        <div id="cmd-list" ref={listRef} className="cmd-results" role="listbox">
          {grouped.length === 0 && (
            <div className="cmd-empty">No results for "{query}"</div>
          )}
          {grouped.map(([category, items]) => (
            <div key={category} className="cmd-group">
              <div className="cmd-group-label" role="presentation">{category}</div>
              {items.map((item) => {
                const idx = flat.indexOf(item);
                const Icon = ICON_MAP[item.icon];
                return (
                  <button
                    key={item.id}
                    className={`cmd-item ${idx === cursor ? 'active' : ''}`}
                    role="option"
                    aria-selected={idx === cursor}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => runItem(item)}
                  >
                    <span className="cmd-item-icon">
                      {Icon && <Icon size={15} aria-hidden="true" />}
                    </span>
                    <span className="cmd-item-label">
                      {highlightMatch(item.label, query)}
                    </span>
                    <kbd className="cmd-item-hint">Enter</kbd>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <footer className="cmd-footer">
          <span><kbd>UpDown</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>ESC</kbd> close</span>
          <span><kbd>Ctrl K</kbd> toggle</span>
        </footer>
      </div>
    </div>
  );
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function useLoadingState(initialLoading = true, minDuration = 400) {
  const [loading, setLoading] = React.useState(initialLoading);
  const startRef = React.useRef(Date.now());

  function done() {
    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(0, minDuration - elapsed);
    setTimeout(() => setLoading(false), remaining);
  }

  return [loading, done];
}

function usePrevious(value) {
  const ref = React.useRef();

  React.useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}

export function useRowSelection(items = [], idKey = 'id') {
  const [selected, setSelected] = React.useState(new Set());

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((s) =>
    s.size === items.length ? new Set() : new Set(items.map((i) => i[idKey]))
  );
  const clear = () => setSelected(new Set());
  const isSelected = (id) => selected.has(id);
  const allSelected = selected.size === items.length && items.length > 0;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedItems = items.filter((i) => selected.has(i[idKey]));

  return { selected, toggle, toggleAll, clear, isSelected, allSelected, someSelected, selectedItems };
}

export function exportCSV(rows, columns, filename = 'export') {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = c.accessor ? c.accessor(row) : (row[c.key] ?? '');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const InvoiceDocument = React.memo(function InvoiceDocument({ invoice }) {
  if (!invoice) return null;
  const items = invoice.line_items || invoice.items || [];
  const subtotal = items.reduce((s, i) => {
    const amount = Number(i.amount ?? (Number(i.quantity || 0) * Number(i.rate || i.unit_price || 0)));
    return s + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const tax = invoice.tax_amount || invoice.igst_amount || 0;
  const total = invoice.total_amount || (subtotal + Number(tax));
  const currency = invoice.currency || 'USD';
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const statusClass = String(invoice.status || 'draft').toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  return (
    <div className="invoice-doc-wrap" id="invoice-print-area">
      <div className="no-print invoice-print-actions">
        <PrintButton label="Print Invoice / Save PDF" />
      </div>
      <header className="invoice-doc-header">
        <div className="invoice-doc-brand">
          <strong>GOPU EXPORTS</strong>
          <span>
            {invoice.seller_address || invoice.company_address || 'Export Division'}<br />
            GSTIN: {invoice.seller_gstin || invoice.gstin || '-'}<br />
            IEC: {invoice.iec_code || '-'}
          </span>
        </div>
        <div className="invoice-doc-meta">
          <span className="invoice-doc-type">{invoice.invoice_type || 'Commercial Invoice'}</span>
          <span className="invoice-doc-number">{invoice.invoice_number || invoice.reference || 'DRAFT'}</span>
          <span className="invoice-doc-date">Date: {invoice.invoice_date || new Date().toLocaleDateString()}</span>
          {invoice.due_date && <span className="invoice-doc-date">Due: {invoice.due_date}</span>}
          <div aria-label={`Invoice status: ${invoice.status || 'Draft'}`} style={{ marginTop: 8 }} className={`invoice-status-stamp ${statusClass}`}>
            {invoice.status || 'Draft'}
          </div>
        </div>
      </header>
      <div className="invoice-doc-parties">
        <div className="invoice-party-block">
          <span className="invoice-party-role">Bill From</span>
          <span className="invoice-party-name">{invoice.seller_name || 'GOPU Exports Pvt Ltd'}</span>
          <span className="invoice-party-detail">{invoice.seller_address || '-'}</span>
        </div>
        <div className="invoice-party-block">
          <span className="invoice-party-role">Bill To</span>
          <span className="invoice-party-name">{invoice.buyer_name || invoice.buyer?.company_name || '-'}</span>
          <span className="invoice-party-detail">
            {invoice.buyer_address || '-'}<br />
            {invoice.buyer_country && `Country: ${invoice.buyer_country}`}
          </span>
        </div>
      </div>
      <table className="invoice-items-table" aria-label="Invoice line items">
        <thead>
          <tr><th style={{ width: 32 }}>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Unit</th><th>Rate ({currency})</th><th>Amount ({currency})</th></tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const amount = item.amount ?? (Number(item.quantity || 0) * Number(item.rate || item.unit_price || 0));
            return (
              <tr key={`${item.description || item.product_name || item.product_description || 'item'}-${i}`}>
                <td>{i + 1}</td>
                <td><div className="invoice-item-desc"><strong>{item.description || item.product_name || item.product_description}</strong>{item.note && <span>{item.note}</span>}</div></td>
                <td><span style={{ fontFamily: 'var(--font-mono)' }}>{item.hsn_code || '-'}</span></td>
                <td><span style={{ fontFamily: 'var(--font-mono)' }}>{item.quantity || '-'}</span></td>
                <td>{item.unit || 'PCS'}</td>
                <td><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(item.rate || item.unit_price || 0)}</span></td>
                <td>{fmt(amount || 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="invoice-totals">
        <div className="invoice-total-row"><span>Subtotal</span><span>{currency} {fmt(subtotal)}</span></div>
        {invoice.freight_amount && <div className="invoice-total-row"><span>Freight</span><span>{currency} {fmt(invoice.freight_amount)}</span></div>}
        {tax > 0 && <div className="invoice-total-row"><span>Tax / IGST ({invoice.tax_rate || invoice.igst_rate || 0}%)</span><span>{currency} {fmt(tax)}</span></div>}
        <div className="invoice-total-row grand"><span>Total Due</span><span>{currency} {fmt(total)}</span></div>
      </div>
      {(invoice.bank_name || invoice.account_number) && (
        <div className="invoice-bank-block">
          <span className="invoice-bank-title">Payment Details</span>
          <div className="invoice-bank-grid">
            {[
              ['Bank', invoice.bank_name],
              ['Account', invoice.account_number],
              ['SWIFT / IFSC', invoice.swift_code || invoice.ifsc_code],
              ['Branch', invoice.bank_branch],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="invoice-bank-field"><label>{label}</label><span>{value}</span></div>
            ))}
          </div>
        </div>
      )}
      <footer className="invoice-doc-footer" role="contentinfo">
        <p className="invoice-doc-notes">{invoice.terms || invoice.payment_terms || 'Payment due within 30 days. Please reference invoice number in all communications.'}</p>
        <div className="invoice-doc-seal">
          <div style={{ width: 80, height: 80, border: '2px solid var(--border-cyan)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--cyan)' }}>
            <ShieldCheck size={32} aria-hidden="true" />
          </div>
          <span>Authorised Signatory</span>
        </div>
      </footer>
    </div>
  );
});

const ShellControlsContext = React.createContext(null);

export function ExportOSShell({ children, className = '', liveDataConnected = backendStatus.mode === 'Connected', statusMessage, loading = false }) {
  const isCtoShell = className.includes('cto-shell');
  const backendMessage = statusMessage || (isCtoShell && liveDataConnected ? 'Supabase live connected' : isCtoShell && !liveDataConnected ? 'No live data connected' : backendStatus.message);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const [showSearch, setShowSearch] = React.useState(false);
  const [prefs, setPrefs] = React.useState(() => {
    const defaults = {
      compact: false,
      reducedMotion: false,
      showClock: true,
      alertsCritical: true,
      alertsApprovals: true,
      autoRefresh: false,
      theme: 'dark',
      accent: 'cyan',
    };
    try {
      const saved = localStorage.getItem('gopu-os-prefs');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });
  const handlePref = (key, val) => setPrefs((p) => {
    const next = { ...p, [key]: val };
    try { localStorage.setItem('gopu-os-prefs', JSON.stringify(next)); } catch {}
    return next;
  });
  const refreshNotifications = React.useCallback(async () => {
    const result = await getNotificationCenterData(demoTenantId);
    setNotifications(result.data?.notifications || []);
  }, []);

  const shellControls = React.useMemo(() => ({
    prefs,
    notifications,
    notificationCount: notifications.filter((item) => !item.viewed_by_founder).length,
    refreshNotifications,
    openNotifications: () => setNotifOpen(true),
    openSettings: () => setSettingsOpen(true),
    openCommandPalette: () => setShowSearch(true)
  }), [notifications, prefs, refreshNotifications]);

  React.useEffect(() => {
    refreshNotifications();
    const events = [
      'gopu:task-created',
      'gopu:task-updated',
      'gopu:task-audit',
      'gopu:approval-updated',
      'gopu:slack-notification-activity'
    ];
    events.forEach((eventName) => window.addEventListener(eventName, refreshNotifications));
    const timer = window.setInterval(refreshNotifications, 30000);
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, refreshNotifications));
      window.clearInterval(timer);
    };
  }, [refreshNotifications]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
    document.documentElement.setAttribute('data-accent', prefs.accent);
    if (prefs.reducedMotion) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  }, [prefs.theme, prefs.accent, prefs.reducedMotion]);

  React.useEffect(() => {
    function openPalette() {
      setShowSearch(true);
    }
    window.addEventListener('gopu:open-command-palette', openPalette);
    return () => {
      window.removeEventListener('gopu:open-command-palette', openPalette);
    };
  }, []);

  function navigateCommandPage(page) {
    const routes = {
      dashboard: '/export-os',
      shipments: '/export-os/shipments',
      approvals: '/export-os/director',
      tasks: '/export-os/tasks',
      cfo: '/export-os/executives/cfo',
      coo: '/export-os/executives/coo',
      cmo: '/export-os/executives/cmo',
      cto: '/export-os/executives/cto',
      director: '/export-os/director-console',
      invoices: '/export-os/invoices',
      leads: '/export-os/importers',
      'payment-vault': '/export-os/payment-vault',
      security: '/export-os/security',
      learning: '/export-os/learning-centre'
    };
    const path = routes[page] || '/export-os';
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    announceToSR(`Navigated to ${getRouteAnnouncement(path)}`);
  }

  async function runCommandAction(action) {
    if (action === 'settings') {
      setSettingsOpen(true);
      return;
    }
    if (action === 'signout') {
      window.sessionStorage.removeItem('selectedOS');
      window.sessionStorage.removeItem('executiveSessionState');
      window.sessionStorage.removeItem('founderSessionPin');
      window.sessionStorage.removeItem('founderSecurityPinSet');
      window.history.pushState({}, '', '/login/export');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  return (
    <motion.div
      className={`export-os-shell ${prefs.compact ? 'compact-mode' : ''} ${className}`}
      id="main-content"
      role="main"
      aria-label="Main content"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
    >
      <TopLoadingBar loading={loading} />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <ConnectionBanner />
      <div
        id="sr-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="sr-alert"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
      <div className="background-grid" />
      <GlobalBackNavigation />
      <div className={`backend-status-banner ${liveDataConnected ? 'connected' : 'pending'}`}>
        <Database size={14} />
        <span>{backendMessage}</span>
      </div>
      <ShellControlsContext.Provider value={shellControls}>
        {children}
      </ShellControlsContext.Provider>
      <NotificationCentre
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onPref={handlePref}
      />
      <CommandPalette
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigate={(page) => { navigateCommandPage(page); setShowSearch(false); }}
        onAction={(action) => {
          setShowSearch(false);
          runCommandAction(action);
        }}
      />
      <ScrollToTop />
    </motion.div>
  );
}

function GlobalBackNavigation() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/export-os';
  const context = getGlobalBackContext(pathname);
  if (!context) return null;

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.history.pushState({}, '', context.fallback);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <button className="global-back-navigation" onClick={goBack} aria-label={context.aria} title={context.aria}>
      <ArrowLeft size={17} />
      <span>{context.label}</span>
    </button>
  );
}

function getGlobalBackContext(pathname) {
  if (!pathname.startsWith('/export-os') || pathname === '/export-os') return null;
  const pairs = [
    ['/export-os/executives/coo', 'Back to COO'],
    ['/export-os/executives/cfo', 'Back to CFO'],
    ['/export-os/executives/cto', 'Back to CTO'],
    ['/export-os/executives/cmo', 'Back to CMO'],
    ['/export-os/cio', 'Back to CIO'],
    ['/export-os/importers/', 'Back to Importers'],
    ['/export-os/importers', 'Back to Importers'],
    ['/export-os/buyers/', 'Back to Buyer CRM'],
    ['/export-os/buyers', 'Back to Buyer CRM'],
    ['/export-os/suppliers/', 'Back to Suppliers'],
    ['/export-os/suppliers', 'Back to Suppliers'],
    ['/export-os/invoices/', 'Back to Invoices'],
    ['/export-os/invoices', 'Back to Invoices'],
    ['/export-os/shipments/', 'Back to Shipments'],
    ['/export-os/shipments', 'Back to Shipments'],
    ['/export-os/workflows/', 'Back to Workflows'],
    ['/export-os/workflows', 'Back to Workflows'],
    ['/export-os/tasks', 'Back to Tasks'],
    ['/export-os/lead-intake', 'Back to Lead Intake'],
    ['/export-os/leads', 'Back to Lead Intake'],
    ['/export-os/payment-vault', 'Back to Payments'],
    ['/export-os/payments', 'Back to Payments'],
    ['/export-os/pricing-engine', 'Back to Pricing'],
    ['/export-os/director', 'Back to Director'],
    ['/export-os/notification', 'Back to Notifications'],
    ['/export-os/learning-centre', 'Back to Learning Centre'],
    ['/export-os/workflow-engine', 'Back to Workflow Engine'],
    ['/export-os/workflow-dependencies', 'Back to Workflow Engine']
  ];
  const match = pairs.find(([prefix]) => pathname.startsWith(prefix));
  const label = match?.[1] || 'Command Deck';
  return { label, aria: `${label} previous operational context`, fallback: '/export-os' };
}

const operationalStatusGroups = [
  {
    group: 'Operations',
    items: [
      { title: 'Shipment Attention', source: 'COO Command', detail: 'Dispatch blocked by supplier confirmation.', severity: 'High', waiting: '6h', action: 'Open COO workflow', tone: 'amber', icon: PackageCheck, route: '/export-os/executives/coo', explanation: 'Shipment readiness is exposed to dispatch delay until supplier confirmation is cleared.' },
      { title: 'Documentation Pending', source: 'Invoice + Documents', detail: 'LUT and HSN review block release gates.', severity: 'High', waiting: '4h', action: 'Review invoice blockers', tone: 'red', icon: FileText, route: '/export-os/invoices', explanation: 'Final PDF, buyer email, and release actions stay blocked until document dependencies pass.' }
    ]
  },
  {
    group: 'Finance',
    items: [
      { title: 'Margin Risk', source: 'CFO Command', detail: 'Quote below safe margin threshold.', severity: 'Medium', waiting: '2h', action: 'Open pricing review', tone: 'amber', icon: CircleDollarSign, route: '/export-os/pricing-engine', explanation: 'CFO review is required before quotation release because commercial safety threshold is under pressure.' },
      { title: 'Payment Pending', source: 'Payment Vault', detail: 'Renewal budget requires validation.', severity: 'Medium', waiting: '1h', action: 'Open payment watch', tone: 'blue', icon: FileCheck2, route: '/export-os/payment-vault', explanation: 'Infrastructure renewal is monitored; no payment is marked complete until backend confirmation.' }
    ]
  },
  {
    group: 'Technical',
    items: [
      { title: 'Automation Delayed', source: 'CTO Command', detail: 'Approval routing retry queue active.', severity: 'Attention', waiting: '38m', action: 'Inspect queue', tone: 'blue', icon: RadioTower, route: '/export-os/executives/cto', explanation: 'Workflow retry monitoring is active and should be checked before enabling connected automation.' }
    ]
  },
  {
    group: 'Strategic',
    items: [
      { title: 'Opportunity Detected', source: 'CIO + CMO', detail: 'Country pending importer interest rising.', severity: 'Opportunity', waiting: 'Live', action: 'Open Director signal', tone: 'purple', icon: TrendingUp, route: '/export-os/director', explanation: 'Market signal suggests importer outreach potential after commercial and operational readiness checks.' }
    ]
  }
];

function MiniSparkline({ data = [], color = 'var(--accent)', height = 36, width = 80 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const gradientId = `sg-${color.replace(/[^a-z0-9]/gi, '')}-${width}-${height}-${data.length}`;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="mini-sparkline">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${pts} ${lastX},${lastY} ${lastX},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

function RichKpiCard({ label, value, unit = '', change, trend, sparkData, color, onClick }) {
  const isPositive = change >= 0;
  const trendColor = trend === 'up-good'
    ? (isPositive ? 'var(--success, #22c55e)' : 'var(--danger, #ff4d6d)')
    : trend === 'down-good'
      ? (isPositive ? 'var(--danger, #ff4d6d)' : 'var(--success, #22c55e)')
      : 'var(--dim)';

  return (
    <button
      className={`rich-kpi-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      aria-label={`${label}: ${value}${unit}, ${isPositive ? '+' : ''}${change}% change`}
      type="button"
    >
      <div className="rich-kpi-top">
        <span className="rich-kpi-label">{label}</span>
        {change !== undefined && (
          <span className="rich-kpi-change" style={{ color: trendColor }}>
            {isPositive ? 'Up' : 'Down'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="rich-kpi-value">
        <strong>{value}</strong>
        {unit && <span className="rich-kpi-unit">{unit}</span>}
      </div>
      {sparkData && (
        <MiniSparkline data={sparkData} color={color || 'var(--accent)'} />
      )}
    </button>
  );
}

function TodaysPriorities({ navigate, items }) {
  const priorities = items || [
    {
      id: 'p1',
      label: 'Invoice release blocked',
      detail: 'LUT ARN missing - CFO action required',
      owner: 'CFO',
      urgency: 'critical',
      route: '/export-os/executives/cfo',
    },
    {
      id: 'p2',
      label: 'Shipment dispatch delay',
      detail: 'Supplier confirmation pending - COO follow-up',
      owner: 'COO',
      urgency: 'high',
      route: '/export-os/executives/coo',
    },
    {
      id: 'p3',
      label: 'Low-margin quote waiting',
      detail: 'Director approval needed before buyer release',
      owner: 'Director',
      urgency: 'high',
      route: '/export-os/director',
    },
  ];

  const urgencyColor = { critical: '#ff4d6d', high: '#f59e0b', medium: '#60a5fa' };

  return (
    <div className="priorities-panel">
      <div className="priorities-header">
        <span className="priorities-eyebrow">Todays Priorities</span>
        <span className="priorities-count">{priorities.length} actions</span>
      </div>
      <ol className="priorities-list">
        {priorities.map((item, i) => (
          <li key={item.id} className="priority-item">
            <div className="priority-rank" style={{ color: urgencyColor[item.urgency] || 'var(--dim)' }}>
              {i + 1}
            </div>
            <div className="priority-body">
              <strong className="priority-label">{item.label}</strong>
              <span className="priority-detail">{item.detail}</span>
            </div>
            <div className="priority-meta">
              <span className="priority-owner">{item.owner}</span>
              <button
                className="priority-action"
                onClick={() => navigate(item.route)}
                aria-label={`Open ${item.label}`}
                type="button"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuickLaunch({ navigate }) {
  const tiles = [
    { label: 'Director Console', icon: DirectorIcon, route: '/export-os/director', color: '#a78bfa' },
    { label: 'Pricing Engine', icon: CFOIcon, route: '/export-os/pricing-engine', color: '#22c55e' },
    { label: 'Shipments', icon: COOIcon, route: '/export-os/executives/coo', color: '#2ef2ff' },
    { label: 'Invoices', icon: CTOIcon, route: '/export-os/invoices', color: '#f59e0b' },
    { label: 'Buyers', icon: CMOIcon, route: '/export-os/buyers', color: '#f472b6' },
    { label: 'Analytics', icon: CIOIcon, route: '/export-os/analytics', color: '#60a5fa' },
  ];

  return (
    <div className="quick-launch-panel">
      <span className="quick-launch-eyebrow">Quick Launch</span>
      <div className="quick-launch-grid">
        {tiles.map(tile => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.label}
              className="quick-launch-tile"
              onClick={() => navigate(tile.route)}
              style={{ '--tile-color': tile.color }}
              aria-label={`Open ${tile.label}`}
              type="button"
            >
              <div className="quick-launch-icon">
                <Icon />
              </div>
              <span className="quick-launch-label">{tile.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DashboardActivityFeed() {
  const events = [
    { id: 1, time: '2m ago', actor: 'CFO', action: 'reviewed', subject: 'Q3 margin report', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â', tone: 'blue' },
    { id: 2, time: '11m ago', actor: 'COO', action: 'escalated', subject: 'GCC shipment delay', icon: 'No', tone: 'amber' },
    { id: 3, time: '28m ago', actor: 'System', action: 'generated', subject: 'Morning briefing draft', icon: 'Done', tone: 'cyan' },
    { id: 4, time: '1h ago', actor: 'CTO', action: 'resolved', subject: 'Automation retry queue', icon: '...', tone: 'green' },
    { id: 5, time: '2h ago', actor: 'Director', action: 'approved', subject: 'New buyer quotation release', icon: 'Done', tone: 'green' },
    { id: 6, time: '3h ago', actor: 'CMO', action: 'drafted', subject: 'GCC importer outreach email', icon: 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°', tone: 'blue' },
  ];

  return (
    <div className="activity-feed-panel">
      <div className="activity-feed-header">
        <span className="activity-feed-eyebrow">Live Activity</span>
        <span className="activity-feed-dot" aria-label="Live" />
      </div>
      <ol className="activity-feed-list" aria-live="polite" aria-label="Recent system activity">
        {events.map(ev => (
          <li key={ev.id} className={`activity-feed-item tone-${ev.tone}`}>
            <span className="activity-feed-emoji" aria-hidden="true">{ev.icon}</span>
            <div className="activity-feed-body">
              <span className="activity-feed-text">
                <strong>{ev.actor}</strong> {ev.action} <em>{ev.subject}</em>
              </span>
              <time className="activity-feed-time">{ev.time}</time>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HomeKpiStrip({ navigate }) {
  const [kpis, setKpis] = useState({ leads: 0, pending: 0, tasks: 0, revenue: '-', health: 'Checking...' });

  useEffect(() => {
    async function load() {
      try {
        const [leadsResult, approvalsResult, tasksResult] = await cachedRead('dashboard:home-kpis', 60000, () => Promise.all([
          leadService.list(demoTenantId).catch(() => ({ data: [] })),
          getApprovalQueue(demoTenantId).catch(() => ({ data: [] })),
          getTasks(demoTenantId).catch(() => ({ data: [] })),
        ]));
        setKpis({
          leads: (leadsResult.data || []).length,
          pending: (approvalsResult.data || []).filter(a => a.status === 'Pending Approval').length,
          tasks: (tasksResult.data || []).filter(t => !['Done', 'Completed'].includes(t.status)).length,
          revenue: '-',
          health: 'Live',
        });
      } catch {
        setKpis(k => ({ ...k, health: 'Offline' }));
      }
    }
    load();
  }, []);

  const chips = useMemo(() => [
    { label: 'Total Leads', value: kpis.leads, route: '/export-os/leads' },
    { label: 'Pending Approvals', value: kpis.pending, route: '/export-os/director' },
    { label: 'Open Tasks', value: kpis.tasks, route: '/export-os/tasks' },
    { label: 'Monthly Revenue', value: kpis.revenue, route: '/export-os/executives/cfo' },
    { label: 'System', value: kpis.health, route: '/export-os/executives/cto', live: kpis.health === 'Live' },
  ], [kpis.health, kpis.leads, kpis.pending, kpis.revenue, kpis.tasks]);

  return (
    <div className="home-kpi-strip">
      {chips.map(({ label, value, route, live }) => (
        <button key={label} className={`home-kpi-chip${live ? ' home-kpi-chip--live' : ''}`} onClick={() => navigate(route)}>
          <strong>{value}</strong>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function HomeDirectorPreview({ navigate }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    cachedRead('dashboard:director-preview', 60000, () => getApprovalQueue(demoTenantId)).then(r => setItems((r.data || []).slice(0, 3))).catch(() => {});
  }, []);

  return (
    <section className="home-panel">
      <div className="home-panel-header">
        <h2>Director Queue</h2>
        <button className="ghost-button" onClick={() => navigate('/export-os/director')}>View all</button>
      </div>
      {items.length === 0
        ? <p className="home-panel-empty">No pending decisions. Agents are running.</p>
        : items.map(item => (
            <article key={item.id} className="home-queue-item" onClick={() => navigate('/export-os/director')}>
              <strong>{item.title || item.request_type}</strong>
              <span>{item.status}</span>
            </article>
          ))
      }
    </section>
  );
}

function HomeQuickActions({ navigate }) {
  const actions = [
    { label: 'New Lead', desc: 'Create a buyer lead', route: '/export-os/leads/new' },
    { label: 'Pricing Engine', desc: 'Generate a quote', route: '/export-os/pricing-engine' },
    { label: 'New Invoice', desc: 'Draft an invoice', route: '/export-os/invoices/new' },
    { label: 'Suppliers', desc: 'Manage procurement', route: '/export-os/suppliers' },
    { label: 'Warehouse', desc: 'Stock & inventory', route: '/export-os/warehouse' },
    { label: 'Tasks', desc: 'Open action items', route: '/export-os/tasks' },
  ];
  return (
    <section className="home-panel">
      <div className="home-panel-header"><h2>Quick Actions</h2></div>
      <div className="home-quick-list">
        {actions.map(a => (
          <button key={a.label} className="home-quick-item" onClick={() => navigate(a.route)}>
            <strong>{a.label}</strong>
            <span>{a.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ExecutiveCommandDeck({ navigate, onLogout, showSearch, setShowSearch, setShowShortcuts, session }) {
  const { rates, status: forexStatus } = useLiveForexRates();

  return (
    <ExportOSShell className="executive-home-shell">
      <ForexTicker items={rates} status={forexStatus} />
      <CommandDeckHeader navigate={navigate} onLogout={onLogout} showSearch={showSearch} setShowSearch={setShowSearch} setShowShortcuts={setShowShortcuts} session={session} />

      <section className="home-hero">
        <div className="home-hero-left">
          <span className="home-hero-tag">GOPU Export OS</span>
          <h1 className="home-hero-title">Export Command</h1>
          <p className="home-hero-sub">Zero employees. Five agents. You make the final call.</p>
        </div>
        <div className="home-hero-actions">
          <button className="tactical-button" type="button" onClick={() => navigate('/export-os/director')}>Director Command</button>
          <button className="ghost-button" type="button" onClick={() => navigate('/export-os/leads/new')}>New Lead</button>
          <button className="ghost-button" type="button" onClick={() => navigate('/export-os/pricing-engine')}>Pricing Engine</button>
        </div>
      </section>

      <HomeKpiStrip navigate={navigate} />

      <section className="home-agent-grid">
        {[
          { role: 'CIO', label: 'Chief Intelligence Officer', desc: 'Lead scoring - Market intelligence - Buyer analytics', route: '/export-os/cio', color: '#818cf8' },
          { role: 'CFO', label: 'Chief Financial Officer', desc: 'P&L - Auto-payments - Payment vault', route: '/export-os/executives/cfo', color: '#22c55e' },
          { role: 'COO', label: 'Chief Operations Officer', desc: 'Shipments - Suppliers - Document readiness', route: '/export-os/executives/coo', color: '#f59e0b' },
          { role: 'CMO', label: 'Chief Marketing Officer', desc: 'LinkedIn - Email campaigns - Buyer outreach', route: '/export-os/executives/cmo', color: '#ec4899' },
          { role: 'CTO', label: 'Chief Technology Officer', desc: 'Integrations - API health - System uptime', route: '/export-os/executives/cto', color: '#38bdf8' },
        ].map(({ role, label, desc, route, color }) => (
          <article key={role} className="home-agent-card" onClick={() => navigate(route)} style={{ '--agent-color': color }}>
            <div className="home-agent-role">{role}</div>
            <div className="home-agent-info">
              <strong>{label}</strong>
              <span>{desc}</span>
            </div>
            <button className="ghost-button" type="button" onClick={(event) => { event.stopPropagation(); navigate(route); }}>Open</button>
          </article>
        ))}
      </section>

      <section className="home-bottom-grid">
        <HomeDirectorPreview navigate={navigate} />
        <HomeQuickActions navigate={navigate} />
      </section>

      <MobileBottomNav navigate={navigate} activeRoute={window.location.pathname} />
    </ExportOSShell>
  );
}
function ExecutiveKpiTicker({ rates = [], forexStatus }) {
  const primaryRate = rates?.[0];
  const kpis = [
    ['Active workflows', '12', 'Monitoring'],
    ['Critical blockers', '03', 'Attention'],
    ['Director decisions', '05', 'Review'],
    ['Payment watch', '02', 'CFO'],
    ['Market signals', '04', 'CIO'],
    ['FX watch', primaryRate ? `${primaryRate.pair} ${primaryRate.rate}` : 'USD/INR watch', forexStatus || 'Monitoring']
  ];

  return (
    <section className="executive-kpi-ticker" aria-label="Live executive KPI ticker" aria-live="polite" aria-atomic="false" data-tour="analytics-tab">
      {kpis.map(([label, value, status]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{status}</small>
        </article>
      ))}
    </section>
  );
}

function HeroCommandPanel({ navigate }) {
  return (
    <section className="hero-command-panel" role="banner">
      <div className="deck-hero-copy">
        <span>GOPU Export OS</span>
        <h1 id="deck-title">Executive operating dashboard</h1>
        <p>Director-led control for export decisions, workflow blockers, commercial risk, shipment readiness, and global opportunities.</p>
      </div>
      <div className="hero-focus-strip">
        {[
          ['Current state', 'Operational attention required'],
          ['Director focus', 'Clear release blockers'],
          ['Primary lane', 'Invoice, pricing, shipment']
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="hero-command-actions">
        <button className="tactical-button" onClick={() => navigate('/export-os/director')}>
          Open Director Console
          <kbd className="kbd-hint">Ctrl K</kbd>
        </button>
        <button className="ghost-button" onClick={() => navigate('/export-os/workflows')}>View Workflows</button>
      </div>
    </section>
  );
}


const topBarSearchRecords = [
  { id: 'srch-workflow-delayed', title: 'Delayed shipment workflows', type: 'Workflow', owner: 'COO', status: 'Delayed', priority: 'High', route: '/export-os/workflows', keywords: 'show delayed shipments delayed shipment blocker dispatch supplier container cha logistics' },
  { id: 'srch-uae-buyers', title: 'Country pending buyer and importer opportunities', type: 'Importer Intelligence', owner: 'CIO + CMO', status: 'Opportunity Detected', priority: 'High', route: '/export-os/cio', keywords: 'find uae buyers importer opportunity gcc turmeric black pepper market demand' },
  { id: 'srch-invoices-pending', title: 'Pending export invoices', type: 'Invoice', owner: 'CFO', status: 'Review Required', priority: 'Critical', route: '/export-os/invoices', keywords: 'open pending invoices blocked invoice lut hsn final pdf buyer email' },
  { id: 'srch-high-risk', title: 'High-risk workflows', type: 'Risk', owner: 'Director', status: 'Risk Detected', priority: 'Critical', route: '/export-os/director', keywords: 'any high risk workflows critical escalated director queue pending review' },
  { id: 'srch-openai-renewal', title: 'OpenAI renewal and credit watch', type: 'Payment', owner: 'CTO + CFO', status: 'Monitoring', priority: 'Medium', route: '/export-os/payment-vault', keywords: 'openai renewal credit payment pending subscription vault budget' },
  { id: 'srch-today', title: "Todays operating priorities", type: 'Executive Summary', owner: 'COO + Director', status: 'Attention', priority: 'High', route: '/export-os/director-console', keywords: 'what pending today priorities tasks due today urgent attention' },
  { id: 'srch-suppliers', title: 'Supplier confirmation follow-ups', type: 'Supplier', owner: 'COO', status: 'Escalated', priority: 'High', route: '/export-os/suppliers', keywords: 'supplier follow up confirmation delayed stock packing procurement' },
  { id: 'srch-payments', title: 'Payment approvals and renewals', type: 'Payment', owner: 'CFO', status: 'Review Required', priority: 'High', route: '/export-os/payments', keywords: 'payments pending approvals otp renewal vendor billing methods receipts' },
  { id: 'srch-tasks', title: 'Open operational tasks', type: 'Task', owner: 'COO', status: 'In Progress', priority: 'Medium', route: '/export-os/tasks', keywords: 'open tasks blocked due today overdue follow up' },
  { id: 'srch-exec-summary', title: 'Executive synchronization summary', type: 'Executive Summary', owner: 'Director', status: 'Monitoring', priority: 'Medium', route: '/export-os/executive-war-room', keywords: 'executive summaries sync cfo coo cto cmo cio war room status' },
  { id: 'srch-learning-centre', title: 'Learning Centre research ingestion', type: 'Research', owner: 'Director', status: 'Ready', priority: 'Medium', route: '/export-os/learning-centre', keywords: 'learning centre research ingestion findings executive knowledge report public sources' }
];

const executiveHealthRows = [
  { executive: 'COO', status: 'Operational Delay Detected', summary: 'Supplier confirmation and shipment readiness require review.', route: '/export-os/executives/coo', state: 'attention' },
  { executive: 'CFO', status: 'Executive Attention Required', summary: 'Low-margin quote and invoice release gates are waiting.', route: '/export-os/executives/cfo', state: 'warning' },
  { executive: 'CTO', status: 'Monitoring Risks', summary: 'Automation queue and renewal triggers are under watch.', route: '/export-os/executives/cto', state: 'progress' },
  { executive: 'CMO', status: 'Monitoring', summary: 'Content approvals and importer outreach drafts are queued.', route: '/export-os/executives/cmo', state: 'progress' },
  { executive: 'CIO', status: 'Opportunity Detected', summary: 'Country pending and GCC importer demand signals are active.', route: '/export-os/cio', state: 'success' }
];

function CommandDeckHeader({ navigate, onLogout, showSearch = false, setShowSearch, setShowShortcuts, session }) {
  const [now, setNow] = useState(() => new Date());
  const [activePanel, setActivePanel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationFilter, setNotificationFilter] = useState('All');
  const [isMobilePanel, setIsMobilePanel] = useState(() => window.matchMedia?.('(max-width: 768px)').matches ?? false);
  const shellControls = React.useContext(ShellControlsContext);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showSearch) {
      setActivePanel('search');
      return;
    }
    setActivePanel((current) => current === 'search' ? null : current);
  }, [showSearch]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(max-width: 768px)');
    if (!mediaQuery) return undefined;
    function handleChange(event) {
      setIsMobilePanel(event.matches);
    }
    setIsMobilePanel(mediaQuery.matches);
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  const liveTopNotifications = React.useMemo(
    () => (shellControls?.notifications || []).map(normalizeTopNotification),
    [shellControls?.notifications]
  );
  const unreadCount = liveTopNotifications.filter((item) => !item.viewed_by_founder).length;
  const systemStatus = liveTopNotifications.some((item) => item.severity === 'Critical')
    ? 'Critical Escalation Active'
    : liveTopNotifications.some((item) => item.severity === 'High Risk')
      ? 'Executive Attention Required'
      : 'Monitoring Risks';

  function togglePanel(panel) {
    setActivePanel((current) => current === panel ? null : panel);
    if (panel === 'search') setShowSearch?.((current) => !current);
  }

  function openRoute(route) {
    setActivePanel(null);
    setShowSearch?.(false);
    navigate(route);
  }

  function closePanel() {
    setActivePanel(null);
    setShowSearch?.(false);
  }

  function renderActivePanel() {
    if (activePanel === 'session') return <SessionSecurityPanel now={now} navigate={openRoute} />;
    if (activePanel === 'status') return <SystemHealthPanel rows={executiveHealthRows} navigate={openRoute} />;
    if (activePanel === 'clock') return <GlobalOperationsClock now={now} />;
    if (activePanel === 'notifications') {
      return (
        <TopNotificationPanel
          notifications={liveTopNotifications}
          filter={notificationFilter}
          setFilter={setNotificationFilter}
          navigate={openRoute}
        />
      );
    }
    if (activePanel === 'search') {
      return (
        <GlobalCommandSearch
          query={searchQuery}
          setQuery={setSearchQuery}
          records={topBarSearchRecords}
          navigate={openRoute}
        />
      );
    }
    return null;
  }

  const panelTitles = {
    session: 'Founder session',
    status: 'System status',
    clock: 'Global operations clock',
    notifications: 'Notifications',
    search: 'Command search',
  };

  return (
    <header className="deck-header">
      <div className="deck-header-copy" data-tour="sidebar">
        <GopuWordmark size="sm" />
        <h1>Executive Command Deck</h1>
        <p>Founder operating control for director decisions, executive branches, workflows, and live risk signals.</p>
      </div>
      <div className="deck-header-controls">
        <button className="coo-verified top-command-control" onClick={() => togglePanel('session')} aria-expanded={activePanel === 'session'}>
          <ShieldCheck size={16} /><span>Founder session verified</span>
        </button>
        <button className="coo-status top-command-control" onClick={() => togglePanel('status')} aria-expanded={activePanel === 'status'}>
          <StatusPulse /><strong>{systemStatus}</strong>
        </button>
        <button className="coo-time top-command-control" onClick={() => togglePanel('clock')} aria-expanded={activePanel === 'clock'}>
          <CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </button>
        <Tooltip text="Notifications">
          <button className="icon-button top-icon-button notification-button" aria-label="Notifications" onClick={() => togglePanel('notifications')} aria-expanded={activePanel === 'notifications'}>
            <Bell size={18} />{unreadCount > 0 && <span>{unreadCount}</span>}
          </button>
        </Tooltip>
        <Tooltip text="Global operational command search">
          <button className="icon-button top-icon-button" aria-label="Global operational command search" onClick={() => togglePanel('search')} aria-expanded={activePanel === 'search'} data-tour="cmd-palette-trigger"><Search size={18} /></button>
        </Tooltip>
        <button
          className="icon-button top-icon-button"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          onClick={() => setShowShortcuts?.(true)}
        >
          <Keyboard size={18} />
        </button>
        <Tooltip text="Director AI command console">
          <button className="icon-button top-icon-button director-command-icon" aria-label="Director AI command console" onClick={() => openRoute('/export-os/director-console')}><Fingerprint size={18} /></button>
        </Tooltip>
        <button className="ghost-button deck-logout" onClick={onLogout} title="Securely end current executive session" aria-label="Securely end current executive session">End Session</button>
        <UserChip session={session} onSettings={() => shellControls?.openSettings?.()} />
      </div>
      <AnimatePresence>
        {activePanel && !isMobilePanel && (
          <TopCommandPanel panel={activePanel} onClose={closePanel}>
            {renderActivePanel()}
          </TopCommandPanel>
        )}
      </AnimatePresence>
      <MobileSheet open={Boolean(activePanel && isMobilePanel)} onClose={closePanel} title={panelTitles[activePanel] || 'Panel'}>
        {renderActivePanel()}
      </MobileSheet>
    </header>
  );
}

function ExecutiveLeadershipLayout({ commands, navigate }) {
  const commandMap = Object.fromEntries(commands.map((command) => [command.id, command]));
  const director = commandMap.director;
  const core = ['coo', 'cto', 'cfo'].map((id) => commandMap[id]).filter(Boolean);
  const support = ['cmo', 'cio', 'learning-centre'].map((id) => commandMap[id]).filter(Boolean);

  return (
    <section className="executive-leadership-layout" aria-label="Executive command structure">
      <div className="executive-anchor-zone">
        {director && <ExecutiveCommandCard command={director} variant="anchor" onOpen={() => navigate(director.route)} />}
        <ExecutiveSharedControlPanel navigate={navigate} />
      </div>
      <div className="executive-core-zone" aria-label="Core leadership group">
        {core.map((command, index) => (
          <ExecutiveCommandCard
            key={command.id}
            command={command}
            index={index}
            variant="core"
            onOpen={() => navigate(command.route)}
          />
        ))}
      </div>
      <div className="executive-support-zone" aria-label="Growth and intelligence support layer">
        {support.map((command, index) => (
          <ExecutiveCommandCard
            key={command.id}
            command={command}
            index={index}
            variant="support"
            onOpen={() => navigate(command.route)}
          />
        ))}
        <ExecutiveActivityControlPanel navigate={navigate} />
      </div>
    </section>
  );
}

function ExecutiveSharedControlPanel({ navigate }) {
  const sharedItems = [
    ['Critical blockers', '03', 'Invoice LUT, supplier confirmation, pricing margin'],
    ['Director decisions', '05', 'Approvals, escalations, clarification requests'],
    ['System alerts', '06', 'Notifications, payment watch, automation retry'],
    ['Workflow risks', '04', 'Shipment, buyer, document, supplier dependencies']
  ];
  return (
    <aside className="executive-shared-panel">
      <div className="coo-panel-header">
        <div><span>Shared Control</span><h2>Company-wide actions</h2></div>
        <AlertTriangle size={19} />
      </div>
      <div className="shared-control-list">
        {sharedItems.map(([label, value, detail]) => (
          <button key={label} onClick={() => navigate('/export-os/director')}>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{detail}</small>
          </button>
        ))}
      </div>
      <div className="shared-action-row" data-tour="quick-actions">
        <button onClick={() => navigate('/export-os/director')}>Open Director Queue</button>
        <button onClick={() => navigate('/export-os/notification-center')}>Alerts</button>
      </div>
    </aside>
  );
}

function ExecutiveActivityControlPanel({ navigate }) {
  const activities = [
    ['Executive Sync', 'COO + CFO + CTO alignment active'],
    ['Market Signal', 'Country pending importer interest rising'],
    ['Growth Queue', 'Content and buyer outreach waiting review']
  ];
  return (
    <aside className="executive-activity-panel">
      <div className="coo-panel-header">
        <div><span>Shared Intelligence</span><h2>Cross-functional feed</h2></div>
        <BrainCircuit size={19} />
      </div>
      <div className="executive-activity-mini">
        {activities.map(([label, detail]) => <button key={label} onClick={() => navigate('/export-os/executive-war-room')}><strong>{label}</strong><span>{detail}</span></button>)}
      </div>
    </aside>
  );
}

function OperationalStatusSystem({ groups, navigate }) {
  return (
    <aside className="deck-status-summary" aria-label="Operational status system">
      <div className="status-system-header">
        <span>Operational Status</span>
        <strong>Action-aware signals</strong>
      </div>
      {groups.map((group) => (
        <section className="status-group" key={group.group}>
          <h3>{group.group}</h3>
          <div className="status-group-list">
            {group.items.map((item) => <OperationalStatusCard key={`${group.group}-${item.title}`} item={item} navigate={navigate} />)}
          </div>
        </section>
      ))}
    </aside>
  );
}

function OperationalStatusCard({ item, navigate }) {
  const Icon = item.icon;
  return (
    <button
      className={`operational-status-card tone-${item.tone}`}
      onClick={() => navigate(item.route)}
      data-tooltip={`${item.explanation} Next action: ${item.action}.`}
      title={`${item.explanation} Next action: ${item.action}.`}
    >
      <span className="status-card-icon"><Icon size={17} /></span>
      <span className="status-card-copy">
        <strong>{item.title}</strong>
        <small>{item.source}</small>
        <em>{item.detail}</em>
      </span>
      <span className="status-card-meta">
        <b>{item.severity}</b>
        <small>{item.waiting}</small>
        <ChevronRight size={15} />
      </span>
    </button>
  );
}

function TopCommandPanel({ panel, onClose, children }) {
  return (
    <motion.div
      className={`top-command-panel panel-${panel}`}
      initial={{ opacity: 0, y: -8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      <button className="top-panel-close" onClick={onClose} aria-label="Close top command panel">x</button>
      {children}
    </motion.div>
  );
}

function SessionSecurityPanel({ now, navigate }) {
  const loginTime = new Date(now.getTime() - 48 * 60 * 1000);
  return (
    <section className="top-panel-section">
      <div className="top-panel-heading">
        <span>Executive Session Security Panel</span>
        <h2>Verified operational access</h2>
        <StatusBadge label="Verified" state="success" />
      </div>
      <div className="top-detail-grid">
        {[
          ['Active role', 'Director / Executive operator'],
          ['Current device', 'Codex desktop session'],
          ['Login time', loginTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })],
          ['MFA pending', 'Monitoring'],
          ['Session security', 'Verified'],
          ['Executive access level', 'Elevated Access']
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="permission-strip">
        {['Director Queue', 'Pricing', 'Invoices', 'Payments', 'Tasks', 'Workflow Engine', 'Executive Sync'].map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="top-action-row">
        <button className="tactical-button">Lock Session</button>
        <button className="ghost-button" onClick={() => navigate('/export-os/security')}>Open Security</button>
        <button className="ghost-button" onClick={() => navigate('/export-os/access-audit')}>View Audit</button>
        <button className="ghost-button">Sign Out Everywhere</button>
      </div>
    </section>
  );
}

function SystemHealthPanel({ rows, navigate }) {
  return (
    <section className="top-panel-section">
      <div className="top-panel-heading">
        <span>Live Executive Operations Status</span>
        <h2>Executive command layer synchronized</h2>
        <button className="tactical-button compact" onClick={() => navigate('/export-os/executive-war-room')}>Open War Room</button>
      </div>
      <div className="system-health-list">
        {rows.map((row) => (
          <button key={row.executive} onClick={() => navigate(row.route)}>
            <div><strong>{row.executive}</strong><span>{row.summary}</span></div>
            <StatusBadge label={row.status} state={row.state} />
          </button>
        ))}
      </div>
    </section>
  );
}

function GlobalOperationsClock({ now }) {
  const zones = [
    ['Founder Local', undefined],
    ['UTC', 'UTC'],
    ['Dubai', 'Asia/Dubai'],
    ['Singapore', 'Asia/Singapore'],
    ['London', 'Europe/London'],
    ['New York', 'America/New_York']
  ];
  return (
    <section className="top-panel-section">
      <div className="top-panel-heading">
        <span>Global Operations Clock</span>
        <h2>Shipment, buyer, and market timing</h2>
        <StatusBadge label="Monitoring" state="progress" />
      </div>
      <div className="clock-grid">
        {zones.map(([label, timeZone]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}</strong>
            <small>{now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone })}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopNotificationPanel({ notifications, filter, setFilter, navigate }) {
  const sections = ['All', 'Critical Alerts', 'Pending Reviews', 'Shipment Risks', 'Payment Alerts', 'Technical Incidents', 'Strategic Opportunities', 'Executive Escalations'];
  const visible = filter === 'All' ? notifications : notifications.filter((item) => item.section === filter);
  return (
    <section className="top-panel-section">
      <div className="top-panel-heading">
        <span>Unified Notification & Escalation Center</span>
        <h2>{visible.length} executive events visible</h2>
        <button className="tactical-button compact" onClick={() => navigate('/export-os/notification-center')}>Open Center</button>
      </div>
      <div className="top-filter-row">
        {sections.map((section) => <button key={section} className={filter === section ? 'active' : ''} onClick={() => setFilter(section)}>{section}</button>)}
      </div>
      <div className="top-alert-list" aria-live="polite" aria-relevant="additions removals">
        {visible.length === 0 ? (
          <EmptyState icon={Bell} title="All clear" description="No live notifications match this filter." />
        ) : visible.map((item) => {
          const delivery = getOperationalDeliveryChannel(item);
          return (
            <article key={item.id}>
              <button className="top-alert-main" onClick={() => navigate(item.route)}>
                <div>
                  <span>{item.section} / {item.owner}</span>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                </div>
                <RiskBadge label={item.severity} />
              </button>
              <div className={`notification-channel compact channel-${delivery.channel.toLowerCase()}`}><Mail size={12} /><span>{delivery.channel}</span><small>{delivery.note}</small></div>
              <footer>
                <StatusBadge label={item.status} state={getApprovalState(item.status)} />
                <button onClick={() => navigate(item.route)}>Open Workflow</button>
                <button>Escalate</button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function GlobalCommandSearch({ query, setQuery, records, navigate }) {
  const suggestions = ['Show delayed shipments', 'Find Country pending buyers', 'Open pending invoices', 'Any high-risk workflows?', 'Show OpenAI renewal', 'What is pending today?'];
  const debouncedQuery = useDebounce(query, 250);
  const normalized = debouncedQuery.trim().toLowerCase();
  const results = React.useMemo(() => (
    normalized
      ? records.filter((record) => `${record.title} ${record.type} ${record.owner} ${record.status} ${record.priority} ${record.keywords}`.toLowerCase().includes(normalized) || normalized.split(/\s+/).some((part) => record.keywords.toLowerCase().includes(part)))
      : records.slice(0, 6)
  ), [normalized, records]);
  const renderSearchResult = React.useCallback((result) => (
    <button className="virtual-list-row" key={result.id} onClick={() => navigate(result.route)}>
      <StatusBadge status={result.status} />
      <span style={{ flex: 1 }}>
        <strong>{highlightMatch(result.title || result.command || result.name, query)}</strong>
        <small>{result.route}</small>
      </span>
      <span style={{ color: 'var(--dim)', fontSize: 'var(--text-xs)' }}>
        {result.type || result.division || result.role || ''} / {result.owner || ''}
      </span>
      <RiskBadge label={result.priority} />
    </button>
  ), [navigate, query]);

  return (
    <section className="top-panel-section">
      <div className="top-panel-heading">
        <span>Global Operational Command Search</span>
        <h2>Spotlight for workflows, buyers, tasks, payments, and intelligence</h2>
        <StatusBadge label="Natural Language Ready" state="success" />
      </div>
      <label className="global-command-search-box">
        <Search size={18} />
        <input aria-label="AI command query" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Show delayed shipments, find Country pending buyers, open pending invoices..." />
      </label>
      <div className="search-suggestion-row">
        {suggestions.map((item) => <button key={item} onClick={() => setQuery(item)}>{item}</button>)}
      </div>
      <div className="search-result-list">
        {results.length > 50 ? (
          <VirtualList
            items={results}
            itemHeight={56}
            className="global-command-virtual-list"
            getItemKey={(item) => item.id}
            renderItem={renderSearchResult}
          />
        ) : (
          results.map(renderSearchResult)
        )}
      </div>
    </section>
  );
}

function DirectorOperatingMap({ navigate }) {
  const branches = directorBranches;
  return (
    <div className="director-operating-map" aria-label="Director operating map">
      <svg className="director-map-lines" viewBox="0 0 440 440" aria-hidden="true">
        <path d="M220 220 L220 58" />
        <path d="M220 220 L374 156" />
        <path d="M220 220 L318 356" />
        <path d="M220 220 L122 356" />
        <path d="M220 220 L66 156" />
      </svg>
      <button className="director-core-node" onClick={() => navigate('/export-os/director')}>
        <span>Operating</span>
        <strong>Director</strong>
        <small>Decision Center</small>
      </button>
      {branches.map((branch, index) => (
        <button
          key={branch.id}
          className={`director-branch-node branch-${index + 1}`}
          onClick={() => navigate(branch.route)}
        >
          <strong>{branch.name}</strong>
          <span>{branch.command}</span>
        </button>
      ))}
      <span className="map-signal-dot signal-1" aria-hidden="true" />
      <span className="map-signal-dot signal-2" aria-hidden="true" />
      <span className="map-signal-dot signal-3" aria-hidden="true" />
      <span className="map-signal-dot signal-4" aria-hidden="true" />
      <span className="map-signal-dot signal-5" aria-hidden="true" />
    </div>
  );
}

function PasswordInput({ id, label, value, error, onChange }) {
  return <RevealableSecureField id={id} label={label} icon={LockKeyhole} value={value} error={error} onChange={onChange} autoComplete="current-password" />;
}

function SecurePinInput({ id, label, value, error, onChange }) {
  return <RevealableSecureField id={id} label={label} icon={KeyRound} value={value} error={error} onChange={onChange} autoComplete="one-time-code" inputMode="numeric" />;
}

function RevealableSecureField({ id, label, icon: Icon, value, error, onChange, autoComplete, inputMode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`secure-field ${error ? 'invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div>
        <Icon size={17} />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button type="button" className="password-toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label}` : `Show ${label}`}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <small id={`${id}-error`}>{error}</small>}
    </div>
  );
}

function AuthStatusBadge({ status }) {
  const state = status.includes('Live') || status.includes('Session') ? 'success' : 'progress';
  return <span className={`auth-status-badge state-${state}`}><StatusPulse />{status}</span>;
}

function ChangePasswordModal({ onClose }) {
  return <SecureRecoveryNotice title="Change Password" onClose={onClose} message="Local test authentication is enabled. Password changes are disabled until live auth is reconnected." />;
}

function PINResetModal({ onClose }) {
  return <SecureRecoveryNotice title="Forgot PIN" onClose={onClose} message="PIN recovery is disabled while local test authentication is enabled." />;
}

function SecureRecoveryNotice({ title, message, onClose }) {
  return (
    <motion.div className="secure-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="secure-modal-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section className="secure-recovery-modal" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
        <header>
          <div>
            <span>Local Auth Only</span>
            <h2 id="secure-modal-title">{title}</h2>
          </div>
          <button className="drawer-back-button" onClick={onClose}><ArrowLeft size={15} />Back</button>
        </header>
        <AuthStatusBadge status="Manual Setup" />
        <div className="recovery-step">
          <p>{message}</p>
          <button className="tactical-button" onClick={onClose}>Return to Login</button>
        </div>
        <small className="secure-modal-note">No passwords, PINs, OTPs, or mobile numbers are stored by this screen.</small>
      </motion.section>
    </motion.div>
  );
}

function GopuBrandMark({ className = '' }) {
  return (
    <span className={`gopu-brand-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 76 76" focusable="false">
        <path d="M42.6 16.2c-6.8-.2-12.2 4.8-12.2 11.3 0 2.4.7 4.5 2 6.3-4.5.8-7.7 4.4-7.7 8.9 0 5.4 4.6 9.3 10.6 9.3h17.2" />
        <path d="M43.2 23.4c-3.5 0-6.1 2.3-6.1 5.3 0 3.4 2.7 5.1 7.2 6.3l7.7 2.1" />
        <path d="M30.5 34.3h-7.1m7.3 9.1h-7.3" />
        <path d="M39 35.2v21.1" />
        <path d="M31.6 52.2c-3.9 0-6.9-2.6-6.9-6.2 0-2.3 1.2-4.1 3.2-5.1-2-1.4-3.2-3.4-3.2-5.9 0-4.8 4-8.2 9.2-8.2" />
        <path d="M52.4 24.7c-2.3-5.3-6.3-8.3-11.4-8.3" />
        <path d="M52.6 51.8c-2.8 2.9-6.2 4.4-10.1 4.4" />
      </svg>
    </span>
  );
}

function ExecutiveCommandCard({ command, index = 0, variant = 'core', onOpen }) {
  const Icon = command.icon;
  const runtimeStatus = getCommandRuntimeStatus(command.id);
  const priorities = getExecutivePriorities(command);
  const mandate = getExecutiveMandate(command);

  return (
    <motion.article
      className={`executive-command-card executive-card-${variant} tone-${command.tone} state-${runtimeStatus.state}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="executive-card-top">
        <StatusBadge label={runtimeStatus.label} state={runtimeStatus.state} />
        <span className="command-category-tag">{command.category}</span>
      </div>
      <div className="executive-card-icon"><Icon size={28} /></div>
      <div className="executive-card-main">
        <span className="coo-kicker">{command.name}</span>
        <h2>{command.title}</h2>
        <p>{mandate}</p>
      </div>
      <ul className="executive-priority-list">
        {priorities.map((priority) => <li key={priority}>{priority}</li>)}
      </ul>
      <div className="executive-modules">
        {command.key_modules.slice(0, variant === 'anchor' ? 4 : 3).map((module) => <span key={module}>{module}</span>)}
      </div>
      <CommandButton onClick={onOpen}>Open {command.name}</CommandButton>
    </motion.article>
  );
}

function getExecutiveMandate(command) {
  const mandates = {
    director: 'Central decision control across approvals, escalations, priorities, and executive coordination.',
    coo: 'Execution control for shipments, documents, suppliers, tasks, and daily operating priorities.',
    cto: 'Reliability control for integrations, automation queues, incidents, security, and platform health.',
    cfo: 'Commercial control for pricing, margins, payments, renewals, invoices, and financial risk.',
    cmo: 'Growth control for buyer outreach, authority content, campaigns, and brand-safe communication.',
    cio: 'Importer intelligence control for market signals, buyer discovery, trade opportunities, and CRM handoff.'
  };
  return mandates[command.id] || command.role;
}

function getExecutivePriorities(command) {
  const priorities = {
    director: ['Clear high-risk decisions', 'Coordinate executive owners', 'Protect workflow release gates'],
    coo: ['Remove shipment blockers', 'Confirm supplier readiness', 'Maintain document readiness'],
    cto: ['Monitor automation retries', 'Verify integrations', 'Control incident response'],
    cfo: ['Review margin exposure', 'Validate payment rules', 'Protect invoice releases'],
    cmo: ['Prepare buyer outreach', 'Route sensitive claims', 'Track growth campaigns'],
    cio: ['Surface importer opportunities', 'Score country demand', 'Feed CRM intelligence']
  };
  return priorities[command.id] || command.key_modules.slice(0, 3);
}

const activeFounderWorkflows = [
  { id: 'workflow-phyto', title: 'Phytosanitary certificate -- SHP-2026-047 chilli powder', owner: 'COO Command', status: 'Blocked', route: '/export-os/executives/coo', priority: 'Critical' },
  { id: 'workflow-lut', title: 'LUT invoice release gate -- IEC & AD Code missing', owner: 'Director / Finance', status: 'Blocked', route: '/export-os/invoices/new', priority: 'Critical' },
  { id: 'workflow-quote', title: 'Black pepper CFO pricing review -- margin 14.2%', owner: 'CFO Command', status: 'Waiting Director Action', route: '/export-os/pricing-engine', priority: 'High' },
  { id: 'workflow-sb', title: 'Shipping Bill filing -- turmeric container JNPT', owner: 'COO Command', status: 'In Progress', route: '/export-os/executives/coo', priority: 'High' },
  { id: 'workflow-lc', title: 'LC document presentation -- UAE buyer Khalid Trading', owner: 'CFO Command', status: 'Review Pending', route: '/export-os/executives/cfo', priority: 'High' },
  { id: 'workflow-cio', title: 'EU MRL update -- chilli MRL tightened to 0.01 ppm', owner: 'CIO Command', status: 'Alert Active', route: '/export-os/executives/cio', priority: 'High' },
  { id: 'workflow-rodtep', title: 'RoDTEP credit reconciliation -- Q1 pending', owner: 'CFO Command', status: 'Monitoring', route: '/export-os/executives/cfo', priority: 'Medium' }
];

const founderCriticalAlerts = [
  { id: 'alert-lut', title: 'LUT release gate blocked', detail: 'Invoices under LUT remain draft-only until vault LUT details and founder verification are complete. No shipment can proceed without this.', tone: 'attention', owner: 'Document Factory' },
  { id: 'alert-margin', title: 'Low-margin quote pending CFO review', detail: 'A chilli powder quotation is showing 14.2% margin -- below the 18% floor. CFO review required before Director release to buyer.', tone: 'attention', owner: 'CFO Command' },
  { id: 'alert-phyto', title: 'Phytosanitary certificate delayed', detail: 'APEDA inspection for Shipment #SHP-2026-047 is overdue by 2 days. Port cutoff at JNPT is in 36 hours. COO escalation required.', tone: 'error', owner: 'COO Command' },
  { id: 'alert-spine', title: 'IEC and AD Code missing in vault', detail: 'Company Master Data Vault is missing IEC registration and AD Code. Shipping Bill cannot be filed without these. Founder action required.', tone: 'error', owner: 'Foundation Layer' }
];

const operationalKpis = [
  { label: 'Shipments active', value: '08', status: 'Monitoring' },
  { label: 'Docs pending', value: '05', status: 'Attention' },
  { label: 'Director approvals', value: '03', status: 'Director Review' },
  { label: 'Blocked workflows', value: '02', status: 'Blocked' }
];

function FounderOperationalOverview({ navigate, newsItems = [], newsStatus = 'Monitoring' }) {
  return (
    <section className="workflow-intelligence-section" aria-label="Homepage operational lower half">
      <div className="homepage-action-band">
        <ActiveWorkflowsPanel workflows={activeFounderWorkflows} navigate={navigate} />
        <FounderReviewQueue queue={founderReviewQueue} onOpen={() => navigate('/export-os/director')} />
        <MorningBriefingPreview onOpen={() => navigate('/export-os/morning-briefing')} />
      </div>
      <div className="homepage-insight-band">
        <OperationalKpisPanel items={operationalKpis} />
        <ExecutiveActivityPanel items={executiveActivityTimeline} />
        <ExportNewsFeed items={newsItems} status={newsStatus} />
      </div>
      <ExecutiveDepartmentFooter updates={executiveStatusUpdates} navigate={navigate} />
    </section>
  );
}

function ActiveWorkflowsPanel({ workflows, navigate }) {
  return (
    <section className="deck-live-panel active-workflows-panel">
      <div className="coo-panel-header">
        <div>
          <span>Active Workflows</span>
          <h2>What is moving right now</h2>
        </div>
        <Workflow size={20} />
      </div>
      <div className="workflow-list">
        {workflows.map((workflow) => (
          <button key={workflow.id} className="workflow-row" onClick={() => navigate(workflow.route)}>
            <div>
              <strong>{workflow.title}</strong>
              <span>{workflow.owner}</span>
            </div>
            <StatusBadge label={workflow.status} state={workflow.status === 'Blocked' ? 'error' : workflow.status.includes('Director') ? 'attention' : 'progress'} />
            <PriorityBadge priority={workflow.priority} />
          </button>
        ))}
      </div>
    </section>
  );
}

function CriticalAlertsPanel({ alerts }) {
  return (
    <section className="deck-live-panel critical-alerts-panel">
      <div className="coo-panel-header">
        <div>
          <span>Critical Alerts</span>
          <h2>Founder attention signals</h2>
        </div>
        <AlertTriangle size={20} />
      </div>
      <div className="critical-alert-list">
        {alerts.map((alert) => (
          <article className={`critical-alert-item tone-${alert.tone}`} key={alert.id}>
            <strong>{alert.title}</strong>
            <p>{alert.detail}</p>
            <span>{alert.owner}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function OperationalKpisPanel({ items }) {
  return (
    <section className="deck-live-panel operational-kpis-panel">
      <div className="coo-panel-header">
        <div>
          <span>Operational KPIs</span>
          <h2>Current business pulse</h2>
        </div>
        <Gauge size={20} />
      </div>
      <div className="operational-kpi-grid">
        {items.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.status}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExecutiveActivityPanel({ items }) {
  return (
    <section className="deck-live-panel executive-activity-panel">
      <div className="coo-panel-header">
        <div>
          <span>Executive Activity</span>
          <h2>Latest command movement</h2>
        </div>
        <Activity size={20} />
      </div>
      <div className="deck-activity-list">
        {items.map((item) => {
          const owner = executiveCommandDeck.find((command) => command.id === item.command_id)?.name;
          return (
            <div className="timeline-entry" key={item.id}>
              <i />
              <div>
                <strong>{item.event}</strong>
                <span>{owner} - {item.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MorningBriefingPreview({ onOpen }) {
  const [briefings, setBriefings] = useState([]);
  const [latestCampaigns, setLatestCampaigns] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [bRes, cRes] = await Promise.all([
          fetch('/api/cmo/briefing').then(r => r.json()),
          fetch('/api/cmo/campaigns').then(r => r.json())
        ]);
        if (bRes.ok) setBriefings(bRes.briefings || []);
        if (cRes.ok) setLatestCampaigns((cRes.campaigns || []).filter(c => c.status === 'active').slice(0, 3));
      } catch {}
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const latest = briefings[0];
  const latestPayload = latest?.payload || {};

  return (
    <section className="deck-live-panel morning-briefing-preview">
      <div className="coo-panel-header">
        <div>
          <span>Agent Briefing</span>
          <h2>{latest ? `${latestPayload.period || 'Daily'} Briefing` : 'Daily Briefings'}</h2>
        </div>
        <ClipboardList size={20} />
      </div>
      <div className="briefing-lines">
        {latestCampaigns.length > 0 ? (
          latestCampaigns.map(c => (
            <p key={c.id}>{c.platform}: {c.current_value || 0}/{c.target_value} {c.goal_type} &mdash; &#8377;{c.budget_spent || 0} spent</p>
          ))
        ) : (
          <>
            <p>Review blocked LUT invoice data before release planning.</p>
            <p>Check CFO margin queue before buyer-facing quote movement.</p>
            <p>Confirm COO follow-ups for documentation and supplier actions.</p>
          </>
        )}
        {latestPayload.wallet_balance !== undefined && (
          <p>CFO Creative Wallet: &#8377;{latestPayload.wallet_balance} {Number(latestPayload.wallet_balance) < 100 ? '-- Low balance' : ''}</p>
        )}
        {briefings.length > 0 && (
          <p className="briefing-timestamp">Last briefing: {new Date(latest.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
        )}
      </div>
      <button className="ghost-button" onClick={onOpen}>Open Morning Briefing <ChevronRight size={15} /></button>
    </section>
  );
}

function ArchitectureEntryPanel({ onOpen }) {
  return (
    <section className="deck-live-panel architecture-entry-panel">
      <div>
        <span className="coo-kicker">System Architecture</span>
        <h2>Operating Spine moved out of the live dashboard</h2>
        <p>Open the platform module navigator when you need system structure, routes, and foundation layers.</p>
      </div>
      <button className="ghost-button" onClick={onOpen}>
        Open Operating Spine
        <ChevronRight size={15} />
      </button>
    </section>
  );
}

function OperatingSpinePage({ navigate, onBack }) {
  return (
    <ExportOSShell className="operating-spine-shell">
      <header className="deck-header architecture-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>Operating Spine</h1>
          <p>System architecture navigator for foundation modules, workflow systems, and SaaS-ready platform layers.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <div className="coo-status"><StatusPulse /><strong>Architecture Mode</strong></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>
      <section className="architecture-intro-panel">
        <div>
          <span className="coo-kicker">Platform Systems</span>
          <h2>Modules that feed the live founder command center</h2>
          <p>This page is intentionally calmer and denser than the executive dashboard. Use it to open modules, inspect foundation layers, and understand how GOPU Export OS is structured.</p>
        </div>
        <div className="architecture-layer-strip">
          {['Foundation', 'Decision', 'Commercial', 'Documents', 'Execution'].map((layer) => <span key={layer}>{layer}</span>)}
        </div>
      </section>
      <OperatingSpineSection modules={operatingSpineModules} navigate={navigate} compact />
    </ExportOSShell>
  );
}

function OperatingSpineSection({ modules, navigate, compact = false }) {
  return (
    <section className={`operating-spine-panel ${compact ? 'compact' : ''}`} aria-label="Operating Spine">
      <div className="coo-panel-header">
        <div>
          <span>Operating Spine</span>
          <h2>Architecture navigator</h2>
        </div>
        <Database size={20} />
      </div>
      <div className="operating-spine-grid">
        {modules.map((module) => (
          <article className="spine-module-card" key={module.id}>
            <div className="executive-card-top">
              <StatusBadge label={module.status} state="progress" />
            </div>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            <CommandButton onClick={() => navigate(module.route)}>Open {module.title}</CommandButton>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExecutiveSyncSummary({ updates }) {
  return (
    <section className="sync-summary-panel" aria-label="Executive sync summary">
      <div className="coo-panel-header">
        <div>
          <span>Executive Sync Summary</span>
          <h2>Command Unit Status</h2>
        </div>
        <Gem size={20} />
      </div>
      <div className="sync-status-grid">
        {updates.map((update) => {
          const owner = executiveCommandDeck.find((command) => command.id === update.command_id)?.name;
          return (
            <article className="sync-status-card" key={update.id}>
              <strong>{update.update_type}</strong>
              <p>{update.message}</p>
              <span>Owner: {owner}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ForexTicker({ items, status }) {
  const tickerItems = [...items, ...items];

  return (
    <section className="forex-ticker" aria-label="Live foreign exchange rates" aria-live="polite">
      <div className="forex-label">
        <StatusPulse />
        <span>Live Forex Rates</span>
        <small>{status}</small>
      </div>
      <div className="forex-track-shell">
        <div className="forex-track">
          {tickerItems.map((item, index) => (
            <div className={`forex-item ${item.direction}`} key={`${item.pair}-${index}`}>
              <strong>{item.pair}</strong>
              <span>{item.rate}</span>
              <small>{item.change}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExportNewsFeed({ items, status }) {
  const [selectedArticle, setSelectedArticle] = useState(null);

  return (
    <section className="export-news-feed" aria-label="Recent export news">
      <div className="coo-panel-header">
        <div>
          <span>Recent Export News</span>
          <h2>Trade Intelligence Feed</h2>
          <p className="feed-status-line">{status}</p>
        </div>
        <FileBarChart size={20} />
      </div>
      <div className="news-feed-list">
        {items.map((item) => (
          <article className="news-feed-item" key={item.id}>
            <div>
              <span>{item.category}</span>
              <small>{formatDisplayDate(item.published_at)}</small>
            </div>
            <h3>{item.headline}</h3>
            <p>{item.summary}</p>
            <footer>
              <small>{item.source}</small>
              <button onClick={() => setSelectedArticle(item)} aria-label={`Read ${item.headline}`}>
                Read <ArrowUpRight size={14} />
              </button>
            </footer>
          </article>
        ))}
      </div>
      {selectedArticle && (
        <ArticleReaderModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </section>
  );
}

function ArticleReaderModal({ article, onClose }) {
  return (
    <div className="article-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="article-modal-title">
      <div className="article-modal">
        <button className="login-back drawer-back-button" onClick={onClose}><ArrowLeft size={15} />Back</button>
        <span className="selected-os-badge">{article.category}</span>
        <h2 id="article-modal-title">{article.headline}</h2>
        <p>{article.summary}</p>
        <dl>
          <div><dt>Source</dt><dd>{article.source}</dd></div>
          <div><dt>Date / Time</dt><dd>{formatDisplayDate(article.published_at)}</dd></div>
          <div><dt>Feed</dt><dd>{article.feed || (article.live ? 'Live news feed' : 'Unavailable')}</dd></div>
        </dl>
        <a className="tactical-button article-source-button" href={article.url} target="_blank" rel="noreferrer">
          Open Full Article at Source
          <ArrowUpRight size={16} />
        </a>
      </div>
    </div>
  );
}

function RiskBadge({ label }) {
  const normalized = String(label || 'Monitoring').toLowerCase();
  const state = normalized.includes('critical') || normalized.includes('high') ? 'error' : normalized.includes('medium') || normalized.includes('attention') ? 'attention' : normalized.includes('opportunity') ? 'progress' : 'online';
  return <span className={`risk-badge state-${state}`}>{label}</span>;
}

function FounderReviewQueue({ queue, onOpen }) {
  return (
    <aside className="founder-review-queue">
      <div className="coo-panel-header">
        <div>
          <span>Director Review</span>
          <h2>Pending decisions</h2>
        </div>
        <TriangleAlert size={20} />
      </div>
      {queue.map((item) => (
        <div className="review-queue-item" key={item.id}>
          <strong>{item.title}</strong>
          <span>{item.status}</span>
          <small>{item.department} - {item.requested_by}</small>
        </div>
      ))}
      <button className="tactical-button command-button" onClick={onOpen}>
        Open Director Queue
        <ChevronRight size={16} />
      </button>
    </aside>
  );
}

function CommandButton({ children, onClick }) {
  return (
    <button className="tactical-button command-button" onClick={onClick}>
      {children}
      <ChevronRight size={16} />
    </button>
  );
}

function getApprovalState(status) {
  if (status === 'High Risk' || status === 'Escalated' || status === 'Rejected' || status === 'Critical' || status === 'Failed') return 'error';
  if (status === 'Attention Required' || status === 'Waiting Founder Action' || status === 'Founder Review Required' || status === 'Pending' || status === 'Pending Approval' || status === 'Review Required' || status === 'Clarification Needed' || status === 'Needs Review') return 'attention';
  if (status === 'Review Pending' || status === 'Draft Prepared' || status === 'Revision Requested' || status === 'Monitoring' || status === 'Auto-Resolved' || status === 'Sent' || status === 'Delivered') return 'progress';
  return 'online';
}

function getAutomationState(status) {
  if (status === 'Failed' || status === 'Blocked' || status === 'Critical') return 'error';
  if (status === 'Attention' || status === 'Retry Pending' || status === 'Waiting Approval') return 'attention';
  if (status === 'Monitoring' || status === 'Retrying' || status === 'Connect Supabase to activate' || status === 'Paused') return 'progress';
  return 'online';
}

function getSecurityState(status) {
  if (status === 'Critical' || status === 'Access Revoked' || status === 'Suspended') return 'error';
  if (status === 'Attention' || status === 'Review Required' || status === 'Pending Invite') return 'attention';
  if (status === 'Monitoring') return 'progress';
  return 'online';
}

function getInvoiceActionBlockers(invoice) {
  return buildInvoiceValidation(invoice).filter((check) => check.status === 'Failed' && check.severity === 'critical');
}

function DocumentFactoryPage({ navigate, onBack }) {
  async function routeDocumentApproval() {
    await createApprovalRequest({
      tenant_id: demoTenantId,
      request_type: 'Document Review',
      title: 'Export document release requires founder approval',
      department: 'Documentation',
      executive_owner: 'COO Command',
      buyer_name: 'Document workflow',
      related_workflow_id: null,
      risk_level: 'High',
      priority: 'High',
      status: 'Founder Review Required',
      summary: 'Compliance-sensitive export document package requires founder approval before buyer release.',
      source_module: 'document-factory',
      category: 'Compliance',
      details: {
        workflow_source: 'Document Factory',
        risk_reason: 'Export document release and compliance-sensitive fields',
        operational_impact: 'Buyer Release Package remains disabled until founder decision.',
        coo_notes: 'COO draft review prepared.',
        cfo_notes: 'No commercial release should occur before approval.'
      }
    });
    await createTaskFromWorkflow({
      tenant_id: demoTenantId,
      title: 'Document review required before buyer release',
      description: 'Document Factory created an approval-controlled review task for export document release.',
      workflow_source: 'Document Factory',
      linked_record_id: 'DOC-RELEASE-DRAFT',
      linked_label: 'Buyer release package',
      linked_route: '/export-os/document-factory',
      department: 'Documentation',
      owner_command: 'COO Command',
      assigned_role: 'Documentation Staff',
      priority: 'High',
      status: 'Waiting Review',
      due_date: 'Today',
      blocking_reason: 'Compliance-sensitive export document package requires founder approval before buyer release.',
      next_action: 'Validate missing document fields, prepare COO draft review, and keep buyer release disabled.',
      buyer: 'Document workflow',
      product: 'Export document package'
    });
    navigate('/export-os/director');
  }
  return (
    <InvoiceSystemShell onBack={onBack} onOpenTasks={() => navigate('/export-os/tasks')} title="Document Factory" subtitle="LUT invoice drafts, document validation, PDF preview, and approval routing.">
      <DocumentCoveragePanel />
      <section className="document-factory-grid">
        {[
          ['Export Invoice System', 'Create LUT-first export tax invoices with validation and approval controls.', '/export-os/invoices/new'],
          ['Invoice Library', 'Review draft invoices, validation failures, approval state, and invoice audit history.', '/export-os/invoices'],
          ['Company Master Data Vault', 'Complete company, registration, LUT, bank, and export defaults before release.', '/export-os/company-master-data'],
          ['Director Command Center', 'Route sensitive invoice actions for founder decision before final release.', '/export-os/director'],
          ['Task & Follow-up Engine', 'Create follow-up tasks for invoice blockers, document validation, and approval routing.', '/export-os/tasks']
        ].map(([title, body, route]) => (
          <article className="document-module-card" key={title}>
            <FileText size={22} />
            <h2>{title}</h2>
            <p>{body}</p>
            <CommandButton onClick={() => navigate(route)}>Open</CommandButton>
          </article>
        ))}
      </section>
      <section className="invoice-form-panel">
        <div className="approval-section-header"><div><span>Document Approval Routing</span><h2>Buyer release remains approval-controlled</h2></div><FileCheck2 size={18} /></div>
        <p className="pricing-note">Export document release, compliance-sensitive fields, COO draft reviews, and buyer release packages must route through Director Command Center.</p>
        <button className="tactical-button" onClick={routeDocumentApproval}>Create Document Approval Request</button>
      </section>
    </InvoiceSystemShell>
  );
}

function DocumentCoveragePanel() {
  return (
    <section className="document-coverage-panel">
      <div className="approval-section-header">
        <div><span>Document / Invoice Coverage</span><h2>Required export document types</h2></div>
        <FileCheck2 size={18} />
      </div>
      <div className="document-type-grid">
        {invoiceDocumentTypes.map((type) => (
          <article key={type.id}>
            <strong>{type.name}</strong>
            <p>{type.purpose}</p>
            <StatusBadge label={type.defaultStatus} state={getApprovalState(type.defaultStatus)} />
          </article>
        ))}
      </div>
      <div className="package-template-grid">
        {documentPackageTemplates.map((template) => (
          <article key={template.id}>
            <strong>{template.name}</strong>
            {template.items.map((item) => <span key={item}>{item}</span>)}
          </article>
        ))}
      </div>
    </section>
  );
}

function InvoiceSystemShell({ children, onBack, onOpenTasks, title, subtitle }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <ExportOSShell className="operational-export-shell invoice-system-shell">
      <header className="deck-header invoice-system-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <div className="coo-status"><FileCheck2 size={15} /><strong>Default Mode: LUT/Bond Without IGST</strong></div>
          <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          {onOpenTasks && <button className="ghost-button deck-logout" onClick={onOpenTasks}><Workflow size={15} />Task Engine</button>}
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} />Back</button>
        </div>
      </header>
      <div className="invoice-model-strip">{invoiceModels.map((model) => <code key={model}>{model}</code>)}</div>
      {children}
    </ExportOSShell>
  );
}

function InvoiceLibrary({ navigate, onBack, onOpenTasks }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Draft', 'Validation Failed', 'Founder Review Required', 'Approved for Release', 'Revision Required', 'LUT Invoices', 'Proforma', 'Commercial Invoice'];
  const invoices = invoiceLibraryItems.filter((invoice) => {
    if (filter === 'All') return true;
    if (filter === 'LUT Invoices') return invoice.export_mode === 'LUT/Bond Without IGST';
    if (filter === 'Proforma') return invoice.invoice_type === 'Proforma Invoice';
    if (filter === 'Commercial Invoice') return invoice.invoice_type === 'Commercial Invoice';
    return invoice.status === filter || invoice.approval_status === filter;
  });
  return (
    <InvoiceSystemShell onBack={onBack} onOpenTasks={onOpenTasks} title="Invoice Library" subtitle="Draft-first invoice control with LUT mode, validation state, and approval status.">
      <div className="invoice-library-actions">
        <div className="approval-filter-row">{filters.map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <button className="tactical-button" onClick={() => navigate('/export-os/invoices/new')}>Create LUT Invoice Draft</button>
      </div>
      <section className="invoice-library-grid">
        {invoices.map((invoice) => {
          const totals = calculateInvoiceTotals(invoice);
          return (
            <article className="invoice-library-card" key={invoice.id} onClick={() => navigate(`/export-os/invoices/${invoice.id}`)}>
              <div><strong>{invoice.invoice_number}</strong><StatusBadge label={invoice.status} state={getApprovalState(invoice.status)} /></div>
              <p>{invoice.buyer_company || invoice.buyer_name}</p>
              <span>{invoice.invoice_type}</span>
              <dl>
                <div><dt>Amount</dt><dd>{formatMoney(totals.grandTotal, invoice.currency)}</dd></div>
                <div><dt>Mode</dt><dd>{invoice.export_mode}</dd></div>
                <div><dt>Approval</dt><dd>{invoice.approval_status}</dd></div>
                <div><dt>Updated</dt><dd>Today</dd></div>
              </dl>
            </article>
          );
        })}
      </section>
    </InvoiceSystemShell>
  );
}

function InvoiceBuilder({ navigate, invoiceId, onBack, onOpenTasks }) {
  const seed = invoiceId === 'new' ? initialInvoiceDraft : invoiceLibraryItems.find((invoice) => invoice.id === invoiceId) || initialInvoiceDraft;
  const [invoice, setInvoice] = useState(() => ({ ...seed, id: invoiceId === 'new' ? `invoice-${Date.now()}` : seed.id, company_snapshot: { ...seed.company_snapshot }, items: seed.items.map((item) => ({ ...item })) }));
  const [snapshotStatus, setSnapshotStatus] = useState(invoiceBackendStatus.mode === 'Connected' ? 'Loading Company Master Data Vault...' : 'Connect Supabase to activate - Company data not backend connected.');
  const [snapshotLoading, setSnapshotLoading] = useState(invoiceId === 'new');
  const [audit, setAudit] = useState([
    { id: 'audit-created', actor: 'System', timestamp: 'Now', action: 'invoice draft created', previous_status: '-', new_status: 'Draft', notes: 'Company snapshot injected from Company Master Data Vault.' },
    { id: 'audit-company', actor: 'System', timestamp: 'Now', action: 'company data injected', previous_status: '-', new_status: 'Draft', notes: 'Snapshot saved to invoice_company_snapshot.' },
    { id: 'audit-lut', actor: 'System', timestamp: 'Now', action: 'LUT data injected', previous_status: '-', new_status: 'Draft', notes: 'LUT data incomplete, release blocked.' }
  ]);
  const [emailPrepared, setEmailPrepared] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function injectCompanySnapshot() {
      setSnapshotLoading(true);
      if (invoiceId === 'new') {
        const result = await createInvoiceDraftFromVault(invoiceTenantId, {
          invoice_type: seed.invoice_type,
          invoice_number: seed.invoice_number,
          financial_year: seed.financial_year,
          currency: seed.currency
        });
        if (disposed) return;
        const snapshot = result.data?.company_snapshot || seed.company_snapshot;
        setInvoice((current) => ({
          ...current,
          id: result.data?.id || current.id,
          invoice_number: result.data?.invoice_number || current.invoice_number,
          financial_year: result.data?.financial_year || snapshot.lut_financial_year || current.financial_year,
          currency: result.data?.currency || snapshot.default_currency || current.currency,
          payment_terms: snapshot.default_payment_terms || current.payment_terms,
          incoterm: snapshot.default_incoterm || current.incoterm,
          port_of_loading: snapshot.default_port_loading || current.port_of_loading,
          export_mode: 'LUT/Bond Without IGST',
          company_snapshot: snapshot,
          items: current.items.map((item) => ({ ...item, tax_rate: 0, tax_amount: 0 }))
        }));
        setAudit((current) => [
          { id: `audit-snapshot-${Date.now()}`, actor: 'System', timestamp: 'Now', action: 'Company data snapshot injected', previous_status: '-', new_status: 'Draft', notes: result.backend.mode === 'Connected' ? 'Snapshot copied from Company Master Data Vault.' : 'Connect Supabase to activate - Company data not backend connected.' },
          ...current
        ]);
        setSnapshotStatus(result.backend.mode === 'Connected' ? 'Company data snapshot injected from Supabase.' : 'Connect Supabase to activate - Company data not backend connected.');
      } else {
        const snapshot = await buildCompanySnapshotFromVault(invoiceTenantId);
        if (disposed) return;
        setInvoice((current) => ({ ...current, company_snapshot: current.company_snapshot?.snapshot_created_at ? current.company_snapshot : snapshot }));
        setSnapshotStatus(invoiceBackendStatus.mode === 'Connected' ? 'Historical invoice snapshot loaded.' : 'Connect Supabase to activate - Company data not backend connected.');
      }
      setSnapshotLoading(false);
    }

    injectCompanySnapshot();
    return () => {
      disposed = true;
    };
  }, [invoiceId]);

  const validation = buildInvoiceValidation(invoice);
  const blockers = getInvoiceActionBlockers(invoice);
  const canRelease = blockers.length === 0 && invoice.status === 'Approved for Release';
  const topBlockerSummary = blockers.slice(0, 3).map((blocker) => blocker.message).join(' | ') || 'No critical validation blockers detected.';

  function updateInvoice(field, value) {
    setInvoice((current) => {
      if (field !== 'invoice_type') return { ...current, [field]: value };
      const type = invoiceDocumentTypes.find((item) => item.name === value);
      const isLut = value === 'Export Tax Invoice under LUT';
      return {
        ...current,
        invoice_type: value,
        status: type?.defaultStatus || 'Draft',
        export_mode: isLut ? 'LUT/Bond Without IGST' : current.export_mode,
        items: current.items.map((item) => ({ ...item, tax_rate: isLut ? 0 : item.tax_rate }))
      };
    });
  }

  function updateItem(field, value) {
    setInvoice((current) => ({ ...current, items: current.items.map((item, index) => index === 0 ? { ...item, [field]: value, tax_rate: current.export_mode === 'LUT/Bond Without IGST' ? 0 : item.tax_rate } : item) }));
  }

  function addAudit(action, newStatus, notes) {
    setAudit((current) => [{ id: `audit-${Date.now()}`, actor: 'Founder UI', timestamp: 'Now', action, previous_status: invoice.status, new_status: newStatus, notes }, ...current]);
    setInvoice((current) => ({ ...current, status: newStatus }));
    writeInvoiceAuditLog(invoiceTenantId, invoice.id, { action, previous_status: invoice.status, new_status: newStatus, notes });
  }

  async function validateInvoice() {
    if (blockers.length) {
      addAudit('Invoice validation failed', 'Validation Failed', `${blockers.length} critical blocker(s) remain.`);
      await Promise.all(blockers.slice(0, 5).map((blocker) => createTaskFromWorkflow({
        tenant_id: demoTenantId,
        title: blocker.group === 'LUT' ? 'Complete LUT details before invoice release' : blocker.key === 'hsn_review' || blocker.key === 'hsn_code' ? 'Complete HSN review before invoice release' : blocker.key === 'origin_review' ? 'Complete origin review before invoice release' : `Resolve invoice blocker: ${blocker.message}`,
        description: `Invoice validation failed: ${blocker.message}`,
        workflow_source: 'Invoice System',
        linked_record_id: invoice.id,
        linked_label: invoice.invoice_number,
        linked_route: blocker.group === 'LUT' || blocker.group === 'Company' ? '/export-os/company-master-data' : '/export-os/invoices/new',
        department: blocker.group === 'LUT' || blocker.group === 'Company' ? 'Finance' : blocker.group === 'Product' || blocker.group === 'Export' ? 'Documentation' : 'Operations',
        owner_command: blocker.owner || (blocker.group === 'LUT' ? 'Founder / Finance' : 'COO Command'),
        assigned_role: blocker.owner || 'COO',
        priority: blocker.severity === 'critical' || blocker.group === 'LUT' ? 'Critical' : 'High',
        status: blocker.group === 'Approval' ? 'Waiting Founder Approval' : 'Blocked',
        due_date: 'Today',
        blocking_reason: blocker.message,
        next_action: blocker.group === 'LUT' ? 'Open Company Master Data Vault and complete LUT details.' : 'Fix the invoice field, rerun validation, and keep final release blocked until cleared.',
        buyer: invoice.buyer_company || invoice.buyer_name,
        product: invoice.items?.[0]?.product_description
      })));
      if (blockers.some((blocker) => blocker.group === 'LUT')) {
        writeInvoiceAuditLog(invoiceTenantId, invoice.id, { action: 'LUT validation blocked invoice release', previous_status: invoice.status, new_status: 'Validation Failed', notes: 'LUT incomplete, expired, inactive, or not founder verified.' });
      }
      return;
    }
    addAudit('validation passed', 'Validation Passed', 'All critical checks passed in local UI.');
  }

  function prepareEmail() {
    if (blockers.length) return addAudit('email draft blocked', 'Validation Failed', 'Critical validation blockers remain.');
    setEmailPrepared(true);
    addAudit('email draft prepared', 'Email Draft Prepared', 'Email draft prepared. No email sent.');
  }

  async function requestReview(stage) {
    const status = stage === 'CFO' ? 'CFO Review Required' : stage === 'COO' ? 'COO Review Required' : 'Founder Review Required';
    addAudit(`${stage} review requested`, status, `${stage} review requested from invoice workspace.`);
    await createTaskFromWorkflow({
      tenant_id: demoTenantId,
      title: `${stage} review required for export invoice`,
      description: `${stage} review was requested from the invoice workspace before release.`,
      workflow_source: 'Invoice System',
      linked_record_id: invoice.id,
      linked_label: invoice.invoice_number,
      linked_route: '/export-os/invoices/new',
      department: stage === 'CFO' ? 'Finance' : 'Operations',
      owner_command: `${stage} Command`,
      assigned_role: stage,
      priority: stage === 'CFO' ? 'High' : 'Medium',
      status: 'Waiting Review',
      due_date: 'Today',
      blocking_reason: `${stage} review required before final release.`,
      next_action: `${stage} must review invoice validation, document readiness, and approval dependency.`,
      buyer: invoice.buyer_company || invoice.buyer_name,
      product: invoice.items?.[0]?.product_description
    });
  }

  async function routeInvoiceApproval() {
    const lutBlocker = blockers.find((blocker) => blocker.group === 'LUT');
    const hsnBlocker = blockers.find((blocker) => blocker.key === 'hsn_review' || blocker.key === 'hsn_code');
    const originBlocker = blockers.find((blocker) => blocker.key === 'origin_review');
    const requestType = lutBlocker ? 'LUT Validation Issue' : hsnBlocker ? 'HSN Review Pending' : originBlocker ? 'Origin Review Pending' : 'Invoice Approval';
    await createApprovalRequest({
      tenant_id: demoTenantId,
      request_type: requestType,
      title: `${invoice.invoice_number} requires founder approval`,
      department: 'Documents',
      executive_owner: 'CFO Command',
      buyer_name: invoice.buyer_company || invoice.buyer_name,
      related_workflow_id: invoice.id,
      risk_level: blockers.some((blocker) => blocker.group === 'LUT') ? 'Critical' : 'High',
      priority: blockers.length ? 'Critical' : 'High',
      status: 'Founder Review Required',
      summary: blockers.length ? `${blockers.length} validation blocker(s) remain before invoice release.` : 'Final invoice release requires founder approval.',
      source_module: 'invoice-system',
      category: 'Compliance',
      amount: invoice.invoice_number,
      details: {
        workflow_source: 'Invoice System',
        linked_invoice: invoice.invoice_number,
        product: invoice.items?.[0]?.product_description,
        risk_reason: blockers.map((blocker) => blocker.message).slice(0, 5).join('; ') || 'Founder approval required before release.',
        operational_impact: 'Final PDF and buyer email remain disabled until approval and validation pass.',
        cfo_notes: 'LUT, HSN, origin, and founder approval gates must be cleared.',
        coo_notes: 'Document workflow remains draft-first.'
      }
    });
    await createTaskFromWorkflow({
      tenant_id: demoTenantId,
      title: 'Founder approval required for export invoice',
      description: 'Invoice approval request was created. Final PDF and buyer release remain blocked until founder decision.',
      workflow_source: 'Director Queue',
      linked_record_id: invoice.id,
      linked_label: invoice.invoice_number,
      linked_route: '/export-os/director',
      department: 'Founder Office',
      owner_command: 'Founder',
      assigned_role: 'Founder',
      priority: blockers.length ? 'Critical' : 'High',
      status: 'Waiting Founder Approval',
      due_date: 'Today',
      blocking_reason: blockers.map((blocker) => blocker.message).slice(0, 3).join('; ') || 'Founder approval required before release.',
      next_action: 'Open Director Queue and approve, reject, or request revision.',
      buyer: invoice.buyer_company || invoice.buyer_name,
      product: invoice.items?.[0]?.product_description
    });
    addAudit('Founder approval requested', 'Founder Review Required', 'Approval request created in Director Command Center.');
    navigate('/export-os/director');
  }

  return (
    <InvoiceSystemShell onBack={onBack} onOpenTasks={onOpenTasks} title="Export Invoice System" subtitle="LUT-first invoice builder with validation, approval routing, and print-ready preview.">
      <InvoiceWorkspaceHeader invoice={invoice} blockers={blockers} canRelease={canRelease} onSaveDraft={() => addAudit('draft saved', 'Draft', 'Invoice draft saved.')} onValidate={validateInvoice} onCfo={() => requestReview('CFO')} onCoo={() => requestReview('COO')} onFounder={routeInvoiceApproval} onDraftPdf={() => addAudit('PDF draft generated', 'PDF Draft Ready', 'Draft PDF preview prepared.')} onEmail={prepareEmail} />
      {blockers.length > 0 && <div className="invoice-blocker-strip"><TriangleAlert size={16} /><strong>Release blocked:</strong><span>{topBlockerSummary}</span></div>}
      <section className="invoice-builder-layout">
        <main className="invoice-edit-stack">
          <InvoiceBackendNotice status={snapshotStatus} loading={snapshotLoading} />
          <InvoiceSetupAccordion title="Invoice Identity" subtitle="Type, numbering, dates, quote and PO references" defaultOpen>
            <DocumentTypeSelector invoice={invoice} updateInvoice={updateInvoice} />
            <InvoiceIdentityPanel invoice={invoice} updateInvoice={updateInvoice} />
          </InvoiceSetupAccordion>
          <InvoiceSetupAccordion title="Company + LUT Snapshot" subtitle="Immutable company vault data used for this draft">
            <CompanyDataInjection snapshot={invoice.company_snapshot} navigate={navigate} />
            <LUTInvoicePanel snapshot={invoice.company_snapshot} navigate={navigate} />
            <TaxExportModePanel invoice={invoice} updateInvoice={updateInvoice} />
          </InvoiceSetupAccordion>
          <InvoiceSetupAccordion title="Buyer / Consignee" subtitle="Buyer, delivery, destination and contact details">
            <BuyerDetailsPanel invoice={invoice} updateInvoice={updateInvoice} />
          </InvoiceSetupAccordion>
          <InvoiceSetupAccordion title="Shipment" subtitle="Incoterm, ports, shipping mode and origin">
            <ShipmentDetailsPanel invoice={invoice} updateInvoice={updateInvoice} />
          </InvoiceSetupAccordion>
          <InvoiceSetupAccordion title="Line Items" subtitle="Product, HSN, packing, quantity, value and IGST 0 under LUT">
            <ProductLineItemsTable invoice={invoice} updateItem={updateItem} />
            <PackingDetailsPanel invoice={invoice} updateInvoice={updateInvoice} />
          </InvoiceSetupAccordion>
          <InvoiceSetupAccordion title="Bank & Payment" subtitle="Masked bank data and payment terms">
            <BankDetailsPanel snapshot={invoice.company_snapshot} />
          </InvoiceSetupAccordion>
          <InvoiceSetupAccordion title="Revision / Cancellation" subtitle="Version and void controls without deleting history">
            <RevisionVoidPanel invoice={invoice} updateInvoice={updateInvoice} />
          </InvoiceSetupAccordion>
        </main>
        <section className="invoice-preview-column">
          <InvoiceDocument invoice={{
            ...invoice,
            line_items: invoice.items?.map((item) => ({
              ...item,
              description: item.description || item.product_description,
              amount: item.amount ?? (Number(item.quantity || 0) * Number(item.unit_price || item.rate || 0)),
              rate: item.rate ?? item.unit_price
            })),
            seller_name: invoice.company_snapshot?.legal_company_name,
            seller_address: invoice.company_snapshot?.registered_address,
            seller_gstin: invoice.company_snapshot?.gstin,
            iec_code: invoice.company_snapshot?.iec,
            bank_name: invoice.company_snapshot?.default_bank_name,
            account_number: invoice.company_snapshot?.default_bank_account_masked,
            buyer_name: invoice.buyer_company || invoice.buyer_name,
            buyer_address: invoice.buyer_address,
            buyer_country: invoice.buyer_country || invoice.destination_country,
            freight_amount: invoice.freight,
            total_amount: calculateInvoiceTotals(invoice).grandTotal,
            terms: invoice.payment_terms || invoice.company_snapshot?.default_payment_terms,
            status: canRelease ? 'Approved' : invoice.status
          }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button className="ghost-button" onClick={() => window.print()}>
              <FileText size={14} />
              Print / Save PDF
            </button>
          </div>
        </section>
        <aside className="invoice-control-stack">
          <ValidationChecklist validation={validation} navigate={navigate} />
          <ApprovalRoutingPanel invoice={invoice} blockers={blockers} navigate={navigate} onValidate={validateInvoice} onCreateApproval={routeInvoiceApproval} />
          <InvoicePDFActions canRelease={canRelease} blockers={blockers} invoice={invoice} onDraft={() => addAudit('PDF draft generated', 'PDF Draft Ready', 'Draft PDF preview prepared.')} onEmail={prepareEmail} />
          <InvoiceEmailDraftPreview invoice={invoice} visible={emailPrepared} />
        </aside>
      </section>
      <section className="invoice-bottom-record">
        <InvoiceAuditTrail audit={audit} />
        <InvoiceRevisionHistory invoice={invoice} />
      </section>
    </InvoiceSystemShell>
  );
}

function InvoiceWorkspaceHeader({ invoice, blockers, canRelease, onSaveDraft, onValidate, onCfo, onCoo, onFounder, onDraftPdf, onEmail }) {
  return (
    <section className="invoice-workspace-header">
      <div>
        <span>Professional Invoice Workspace</span>
        <h2>{invoice.invoice_number || 'Draft invoice'}  -  {invoice.invoice_type}</h2>
        <p>{invoice.export_mode}  -  IGST 0% under LUT  -  {blockers.length ? `${blockers.length} critical blocker(s)` : 'Validation clear'}</p>
      </div>
      <div className="invoice-action-bar">
        <button className="ghost-button" onClick={onSaveDraft}>Save Draft</button>
        <button className="ghost-button" onClick={onValidate}>Validate Invoice</button>
        <button className="ghost-button" onClick={onCfo}>Send to CFO Review</button>
        <button className="ghost-button" onClick={onCoo}>Send to COO Review</button>
        <button className="tactical-button" onClick={onFounder}>Send to Founder Approval</button>
        <button className="ghost-button" onClick={onDraftPdf}>Download Draft PDF</button>
        <button className="ghost-button" disabled={!canRelease}>Generate Final PDF</button>
        <button className="ghost-button" disabled={!canRelease}>Release to Buyer</button>
        <button className="ghost-button" disabled={!canRelease} onClick={onEmail}>Prepare Buyer Email Draft</button>
      </div>
    </section>
  );
}

function InvoiceSetupAccordion({ title, subtitle, children, defaultOpen = false }) {
  return (
    <details className="invoice-setup-accordion" open={defaultOpen}>
      <summary>
        <div><span>{title}</span><strong>{subtitle}</strong></div>
        <ChevronRight size={18} />
      </summary>
      <div className="invoice-accordion-body">{children}</div>
    </details>
  );
}

function InvoiceIdentityPanel({ invoice, updateInvoice }) {
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Invoice Identity</span><h2>Draft metadata</h2></div><FileText size={18} /></div><div className="invoice-field-grid">{[
    ['invoice_number', 'Invoice Number'], ['invoice_date', 'Invoice Date'], ['financial_year', 'Financial Year'], ['quote_reference', 'Quote Reference'], ['buyer_reference', 'Buyer Reference'], ['purchase_order_number', 'Purchase Order Number'], ['validity', 'Validity']
  ].map(([field, label]) => <SecureInput key={field} label={label} value={invoice[field]} onChange={(value) => updateInvoice(field, value)} />)}</div></section>;
}

function InvoiceBackendNotice({ status, loading }) {
  return (
    <section className="invoice-form-panel invoice-backend-notice">
      <div className="approval-section-header">
        <div><span>Company Vault Connection</span><h2>{loading ? 'Injecting snapshot' : status}</h2></div>
        <Database size={18} />
      </div>
      <p>{invoiceBackendStatus.mode === 'Connected' ? 'Invoice data is sourced from Company Master Data Vault and copied into an immutable invoice snapshot.' : 'Connect Supabase to activate - Company data not backend connected. Draft preview remains blocked for release until backend vault data is complete.'}</p>
    </section>
  );
}

function DocumentTypeSelector({ invoice, updateInvoice }) {
  const selected = invoiceDocumentTypes.find((type) => type.name === invoice.invoice_type);
  return (
    <section className="invoice-form-panel">
      <div className="approval-section-header"><div><span>Document Type Selector</span><h2>{invoice.invoice_type}</h2></div><StatusBadge label={selected?.defaultStatus || 'Draft'} state={getApprovalState(selected?.defaultStatus || 'Draft')} /></div>
      <div className="document-selector-grid">
        {invoiceDocumentTypes.map((type) => (
          <button className={invoice.invoice_type === type.name ? 'active' : ''} key={type.id} onClick={() => updateInvoice('invoice_type', type.name)}>
            <strong>{type.name}</strong>
            <span>{type.purpose}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CompanyDataInjection({ snapshot, navigate }) {
  const required = ['legal_company_name', 'registered_address', 'gstin', 'iec', 'pan', 'authorized_signatory', 'lut_arn'];
  const missing = required.filter((key) => !snapshot[key]);
  const status = missing.length ? 'Missing' : snapshot.lut_founder_verified_status !== 'Verified' ? 'Founder Verification Required' : 'Complete';
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Company Data Injection</span><h2>Snapshot from Company Master Data Vault</h2></div><StatusBadge label={status} state={status === 'Complete' ? 'online' : 'attention'} /></div><div className="snapshot-grid">{[
    'legal_company_name',
    'gstin',
    'iec',
    'pan',
    'registered_address',
    'lut_arn',
    'lut_valid_from',
    'lut_valid_to',
    'authorized_signatory',
    'default_currency',
    'default_payment_terms',
    'default_bank_account_masked'
  ].map((key) => <div key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{snapshot[key] || 'Missing'}</strong></div>)}</div><button className="ghost-button" onClick={() => navigate('/export-os/company-master-data')}>Open Company Master Data Vault</button></section>;
}

function LUTInvoicePanel({ snapshot, navigate }) {
  const expired = snapshot.lut_valid_to ? new Date(snapshot.lut_valid_to) < new Date() : false;
  const incomplete = !snapshot.lut_arn || !snapshot.lut_financial_year || !snapshot.lut_valid_from || !snapshot.lut_valid_to;
  const inactive = !['Active', 'Verified'].includes(snapshot.lut_status);
  const notVerified = snapshot.lut_founder_verified_status !== 'Verified';
  const message = incomplete
    ? 'LUT incomplete --ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â invoice release blocked.'
    : expired
      ? 'LUT expired --ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â invoice release blocked.'
      : inactive
        ? 'LUT status needs review --ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â invoice release blocked.'
        : notVerified
          ? 'Founder verification required before invoice release.'
          : 'LUT data available for invoice release validation.';
  const blocked = incomplete || expired || inactive || notVerified;
  const releaseMessage = incomplete
    ? 'LUT incomplete - invoice release blocked.'
    : expired
      ? 'LUT expired - invoice release blocked.'
      : inactive
        ? 'LUT status needs review - invoice release blocked.'
        : notVerified
          ? 'Founder verification required before invoice release.'
          : 'LUT data available for invoice release validation.';
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>LUT Status</span><h2>Export under LUT/Bond without IGST</h2></div><StatusBadge label={blocked ? 'Validation Failed' : 'Validation Passed'} state={blocked ? 'error' : 'online'} /></div><div className="lut-block-message">{releaseMessage}</div><div className="snapshot-grid">{['lut_arn', 'lut_financial_year', 'lut_filing_date', 'lut_valid_from', 'lut_valid_to', 'lut_status', 'lut_founder_verified_status'].map((key) => <div key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{snapshot[key] || 'Missing'}</strong></div>)}</div><div className="vault-form-actions"><button className="tactical-button" onClick={() => navigate('/export-os/company-master-data')}>Complete LUT Details</button><button className="ghost-button" onClick={() => navigate('/export-os/director')}>Request Founder Review</button></div></section>;
}

function BuyerDetailsPanel({ invoice, updateInvoice }) {
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Buyer / Consignee</span><h2>Buyer snapshot</h2></div><UsersRound size={18} /></div><div className="invoice-field-grid">{['buyer_name', 'buyer_company', 'buyer_address', 'buyer_country', 'buyer_email', 'buyer_phone', 'delivery_address', 'destination_country', 'buyer_tax_id_optional'].map((field) => <SecureInput key={field} label={field.replaceAll('_', ' ')} value={invoice[field]} multiline={field.includes('address')} onChange={(value) => updateInvoice(field, value)} />)}</div></section>;
}

function ShipmentDetailsPanel({ invoice, updateInvoice }) {
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Shipment</span><h2>Export movement data</h2></div><Route size={18} /></div><div className="invoice-field-grid">{['incoterm', 'port_of_loading', 'port_of_discharge', 'final_destination', 'shipping_mode', 'country_of_origin', 'dispatch_date', 'shipment_reference_optional'].map((field) => <SecureInput key={field} label={field.replaceAll('_', ' ')} value={invoice[field]} onChange={(value) => updateInvoice(field, value)} />)}</div></section>;
}

function ProductLineItemsTable({ invoice, updateItem }) {
  const item = invoice.items[0];
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Product Line Items</span><h2>Tax defaults to zero under LUT</h2></div><ClipboardList size={18} /></div><div className="invoice-line-grid">{['product_description', 'hsn_code', 'quality_grade', 'packing_type', 'quantity', 'unit', 'unit_price', 'discount'].map((field) => <SecureInput key={field} label={field.replaceAll('_', ' ')} value={String(item[field] ?? '')} onChange={(value) => updateItem(field, value)} />)}<SecureInput label="IGST Rate" value="0" onChange={() => {}} /><SecureInput label="IGST Amount" value="0" onChange={() => {}} /></div></section>;
}

function PackingDetailsPanel({ invoice, updateInvoice }) {
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Packing Details</span><h2>Required for packing list / combo docs</h2></div><PackageCheck size={18} /></div><div className="invoice-field-grid">{['package_count', 'package_type', 'net_weight', 'gross_weight', 'package_dimensions', 'marks_numbers', 'batch_lot', 'container_details', 'shipping_marks'].map((field) => <SecureInput key={field} label={field.replaceAll('_', ' ')} value={invoice[field]} onChange={(value) => updateInvoice(field, value)} />)}</div></section>;
}

function RevisionVoidPanel({ invoice, updateInvoice }) {
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Revision / Void Control</span><h2>History is never deleted</h2></div><TimerReset size={18} /></div><div className="invoice-field-grid">{['revision_number', 'revision_reason', 'revised_by', 'revised_date', 'cancellation_reason', 'cancelled_by', 'cancelled_at'].map((field) => <SecureInput key={field} label={field.replaceAll('_', ' ')} value={invoice[field]} onChange={(value) => updateInvoice(field, value)} />)}</div></section>;
}

function TaxExportModePanel({ invoice, updateInvoice }) {
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Tax / Export Mode</span><h2>LUT mode is default</h2></div><ShieldCheck size={18} /></div><div className="export-mode-box"><strong>{invoice.export_mode}</strong><p>{LUT_EXPORT_ENDORSEMENT}</p></div><div className="invoice-field-grid"><SecureInput label="Freight" value={String(invoice.freight)} onChange={(value) => updateInvoice('freight', value)} /><SecureInput label="Insurance" value={String(invoice.insurance)} onChange={(value) => updateInvoice('insurance', value)} /><SecureInput label="Other Charges" value={String(invoice.other_charges)} onChange={(value) => updateInvoice('other_charges', value)} /><SecureInput label="Founder/Admin/Finance override required for IGST payment mode" value="Locked to LUT/Bond Without IGST" onChange={() => {}} /></div></section>;
}

function BankDetailsPanel({ snapshot }) {
  return <section className="invoice-form-panel"><div className="approval-section-header"><div><span>Bank</span><h2>Masked in draft mode</h2></div><LockKeyhole size={18} /></div><div className="snapshot-grid">{[['Beneficiary Name', snapshot.legal_company_name], ['Bank Name', snapshot.default_bank_name], ['Account Number Masked', snapshot.default_bank_account_masked], ['IFSC', 'Draft only'], ['SWIFT', 'Draft only'], ['Branch', 'Draft only']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
}

function InvoicePreviewA4({ invoice, canRelease }) {
  const totals = calculateInvoiceTotals(invoice);
  const c = invoice.company_snapshot;
  const item = invoice.items[0];
  const title = invoice.invoice_type === 'Export Tax Invoice under LUT' ? 'EXPORT TAX INVOICE UNDER LUT' : invoice.invoice_type.toUpperCase();
  const subtitle = invoice.invoice_type === 'Export Tax Invoice under LUT' ? 'Without Payment of Integrated Tax' : invoice.invoice_type.includes('Packing') ? 'Commercial and packing details for review' : 'Draft document for review';
  const showCommercial = invoice.invoice_type !== 'Packing List';
  const showPacking = invoice.invoice_type.includes('Packing') || invoice.invoice_type === 'Packing List';
  return <div className="invoice-a4"><div className="draft-watermark">{canRelease ? 'APPROVED PREVIEW' : 'DRAFT - NOT FOR RELEASE'}</div><header><div className="invoice-logo">G</div><div><h1>{c.legal_company_name}</h1><p>{c.registered_address}</p><p>GSTIN: {c.gstin} | IEC: {c.iec} | PAN: {c.pan}</p><p>{c.phone} | {c.email} | {c.website}</p></div></header><section className="invoice-title-block"><h2>{title}</h2><p>{subtitle}</p></section><section className="invoice-meta-grid">{[['Invoice No', invoice.invoice_number], ['Invoice Date', invoice.invoice_date], ['Financial Year', invoice.financial_year], ['Export Mode', invoice.export_mode], ['IGST', invoice.export_mode === 'LUT/Bond Without IGST' ? '0%' : `${item.tax_rate || 0}%`], ['PO Ref', invoice.purchase_order_number || 'Draft'], ['Quote Ref', invoice.quote_reference], ['LUT ARN', c.lut_arn || 'Missing'], ['LUT Financial Year', c.lut_financial_year || 'Missing'], ['Revision', invoice.revision_number || 'REV-00']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section><section className="invoice-two-col"><div><h3>Buyer / Consignee</h3><p>{invoice.buyer_name}</p><p>{invoice.buyer_company}</p><p>{invoice.buyer_address}</p><p>{invoice.buyer_country}</p><p>{invoice.buyer_email} {invoice.buyer_phone}</p><p>Delivery: {invoice.delivery_address || 'Draft'}</p><p>Destination: {invoice.destination_country || 'Draft'}</p></div><div><h3>Shipment</h3><p>Incoterm: {invoice.incoterm}</p><p>Port Loading: {invoice.port_of_loading}</p><p>Port Discharge: {invoice.port_of_discharge || 'Draft'}</p><p>Final Destination: {invoice.final_destination || invoice.destination_country || 'Draft'}</p><p>Shipping Mode: {invoice.shipping_mode || 'Draft'}</p><p>Origin: {invoice.country_of_origin}</p></div></section>{showCommercial && <table><thead><tr><th>S.No</th><th>Description</th><th>HSN</th><th>Packing</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Taxable Value</th><th>IGST %</th><th>IGST Amount</th><th>Total</th></tr></thead><tbody><tr><td>1</td><td>{item.product_description}</td><td>{item.hsn_code || 'Pending'}</td><td>{item.packing_type}</td><td>{item.quantity}</td><td>{item.unit}</td><td>{formatMoney(item.unit_price, invoice.currency)}</td><td>{formatMoney(item.quantity * item.unit_price, invoice.currency)}</td><td>0%</td><td>{formatMoney(0, invoice.currency)}</td><td>{formatMoney(item.quantity * item.unit_price, invoice.currency)}</td></tr></tbody></table>}{showPacking && <section className="packing-preview-block"><h3>Packing Details</h3><div className="invoice-meta-grid">{[['Package Count', invoice.package_count || 'Pending'], ['Package Type', invoice.package_type || item.packing_type], ['Net Weight', invoice.net_weight || 'Pending'], ['Gross Weight', invoice.gross_weight || 'Pending'], ['Dimensions', invoice.package_dimensions || 'If available'], ['Marks / Numbers', invoice.marks_numbers || 'If available'], ['Batch / Lot', invoice.batch_lot || 'If available'], ['Container', invoice.container_details || 'If available']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>}{showCommercial && <section className="invoice-total-box"><div><span>Subtotal</span><strong>{formatMoney(totals.subtotal, invoice.currency)}</strong></div><div><span>Freight</span><strong>{formatMoney(invoice.freight, invoice.currency)}</strong></div><div><span>Insurance</span><strong>{formatMoney(invoice.insurance, invoice.currency)}</strong></div><div><span>Other Charges</span><strong>{formatMoney(invoice.other_charges, invoice.currency)}</strong></div><div><span>Grand Total</span><strong>{formatMoney(totals.grandTotal, invoice.currency)}</strong></div><p>Amount in Words: {totals.amountInWords}</p></section>}<section className="invoice-declaration"><h3>Declaration / Export Endorsement</h3><p>{LUT_EXPORT_ENDORSEMENT}</p><p>HSN reviewed: Pending / Origin reviewed: Pending / Founder approval: Required</p></section>{invoice.invoice_type === 'Revised Invoice' && <section className="invoice-declaration"><h3>Revision Control</h3><p>Revision: {invoice.revision_number} | Reason: {invoice.revision_reason || 'Pending'} | Revised by: {invoice.revised_by || 'Pending'} | Date: {invoice.revised_date || 'Pending'}</p></section>}{invoice.invoice_type === 'Cancelled/Void Invoice' && <section className="invoice-declaration"><h3>Cancelled / Void Record</h3><p>Reason: {invoice.cancellation_reason || 'Pending'} | Cancelled by: {invoice.cancelled_by || 'Pending'} | Date/time: {invoice.cancelled_at || 'Pending'}. Invoice history retained.</p></section>}<section className="invoice-two-col"><div><h3>Bank & Payment</h3><p>Beneficiary: {c.legal_company_name}</p><p>Bank: {c.default_bank_name}</p><p>Account: {c.default_bank_account_masked}</p><p>Payment Terms: {invoice.payment_terms || c.default_payment_terms || 'Draft'}</p></div><div><h3>Footer / Authorization</h3><p>Authorized Signatory: {c.authorized_signatory}</p><p>Company Seal Pending</p><p>Draft notice: DRAFT - NOT FOR RELEASE</p></div></section><footer>This is a system-generated draft until founder approval. Do not use for buyer release, customs, banking, or statutory purposes unless approved.</footer></div>;
}

function ValidationChecklist({ validation, navigate }) {
  const failed = validation.filter((check) => check.status === 'Failed');
  const groups = ['Company', 'LUT', 'Buyer', 'Product', 'Export', 'Approval', 'Commercial', 'Bank', 'Packing', 'Release', 'Document Type', 'Invoice', 'System'];
  const grouped = groups.map((group) => [group, validation.filter((check) => check.group === group)]).filter(([, rows]) => rows.length);
  return <section className="invoice-side-panel validation-checklist-panel"><div className="approval-section-header"><div><span>Validation Checklist</span><h2>{failed.length ? `${failed.length} blockers` : 'Validation Passed'}</h2></div><TriangleAlert size={18} /></div><div className="validation-list grouped">{grouped.map(([group, rows]) => <div className="validation-group" key={group}><h3>{group}</h3>{rows.map((check) => <div className={check.status.toLowerCase()} key={check.key}><strong>{check.status === 'Passed' ? 'Done' : 'Blocked'} {check.message}</strong><span>{check.owner}</span>{check.status === 'Failed' && <button onClick={() => navigate(check.group === 'LUT' || check.group === 'Company' ? '/export-os/company-master-data' : check.group === 'Commercial' ? '/export-os/pricing-engine' : '/export-os/director')}>Fix</button>}</div>)}</div>)}</div></section>;
}

function ApprovalRoutingPanel({ invoice, blockers, navigate, onValidate, onCreateApproval }) {
  return <section className="invoice-side-panel"><div className="approval-section-header"><div><span>Approval Routing</span><h2>{invoice.status}</h2></div><Workflow size={18} /></div><div className="approval-memory-list">{['Draft Created', 'Company Data Check', 'LUT Data Check', 'Buyer Data Check', 'Product / HSN Check', 'Pricing / CFO Check', 'COO Operations Check', 'Director Command Center', 'Approved for Release', 'Final PDF Available', 'Buyer Email Draft Prepared'].map((step) => <span key={step}>{step}</span>)}</div><button className="ghost-button" onClick={onValidate}>Run Validation</button><button className="ghost-button" onClick={() => navigate('/export-os/pricing-engine')}>Open Pricing Engine</button><button className="tactical-button" onClick={onCreateApproval}>Request Founder Approval</button>{blockers.length > 0 && <p className="pricing-note">Final release blocked until critical validation failures are fixed.</p>}</section>;
}

function InvoicePDFActions({ canRelease, blockers, invoice, onDraft, onEmail }) {
  const [sendStatus, setSendStatus] = useState(null);

  async function sendToClient() {
    setSendStatus('Sending...');
    try {
      const res = await fetch('/api/lead-email/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      setSendStatus(res.ok ? 'Sent to client.' : `Failed: ${res.status}`);
    } catch (err) {
      setSendStatus(`Error: ${err.message}`);
    }
  }

  return (
    <section className="invoice-side-panel">
      <div className="approval-section-header"><div><span>PDF Actions</span><h2>{canRelease ? 'Final PDF Available' : 'Draft only'}</h2></div><FileText size={18} /></div>
      <button className="ghost-button" onClick={() => { onDraft(); window.print(); }}>Download PDF</button>
      <button className="ghost-button" disabled={!canRelease}>Generate Final PDF</button>
      <button className="ghost-button" disabled={!canRelease} onClick={onEmail}>Prepare Buyer Email</button>
      <button className="ghost-button" disabled={!canRelease} onClick={sendToClient}>Send to Client</button>
      {sendStatus && <small>{sendStatus}</small>}
      {!canRelease && <small>Final PDF and buyer email release are disabled until validation passes and approval status is Approved for Release.</small>}
    </section>
  );
}

function InvoiceEmailDraftPreview({ invoice, visible }) {
  if (!visible) return null;
  return <section className="invoice-side-panel email-draft-preview"><div className="approval-section-header"><div><span>Email Draft Preview</span><h2>No email sent</h2></div><Mail size={18} /></div><strong>Subject: Export Invoice - {invoice.invoice_number} - {invoice.company_snapshot.company_display_name}</strong><p>Dear {invoice.buyer_name},</p><p>Please find the export invoice draft/reference for your review.</p><p>Invoice Number: {invoice.invoice_number}<br />Product: {invoice.items[0].product_description}<br />Quantity: {invoice.items[0].quantity} {invoice.items[0].unit}<br />Destination: {invoice.destination_country}<br />Export Mode: LUT/Bond Without Payment of Integrated Tax</p><p>This document is issued subject to founder approval and final verification.</p><p>Regards,<br />{invoice.company_snapshot.company_display_name}</p></section>;
}

function InvoiceAuditTrail({ audit }) {
  return <section className="invoice-side-panel"><div className="approval-section-header"><div><span>Invoice Audit Trail</span><h2>State history</h2></div><Activity size={18} /></div><div className="approval-audit-list">{audit.map((event) => <div key={event.id}><time>{event.timestamp}</time><strong>{event.action}</strong><span>{event.actor} - {event.previous_status} to {event.new_status}</span><small>{event.notes}</small></div>)}</div></section>;
}

function InvoiceRevisionHistory({ invoice }) {
  const rows = [
    ['Current version', invoice.revision_number || 'REV-00'],
    ['Revision reason', invoice.revision_reason || 'No revision recorded'],
    ['Revised by', invoice.revised_by || 'Pending'],
    ['Revised date', invoice.revised_date || 'Pending'],
    ['Cancellation status', invoice.cancellation_reason ? 'Cancellation metadata present' : 'Not cancelled']
  ];
  return <section className="invoice-side-panel invoice-revision-history"><div className="approval-section-header"><div><span>Revision History</span><h2>Version control</h2></div><TimerReset size={18} /></div><div className="snapshot-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
}

function CfoRecurringPaymentsList({ rows }) {
  const safeRows = safeCfoArray(rows);
  return (
    <section className="pricing-panel cfo-finance-table-panel">
      <div className="approval-section-header"><div><span>Recurring Payments</span><h2>Infrastructure subscriptions and renewal watch</h2></div><TimerReset size={18} /></div>
      {safeRows.length ? (
        <div className="cfo-finance-table" style={{ '--cfo-cols': 5 }}>
          <div className="cfo-finance-table-head">{['Vendor', 'Category', 'Frequency', 'Last Paid', 'Auto Pay'].map((column) => <span key={column}>{column}</span>)}</div>
          {safeRows.map((row, index) => (
            <div key={row.id || row.vendor || `recurring-${index}`}>
              <strong>{row.vendor || row[0] || 'Vendor pending'}</strong>
              <span>{row.category || row[1] || 'Infrastructure'}</span>
              <span>{row.frequency || row[2] || 'Pending'}</span>
              <span>{row.last_paid ? formatLearningDate(row.last_paid) : row[3] || 'Not recorded'}</span>
              <span><StatusBadge label={row.auto_pay ? 'Auto Pay' : 'Manual'} state={row.auto_pay ? 'online' : 'attention'} /></span>
            </div>
          ))}
        </div>
      ) : <CfoEmptyState message="Connect Supabase payments table to see live data" />}
    </section>
  );
}

function SecureInput({ label, value, onChange, multiline = false, masked = false, error, placeholder = 'Draft value' }) {
  const InputTag = multiline ? 'textarea' : 'input';
  return (
    <label className={`secure-master-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      <InputTag
        type={masked ? 'password' : 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <small>{error}</small>}
    </label>
  );
}

function CollapsibleVaultSection({ title, subtitle, icon: Icon = ShieldCheck, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`vault-section ${open ? 'open' : ''}`}>
      <button className="vault-section-toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span><Icon size={18} />{title}</span>
        <small>{subtitle}</small>
        <ChevronRight size={17} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="vault-section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const integrationServicesSeed = [];

const integrationAuditSeed = [];

const integrationModels = ['integration_services', 'integration_audit_logs', 'integration_health'];
const ctoDefaultLoginEmail = 'sukeshreddy4.g@gmail.com';
const CTO_FAST_VERIFICATION_TIMEOUT_MS = 12000;

function maskSecretPreview(value = '') {
  const compact = String(value).trim().replace(/\s+/g, '');
  if (!compact) return '****';
  const prefix = compact.slice(0, Math.min(compact.indexOf('-') > 0 ? compact.indexOf('-') + 1 : 4, 8));
  const suffix = compact.slice(-4).toUpperCase();
  return `${prefix}****${suffix}`;
}

function integrationStatusState(status) {
  if (['Invalid Key', 'Expired', 'Quota Exceeded', 'Failure Detected', 'Error'].includes(status)) return 'error';
  if (['Credits Low', 'Verification Pending', 'Manual Setup Required', 'Backend Verification Required', 'Sync Delayed'].includes(status)) return 'attention';
  if (['Monitoring', 'Disabled', 'Verification Running'].includes(status)) return 'progress';
  return 'online';
}

function usageState(usage) {
  if (usage >= 95) return 'critical';
  if (usage >= 85) return 'risk';
  if (usage >= 70) return 'attention';
  return 'normal';
}


function PaymentVaultPanel() {
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Payment Vault</span><h2>Infrastructure payment evidence</h2></div><FileCheck2 size={18} /></div>
      <div className="payment-vault-list">
        {paymentVaultRecords.map((record) => (
          <article key={record.id}>
            <div><strong>{record.vendor_name}</strong><StatusBadge label={paymentVaultState(record)} state={paymentVaultState(record) === 'Blocked' ? 'error' : paymentVaultState(record) === 'Founder Approval' ? 'attention' : 'progress'} /></div>
            <dl>
              <div><dt>Amount</dt><dd>{record.amount_inr}</dd></div>
              <div><dt>Reason</dt><dd>{record.payment_reason}</dd></div>
              <div><dt>Category</dt><dd>{record.category}</dd></div>
              <div><dt>Approval path</dt><dd>{record.approval_path}</dd></div>
              <div><dt>Receipt / Invoice</dt><dd>{record.receipt_invoice}</dd></div>
              <div><dt>Paid by</dt><dd>{record.paid_by}</dd></div>
              <div><dt>CTO</dt><dd>{record.cto_confirmation}</dd></div>
              <div><dt>COO</dt><dd>{record.coo_confirmation}</dd></div>
              <div><dt>CFO</dt><dd>{record.cfo_confirmation}</dd></div>
              <div><dt>Founder</dt><dd>{record.founder_approval}</dd></div>
              <div><dt>Timestamp</dt><dd>{record.payment_timestamp}</dd></div>
            </dl>
            <small>{record.audit_trail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function paymentVaultState(record) {
  if (record.approval_path.includes('Blocked')) return 'Blocked';
  if (record.founder_approval === 'Required') return 'Founder Approval';
  if (record.amount_inr.includes('1,250')) return 'Controlled';
  return 'Ready';
}

const paymentRecordsSeed = [];

const paymentReceiptsSeed = [];

const vendorTrustSeed = [
  ['OpenAI', 'Trusted Infrastructure', 'Trusted', 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,000', 'Allowed under cap', 'Low', 'Pending', 'Usage-based'],
  ['Supabase', 'Trusted Infrastructure', 'Trusted', 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,500', 'Controlled', 'Medium', 'Pending', 'Monthly'],
  ['Vercel', 'Trusted Infrastructure', 'Trusted', 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,000', 'Allowed under cap', 'Low', 'May 24, 2026', 'Monthly'],
  ['Cloudflare', 'Domain / SSL renewal', 'Review Required', 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,500', 'Founder approval over cap', 'High', 'Pending', 'Annual'],
  ['Unknown SaaS vendor', 'Unknown Vendor', 'Blocked', 'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹0', 'Not allowed', 'Critical', 'Never paid', 'Unknown']
].map(([vendorName, category, trustLevel, monthlyLimit, autoPayEligibility, riskLevel, lastPayment, renewalFrequency], index) => ({ id: `vendor-${index}`, vendorName, category, trustLevel, monthlyLimit, autoPayEligibility, riskLevel, lastPayment, renewalFrequency }));

const paymentForecastSeed = [];

function getDaysRemaining(expiryDate) {
  const target = new Date(expiryDate);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function calculateUsagePercentage(limitUsed = 0, limitTotal = 0) {
  const used = Number(limitUsed) || 0;
  const total = Number(limitTotal) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}

function getRenewalStatus({ expiryDate, limitUsed = 0, limitTotal = 0, usagePercentage } = {}) {
  const daysRemaining = getDaysRemaining(expiryDate);
  const usage = typeof usagePercentage === 'number' ? usagePercentage : calculateUsagePercentage(limitUsed, limitTotal);
  if (daysRemaining !== null && daysRemaining < 0) return 'Expired';
  if (usage >= 100) return 'Limit Exhausted';
  if (daysRemaining !== null && daysRemaining <= 7) return 'Recharge Required Now';
  if ((daysRemaining !== null && daysRemaining <= 15) || usage >= 80) return 'Recharge Soon';
  return 'Healthy';
}

function buildRenewalDashboardItems(payments = paymentRecordsSeed, forecasts = paymentForecastSeed) {
  const paymentByVendor = new Map(payments.map((payment) => [payment.vendor, payment]));
  return forecasts.map((forecast) => {
    const payment = paymentByVendor.get(forecast.vendor) || {};
    const projectedAmount = moneyNumber(forecast.projectedAmount) || payment.amountInr || 0;
    const limitTotal = payment.limit_total || (forecast.vendor === 'Cloudflare' ? 1500 : forecast.vendor === 'Supabase' ? 5000 : forecast.vendor === 'Vercel' ? 3000 : 5000);
    const limitUsed = payment.limit_used ?? Math.min(limitTotal, Math.max(projectedAmount, Math.round(limitTotal * ((payment.usage_percentage || payment.amountInr ? 0 : 0) / 100))));
    const usagePercentage = typeof payment.usage_percentage === 'number' ? payment.usage_percentage : calculateUsagePercentage(limitUsed, limitTotal);
    const status = getRenewalStatus({ expiryDate: forecast.expectedDate, limitUsed, limitTotal, usagePercentage });
    return {
      id: forecast.id,
      name: forecast.vendor,
      serviceName: forecast.title,
      category: payment.category || forecast.forecastType,
      currentStatus: payment.paymentStatus || forecast.status,
      expiryDate: forecast.expectedDate,
      daysRemaining: getDaysRemaining(forecast.expectedDate),
      limitUsed,
      limitTotal,
      usagePercentage,
      rechargeStatus: status,
      priority: status === 'Expired' || status === 'Limit Exhausted' ? 'Critical' : status === 'Recharge Required Now' ? 'High' : status === 'Recharge Soon' ? 'Medium' : 'Low',
      action: status === 'Healthy' ? 'View' : 'Renew Now',
      receiptStatus: payment.receiptStatus || 'Awaiting receipt'
    };
  });
}

const paymentRiskSeed = [
  ['Missing receipt', 'Medium', 'Resend receipt still pending review.', 'CFO Command'],
  ['Founder approval missing', 'High', 'Cloudflare amount exceeds ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,500 cap.', 'Founder'],
  ['Duplicate renewal risk', 'Low', 'No duplicate charge detected; monitor next cycle.', 'CFO Command'],
  ['Failed payment retry', 'Medium', 'WhatsApp API payment processing should be checked after OTP step.', 'CFO Command']
].map(([title, severity, detail, owner], index) => ({ id: `payment-risk-${index}`, title, severity, detail, owner }));

const paymentAuditSeed = [
  ['CTO Command', '09:10', 'payment request created', 'Monitoring', 'OpenAI credit need detected'],
  ['COO Command', '09:18', 'COO operational confirmation', 'Confirmed', 'AI workflows require continuity'],
  ['CFO Command', '09:30', 'CFO validation completed', 'Validated', 'Vendor trusted and amount under cap'],
  ['Gateway', '09:32', 'OTP required', 'OTP Required', 'Founder verification requested externally'],
  ['CFO Command', '09:36', 'OTP submitted', 'Payment Processing', 'OTP value not stored or logged'],
  ['CTO Command', '09:44', 'receipt captured', 'Receipt Pending', 'Receipt pending prepared'],
  ['CFO Command', '09:52', 'Payment Vault updated', 'Monitoring', 'Vault record updated without OTP value']
].map(([actor, timestamp, event, status, notes], index) => ({ id: `payment-audit-${index}`, actor, timestamp, event, status, notes }));

const paymentVaultTabs = ['Overview', 'Payments', 'Billing Methods', 'Renewals', 'Vendors', 'Receipts', 'Audit'];
const paymentProviderConnected = false;

const trustedBillingVendors = ['OpenAI', 'Supabase', 'Vercel', 'Cloudflare', 'Resend', 'WhatsApp API', 'Domain / SSL Provider'];

const billingVendorRuleSeed = [];

const billingAuditSeed = [
  ['billing_method_connected', 'CFO Command', 'Provider returned token metadata only. Raw payment credentials not received by GOPU OS.'],
  ['token_created', 'Payment Gateway', 'Token reference created and stored as masked metadata.'],
  ['vendor_rule_updated', 'CFO Command', 'OpenAI and Supabase trusted vendor rules reviewed.'],
  ['auto_renew_disabled', 'CFO Command', 'Auto-renew disabled for unknown vendor category.'],
  ['otp_challenge_triggered', 'Gateway', 'OTP challenge triggered externally. OTP value was not stored.'],
  ['token_rotated', 'CFO Command', 'Old token reference replaced with a new provider token reference.']
].map(([event_type, actor, safe_notes], index) => ({
  id: `billing-audit-${index}`,
  billing_method_id: 'pay-method-local-token',
  event_type,
  actor,
  safe_notes,
  created_at: `2026-05-26 0${index + 9}:12`
}));

const billingMethodConnectedSeed = [];

function renewalRequestFromPayment(payment = null) {
  if (!payment) return null;
  return {
    id: `renewal-${payment.id}`,
    source: payment.linkedWorkflows?.[0] || 'Director queue',
    vendor: payment.vendor,
    serviceType: payment.renewalType || payment.category,
    renewalReason: payment.reason,
    requiredAmountInr: payment.amountInr,
    currentStatus: payment.paymentStatus,
    approvalStatus: payment.approvalStatus,
    receiptStatus: payment.receiptStatus,
    riskStatus: payment.riskLevel,
    billingOwner: 'Founder Office'
  };
}

function normalizeBillingRule(rule) {
  const limit = rule.per_transaction_limit_inr || rule.vendor_limit_inr || 0;
  return {
    ...rule,
    service_type: rule.service_type || rule.vendor_type || 'Infrastructure',
    per_transaction_limit_inr: limit,
    monthly_limit_inr: rule.monthly_limit_inr || limit * 5,
    max_recharge_amount_inr: rule.max_recharge_amount_inr || Math.max(limit, 1500),
    approval_rule: rule.approval_rule || rule.status || 'Manual review',
    status: rule.status === 'Blocked' ? 'Blocked' : 'Active'
  };
}

function renewalRuleForRequest(request, rules = billingVendorRuleSeed) {
  if (!request) return null;
  return normalizeBillingRule(rules.find((rule) => rule.vendor_name === request.vendor) || {
    vendor_name: request.vendor,
    vendor_type: request.serviceType || 'Unknown',
    auto_renew_allowed: false,
    vendor_limit_inr: 0,
    status: 'Blocked'
  });
}

function isExpiredBillingMethod(method) {
  if (!method) return false;
  const year = Number(method.expiry_year);
  const month = Number(method.expiry_month);
  if (!year || !month) return false;
  const expiryEnd = new Date(year, month, 0, 23, 59, 59);
  return expiryEnd.getTime() < Date.now();
}

function resolveRenewalDecision(request, method, rule) {
  const amount = Number(request.requiredAmountInr) || 0;
  const normalizedRule = normalizeBillingRule(rule);
  if (!method) return { state: 'Blocked', approvalRequirement: 'Connect payment provider', autoRenewEligibility: 'Blocked', otpRequirement: 'Not available', riskStatus: 'Provider not connected' };
  if (method.status !== 'Active' || isExpiredBillingMethod(method)) return { state: 'Blocked', approvalRequirement: 'Replace expired or inactive token', autoRenewEligibility: 'Blocked', otpRequirement: 'Not available', riskStatus: 'Expired token' };
  if (!normalizedRule.auto_renew_allowed || normalizedRule.status === 'Blocked') return { state: 'Blocked', approvalRequirement: 'Director vendor trust review', autoRenewEligibility: 'Blocked', otpRequirement: 'Only after approval', riskStatus: 'Unknown vendor blocked' };
  if (method.risk_status === 'High' || request.riskStatus === 'High') return { state: 'Blocked', approvalRequirement: 'Director risk review', autoRenewEligibility: 'Blocked', otpRequirement: 'Only after approval', riskStatus: 'High-risk vendor blocked' };
  if (amount <= 1000 && amount <= method.transaction_limit_inr && amount <= normalizedRule.per_transaction_limit_inr) return { state: 'Auto-Renew Ready', approvalRequirement: 'Auto-renew allowed under INR 1,000', autoRenewEligibility: 'Eligible', otpRequirement: 'Only if provider challenges', riskStatus: 'Low' };
  if (amount <= 1500) return { state: 'Approval Required', approvalRequirement: 'CFO + COO confirmation required', autoRenewEligibility: 'Conditional', otpRequirement: 'May be required by provider', riskStatus: 'Controlled' };
  return { state: 'Director Review', approvalRequirement: 'Director review required above INR 1,500', autoRenewEligibility: 'Manual only', otpRequirement: 'Required if provider challenges', riskStatus: 'High' };
}

function safeRenewalAuditNote(request, method, decision, receiptStatus = 'Receipt Pending') {
  if (!request || !decision) return 'No renewal request selected. No card number, CVV, OTP value, or banking password stored.';
  return `${request.vendor} / ${formatInr(request.requiredAmountInr)} / ${decision.approvalRequirement} / token ${method?.payment_token_reference || 'not connected'} / OTP ${decision.otpRequirement} / receipt ${receiptStatus}. No card number, CVV, OTP value, or banking password stored.`;
}

function PaymentVaultDashboard({ navigate, onBack, view = 'payment-vault', paymentId }) {
  const [payments, setPayments] = useState(paymentRecordsSeed);
  const [renewalForecasts, setRenewalForecasts] = useState(paymentForecastSeed);
  const [receipts, setReceipts] = useState(paymentReceiptsSeed);
  const [billingMethods, setBillingMethods] = useState(() => paymentProviderConnected ? billingMethodConnectedSeed : []);
  const [billingVendorRules, setBillingVendorRules] = useState(billingVendorRuleSeed);
  const [billingAudit, setBillingAudit] = useState(billingAuditSeed);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedBillingId, setSelectedBillingId] = useState(() => billingMethodConnectedSeed[0]?.id || '');
  const [selectedId, setSelectedId] = useState(paymentId || null);
  const [expandedForecast, setExpandedForecast] = useState(null);
  const [selectedRenewalRequest, setSelectedRenewalRequest] = useState(null);
  const [auditFilter, setAuditFilter] = useState('All');
  const [activeTab, setActiveTab] = useState(() => {
    if (view === 'payments' || view === 'detail') return 'Payments';
    if (view === 'payment-audit') return 'Audit';
    return 'Overview';
  });
  const selectedPayment = payments.find((payment) => payment.id === selectedId) || null;
  const selectedBillingMethod = billingMethods.find((method) => method.id === selectedBillingId) || billingMethods[0] || null;
  const selectedRenewalRule = renewalRuleForRequest(selectedRenewalRequest, billingVendorRules);
  const selectedRenewalDecision = resolveRenewalDecision(selectedRenewalRequest, selectedBillingMethod, selectedRenewalRule);
  const filteredAudit = auditFilter === 'All' ? paymentAuditSeed : paymentAuditSeed.filter((item) => item.status === auditFilter || item.actor === auditFilter);

  useEffect(() => {
    let active = true;
    async function loadLiveRenewals() {
      const result = await getPaymentVaultRenewals(demoTenantId);
      if (!active || !result.ok || !result.data?.payments?.length) return;
      setPayments(result.data.payments);
      setRenewalForecasts(result.data.forecasts);
      setSelectedId((current) => result.data.payments.some((payment) => payment.id === current) ? current : result.data.payments[0].id);
      setSelectedRenewalRequest(renewalRequestFromPayment(result.data.payments[0]));
    }
    loadLiveRenewals();
    return () => { active = false; };
  }, []);

  function openPayment(id) {
    setSelectedId(id);
    navigate(`/export-os/payments/${id}`);
  }

  function markReceiptReviewed(receiptId) {
    const receipt = receipts.find((item) => item.id === receiptId);
    setReceipts((current) => current.map((item) => item.id === receiptId ? { ...item, vaultStatus: 'Reviewed' } : item));
    if (receipt) {
      void sendSlackNotification({
        type: 'Payment Received',
        priority: 'INFO',
        reference: receipt.linkedPayment || receipt.id,
        buyer: receipt.vendor,
        status: 'Receipt Reviewed',
        eta: receipt.date,
        actionRequired: 'CFO receipt review completed. Keep tokenized payment audit trail updated.',
        source: 'Payment Vault'
      });
    }
  }

  function uploadReceiptLocal(paymentIdToUpdate) {
    if (!selectedPayment) return;
    setPayments((current) => current.map((payment) => payment.id === paymentIdToUpdate ? { ...payment, receiptStatus: 'Receipt Pending' } : payment));
    setReceipts((current) => [{
      id: `receipt-${Date.now()}`,
      vendor: selectedPayment?.vendor,
      documentType: 'Uploaded receipt local',
      date: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      amount: formatInr(selectedPayment?.amountInr),
      linkedPayment: selectedPayment?.id,
      uploadedBy: 'CTO Command',
      vaultStatus: 'Pending Review'
    }, ...current]);
  }

  function connectBillingMethodLocal(metadata = {}) {
    if (!selectedRenewalRequest) return;
    const amountInr = moneyNumber(metadata.amountInr) || 1000;
    const vendorName = metadata.vendorName || selectedRenewalRequest.vendor;
    const tokenizedMethod = {
      ...(billingMethodConnectedSeed[0] || {}),
      id: `pay-method-${Date.now()}`,
      payment_token_reference: `pay_tok_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      provider: metadata.bankName || billingMethodConnectedSeed[0]?.provider || '',
      masked_reference: metadata.maskedReference || billingMethodConnectedSeed[0]?.masked_reference || '',
      billing_owner: metadata.cardName || 'Founder Office',
      expiry_month: metadata.expiryMonth || billingMethodConnectedSeed[0]?.expiry_month || '',
      expiry_year: metadata.expiryYear || billingMethodConnectedSeed[0]?.expiry_year || '',
      monthly_limit_inr: amountInr,
      transaction_limit_inr: amountInr,
      auto_renew_enabled: Boolean(metadata.autoRenewAllowed),
      linked_vendors: [vendorName],
      created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    };
    setBillingMethods((current) => [tokenizedMethod, ...current]);
    setSelectedBillingId(tokenizedMethod.id);
    setBillingVendorRules((current) => current.map((rule) => rule.vendor_name === vendorName ? {
      ...rule,
      auto_renew_allowed: Boolean(metadata.autoRenewAllowed),
      vendor_limit_inr: moneyNumber(metadata.perRenewalLimitInr) || amountInr,
      per_transaction_limit_inr: moneyNumber(metadata.perRenewalLimitInr) || amountInr,
      monthly_limit_inr: moneyNumber(metadata.monthlyVendorLimitInr) || amountInr,
      max_recharge_amount_inr: moneyNumber(metadata.maxRechargeAmountInr) || amountInr,
      approval_rule: metadata.approvalRequirement || rule.approval_rule || rule.status,
      status: 'Active'
    } : rule));
    setBillingAudit((current) => [
      {
        id: `billing-audit-${Date.now()}`,
        billing_method_id: tokenizedMethod.id,
        event_type: 'renewal_payment_method_saved',
        actor: 'Payment Provider',
        safe_notes: safeRenewalAuditNote(selectedRenewalRequest, tokenizedMethod, selectedRenewalDecision, selectedRenewalRequest.receiptStatus),
        created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      },
      ...current
    ]);
    setConnectModalOpen(false);
  }

  function openRenewalRequest(payment = selectedPayment) {
    if (!payment) return;
    setSelectedRenewalRequest(renewalRequestFromPayment(payment));
    setConnectModalOpen(true);
  }

  function addRenewalAudit(eventType, actor = 'Payment Vault') {
    if (!selectedRenewalRequest || !selectedRenewalDecision) return;
    setBillingAudit((current) => [{
      id: `billing-audit-${Date.now()}`,
      billing_method_id: selectedBillingMethod?.id || 'payment-provider-pending',
      event_type: eventType,
      actor,
      safe_notes: safeRenewalAuditNote(selectedRenewalRequest, selectedBillingMethod, selectedRenewalDecision, selectedRenewalRequest.receiptStatus),
      created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    }, ...current]);
  }

  function saveRenewalRule(metadata = {}) {
    if (!selectedRenewalRequest) return;
    const vendorName = metadata.vendorName || selectedRenewalRequest.vendor;
    setBillingVendorRules((current) => current.map((rule) => rule.vendor_name === vendorName ? {
      ...rule,
      auto_renew_allowed: Boolean(metadata.autoRenewAllowed),
      vendor_limit_inr: moneyNumber(metadata.perRenewalLimitInr) || rule.vendor_limit_inr,
      per_transaction_limit_inr: moneyNumber(metadata.perRenewalLimitInr) || rule.per_transaction_limit_inr || rule.vendor_limit_inr,
      monthly_limit_inr: moneyNumber(metadata.monthlyVendorLimitInr) || rule.monthly_limit_inr,
      max_recharge_amount_inr: moneyNumber(metadata.maxRechargeAmountInr) || rule.max_recharge_amount_inr,
      approval_rule: metadata.approvalRequirement || rule.approval_rule || rule.status,
      status: rule.status === 'Blocked' && metadata.autoRenewAllowed ? 'Active' : rule.status
    } : rule));
    addRenewalAudit('renewal_rule_saved', 'CFO Command');
  }

  return (
    <ExportOSShell className="payment-vault-shell">
      <header className="deck-header payment-vault-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{view === 'detail' ? 'Payment Detail' : view === 'payment-audit' ? 'Payment Audit' : 'Payment Vault'}</h1>
          <p>Financial Audit Center for infrastructure payments, renewals, receipts, vendor trust, OTP challenge events, and CFO-controlled audit trails.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={paymentProviderConnected || billingMethods.length ? 'Live tokenized billing enabled' : 'Payment provider not connected'} state={paymentProviderConnected || billingMethods.length ? 'progress' : 'attention'} />
          <StatusBadge label={`${billingMethods.length} tokenized methods`} state="progress" />
          <div className="coo-status"><CircleDollarSign size={16} /><strong>{formatInr(payments.reduce((sum, item) => sum + item.amountInr, 0))} monthly view</strong></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <main className="payment-vault-layout">
        <section className="payment-security-notice">
          <LockKeyhole size={18} />
          <strong>GOPU OS stores only tokenized payment references.</strong>
          <span>Raw card numbers, CVV, OTPs, API keys, banking passwords, and banking credentials are never stored or displayed.</span>
          <button className="tactical-button" onClick={() => openRenewalRequest(selectedPayment)} disabled={!selectedPayment}>Renewal Payment Method</button>
        </section>
        <nav className="payment-vault-tabs" aria-label="Payment Vault sections">
          {paymentVaultTabs.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
        </nav>
        <PaymentVaultWorkspace
          tab={activeTab}
          payments={payments}
          forecasts={renewalForecasts}
          receipts={receipts}
          billingMethods={billingMethods}
          billingVendorRules={billingVendorRules}
          billingAudit={billingAudit}
          selectedBillingMethod={selectedBillingMethod}
          paymentProviderConnected={paymentProviderConnected || billingMethods.length > 0}
          selectedPayment={selectedPayment}
          filteredAudit={filteredAudit}
          auditFilter={auditFilter}
          expandedForecast={expandedForecast}
          onOpenPayment={openPayment}
          onUploadReceipt={() => uploadReceiptLocal(selectedPayment?.id)}
          onMarkReceiptReviewed={markReceiptReviewed}
          onOpenBillingMethod={setSelectedBillingId}
          onConnectBillingMethod={() => openRenewalRequest(selectedPayment)}
          onOpenRenewalRequest={openRenewalRequest}
          selectedRenewalRequest={selectedRenewalRequest}
          selectedRenewalDecision={selectedRenewalDecision}
          selectedRenewalRule={selectedRenewalRule}
          onAuditFilter={setAuditFilter}
          onToggleForecast={setExpandedForecast}
        />
      </main>
      {connectModalOpen && (
        <ConnectBillingMethodModal
          request={selectedRenewalRequest}
          billingMethod={selectedBillingMethod}
          vendorRule={selectedRenewalRule}
          decision={selectedRenewalDecision}
          providerConnected={paymentProviderConnected || billingMethods.length > 0}
          onCancel={() => setConnectModalOpen(false)}
          onTokenize={connectBillingMethodLocal}
          onUseTokenizedCard={() => { addRenewalAudit('tokenized_card_used', 'Payment Vault'); setConnectModalOpen(false); }}
          onRequestApproval={() => addRenewalAudit('renewal_approval_requested', 'CFO Command')}
          onMarkOtpRequired={() => addRenewalAudit('otp_required_marked', 'Payment Provider')}
          onSaveRule={saveRenewalRule}
        />
      )}
    </ExportOSShell>
  );
}

function PaymentVaultWorkspace({ tab, payments, forecasts = paymentForecastSeed, receipts, billingMethods, billingVendorRules, billingAudit, selectedBillingMethod, paymentProviderConnected, selectedPayment, filteredAudit, auditFilter, expandedForecast, onOpenPayment, onUploadReceipt, onMarkReceiptReviewed, onOpenBillingMethod, onConnectBillingMethod, onOpenRenewalRequest, selectedRenewalRequest, selectedRenewalDecision, selectedRenewalRule, onAuditFilter, onToggleForecast }) {
  const selectedPaymentId = selectedPayment?.id || null;
  if (tab === 'Payments') {
    return (
      <section className="payment-vault-workspace payment-vault-workspace-two">
        <PaymentRecordsTable payments={payments} selectedId={selectedPaymentId} onOpen={onOpenPayment} onOpenRenewal={(payment) => onOpenRenewalRequest(payment)} />
        <PaymentDetailPanel payment={selectedPayment} onUploadReceipt={onUploadReceipt} />
        <PaymentRiskPanel risks={paymentRiskSeed} />
      </section>
    );
  }
  if (tab === 'Billing Methods') {
    return (
      <section className="payment-vault-workspace payment-vault-workspace-two secure-billing-workspace">
        <RenewalPaymentRequestCard request={selectedRenewalRequest} method={selectedBillingMethod} rule={selectedRenewalRule} decision={selectedRenewalDecision} onOpen={() => onOpenRenewalRequest(selectedPayment)} />
        <BillingMethodsPanel methods={billingMethods} selectedMethod={selectedBillingMethod} providerConnected={paymentProviderConnected} onOpen={onOpenBillingMethod} onConnect={onConnectBillingMethod} />
        <BillingMethodDetailPanel method={selectedBillingMethod} vendorRules={billingVendorRules} audit={billingAudit} />
        <BillingSecurityRulesPanel rules={billingVendorRules} />
      </section>
    );
  }
  if (tab === 'Vendors') {
    return <section className="payment-vault-workspace payment-vault-workspace-two"><VendorTrustRegistry vendors={vendorTrustSeed} /><PaymentRiskPanel risks={paymentRiskSeed} /></section>;
  }
  if (tab === 'Receipts') {
    return <section className="payment-vault-workspace"><ReceiptRepository receipts={receipts} onMarkReviewed={onMarkReceiptReviewed} /></section>;
  }
  if (tab === 'Audit') {
    return <section className="payment-vault-workspace"><PaymentAuditTimeline audit={filteredAudit} filter={auditFilter} onFilter={onAuditFilter} /><BillingAuditPanel audit={billingAudit} /><OTPChallengeLog /><FinancialMemoryLayer /></section>;
  }
  if (tab === 'Renewals') {
    return (
      <section className="payment-vault-workspace">
        <RenewalsLimitsDashboard
          payments={payments}
          forecasts={forecasts}
          onView={(item) => onOpenPayment(payments.find((payment) => payment.vendor === item.name)?.id || selectedPaymentId)}
          onRenewNow={(item) => onOpenRenewalRequest(payments.find((payment) => payment.vendor === item.name) || selectedPayment)}
          onMarkPaid={() => {}}
        />
      </section>
    );
  }
  return (
    <section className="payment-vault-workspace payment-vault-workspace-three">
      <PaymentSummaryCards payments={payments} receipts={receipts} />
      <BillingVaultOverview billingMethods={billingMethods} providerConnected={paymentProviderConnected} rules={billingVendorRules} onConnect={onConnectBillingMethod} />
      <RenewalPaymentRequestCard request={selectedRenewalRequest} method={selectedBillingMethod} rule={selectedRenewalRule} decision={selectedRenewalDecision} onOpen={() => onOpenRenewalRequest(selectedPayment)} />
      <PaymentRecordsTable payments={payments} selectedId={selectedPaymentId} onOpen={onOpenPayment} onOpenRenewal={(payment) => onOpenRenewalRequest(payment)} />
      <VendorTrustRegistry vendors={vendorTrustSeed} />
      <RenewalForecastPanel forecasts={forecasts} expanded={expandedForecast} onToggle={onToggleForecast} />
      <PaymentRiskPanel risks={paymentRiskSeed} />
      <PaymentGovernancePanel compact />
    </section>
  );
}

function RenewalPaymentRequestCard({ request, method, rule, decision, onOpen }) {
  const normalizedRule = normalizeBillingRule(rule);
  return (
    <section className="payment-vault-panel renewal-request-card">
      <div className="approval-section-header">
        <div><span>Renewal Request</span><h2>{request.vendor} {request.serviceType} Required</h2></div>
        <CircleDollarSign size={18} />
      </div>
      <div className="renewal-request-grid">
        <div><span>Vendor</span><strong>{request.vendor}</strong><small>{request.source}</small></div>
        <div><span>Reason</span><strong>{request.renewalReason}</strong><small>{request.currentStatus}</small></div>
        <div><span>Required amount</span><strong>{formatInr(request.requiredAmountInr)}</strong><small>Limit {formatInr(normalizedRule.per_transaction_limit_inr)}</small></div>
        <div><span>Billing token</span><strong>{method?.payment_token_reference || 'Payment provider not connected'}</strong><small>{method?.masked_reference || 'Connect provider to tokenize card'}</small></div>
        <div><span>Approval</span><strong>{decision.approvalRequirement}</strong><small>{decision.autoRenewEligibility}</small></div>
        <div><span>Receipt status</span><strong>{request.receiptStatus}</strong><small>{decision.riskStatus}</small></div>
      </div>
      <div className="payment-action-row">
        <button className="tactical-button" onClick={onOpen}>Open Renewal Payment Method</button>
      </div>
    </section>
  );
}

function BillingVaultOverview({ billingMethods, providerConnected, rules = billingVendorRuleSeed, onConnect }) {
  const activeMethods = billingMethods.filter((method) => method.status === 'Active').length;
  return (
    <section className="payment-vault-panel secure-vault-overview">
      <div className="approval-section-header"><div><span>Billing Security</span><h2>{providerConnected ? 'Live tokenized billing enabled' : 'Payment provider not connected'}</h2></div><ShieldCheck size={18} /></div>
      <div className="secure-billing-kpis">
        <article><span>Tokenized methods</span><strong>{billingMethods.length}</strong><small>No raw card details stored.</small></article>
        <article><span>Active methods</span><strong>{activeMethods}</strong><small>Provider token metadata only.</small></article>
        <article><span>Auto-renew scope</span><strong>Trusted infra only</strong><small>Unknown/high-risk vendors blocked.</small></article>
        <article><span>OTP policy</span><strong>Never stored</strong><small>Audit records event only.</small></article>
      </div>
      <p>Renewal requests now supply the vendor automatically. GOPU OS uses saved token references only when limits, approval rules, risk status, and OTP policy allow it.</p>
      <RenewalRuleTable rules={rules} />
      <button className="tactical-button" onClick={onConnect}>Renewal Payment Method</button>
    </section>
  );
}

function BillingMethodsPanel({ methods, selectedMethod, providerConnected, onOpen, onConnect }) {
  return (
    <section className="payment-vault-panel secure-billing-methods-panel">
      <div className="approval-section-header"><div><span>Billing Methods</span><h2>Tokenized payment references</h2></div><KeyRound size={18} /></div>
      <p className="secure-copy">{providerConnected ? 'Tokenized billing enabled. Only safe token metadata is visible.' : 'Payment provider not connected. No saved billing method is displayed until a gateway returns token metadata.'}</p>
      <button className="tactical-button" onClick={onConnect}>{providerConnected ? 'Renewal Payment Method' : 'Connect Payment Provider'}</button>
      <div className="billing-method-table" role="table" aria-label="Tokenized billing methods">
        <div className="billing-method-head" role="row">
          {['Payment Token', 'Provider', 'Masked Reference', 'Owner', 'Expiry', 'Status', 'Auto-Renew', 'Monthly Limit', 'Txn Limit', 'Linked Vendors', 'Last Used', 'Risk'].map((header) => <span key={header}>{header}</span>)}
        </div>
        {methods.length === 0 ? (
          <div className="billing-empty-state">
            <LockKeyhole size={20} />
            <strong>No tokenized billing method connected</strong>
            <span>Use Connect Payment Provider. Card entry must happen inside the payment provider secure form, not inside GOPU OS.</span>
          </div>
        ) : methods.map((method) => (
          <button key={method.id} className={`billing-method-row ${selectedMethod?.id === method.id ? 'selected' : ''}`} onClick={() => onOpen(method.id)} role="row">
            <span>{method.payment_token_reference}</span>
            <span>{method.provider}</span>
            <span>{method.masked_reference}</span>
            <span>{method.billing_owner}</span>
            <span>{method.expiry_month}/{method.expiry_year}</span>
            <span>{method.status}</span>
            <span>{method.auto_renew_enabled ? 'Allowed by rule' : 'Disabled'}</span>
            <span>{formatInr(method.monthly_limit_inr)}</span>
            <span>{formatInr(method.transaction_limit_inr)}</span>
            <span>{method.linked_vendors.join(', ')}</span>
            <span>{method.last_used}</span>
            <span>{method.risk_status}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BillingMethodDetailPanel({ method, vendorRules, audit }) {
  const [actionNotice, setActionNotice] = useState('');
  if (!method) {
    return (
      <section className="payment-vault-panel billing-detail-panel">
        <div className="approval-section-header"><div><span>Billing Method Detail</span><h2>No method connected</h2></div><LockKeyhole size={18} /></div>
        <p>Connect a billing method through the payment provider. GOPU OS will store token metadata only.</p>
      </section>
    );
  }
  const linkedRules = vendorRules.filter((rule) => rule.billing_method_id === method.id || rule.billing_method_id === 'pay-method-local-token');
  const linkedAudit = audit.filter((event) => event.billing_method_id === method.id || event.billing_method_id === 'pay-method-local-token').slice(0, 6);
  return (
    <section className="payment-vault-panel billing-detail-panel">
      <div className="approval-section-header"><div><span>Billing Method Detail</span><h2>{method.masked_reference}</h2></div><Fingerprint size={18} /></div>
      <div className="billing-detail-grid">
        {[
          ['Token reference', method.payment_token_reference],
          ['Provider', method.provider],
          ['Masked card', method.masked_reference],
          ['Expiry', `${method.expiry_month}/${method.expiry_year}`],
          ['Billing owner', method.billing_owner],
          ['Status', method.status],
          ['Monthly limit', formatInr(method.monthly_limit_inr)],
          ['Transaction limit', formatInr(method.transaction_limit_inr)],
          ['Auto-renew rule', method.auto_renew_enabled ? 'Allowed only for trusted vendors within limits' : 'Disabled'],
          ['Allowed vendors', method.linked_vendors.join(', ')],
          ['Last used', method.last_used],
          ['Risk status', method.risk_status]
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="billing-action-row">
        {['Edit Limits', 'Freeze Method', 'Disable Auto-Renew', 'Restrict Vendor', 'View Audit', 'Rotate Token', 'Remove Method'].map((action) => <button key={action} onClick={() => setActionNotice(`${action} action prepared for ${method.payment_token_reference}. No raw card or OTP data exposed.`)}>{action}</button>)}
      </div>
      {actionNotice && <div className="billing-action-notice">{actionNotice}</div>}
      <div className="billing-linked-grid">
        <div>
          <strong>Vendor rules</strong>
          {linkedRules.map((rule) => {
            const normalizedRule = normalizeBillingRule(rule);
            return <span key={rule.id}>{normalizedRule.vendor_name}: {normalizedRule.approval_rule} / per renewal {formatInr(normalizedRule.per_transaction_limit_inr)} / monthly {formatInr(normalizedRule.monthly_limit_inr)}</span>;
          })}
        </div>
        <div>
          <strong>Audit history</strong>
          {linkedAudit.map((event) => <span key={event.id}>{event.event_type} / {event.actor} / {event.safe_notes}</span>)}
        </div>
      </div>
    </section>
  );
}

function RenewalRuleTable({ rules }) {
  return (
    <div className="renewal-rule-table" role="table" aria-label="Renewal payment rules">
      <div className="renewal-rule-head" role="row">
        {['Vendor', 'Service', 'Auto-Renew', 'Per Transaction Limit', 'Monthly Limit', 'Approval Rule', 'Status'].map((header) => <span key={header}>{header}</span>)}
      </div>
      {rules.map((rule) => {
        const normalizedRule = normalizeBillingRule(rule);
        return (
          <div className="renewal-rule-row" role="row" key={rule.id}>
            <strong>{normalizedRule.vendor_name}</strong>
            <span>{normalizedRule.service_type}</span>
            <span>{normalizedRule.auto_renew_allowed ? 'Yes' : 'No'}</span>
            <span>{formatInr(normalizedRule.per_transaction_limit_inr)}</span>
            <span>{formatInr(normalizedRule.monthly_limit_inr)}</span>
            <span>{normalizedRule.approval_rule}</span>
            <StatusBadge label={normalizedRule.status} state={normalizedRule.status === 'Blocked' ? 'error' : 'progress'} />
          </div>
        );
      })}
    </div>
  );
}

function BillingSecurityRulesPanel({ rules = billingVendorRuleSeed }) {
  return (
    <section className="payment-vault-panel billing-rules-panel">
      <div className="approval-section-header"><div><span>Auto-Renew Security Rules</span><h2>Limits and OTP policy</h2></div><ShieldCheck size={18} /></div>
      <div className="billing-rule-list">
        <span>Up to ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,000: safe auto-renew allowed only for trusted infrastructure vendors with approved token and no risk flag.</span>
        <span>ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,001-ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,500: CFO + COO confirmation required.</span>
        <span>&gt; ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹1,500: Director review required.</span>
        <span>Unknown vendor or high-risk vendor: blocked.</span>
        <span>OTP is entered once, submitted to provider, then cleared immediately. Audit never records OTP value.</span>
      </div>
      <RenewalRuleTable rules={rules} />
      <div className="trusted-vendor-strip">{trustedBillingVendors.map((vendor) => <span key={vendor}>{vendor}</span>)}</div>
    </section>
  );
}

function BillingAuditPanel({ audit }) {
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Billing Audit Log</span><h2>Safe events only</h2></div><Activity size={18} /></div>
      <div className="billing-audit-list">
        {audit.map((event) => <article key={event.id}><time>{event.created_at}</time><strong>{event.event_type}</strong><span>{event.actor}</span><small>{event.safe_notes}</small></article>)}
      </div>
      <p className="secure-copy">Audit excludes full card number, CVV, OTP value, raw token secret, API keys, and banking credentials.</p>
    </section>
  );
}

function ConnectBillingMethodModal({ request = renewalRequestFromPayment(), billingMethod = null, vendorRule = renewalRuleForRequest(request), decision = resolveRenewalDecision(request, billingMethod, vendorRule), providerConnected = false, onCancel, onTokenize, onUseTokenizedCard = () => {}, onRequestApproval = () => {}, onMarkOtpRequired = () => {}, onSaveRule = () => {} }) {
  const normalizedRule = normalizeBillingRule(vendorRule);
  const [perRenewalLimitInr, setPerRenewalLimitInr] = useState(String(normalizedRule.per_transaction_limit_inr || 1000));
  const [monthlyVendorLimitInr, setMonthlyVendorLimitInr] = useState(String(normalizedRule.monthly_limit_inr || 5000));
  const [maxRechargeAmountInr, setMaxRechargeAmountInr] = useState(String(normalizedRule.max_recharge_amount_inr || 1500));
  const [autoRenewAllowed, setAutoRenewAllowed] = useState(Boolean(normalizedRule.auto_renew_allowed));
  const approvedLimit = Math.min(moneyNumber(perRenewalLimitInr) || 0, moneyNumber(maxRechargeAmountInr) || 0);
  const canUseToken = providerConnected && billingMethod && decision.state !== 'Blocked';
  const rulePayload = {
    vendorName: request.vendor,
    amountInr: approvedLimit || request.requiredAmountInr,
    perRenewalLimitInr,
    monthlyVendorLimitInr,
    maxRechargeAmountInr,
    autoRenewAllowed,
    approvalRequirement: decision.approvalRequirement,
    cardName: billingMethod?.billing_owner || request.billingOwner || 'Founder Office',
    bankName: billingMethod?.provider || billingMethodConnectedSeed[0]?.provider || '',
    maskedReference: billingMethod?.masked_reference || billingMethodConnectedSeed[0]?.masked_reference || '',
    expiryMonth: billingMethod?.expiry_month || billingMethodConnectedSeed[0]?.expiry_month || '',
    expiryYear: billingMethod?.expiry_year || billingMethodConnectedSeed[0]?.expiry_year || ''
  };

  return (
    <div className="article-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="connect-billing-title">
      <div className="article-modal connect-billing-modal renewal-payment-modal">
        <button className="login-back" onClick={onCancel}>Cancel</button>
        <span className="selected-os-badge">Secure Renewal Control</span>
        <h2 id="connect-billing-title">Renewal Payment Method</h2>
        <p>The renewal request supplies the vendor. GOPU OS stores only token references, masked metadata, limits, approval path, OTP requirement, receipt status, and audit events.</p>
        <div className="renewal-modal-grid">
          {[
            ['Vendor', request.vendor],
            ['Service Type', request.serviceType],
            ['Renewal Reason', request.renewalReason],
            ['Required Amount', formatInr(request.requiredAmountInr)],
            ['Approved Limit', approvedLimit ? formatInr(approvedLimit) : 'Set limit'],
            ['Billing Token', billingMethod?.payment_token_reference || 'Payment provider not connected'],
            ['Billing Owner', billingMethod?.billing_owner || request.billingOwner],
            ['Auto-Renew Eligibility', decision.autoRenewEligibility],
            ['Approval Requirement', decision.approvalRequirement],
            ['OTP Requirement', decision.otpRequirement],
            ['Receipt Status', request.receiptStatus],
            ['Risk Status', decision.riskStatus]
          ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        <div className="connect-billing-fields renewal-rule-fields">
          <label>
            <span>Linked Vendor</span>
            <input value={`${request.vendor} - ${request.renewalReason}`} readOnly />
            <small>Auto-filled from renewal/payment request.</small>
          </label>
          <label><span>Per-Renewal Limit</span><input inputMode="numeric" value={perRenewalLimitInr} onChange={(event) => setPerRenewalLimitInr(event.target.value.replace(/[^\d.]/g, ''))} /></label>
          <label><span>Monthly Vendor Limit</span><input inputMode="numeric" value={monthlyVendorLimitInr} onChange={(event) => setMonthlyVendorLimitInr(event.target.value.replace(/[^\d.]/g, ''))} /></label>
          <label><span>Maximum Recharge Amount</span><input inputMode="numeric" value={maxRechargeAmountInr} onChange={(event) => setMaxRechargeAmountInr(event.target.value.replace(/[^\d.]/g, ''))} /></label>
          <label className="renewal-toggle-field"><span>Auto-Renew Allowed</span><button type="button" className={autoRenewAllowed ? 'active' : ''} onClick={() => setAutoRenewAllowed((current) => !current)}>{autoRenewAllowed ? 'Yes' : 'No'}</button></label>
        </div>
        <div className="secure-provider-frame compact">
          <LockKeyhole size={18} />
          <strong>{providerConnected ? 'Tokenized billing enabled.' : 'Payment provider not connected.'}</strong>
          <span>{providerConnected ? 'The saved tokenized card can be used only when the renewal rule and approval path allow it.' : 'Connect Payment Provider before tokenized renewals can execute.'}</span>
        </div>
        <div className="approval-confirm-actions renewal-action-grid">
          {!providerConnected && <button className="tactical-button" onClick={() => onTokenize(rulePayload)}>Connect Payment Provider</button>}
          <button className="tactical-button" disabled={!canUseToken} onClick={onUseTokenizedCard}>Use Tokenized Card</button>
          <button className="ghost-button" onClick={onRequestApproval}>Request Approval</button>
          <button className="ghost-button" onClick={onMarkOtpRequired}>Mark OTP Required</button>
          <button className="ghost-button" onClick={() => onSaveRule(rulePayload)}>Save Renewal Rule</button>
          <button className="ghost-button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiry, setExpiry] = useState('');
  const [bankName, setBankName] = useState('');
  const [amountInr, setAmountInr] = useState('1000');
  const safeAmount = moneyNumber(amountInr);
  const limitStatus = safeAmount <= 1000 ? 'Safe auto-renew range' : safeAmount <= 1500 ? 'CFO + COO confirmation required' : 'Director review required';
  const digits = cardNumber.replace(/\D/g, '');
  const last4 = digits.slice(-4) || '----';
  const cardBrand = digits.startsWith('4') ? 'Visa' : digits.startsWith('5') ? 'Mastercard' : digits.startsWith('3') ? 'Amex' : 'Card';
  const [expiryMonth = '', expiryYearRaw = ''] = expiry.split('/').map((part) => part.trim());
  const expiryYear = expiryYearRaw.length === 2 ? `20${expiryYearRaw}` : expiryYearRaw;
  const canSave = cardName.trim() && digits.length >= 12 && cvv.length >= 3 && expiryMonth && expiryYear && bankName.trim() && safeAmount > 0;

  function saveTokenizedCard() {
    if (!canSave) return;
    onTokenize({
      amountInr: safeAmount,
      cardName: cardName.trim(),
      bankName: bankName.trim(),
      maskedReference: `${cardBrand} ---- ${last4}`,
      expiryMonth: expiryMonth.padStart(2, '0').slice(0, 2),
      expiryYear
    });
  }

  return (
    <div className="article-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="connect-billing-title">
      <div className="article-modal connect-billing-modal">
        <button className="login-back" onClick={onCancel}>Cancel</button>
        <span className="selected-os-badge">Secure Card Setup</span>
        <h2 id="connect-billing-title">Renewal Payment Method</h2>
        <p>Enter card details once. On save, GOPU OS keeps only a token, masked card reference, bank name, expiry, and INR limit for renewals or credits.</p>
        <div className="connect-billing-fields">
          <label>
            <span>Billing Owner</span>
            <input value={cardName} onChange={(event) => setCardName(event.target.value)} autoComplete="cc-name" />
          </label>
          <label>
            <span>Provider Token Reference</span>
            <input inputMode="numeric" value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/[^\d ]/g, '').slice(0, 23))} autoComplete="cc-number" />
          </label>
          <label>
            <span>Provider Challenge</span>
            <input type="password" inputMode="numeric" value={cvv} onChange={(event) => setCvv(event.target.value.replace(/\D/g, '').slice(0, 4))} autoComplete="cc-csc" />
          </label>
          <label>
            <span>Exp Date</span>
            <input placeholder="MM/YYYY" value={expiry} onChange={(event) => setExpiry(event.target.value.replace(/[^\d/]/g, '').slice(0, 7))} autoComplete="cc-exp" />
          </label>
          <label>
            <span>Bank</span>
            <input value={bankName} onChange={(event) => setBankName(event.target.value)} />
          </label>
          <label>
            <span>Limit in INR</span>
            <input inputMode="numeric" value={amountInr} onChange={(event) => setAmountInr(event.target.value.replace(/[^\d.]/g, ''))} />
            <small>{limitStatus}</small>
          </label>
        </div>
        <div className="secure-provider-frame compact">
          <LockKeyhole size={18} />
          <strong>Saved as token only</strong>
          <span>Raw card number and CVV are cleared after save. Renewals and credits use the tokenized card reference.</span>
        </div>
        <div className="approval-confirm-actions">
          <button className="ghost-button" onClick={onCancel}>Close</button>
          <button className="tactical-button" disabled={!canSave} onClick={saveTokenizedCard}>Save Card</button>
        </div>
      </div>
    </div>
  );
}

function PaymentSummaryCards({ payments, receipts }) {
  const totalSpend = payments.reduce((sum, item) => sum + item.amountInr, 0);
  const metrics = [
    ['Monthly Infrastructure Spend', formatInr(totalSpend), 'Monitoring'],
    ['Pending Renewals', paymentForecastSeed.length, 'Attention'],
    ['Payments Awaiting Approval', payments.filter((item) => item.approvalStatus.includes('Review') || item.approvalStatus.includes('Required')).length, 'Review Required'],
    ['Auto-Renew Eligible', payments.filter((item) => item.amountInr <= 1000 && item.category.includes('Trusted')).length, 'Monitoring'],
    ['Failed Payments', payments.filter((item) => item.paymentStatus === 'Payment Failed').length, 'Monitoring'],
    ['Payment Risks', paymentRiskSeed.length, 'Risk Detected'],
    ['Vendor Count', vendorTrustSeed.length, 'Monitoring'],
    ['Audit Events', paymentAuditSeed.length, 'Monitoring']
  ];
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Payment Summary</span><h2>Financial control picture</h2></div><Gauge size={18} /></div>
      <div className="payment-summary-grid">
        {metrics.map(([label, value, status]) => <article key={label}><span>{label}</span><strong>{value}</strong><StatusBadge label={status} state={getPaymentState(status)} /></article>)}
      </div>
      <p>{receipts.filter((receipt) => receipt.vaultStatus !== 'Reviewed').length} receipt records still need review. OTP values are not stored in Payment Vault.</p>
    </section>
  );
}

function PaymentRecordsTable({ payments, selectedId, onOpen, onOpenRenewal }) {
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Payment Records</span><h2>Infrastructure payments</h2></div><ClipboardList size={18} /></div>
      <div className="payment-record-list">
        {payments.map((payment) => (
          <button key={payment.id} className={selectedId === payment.id ? 'selected' : ''} onClick={() => onOpen(payment.id)}>
            <div><strong>{payment.vendor}</strong><StatusBadge label={payment.paymentStatus} state={getPaymentState(payment.paymentStatus)} /></div>
            <span>{payment.category} / {formatInr(payment.amountInr)} / {payment.renewalType}</span>
            <footer>
              <small>CFO: {payment.cfoConfirmation}</small>
              <small>COO: {payment.cooConfirmation}</small>
              <small>Founder: {payment.founderApproval}</small>
              <small>Receipt: {payment.receiptStatus}</small>
            </footer>
            {onOpenRenewal && <em onClick={(event) => { event.stopPropagation(); onOpenRenewal(payment); }}>Open renewal card</em>}
          </button>
        ))}
      </div>
    </section>
  );
}

function PaymentDetailPanel({ payment, onUploadReceipt }) {
  if (!payment) return <div className="empty-state"><p>Select a payment from the list to view details.</p></div>;
  return (
    <section className="payment-vault-panel payment-detail-panel">
      <div className="approval-section-header"><div><span>Payment Detail</span><h2>{payment.vendor}</h2></div><FileCheck2 size={18} /></div>
      <div className="payment-detail-grid">
        {[
          ['Payment reason', payment.reason],
          ['Category', payment.category],
          ['Amount', formatInr(payment.amountInr)],
          ['Subscription period', payment.subscriptionPeriod],
          ['Payment method', payment.paymentMethod],
          ['Approval chain', payment.approvalStatus],
          ['OTP challenge status', payment.paymentStatus === 'OTP Required' ? 'OTP Required' : 'No active challenge'],
          ['Receipt', payment.receiptStatus],
          ['Invoice', payment.receiptStatus === 'Missing' ? 'Missing' : 'Repository linked'],
          ['Risk analysis', `${payment.riskLevel} risk`],
          ['Payment date', payment.paymentDate],
          ['Linked workflows', payment.linkedWorkflows.join(', ')]
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="payment-action-row">
        <button onClick={onUploadReceipt}>Upload Receipt</button>
        <button>Approval Chain Update</button>
        <button>Escalate Risk</button>
      </div>
    </section>
  );
}

function PaymentApprovalChain() {
  const steps = ['CTO detects requirement', 'COO operational confirmation', 'CFO budget validation', 'Founder approval if required', 'OTP verification', 'Payment execution', 'Receipt capture', 'Vault storage', 'Audit completion'];
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Payment Approval Chain</span><h2>Governed execution</h2></div><Route size={18} /></div>
      <div className="payment-approval-chain">{steps.map((step, index) => <div key={step}><i>{index + 1}</i><span>{step}</span></div>)}</div>
    </section>
  );
}

function OTPChallengeLog() {
  const rows = [
    ['OTP requested', 'Gateway', 'OTP Required', 'Founder verification requested externally'],
    ['Founder verification requested', 'CFO Command', 'Waiting Founder Verification', 'Founder receives OTP outside GOPU OS'],
    ['CFO entered OTP', 'CFO Command', 'OTP Submitted', 'OTP value cleared immediately'],
    ['Payment challenge completed', 'Payment Gateway', 'Payment Processing', 'Event recorded without banking challenge data'],
    ['Payment success/failure', 'CFO Command', 'Monitoring', 'Final status pending provider response']
  ];
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>OTP & Payment Challenge Log</span><h2>No OTP values stored</h2></div><LockKeyhole size={18} /></div>
      <div className="otp-log-list">{rows.map(([event, actor, status, note]) => <article key={event}><strong>{event}</strong><StatusBadge label={status} state={getPaymentState(status)} /><span>{actor}</span><small>{note}</small></article>)}</div>
    </section>
  );
}

function ReceiptRepository({ receipts, onMarkReviewed }) {
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Receipt & Invoice Repository</span><h2>Financial evidence</h2></div><FileText size={18} /></div>
      <div className="receipt-repository-list">
        {receipts.map((receipt) => (
          <article key={receipt.id}>
            <div><strong>{receipt.vendor}</strong><StatusBadge label={receipt.vaultStatus} state={getPaymentState(receipt.vaultStatus)} /></div>
            <span>{receipt.documentType} / {receipt.date} / {receipt.amount}</span>
            <small>Linked payment: {receipt.linkedPayment} / Uploaded by: {receipt.uploadedBy}</small>
            <div className="payment-action-row">
              <button>Open Receipt</button>
              <button>Download</button>
              <button onClick={() => onMarkReviewed(receipt.id)}>Mark Reviewed</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function VendorTrustRegistry({ vendors }) {
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Vendor Trust Registry</span><h2>Auto-pay eligibility</h2></div><ShieldCheck size={18} /></div>
      <div className="vendor-trust-list">
        {vendors.map((vendor) => <article key={vendor.id}><div><strong>{vendor.vendorName}</strong><SeverityBadge severity={vendor.riskLevel} /></div><span>{vendor.category} / {vendor.trustLevel}</span><small>Limit {vendor.monthlyLimit} / {vendor.autoPayEligibility} / {vendor.renewalFrequency}</small></article>)}
      </div>
    </section>
  );
}

function RenewalsLimitsDashboard({ payments = paymentRecordsSeed, forecasts = paymentForecastSeed, onView, onRenewNow, onMarkPaid }) {
  const [filter, setFilter] = useState('All');
  const [notice, setNotice] = useState('');
  const items = buildRenewalDashboardItems(payments, forecasts);
  const filteredItems = filter === 'All'
    ? items
    : items.filter((item) => {
      if (filter === 'Recharge Required') return item.rechargeStatus === 'Recharge Required Now' || item.rechargeStatus === 'Limit Exhausted';
      return item.rechargeStatus === filter;
    });
  const summary = {
    total: items.length,
    expired: items.filter((item) => item.rechargeStatus === 'Expired').length,
    required: items.filter((item) => item.rechargeStatus === 'Recharge Required Now' || item.rechargeStatus === 'Limit Exhausted').length,
    soon: items.filter((item) => item.rechargeStatus === 'Recharge Soon').length,
    healthy: items.filter((item) => item.rechargeStatus === 'Healthy').length
  };

  async function handleAction(action, item, callback) {
    if (action === 'Mark Paid') {
      const result = await requestSensitiveActionApproval({
        action_type: 'MARK_RENEWAL_PAID',
        tenant_id: demoTenantId,
        title: `${item.name} renewal payment needs founder approval`,
        related_record: item.id,
        related_record_label: item.name,
        requested_by: 'CFO Command',
        executive_owner: 'CFO Command',
        department: 'Finance',
        source_module: 'Payment Vault',
        risk_level: item.priority === 'Critical' ? 'Critical' : 'High',
        reason: `${item.name} cannot be marked paid until founder approval is recorded.`,
        summary: `Mark paid requested for ${item.name}. Payment status remains unchanged until approved.`,
        details: {
          vendor: item.name,
          expiry_date: item.expiryDate,
          usage_percentage: item.usagePercentage,
          recharge_status: item.rechargeStatus
        }
      });
      await createAuditLog({
        tenant_id: demoTenantId,
        action_type: 'Renewal marked paid',
        module: 'Payment Vault',
        related_table: 'payment_vault',
        related_record_id: item.id,
        actor: 'CFO Command',
        description: `Mark paid requested for ${item.name}; payment remains blocked until founder approval.`,
        old_value: { status: item.rechargeStatus },
        new_value: { requested_status: 'Paid pending approval' },
        risk_level: item.priority === 'Critical' ? 'Critical' : 'High'
      });
      setNotice(result.ok ? `Founder approval requested for ${item.name}. Mark Paid is blocked until approved.` : result.error?.message || 'Approval request failed.');
      callback?.(item, result);
      return;
    }
    setNotice(`${action} prepared for ${item.name}.`);
    callback?.(item);
  }

  return (
    <section className="renewals-dashboard">
      <div className="renewals-dashboard-header">
        <div>
          <span>Payment Vault</span>
          <h2>Renewals & Limits Control</h2>
          <p>Track expiry dates, usage limits, recharge needs, and renewal priority.</p>
        </div>
        <CalendarClock size={22} />
      </div>

      <div className="renewals-summary-grid">
        <article><span>Total Renewals</span><strong>{summary.total}</strong></article>
        <article className="tone-red"><span>Expired</span><strong>{summary.expired}</strong></article>
        <article className="tone-orange"><span>Recharge Required</span><strong>{summary.required}</strong></article>
        <article className="tone-yellow"><span>Recharge Soon</span><strong>{summary.soon}</strong></article>
        <article className="tone-green"><span>Healthy</span><strong>{summary.healthy}</strong></article>
      </div>

      <div className="renewals-filter-row">
        {['All', 'Expired', 'Recharge Required', 'Recharge Soon', 'Healthy'].map((item) => (
          <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      {notice && <div className="billing-action-notice">{notice}</div>}

      {items.length === 0 ? (
        <div className="renewals-empty-state">No renewals added yet. Add your first renewal to start tracking.</div>
      ) : (
        <>
          <div className="renewal-control-card-grid">
            {filteredItems.map((item) => (
              <article key={item.id} className={`renewal-control-card status-${renewalStatusClass(item.rechargeStatus)}`}>
                <header>
                  <div>
                    <span>{item.category}</span>
                    <strong>{item.name}</strong>
                    <small>{item.serviceName}</small>
                  </div>
                  <em>{item.priority}</em>
                </header>
                <div className="renewal-card-status">{item.rechargeStatus}</div>
                <dl>
                  <div><dt>Current status</dt><dd>{item.currentStatus}</dd></div>
                  <div><dt>Expiry date</dt><dd>{item.expiryDate}</dd></div>
                  <div><dt>Days remaining</dt><dd>{item.daysRemaining === null ? 'Unknown' : item.daysRemaining}</dd></div>
                  <div><dt>Limit used</dt><dd>{formatInr(item.limitUsed)}</dd></div>
                  <div><dt>Limit total</dt><dd>{formatInr(item.limitTotal)}</dd></div>
                </dl>
                <div className="renewal-usage-meter" aria-label={`${item.usagePercentage}% usage`}>
                  <span><b style={{ width: `${item.usagePercentage}%` }} /></span>
                  <strong>{item.usagePercentage}% used</strong>
                </div>
                <footer>
                  <button onClick={() => handleAction('View', item, onView)}>View</button>
                  <button onClick={() => handleAction('Renew Now', item, onRenewNow)}>Renew Now</button>
                  <button onClick={() => handleAction('Request Approval', item, onMarkPaid)}>Request Approval</button>
                  <button onClick={() => handleAction('Mark Paid', item, onMarkPaid)}>Mark Paid</button>
                </footer>
              </article>
            ))}
          </div>

          <div className="renewal-control-list">
            <div className="renewal-control-list-head"><span>Name</span><span>Expiry</span><span>Usage</span><span>Status</span><span>Priority</span><span>Action</span></div>
            {filteredItems.map((item) => (
              <button key={`list-${item.id}`} onClick={() => handleAction('View', item, onView)}>
                <strong>{item.name}</strong>
                <span>{item.expiryDate}</span>
                <span>{item.usagePercentage}%</span>
                <span className={`renewal-list-badge status-${renewalStatusClass(item.rechargeStatus)}`}>{item.rechargeStatus}</span>
                <span>{item.priority}</span>
                <span>{item.action}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function renewalStatusClass(status = '') {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function RenewalForecastPanel({ forecasts, expanded, onToggle }) {
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Renewal Forecast</span><h2>Upcoming spend</h2></div><CalendarClock size={18} /></div>
      <div className="renewal-forecast-list">
        {forecasts.map((forecast) => <button key={forecast.id} className={expanded === forecast.id ? 'expanded' : ''} onClick={() => onToggle(forecast.id)}><div><strong>{forecast.title}</strong><StatusBadge label={forecast.status} state={getPaymentState(forecast.status)} /></div><span>{forecast.expectedDate} / {forecast.projectedAmount}</span>{expanded === forecast.id && <small>{forecast.vendor} / {forecast.forecastType}</small>}</button>)}
      </div>
    </section>
  );
}

function PaymentRiskPanel({ risks }) {
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Payment Risk Panel</span><h2>Financial exceptions</h2></div><TriangleAlert size={18} /></div>
      <div className="payment-risk-list">{risks.map((risk) => <article key={risk.id}><div><strong>{risk.title}</strong><SeverityBadge severity={risk.severity} /></div><p>{risk.detail}</p><small>{risk.owner}</small></article>)}</div>
    </section>
  );
}

function PaymentAuditTimeline({ audit, filter, onFilter }) {
  const filters = ['All', 'OTP Required', 'Payment Processing', 'Confirmed', 'Monitoring', 'CFO Command'];
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Payment Audit Timeline</span><h2>Financial trace</h2></div><Activity size={18} /></div>
      <div className="payment-filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item}</button>)}</div>
      <div className="payment-audit-timeline">{audit.map((event) => <article key={event.id}><time>{event.timestamp}</time><div><strong>{event.event}</strong><span>{event.actor} / {event.status}</span><small>{event.notes}</small></div></article>)}</div>
    </section>
  );
}

function FinancialMemoryLayer() {
  return (
    <section className="payment-vault-panel">
      <div className="approval-section-header"><div><span>Financial Intelligence Memory</span><h2>Memory</h2></div><BrainCircuit size={18} /></div>
      <div className="payment-memory-list">{['Recurring renewals', 'Spending patterns', 'Approval trends', 'Failed payment patterns', 'Risky vendors', 'Budget anomalies'].map((item) => <span key={item}>{item}</span>)}</div>
      <p>Future connected memory should identify budget anomalies without storing OTP, card details, or banking challenge data.</p>
    </section>
  );
}

function getPaymentState(status) {
  if (['Payment Failed', 'Blocked', 'Critical'].includes(status)) return 'error';
  if (['Attention', 'Review Required', 'Risk Detected', 'OTP Required', 'Founder Approval Required', 'Pending Approval', 'Waiting Founder Verification'].includes(status)) return 'attention';
  if (['Monitoring', 'Payment Processing', 'Receipt Pending', 'Pending Review', 'Pending', 'Review', 'Saved to Vault'].includes(status)) return 'progress';
  return 'online';
}

function formatInr(value) {
  return `ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹${Number(value || 0).toLocaleString('en-IN')}`;
}

function WorkflowGuidanceEngine({ navigate, onBack, initialView = 'Workflow Guidance' }) {
  const [now, setNow] = useState(() => new Date());
  const [activeView, setActiveView] = useState(initialView);
  const [data, setData] = useState(null);
  const [verification, setVerification] = useState(null);
  const [crossCheck, setCrossCheck] = useState(null);
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadGuidance() {
      const response = await getWorkflowGuidanceDashboard();
      if (!active) return;
      setData(response.data);
    }
    loadGuidance();
    return () => { active = false; };
  }, []);

  async function runVerification() {
    const response = await runCustomerVerification();
    setVerification(response.data);
    setNotice(`Customer verification completed: ${response.data.status}`);
  }

  async function runStageCheck(stage = 'Pricing Review') {
    const response = await runWorkflowCrossCheck(stage);
    setCrossCheck(response.data);
    setNotice(`${stage} cross-check completed: ${response.data.status}`);
  }

  async function makeDraft(type = 'Quotation Email') {
    const response = await generateCommunicationDraft(type);
    setDraft(response.data);
    setNotice(`${type} prepared as draft only. No email was sent.`);
  }

  async function createTask() {
    await createGuidanceTask({ title: 'Complete buyer verification before pricing', blocking_reason: 'Buyer profile, payment terms, destination port, and shipment expectations are incomplete.' });
    setNotice('Guidance task created in local task engine.');
  }

  async function routeApproval() {
    await createGuidanceApproval({ title: 'Founder review required before buyer-facing communication', summary: 'Customer verification and communication approval gates detected sensitive release conditions.' });
    setNotice('Founder approval request created by Workflow Guidance Engine.');
    navigate('/export-os/director');
  }

  const tabs = ['Workflow Guidance', 'Customer Verification', 'Communication Approvals', 'Stage Cross-Checks', 'Operational Suggestions'];

  return (
    <ExportOSShell className="workflow-guidance-shell">
      <header className="deck-header workflow-guidance-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>Workflow Guidance Engine</h1>
          <p>Customer verification, approval orchestration, stage cross-checking, and export operations guidance.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={data?.summary?.buyerStatus || 'Guidance Loading'} state="attention" />
          <StatusBadge label={`${data?.summary?.missingDependencies || 0} Missing Dependencies`} state="attention" />
          <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <section className="workflow-guidance-tabs">
        {tabs.map((tab) => <button key={tab} className={activeView === tab ? 'active' : ''} onClick={() => setActiveView(tab)}>{tab}</button>)}
      </section>

      {notice && <div className="vault-action-status workflow-guidance-notice"><StatusPulse /><span>{notice}</span></div>}

      {!data ? <section className="workflow-guidance-panel guidance-loading"><StatusPulse /><strong>Loading guided export workflow...</strong></section> : (
        <main className="workflow-guidance-layout">
          <section className="workflow-guidance-main">
            {activeView === 'Workflow Guidance' && <GuidanceJourneyPanel data={data} onRunCheck={runStageCheck} />}
            {activeView === 'Customer Verification' && <CustomerVerificationPanel data={data} result={verification} onRun={runVerification} onTask={createTask} />}
            {activeView === 'Communication Approvals' && <CommunicationApprovalPanel data={data} draft={draft} onDraft={makeDraft} onApproval={routeApproval} />}
            {activeView === 'Stage Cross-Checks' && <StageCrossCheckPanel data={data} result={crossCheck} onRun={runStageCheck} onTask={createTask} onApproval={routeApproval} />}
            {activeView === 'Operational Suggestions' && <OperationalSuggestionsPanel data={data} />}
          </section>
          <aside className="workflow-guidance-side">
            <GuidanceSummaryCard summary={data.summary} />
            <GuidanceGuardrails />
            <GuidanceActions navigate={navigate} onTask={createTask} onApproval={routeApproval} />
          </aside>
        </main>
      )}
    </ExportOSShell>
  );
}

function GuidanceJourneyPanel({ data, onRunCheck }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Core Workflow Model</span><h2>Lead to repeat buyer journey</h2></div><Workflow size={18} /></div><div className="workflow-stage-rail">{data.stages.map((stage, index) => <button key={stage} onClick={() => onRunCheck(stage)}><i>{index + 1}</i><span>{stage}</span></button>)}</div><p>Every stage validates the previous stage, detects missing dependencies, recommends next actions, and routes tasks or approvals when risk appears.</p></section>;
}

function CustomerVerificationPanel({ data, result, onRun, onTask }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Customer Verification Engine</span><h2>Operational buyer risk validation</h2></div><UsersRound size={18} /></div><div className="guidance-check-grid">{data.customerChecks.map(([title, status, detail, checks]) => <article key={title}><div><strong>{title}</strong><StatusBadge label={status} state={getApprovalState(status)} /></div><p>{detail}</p><small>{checks.join(' / ')}</small></article>)}</div><div className="workflow-guidance-actions"><button className="tactical-button" onClick={onRun}>Run Customer Verification</button><button className="ghost-button" onClick={onTask}>Create Follow-up Task</button></div>{result && <pre className="workflow-guidance-output">Status: {result.status}{'\n'}Risk: {result.riskLevel}{'\n'}Score: {result.score}/100{'\n'}Missing: {result.missing.join(', ')}{'\n'}Recommendation: {result.recommendation}</pre>}</section>;
}

function CommunicationApprovalPanel({ data, draft, onDraft, onApproval }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Email & Communication Approval</span><h2>Draft, validate, approve, release</h2></div><Mail size={18} /></div><div className="guidance-table">{data.communicationRules.map(([type, status, rule, owner]) => <article key={type}><strong>{type}</strong><StatusBadge label={status} state={getApprovalState(status)} /><span>{owner}</span><p>{rule}</p></article>)}</div><div className="workflow-guidance-actions"><button className="tactical-button" onClick={() => onDraft('Quotation Email')}>Generate Quotation Draft</button><button className="ghost-button" onClick={() => onDraft('Commercial Invoice Email')}>Generate Invoice Draft</button><button className="ghost-button" onClick={onApproval}>Route Founder Approval</button></div>{draft && <pre className="workflow-guidance-output">{draft.type} / {draft.status}{'\n'}Approval chain: {draft.approvalChain.join(' -> ')}{'\n\n'}{draft.draft}</pre>}</section>;
}

function StageCrossCheckPanel({ data, result, onRun, onTask, onApproval }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Automatic Cross-Checking</span><h2>Stage dependency control</h2></div><ClipboardCheck size={18} /></div><div className="guidance-check-grid">{data.stageGuidance.map(([stage, risk, rule, owner, timeline, action]) => <article key={stage}><div><strong>{stage}</strong><SeverityBadge severity={risk} /></div><p>{rule}</p><small>{owner} / {timeline} / {action}</small><button onClick={() => onRun(stage)}>Run Check</button></article>)}</div><div className="workflow-guidance-actions"><button className="tactical-button" onClick={onTask}>Create Blocker Task</button><button className="ghost-button" onClick={onApproval}>Create Approval Request</button></div>{result && <pre className="workflow-guidance-output">Stage: {result.stage}{'\n'}Status: {result.status}{'\n'}Passed: {result.passed.join(', ')}{'\n'}Missing: {result.missing.join(', ')}{'\n'}Next action: {result.nextAction}{'\n'}Escalation: {result.escalationRule}</pre>}</section>;
}

function OperationalSuggestionsPanel({ data }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Operational Guidance</span><h2>Certifications, lab tests, packing, logistics</h2></div><Sparkles size={18} /></div><div className="guidance-check-grid">{data.certificationGuidance.map(([trigger, suggestion]) => <article key={trigger}><strong>{trigger}</strong><p>{suggestion}</p></article>)}</div><p>AI suggestions are advisory only. Final HSN, origin, legal/export compliance, CA/customs/legal authority, and shipment guarantees require human review.</p></section>;
}

function GuidanceSummaryCard({ summary }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Guidance Summary</span><h2>{summary.currentStage}</h2></div><Gauge size={18} /></div><div className="guidance-summary-list">{Object.entries(summary).map(([key, value]) => <span key={key}>{key.replaceAll(/([A-Z])/g, ' $1')}: <strong>{value}</strong></span>)}</div></section>;
}

function GuidanceGuardrails() {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>OpenAI Guardrails</span><h2>Advisory only</h2></div><ShieldCheck size={18} /></div><div className="approval-memory-list">{['May suggest next actions, missing dependencies, timelines, lab reminders, drafts, and risk summaries.', 'May not legally approve exports, finalize HSN, finalize origin claims, guarantee shipment timing, or replace CA/customs/legal authority.', 'Communication remains draft-only until backend connection and approval gates are complete.'].map((item) => <span key={item}>{item}</span>)}</div></section>;
}

function GuidanceActions({ navigate, onTask, onApproval }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Action Routing</span><h2>Task + approval orchestration</h2></div><Route size={18} /></div><div className="workflow-guidance-actions stacked"><button className="tactical-button" onClick={onTask}>Create Guidance Task</button><button className="ghost-button" onClick={onApproval}>Route Approval</button><button className="ghost-button" onClick={() => navigate('/export-os/notifications')}>Open Alert Center</button><button className="ghost-button" onClick={() => navigate('/export-os/tasks')}>Open Task Engine</button></div></section>;
}

function ExecutiveWarRoom({ navigate, onBack, mode = 'Sync' }) {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [summary, setSummary] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadSync() {
    const response = await getExecutiveSyncDashboard();
    setData(response.data);
  }

  useEffect(() => {
    loadSync();
  }, []);

  async function makeSummary() {
    const response = await generateFounderWarRoomSummary();
    setSummary(response.data);
    setNotice('Founder war-room summary generated as internal preview.');
  }

  async function escalateItem(item) {
    const response = await escalateExecutiveConflict(item, demoTenantId);
    setSelectedItem(response.data);
    setNotice(response.data.escalation_note);
  }

  const departments = ['All', 'COO', 'CFO', 'CTO', 'CMO', 'CIO', 'Founder'];
  const severities = ['All', 'Critical', 'High', 'High Risk', 'Medium', 'Attention', 'Low'];
  const filterByExecutive = (items, getter = (item) => item.source_executives || item.impacted_departments || [item.executive_type || item.owner || 'Founder']) => items.filter((item) => {
    const depts = getter(item) || [];
    const severity = item.severity || item.urgency || item.status;
    return (departmentFilter === 'All' || depts.includes(departmentFilter) || String(item.owner || '').includes(departmentFilter)) && (riskFilter === 'All' || severity === riskFilter);
  });

  return (
    <ExportOSShell className="workflow-guidance-shell executive-sync-shell">
      <header className="deck-header workflow-guidance-header">
        <div className="deck-header-copy"><span>GOPU Export OS</span><h1>Executive War Room</h1><p>Cross-executive synchronization layer for COO, CFO, CTO, CMO, CIO, and Founder coordination.</p></div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={mode} state="progress" />
          <StatusBadge label={`${data?.warRoom?.criticalAlerts || 0} critical alerts`} state={(data?.warRoom?.criticalAlerts || 0) ? 'error' : 'progress'} />
          <StatusBadge label={`${data?.warRoom?.operationalReadiness || 0}% readiness`} state={(data?.warRoom?.operationalReadiness || 0) < 55 ? 'attention' : 'progress'} />
          <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {notice && <div className="vault-action-status workflow-guidance-notice"><StatusPulse /><span>{notice}</span></div>}

      {!data ? <section className="workflow-guidance-panel guidance-loading"><StatusPulse /><strong>Loading executive synchronization...</strong></section> : (
        <>
          <section className="executive-sync-hero">
            <div><span>Founder War Room Mode</span><h2>{data.warRoom.status}</h2><p>{data.warRoom.founderSummary}</p></div>
            <div className="executive-sync-metrics">
              {[
                ['Active workflows', data.warRoom.activeWorkflows],
                ['High risks', data.warRoom.highRisks],
                ['Founder escalations', data.warRoom.founderEscalations],
                ['Operational readiness', `${data.warRoom.operationalReadiness}%`]
              ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
            </div>
            <button className="tactical-button" onClick={makeSummary}>Generate Founder War-Room Summary</button>
          </section>

          <section className="executive-sync-filter-bar">
            <div>{departments.map((item) => <button key={item} className={departmentFilter === item ? 'active' : ''} onClick={() => setDepartmentFilter(item)}>{item}</button>)}</div>
            <div>{severities.map((item) => <button key={item} className={riskFilter === item ? 'active' : ''} onClick={() => setRiskFilter(item)}>{item}</button>)}</div>
          </section>

          <main className="executive-sync-layout">
            <section className="executive-sync-main">
              <CrossExecutiveAlerts alerts={filterByExecutive(data.crossExecutiveAlerts)} navigate={navigate} onSelect={setSelectedItem} onEscalate={escalateItem} />
              <SharedWorkflowDependencies dependencies={filterByExecutive(data.sharedDependencies, (item) => item.executives)} navigate={navigate} onSelect={setSelectedItem} />
              <ExecutiveCoordinationTimeline events={filterByExecutive(data.coordinationTimeline, (item) => [item.executive])} navigate={navigate} />
              <UnifiedRiskBoard risks={filterByExecutive(data.riskBoard)} navigate={navigate} onSelect={setSelectedItem} />
              <BottleneckDetectionPanel bottlenecks={filterByExecutive(data.bottlenecks, (item) => [item.owner])} navigate={navigate} onSelect={setSelectedItem} />
            </section>
            <aside className="executive-sync-side">
              <FounderEscalationQueue escalations={filterByExecutive(data.founderEscalations)} navigate={navigate} onEscalate={escalateItem} />
              <ExecutiveRecommendationsPanel recommendations={filterByExecutive(data.recommendations, (item) => [item.executive_type])} navigate={navigate} />
              <OperationalConflictPanel conflicts={filterByExecutive(data.conflicts, () => ['Founder', 'COO', 'CFO', 'CMO', 'CIO'])} navigate={navigate} onEscalate={escalateItem} />
              <StrategicOpportunitySync opportunities={data.opportunities} navigate={navigate} />
              <ExecutiveMemoryPanel memory={data.memory} />
              {summary && <FounderWarRoomSummaryPanel summary={summary} />}
              {selectedItem && <ExecutiveSyncDetail item={selectedItem} navigate={navigate} onEscalate={escalateItem} />}
            </aside>
          </main>
        </>
      )}
    </ExportOSShell>
  );
}

function ExecutiveSyncCard({ item, title, subtitle, severity, route, onOpen, onSelect, onEscalate, children }) {
  return (
    <article className="executive-sync-card" role="button" tabIndex={0} onClick={() => onSelect?.(item)} onKeyDown={(event) => event.key === 'Enter' && onSelect?.(item)}>
      <div><strong>{title}</strong><SeverityBadge severity={severity || 'Monitoring'} /></div>
      {subtitle && <p>{subtitle}</p>}
      {children}
      <footer>
        {route && <button onClick={(event) => { event.stopPropagation(); onOpen(route); }}>Open Linked Workflow</button>}
        {onEscalate && <button onClick={(event) => { event.stopPropagation(); onEscalate(item); }}>Escalate Conflict</button>}
      </footer>
    </article>
  );
}

function CrossExecutiveAlerts({ alerts, navigate, onSelect, onEscalate }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Cross-Executive Alerts</span><h2>Multi-command impact</h2></div><Bell size={18} /></div><div className="executive-sync-grid">{alerts.map((alert) => <ExecutiveSyncCard key={alert.id} item={alert} title={alert.title} subtitle={alert.message} severity={alert.severity} route={alert.linked_route} onOpen={navigate} onSelect={onSelect} onEscalate={onEscalate}><span>{alert.source_executives.join(' + ')} / {alert.impacted_departments.join(' / ')}</span><small>{alert.next_action}</small></ExecutiveSyncCard>)}</div></section>;
}

function SharedWorkflowDependencies({ dependencies, navigate, onSelect }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Shared Workflow Dependencies</span><h2>Cross-command chains</h2></div><Workflow size={18} /></div><div className="shared-dependency-list">{dependencies.map((dependency) => <ExecutiveSyncCard key={dependency.id} item={dependency} title={dependency.chain[0]} subtitle={dependency.next_action} severity={dependency.severity} route={dependency.linked_route} onOpen={navigate} onSelect={onSelect}><div className="sync-chain">{dependency.chain.map((step) => <span key={step}>{step}</span>)}</div><small>{dependency.executives.join(' -> ')}</small></ExecutiveSyncCard>)}</div></section>;
}

function ExecutiveCoordinationTimeline({ events, navigate }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Executive Coordination Timeline</span><h2>Who acted and why</h2></div><Activity size={18} /></div><div className="compact-timeline-list">{events.map((event, index) => <article key={event.id}><i>{index + 1}</i><div><strong>{event.event}</strong><SeverityBadge severity={event.severity} /><span>{event.executive} / {new Date(event.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><p>{event.note}</p><button onClick={() => navigate(event.linked_route)}>Open Linked Workflow</button></div></article>)}</div></section>;
}

function UnifiedRiskBoard({ risks, navigate, onSelect }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Unified Risk Board</span><h2>Operational / financial / technical / market</h2></div><TriangleAlert size={18} /></div><div className="executive-risk-grid">{risks.map((risk) => <ExecutiveSyncCard key={risk.id} item={risk} title={risk.risk_type} subtitle={risk.summary} severity={risk.severity} route={risk.linked_route} onOpen={navigate} onSelect={onSelect}><span>{risk.impacted_departments.join(' + ')}</span><small>{risk.alert_count} related alert(s)</small></ExecutiveSyncCard>)}</div></section>;
}

function FounderEscalationQueue({ escalations, navigate, onEscalate }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Founder Escalation Queue</span><h2>Highest priority decisions</h2></div><ShieldCheck size={18} /></div><div className="executive-mini-list">{escalations.map((item) => <ExecutiveSyncCard key={item.id} item={item} title={item.title} subtitle={item.operational_impact} severity={item.urgency} route={item.linked_route} onOpen={navigate} onEscalate={onEscalate}><span>{item.source_executives.join(' + ')}</span><small>{item.recommended_founder_action}</small></ExecutiveSyncCard>)}</div></section>;
}

function ExecutiveRecommendationsPanel({ recommendations, navigate }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Executive Recommendations</span><h2>Unified recommendations</h2></div><BrainCircuit size={18} /></div><div className="executive-mini-list">{recommendations.map((item) => <button key={item.id} onClick={() => navigate(item.linked_route)}><div><strong>{item.executive_type}</strong><SeverityBadge severity={item.severity} /></div><span>{item.recommendation}</span></button>)}</div></section>;
}

function BottleneckDetectionPanel({ bottlenecks, navigate, onSelect }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Cross-Department Bottlenecks</span><h2>Detected coordination gaps</h2></div><TimerReset size={18} /></div><div className="executive-sync-grid">{bottlenecks.map((item) => <ExecutiveSyncCard key={item.id} item={item} title={item.title} subtitle={item.impact} severity={item.severity} route={item.linked_route} onOpen={navigate} onSelect={onSelect}><span>{item.owner}</span></ExecutiveSyncCard>)}</div></section>;
}

function OperationalConflictPanel({ conflicts, navigate, onEscalate }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Operational Conflict Resolution</span><h2>Recommended resolution paths</h2></div><SlidersHorizontal size={18} /></div><div className="executive-mini-list">{conflicts.map((item) => <ExecutiveSyncCard key={item.id} item={item} title={item.title} subtitle={item.conflict} severity={item.severity} route={item.linked_route} onOpen={navigate} onEscalate={onEscalate}><small>{item.resolution}</small></ExecutiveSyncCard>)}</div></section>;
}

function StrategicOpportunitySync({ opportunities, navigate }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Strategic Opportunity Sync</span><h2>CIO + CMO + CFO + COO</h2></div><TrendingUp size={18} /></div><div className="executive-mini-list">{opportunities.map((item) => <button key={item.id} onClick={() => navigate(item.linked_route)}><div><strong>{item.title}</strong><StatusBadge label={item.status} state={item.status.includes('Strategic') || item.status.includes('High') ? 'attention' : 'progress'} /></div><span>{item.owner}</span><small>{item.sync_path}</small></button>)}</div></section>;
}

function ExecutiveMemoryPanel({ memory }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Executive Memory Layer</span><h2>Memory</h2></div><BrainCircuit size={18} /></div><div className="executive-memory-list">{memory.map((item) => <article key={item.id}><strong>{item.memory_type}</strong><span>{item.content}</span><StatusBadge label={item.status} state="progress" /></article>)}</div><p>Future: Connected Executive Intelligence Memory.</p></section>;
}

function FounderWarRoomSummaryPanel({ summary }) {
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>{summary.title}</span><h2>{summary.status}</h2></div><FileBarChart size={18} /></div><div className="executive-memory-list">{summary.sections.map(([title, content]) => <article key={title}><strong>{title}</strong><span>{content}</span></article>)}</div></section>;
}

function ExecutiveSyncDetail({ item, navigate, onEscalate }) {
  return <section className="workflow-guidance-panel executive-sync-detail"><div className="approval-section-header"><div><span>Coordination Detail</span><h2>{item.title || item.risk_type || item.event}</h2></div><Eye size={18} /></div><div className="workflow-info-list">{Object.entries(item).filter(([key, value]) => !['id', 'created_at', 'updated_at'].includes(key) && typeof value !== 'object').slice(0, 8).map(([key, value]) => <article key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{String(value)}</strong></article>)}</div><div className="workflow-guidance-actions stacked">{item.linked_route && <button className="tactical-button" onClick={() => navigate(item.linked_route)}>Open Linked Workflow</button>}<button className="ghost-button" onClick={() => onEscalate(item)}>Escalate to Founder War Room</button><button className="ghost-button" onClick={() => navigate('/export-os/workflows')}>Open Master Workflows</button></div></section>;
}

function NotificationCenter({ navigate, onBack }) {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadData() {
    const response = await getNotificationCenterData(demoTenantId);
    setData(response.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function viewAlert(notification) {
    await markNotificationViewed(notification.id);
    setNotice(`Founder viewed: ${notification.title}`);
    await loadData();
  }

  async function escalateAlert(notification) {
    await escalateNotification(notification.id);
    setNotice(`Escalated: ${notification.title}`);
    await loadData();
  }

  async function approvalAction(action, notification) {
    if (!notification.approval) return;
    const note = `Notification Center action: ${action}.`;
    if (action === 'Approve') await approveRequest(demoTenantId, notification.approval, note);
    if (action === 'Reject') await rejectRequest(demoTenantId, notification.approval, note);
    if (action === 'Request Revision') await requestRevision(demoTenantId, notification.approval, note);
    setNotice(`${action}: ${notification.title}`);
    if (action === 'Approve') announceToSR('Request approved successfully');
    if (action === 'Reject') announceToSR('Request rejected', 'assertive');
    await loadData();
  }

  const notifications = data?.notifications || [];
  const modules = ['All', ...Array.from(new Set(notifications.map((item) => item.source_module)))];
  const filtered = notifications.filter((item) => (severityFilter === 'All' || item.severity === severityFilter) && (moduleFilter === 'All' || item.source_module === moduleFilter));
  const byType = (types) => filtered.filter((item) => types.includes(item.notification_type) || types.includes(item.source_module));

  return (
    <ExportOSShell className="notification-center-shell">
      <header className="deck-header notification-header">
        <div className="deck-header-copy"><span>GOPU Export OS</span><h1>Notification & Alert Center</h1><p>Executive Event Layer for approvals, risks, blockers, incidents, escalations, and workflow alerts.</p></div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={`${data?.counts?.critical || 0} Critical Alerts`} state="error" />
          <StatusBadge label={`${data?.counts?.pendingReviews || 0} Pending Reviews`} state="attention" />
          <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>
      <section className="notification-filter-bar">
        <div>{['All', 'Critical', 'High Risk', 'Attention', 'Monitoring'].map((item) => <button key={item} className={severityFilter === item ? 'active' : ''} onClick={() => setSeverityFilter(item)}>{item}</button>)}</div>
        <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} aria-label="Filter by source module">{modules.map((moduleName) => <option key={moduleName} value={moduleName}>{moduleName}</option>)}</select>
      </section>
      {notice && <div className="vault-action-status notification-notice"><StatusPulse /><span>{notice}</span></div>}
      {!data ? <section className="notification-panel notification-loading"><StatusPulse /><strong>Loading alert center...</strong></section> : (
        <main className="notification-center-layout">
          <section className="notification-left"><PriorityAlertsPanel alerts={filtered.slice(0, 5)} navigate={navigate} onView={viewAlert} onEscalate={escalateAlert} /><ApprovalNotifications alerts={byType(['Approval'])} navigate={navigate} onAction={approvalAction} /><FounderEscalationPanel alerts={filtered.filter((item) => item.severity === 'Critical' || item.status === 'Escalated')} navigate={navigate} /></section>
          <section className="notification-center-column"><OperationsAlerts alerts={byType(['Warning', 'Task Engine', 'COO Command', 'Document Factory'])} navigate={navigate} onView={viewAlert} onEscalate={escalateAlert} /><WorkflowNotifications alerts={byType(['Automation', 'Information'])} navigate={navigate} onView={viewAlert} /><NotificationAuditTimeline audit={data.audit} /></section>
          <aside className="notification-right"><FinancialAlerts alerts={byType(['Payment', 'Financial', 'Payment Vault', 'CFO Command'])} navigate={navigate} /><TechnicalAlerts alerts={byType(['Technical', 'CTO Command'])} navigate={navigate} /><ShipmentAlerts alerts={byType(['Shipment', 'Shipment System'])} navigate={navigate} /><SupplierAlerts alerts={byType(['Supplier', 'Supplier Control'])} navigate={navigate} /><NotificationDeliveryPrep /></aside>
        </main>
      )}
    </ExportOSShell>
  );
}

function getOperationalDeliveryChannel(item = {}) {
  const text = `${item.title || ''} ${item.message || ''} ${item.source_module || ''} ${item.notification_type || ''} ${item.status || ''} ${item.severity || ''}`.toLowerCase();
  const isDailyBriefing = text.includes('daily briefing') || text.includes('morning briefing');
  const isHourlyBriefing = text.includes('hourly briefing') || text.includes('hourly update');
  const isApproval = text.includes('approval') || text.includes('founder review') || text.includes('director decision');
  const approvalTimeBreached = isApproval && (
    text.includes('overdue')
    || text.includes('no approval')
    || text.includes('response time breached')
    || text.includes('timeframe breached')
    || text.includes('waiting too long')
    || text.includes('escalated')
  );
  if (isDailyBriefing) {
    return { channel: 'WhatsApp', note: 'Daily briefing only' };
  }
  if (approvalTimeBreached) {
    return { channel: 'WhatsApp', note: 'Approval overdue escalation' };
  }
  if (isHourlyBriefing) {
    return { channel: 'Slack', note: 'Hourly briefing default' };
  }
  if (isApproval) {
    return { channel: 'Slack', note: 'Approval default' };
  }
  return { channel: 'Slack', note: 'Internal ops default' };
}

function NotificationCard({ alert, navigate, onView, onEscalate, children }) {
  const delivery = getOperationalDeliveryChannel(alert);
  return <article className={`notification-card severity-${String(alert.severity).toLowerCase().replaceAll(' ', '-')}`}><div className="notification-card-top"><div><strong>{alert.title}</strong><span>{alert.notification_type} / {alert.source_module}</span></div><SeverityBadge severity={alert.severity} /></div><p>{alert.message}</p><div className={`notification-channel channel-${delivery.channel.toLowerCase()}`}><Mail size={13} /><span>{delivery.channel}</span><small>{delivery.note}</small></div><footer><StatusBadge label={alert.viewed_by_founder ? 'Viewed' : alert.status} state={getApprovalState(alert.status)} /><button onClick={() => navigate(alert.linked_route || '/export-os')}>Open Linked Workflow</button>{onView && <button onClick={() => onView(alert)}>Mark Viewed</button>}{onEscalate && <button onClick={() => onEscalate(alert)}>Escalate</button>}</footer>{children}</article>;
}

function AlertPanelShell({ title, subtitle, icon: Icon, alerts, emptyText, children }) {
  return <section className="notification-panel"><div className="approval-section-header"><div><span>{title}</span><h2>{subtitle}</h2></div><Icon size={18} /></div>{alerts.length ? children : <p className="notification-empty">{emptyText || 'No alerts in this group under current filters.'}</p>}</section>;
}

function PriorityAlertsPanel({ alerts, navigate, onView, onEscalate }) {
  return <AlertPanelShell title="Priority Alerts" subtitle="Highest-priority executive events" icon={TriangleAlert} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate} onView={onView} onEscalate={onEscalate} />)}</AlertPanelShell>;
}

function ApprovalNotifications({ alerts, navigate, onAction }) {
  return <AlertPanelShell title="Approval Notifications" subtitle="Quotation, invoice, payment, document, and marketing approvals" icon={ShieldCheck} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate}>{alert.approval && <div className="notification-action-row">{['Approve', 'Reject', 'Request Revision'].map((action) => <button key={action} onClick={() => onAction(action, alert)}>{action}</button>)}</div>}</NotificationCard>)}</AlertPanelShell>;
}

function OperationsAlerts({ alerts, navigate, onView, onEscalate }) {
  return <AlertPanelShell title="Operations Alerts" subtitle="Blocked workflows, overdue tasks, dispatch and warehouse issues" icon={Workflow} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate} onView={onView} onEscalate={onEscalate} />)}</AlertPanelShell>;
}

function FinancialAlerts({ alerts, navigate }) {
  return <AlertPanelShell title="Financial Alerts" subtitle="Margins, renewals, OTP, Payment Vault, spend warnings" icon={CircleDollarSign} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate} />)}</AlertPanelShell>;
}

function TechnicalAlerts({ alerts, navigate }) {
  return <AlertPanelShell title="Technical Alerts" subtitle="API, deployment, automation, credits, integration issues" icon={Network} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate} />)}</AlertPanelShell>;
}

function ShipmentAlerts({ alerts, navigate }) {
  return <AlertPanelShell title="Shipment Alerts" subtitle="Delayed shipments, missing export docs, logistics risk" icon={Route} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate} />)}</AlertPanelShell>;
}

function SupplierAlerts({ alerts, navigate }) {
  return <AlertPanelShell title="Supplier Alerts" subtitle="Confirmations, quality, stock, procurement risk" icon={Factory} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate} />)}</AlertPanelShell>;
}

function WorkflowNotifications({ alerts, navigate, onView }) {
  return <AlertPanelShell title="Workflow Notifications" subtitle="Started, blocked, escalated, retry, automation paused" icon={Activity} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate} onView={onView} />)}</AlertPanelShell>;
}

function FounderEscalationPanel({ alerts, navigate }) {
  return <AlertPanelShell title="Founder Escalations" subtitle="High-risk issues requiring founder visibility" icon={Bell} alerts={alerts}>{alerts.map((alert) => <NotificationCard key={alert.id} alert={alert} navigate={navigate} />)}</AlertPanelShell>;
}

function NotificationAuditTimeline({ audit }) {
  return <section className="notification-panel"><div className="approval-section-header"><div><span>Notification Audit Timeline</span><h2>Event trace</h2></div><ClipboardList size={18} /></div><div className="notification-audit-timeline">{audit.map((event) => <article key={event.id}><time>{event.created_at}</time><div><strong>{event.event}</strong><span>{event.actor} / {event.status}</span></div></article>)}</div></section>;
}

function NotificationDeliveryPrep() {
  const channels = [
    ['WhatsApp', 'Daily briefing and overdue approval escalation only'],
    ['Slack', 'Default for approvals, hourly briefings, and internal alerts'],
    ['In-app notifications', 'Always shown inside GOPU OS'],
    ['Email', 'Buyer/external communication drafts only'],
    ['Push / Mobile', 'Future mobile alert layer']
  ];
  return <section className="notification-panel"><div className="approval-section-header"><div><span>Delivery Prep</span><h2>Channel routing policy</h2></div><Send size={18} /></div><div className="notification-delivery-grid">{channels.map(([item, note]) => <span key={item}>{item}<small>{note}</small></span>)}</div><p className="notification-empty">Rule: daily briefing uses WhatsApp. If an approval gets no response inside the set timeframe, escalate by WhatsApp. All normal approvals, hourly briefings, and internal alerts route to Slack.</p></section>;
}

function FounderMobileCommandMode({ navigate, onBack, initialView = 'Home' }) {
  const [activeView, setActiveView] = useState(initialView);
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadMobileCommand() {
      const response = await getFounderMobileCommandData(demoTenantId);
      if (!active) return;
      setData(response.data);
    }
    loadMobileCommand();
    return () => { active = false; };
  }, []);

  async function handleApprovalAction(action, approval) {
    setConfirmAction(null);
    const note = `Mobile founder action: ${action}.`;
    let response;
    if (action === 'Approve') response = await approveRequest(demoTenantId, approval, note);
    if (action === 'Reject') response = await rejectRequest(demoTenantId, approval, note);
    if (action === 'Request Revision') response = await requestRevision(demoTenantId, approval, note);
    setNotice(`${approval.title} -> ${response?.data?.status || action}`);
    if (action === 'Approve') announceToSR('Request approved successfully');
    if (action === 'Reject') announceToSR('Request rejected', 'assertive');
    const refreshed = await getFounderMobileCommandData(demoTenantId);
    setData(refreshed.data);
  }

  const navItems = [
    ['Home', Command],
    ['Approvals', ShieldCheck],
    ['Operations', Workflow],
    ['Payments', CircleDollarSign],
    ['Briefings', FileText]
  ];

  return (
    <ExportOSShell className="founder-mobile-shell">
      <main className="founder-phone-frame">
        <header className="mobile-command-header">
          <button className="mobile-icon-button" onClick={onBack} aria-label="Back to command deck"><ArrowLeft size={18} /></button>
          <div><span>GOPU Export OS</span><h1>Founder Mobile Command</h1></div>
          <button className="mobile-icon-button" onClick={() => setNotice('Quick lock mode enabled in local. Secure session remains visible.')} aria-label="Quick lock"><LockKeyhole size={18} /></button>
        </header>
        <section className="mobile-security-strip">
          <span><Fingerprint size={15} />Biometric pending</span>
          <span><ShieldCheck size={15} />Secure session</span>
          <span><Bell size={15} />Priority alerts</span>
        </section>
        {notice && <div className="mobile-notice"><StatusPulse /><span>{notice}</span></div>}
        {!data ? <MobileLoadingState /> : (
          <section className="mobile-command-content">
            {activeView === 'Home' && <FounderMobileHome data={data} navigate={navigate} setView={setActiveView} />}
            {activeView === 'Approvals' && <MobileApprovalCards approvals={data.approvals} onAction={(action, approval) => setConfirmAction({ action, approval })} />}
            {activeView === 'Operations' && <MobileOperationsPanel data={data} navigate={navigate} />}
            {activeView === 'Payments' && <MobilePaymentPanel data={data} navigate={navigate} />}
            {activeView === 'Briefings' && <MobileBriefingPanel data={data} navigate={navigate} />}
          </section>
        )}
        <nav className="mobile-bottom-nav" aria-label="Founder mobile navigation">
          {navItems.map(([label, Icon]) => <button key={label} className={activeView === label ? 'active' : ''} onClick={() => setActiveView(label)}><Icon size={18} /><span>{label}</span></button>)}
        </nav>
      </main>
      {confirmAction && (
        <div className="mobile-confirm-overlay" role="dialog" aria-modal="true">
          <section className="mobile-confirm-modal">
            <div className="approval-section-header"><div><span>Confirm Action</span><h2>{confirmAction.action}</h2></div><ShieldCheck size={18} /></div>
            <p>This records a founder mobile action for <strong>{confirmAction.approval.title}</strong>. It does not send emails, release documents, execute payments, or bypass workflow validation.</p>
            <div className="mobile-confirm-actions">
              <button className="tactical-button" onClick={() => handleApprovalAction(confirmAction.action, confirmAction.approval)}>Confirm {confirmAction.action}</button>
              <button className="ghost-button" onClick={() => setConfirmAction(null)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </ExportOSShell>
  );
}

function MobileLoadingState() {
  return <section className="mobile-card mobile-loading"><StatusPulse /><strong>Loading founder command...</strong><span>Approvals, blockers, payments, shipments, and briefings are being prepared.</span></section>;
}

function FounderMobileHome({ data, navigate, setView }) {
  const metrics = [['Pending Approvals', data.counts.approvals, 'Approval Needed'], ['Blocked Workflows', data.counts.blocked, 'High Risk'], ['Active Risks', data.counts.risks, 'Attention'], ['Payment Alerts', data.counts.payments, 'Review Required']];
  return <div className="mobile-screen-stack"><MobileRiskBanner risks={data.risks} /><section className="mobile-metric-grid">{metrics.map(([label, value, status]) => <article key={label}><span>{label}</span><strong>{value}</strong><StatusBadge label={status} state={getApprovalState(status)} /></article>)}</section><section className="mobile-card"><div className="mobile-section-title"><span>Founder Briefing Summary</span><strong>Action-first overview</strong></div><div className="mobile-brief-list">{data.briefingPlan.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div></section><MobileNotificationCenter risks={data.risks} /><MobileExecutiveSummary summaries={data.executiveSummaries} navigate={navigate} /><MobileQuickActions navigate={navigate} setView={setView} /></div>;
}

function MobileRiskBanner({ risks }) {
  const topRisk = risks[0];
  return <section className="mobile-risk-banner"><TriangleAlert size={20} /><div><span>{topRisk[1]}</span><strong>{topRisk[0]}</strong><small>{topRisk[2]}</small></div></section>;
}

function MobileNotificationCenter({ risks }) {
  return <section className="mobile-card"><div className="mobile-section-title"><span>Priority Alerts</span><strong>Critical / High Risk / Attention</strong></div><div className="mobile-list">{risks.map(([title, severity, note]) => <article key={title}><div><strong>{title}</strong><SeverityBadge severity={severity} /></div><span>{note}</span></article>)}</div></section>;
}

function MobileExecutiveSummary({ summaries, navigate }) {
  return <section className="mobile-card"><div className="mobile-section-title"><span>Executive Summaries</span><strong>COO / CFO / CTO / CMO</strong></div><div className="mobile-exec-grid">{summaries.map(([commandName, summary, status, route]) => <button key={commandName} onClick={() => navigate(route)}><strong>{commandName}</strong><span>{summary}</span><StatusBadge label={status} state={getApprovalState(status)} /></button>)}</div></section>;
}

function MobileQuickActions({ navigate, setView }) {
  const actions = [['Approve', () => setView('Approvals'), ShieldCheck], ['Escalate', () => navigate('/export-os/director'), TriangleAlert], ['Open CFO', () => navigate('/export-os/executives/cfo'), CircleDollarSign], ['Open COO', () => navigate('/export-os/executives/coo'), Workflow], ['Shipments', () => navigate('/export-os/shipments'), Route], ['Payment Vault', () => navigate('/export-os/payment-vault'), LockKeyhole]];
  return <section className="mobile-card"><div className="mobile-section-title"><span>Quick Actions</span><strong>Large touch controls</strong></div><div className="mobile-action-grid">{actions.map(([label, onClick, Icon]) => <button key={label} onClick={onClick}><Icon size={18} /><span>{label}</span></button>)}</div></section>;
}

function MobileApprovalCards({ approvals, onAction }) {
  return <div className="mobile-screen-stack"><section className="mobile-card"><div className="mobile-section-title"><span>Mobile Approvals</span><strong>Founder decision queue</strong></div><div className="mobile-approval-stack">{approvals.length === 0 ? <EmptyState icon={CheckCircle2} title="All clear" description="No pending approvals at this time." /> : approvals.map((approval) => <article key={approval.id} className="mobile-approval-card"><div><strong>{approval.title}</strong><SeverityBadge severity={approval.risk_level} /></div><span>{approval.department} / {approval.amount || approval.category || 'Workflow approval'}</span><p>{approval.summary}</p><small>Next action: {approval.details?.next_action || 'Approve, reject, or request revision.'}</small><div className="mobile-card-actions">{['Approve', 'Reject', 'Request Revision'].map((action) => <button key={action} onClick={() => onAction(action, approval)}>{action}</button>)}</div></article>)}</div></section></div>;
}

function MobileOperationsPanel({ data, navigate }) {
  const rows = [...data.blockedTasks.map((task) => [task.title, task.priority, task.blocking_reason || task.next_action, task.linked_route]), ...data.shipments.map(([id, product, stage, eta, risk]) => [`${id} / ${product}`, risk, `${stage} / ETA ${eta}`, '/export-os/shipments'])].slice(0, 8);
  return <div className="mobile-screen-stack"><section className="mobile-card"><div className="mobile-section-title"><span>Operations</span><strong>Blockers and shipment watch</strong></div><div className="mobile-list">{rows.map(([title, severity, note, route]) => <button key={title} onClick={() => navigate(route)}><div><strong>{title}</strong><SeverityBadge severity={severity} /></div><span>{note}</span></button>)}</div></section></div>;
}

function MobilePaymentPanel({ data, navigate }) {
  return <div className="mobile-screen-stack"><section className="mobile-card"><div className="mobile-section-title"><span>Payments</span><strong>CFO-controlled payment watch</strong></div><div className="mobile-list">{data.payments.map(([vendor, amount, status, category, note]) => <article key={vendor}><div><strong>{vendor}</strong><StatusBadge label={status} state={getPaymentState(status)} /></div><span>{amount} / {category}</span><small>{note}</small></article>)}</div></section><section className="mobile-card mobile-otp-panel"><div className="mobile-section-title"><span>OTP Rule</span><strong>Founder owns verification</strong></div>{['Founder receives OTP externally.', 'Founder shares OTP securely with CFO.', 'CFO enters OTP once.', 'GOPU OS never stores, logs, reuses, auto-reads, or AI-handles OTP.'].map((rule) => <span key={rule}>{rule}</span>)}<button className="tactical-button" onClick={() => navigate('/export-os/payment-vault')}>Open Payment Vault</button></section></div>;
}

function MobileBriefingPanel({ data, navigate }) {
  return <div className="mobile-screen-stack"><MobileExecutiveSummary summaries={data.executiveSummaries} navigate={navigate} /><section className="mobile-card"><div className="mobile-section-title"><span>Founder Action Plan</span><strong>Todays mobile briefing</strong></div><div className="mobile-brief-list">{data.briefingPlan.map((item) => <span key={item}>{item}</span>)}</div><div className="mobile-card-actions"><button onClick={() => navigate('/export-os/morning-briefing')}>Open Full Briefing</button><button onClick={() => navigate('/export-os/director')}>Open Director Queue</button></div></section></div>;
}

function CIOCommandPage({ navigate, onBack, view = 'overview', importerId }) {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [importers, setImporters] = useState([]);
  const [selectedId, setSelectedId] = useState(importerId || '');
  const [selectedImporter, setSelectedImporter] = useState(null);
  const [filters, setFilters] = useState({ search: '', country: 'All', product: 'All', importerType: 'All', confidence: 'All', source: 'All', status: 'All' });
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      const response = await getImporterIntelligenceDashboard();
      if (!active) return;
      setData(response.data);
      setImporters(response.data.importers);
      if (!selectedId) setSelectedId(response.data.importers[0]?.id || '');
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function runSearch() {
      const response = await searchImporters(filters);
      if (active) setImporters(response.data);
    }
    runSearch();
    return () => { active = false; };
  }, [filters]);

  useEffect(() => {
    let active = true;
    async function loadImporter() {
      if (!selectedId) return;
      const response = await getImporterById(selectedId);
      if (active) setSelectedImporter(response.data);
    }
    loadImporter();
    return () => { active = false; };
  }, [selectedId]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openImporter(id) {
    setSelectedId(id);
    navigate(`/export-os/importers/${id}`);
  }

  async function generateEmail(type = 'First introduction', importerOverrideId) {
    const targetId = importerOverrideId || selectedImporter?.id || selectedId || importers[0]?.id;
    if (!targetId) {
      setNotice('Select an importer before generating an email draft.');
      return;
    }
    const response = await generateImporterEmailDraft(targetId, type);
    setDraft(response.data.draft_content);
    setNotice(response.data.note);
  }

  async function generateWhatsApp(importerOverrideId) {
    const targetId = importerOverrideId || selectedImporter?.id || selectedId || importers[0]?.id;
    if (!targetId) {
      setNotice('Select an importer before generating a WhatsApp draft.');
      return;
    }
    const response = await generateImporterWhatsAppDraft(targetId);
    setDraft(response.data.draft_content);
    setNotice(response.data.note);
  }

  async function runVerification() {
    const response = await verifyImporter(selectedId);
    setNotice(`${response.data.status} / ${response.data.confidenceScore}% confidence. ${response.data.note}`);
  }

  async function assignOwner(owner) {
    const response = await assignImporterOwner(selectedId, owner);
    setNotice(response.data.audit_note);
  }

  async function convertToCRM() {
    const response = await convertImporterToBuyerCRM(selectedId);
    setNotice(`${response.data.status}: ${response.data.company_name}`);
  }

  async function saveNote() {
    if (!note.trim()) return;
    const response = await addImporterFounderNote(selectedId, note.trim());
    setNotice(response.data.status);
    setNote('');
  }

  const summary = data?.summary || {};
  const visibleImporter = selectedImporter || importers[0];
  const currentView = view === 'detail' ? 'database' : view;
  const activeImporter = selectedImporter || importers[0] || data?.importers?.[0];

  return (
    <ExportOSShell className="cio-shell">
      <header className="deck-header cio-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>Global Export Intelligence Center</h1>
          <p>Clean importer intelligence, source status, market signals, trade events, and outreach preparation. Live connectors are prepared but not claimed until connected.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={`SAMPLE IMPORTERS: ${summary.activeImporterRecords || 0}`} state="progress" />
          <StatusBadge label="Live data not connected" state="attention" />
          <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <nav className="cio-tabs" aria-label="CIO importer intelligence navigation">
        {[
          ['overview', 'Overview', '/export-os/cio'],
          ['database', 'Importer Database', '/export-os/importers'],
          ['signals', 'Market Signals', '/export-os/global-trade-intelligence'],
          ['outreach', 'Buyer Outreach', '/export-os/buyer-outreach'],
          ['events', 'Trade Events', '/export-os/trade-events'],
          ['reports', 'Reports', '/export-os/cio-reports']
        ].map(([key, label, path]) => (
          <button key={key} className={currentView === key ? 'active' : ''} onClick={() => navigate(path)}>{label}</button>
        ))}
      </nav>

      {!data ? <section className="cio-panel cio-loading"><StatusPulse /><strong>Loading importer intelligence...</strong></section> : (
        <main className="cio-clean-main">
          <CIOFilterBar filters={filters} updateFilter={updateFilter} data={data} />
          <LiveDataNotice summary={summary} />
          {currentView === 'overview' && <CIOOverviewTab data={data} importers={importers} navigate={navigate} />}
          {currentView === 'database' && view !== 'detail' && <ImporterDatabaseTab importers={importers} selectedImporter={activeImporter} onOpen={openImporter} onSelect={setSelectedId} />}
          {view === 'detail' && <ImporterDetailPage importer={visibleImporter} draft={draft} notice={notice} onBack={() => navigate('/export-os/importers')} onEmail={generateEmail} onWhatsApp={generateWhatsApp} onVerify={runVerification} onAssign={assignOwner} onConvert={convertToCRM} note={note} setNote={setNote} onSaveNote={saveNote} />}
          {currentView === 'signals' && <MarketSignalsPanel signals={data.marketSignals} />}
          {currentView === 'outreach' && <OutreachComposer importers={importers} selectedImporter={activeImporter} selectedId={selectedId} onSelect={setSelectedId} draft={draft} notice={notice} onEmail={generateEmail} onWhatsApp={generateWhatsApp} />}
          {currentView === 'events' && <TradeEventsPanel events={data.tradeEvents} />}
          {currentView === 'reports' && <CIOReportsPanel data={data} importers={importers} />}
          {notice && <section className="cio-panel cio-notice"><strong>System Note</strong><p>{notice}</p></section>}
        </main>
      )}
    </ExportOSShell>
  );
}

function formatCioDate(value) {
  if (!value) return 'Not synced';
  return new Date(value).toLocaleDateString([], { dateStyle: 'medium' });
}

function getUniqueValues(items, key) {
  return ['All', ...Array.from(new Set(items.map((item) => item[key]).filter(Boolean))).sort()];
}

function getUniqueProducts(importers) {
  return ['All', ...Array.from(new Set(importers.flatMap((item) => item.products || []))).sort()];
}

function CIOFilterBar({ filters, updateFilter, data }) {
  const importers = data.importers || [];
  const sources = ['All', ...Array.from(new Set(data.dataSources.map((item) => item.source_name).concat(importers.map((item) => item.source)).filter(Boolean))).sort()];
  const statuses = ['All', ...Array.from(new Set(importers.flatMap((item) => [item.verification_status, item.outreach_status]).filter(Boolean))).sort()];
  return (
    <section className="cio-filter-shell" aria-label="CIO search and filters">
      <label className="cio-search-field">
        <Search size={16} />
        <input aria-label="Search leads" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search company, country, product, source, email, phone, LinkedIn" />
      </label>
      <div className="cio-filter-grid">
        <CIOSelect label="Country" value={filters.country} onChange={(value) => updateFilter('country', value)} options={['All', ...(data.countries || [])]} />
        <CIOGroupedSelect label="Product" value={filters.product} onChange={(value) => updateFilter('product', value)} options={data.productOptions || []} />
        <CIOSelect label="Importer Type" value={filters.importerType} onChange={(value) => updateFilter('importerType', value)} options={getUniqueValues(importers, 'importer_type')} />
        <CIOSelect label="Confidence" value={filters.confidence} onChange={(value) => updateFilter('confidence', value)} options={['All', 'High', 'Medium', 'Low']} />
        <CIOSelect label="Source" value={filters.source} onChange={(value) => updateFilter('source', value)} options={sources} />
        <CIOSelect label="Status" value={filters.status} onChange={(value) => updateFilter('status', value)} options={statuses} />
      </div>
    </section>
  );
}

function CIOSelect({ label, value, onChange, options }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select></label>;
}

function CIOGroupedSelect({ label, value, onChange, options }) {
  const groups = options.reduce((acc, item) => ({ ...acc, [item.group]: [...(acc[item.group] || []), item.label] }), {});
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option>All</option>
        {Object.entries(groups).map(([group, labels]) => (
          <optgroup key={group} label={group}>
            {labels.map((item) => <option key={`${group}-${item}`} value={item}>{item}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function LiveDataNotice({ summary }) {
  return <section className="cio-live-notice"><StatusPulse /><strong>{summary.dataMode || 'Live data not connected --ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â using local/sample records.'}</strong><span>No live importer, trade, LinkedIn, Google, APEDA, Spice Board, or CSV source is claimed as connected.</span></section>;
}

function CIOOverviewTab({ data, importers, navigate }) {
  const topImporters = [...importers].sort((a, b) => (b.strategic_opportunity_score || 0) - (a.strategic_opportunity_score || 0)).slice(0, 5);
  const topCountries = rankImporterValues(importers, (item) => item.country).slice(0, 5);
  const topProducts = rankImporterValues(importers, (item) => item.products || []).slice(0, 5);
  const alerts = [
    `${data.summary.needsReview || 0} records need manual verification or carry high buyer risk.`,
    'All live connectors are currently not connected; do not treat sample records as verified live intelligence.',
    'Outreach should start only after importer selection and human review.'
  ];
  return (
    <div className="cio-tab-stack">
      <section className="cio-panel cio-summary-panel">
        <div className="approval-section-header"><div><span>Overview</span><h2>Global opportunity summary</h2></div><Database size={18} /></div>
        <div className="cio-summary-grid">
          <CIOStat label="Sample Importers" value={data.summary.activeImporterRecords} note="Current filtered/sample data" />
          <CIOStat label="Countries" value={data.countries.length} note="Importer market dropdown coverage" />
          <CIOStat label="High Confidence" value={data.summary.highConfidence} note="Score 70+" />
          <CIOStat label="Products" value={(data.productOptions || []).length} note={data.summary.productCoverage} />
        </div>
        <p>{data.summary.nextAction}</p>
      </section>
      <section className="cio-overview-grid">
        <CIOListPanel title="Top 5 importer opportunities" items={topImporters.map((item) => ({ id: item.id, title: item.company_name, meta: `${item.country} / ${item.products.join(', ')}`, value: `${item.strategic_opportunity_score}%`, onClick: () => navigate(`/export-os/importers/${item.id}`) }))} />
        <CIOListPanel title="Top 5 countries" items={topCountries.map((item) => ({ id: item.label, title: item.label, meta: `${item.count} records`, value: item.count }))} />
        <CIOListPanel title="Top 5 products" items={topProducts.map((item) => ({ id: item.label, title: item.label, meta: `${item.count} records`, value: item.count }))} />
        <section className="cio-panel"><div className="approval-section-header"><div><span>Strategic alerts</span><h2>Decision watch</h2></div><AlertTriangle size={18} /></div><div className="cio-alert-list">{alerts.map((item) => <p key={item}>{item}</p>)}</div></section>
      </section>
      <LiveDataStatusPanel sources={data.dataSources} />
    </div>
  );
}

function CIOStat({ label, value, note }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function rankImporterValues(importers, selector) {
  const counts = new Map();
  importers.forEach((item) => {
    const value = selector(item);
    const values = Array.isArray(value) ? value : [value];
    values.filter(Boolean).forEach((entry) => counts.set(entry, (counts.get(entry) || 0) + 1));
  });
  return Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function CIOListPanel({ title, items }) {
  return <section className="cio-panel"><div className="approval-section-header"><div><span>Priority list</span><h2>{title}</h2></div><Target size={18} /></div><div className="cio-ranked-list">{items.map((item) => <button key={item.id} type="button" onClick={item.onClick} disabled={!item.onClick}><strong>{item.title}</strong><span>{item.meta}</span><em>{item.value}</em></button>)}</div></section>;
}

function LiveDataStatusPanel({ sources }) {
  const sampleSource = sources.find((source) => source.connection_status === 'Sample Loaded');
  const setupSources = sources.filter((source) => source.connection_status !== 'Sample Loaded');
  return (
    <section className="cio-panel">
      <div className="approval-section-header"><div><span>Data source readiness</span><h2>Prepared live source options</h2></div><RadioTower size={18} /></div>
      <p>The app is ready for these source types, but API keys, external links, authenticated search, and directory connectors must be routed to CTO Command. CIO uses approved data after CTO connects it.</p>
      {sampleSource && <div className="cio-source-current"><strong>{sampleSource.records_count} sample records loaded</strong><span>{sampleSource.next_sync}</span></div>}
      <div className="cio-source-card-grid">
        {setupSources.map((source) => <article key={source.source_name}><div><strong>{source.source_name}</strong><StatusBadge label={source.connection_status} state="attention" /></div><span>{source.next_sync}</span><small>{source.error_message}</small><em>Owner: CTO Command</em></article>)}
      </div>
    </section>
  );
}

function ImporterDatabaseTab({ importers, selectedImporter, onOpen, onSelect }) {
  const topCountries = rankImporterValues(importers, (item) => item.country).slice(0, 5);
  const topProducts = rankImporterValues(importers, (item) => item.products || item.product_interest || []).slice(0, 5);
  return (
    <section className="cio-database-layout">
      <div className="cio-panel">
        <div className="cio-sample-banner">
          <AlertTriangle size={16} />
          <span>Sample Data - Verify before outreach. Do not treat these records as verified live leads.</span>
        </div>
        <div className="approval-section-header"><div><span>Importer Database</span><h2>{importers.length} records in current view</h2></div><Building2 size={18} /></div>
        <div className="cio-importer-insight-grid">
          <div>
            <strong>Top 5 Countries</strong>
            {topCountries.map((item) => <span key={item.label}>{item.label}: {item.count}</span>)}
          </div>
          <div>
            <strong>Top 5 Products</strong>
            {topProducts.map((item) => <span key={item.label}>{item.label}: {item.count}</span>)}
          </div>
        </div>
        <ImporterTable importers={importers} onOpen={onOpen} onSelect={onSelect} />
      </div>
      <ImporterSideDetail importer={selectedImporter} onOpen={onOpen} />
    </section>
  );
}

function ImporterTable({ importers, onOpen, onSelect }) {
  const [page, setPage] = React.useState(1);
  const PER_PAGE = 50;
  const paged = importers.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(importers.length / PER_PAGE));
  React.useEffect(() => {
    setPage(1);
  }, [importers.length]);
  return (
    <div className="cio-clean-table cio-importer-table">
      <div className="cio-table-head">{['Company', 'Country', 'Importer Type', 'Products', 'Email', 'Phone', 'LinkedIn', 'Confidence', 'Status', 'Action'].map((item) => <span key={item}>{item}</span>)}</div>
      {paged.map((importer) => (
        <div key={importer.id}>
          <button type="button" className="cio-company-link" onMouseEnter={() => onSelect(importer.id)} onFocus={() => onSelect(importer.id)} onClick={() => onOpen(importer.id)}>{importer.company_name}</button>
          <span>{importer.country}</span>
          <span>{importer.importer_type}</span>
          <span>{importer.products.join(', ')}</span>
          <span>{importer.email || 'Missing'}</span>
          <span>{importer.phone || 'Missing'}</span>
          <span>{importer.linkedin ? 'Available' : 'Missing'}</span>
          <strong>{importer.confidence_score}%</strong>
          <StatusBadge label={importer.verification_status} state={importer.confidence_score >= 70 ? 'progress' : 'attention'} />
          <button type="button" className="ghost-button" onClick={() => onOpen(importer.id)}>Open</button>
        </div>
      ))}
      <div className="cio-importer-pagination">
        <button className="ghost-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
        <span>Page {page} of {totalPages} / {importers.length} records</span>
        <button className="ghost-button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
      </div>
    </div>
  );
}

function ImporterSideDetail({ importer, onOpen }) {
  if (!importer) return null;
  return (
    <aside className="cio-panel cio-side-detail">
      <span className="coo-kicker">Side detail</span>
      <h2>{importer.company_name}</h2>
      <p>{importer.company_description}</p>
      <dl>
        <div><dt>Country</dt><dd>{importer.city}, {importer.country}</dd></div>
        <div><dt>Products</dt><dd>{importer.products.join(', ')}</dd></div>
        <div><dt>Source</dt><dd>{importer.source || importer.source_platform}</dd></div>
        <div><dt>Confidence</dt><dd>{importer.confidence_score}% / {importer.verification_status}</dd></div>
      </dl>
      <button className="tactical-button" onClick={() => onOpen(importer.id)}>Open full profile</button>
    </aside>
  );
}

function ImporterDetailPage({ importer, draft, notice, onBack, onEmail, onWhatsApp, onVerify, onAssign, onConvert, note, setNote, onSaveNote }) {
  if (!importer) return null;
  const estimates = importer.estimates || {};
  const detailRows = [
    ['Company', importer.company_name],
    ['Country', `${importer.city}, ${importer.country}`],
    ['Importer Type', importer.importer_type],
    ['Website', importer.website || 'Missing'],
    ['Email', importer.email || 'Missing'],
    ['Phone', importer.phone || 'Missing'],
    ['LinkedIn', importer.linkedin || 'Missing'],
    ['Source', importer.source || importer.source_platform],
    ['Source URL', importer.source_url || 'Missing'],
    ['Last Synced', formatCioDate(importer.last_synced_at)],
    ['Confidence', `${importer.confidence_score}% (${importer.confidence_level})`],
    ['Status', importer.verification_status]
  ];
  return (
    <section className="cio-panel importer-detail institutional-profile">
      <div className="approval-section-header"><div><span>Importer Profile</span><h2>{importer.company_name}</h2></div><button className="ghost-button" onClick={onBack}><ArrowLeft size={15} />Back to Database</button></div>
      <div className="cio-profile-grid">
        <article><span>Opportunity Score</span><strong>{importer.strategic_opportunity_score}%</strong><small>{importer.strategic_opportunity_tier}</small></article>
        <article><span>Relationship Status</span><strong>{importer.relationship_status}</strong><small>{importer.assigned_owner}</small></article>
        <article><span>Buyer Risk</span><strong>{importer.buyer_risk}</strong><small>{importer.verification_status}</small></article>
      </div>
      <div className="cio-detail-grid">
        <section><h3>Record Data</h3>{detailRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
        <section><h3>Trade Fit</h3><p>{importer.company_description}</p><small>Products: {importer.products.join(', ')}</small><small>APEDA: {(importer.apeda_relevance || []).join(', ') || 'Not mapped'}</small><small>Spice Board: {(importer.spice_board_relevance || []).join(', ') || 'Not mapped'}</small></section>
        <section><h3>Commercial Notes</h3><p>{importer.communication_notes}</p><small>Preferred shipment: {importer.preferred_shipment_type || 'Needs review'}</small><small>Payment terms: {importer.preferred_payment_terms || 'Needs review'}</small></section>
        <section><h3>Operating Assumptions</h3><p>{estimates.shipment_expectations}</p><small>{estimates.operational_complexity}</small><small>{estimates.documentation_sensitivity}</small></section>
      </div>
      <div className="cio-action-row">
        <button className="tactical-button" onClick={() => onEmail('First introduction', importer.id)}>Generate Email Draft</button>
        <button className="ghost-button" onClick={() => onWhatsApp(importer.id)}>Generate WhatsApp Draft</button>
        <button className="ghost-button" onClick={onVerify}>Run Verification</button>
        <button className="ghost-button" onClick={() => onAssign('COO Command')}>Assign COO</button>
        <button className="ghost-button" onClick={() => onAssign('CMO Command')}>Assign CMO</button>
        <button className="ghost-button" onClick={onConvert}>Prepare Buyer CRM Draft</button>
      </div>
      {(draft || notice) && <div className="cio-generated-draft"><strong>{notice || 'Draft generated'}</strong><pre>{draft || 'No draft content yet.'}</pre></div>}
      <div className="importer-note-row"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add founder note for this importer" /><button className="tactical-button" onClick={onSaveNote}>Add Founder Note</button></div>
    </section>
  );
}

function MarketSignalsPanel({ signals }) {
  return (
    <section className="cio-panel">
      <div className="approval-section-header"><div><span>Market Signals</span><h2>Sample signal board</h2></div><TrendingUp size={18} /></div>
      <div className="cio-clean-table cio-signal-table">
        <div className="cio-table-head">{['Country', 'Product', 'Signal', 'Source', 'Confidence', 'Date'].map((item) => <span key={item}>{item}</span>)}</div>
        {signals.map((signal) => <div key={signal.id}><strong>{signal.country}</strong><span>{signal.product}</span><span>{signal.signal_summary}</span><span>{signal.source}</span><StatusBadge label={signal.confidence} state={signal.confidence === 'High' ? 'progress' : 'attention'} /><span>{formatCioDate(signal.signal_date)}</span></div>)}
      </div>
      <small>Signals are sample records until trade data, directory, search, or manual CSV sources are connected.</small>
    </section>
  );
}

function TradeEventsPanel({ events }) {
  return (
    <section className="cio-panel">
      <div className="approval-section-header"><div><span>Trade Events</span><h2>Next 24 months: buyer discovery calendar</h2></div><CalendarClock size={18} /></div>
      <div className="cio-clean-table cio-events-table">
        <div className="cio-table-head">{['Event', 'Country', 'Date', 'Category', 'Relevance', 'Action', 'Apply / Register'].map((item) => <span key={item}>{item}</span>)}</div>
        {events.map((event) => <div key={event.id}><strong>{event.event}</strong><span>{event.country}</span><span>{event.date}</span><span>{event.category}</span><span>{event.relevance}</span><span>{event.action}</span><a href={event.apply_url} target="_blank" rel="noreferrer">Open link</a></div>)}
      </div>
      <small>Dates and links are sourced from official event pages or official event operators where available. CTO should verify application terms before payment, booking, or external submission.</small>
    </section>
  );
}

function OutreachComposer({ importers, selectedImporter, selectedId, onSelect, draft, notice, onEmail, onWhatsApp }) {
  return (
    <section className="cio-outreach-layout">
      <div className="cio-panel">
        <div className="approval-section-header"><div><span>Buyer Outreach</span><h2>Select importer before generating outreach</h2></div><Mail size={18} /></div>
        <div className="cio-outreach-selector">
          {importers.map((importer) => <button key={importer.id} className={selectedId === importer.id ? 'active' : ''} onClick={() => onSelect(importer.id)}><strong>{importer.company_name}</strong><span>{importer.country} / {importer.products.join(', ')}</span><small>{importer.outreach_status} / {importer.assigned_owner}</small></button>)}
        </div>
      </div>
      <div className="cio-panel outreach-composer">
        <div className="approval-section-header"><div><span>Draft Workspace</span><h2>{selectedImporter?.company_name || 'No importer selected'}</h2></div><Send size={18} /></div>
        <p>Human-style outreach draft generation is available only after an importer is selected. No external email or WhatsApp message is sent from this workspace.</p>
        <div className="cio-profile-grid compact">
          <article><span>Outreach Status</span><strong>{selectedImporter?.outreach_status || 'Select importer'}</strong><small>Draft only</small></article>
          <article><span>Assigned Executive</span><strong>{selectedImporter?.assigned_owner || 'Unassigned'}</strong><small>Internal owner</small></article>
          <article><span>Confidence</span><strong>{selectedImporter ? `${selectedImporter.confidence_score}%` : '--'}</strong><small>{selectedImporter?.verification_status || 'Not selected'}</small></article>
        </div>
        <div className="cio-action-row">
          <button className="tactical-button" disabled={!selectedImporter} onClick={() => onEmail('First introduction', selectedImporter?.id)}>Generate Email Draft</button>
          <button className="ghost-button" disabled={!selectedImporter} onClick={() => onWhatsApp(selectedImporter?.id)}>Generate WhatsApp Draft</button>
        </div>
        {notice && <small>{notice}</small>}
        <pre className="cio-draft-output">{draft || 'Select an importer, then generate a draft. Human review is required before any external outreach.'}</pre>
      </div>
    </section>
  );
}

function CIOReportsPanel({ data, importers }) {
  const rows = [
    ['Importer Records', importers.length, 'Filtered/current view'],
    ['High Confidence', importers.filter((item) => item.confidence_score >= 70).length, 'Score 70+'],
    ['Manual Review', importers.filter((item) => item.verification_status.includes('Review')).length, 'Needs human validation'],
    ['Connected Sources', data.dataSources.filter((item) => item.connection_status === 'Connected').length, 'Live source connections']
  ];
  return (
    <section className="cio-panel">
      <div className="approval-section-header"><div><span>Reports</span><h2>Export intelligence readiness</h2></div><FileBarChart size={18} /></div>
      <div className="cio-summary-grid">{rows.map(([label, value, note]) => <CIOStat key={label} label={label} value={value} note={note} />)}</div>
      <LiveDataStatusPanel sources={data.dataSources} />
    </section>
  );
}

function TrustCenterDashboard({ navigate, onBack, view = 'overview' }) {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [countryFilter, setCountryFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [selectedCert, setSelectedCert] = useState('');
  const [expandedCapability, setExpandedCapability] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadTrustData() {
      const response = await getTrustCenterData();
      if (!active) return;
      setData(response.data);
      setSelectedCert(response.data.certifications[0]?.[0] || '');
      setExpandedCapability(response.data.capabilities[0]?.[0] || '');
    }
    loadTrustData();
    return () => { active = false; };
  }, []);

  const activeCert = data?.certifications.find((item) => item[0] === selectedCert) || data?.certifications[0];
  const filteredRegions = (data?.regions || []).filter((region) => countryFilter === 'All' || region[0] === countryFilter || region[1].includes(countryFilter));
  const filteredProducts = (data?.products || []).filter((product) => productFilter === 'All' || product[0] === productFilter || product[5].includes(productFilter));

  return (
    <ExportOSShell className="trust-shell">
      <header className="deck-header trust-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>Founder Reputation + Institutional Trust Layer</h1>
          <p>Global company profile, export capabilities, compliance readiness, buyer trust signals, operational standards, and institutional intelligence for serious export relationships.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={`${data?.summary?.markets || 0} market regions`} state="progress" />
          <StatusBadge label={`${data?.summary?.certificationsUnderReview || 0} verification items`} state="attention" />
          <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <nav className="trust-tabs">
        {[
          ['overview', 'Trust Center', '/export-os/trust-center'],
          ['profile', 'Company Profile', '/export-os/company-profile'],
          ['presence', 'Global Presence', '/export-os/global-presence'],
          ['certifications', 'Certifications', '/export-os/certifications'],
          ['capabilities', 'Capabilities', '/export-os/capabilities']
        ].map(([key, label, path]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => navigate(path)}>{label}</button>)}
      </nav>

      {!data ? <section className="trust-panel trust-loading"><StatusPulse /><strong>Loading trust center...</strong></section> : (
        <>
          <TrustHero data={data} navigate={navigate} />
          <main className="trust-layout">
            <section className="trust-left">
              <TrustNavigationPanel navigate={navigate} />
              <FounderReputationPanel profile={data.profile} />
              <BuyerTrustSignals signals={data.trustSignals} />
            </section>
            <section className="trust-center">
              {(view === 'overview' || view === 'profile') && <GlobalCompanyProfile profile={data.profile} />}
              {(view === 'overview' || view === 'capabilities') && <ExportCapabilitiesPanel capabilities={data.capabilities} expanded={expandedCapability} setExpanded={setExpandedCapability} />}
              {(view === 'overview' || view === 'certifications') && <CertificationCenter certifications={data.certifications} selected={activeCert} setSelected={setSelectedCert} />}
              {(view === 'overview' || view === 'presence') && <GlobalPresenceMap regions={filteredRegions} countryFilter={countryFilter} setCountryFilter={setCountryFilter} />}
              <ProductCapabilityCenter products={filteredProducts} productFilter={productFilter} setProductFilter={setProductFilter} />
            </section>
            <aside className="trust-right">
              <OperationalStandardsPanel standards={data.operationalStandards} />
              <ShipmentStandardsPanel standards={data.shipmentStandards} />
              <InstitutionalIntelligencePanel items={data.intelligenceLayer} navigate={navigate} />
              <TrustRealismPanel />
            </aside>
          </main>
        </>
      )}
    </ExportOSShell>
  );
}

function TrustHero({ data, navigate }) {
  const metrics = [
    ['Export Regions', data.summary.markets, 'Market watch'],
    ['Product Families', data.summary.productFamilies, 'Capability center'],
    ['Operational Standards', data.summary.activeStandards, 'Workflow discipline'],
    ['Verification Items', data.summary.certificationsUnderReview, 'Under review']
  ];
  return <section className="trust-hero"><div><h2>Institutional exporter credibility, built around operational discipline.</h2><p>{data.profile.positioning}</p><div className="trust-hero-actions"><button className="tactical-button" onClick={() => navigate('/export-os/capabilities')}>View Export Capabilities</button><button className="ghost-button" onClick={() => navigate('/export-os/certifications')}>Open Compliance Readiness</button></div></div><div className="trust-hero-metrics">{metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div></section>;
}

function TrustNavigationPanel({ navigate }) {
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Institutional Trust Modules</span><h2>Partner-facing credibility system</h2></div><Network size={18} /></div><div className="trust-nav-grid">{[['Global Company Profile', '/export-os/company-profile'], ['Certifications & Compliance', '/export-os/certifications'], ['Global Presence', '/export-os/global-presence'], ['Export Capabilities', '/export-os/capabilities'], ['Importer Intelligence', '/export-os/cio']].map(([label, path]) => <button key={label} onClick={() => navigate(path)}>{label}<ChevronRight size={15} /></button>)}</div></section>;
}

function GlobalCompanyProfile({ profile }) {
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Global Company Profile</span><h2>{profile.companyName}</h2></div><Building2 size={18} /></div><p className="trust-lead">{profile.positioning}</p><div className="trust-two-grid"><article><h3>Export Vision</h3><p>{profile.philosophy}</p></article><article><h3>Industries Served</h3><div className="trust-chip-grid">{profile.industries.map((item) => <span key={item}>{item}</span>)}</div></article></div><div className="trust-chip-grid strong">{profile.strengths.map((item) => <span key={item}>{item}</span>)}</div></section>;
}

function ExportCapabilitiesPanel({ capabilities, expanded, setExpanded }) {
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Export Capabilities</span><h2>Operational capability center</h2></div><Factory size={18} /></div><div className="capability-list">{capabilities.map(([name, scope, status, detail]) => <button key={name} className={expanded === name ? 'active' : ''} onClick={() => setExpanded(expanded === name ? '' : name)}><div><strong>{name}</strong><StatusBadge label={status} state={status === 'Active' ? 'online' : status === 'Verification Needed' ? 'attention' : 'progress'} /></div><span>{scope}</span>{expanded === name && <p>{detail}</p>}</button>)}</div></section>;
}

function CertificationCenter({ certifications, selected, setSelected }) {
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Certifications & Compliance</span><h2>Readiness and verification center</h2></div><FileCheck2 size={18} /></div><div className="certification-layout"><div className="certification-list">{certifications.map((item) => <button key={item[0]} className={selected?.[0] === item[0] ? 'active' : ''} onClick={() => setSelected(item[0])}><strong>{item[0]}</strong><StatusBadge label={item[2]} state={item[2] === 'Active' ? 'online' : 'attention'} /></button>)}</div>{selected && <article className="certification-detail"><span>{selected[0]}</span><h3>{selected[1]}</h3><StatusBadge label={selected[2]} state={selected[2] === 'Active' ? 'online' : 'attention'} /><p>{selected[3]}</p><small>Do not claim certification, registration, or compliance approval unless supporting records are verified in Company Master Data Vault.</small></article>}</div></section>;
}

function GlobalPresenceMap({ regions, countryFilter, setCountryFilter }) {
  const filters = ['All', 'Country pending', 'Oman', 'GCC', 'ASEAN', 'Europe', 'Africa', 'USA'];
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Global Presence</span><h2>Strategic regions and export corridors</h2></div><Route size={18} /></div><div className="trust-filter-row">{filters.map((item) => <button key={item} className={countryFilter === item ? 'active' : ''} onClick={() => setCountryFilter(item)}>{item}</button>)}</div><div className="presence-map">{regions.map(([region, role, products, status, risk], index) => <article key={region} className={`presence-node presence-${index}`}><strong>{region}</strong><span>{role}</span><p>{products}</p><div><StatusBadge label={status} state={status.includes('Active') || status.includes('Strategic') ? 'progress' : 'attention'} /><SeverityBadge severity={risk} /></div></article>)}</div></section>;
}

function ProductCapabilityCenter({ products, productFilter, setProductFilter }) {
  const options = ['All', 'Product pending', 'Turmeric', 'Rice', 'APEDA Products', 'Spice Board Products', 'Wood / Timber Pending'];
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Product Capability Center</span><h2>Export product readiness and market fit</h2></div><PackageCheck size={18} /></div><div className="trust-filter-row">{options.map((item) => <button key={item} className={productFilter === item ? 'active' : ''} onClick={() => setProductFilter(item)}>{item}</button>)}</div><div className="product-capability-grid">{products.map(([product, packing, mode, leadTime, complexity, markets]) => <article key={product}><div><strong>{product}</strong><StatusBadge label={complexity} state={complexity === 'High' ? 'attention' : 'progress'} /></div><p>{packing}</p><small>Shipment: {mode}</small><small>Lead time: {leadTime}</small><small>Suggested markets: {markets}</small></article>)}</div></section>;
}

function OperationalStandardsPanel({ standards }) {
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Operational Standards</span><h2>Buyer confidence systems</h2></div><ClipboardCheck size={18} /></div><div className="trust-stack-list">{standards.map(([title, detail]) => <article key={title}><strong>{title}</strong><p>{detail}</p></article>)}</div></section>;
}

function ShipmentStandardsPanel({ standards }) {
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Shipment & Documentation Standards</span><h2>Export execution discipline</h2></div><FileText size={18} /></div><div className="trust-stack-list">{standards.map(([title, detail]) => <article key={title}><strong>{title}</strong><p>{detail}</p></article>)}</div></section>;
}

function FounderReputationPanel({ profile }) {
  return <section className="trust-panel founder-reputation"><div className="approval-section-header"><div><span>Founder Reputation Layer</span><h2>Founder-led operating philosophy</h2></div><Fingerprint size={18} /></div><p>{profile.philosophy}</p><div className="trust-chip-grid">{['Long-term partnership approach', 'Export discipline', 'Communication standards', 'Operational commitment', 'Market expansion vision'].map((item) => <span key={item}>{item}</span>)}</div></section>;
}

function BuyerTrustSignals({ signals }) {
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Buyer Trust Signals</span><h2>What partners can rely on</h2></div><ShieldCheck size={18} /></div><div className="trust-chip-grid strong">{signals.map((item) => <span key={item}>{item}</span>)}</div></section>;
}

function InstitutionalIntelligencePanel({ items, navigate }) {
  return <section className="trust-panel"><div className="approval-section-header"><div><span>Institutional Intelligence Layer</span><h2>Systems behind trust</h2></div><BrainCircuit size={18} /></div><div className="trust-stack-list">{items.map(([title, detail]) => <article key={title}><strong>{title}</strong><p>{detail}</p></article>)}</div><button className="tactical-button" onClick={() => navigate('/export-os/cio')}>Open CIO Intelligence</button></section>;
}

function TrustRealismPanel() {
  return <section className="trust-panel trust-realism"><div className="approval-section-header"><div><span>Realistic Disclosure</span><h2>No unverified claims</h2></div><AlertTriangle size={18} /></div>{['Certifications are shown as active only when verified records exist.', 'Country presence can be active, planned, placeholder, or under review.', 'Shipment history and buyer relationships are not fabricated.', 'Compliance approval is never claimed without supporting records.'].map((item) => <span key={item}>{item}</span>)}</section>;
}

function MarketIntelligenceDashboard({ navigate, onBack }) {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadMarketIntel() {
      const response = await getMarketIntelligenceDashboard();
      if (!active) return;
      setData(response.data);
    }
    loadMarketIntel();
    return () => { active = false; };
  }, []);

  async function generateSummary() {
    const response = await generateMarketOpportunitySummary();
    setSummary(response.data);
  }

  const visibleAlerts = (data?.opportunityAlerts || []).filter((item) => filter === 'All' || item[2] === filter || item[0] === filter);

  return (
    <ExportOSShell className="market-intelligence-shell">
      <header className="deck-header market-intelligence-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>Importer Intelligence & Market Signals</h1>
          <p>Global export opportunity intelligence layer for market-level importer demand, RFQ activity, country patterns, product shifts, and competitor movement.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={`${data?.summary?.activeSignals || 0} market signals`} state="progress" />
          <StatusBadge label={`${data?.summary?.highOpportunityAlerts || 0} high opportunities`} state="attention" />
          <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {!data ? <section className="market-panel market-loading"><StatusPulse /><strong>Loading market signals...</strong></section> : (
        <main className="market-intelligence-layout">
          <section className="market-left">
            <MarketSummaryPanel summary={data.summary} />
            <SourceReadinessPanel sources={data.sourceReadiness} />
            <MarketLimitationsPanel />
          </section>
          <section className="market-center">
            <OpportunityAlertsPanel alerts={visibleAlerts} filter={filter} onFilter={setFilter} navigate={navigate} />
            <ImporterDemandSignals signals={data.importerSignals} />
            <CountryDemandPanel rows={data.countryDemand} />
            <ProductTrendPanel rows={data.productTrends} />
          </section>
          <aside className="market-right">
            <CompetitorMovementPanel rows={data.competitorMovement} />
            <MarketRecommendationPanel summary={data.summary} onGenerate={generateSummary} output={summary} navigate={navigate} />
          </aside>
        </main>
      )}
    </ExportOSShell>
  );
}

function MarketSummaryPanel({ summary }) {
  const metrics = [
    ['Active Signals', summary.activeSignals, 'Monitoring'],
    ['High Opportunities', summary.highOpportunityAlerts, 'Attention'],
    ['Rising Countries', summary.risingCountries, 'Market shift'],
    ['Competitor Moves', summary.competitorMoves, 'Watch']
  ];
  return <section className="market-panel"><div className="approval-section-header"><div><span>Market Summary</span><h2>{summary.topCountry} / {summary.topProduct}</h2></div><Gauge size={18} /></div><div className="market-metric-grid">{metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div><p>{summary.nextAction}</p></section>;
}

function OpportunityAlertsPanel({ alerts, filter, onFilter, navigate }) {
  const filters = ['All', 'High', 'Medium', 'Attention', 'Importer Opportunity', 'Product Trend Alert', 'Pricing Opportunity'];
  return <section className="market-panel"><div className="approval-section-header"><div><span>Importer Opportunity Alerts</span><h2>Actionable market openings</h2></div><Bell size={18} /></div><div className="market-filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item}</button>)}</div><div className="market-alert-list">{alerts.map(([type, title, severity, action, route]) => <article key={title}><div><strong>{title}</strong><SeverityBadge severity={severity} /></div><span>{type}</span><p>{action}</p><button onClick={() => navigate(route)}>Open Next Workflow</button></article>)}</div></section>;
}

function ImporterDemandSignals({ signals }) {
  return <MarketTable title="Importer Demand Signals" subtitle="Market-level demand and buyer intent patterns" icon={RadioTower} columns={['Signal', 'Country/Channel', 'Product', 'Source', 'Priority', 'Change', 'Suggested action']} rows={signals} />;
}

function CountryDemandPanel({ rows }) {
  return <MarketTable title="Country Demand Patterns" subtitle="Country-level export opportunity shifts" icon={Route} columns={['Country', 'Product', 'Trend', 'Guidance', 'Priority']} rows={rows} />;
}

function ProductTrendPanel({ rows }) {
  return <MarketTable title="Product Demand Shifts" subtitle="Product category movement and commercial use" icon={TrendingUp} columns={['Product', 'Market', 'Signal', 'Risk / note', 'Opportunity']} rows={rows} />;
}

function CompetitorMovementPanel({ rows }) {
  return <MarketTable title="Competitor Export Activity" subtitle="Public market movement only" icon={Eye} columns={['Competitor', 'Platform', 'Movement', 'Opportunity', 'Priority']} rows={rows} compact />;
}

function SourceReadinessPanel({ sources }) {
  return <section className="market-panel"><div className="approval-section-header"><div><span>Signal Sources</span><h2>Future connectors prepared</h2></div><Network size={18} /></div><div className="market-source-list">{sources.map(([source, status, note]) => <article key={source}><strong>{source}</strong><StatusBadge label={status} state="progress" /><span>{note}</span></article>)}</div></section>;
}

function MarketLimitationsPanel() {
  return <section className="market-panel market-limitations"><div className="approval-section-header"><div><span>Privacy Limitations</span><h2>Market-level only</h2></div><ShieldCheck size={18} /></div>{['No private Google search tracking.', 'No private buyer surveillance.', 'No individual identity tracking.', 'Signals are aggregate/export market intelligence only.', 'Outreach suggestions remain draft-only until approved.'].map((item) => <span key={item}>{item}</span>)}</section>;
}

function MarketRecommendationPanel({ summary, onGenerate, output, navigate }) {
  return <section className="market-panel"><div className="approval-section-header"><div><span>Founder Market Recommendations</span><h2>Suggested next moves</h2></div><Sparkles size={18} /></div><div className="approval-memory-list">{['Create Country pending black pepper buyer outreach list.', 'Prepare Oman wholesale campaign draft.', 'Validate turmeric supplier readiness before RFQ response.', 'Ask CFO to monitor freight/margin impact before aggressive pricing.', 'Use CMO content to educate importers on export readiness.'].map((item) => <span key={item}>{item}</span>)}</div><div className="market-action-row"><button className="tactical-button" onClick={onGenerate}>Generate Opportunity Summary</button><button className="ghost-button" onClick={() => navigate('/export-os/campaigns')}>Open Campaigns</button><button className="ghost-button" onClick={() => navigate('/export-os/buyer-crm')}>Open Buyer CRM</button></div>{output && <pre className="market-output">{output}</pre>}<small>Current lead: {summary.topCountry} / {summary.topProduct}</small></section>;
}

function MarketTable({ title, subtitle, icon: Icon, columns, rows, compact = false }) {
  return <section className="market-panel"><div className="approval-section-header"><div><span>{title}</span><h2>{subtitle}</h2></div><Icon size={18} /></div><div className={`market-table ${compact ? 'compact' : ''}`} style={{ '--market-cols': columns.length }}><div className="market-table-head">{columns.map((column) => <span key={column}>{column}</span>)}</div>{rows.map((row) => <div key={row.join('-')}>{row.map((cell, index) => index === 0 ? <strong key={`${row[0]}-${index}`}>{cell}</strong> : <span key={`${row[0]}-${index}`}>{cell}</span>)}</div>)}</div></section>;
}

const buyerPreferenceSeed = [];

function BuyerCRMPage({ navigate, onBack, view = 'buyers', buyerId }) {
  const [buyers, setBuyers] = useState(buyerDirectorySeed);
  const [selectedId, setSelectedId] = useState(buyerId || null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [followups, setFollowups] = useState(buyerFollowupSeed);
  const [notes, setNotes] = useState(['Buyer prefers structured quote with shipment assumptions clearly separated.']);
  const [summary, setSummary] = useState('');
  const [notice, setNotice] = useState('');
  const selectedBuyer = buyers.find((buyer) => buyer.id === selectedId) || null;
  const visibleBuyers = buyers.filter((buyer) => {
    const matchesFilter = filter === 'All' || buyer.status === filter || buyer.country === filter || buyer.risk === filter;
    const haystack = `${buyer.buyerName} ${buyer.company} ${buyer.country} ${(buyer.interests || []).join(' ')}`.toLowerCase();
    return matchesFilter && haystack.includes(search.toLowerCase());
  });
  const activeBuyers = buyers.filter((buyer) => ['Active', 'High Value', 'Quote Pending', 'Follow-up Due'].includes(buyer.status) || buyer.relationshipValue === 'High Value').length;
  const openEnquiries = buyers.reduce((sum, buyer) => sum + buyer.openEnquiries, 0);
  const dueFollowups = followups.filter((item) => ['Follow-up Due', 'Risk Review'].includes(item.status)).length;
  const highValueBuyers = buyers.filter((buyer) => buyer.relationshipValue === 'High Value').length;
  const currentDateTime = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  const handleBuyerFilterChange = React.useCallback((nextFilter) => setFilter(nextFilter), []);
  const handleBuyerSearchChange = React.useCallback((value) => setSearch(value), []);

  const openBuyer = React.useCallback((id) => {
    setSelectedId(id);
    navigate(`/export-os/buyers/${id}`);
  }, [navigate]);

  function createFollowup() {
    if (!selectedBuyer) {
      setNotice('Select a buyer before creating a follow-up.');
      return;
    }
    const followup = {
      id: `buyer-followup-local-${Date.now()}`,
      buyer: selectedBuyer?.company,
      reason: 'Buyer intelligence follow-up',
      dueDate: 'Today 18:00',
      owner: 'COO Command',
      priority: selectedBuyer?.risk === 'High' ? 'High' : 'Medium',
      nextAction: 'Clarify buyer requirement before pricing or document release',
      status: 'Follow-up Due'
    };
    setFollowups((current) => [followup, ...current]);
    setNotice(`Follow-up created for ${selectedBuyer?.company} in Connect Supabase to activate.`);
  }

  function linkBuyerWorkflow() {
    if (!selectedBuyer) {
      setNotice('Select a buyer before linking workflows.');
      return;
    }
    setNotice(`${selectedBuyer?.company} linked to lead, pricing, invoice, and shipment workflows in Connect Supabase to activate. No buyer confirmation is claimed.`);
  }

  function addBuyerNote() {
    if (!selectedBuyer) {
      setNotice('Select a buyer before adding a note.');
      return;
    }
    const note = `${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}: ${selectedBuyer?.company} relationship note added under CMO ownership; COO/CFO review only where workflow or commercial risk is involved.`;
    setNotes((current) => [note, ...current]);
    setNotice('Buyer communication note added in Connect Supabase to activate.');
  }

  function generateBuyerSummary() {
    if (!selectedBuyer) {
      setNotice('Select a buyer before generating a summary.');
      return;
    }
    setSummary(`Buyer Intelligence Summary\n1. Strategic owner: CMO Command\n2. Company: ${selectedBuyer?.company}, ${selectedBuyer?.country}\n3. Product interests: ${(selectedBuyer?.interests || []).join(', ')}\n4. Relationship value: ${selectedBuyer?.relationshipValue}\n5. Commercial risk: ${selectedBuyer?.risk}\n6. COO action: keep enquiry, quotation coordination, documents, and shipment communication disciplined.\n7. CFO action: review payment behavior, pricing pressure, commercial risk, low-margin buyers, payment-term exceptions, and financial exposure.\n8. CTO support: keep CRM automations, WhatsApp workflows, notifications, and follow-up triggers monitored.\n9. Recommended action: ${selectedBuyer?.status === 'Risk Review' ? 'Route sensitive claims and terms through Director Command Center.' : 'Prepare structured follow-up and keep buyer intelligence available to pricing, operations, and marketing.'}`);
    setNotice('Buyer summary generated in Connect Supabase to activate.');
  }

  return (
    <ExportOSShell className="buyer-shell">
      <header className="deck-header buyer-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{view === 'buyer-crm' ? 'Buyer CRM' : view === 'customer-intelligence' ? 'Customer Intelligence' : view === 'detail' ? 'Buyer Detail Page' : 'Buyer CRM'}</h1>
          <p>Customer Intelligence Layer owned by CMO Command, coordinating COO execution, CFO commercial risk, and CTO automation support for export buyer relationships.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={`${activeBuyers} active buyers`} state="online" />
          <StatusBadge label={`${openEnquiries} open enquiries`} state="progress" />
          <StatusBadge label={`${dueFollowups} follow-ups due`} state="attention" />
          <StatusBadge label={`${highValueBuyers} high-value buyers`} state="online" />
          <span className="deck-time-chip">{currentDateTime}</span>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {notice && <div className="buyer-action-notice"><CheckCircle2 size={16} /><span>{notice}</span></div>}

      <main className="buyer-layout">
        <section className="buyer-left-stack">
          <BuyerOwnershipPanel />
          <BuyerDirectory buyers={visibleBuyers} selectedId={selectedBuyer?.id} filter={filter} search={search} onFilter={handleBuyerFilterChange} onSearch={handleBuyerSearchChange} onOpen={openBuyer} />
          <BuyerRiskProfile buyer={selectedBuyer} />
          <BuyerPreferencesPanel preferences={buyerPreferenceSeed} />
        </section>
        <section className="buyer-center-stack">
          <BuyerDetailPage buyer={selectedBuyer} notes={notes} onAddNote={addBuyerNote} onSummary={generateBuyerSummary} onLink={linkBuyerWorkflow} summary={summary} />
          <EnquiryHistoryPanel enquiries={buyerEnquirySeed} />
          <QuoteHistoryPanel quotes={buyerQuoteSeed} />
          <InvoiceHistoryPanel invoices={buyerInvoiceSeed} />
        </section>
        <aside className="buyer-right-stack">
          <ShipmentHistoryPanel shipments={buyerShipmentSeed} />
          <BuyerFollowupQueue followups={followups} onCreate={createFollowup} />
          <CustomerIntelligenceMemory />
        </aside>
      </main>
    </ExportOSShell>
  );
}

function BuyerOwnershipPanel() {
  const owners = [
    ['Primary Strategic Owner', 'CMO Command', 'Buyer relationship intelligence, communication history, outreach, campaigns, segmentation, market positioning, customer memory, and long-term relationship strategy.'],
    ['Operational Coordination', 'COO Command', 'Enquiry handling, operational follow-ups, quotation coordination, shipment communication, document clarification, and workflow execution.'],
    ['Commercial / Risk Coordination', 'CFO Command', 'Payment behavior review, pricing pressure, commercial risk, low-margin buyers, payment-term exceptions, and financial exposure.'],
    ['Technical / Automation Support', 'CTO Command', 'CRM automations, notifications, integrations, WhatsApp workflows, follow-up automation, and system monitoring.']
  ];
  return (
    <section className="buyer-panel buyer-ownership-panel">
      <div className="approval-section-header"><div><span>Ownership Structure</span><h2>Buyer intelligence command model</h2></div><Command size={18} /></div>
      <p>This is Buyer Intelligence + Operational Coordination + Commercial Risk System for an export operating platform.</p>
      <div className="buyer-ownership-grid">
        {owners.map(([label, commandName, responsibility]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{commandName}</strong>
            <p>{responsibility}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BuyerDirectory({ buyers, selectedId, filter, search, onFilter, onSearch, onOpen }) {
  const filters = ['All', 'Country pending', 'Oman', 'Country pending', 'Australia', 'Active', 'Follow-up Due', 'Quote Pending', 'Risk Review', 'High'];
  return (
    <section className="buyer-panel">
      <div className="approval-section-header"><div><span>Buyer Directory</span><h2>Export customers</h2></div><UsersRound size={18} /></div>
      <label className="buyer-search"><Search size={15} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search buyer, company, country, product..." /></label>
      <div className="buyer-filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item}</button>)}</div>
      <div className="buyer-directory-list">
        {buyers.length === 0
          ? <EmptyState icon={UsersRound} title="No leads" description="No leads match the current search." />
          : buyers.map((buyer) => (
            <button key={buyer.id} className={selectedId === buyer.id ? 'selected' : ''} onClick={() => onOpen(buyer.id)}>
              <div><strong>{buyer.buyerName}</strong><StatusBadge label={buyer.status} state={getBuyerState(buyer.status)} /></div>
              <span>{buyer.company} / {buyer.country} / {buyer.interests.join(', ')}</span>
              <small>Last contact: {buyer.lastContact} / Open enquiries: {buyer.openEnquiries} / Quote value: {buyer.quoteValue}</small>
              <footer><SeverityBadge severity={buyer.risk} /><b>{buyer.relationshipValue}</b></footer>
            </button>
          ))}
      </div>
    </section>
  );
}

function BuyerDetailPage({ buyer, notes, onAddNote, onSummary, onLink, summary }) {
  if (!buyer) return <div className="empty-state"><p>Select a buyer from the list to view details.</p></div>;
  return (
    <section className="buyer-panel">
      <div className="approval-section-header"><div><span>Buyer Detail Page</span><h2>{buyer.company}</h2></div><Building2 size={18} /></div>
      <BuyerProfileCard buyer={buyer} />
      <div className="buyer-action-row"><button onClick={onAddNote}>Add Buyer Note</button><button onClick={onSummary}>Generate Buyer Summary</button><button onClick={onLink}>Link Buyer Workflow</button></div>
      <div className="buyer-note-list">{notes.map((note) => <span key={note}>{note}</span>)}</div>
      {summary && <pre className="buyer-summary-output">{summary}</pre>}
    </section>
  );
}

function BuyerProfileCard({ buyer }) {
  if (!buyer) return null;
  const fields = [
    ['Buyer', buyer.buyerName],
    ['Company', buyer.company],
    ['Country', buyer.country],
    ['Email', buyer.email],
    ['Phone / WhatsApp', `${buyer.phone} / ${buyer.whatsapp}`],
    ['Product interests', (buyer.interests || []).join(', ')],
    ['Payment behavior', 'Pending only / no payment confirmed'],
    ['Approvals linked', buyer.status === 'Risk Review' ? 'Marketing/origin claim review' : 'Pricing and document review']
  ];
  return <div className="buyer-profile-grid">{fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function EnquiryHistoryPanel({ enquiries }) {
  return <section className="buyer-panel"><div className="approval-section-header"><div><span>Enquiry History</span><h2>Demand signals</h2></div><ClipboardList size={18} /></div><div className="buyer-table-list">{enquiries.map((item) => <article key={item.id}><div><strong>{item.product}</strong><StatusBadge label={item.status} state={getBuyerState(item.status)} /></div><span>{item.date} / {item.quantity} / {item.destination} / {item.source}</span><small>Pricing: {item.pricingRequest} / Quote: {item.quote}</small></article>)}</div></section>;
}

function QuoteHistoryPanel({ quotes }) {
  return <section className="buyer-panel"><div className="approval-section-header"><div><span>Quote History</span><h2>Commercial trail</h2></div><Calculator size={18} /></div><div className="buyer-table-list">{quotes.map((quote) => <article key={quote.id}><div><strong>{quote.quoteNumber}</strong><StatusBadge label={quote.status} state={getBuyerState(quote.status)} /></div><span>{quote.product} / {quote.quantity} / {quote.price} / margin {quote.margin}</span><small>Approval: {quote.approvalState} / Expiry: {quote.expiryDate}</small></article>)}</div></section>;
}

function InvoiceHistoryPanel({ invoices }) {
  return <section className="buyer-panel"><div className="approval-section-header"><div><span>Invoice History</span><h2>Draft and approval records</h2></div><FileText size={18} /></div><div className="buyer-table-list">{invoices.map((invoice) => <article key={invoice.id}><div><strong>{invoice.invoiceNumber}</strong><StatusBadge label={invoice.status} state={getBuyerState(invoice.status)} /></div><span>{invoice.invoiceType} / {invoice.value}</span><small>Approval: {invoice.approvalState} / {invoice.paymentStatus}</small></article>)}</div></section>;
}

function ShipmentHistoryPanel({ shipments }) {
  return <section className="buyer-panel"><div className="approval-section-header"><div><span>Shipment History</span><h2>Export execution linkage</h2></div><Route size={18} /></div><div className="buyer-table-list">{shipments.length === 0 ? <EmptyState icon={PackageCheck} title="No shipments" description="No active shipments found." /> : shipments.map((shipment) => <article key={shipment.id}><div><strong>{shipment.shipmentId}</strong><StatusBadge label={shipment.status} state={getBuyerState(shipment.status)} /></div><span>{shipment.product} / {shipment.quantity} / {shipment.destination}</span><small>ETA: {shipment.eta} / Risk: {shipment.riskState}</small></article>)}</div></section>;
}

function BuyerFollowupQueue({ followups, onCreate }) {
  return <section className="buyer-panel"><div className="approval-section-header"><div><span>Follow-up Queue</span><h2>Customer actions</h2></div><TimerReset size={18} /></div><div className="buyer-table-list">{followups.map((item) => <article key={item.id}><div><strong>{item.buyer}</strong><StatusBadge label={item.status} state={getBuyerState(item.status)} /></div><span>{item.reason} / Due: {item.dueDate}</span><small>Owner: {item.owner} / Priority: {item.priority} / Next: {item.nextAction}</small></article>)}</div><div className="buyer-action-row"><button onClick={onCreate}>Create Follow-up</button></div></section>;
}

function BuyerRiskProfile({ buyer }) {
  if (!buyer) return <div className="empty-state"><p>Select a buyer to view risk details.</p></div>;
  const risks = [
    ['Payment term risk', buyer.risk === 'High' ? 'High' : 'Medium'],
    ['Country risk', buyer.country === 'Australia' ? 'Medium' : 'Low'],
    ['Communication risk', buyer.status === 'Follow-up Due' ? 'Medium' : 'Low'],
    ['Quote conversion risk', buyer.status === 'Quote Pending' ? 'Medium' : 'Monitoring'],
    ['Document complexity risk', buyer.status === 'Risk Review' ? 'High' : 'Medium'],
    ['Relationship confidence', buyer.relationshipValue === 'High Value' ? 'Strong' : 'Monitoring']
  ];
  return <section className="buyer-panel"><div className="approval-section-header"><div><span>Buyer Risk Profile</span><h2>{buyer.risk} risk</h2></div><ShieldCheck size={18} /></div><div className="buyer-memory-list">{risks.map(([label, value]) => <span key={label}>{label}: {value}</span>)}</div><p>Risk is advisory until connected payment, shipment, and approval history is validated.</p></section>;
}

function BuyerPreferencesPanel({ preferences }) {
  return <section className="buyer-panel"><div className="approval-section-header"><div><span>Buyer Preferences</span><h2>Workflow defaults</h2></div><SlidersHorizontal size={18} /></div><div className="buyer-memory-list">{preferences.map(([label, value]) => <span key={label}>{label}: {value}</span>)}</div><p>Preferences should feed Pricing Engine, Document Factory, CMO outreach, and COO follow-ups after backend connection.</p></section>;
}

function CustomerIntelligenceMemory() {
  return <section className="buyer-panel"><div className="approval-section-header"><div><span>Customer Intelligence Memory</span><h2>CMO-owned Memory</h2></div><BrainCircuit size={18} /></div><div className="buyer-memory-list">{['Buyer preferences', 'Past objections', 'Pricing sensitivity', 'Successful quote patterns', 'Communication patterns', 'Product interests', 'Country-specific requirements', 'Follow-up history'].map((item) => <span key={item}>{item}</span>)}</div><p>Future connected buyer memory is strategically owned by CMO Command and should feed pricing assumptions, document defaults, COO follow-up discipline, and campaign segmentation.</p></section>;
}

function getBuyerState(status) {
  if (['Risk Review', 'Validation Failed', 'Critical'].includes(status)) return 'error';
  if (['Follow-up Due', 'Quote Pending', 'Founder Approval', 'Revision Required', 'Attention'].includes(status)) return 'attention';
  if (['Monitoring', 'Draft', 'CFO Review', 'Planning', 'Documentation', 'Pricing Review'].includes(status)) return 'progress';
  return 'online';
}

const intelligenceSummarySeed = [];

const analyticsPanelSeed = {
  operational: [
    ['Workflow completion', '72%', 'Monitoring', 72],
    ['Blocked workflows', '6', 'Attention', 42],
    ['Overdue tasks', '4', 'High Risk', 55],
    ['Approval delays', '9 pending', 'Attention', 64],
    ['Shipment readiness', '61%', 'Monitoring', 61],
    ['Dispatch delays', '2', 'Attention', 38]
  ],
  commercial: [
    ['Average margin by product', '12.4%', 'Healthy', 74],
    ['Risky pricing trends', '3 quotes', 'Attention', 52],
    ['Approval frequency', '36%', 'Monitoring', 46],
    ['Freight cost trend', 'Rising', 'High Risk', 68],
    ['FX exposure', 'AED watch', 'Attention', 58],
    ['Safe margin band', '10-16%', 'Healthy', 78]
  ],
  shipment: [
    ['Active shipments', '7', 'Monitoring', 70],
    ['Delayed shipments', '2', 'Attention', 44],
    ['Documentation stage', '4', 'Monitoring', 58],
    ['Port delay watch', '1', 'Attention', 35],
    ['Dispatch readiness', '61%', 'Monitoring', 61],
    ['ETA risk', 'Medium', 'Attention', 49]
  ],
  buyer: [
    ['Top buyers', '2 high value', 'Healthy', 80],
    ['Repeat enquiries', '5', 'Monitoring', 62],
    ['Quote conversion', 'Awaiting live data', 'Monitoring', 31],
    ['Country demand', 'Country pending/Oman lead', 'Healthy', 72],
    ['Risky buyers', '1', 'High Risk', 48],
    ['Follow-up delays', '3', 'Attention', 54]
  ],
  supplier: [
    ['Supplier reliability', '78% avg', 'Monitoring', 78],
    ['Quality issues', '3', 'Attention', 47],
    ['Response delays', '2', 'Attention', 42],
    ['Procurement bottlenecks', '4', 'High Risk', 57],
    ['Price fluctuation', 'Medium', 'Attention', 60],
    ['Trust ranking', 'Malabar leads', 'Healthy', 86]
  ],
  warehouse: [
    ['Low stock trends', '2 categories', 'Attention', 46],
    ['Blocked inventory', '1 batch', 'High Risk', 52],
    ['Aging stock', '1 review', 'Attention', 40],
    ['Reserved inventory', '1,300 KG', 'Monitoring', 67],
    ['Allocation pressure', 'High bags demand', 'High Risk', 71],
    ['Stock health', 'Awaiting live data', 'Monitoring', 74]
  ],
  technical: [
    ['API uptime', '99.1% local', 'Healthy', 91],
    ['Automation failures', '2', 'Attention', 45],
    ['Deployment incidents', '1', 'Monitoring', 30],
    ['Integration health', '82%', 'Monitoring', 82],
    ['Credit usage', '82%', 'Attention', 82],
    ['Workflow latency', '220ms', 'Healthy', 88]
  ],
  marketing: [
    ['LinkedIn pipeline', '3 drafts', 'Monitoring', 62],
    ['Content approvals', '2 pending', 'Attention', 50],
    ['Campaign performance', 'Pending', 'Monitoring', 40],
    ['Outreach activity', 'Draft only', 'Review Required', 36],
    ['Competitor review', '2 insights', 'Monitoring', 55],
    ['CMO recommendations', '4 actions', 'Healthy', 76]
  ]
};

const founderRiskSeed = [];

const intelligenceMemorySeed = ['Recurring LUT blockers', 'Approval delay patterns', 'Freight volatility on CIF quotes', 'Supplier quality hold recurrence', 'High-value buyer follow-up gaps', 'Packing material shortage cycles', 'Automation retry patterns', 'CMO claim approval patterns'];

function LeadIntakeFormPage({ navigate, onBack }) {
  const [form, setForm] = useState({
    buyer_name: '',
    company_name: '',
    email: '',
    phone: '',
    destination_country: '',
      product_name: '',
    quantity: '',
    shipping_mode: 'Sea',
    incoterm: 'FOB',
    deadline: '',
    notes: ''
  });
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('New lead draft mode. No buyer confirmation is claimed.');
  const [saving, setSaving] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors([]);
  }

  async function submitLead(event) {
    event.preventDefault();
    const missing = [
      ['buyer_name', 'Buyer name missing'],
      ['company_name', 'Company name missing'],
      ['email', 'Email missing'],
      ['destination_country', 'Destination country missing'],
      ['product', 'Product missing'],
      ['quantity', 'Quantity missing']
    ].filter(([key]) => !String(form[key] || '').trim()).map(([, message]) => message);
    if (missing.length) {
      setErrors(missing);
      setNotice(`Error: ${missing[0]}`);
      return;
    }
    setSaving(true);
    const result = await createLeadDraft({ tenant_id: demoTenantId, ...form, status: 'Draft', source: 'Director Command' });
    setSaving(false);
    if (result.error) {
      setNotice(`Error: ${result.error.message || 'Lead draft could not be saved.'}`);
      return;
    }
    const leadPayload = { id: result.data?.id, ...form };
    const [emailResult] = await Promise.all([
      sendLeadEmails(leadPayload),
      sendSlackNotification({
        type: 'New Lead',
        priority: 'INFO',
        reference: result.data?.id || `${form.company_name || form.buyer_name}-${Date.now()}`,
        buyer: form.company_name || form.buyer_name,
        status: 'Draft Lead Created',
        eta: form.deadline || 'Not set',
        actionRequired: 'COO should review lead details before pricing and buyer verification.',
        source: 'Lead Intake'
      })
    ]);
    setNotice(emailResult.ok
      ? 'Lead draft created. Customer thank-you and admin notification emails sent.'
      : 'Lead draft created. Email notification needs server env setup or retry.');
  }

  return (
    <ExportOSShell className="lead-intake-shell">
      <header className="deck-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>New Lead Intake</h1>
          <p>Capture buyer enquiry details before verification, pricing, approval, invoice, and shipment workflows.</p>
        </div>
        <div className="deck-header-controls">
          <StatusBadge label="Draft Lead" state="progress" />
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} />Back to Director</button>
        </div>
      </header>
      <main className="lead-intake-layout">
        <form className="lead-intake-form" onSubmit={submitLead}>
          <div className="approval-section-header"><div><span>Lead Form</span><h2>Buyer enquiry details</h2></div><UsersRound size={18} /></div>
          {[
            ['buyer_name', 'Buyer name'],
            ['company_name', 'Company / importer'],
            ['email', 'Email'],
            ['phone', 'Phone / WhatsApp'],
            ['destination_country', 'Destination country'],
            ['product', 'Product'],
            ['quantity', 'Quantity'],
            ['deadline', 'Buyer deadline']
          ].map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input value={form[key]} onChange={(event) => updateField(key, event.target.value)} />
            </label>
          ))}
          <div className="lead-intake-two">
            <label><span>Shipping mode</span><select value={form.shipping_mode} onChange={(event) => updateField('shipping_mode', event.target.value)}><option>Sea</option><option>Air</option><option>Courier</option></select></label>
            <label><span>Incoterm</span><select value={form.incoterm} onChange={(event) => updateField('incoterm', event.target.value)}><option>FOB</option><option>CIF</option><option>CNF</option><option>EXW</option></select></label>
          </div>
          <label className="lead-intake-notes"><span>Notes</span><textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Buyer requirement, packaging, destination port, payment expectation..." /></label>
          <div className="lead-intake-actions">
            <button className="tactical-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Lead Draft'}</button>
            <button className="ghost-button" type="button" onClick={() => navigate('/export-os/buyer-crm')}>Open Buyer CRM</button>
            <button className="ghost-button" type="button" onClick={() => navigate('/export-os/pricing-engine')}>Open Pricing</button>
          </div>
        </form>
        <aside className="lead-intake-side">
          <div className={`lead-intake-notice ${notice.startsWith('Error') ? 'error' : ''}`}><strong>{notice.startsWith('Error') ? 'Error' : 'Status'}</strong><span>{notice}</span></div>
          <section>
            <h2>Validation</h2>
            {errors.length ? errors.map((error) => <p key={error} className="lead-error-line">{error}</p>) : <p>Required buyer and product fields will be checked before draft save.</p>}
          </section>
          <section>
            <h2>Next workflow</h2>
            {['Buyer verification', 'COO intake review', 'Pricing request', 'CFO margin review', 'Director decision if risk appears'].map((item) => <span key={item}>{item}</span>)}
          </section>
        </aside>
      </main>
    </ExportOSShell>
  );
}

function FounderIntelligenceDashboard({ navigate, onBack, view = 'analytics' }) {
  const [filter, setFilter] = useState('All');
  const [trendView, setTrendView] = useState('30 Days');
  const [expandedPanel, setExpandedPanel] = useState('commercial');
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [strategyReview, setStrategyReview] = useState('');
  const currentDateTime = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  const allPanels = [
    ['operational', 'Operational Performance', 'COO recommendations', analyticsPanelSeed.operational],
    ['commercial', 'Commercial & Margin Analytics', 'CFO recommendations', analyticsPanelSeed.commercial],
    ['shipment', 'Shipment & Logistics Analytics', 'Logistics risk indicators', analyticsPanelSeed.shipment],
    ['buyer', 'Buyer Intelligence Analytics', 'Relationship value score', analyticsPanelSeed.buyer],
    ['supplier', 'Supplier Intelligence Analytics', 'Trust rankings', analyticsPanelSeed.supplier],
    ['warehouse', 'Warehouse & Inventory Analytics', 'Stock health and forecasts', analyticsPanelSeed.warehouse],
    ['technical', 'Technical Reliability Analytics', 'CTO health score', analyticsPanelSeed.technical],
    ['marketing', 'Marketing & Content Analytics', 'CMO recommendations', analyticsPanelSeed.marketing]
  ];
  const visiblePanels = filter === 'All' ? allPanels : allPanels.filter(([key]) => key === filter);
  const highRiskAlerts = founderRiskSeed.filter((risk) => ['High', 'Critical'].includes(risk.severity)).length;

  function generateStrategyReview() {
    setStrategyReview('Founder Strategy Review\n1. Increase black pepper margin threshold for Country pending shipments until freight stabilizes.\n2. Reduce dependency on delayed or quality-hold suppliers before high-value quotes.\n3. Review API credit usage trend before automation volume increases.\n4. Improve document readiness before shipment planning begins.\n5. Follow up dormant high-value buyers through CMO-owned relationship memory.\n6. Keep invoice, pricing, supplier, and marketing risk routed through Director Command Center.');
  }

  return (
    <ExportOSShell className="intelligence-shell">
      <header className="deck-header intelligence-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{view === 'reports' ? 'Reports' : 'Founder Intelligence Center'}</h1>
          <p>Strategic Analytics Layer consolidating COO, CFO, CTO, CMO, pricing, invoices, shipments, buyers, suppliers, warehouse, approvals, and task execution.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label="34 active workflows" state="progress" />
          <StatusBadge label={`${highRiskAlerts} high risk alerts`} state="attention" />
          <StatusBadge label="No live pipeline data" state="progress" />
          <span className="deck-time-chip">{currentDateTime}</span>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <section className="intelligence-toolbar">
        <div>{['All', 'operational', 'commercial', 'shipment', 'buyer', 'supplier', 'warehouse', 'technical', 'marketing'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div>{['7 Days', '30 Days', 'Quarter'].map((item) => <button key={item} className={trendView === item ? 'active' : ''} onClick={() => setTrendView(item)}>{item}</button>)}</div>
      </section>

      <main className="intelligence-layout">
        <section className="intelligence-left-stack">
          <ExecutiveSummaryCards items={intelligenceSummarySeed} />
          <FounderRiskDashboard risks={founderRiskSeed} selectedRisk={selectedRisk} onSelect={setSelectedRisk} />
        </section>
        <section className="intelligence-center-stack">
          {visiblePanels.map(([key, title, subtitle, rows]) => (
            <AnalyticsPanel key={key} panelKey={key} title={title} subtitle={`${subtitle} / ${trendView}`} rows={rows} expanded={expandedPanel === key} onToggle={() => setExpandedPanel(expandedPanel === key ? '' : key)} />
          ))}
        </section>
        <aside className="intelligence-right-stack">
          <StrategicRecommendationsPanel onGenerate={generateStrategyReview} output={strategyReview} />
          <IntelligenceMemoryPanel />
        </aside>
      </main>
    </ExportOSShell>
  );
}

function ExecutiveSummaryCards({ items }) {
  return <section className="intelligence-panel"><div className="approval-section-header"><div><span>Executive Intelligence Summary</span><h2>Company health</h2></div><Gauge size={18} /></div><div className="intelligence-summary-grid">{items.map((item) => <article key={item.id}><span>{item.label}</span><strong>{item.value}</strong><StatusBadge label={item.status} state={getIntelligenceState(item.status)} /><small>{item.note}</small></article>)}</div></section>;
}

function AnalyticsPanel({ title, subtitle, rows, expanded, onToggle }) {
  return <section className="intelligence-panel"><button className="intelligence-panel-toggle" onClick={onToggle}><div><span>{title}</span><h2>{subtitle}</h2></div><ChevronRight size={18} className={expanded ? 'expanded' : ''} /></button><div className="analytics-row-list">{rows.map(([label, value, status, score]) => <article key={label}><div><strong>{label}</strong><StatusBadge label={status} state={getIntelligenceState(status)} /></div><span>{value}</span><i><b style={{ width: `${score}%` }} /></i>{expanded && <small>{label} requires review in {subtitle.toLowerCase()} trend view. This is advisory local intelligence.</small>}</article>)}</div></section>;
}

function FounderRiskDashboard({ risks, selectedRisk, onSelect }) {
  const selected = risks.find((risk) => risk.id === selectedRisk) || null;
  return <section className="intelligence-panel"><div className="approval-section-header"><div><span>Founder Risk Dashboard</span><h2>Critical attention</h2></div><TriangleAlert size={18} /></div><div className="founder-risk-list">{risks.map((risk) => <button key={risk.id} className={selectedRisk === risk.id ? 'selected' : ''} onClick={() => onSelect(risk.id)}><div><strong>{risk.title}</strong><SeverityBadge severity={risk.severity} /></div><span>{risk.category}</span></button>)}</div>{selected ? <div className="founder-risk-detail"><strong>{selected?.title}</strong><p>{selected?.impact}</p><small>Risk drilldown is local-only and does not claim issue resolution.</small></div> : <div className="empty-state"><p>Select a risk from the list to view details.</p></div>}</section>;
}

function StrategicRecommendationsPanel({ onGenerate, output }) {
  return <section className="intelligence-panel"><div className="approval-section-header"><div><span>Strategic Recommendations</span><h2>Founder review</h2></div><Sparkles size={18} /></div><div className="intelligence-rec-list">{['Increase black pepper margin threshold for Country pending shipments', 'Reduce dependency on delayed supplier', 'Review OpenAI credit usage trend', 'Improve document readiness before shipment planning', 'Follow up dormant high-value buyer'].map((item) => <span key={item}>{item}</span>)}</div><div className="intelligence-action-row"><button onClick={onGenerate}>Generate Founder Strategy Review</button></div>{output && <pre className="intelligence-output">{output}</pre>}</section>;
}

function IntelligenceMemoryPanel() {
  return <section className="intelligence-panel"><div className="approval-section-header"><div><span>Intelligence Memory</span><h2>Memory</h2></div><BrainCircuit size={18} /></div><div className="intelligence-memory-list">{intelligenceMemorySeed.map((item) => <span key={item}>{item}</span>)}</div><p>Future connected intelligence memory should preserve recurring bottlenecks, margin trends, supplier and buyer patterns, workflow inefficiencies, and operational lessons.</p></section>;
}

function getIntelligenceState(status) {
  if (['Critical', 'High Risk'].includes(status)) return 'error';
  if (['Attention', 'Review Required'].includes(status)) return 'attention';
  if (['Monitoring'].includes(status)) return 'progress';
  return 'online';
}

function IncidentCenter({ incidents, selectedIncident, onSelect, onEscalate, onCreateTask }) {
  return (
    <section className="cto-panel">
      <div className="approval-section-header"><div><span>Incident Center</span><h2>Technical alerts</h2></div><TriangleAlert size={18} /></div>
      <div className="cto-incident-list">
        {incidents.map((incident) => (
          <button key={incident.id} className={selectedIncident === incident.id ? 'selected' : ''} onClick={() => onSelect(incident.id)}>
            <div><strong>{incident.title}</strong><SeverityBadge severity={incident.severity} /></div>
            <span>{incident.affected_module || incident.module} - {incident.business_impact || incident.impact}</span>
            {selectedIncident === incident.id && <p>{incident.next_action || incident.action}</p>}
            {selectedIncident === incident.id && <footer><small>{incident.owner} {'->'} {incident.escalation_target}</small><button type="button" onClick={(event) => { event.stopPropagation(); onEscalate?.(incident); }}>Escalate to Founder</button><button type="button" onClick={(event) => { event.stopPropagation(); onCreateTask?.(incident); }}>Create Task</button><button type="button" onClick={(event) => { event.stopPropagation(); }}>Open Logs</button></footer>}
          </button>
        ))}
      </div>
    </section>
  );
}

function WorkflowMonitoringPanel() {
  const rows = [
    ['Lead Intake -> Pricing', 'Monitoring', 'CFO validation waits for pricing review'],
    ['Invoice -> Director Queue', 'Attention', 'LUT blocker routes to founder approval'],
    ['Task -> COO Escalation', 'Retry Pending', 'Overdue task rule queued'],
    ['WhatsApp -> Parser', 'Connect Supabase to activate', 'Webhook pending before live routing']
  ];
  return (
    <section className="cto-panel">
      <div className="approval-section-header"><div><span>Workflow Monitoring</span><h2>Cross-module routes</h2></div><Route size={18} /></div>
      <div className="cto-workflow-list">
        {rows.map(([name, status, note]) => <article key={name}><strong>{name}</strong><StatusBadge label={status} state={getAutomationState(status)} /><span>{note}</span></article>)}
      </div>
    </section>
  );
}

function DeploymentStatusPanel({ logs }) {
  return (
    <section className="cto-panel">
      <div className="approval-section-header"><div><span>Deployment Status</span><h2>Release readiness</h2></div><UploadCloud size={18} /></div>
      <div className="cto-deploy-list">
        {logs.map((log) => <article key={log.id}><div><strong>{log.label || log.name}</strong><StatusBadge label={log.status} state={getCtoState(log.status)} /></div><span>{log.value || log.event}</span><small>{log.note}</small></article>)}
      </div>
    </section>
  );
}

function TechnicalTimeline({ events }) {
  return (
    <section className="cto-panel">
      <div className="approval-section-header"><div><span>Technical Audit Log</span><h2>Latest platform movement</h2></div><Activity size={18} /></div>
      <div className="task-audit-mini">
        {events.map((entry) => Array.isArray(entry)
          ? <div key={`${entry[0]}-${entry[1]}`}><time>{entry[0]}</time><span>{entry[1]}</span><small>{entry[2]}</small></div>
          : <div key={entry.id}><time>{entry.time}</time><span>{entry.event}</span><small>{entry.actor} - {entry.status}</small></div>)}
      </div>
    </section>
  );
}

function PlatformArchitectureMap({ nodes = [] }) {
  const fallbackNodes = [
    { node: 'Frontend', status: 'Online' },
    { node: 'Supabase', status: 'Monitoring' },
    { node: 'Services Layer', status: 'Online' },
    { node: 'Workflow Engine', status: 'Attention' },
    { node: 'Approval Engine', status: 'Online' },
    { node: 'Invoice/Pricing/Tasks', status: 'Attention' },
    { node: 'WhatsApp/Automation Layer', status: 'Connect Supabase to activate' }
  ];
  const mapNodes = nodes.length ? nodes : fallbackNodes;
  return (
    <section className="cto-panel">
      <div className="approval-section-header"><div><span>Platform Architecture Map</span><h2>System chain</h2></div><Network size={18} /></div>
      <div className="cto-architecture-chain">
        {mapNodes.map((item, index) => <div key={item.id || item.node}><strong>{item.node}</strong><StatusBadge label={item.status} state={getCtoState(item.status)} /><small>{item.last_checked || 'Now'} / {item.incident_count || 0} incident(s)</small>{index < mapNodes.length - 1 && <ChevronRight size={15} />}</div>)}
      </div>
    </section>
  );
}

function CTOTechnicalSummary({ output, onPrepare, notice }) {
  return <section className="cto-panel"><div className="approval-section-header"><div><span>CTO Technical Summary</span><h2>Founder briefing preview</h2></div><ClipboardCheck size={18} /></div><p>{notice}</p><button className="tactical-button" onClick={onPrepare}>Prepare Founder Technical Summary</button>{output && <pre className="task-local-output">{output}</pre>}</section>;
}

function resolveSystemHealth(health = [], incidents = []) {
  if (backendStatus.mode !== 'Connected') return { label: 'Awaiting Connection', state: 'progress' };
  if (incidents.some((incident) => incident.severity === 'Critical')) return { label: 'Failure Detected', state: 'error' };
  if (health.some((item) => ['Attention', 'Risk Detected', 'Failed', 'Degraded'].includes(item.status))) return { label: 'Live Connected', state: 'attention' };
  return { label: 'Live Connected', state: 'online' };
}

function latestSyncTime(integrations = [], auditLog = []) {
  const verified = integrations.find((item) => item.last_verified && !['Pending', 'Not active'].includes(item.last_verified));
  const audited = auditLog.find((item) => item.time || item.created_at);
  return cleanCtoLabel(verified?.last_verified || audited?.time || audited?.created_at || 'No recent sync');
}

function latestSecretSyncTime(savedSecrets = {}) {
  const savedItems = Object.values(savedSecrets).filter(Boolean);
  if (!savedItems.length) return '';
  const latest = savedItems
    .map((item) => item.savedAt)
    .filter(Boolean)
    .at(-1);
  return latest || 'Key saved';
}

function readCtoSavedSecrets() {
  try {
    const saved = JSON.parse(window.localStorage.getItem('ctoIntegrationSecrets') || '{}');
    return Object.fromEntries(
      Object.entries(saved).filter(([, value]) => !String(value?.apiKey || '').startsWith('sk-test-'))
    );
  } catch {
    return {};
  }
}

function buildIntegrationDetail(service, liveConnected, savedSecrets = {}, onSaveSecret) {
  const provider = ctoProviderCatalog[service.id] || ctoProviderCatalog.openai;
  const localState = getLocalIntegrationState(service, liveConnected, savedSecrets);
  return ['Integration', service.service_name, [
    ['Status', localState.status],
    ['Environment', service.environment || 'Production'],
    ['Last Check', localState.lastCheck],
    ['Action', localState.action],
    ['Detail', localState.detail]
  ], {
    integration: service,
    provider,
    savedSecret: savedSecrets[service.id],
    onSaveSecret
  }];
}

function getLocalIntegrationState(service, liveConnected, savedSecrets = {}) {
  if (service.id === 'openai' && service.providerStatus) {
    const providerStatus = service.providerStatus;
    const status = providerStatus.status === 'live'
      ? 'Connected'
      : providerStatus.status === 'pending'
        ? 'Verification Pending'
        : 'Failure Detected';
    return {
      status,
      lastCheck: cleanCtoLabel(providerStatus.last_success_at || providerStatus.last_checked_at || 'No recent sync'),
      action: status === 'Connected' ? 'Live' : status === 'Verification Pending' ? 'Checking now' : 'Fix key',
      detail: status === 'Connected'
        ? 'OpenAI live: CTO provider connection active.'
        : providerStatus.error_message || 'API request failed'
    };
  }

  const liveSupabaseVerified = service.id === 'supabase' && (liveConnected || service.status === 'Live Connected');
  if (liveSupabaseVerified) {
    return {
      status: 'Connected',
      lastCheck: cleanCtoLabel(service.last_verified || 'Live query verified'),
      action: 'Live',
      detail: service.connection_message || service.quota_remaining || 'Supabase Data API verified.'
    };
  }

  const saved = savedSecrets[service.id];
  const serviceStatus = normalizeConnectionState(service.status);
  if (saved?.verificationStatus === 'Disabled') {
    return {
      status: 'Disabled',
      lastCheck: saved.savedAt || 'Saved locally',
      action: 'Verify connection',
      detail: saved.verificationMessage || 'Integration disabled locally.'
    };
  }
  if (serviceStatus === 'Connected') {
    return {
      status: 'Connected',
      lastCheck: cleanCtoLabel(service.last_verified || saved?.savedAt || 'Live verification confirmed'),
      action: 'Live',
      detail: service.connection_message || service.quota_remaining || saved?.verificationMessage || 'Integration is connected.'
    };
  }
  if (saved) {
    const status = saved.verificationStatus || 'Verification Pending';
    return {
      status,
      lastCheck: saved.savedAt || 'Saved locally',
      action: status === 'Connected' ? 'Live' : status === 'Failure Detected' ? 'Fix key' : status === 'Verification Running' ? 'Testing now' : 'Verify connection',
      detail: saved.verificationMessage || 'Saved locally. Backend verification pending.'
    };
  }
  const status = normalizeConnectionState(liveConnected ? service.status : 'Awaiting Connection');
  return {
    status,
    lastCheck: liveConnected ? cleanCtoLabel(service.last_verified || 'No recent sync') : 'No recent sync',
    action: connectionAction(status),
    detail: service.quota_remaining || 'Awaiting integration'
  };
}

function getPaymentWatchState(item, liveConnected, savedSecrets = {}) {
  const liveSupabaseVerified = item.serviceId === 'supabase' && liveConnected;
  if (liveSupabaseVerified) {
    return {
      status: 'Connected',
      state: cleanCtoLabel(item.remaining || item.note || item.renewal_note || 'Supabase live verified'),
      lastCheck: cleanCtoLabel(item.last_checked || item.lastCheck || 'Live query verified'),
      action: 'Watch usage and renewal risk'
    };
  }

  const saved = savedSecrets[item.serviceId];
  if (saved) {
    const status = saved.verificationStatus || 'Verification Pending';
    return {
      status,
      state: status === 'Connected' ? 'LIVE - connection verified' : saved.verificationMessage || 'Saved key awaiting verification',
      lastCheck: saved.savedAt || 'Saved locally',
      action: status === 'Connected' ? 'Watch credits and renewal risk' : status === 'Failure Detected' ? 'Fix saved connection' : 'Verify connection'
    };
  }
  const status = normalizeConnectionState(liveConnected ? item.status : 'Awaiting Connection');
  return {
    status,
    state: liveConnected ? cleanCtoLabel(item.remaining || item.note || item.renewal_note || 'No recent sync') : 'Awaiting integration',
    lastCheck: liveConnected ? cleanCtoLabel(item.last_checked || item.lastCheck || 'No recent sync') : 'No recent sync',
    action: item.renewal_note || 'Awaiting integration'
  };
}

function cleanCtoLabel(value = '') {
  const text = String(value || '').trim();
  if (!text || text === 'N/A') return 'Awaiting integration';
  if (/Connect Supabase to activate/i.test(text)) return 'Awaiting Connection';
  if (/monitoring/i.test(text)) return 'Connected';
  if (/local/i.test(text)) return text.replace(/local/gi, 'preview').trim();
  return text;
}

function normalizeConnectionState(status = '') {
  const text = cleanCtoLabel(status);
  if (['Connected', 'Live Connected', 'Healthy', 'Online', 'Verification Success', 'Active', 'Passed'].includes(text)) return 'Connected';
  if (['Disabled', 'Not active'].includes(text)) return 'Disabled';
  if (['Invalid Key', 'Expired', 'Quota Exceeded', 'Failed', 'Error', 'Critical', 'Failure Detected', 'Degraded'].includes(text)) return 'Failure Detected';
  if (['Verification Pending', 'Pending', 'Review', 'Review Required'].includes(text)) return 'Verification Pending';
  if (['Manual Setup Required', 'Backend Verification Required'].includes(text)) return text;
  if (['Verification Running', 'Sync Delayed', 'Retry Pending', 'Attention', 'Risk', 'Risk Detected', 'Credits Low', 'Waiting Approval'].includes(text)) return 'Sync Delayed';
  if (['Awaiting Connection', 'Awaiting integration'].includes(text)) return 'Awaiting Connection';
  return text;
}

function connectionAction(status = '') {
  if (status === 'Connected') return 'Open details';
  if (status === 'Disabled') return 'Enable when required';
  if (status === 'Failure Detected') return 'Verify credentials';
  if (status === 'Sync Delayed') return 'Check sync';
  if (status === 'Manual Setup Required') return 'Open provider setup';
  if (status === 'Backend Verification Required') return 'Verify from backend';
  if (status === 'Verification Pending') return 'Verify connection';
  return 'Connect';
}

function sourceWebsiteFor(source = '') {
  const text = source.toLowerCase();
  if (text.includes('trademap')) return 'https://www.trademap.org/';
  if (text.includes('comtrade')) return 'https://comtradeplus.un.org/';
  if (text.includes('kompass')) return 'https://www.kompass.com/';
  if (text.includes('tradeatlas')) return 'https://www.tradeatlas.com/';
  if (text.includes('linkedin')) return 'https://www.linkedin.com/';
  if (text.includes('google')) return 'https://programmablesearchengine.google.com/';
  if (text.includes('apeda')) return 'https://apeda.gov.in/';
  if (text.includes('csv')) return 'Manual CSV import';
  return 'CTO-controlled importer acquisition plan';
}

function extractApiMessage(bodyText = '') {
  try {
    const parsed = JSON.parse(bodyText);
    return parsed?.error?.message || parsed?.message || parsed?.name || bodyText.slice(0, 160);
  } catch {
    return bodyText.slice(0, 160);
  }
}

async function fastVerificationFetch(url, options = {}, timeoutMs = CTO_FAST_VERIFICATION_TIMEOUT_MS) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      signal: controller.signal
    });
    const bodyText = await response.text().catch(() => '');
    return {
      response,
      bodyText,
      elapsedMs: Date.now() - startedAt
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function verifyOpenAIKey(apiKey) {
  const { response, bodyText, elapsedMs } = await fastVerificationFetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (response.ok) {
    return { status: 'Connected', message: `OpenAI key verified in ${elapsedMs} ms. Live API response received.` };
  }
  if (response.status === 401) return { status: 'Failure Detected', message: 'OpenAI rejected the key. Check that the API key is correct and active.' };
  if (response.status === 429) return { status: 'Sync Delayed', message: 'OpenAI reached, but returned quota/rate-limit response. Retry after checking usage limits.' };
  return { status: 'Failure Detected', message: `OpenAI verification failed with HTTP ${response.status}: ${extractApiMessage(bodyText) || 'no response message'}.` };
}

async function verifyResendKey(apiKey) {
  if (!apiKey.startsWith('re_')) {
    return { status: 'Failure Detected', message: 'Resend API key format looks wrong. Resend keys normally start with re_.' };
  }

  const { response, bodyText, elapsedMs } = await fastVerificationFetch('https://api.resend.com/domains', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  });

  if (response.ok) {
    return { status: 'Connected', message: `Resend key verified in ${elapsedMs} ms through the domains API. Email sending remains approval-gated.` };
  }
  if (response.status === 401 || response.status === 403) {
    return { status: 'Failure Detected', message: `Resend rejected the key or permission scope (${response.status}). ${extractApiMessage(bodyText) || 'Check API key and domain access.'}` };
  }
  if (response.status === 429) {
    return { status: 'Sync Delayed', message: 'Resend reached, but returned a rate-limit response. Retry after quota/rate-limit check.' };
  }
  return { status: 'Failure Detected', message: `Resend verification failed with HTTP ${response.status}: ${extractApiMessage(bodyText) || 'no response message'}.` };
}

async function verifyIntegrationSecret(serviceId, apiKey) {
  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) {
    return { status: 'Failure Detected', message: 'API key is missing.' };
  }
  if (trimmedKey.length < 12) {
    return { status: 'Failure Detected', message: 'API key is too short to verify.' };
  }

  try {
    if (serviceId === 'openai') return await verifyOpenAIKey(trimmedKey);
    if (serviceId === 'resend') return await verifyResendKey(trimmedKey);
    if (serviceId === 'supabase') {
      return {
        status: 'Backend Verification Required',
        message: 'Supabase is verified from the CTO Final Check using env configuration, project URL, RLS, and Data API query. Do not verify service-role keys in the browser.'
      };
    }
    if (serviceId === 'vercel') {
      return {
        status: 'Backend Verification Required',
        message: 'Vercel is verified from /api/integrations/vercel/status using server-side VERCEL_TOKEN or Vercel runtime variables. Do not paste Vercel tokens into the browser.'
      };
    }

    const provider = ctoProviderCatalog[serviceId] || {};
    const account = provider.loginAccount || ctoDefaultLoginEmail;
    const setupType = provider.loginAccount ? 'OAuth/login' : 'backend API verifier';
    return {
      status: 'Manual Setup Required',
      message: `Fast check completed. ${ctoServiceNameFor(serviceId)} requires ${setupType}; use ${account} where login is required, then verify from a backend connector. No browser request was held open.`
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { status: 'Failure Detected', message: `Verification timed out after ${CTO_FAST_VERIFICATION_TIMEOUT_MS / 1000} seconds. CTO stopped the request before 30 seconds.` };
    }
    return { status: 'Failure Detected', message: `Verification failed fast: ${error?.message || 'network request blocked by browser/CORS'}.` };
  }
}

async function saveCtoProviderEnvValue(serviceId, apiKey) {
  if (!ctoEnvTargetMap[serviceId]) {
    return { ok: false, status: 'unsupported_provider', message: 'No server env mapping exists for this provider.' };
  }
  try {
    const response = await fetch('/api/cto/provider-env/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, value: apiKey })
    });
    return await response.json();
  } catch {
    return { ok: false, status: 'api_unavailable', message: `Add ${ctoEnvTargetMap[serviceId]} to .env.local or Vercel env.` };
  }
}

function buildWorkflowRows(queue = [], systems = [], liveConnected = false) {
  const effectiveQueue = liveConnected ? queue : [];
  const effectiveSystems = liveConnected ? systems : [];
  const failed = effectiveQueue.filter((item) => ['Failed', 'Retry Pending', 'Attention'].includes(item.queue_status || item.status));
  const validation = effectiveSystems.filter((item) => /invoice|validation|approval/i.test(`${item.name || item.system_name || ''} ${item.note || ''}`));
  const retry = effectiveQueue.find((item) => {
    const statusText = `${item.queue_status || ''} ${item.status || ''} ${item.retry_status || ''} ${item.retry_state || ''}`;
    const workflowText = `${item.workflow_name || item.label || ''} ${item.note || ''}`;
    const hasFailureSignal = Number(item.failure_count || 0) > 0 || /failed|retry pending|retry queued|failure detected/i.test(statusText);
    const isRetryWorkflow = /retry|invoice validation|approval routing/i.test(workflowText);
    return hasFailureSignal && isRetryWorkflow;
  });
  return [
    {
      id: 'workflow-reliability',
      area: 'Workflow reliability',
      state: liveConnected ? (failed.length ? 'Sync Delayed' : 'Connected') : 'Awaiting Connection',
      owner: 'CTO Command',
      signal: failed.length ? `${failed.length} blocked or delayed workflow(s)` : liveConnected ? 'No blocked workflows' : 'No live workflow data connected',
      action: failed.length ? 'Open delayed workflow' : liveConnected ? 'Live' : 'Awaiting integration'
    },
    {
      id: 'queue-failures',
      area: 'Queue failures',
      state: failed.length ? 'Failure Detected' : liveConnected ? 'Connected' : 'Awaiting Connection',
      owner: 'Workflow Engine',
      signal: failed[0]?.workflow_name || (liveConnected ? 'No queue failures' : 'No live data connected'),
      action: failed.length ? cleanCtoLabel(failed[0]?.retry_status || 'Prepare retry') : liveConnected ? 'Healthy' : 'No recent sync'
    },
    {
      id: 'validation-blockers',
      area: 'Validation blockers',
      state: validation.length ? 'Verification Pending' : liveConnected ? 'Connected' : 'Awaiting Connection',
      owner: 'COO + CFO',
      signal: validation[0]?.note || (liveConnected ? 'No validation blockers' : 'No live validation blockers connected'),
      action: validation.length ? 'Open validation owner' : liveConnected ? 'Live' : 'Awaiting integration'
    },
    {
      id: 'retry-queue',
      area: 'Retry queue',
      state: retry ? 'Sync Delayed' : liveConnected ? 'Connected' : 'Awaiting Connection',
      owner: retry?.owner || 'Automation Queue',
      signal: retry?.workflow_name || retry?.label || 'No live retry failures',
      action: retry ? cleanCtoLabel(retry.retry_status || 'Prepare retry') : 'Live',
      source: retry?.workflow_name || retry?.label || 'Retry queue'
    },
    {
      id: 'dependencies',
      area: 'Cross-module dependencies',
      state: validation.length || failed.length ? 'Verification Pending' : liveConnected ? 'Connected' : 'Awaiting Connection',
      owner: 'CTO + Command Owners',
      signal: liveConnected ? 'Pricing, invoice, approval, shipment, and task dependencies healthy' : 'Pricing, invoice, approval, shipment, and task dependencies',
      action: validation.length || failed.length ? 'Clear owner blocker first' : liveConnected ? 'Live' : 'Awaiting integration'
    }
  ];
}

function getCtoState(status) {
  if (['Error', 'Critical', 'Degraded', 'Failed', 'Failure Detected'].includes(status)) return 'error';
  if (['Attention', 'Risk', 'Risk Detected', 'Verification Pending', 'Review Required', 'Sync Delayed', 'Setup Required', 'Required', 'Not Connected'].includes(status)) return 'attention';
  if (['Monitoring', 'Connect Supabase to activate', 'Retry Pending', 'Disabled', 'Waiting Approval', 'Awaiting Connection', 'Workflow Support', 'Approval Queue Only', 'Pending', 'Manual Step'].includes(status)) return 'progress';
  return 'online';
}

function IntegrationCard({ service, provider = {}, onAction }) {
  const actions = ['Add Key', 'Replace Key', 'Rotate Key', 'Verify Connection', 'Disable Integration', 'View Logs', 'Open Usage Details'];
  const usageTone = usageState(service.usage_percentage);
  return (
    <article className={`integration-card usage-${usageTone}`}>
      <div className="integration-card-top">
        <div>
          <span className="coo-kicker">{service.environment}</span>
          <h2>{service.service_name}</h2>
        </div>
        <HealthStatusBadge status={service.status} />
      </div>
      <SecretMaskedField value={service.masked_key} />
      {service.providerStatus && (
        <div className={`cto-provider-source ${service.providerStatus.status === 'error' ? 'error' : service.providerStatus.status === 'live' ? 'live' : 'pending'}`}>
          <strong>{ctoLabels.providerVaultSource}</strong>
          <span>{service.providerStatus.status === 'live' ? 'OpenAI live: CTO provider connection active.' : service.providerStatus.error_message || 'Checking OpenAI connection...'}</span>
        </div>
      )}
      <div className="integration-meta-grid">
        <div><span>Last Verified</span><strong>{service.last_verified}</strong></div>
        <div><span>Health</span><strong>{service.health_status}</strong></div>
        <div><span>Quota</span><strong>{service.quota_remaining}</strong></div>
        <div><span>Last Request</span><strong>{service.last_request}</strong></div>
      </div>
      <div className="usage-bar-shell">
        <div className="usage-bar" style={{ width: `${Math.min(service.usage_percentage, 100)}%` }} />
      </div>
      <div className="usage-card-footer">
        <span>{service.usage_percentage}% usage</span>
        <small>{service.request_volume} / exhaustion: {service.estimated_exhaustion}</small>
      </div>
      <div className="integration-detail-grid">
        <div>
          <span>Website</span>
          {String(provider.website || '').startsWith('http') ? <a href={provider.website} target="_blank" rel="noreferrer">Open website <ArrowUpRight size={12} /></a> : <strong>{provider.website || 'Awaiting provider details'}</strong>}
        </div>
        <div>
          <span>Docs</span>
          {String(provider.docs || '').startsWith('http') ? <a href={provider.docs} target="_blank" rel="noreferrer">API docs <ArrowUpRight size={12} /></a> : <strong>{provider.docs || 'Awaiting docs'}</strong>}
        </div>
        <div>
          <span>Recommended plan</span>
          <strong>{provider.recommendedPlan || 'CTO-reviewed plan required before production'}</strong>
        </div>
        <div>
          <span>Plan reason</span>
          <strong>{provider.planReason || 'Connection must be verified before live workflows use this service.'}</strong>
        </div>
      </div>
      <div className="integration-requirements">
        {(provider.fields || ['Credential', 'Environment', 'Verification', 'Audit log']).map((field) => <span key={field}>{field}</span>)}
      </div>
      <div className="integration-action-grid">
        {actions.map((action) => <button key={action} onClick={() => onAction(service, action)}>{action}</button>)}
      </div>
    </article>
  );
}

function SecretMaskedField({ value }) {
  return (
    <div className="secret-masked-field">
      <LockKeyhole size={15} />
      <span>{value}</span>
      <small>masked only</small>
    </div>
  );
}

function HealthStatusBadge({ status }) {
  return <StatusBadge label={status} state={integrationStatusState(status)} />;
}

function AddIntegrationModal({ services, initialServiceId, onCancel, onSave }) {
  const [serviceId, setServiceId] = useState(initialServiceId || services[0]?.id || 'openai');
  const [environment, setEnvironment] = useState('Production');
  const [verification, setVerification] = useState('Verification Pending');
  const [verificationDetail, setVerificationDetail] = useState(`Supported direct checks finish in ${CTO_FAST_VERIFICATION_TIMEOUT_MS / 1000} seconds or less. OAuth-only tools return setup guidance immediately.`);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const selectedProvider = ctoProviderCatalog[serviceId] || {};

  useEffect(() => {
    setVerification('Verification Pending');
    setVerificationDetail(`Supported direct checks finish in ${CTO_FAST_VERIFICATION_TIMEOUT_MS / 1000} seconds or less. OAuth-only tools return setup guidance immediately.`);
    setVerificationResult(null);
    setIsVerifying(false);
  }, [serviceId]);

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawSecret = String(form.get('apiKey') || '');
    const service = services.find((item) => item.id === serviceId);
    const maskedKey = maskSecretPreview(rawSecret);
    const preverified = verificationResult?.maskedKey === maskedKey;
    onSave({
      serviceId,
      serviceName: service?.service_name || serviceId,
      environment,
      apiKey: rawSecret.trim(),
      maskedKey,
      verificationStatus: verification,
      verificationMessage: verificationDetail,
      verificationResult: preverified ? verificationResult : null
    });
    event.currentTarget.reset();
  }

  async function verify(event) {
    const form = event.currentTarget.form;
    const rawSecret = form ? String(new FormData(form).get('apiKey') || '') : '';
    setIsVerifying(true);
    setVerification('Verification Running');
    setVerificationDetail(`Fast CTO verification started. Hard timeout: ${CTO_FAST_VERIFICATION_TIMEOUT_MS / 1000} seconds.`);
    const result = await verifyIntegrationSecret(serviceId, rawSecret);
    const stampedResult = { ...result, maskedKey: maskSecretPreview(rawSecret), checkedAt: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) };
    setVerification(result.status);
    setVerificationDetail(result.message);
    setVerificationResult(stampedResult);
    setIsVerifying(false);
  }

  return (
    <div className="article-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="integration-modal-title">
      <form className="article-modal integration-modal" onSubmit={submit}>
        <button type="button" className="login-back" onClick={onCancel}>Cancel</button>
        <span className="selected-os-badge">Secure Secret Entry</span>
        <h2 id="integration-modal-title">Add / Replace Integration Key</h2>
        <p>Raw keys are accepted only in this secure entry field and are immediately reduced to a masked preview in this frontend local. Do not log or display full keys.</p>
        <EnvironmentSelector serviceId={serviceId} setServiceId={setServiceId} environment={environment} setEnvironment={setEnvironment} services={services} />
        <div className="verify-result-panel">
          <strong>Login account</strong>
          <span>{selectedProvider.loginAccount || ctoDefaultLoginEmail} / use provider OAuth when login is required. Passwords are not stored in CTO.</span>
        </div>
        <label className="secure-input">
          <span>API Key</span>
          <input name="apiKey" type="password" autoComplete="off" placeholder="Paste key for verification. It will not be displayed." required />
        </label>
        <div className="verify-result-panel">
          <strong>{verification}</strong>
          <span>{verificationDetail}</span>
        </div>
        <div className="approval-confirm-actions">
          <button type="button" className="ghost-button" onClick={verify} disabled={isVerifying}>{isVerifying ? 'Verifying...' : 'Verify Connection'}</button>
          <button type="submit" className="tactical-button" disabled={isVerifying}>Save Securely</button>
        </div>
      </form>
    </div>
  );
}

function EnvironmentSelector({ serviceId, setServiceId, environment, setEnvironment, services }) {
  return (
    <div className="environment-selector-grid">
      <label className="secure-input">
        <span>Service</span>
        <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
          {services.map((service) => <option key={service.id} value={service.id}>{service.service_name}</option>)}
        </select>
      </label>
      <label className="secure-input">
        <span>Environment</span>
        <select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
          {['Development', 'Staging', 'Production'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
  );
}

function IntegrationAuditTimeline({ audit }) {
  return (
    <section className="integration-panel integration-audit-panel">
      <div className="approval-section-header"><div><span>Integration Audit Timeline</span><h2>Secret control history</h2></div><Activity size={18} /></div>
      <div className="integration-audit-list">
        {audit.map((event) => (
          <div key={event.id}>
            <time>{event.created_at}</time>
            <strong>{event.action}</strong>
            <span>{event.actor} - {event.environment} - {event.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const linkedInPipelineItems = [
  {
    id: 'linkedin-uae-buyers',
    title: 'Why Country pending importers need transparent spice documentation',
    hook: 'Most buyer trust problems start before the shipment leaves India.',
    audience: 'Country pending spice importers and wholesale buyers',
    objective: 'Educate buyers on documentation discipline and GOPU export reliability.',
    schedule_date: 'Today - Draft window',
    status: 'Ready for Review'
  },
  {
    id: 'linkedin-lut-control',
    title: 'Export invoice control under LUT',
    hook: 'A clean export invoice is not paperwork. It is commercial risk control.',
    audience: 'Importers, consultants, exporter network',
    objective: 'Position GOPU as a process-led export company.',
    schedule_date: 'Tomorrow',
    status: 'Founder Approval Required'
  }
];

const instagramReelItems = [
  {
    id: 'reel-black-pepper',
    title: '30-40 sec Reel: black pepper export checklist',
    hook: 'Before a buyer sees the price, the shipment must pass the checklist.',
    scenes: ['Product close-up', 'Packing check', 'Document checklist', 'Founder approval gate'],
    caption: 'Export discipline starts with repeatable systems.',
    voiceover: 'From product to paperwork, every export needs a controlled operating rhythm.',
    status: 'Draft'
  },
  {
    id: 'reel-lut-invoice',
    title: '30-40 sec Reel: LUT invoice safety',
    hook: 'One missing LUT field can block an invoice release.',
    scenes: ['Invoice draft', 'LUT gate', 'Validation checklist', 'Director Queue'],
    caption: 'Draft first. Validate deeply. Release only after approval.',
    voiceover: 'GOPU Export OS protects invoices before they become buyer-facing documents.',
    status: 'Founder Approval Required'
  }
];

const youtubePlans = [
  {
    id: 'youtube-export-system',
    title: 'How a serious spice export company controls quote-to-invoice risk',
    concept: '15-minute founder-led educational video on operational discipline.',
    audience: 'Overseas buyers, exporter network, B2B procurement teams',
    sections: ['Buyer enquiry', 'Pricing control', 'LUT invoice validation', 'Founder approval', 'Shipment readiness'],
    broll: ['Warehouse checks', 'Packing labels', 'Invoice preview', 'Approval dashboard'],
    cta: 'Invite qualified buyers to request a controlled quotation.',
    status: 'Planned'
  }
];

const buyerOutreachCampaigns = [
  { id: 'campaign-uae', campaign_name: 'Country pending spice importers', target_market: 'United Arab Emirates', product_focus: 'Black pepper, cardamom, mixed spices', stage: 'Prospect list building', owner: 'CMO Command', next_action: 'Prepare compliant intro sequence', status: 'Monitoring' },
  { id: 'campaign-oman', campaign_name: 'Oman wholesale buyers', target_market: 'Oman', product_focus: 'Retail-ready spices', stage: 'Message draft', owner: 'CMO Command', next_action: 'Founder review for quality claims', status: 'Ready for Review' },
  { id: 'campaign-vietnam', campaign_name: 'Country pending distributors', target_market: 'Country pending', product_focus: 'Bulk spice distribution', stage: 'Market scan', owner: 'CMO Command', next_action: 'Map importer categories', status: 'Planned' },
  { id: 'campaign-linkedin', campaign_name: 'LinkedIn exporter network', target_market: 'Global B2B', product_focus: 'Brand authority', stage: 'Content cadence', owner: 'CMO Command', next_action: 'Publish only after approval', status: 'Draft' },
  { id: 'campaign-directory', campaign_name: 'Trade directory outreach', target_market: 'Multi-country', product_focus: 'Qualified importer discovery', stage: 'Directory review', owner: 'CMO Command', next_action: 'Validate source quality', status: 'Monitoring' }
];

const competitorReviewItems = [
  { id: 'comp-001', competitor_name: 'Regional spice exporter', platform: 'LinkedIn', observation: 'Posting product photos without process proof.', opportunity: 'Differentiate with documentation and validation-led content.', recommended_action: 'Create post around export process reliability.' },
  { id: 'comp-002', competitor_name: 'Commodity trading page', platform: 'Instagram', observation: 'High visual activity, low buyer education.', opportunity: 'Use short educational Reels for importer trust.', recommended_action: 'Prepare Reel concept on invoice and packing controls.' },
  { id: 'comp-003', competitor_name: 'B2B food supplier', platform: 'YouTube', observation: 'Long-form content lacks export compliance detail.', opportunity: 'Own compliance-aware export education.', recommended_action: 'Draft 15-minute video plan.' }
];

const brandApprovalItems = [
  { id: 'brand-organic', claim: '100% Organic', risk_level: 'High', reason: 'Certification-sensitive claim requires document proof and founder/legal review.', status: 'Founder Approval Required' },
  { id: 'brand-origin', claim: 'Direct from origin farms', risk_level: 'Medium', reason: 'Origin claim needs supplier traceability and approved wording.', status: 'Ready for Review' },
  { id: 'brand-quality', claim: 'Premium export-grade quality', risk_level: 'Medium', reason: 'Quality claim should match test reports and approved product grade.', status: 'Ready for Review' },
  { id: 'brand-delivery', claim: 'Fastest delivery guarantee', risk_level: 'High', reason: 'Delivery promise can create buyer commitment risk.', status: 'Founder Approval Required' }
];

const contentCalendarItems = [
  { id: 'cal-001', platform: 'LinkedIn', title: 'Country pending importer documentation post', scheduled_date: 'Today', status: 'Ready for Review' },
  { id: 'cal-002', platform: 'Instagram', title: 'Black pepper export checklist Reel', scheduled_date: 'Tomorrow', status: 'Draft' },
  { id: 'cal-003', platform: 'YouTube', title: 'Quote-to-invoice risk control video', scheduled_date: 'This week', status: 'Planned' },
  { id: 'cal-004', platform: 'LinkedIn', title: 'LUT invoice safety post', scheduled_date: 'This week', status: 'Founder Approval Required' }
];

const contentMemoryCategories = [
  'Brand voice',
  'Approved claims',
  'Rejected claims',
  'Buyer objections',
  'Winning hooks',
  'Competitor notes',
  'Content playbook',
  'Market positioning',
  'Successful campaigns'
];

const cmoModels = [
  'content_items',
  'content_calendar',
  'marketing_campaigns',
  'competitor_reviews',
  'brand_approval_requests',
  'content_memory',
  'cmo_openai_content_memory'
];


const briefingHeroMetrics = [
  { label: 'Active Workflows', value: '12', status: 'Monitoring' },
  { label: 'Blocked Operations', value: '03', status: 'Attention' },
  { label: 'Approvals Pending', value: '07', status: 'Review Required' },
  { label: 'Technical Risks', value: '02', status: 'High Risk' },
  { label: 'Urgent Actions', value: '04', status: 'Critical' },
  { label: 'Revenue Impact', value: '02', status: 'Attention' },
  { label: 'Critical Deadlines', value: '05', status: 'Today' }
];

const executiveBriefingSummaries = [
  {
    id: 'coo-summary',
    command: 'COO',
    title: 'COO Operations Summary',
    route: '/export-os/executives/coo',
    reviewRoute: '/export-os/tasks',
    icon: Workflow,
    status: 'Monitoring',
    points: [
      '3 workflows are blocked by missing invoice validation.',
      '2 supplier confirmations pending.',
      'Founder review required for HSN-sensitive shipment.',
      'Today priority: unblock document and supplier follow-up dependencies.'
    ],
    metrics: [['Active Leads', '06'], ['Blocked Workflows', '03'], ['Supplier Follow-ups', '02'], ['Document Blockers', '03']]
  },
  {
    id: 'cfo-summary',
    command: 'CFO',
    title: 'CFO Commercial Summary',
    route: '/export-os/executives/cfo',
    reviewRoute: '/export-os/pricing-engine',
    icon: CircleDollarSign,
    status: 'Review Active',
    points: [
      'Country pending black pepper quote below preferred margin threshold.',
      'High freight volatility detected for sea shipment.',
      'Pricing approval dependency remains open before buyer-facing quotation.',
      'FX exposure requires attention for AED-linked discussion.'
    ],
    metrics: [['Quote Approvals', '03'], ['Margin Risks', '02'], ['FX Alerts', '01'], ['CFO Reviews', '04']]
  },
  {
    id: 'cto-summary',
    command: 'CTO',
    title: 'CTO Technical Summary',
    route: '/export-os/executives/cto',
    reviewRoute: '/export-os/executives/cto/integrations',
    icon: Network,
    status: 'Risk Scan',
    points: [
      'Forex API timeout detected.',
      'OpenAI credits crossed 82% usage threshold.',
      'Integration vault has monitoring state for production services.',
      'Form and automation checks should be reviewed before campaign scale-up.'
    ],
    metrics: [['API Warnings', '02'], ['Low Credits', '01'], ['Deploy Risks', '01'], ['Automations', 'Monitoring']]
  },
  {
    id: 'cmo-summary',
    command: 'CMO',
    title: 'CMO Growth Summary',
    route: '/export-os/executives/cmo',
    reviewRoute: '/export-os/content-engine',
    icon: Target,
    status: 'Content Runbook',
    points: [
      'LinkedIn post pending founder review.',
      'Instagram Reel concept ready.',
      'Organic claim requires approval.',
      'Buyer outreach campaign drafts remain in review mode.'
    ],
    metrics: [['Content Today', '04'], ['Claim Reviews', '02'], ['Campaigns', '05'], ['Competitor Notes', '03']]
  }
];

const criticalFounderActions = [
  { id: 'action-lut', title: 'Approve LUT invoice release', department: 'Documents / CFO', risk_level: 'Critical', business_impact: 'Invoice release remains blocked until LUT and founder checks pass.', deadline: 'Today 10:15', next_action: 'Open invoice validation and route approval.', route: '/export-os/invoices/new' },
  { id: 'action-margin', title: 'Review low-margin quotation', department: 'CFO Command', risk_level: 'High', business_impact: 'Buyer-facing quote may breach safe margin threshold.', deadline: 'Today 09:00', next_action: 'Review pricing risk before quotation draft.', route: '/export-os/pricing-engine' },
  { id: 'action-api', title: 'Resolve API credit warning', department: 'CTO Command', risk_level: 'High', business_impact: 'Automation and AI generation reliability may degrade.', deadline: 'Today 11:00', next_action: 'Check usage and rotate/replace keys if required.', route: '/export-os/executives/cto/integrations' },
  { id: 'action-doc-revision', title: 'Approve export document revision', department: 'COO Command', risk_level: 'Medium', business_impact: 'Document release remains draft-only until founder review.', deadline: 'Today 12:30', next_action: 'Open Director Queue and add decision note.', route: '/export-os/director' }
];

const briefingApprovals = [
  { id: 'brief-approval-quote', title: 'Black pepper quotation margin review', department: 'CFO', reason: 'Low margin and freight volatility', risk_level: 'High', created_time: '09:00' },
  { id: 'brief-approval-invoice', title: 'LUT invoice release gate', department: 'Documents', reason: 'LUT and HSN checks require founder approval', risk_level: 'Critical', created_time: '10:15' },
  { id: 'brief-approval-claim', title: 'Organic marketing claim', department: 'CMO', reason: 'Certification-sensitive public wording', risk_level: 'High', created_time: '12:00' },
  { id: 'brief-approval-payment', title: 'Payment term exception', department: 'CFO', reason: 'Unusual buyer terms requested', risk_level: 'Medium', created_time: '13:20' }
];

const briefingRiskAlerts = [
  { id: 'risk-operations', category: 'Operations', status: 'Attention', title: 'Shipment planning blocked', message: 'Supplier confirmation and document validation are still pending.', details: 'COO recommends founder review if buyer commitment depends on dispatch timeline.' },
  { id: 'risk-financial', category: 'Financial', status: 'High Risk', title: 'Low-margin quote active', message: 'Preferred margin threshold is not met for one draft quote.', details: 'CFO review should happen before any buyer-facing quotation movement.' },
  { id: 'risk-technical', category: 'Technical', status: 'High Risk', title: 'API credits crossed warning threshold', message: 'OpenAI usage is above 82% in local monitoring.', details: 'CTO should inspect usage and quota before daily content generation scales.' },
  { id: 'risk-compliance', category: 'Compliance', status: 'Critical', title: 'Invoice release blocked by missing LUT data', message: 'LUT details must be completed before final PDF or buyer release.', details: 'Route owner to Company Master Data Vault and Director Queue.' },
  { id: 'risk-marketing', category: 'Marketing', status: 'Monitoring', title: 'Risky claim pending', message: 'Organic and origin claims require founder-approved wording.', details: 'CMO should keep these as drafts until certification support is confirmed.' }
];

const priorityTimelineItems = [
  { time: '08:30', event: 'Morning COO review', status: 'Monitoring' },
  { time: '09:00', event: 'Pricing approval pending', status: 'Review Required' },
  { time: '10:15', event: 'Invoice validation issue detected', status: 'Critical' },
  { time: '11:00', event: 'CTO API warning generated', status: 'High Risk' },
  { time: '12:00', event: 'CMO content approval pending', status: 'Attention' }
];

const briefingArchiveItems = [
  { id: 'archive-001', briefing_date: 'Today', generated_time: '08:39 AM', major_issues: 'LUT invoice, low-margin quote, API usage', approvals_count: 7, risk_level: 'High Priority', generated_by: 'GOPU Executive Intelligence' },
  { id: 'archive-002', briefing_date: 'Yesterday', generated_time: '08:39 AM', major_issues: 'Supplier follow-up, document checks', approvals_count: 4, risk_level: 'Attention', generated_by: 'GOPU Executive Intelligence' },
  { id: 'archive-003', briefing_date: 'This Week', generated_time: '08:39 AM', major_issues: 'Pricing exceptions, content claims', approvals_count: 11, risk_level: 'Escalated', generated_by: 'GOPU Executive Intelligence' }
];

const briefingMemoryItems = [
  'LUT and invoice data repeatedly block document release.',
  'Low-margin pricing reviews cluster around high freight lanes.',
  'Supplier confirmations often require COO same-day follow-up.',
  'API credit usage rises during content generation windows.',
  'Organic and origin claims repeatedly need founder-approved wording.',
  'Marketing campaigns wait on claim validation before scheduling.'
];

const briefingModels = ['founder_briefings', 'briefing_sections', 'briefing_alerts', 'founder_action_items', 'briefing_memory'];

function FounderMorningBriefing({ navigate, onBack, archiveMode = false }) {
  const [now, setNow] = useState(() => new Date());
  const [briefingStatus, setBriefingStatus] = useState(archiveMode ? 'Attention' : 'Ready');
  const [generatedNote, setGeneratedNote] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [expandedAlert, setExpandedAlert] = useState(briefingRiskAlerts[0]?.id);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function generateBriefing() {
    setBriefingStatus('Generating');
    window.setTimeout(() => {
      setBriefingStatus('Attention');
      setGeneratedNote(`Local briefing generated ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. Review critical invoice, pricing, API, and marketing approval items before release actions.`);
    }, 500);
  }

  function generateActionPlan() {
    setActionPlan([
      '1. Critical Decisions Needed: LUT invoice release, low-margin quote, risky marketing claims.',
      '2. High-Risk Workflows: Invoice validation, freight-sensitive quotation, API credit usage.',
      '3. Operational Bottlenecks: Supplier confirmation and document validation dependencies.',
      '4. Financial Risks: Margin threshold breach and freight volatility.',
      '5. Technical Risks: Forex timeout and AI credit usage warning.',
      '6. Brand/Marketing Risks: Organic, origin, delivery, and quality claims pending founder review.',
      '7. Recommended Founder Actions: Open Director Queue, review Pricing Engine, inspect Integration Vault.',
      '8. Escalation Recommendations: COO for blocked work, CFO for margin, CTO for API, CMO for claims.'
    ].join('\n'));
  }

  return (
    <ExportOSShell className="morning-briefing-shell">
      <BriefingHeader now={now} status={briefingStatus} onBack={onBack} />
      <FounderSummaryHero onGenerate={generateBriefing} generatedNote={generatedNote} />
      <section className="briefing-model-strip">
        {briefingModels.map((model) => <code key={model}>{model}</code>)}
      </section>
      <main className="briefing-layout">
        <section className="briefing-left-stack">
          {executiveBriefingSummaries.map((summary) => <ExecutiveSummaryCard key={summary.id} summary={summary} navigate={navigate} />)}
        </section>
        <section className="briefing-center-stack">
          <CriticalActionsPanel actions={criticalFounderActions} navigate={navigate} />
          <RiskAlertPanel alerts={briefingRiskAlerts} expandedAlert={expandedAlert} setExpandedAlert={setExpandedAlert} />
          <PriorityTimeline items={priorityTimelineItems} />
        </section>
        <aside className="briefing-right-stack">
          <FounderApprovalSummary approvals={briefingApprovals} navigate={navigate} />
          <FounderActionPlan onGenerate={generateActionPlan} output={actionPlan} />
          <BriefingMemoryPanel />
        </aside>
      </main>
      <BriefingArchive items={briefingArchiveItems} />
    </ExportOSShell>
  );
}

function BriefingHeader({ now, status, onBack }) {
  return (
    <header className="deck-header briefing-header">
      <div className="deck-header-copy">
        <span>GOPU Export OS</span>
        <h1>Founder Morning Briefing</h1>
        <p>Executive Intelligence Summary</p>
      </div>
      <div className="deck-header-controls">
        <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
        <div className="coo-status"><CalendarClock size={16} /><strong>{now.toLocaleDateString([], { dateStyle: 'full' })}</strong></div>
        <div className="coo-time"><TimerReset size={16} /><span>{now.toLocaleTimeString([], { timeStyle: 'short' })}</span></div>
        <StatusBadge label={`Briefing Status: ${status}`} state={status === 'Attention' ? 'attention' : status === 'Generating' ? 'progress' : 'online'} />
        <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
      </div>
    </header>
  );
}

function FounderSummaryHero({ onGenerate, generatedNote }) {
  return (
    <section className="briefing-hero">
      <div>
        <span className="coo-kicker">Todays Founder Briefing</span>
        <h2>Executive command intelligence for todays decisions</h2>
        <p>Consolidated from COO, CFO, CTO, and CMO command units. Connect Supabase to activate only: no issue is marked resolved and no release action is claimed.</p>
        <div className="briefing-status-chips">
          {['COO Monitoring', 'CFO Review Active', 'CTO Risk Scan', 'CMO Content Runbook'].map((chip) => <StatusBadge key={chip} label={chip} state="progress" />)}
        </div>
      </div>
      <div className="briefing-hero-metrics">
        {briefingHeroMetrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.status}</small>
          </article>
        ))}
      </div>
      <div className="briefing-generate-box">
        <button className="tactical-button" onClick={onGenerate}>Generate New Briefing</button>
        {generatedNote && <p>{generatedNote}</p>}
      </div>
    </section>
  );
}

function ExecutiveSummaryCard({ summary, navigate }) {
  const Icon = summary.icon;
  return (
    <section className="briefing-panel executive-briefing-card">
      <div className="approval-section-header"><div><span>{summary.command} Command</span><h2>{summary.title}</h2></div><Icon size={18} /></div>
      <StatusBadge label={summary.status} state="progress" />
      <div className="briefing-mini-metrics">
        {summary.metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <ul>
        {summary.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <div className="briefing-action-row">
        <button className="ghost-button" onClick={() => navigate(summary.route)}>Open {summary.command} Command</button>
        <button className="ghost-button" onClick={() => navigate(summary.reviewRoute)}>Review {summary.command === 'COO' ? 'Operations' : summary.command === 'CFO' ? 'Pricing Risks' : summary.command === 'CTO' ? 'Technical Risks' : 'Campaigns'}</button>
      </div>
    </section>
  );
}

function CriticalActionsPanel({ actions, navigate }) {
  return (
    <section className="briefing-panel">
      <div className="approval-section-header"><div><span>Critical Founder Actions</span><h2>Decision queue</h2></div><AlertTriangle size={18} /></div>
      <div className="critical-action-list">
        {actions.map((action) => (
          <article key={action.id}>
            <div><strong>{action.title}</strong><PriorityBadge priority={action.risk_level} /></div>
            <p>{action.business_impact}</p>
            <dl>
              <div><dt>Department</dt><dd>{action.department}</dd></div>
              <div><dt>Deadline</dt><dd>{action.deadline}</dd></div>
              <div><dt>Next Action</dt><dd>{action.next_action}</dd></div>
            </dl>
            <div className="briefing-action-row">
              <button onClick={() => navigate(action.route)}>Open Approval</button>
              <button>Escalate</button>
              <button>Add Note</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FounderApprovalSummary({ approvals, navigate }) {
  return (
    <section className="briefing-panel">
      <div className="approval-section-header"><div><span>Pending Founder Approvals</span><h2>{approvals.length} waiting</h2></div><FileCheck2 size={18} /></div>
      <div className="briefing-approval-list">
        {approvals.length === 0
          ? <EmptyState icon={CheckCircle2} title="All clear" description="No pending approvals at this time." />
          : approvals.map((approval) => (
            <article key={approval.id}>
              <strong>{approval.title}</strong>
              <span>{approval.department} - {approval.created_time}</span>
              <p>{approval.reason}</p>
              <PriorityBadge priority={approval.risk_level} />
            </article>
          ))}
      </div>
      <button className="tactical-button" onClick={() => navigate('/export-os/director')}>Open Director Command Center</button>
    </section>
  );
}

function RiskAlertPanel({ alerts, expandedAlert, setExpandedAlert }) {
  return (
    <section className="briefing-panel">
      <div className="approval-section-header"><div><span>Urgent Risks & Alerts</span><h2>Attention map</h2></div><TriangleAlert size={18} /></div>
      <div className="briefing-risk-list">
        {alerts.map((alert) => (
          <button key={alert.id} className={`briefing-risk-item state-${getApprovalState(alert.status)}`} onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}>
            <div>
              <span>{alert.category}</span>
              <strong>{alert.title}</strong>
              <small>{alert.message}</small>
              {expandedAlert === alert.id && <p>{alert.details}</p>}
            </div>
            <StatusBadge label={alert.status} state={getApprovalState(alert.status)} />
          </button>
        ))}
      </div>
    </section>
  );
}

function PriorityTimeline({ items }) {
  return (
    <section className="briefing-panel">
      <div className="approval-section-header"><div><span>Todays Priority Timeline</span><h2>Founder operating rhythm</h2></div><TimerReset size={18} /></div>
      <div className="priority-timeline-list">
        {items.map((item) => (
          <div key={`${item.time}-${item.event}`}>
            <time>{item.time}</time>
            <span>{item.event}</span>
            <StatusBadge label={item.status} state={getApprovalState(item.status)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function BriefingArchive({ items }) {
  const [opened, setOpened] = useState(null);
  return (
    <section className="briefing-panel briefing-archive-panel">
      <div className="approval-section-header"><div><span>Previous Founder Briefings</span><h2>Archive</h2></div><ClipboardList size={18} /></div>
      <div className="briefing-archive-grid">
        {items.map((item) => (
          <article key={item.id}>
            <div><strong>{item.briefing_date}</strong><PriorityBadge priority={item.risk_level === 'High Priority' ? 'High' : item.risk_level === 'Escalated' ? 'Critical' : 'Medium'} /></div>
            <span>{item.generated_time} - {item.generated_by}</span>
            <p>{item.major_issues}</p>
            <small>{item.approvals_count} approvals</small>
            <button className="ghost-button" onClick={() => setOpened(opened === item.id ? null : item.id)}>Open Briefing</button>
            {opened === item.id && <p className="cmo-local-summary">Archived local briefing opened. Connected mode will load full sections, alerts, actions, and audit references.</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function BriefingMemoryPanel() {
  return (
    <section className="briefing-panel">
      <div className="approval-section-header"><div><span>Briefing Intelligence Memory</span><h2>Memory</h2></div><Database size={18} /></div>
      <div className="briefing-memory-list">
        {briefingMemoryItems.map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="briefing-action-row">
        <button>Save Insight</button>
        <button>Generate Trend Review</button>
        <button>Compare Previous Briefings</button>
      </div>
    </section>
  );
}

function FounderActionPlan({ onGenerate, output }) {
  return (
    <section className="briefing-panel">
      <div className="approval-section-header"><div><span>Founder Action Plan</span><h2>Daily decision structure</h2></div><ClipboardCheck size={18} /></div>
      <button className="tactical-button" onClick={onGenerate}>Generate Founder Action Plan</button>
      {output && <pre className="task-local-output">{output}</pre>}
    </section>
  );
}

const whatsappCommandMessages = [
  {
    id: 'wa-001',
    sender: 'Founder',
    timestamp: '08:42',
    raw_message: 'Buyer: Buyer pending, Product: Product pending, Quantity: 2 tons, Destination: Country pending, Deadline: Friday, Shipping: Sea.',
    command_type: 'New Buyer Lead',
    parse_status: 'Parsed',
    workflow_status: 'Routing Prepared'
  },
  {
    id: 'wa-002',
    sender: 'Founder',
    timestamp: '09:05',
    raw_message: 'Prepare quote for 5 tons turmeric to Oman under CIF terms.',
    command_type: 'Price Quote Request',
    parse_status: 'Parsed',
    workflow_status: 'Approval Required'
  },
  {
    id: 'wa-003',
    sender: 'Founder',
    timestamp: '10:10',
    raw_message: 'Create LUT invoice for approved Country pending black pepper order.',
    command_type: 'Invoice Request',
    parse_status: 'Missing Info',
    workflow_status: 'Draft Response Ready'
  },
  {
    id: 'wa-004',
    sender: 'Founder',
    timestamp: '11:20',
    raw_message: 'Follow up supplier for packing confirmation today.',
    command_type: 'Follow-up Task',
    parse_status: 'Parsed',
    workflow_status: 'Routed to COO'
  },
  {
    id: 'wa-005',
    sender: 'Founder',
    timestamp: '12:00',
    raw_message: 'Show pending approvals.',
    command_type: 'Approval Request',
    parse_status: 'Parsed',
    workflow_status: 'Routing Prepared'
  },
  {
    id: 'wa-006',
    sender: 'Founder',
    timestamp: '12:30',
    raw_message: "Give todays briefing.",
    command_type: 'Morning Briefing Request',
    parse_status: 'Parsed',
    workflow_status: 'Draft Response Ready'
  }
];

const whatsappIntegrationStatus = [
  ['WhatsApp API Status', 'Connect Supabase to activate'],
  ['Webhook Status', 'Webhook Pending'],
  ['Template Status', 'Verification Required'],
  ['Last Message Received', '12:30'],
  ['Last Successful Parse', '12:31'],
  ['Failed Parses', '01'],
  ['Pending Responses', '03']
];

const whatsappModels = ['whatsapp_commands', 'parsed_commands', 'command_workflow_routes', 'whatsapp_response_drafts', 'whatsapp_audit_log'];

function parseWhatsAppCommand(rawMessage) {
  const text = rawMessage.trim();
  const lower = text.toLowerCase();
  const commandType = lower.includes('pending approval') || lower.includes('approvals')
    ? 'Approval Request'
    : lower.includes('briefing')
      ? 'Morning Briefing Request'
      : lower.includes('invoice')
        ? 'Invoice Request'
        : lower.includes('quote')
          ? 'Price Quote Request'
          : lower.includes('follow up') || lower.includes('follow-up')
            ? 'Follow-up Task'
            : 'New Buyer Lead';

  const buyer = text.match(/buyer:\s*([^,]+)/i)?.[1]?.trim() || (lower.includes('al noor') ? 'Buyer pending' : '');
  const product = text.match(/product:\s*([^,]+)/i)?.[1]?.trim()
    || text.match(/(?:tons?|tonne[s]?)\s+([a-z\s]+?)\s+(?:to|for|under)/i)?.[1]?.trim()
    || (lower.includes('black pepper') ? 'Product pending' : lower.includes('turmeric') ? 'Turmeric' : '');
  const quantity = text.match(/quantity:\s*([^,]+)/i)?.[1]?.trim() || text.match(/(\d+(?:\.\d+)?\s*(?:tons?|tonnes?|kg|bags|cartons))/i)?.[1]?.trim() || '';
  const destination = text.match(/destination:\s*([^,]+)/i)?.[1]?.trim() || text.match(/\bto\s+([A-Z][a-zA-Z\s]+?)(?:\s+under|\s+for|\.|,|$)/)?.[1]?.trim() || (lower.includes('uae') ? 'Country pending' : lower.includes('oman') ? 'Oman' : '');
  const deadline = text.match(/deadline:\s*([^,]+)/i)?.[1]?.trim() || (lower.includes('today') ? 'Today' : lower.includes('friday') ? 'Friday' : '');
  const shippingMode = text.match(/shipping:\s*([^,\.]+)/i)?.[1]?.trim() || (lower.includes('sea') ? 'Sea' : lower.includes('air') ? 'Air' : '');
  const incoterm = text.match(/\b(EXW|FOB|CIF|CFR|DAP|DDP)\b/i)?.[1]?.toUpperCase() || '';
  const requestedAction = commandType;

  const requiredByType = {
    'New Buyer Lead': ['buyer', 'product', 'quantity', 'destination', 'deadline', 'shippingMode'],
    'Price Quote Request': ['product', 'quantity', 'destination', 'incoterm'],
    'Invoice Request': ['buyer', 'product', 'destination', 'incoterm'],
    'Follow-up Task': ['deadline'],
    'Approval Request': [],
    'Morning Briefing Request': []
  };
  const fieldValues = { buyer, product, quantity, destination, deadline, shippingMode, incoterm };
  const labelMap = { buyer: 'buyer', product: 'product', quantity: 'quantity', destination: 'destination', deadline: 'deadline', shippingMode: 'shipping mode', incoterm: 'incoterm' };
  const missingFields = requiredByType[commandType].filter((field) => !fieldValues[field]).map((field) => labelMap[field]);
  const target = getWhatsAppRouting(commandType, missingFields);

  return {
    commandType,
    buyer,
    product,
    quantity,
    destination,
    deadline,
    shippingMode,
    incoterm,
    requestedAction,
    requiredDepartment: target.department,
    nextWorkflow: target.workflow,
    approvalNeeded: target.approvalNeeded,
    missingFields,
    confidence: missingFields.length ? 76 : 92,
    responseDraft: buildWhatsAppResponse(commandType, missingFields, target)
  };
}

function getWhatsAppRouting(commandType, missingFields = []) {
  const routes = {
    'New Buyer Lead': { department: 'COO Command', workflow: 'Lead Intake -> COO Command -> Pricing Engine', approvalNeeded: 'Pricing review if quote is prepared', route: '/export-os/tasks' },
    'Price Quote Request': { department: 'CFO Command', workflow: 'Pricing Engine -> CFO Review -> Director Queue', approvalNeeded: 'Founder approval if margin, freight, or payment risk triggers', route: '/export-os/pricing-engine' },
    'Invoice Request': { department: 'Invoice System', workflow: 'Invoice System -> Validation -> Director Queue', approvalNeeded: 'Founder approval required before release', route: '/export-os/invoices/new' },
    'Follow-up Task': { department: 'COO Command', workflow: 'Task Engine -> COO Command', approvalNeeded: 'Only if blocked or sensitive', route: '/export-os/tasks' },
    'Approval Request': { department: 'Director Command Center', workflow: 'Director Queue', approvalNeeded: 'Founder action required', route: '/export-os/director' },
    'Morning Briefing Request': { department: 'Executive Briefing', workflow: 'Morning Briefing System', approvalNeeded: 'No release action', route: '/export-os/morning-briefing' }
  };
  const target = routes[commandType] || routes['New Buyer Lead'];
  return missingFields.length ? { ...target, workflow: 'Clarification Required -> ' + target.workflow } : target;
}

function buildWhatsAppResponse(commandType, missingFields, target) {
  if (missingFields.length) {
    return `Received. I need ${missingFields.join(', ')} before preparing the ${commandType.toLowerCase()} workflow.`;
  }
  if (commandType === 'Approval Request') return 'Received. Pending approvals are ready for review in the Director Command Center.';
  if (commandType === 'Morning Briefing Request') return "Received. Todays founder briefing is ready for review in the Morning Briefing System.";
  if (commandType === 'Price Quote Request') return 'Received. I have prepared the pricing workflow for CFO review and founder approval routing if required.';
  if (commandType === 'Invoice Request') return 'Received. I have prepared an invoice validation workflow. Final release remains blocked until approval checks pass.';
  return `Received. I have prepared the workflow and routed it toward ${target.department} for review.`;
}

function WhatsAppFounderCommand({ navigate, onBack, inboxMode = false }) {
  const [selectedId, setSelectedId] = useState(whatsappCommandMessages[0].id);
  const [input, setInput] = useState('Prepare quote for 5 tons turmeric to Oman under CIF terms.');
  const [parsed, setParsed] = useState(() => parseWhatsAppCommand(whatsappCommandMessages[0].raw_message));
  const [routeStatus, setRouteStatus] = useState('Routing Prepared');
  const selectedMessage = whatsappCommandMessages.find((message) => message.id === selectedId) || whatsappCommandMessages[0];

  function selectMessage(message) {
    setSelectedId(message.id);
    setInput(message.raw_message);
    setParsed(parseWhatsAppCommand(message.raw_message));
    setRouteStatus(message.workflow_status);
  }

  function parseCommand() {
    const next = parseWhatsAppCommand(input);
    setParsed(next);
    setRouteStatus(next.missingFields.length ? 'Missing Info' : 'Routing Prepared');
  }

  function demoRoute(status) {
    setRouteStatus(status);
  }

  return (
    <ExportOSShell className="whatsapp-command-shell">
      <header className="deck-header whatsapp-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{inboxMode ? 'WhatsApp Command Inbox' : 'WhatsApp Founder Command'}</h1>
          <p>Parse founder WhatsApp instructions into structured export workflows.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label="WhatsApp Status: Connect Supabase to activate" state="progress" />
          <div className="coo-status"><Mail size={16} /><strong>{whatsappCommandMessages.length} messages</strong></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <section className="whatsapp-command-hero">
        <div>
          <span className="coo-kicker">Mobile Command Bridge</span>
          <h2>Founder messages become controlled business workflows</h2>
          <p>Command parser identifies command type, extracts export fields, detects missing information, prepares routing, and drafts a founder response. No WhatsApp message is sent from this frontend.</p>
        </div>
        <div className="whatsapp-flow-strip">
          {['Founder sends WhatsApp message', 'System receives message', 'Message parsed', 'Missing fields detected', 'Workflow type identified', 'COO/CFO/Approval routing prepared', 'Response draft generated'].map((step) => <span key={step}>{step}</span>)}
        </div>
      </section>

      <section className="briefing-model-strip">
        {whatsappModels.map((model) => <code key={model}>{model}</code>)}
      </section>

      <main className="whatsapp-command-layout">
        <section className="whatsapp-left-stack">
          <WhatsAppCommandInbox messages={whatsappCommandMessages} selectedId={selectedId} onSelect={selectMessage} />
          <WhatsAppIntegrationStatus />
        </section>
        <section className="whatsapp-center-stack">
          <CommandParser input={input} setInput={setInput} onParse={parseCommand} />
          <ParsedWorkflowPreview parsed={parsed} routeStatus={routeStatus} />
          <WorkflowRoutingPanel parsed={parsed} navigate={navigate} onRoute={demoRoute} />
        </section>
        <aside className="whatsapp-right-stack">
          <MissingInfoDetector parsed={parsed} />
          <FounderResponseDraft parsed={parsed} routeStatus={routeStatus} />
          <CommandAuditTrail parsed={parsed} routeStatus={routeStatus} selectedMessage={selectedMessage} />
        </aside>
      </main>
    </ExportOSShell>
  );
}

function WhatsAppCommandInbox({ messages, selectedId, onSelect }) {
  return (
    <section className="whatsapp-panel">
      <div className="approval-section-header"><div><span>WhatsApp Command Inbox</span><h2>Inbound founder messages</h2></div><Mail size={18} /></div>
      <div className="whatsapp-inbox-list">
        {messages.map((message) => (
          <button key={message.id} className={selectedId === message.id ? 'selected' : ''} onClick={() => onSelect(message)}>
            <div>
              <strong>{message.command_type}</strong>
              <span>{message.sender} - {message.timestamp}</span>
            </div>
            <p>{message.raw_message}</p>
            <footer>
              <StatusBadge label={message.parse_status} state={getApprovalState(message.parse_status)} />
              <StatusBadge label={message.workflow_status} state={getApprovalState(message.workflow_status)} />
            </footer>
          </button>
        ))}
      </div>
    </section>
  );
}

function CommandParser({ input, setInput, onParse }) {
  return (
    <section className="whatsapp-panel">
      <div className="approval-section-header"><div><span>Command Parser</span><h2>Simulate founder instruction</h2></div><ScanLine size={18} /></div>
      <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste or simulate founder WhatsApp command..." />
      <button className="tactical-button" onClick={onParse}>Parse Command</button>
    </section>
  );
}

function ParsedWorkflowPreview({ parsed, routeStatus }) {
  const rows = [
    ['Command Type', parsed.commandType],
    ['Buyer', parsed.buyer || 'Missing'],
    ['Product', parsed.product || 'Missing'],
    ['Quantity', parsed.quantity || 'Missing'],
    ['Destination', parsed.destination || 'Missing'],
    ['Deadline', parsed.deadline || 'Missing'],
    ['Shipping Mode', parsed.shippingMode || 'Missing'],
    ['Incoterm', parsed.incoterm || 'Missing'],
    ['Required Department', parsed.requiredDepartment],
    ['Next Workflow', parsed.nextWorkflow],
    ['Approval Needed', parsed.approvalNeeded],
    ['Confidence', `${parsed.confidence}%`]
  ];
  return (
    <section className="whatsapp-panel">
      <div className="approval-section-header"><div><span>Parsed Workflow Preview</span><h2>{parsed.commandType}</h2></div><Workflow size={18} /></div>
      <div className="whatsapp-preview-grid">
        {rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <StatusBadge label={routeStatus} state={getApprovalState(routeStatus)} />
    </section>
  );
}

function MissingInfoDetector({ parsed }) {
  const suggested = parsed.missingFields.length
    ? `Please confirm ${parsed.missingFields.join(', ')} before ${parsed.commandType.toLowerCase()} preparation.`
    : 'Required fields are present for local workflow preparation.';
  return (
    <section className="whatsapp-panel">
      <div className="approval-section-header"><div><span>Missing Information Detector</span><h2>{parsed.missingFields.length ? `${parsed.missingFields.length} missing` : 'Fields ready'}</h2></div><AlertTriangle size={18} /></div>
      <div className="missing-field-list">
        {['buyer', 'product', 'quantity', 'destination', 'deadline', 'shipping mode', 'incoterm'].map((field) => {
          const missing = parsed.missingFields.includes(field);
          return <span className={missing ? 'missing' : 'present'} key={field}>{field}: {missing ? 'Missing' : 'Present / not required'}</span>;
        })}
      </div>
      <p>{suggested}</p>
    </section>
  );
}

function WorkflowRoutingPanel({ parsed, navigate, onRoute }) {
  const target = getWhatsAppRouting(parsed.commandType, parsed.missingFields);
  const routeSteps = ['WhatsApp Message', 'Command Parser', target.workflow.split(' -> ')[0], parsed.requiredDepartment, 'CFO / Director Queue if needed', 'Founder Response Draft'];
  return (
    <section className="whatsapp-panel">
      <div className="approval-section-header"><div><span>Workflow Routing Panel</span><h2>Prepared routing chain</h2></div><Route size={18} /></div>
      <div className="whatsapp-route-chain">
        {routeSteps.map((step) => <div key={step}><span>{step}</span><ChevronRight size={14} /></div>)}
      </div>
      <div className="whatsapp-action-grid">
        <button onClick={() => onRoute('Routed to COO')}>Route to COO</button>
        <button onClick={() => onRoute('Routing Prepared')}>Create Lead Workflow</button>
        <button onClick={() => navigate('/export-os/pricing-engine')}>Request CFO Pricing</button>
        <button onClick={() => navigate('/export-os/director')}>Open Director Queue</button>
        <button onClick={() => navigate('/export-os/tasks')}>Create Task</button>
        <button onClick={() => navigate(target.route)}>Open Target Module</button>
      </div>
    </section>
  );
}

function FounderResponseDraft({ parsed, routeStatus }) {
  return (
    <section className="whatsapp-panel">
      <div className="approval-section-header"><div><span>Founder Response Draft</span><h2>Draft only</h2></div><Send size={18} /></div>
      <div className="whatsapp-response-draft">
        <strong>Status: {routeStatus}</strong>
        <p>{parsed.responseDraft}</p>
      </div>
      <small>No real WhatsApp message is sent until backend WhatsApp API, template approval, and founder release controls are connected.</small>
    </section>
  );
}

function CommandAuditTrail({ parsed, routeStatus, selectedMessage }) {
  const events = [
    ['Command received', selectedMessage.timestamp, 'Received'],
    ['Message parsed', 'Command parser', parsed.missingFields.length ? 'Missing Info' : 'Parsed'],
    ['Missing fields identified', 'Command Parser', parsed.missingFields.length ? parsed.missingFields.join(', ') : 'None'],
    ['Workflow prepared', parsed.requiredDepartment, routeStatus],
    ['Response draft generated', 'System', 'Draft Response Ready']
  ];
  return (
    <section className="whatsapp-panel">
      <div className="approval-section-header"><div><span>Command Audit Trail</span><h2>Workflow evidence</h2></div><Activity size={18} /></div>
      <div className="task-audit-mini">
        {events.map(([event, actor, status]) => <div key={event}><time>{actor}</time><span>{event}</span><small>{status}</small></div>)}
      </div>
    </section>
  );
}

function WhatsAppIntegrationStatus() {
  return (
    <section className="whatsapp-panel">
      <div className="approval-section-header"><div><span>WhatsApp Integration Status</span><h2>Connect Supabase to activate</h2></div><RadioTower size={18} /></div>
      <div className="whatsapp-status-grid">
        {whatsappIntegrationStatus.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </section>
  );
}

function PlantDashboard({ onBack }) {
  const plantMetrics = [
    { label: 'Raw Intake', value: '18.4T', delta: '+6 batches', tone: 'cyan' },
    { label: 'Processing Yield', value: '94.2%', delta: '+2.1%', tone: 'green' },
    { label: 'Quality Holds', value: '03', delta: 'pending lab', tone: 'amber' },
    { label: 'Dispatch Ready', value: '142', delta: 'cartons', tone: 'blue' }
  ];

  return (
    <div className="app plant-app">
      <div className="background-grid" />
      <section className="plant-shell">
        <header className="plant-header">
          <div>
            <span>SPICE PLANT OS</span>
            <h1>Factory & Processing Intelligence</h1>
            <p>Raw intake, batch processing, quality checks, packing, warehouse movement, and dispatch operations.</p>
          </div>
          <button className="ghost-button" onClick={onBack}>OS Gateway <ChevronRight size={14} /></button>
        </header>
        <div className="metric-grid">
          {plantMetrics.map((metric, index) => (
            <article className={`metric-panel tone-${metric.tone}`} key={metric.label} style={{ '--delay': `${index * 70}ms` }}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small><TrendIndicator value={metric.delta} suffix="" /></small>
              <div className="metric-line" />
            </article>
          ))}
        </div>
        <div className="dashboard-layout">
          <Panel className="span-2" title="Batch Processing Line" action="Live factory mesh">
            <div className="workflow">
              {['Raw Intake', 'Cleaning', 'Grinding', 'Quality Check', 'Packing'].map((step, index) => (
                <div className={`workflow-step ${index < 3 ? 'done' : index === 3 ? 'active' : ''}`} key={step}>
                  <CheckCircle2 size={18} />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Quality Intelligence" action="Lab sync">
            <SignalList items={['Aflatoxin screen clear', 'Moisture variance 0.4%', 'Metal detector pass', 'Retain samples indexed']} />
          </Panel>
          <Panel title="Warehouse Movement" action="Dispatch queue">
            <SignalList items={['Zone A: 52 cartons', 'Zone B: 38 cartons', 'Export dock: 31 cartons', 'Domestic dispatch: 21 cartons']} />
          </Panel>
          <Panel className="span-2" title="Plant Telemetry" action="Secure stream">
            <MiniBars values={[58, 71, 66, 83, 79, 88, 74, 92]} />
          </Panel>
        </div>
      </section>
    </div>
  );
}

function ActionRail({ activeCommand, setActiveCommand }) {
  const commands = [
    { id: 'repricing', label: 'Reprice Lane', icon: Gauge },
    { id: 'validate', label: 'Validate CO', icon: ScanLine },
    { id: 'transmit', label: 'Transmit Pack', icon: PackageCheck },
    { id: 'sync', label: 'Sync Nodes', icon: TimerReset }
  ];
  return (
    <aside className="action-rail" aria-label="Contextual actions">
      <div className="rail-head">
        <span>COMMAND RAIL</span>
        <SlidersHorizontal size={16} />
      </div>
      {commands.map((command) => {
        const Icon = command.icon;
        return (
          <button
            key={command.id}
            className={`rail-command ${activeCommand === command.id ? 'active' : ''}`}
            onClick={() => setActiveCommand(command.id)}
          >
            <Icon size={18} />
            <span>{command.label}</span>
            <ChevronRight size={14} />
          </button>
        );
      })}
      <div className="rail-footer">
        <Activity size={18} />
        <strong>AI Analysis</strong>
        <span>Processing secure recommendations</span>
      </div>
    </aside>
  );
}

const rootElement = document.getElementById('root');
const appRoot = window.__gopuRoot ?? createRoot(rootElement);
window.__gopuRoot = appRoot;
appRoot.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
