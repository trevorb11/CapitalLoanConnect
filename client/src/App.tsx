import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import IntakeForm from "@/pages/IntakeForm";
import FullApplication from "@/pages/FullApplication";
import AgentApplication from "@/pages/AgentApplication";
import Success from "@/pages/Success";
import Dashboard from "@/pages/Dashboard";
import AgentSelector from "@/pages/AgentSelector";
import FundingAnalysis from "@/pages/FundingAnalysis";
import ConnectBank from "@/pages/ConnectBank";
import NotFound from "@/pages/not-found";
import { AGENTS, getAgentByInitials } from "@shared/agents";

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <FullApplication />}
      </Route>
      <Route path="/intake" component={IntakeForm} />
      <Route path="/funding-analysis" component={FundingAnalysis} />
      <Route path="/connect-bank" component={ConnectBank} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
