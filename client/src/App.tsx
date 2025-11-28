import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import QuizIntake from "@/pages/QuizIntake";
import IntakeLanding from "@/pages/IntakeLanding";
import FullApplication from "@/pages/FullApplication";
import AgentApplication from "@/pages/AgentApplication";
import Success from "@/pages/Success";
import Dashboard from "@/pages/Dashboard";
import AgentSelector from "@/pages/AgentSelector";
import FundingAnalysis from "@/pages/FundingAnalysis";
import ConnectBank from "@/pages/ConnectBank";
import BankStatementsUpload from "@/pages/BankStatementsUpload";
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
      <Route path="/funding-analysis" component={FundingAnalysis} />
      <Route path="/connect-bank" component={ConnectBank} />
      <Route path="/upload-statements" component={BankStatementsUpload} />
      <Route path="/success" component={Success} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/agents" component={AgentSelector} />
      
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
