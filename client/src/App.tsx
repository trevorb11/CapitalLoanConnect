import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import QuizIntake from "@/pages/QuizIntake";
import IntakeLanding from "@/pages/IntakeLanding";
import IntakeGoogleAds from "@/pages/IntakeGoogleAds";
import IntakeEmail from "@/pages/IntakeEmail";
import IntakeSocialMedia from "@/pages/IntakeSocialMedia";
import IntakeWebsite from "@/pages/IntakeWebsite";
import IntakeBlog from "@/pages/IntakeBlog";
import IntakeReferral from "@/pages/IntakeReferral";
import IntakeDirect from "@/pages/IntakeDirect";
import IntakeReddit from "@/pages/IntakeReddit";
import FullApplication from "@/pages/FullApplication";
import AgentApplication from "@/pages/AgentApplication";
import Success from "@/pages/Success";
import Dashboard from "@/pages/Dashboard";
import AgentSelector from "@/pages/AgentSelector";
import FundingAnalysis from "@/pages/FundingAnalysis";
import FundingReport from "@/pages/FundingReport";
import UpdateInfo from "@/pages/UpdateInfo";
import SeeReport from "@/pages/SeeReport";
import ConnectBank from "@/pages/ConnectBank";
import BankStatementsUpload from "@/pages/BankStatementsUpload";
import RetargetingLanding from "@/pages/RetargetingLanding";
import ProgressTracker from "@/pages/ProgressTracker";
import PartnerDashboard from "@/pages/PartnerDashboard";
import ReferralLanding from "@/pages/ReferralLanding";
import NotFound from "@/pages/not-found";
import { AGENTS, getAgentByInitials } from "@shared/agents";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <FullApplication />}
      </Route>
      <Route path="/intake" component={IntakeLanding} />
      <Route path="/intake/quiz" component={QuizIntake} />

      {/* Source-specific intake forms for tracking */}
      <Route path="/intake/google-ads" component={IntakeGoogleAds} />
      <Route path="/intake/email" component={IntakeEmail} />
      <Route path="/intake/social-media" component={IntakeSocialMedia} />
      <Route path="/intake/website" component={IntakeWebsite} />
      <Route path="/intake/blog" component={IntakeBlog} />
      <Route path="/intake/referral" component={IntakeReferral} />
      <Route path="/intake/direct" component={IntakeDirect} />
      <Route path="/intake/reddit" component={IntakeReddit} />
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
      <Route path="/success" component={Success} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/agents" component={AgentSelector} />

      {/* Partner Portal Routes */}
      <Route path="/partner" component={PartnerDashboard} />
      <Route path="/partner/dashboard" component={PartnerDashboard} />
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
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const appContent = (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
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
