import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { initUTMTracking } from "@/lib/utm";
// Eager: root route (lead conversion) + 404
import FullApplication from "@/pages/FullApplication";
import NotFound from "@/pages/not-found";
// Lazy: everything else is code-split so visitors only download the page they hit
const QuizIntake = lazy(() => import("@/pages/QuizIntake"));
const IntakeLanding = lazy(() => import("@/pages/IntakeLanding"));
const IntakeGoogleAds = lazy(() => import("@/pages/IntakeGoogleAds"));
const IntakeEmail = lazy(() => import("@/pages/IntakeEmail"));
const IntakeSocialMedia = lazy(() => import("@/pages/IntakeSocialMedia"));
const IntakeWebsite = lazy(() => import("@/pages/IntakeWebsite"));
const IntakeBlog = lazy(() => import("@/pages/IntakeBlog"));
const IntakeReferral = lazy(() => import("@/pages/IntakeReferral"));
const IntakeDirect = lazy(() => import("@/pages/IntakeDirect"));
const IntakeReddit = lazy(() => import("@/pages/IntakeReddit"));
const FundingQuiz = lazy(() => import("@/pages/FundingQuiz"));
const AgentApplication = lazy(() => import("@/pages/AgentApplication"));
const Success = lazy(() => import("@/pages/Success"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AgentSelector = lazy(() => import("@/pages/AgentSelector"));
const FundingAnalysis = lazy(() => import("@/pages/FundingAnalysis"));
const FundingReport = lazy(() => import("@/pages/FundingReport"));
const UpdateInfo = lazy(() => import("@/pages/UpdateInfo"));
const SeeReport = lazy(() => import("@/pages/SeeReport"));
const ConnectBank = lazy(() => import("@/pages/ConnectBank"));
const BankStatementsUpload = lazy(() => import("@/pages/BankStatementsUpload"));
const Statements = lazy(() => import("@/pages/Statements"));
const FundingCheck = lazy(() => import("@/pages/FundingCheck"));
const RetargetingLanding = lazy(() => import("@/pages/RetargetingLanding"));
const ProgressTracker = lazy(() => import("@/pages/ProgressTracker"));
const PartnerDashboard = lazy(() => import("@/pages/PartnerDashboard"));
const PartnerApplication = lazy(() => import("@/pages/PartnerApplication"));
const PartnerLanding = lazy(() => import("@/pages/PartnerLanding"));
const ReferralLanding = lazy(() => import("@/pages/ReferralLanding"));
const Approvals = lazy(() => import("@/pages/Approvals"));
const Declines = lazy(() => import("@/pages/Declines"));
const Unqualified = lazy(() => import("@/pages/Unqualified"));
const Funded = lazy(() => import("@/pages/Funded"));
const RepConsole = lazy(() => import("@/pages/RepConsole"));
const LeadSourceAnalytics = lazy(() => import("@/pages/LeadSourceAnalytics"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Services = lazy(() => import("@/pages/Services"));
const AchForm = lazy(() => import("@/pages/AchForm"));
const ApprovalLetter = lazy(() => import("@/pages/ApprovalLetter"));
const InternalStatementsUpload = lazy(() => import("@/pages/InternalStatementsUpload"));
const SBALanding = lazy(() => import("@/pages/SBALanding"));
const SignatureApplication = lazy(() => import("@/pages/SignatureApplication"));
const Congratulations = lazy(() => import("@/pages/Congratulations"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Messaging = lazy(() => import("@/pages/Messaging"));
const AutomatedTriggers = lazy(() => import("@/pages/AutomatedTriggers"));
const SmsInbox = lazy(() => import("@/pages/SmsInbox"));
const SmsAnalytics = lazy(() => import("@/pages/SmsAnalytics"));
const FundingCalculator = lazy(() => import("@/pages/FundingCalculator"));
const ApprovalFollowUp = lazy(() => import("@/pages/ApprovalFollowUp"));
const FundedDealsAudit = lazy(() => import("@/pages/FundedDealsAudit"));
const GigFiStandalone = lazy(() => import("@/pages/GigFiStandalone"));
const GigFiInternal = lazy(() => import("@/pages/GigFiInternal"));
const GigFiSubmissions = lazy(() => import("@/pages/GigFiSubmissions"));
const MerchantPortal = lazy(() => import("@/pages/MerchantPortal"));
const MerchantActivate = lazy(() => import("@/pages/MerchantActivate"));
const MerchantResetPassword = lazy(() => import("@/pages/MerchantResetPassword"));
const MerchantProfile = lazy(() => import("@/pages/MerchantProfile"));
const LeadPortal = lazy(() => import("@/pages/LeadPortal"));
const TrackAdmin = lazy(() => import("@/pages/TrackAdmin"));
const AdsConsultation = lazy(() => import("@/pages/AdsConsultation"));
const AdsLeads = lazy(() => import("@/pages/AdsLeads"));
const ServiceLeads = lazy(() => import("@/pages/ServiceLeads"));
const ConsolSBA = lazy(() => import("@/pages/ConsolSBA"));
const LeadsDashboard = lazy(() => import("@/pages/LeadsDashboard"));
const ServicePayments = lazy(() => import("@/pages/ServicePayments"));
const ServiceWebsite = lazy(() => import("@/pages/ServiceWebsite"));
const ServiceCRM = lazy(() => import("@/pages/ServiceCRM"));
const MemorialDayWebsite = lazy(() => import("@/pages/MemorialDayWebsite"));
const RepWebsiteReferral = lazy(() => import("@/pages/RepWebsiteReferral"));
const RepWebsiteReferralDashboard = lazy(() => import("@/pages/RepWebsiteReferralDashboard"));
const WebsiteContract = lazy(() => import("@/pages/WebsiteContract"));
const Agreements = lazy(() => import("@/pages/Agreements"));
const WhatWeNeed = lazy(() => import("@/pages/WhatWeNeed"));
const UnderwritingPortal = lazy(() => import("@/pages/UnderwritingPortal"));
const PipelineReports = lazy(() => import("@/pages/PipelineReports"));
const RepStats = lazy(() => import("@/pages/RepStats"));
const RepScorecard = lazy(() => import("@/pages/RepScorecard"));
const ProcessingReview = lazy(() => import("@/pages/ProcessingReview"));
import { AGENTS, getAgentByInitials } from "@shared/agents";

// Shown briefly while a lazy-loaded page chunk downloads
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <FullApplication />}
      </Route>
      <Route path="/intake" component={IntakeLanding} />
      <Route path="/intake/quiz">{() => <QuizIntake />}</Route>
      <Route path="/funding-quiz" component={FundingQuiz} />

      {/* Source-specific intake forms for tracking */}
      <Route path="/intake/google-ads" component={IntakeGoogleAds} />
      <Route path="/intake/email" component={IntakeEmail} />
      <Route path="/intake/social-media" component={IntakeSocialMedia} />
      <Route path="/intake/website" component={IntakeWebsite} />
      <Route path="/intake/blog" component={IntakeBlog} />
      <Route path="/intake/referral" component={IntakeReferral} />
      <Route path="/intake/direct" component={IntakeDirect} />
      <Route path="/intake/reddit" component={IntakeReddit} />

      {/* Short URL redirects to source-tracked intake forms */}
      <Route path="/gga" component={IntakeGoogleAds} />
      <Route path="/email" component={IntakeEmail} />
      <Route path="/social" component={IntakeSocialMedia} />
      <Route path="/site" component={IntakeWebsite} />
      <Route path="/blog" component={IntakeBlog} />
      <Route path="/ref" component={IntakeReferral} />
      <Route path="/direct" component={IntakeDirect} />
      <Route path="/rddt" component={IntakeReddit} />
      <Route path="/complete-application/:initials?">
        {(params) => {
          const agent = params.initials ? getAgentByInitials(params.initials.toLowerCase()) : undefined;
          return <RetargetingLanding agent={agent} />;
        }}
      </Route>
      <Route path="/check-status" component={ProgressTracker} />
      <Route path="/funding-analysis" component={FundingAnalysis} />
      <Route path="/report" component={FundingReport} />
      <Route path="/update" component={UpdateInfo} />
      <Route path="/see-report" component={SeeReport} />
      <Route path="/connect-bank" component={ConnectBank} />
      <Route path="/upload-statements" component={BankStatementsUpload} />
      <Route path="/statements" component={Statements} />
      <Route path="/internal-upload" component={InternalStatementsUpload} />
      <Route path="/funding-check" component={FundingCheck} />
      <Route path="/calculator" component={FundingCalculator} />
      <Route path="/approval-followup" component={ApprovalFollowUp} />
      <Route path="/funded-audit" component={FundedDealsAudit} />
      <Route path="/sba" component={SBALanding} />
      <Route path="/consol-sba" component={ConsolSBA} />
      <Route path="/sig">{() => <SignatureApplication />}</Route>
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/congratulations" component={Congratulations} />
      <Route path="/success" component={Success} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/declines" component={Declines} />
      <Route path="/unqualified" component={Unqualified} />
      <Route path="/funded" component={Funded} />
      <Route path="/messaging" component={Messaging} />
      <Route path="/triggers" component={AutomatedTriggers} />
      <Route path="/sms-inbox" component={SmsInbox} />
      <Route path="/sms-analytics" component={SmsAnalytics} />
      <Route path="/gig" component={GigFiStandalone} />
      <Route path="/gigfi-internal" component={GigFiInternal} />
      <Route path="/gigfi-submissions" component={GigFiSubmissions} />
      <Route path="/agents" component={AgentSelector} />

      {/* Rep Console - Contact 360 View */}
      <Route path="/rep-console" component={RepConsole} />
      <Route path="/rep-console/:contactId" component={RepConsole} />
      
      {/* Analytics Dashboards - Admin Only */}
      <Route path="/lead-sources" component={LeadSourceAnalytics} />
      <Route path="/analytics" component={Analytics} />

      {/* Services Interest Page - Public */}
      <Route path="/services" component={Services} />

      {/* ACH Authorization Form - Public */}
      <Route path="/ach" component={AchForm} />

      {/* Approval Letter - Public page for approved businesses */}
      <Route path="/approved/:slug" component={ApprovalLetter} />

      {/* Merchant Portal Routes */}
      <Route path="/merchant" component={MerchantPortal} />
      <Route path="/merchant/activate" component={MerchantActivate} />
      <Route path="/merchant/reset-password" component={MerchantResetPassword} />

      {/* Admin/Rep Merchant Profile (360° view) */}
      <Route path="/merchant-profile" component={MerchantProfile} />
      <Route path="/merchant-profile/:email" component={MerchantProfile} />

      {/* Ads Consultation — AdBlend Partnership */}
      <Route path="/services/payments" component={ServicePayments} />
      <Route path="/services/website/memorial-day" component={MemorialDayWebsite} />
      <Route path="/services/website/contract" component={WebsiteContract} />
      <Route path="/rep/website-referral" component={RepWebsiteReferral} />
      <Route path="/rep/website-referral-dashboard" component={RepWebsiteReferralDashboard} />
      <Route path="/agreements" component={Agreements} />
      <Route path="/services/website" component={ServiceWebsite} />
      <Route path="/services/crm" component={ServiceCRM} />
      <Route path="/ads" component={AdsConsultation} />
      <Route path="/ads-leads" component={AdsLeads} />
      <Route path="/service-leads" component={ServiceLeads} />
      <Route path="/leads" component={LeadsDashboard} />

      {/* Underwriting Portal */}
      <Route path="/underwriting" component={UnderwritingPortal} />

      {/* Pipeline Reports */}
      <Route path="/pipeline-reports" component={PipelineReports} />

      {/* Rep Stats & Scorecards */}
      <Route path="/admin/rep-stats" component={RepStats} />
      <Route path="/admin/rep-stats/:repName" component={RepScorecard} />

      {/* Credit Card Processing Review — public landing page */}
      <Route path="/processing-review" component={ProcessingReview} />

      {/* Lead Portal Routes */}
      <Route path="/what-we-need" component={WhatWeNeed} />
      <Route path="/track" component={LeadPortal} />
      <Route path="/track/signup" component={LeadPortal} />
      <Route path="/track/login" component={LeadPortal} />
      <Route path="/track-admin" component={TrackAdmin} />

      {/* Partner Portal Routes */}
      <Route path="/partners" component={PartnerLanding} />
      <Route path="/partner" component={PartnerDashboard} />
      <Route path="/partner/dashboard" component={PartnerDashboard} />
      <Route path="/apply/:slug" component={PartnerApplication} />
      <Route path="/r/:code" component={ReferralLanding} />

      {/* Agent-specific application pages - use two-page format */}
      {AGENTS.map((agent) => (
        <Route 
          key={agent.initials} 
          path={`/${agent.initials}`}
        >
          {() => <AgentApplication agent={agent} />}
        </Route>
      ))}

      {/* Agent-specific quiz links — /{initials}/quiz */}
      {AGENTS.map((agent) => (
        <Route
          key={`${agent.initials}-quiz`}
          path={`/${agent.initials}/quiz`}
        >
          {() => <QuizIntake agent={agent} />}
        </Route>
      ))}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize UTM tracking immediately on app load to capture referrer and URL params
  useEffect(() => {
    initUTMTracking();
    
    // Track visits from URL parameters (email, phone, interest)
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const phone = params.get('phone');
    const interest = params.get('interest');
    
    if (email || phone) {
      fetch('/api/analytics/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phone,
          interest,
          pagePath: window.location.pathname,
          fullUrl: window.location.href,
          referrer: document.referrer,
          utmSource: params.get('utm_source'),
          utmCampaign: params.get('utm_campaign'),
          utmMedium: params.get('utm_medium'),
        })
      }).catch(err => console.error('Failed to track visit:', err));
    }
  }, []);

  const appContent = (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <Router />
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );

  if (RECAPTCHA_SITE_KEY) {
    return (
      <GoogleReCaptchaProvider
        reCaptchaKey={RECAPTCHA_SITE_KEY}
        scriptProps={{
          async: true,
          defer: true,
          appendTo: "head",
        }}
      >
        {appContent}
      </GoogleReCaptchaProvider>
    );
  }

  return appContent;
}

export default App;
