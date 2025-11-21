import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import IntakeForm from "@/pages/IntakeForm";
import FullApplication from "@/pages/FullApplication";
import Success from "@/pages/Success";
import Dashboard from "@/pages/Dashboard";
import AgentSelector from "@/pages/AgentSelector";
import NotFound from "@/pages/not-found";
import { AGENTS, getAgentByInitials } from "@shared/agents";

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <FullApplication />}
      </Route>
      <Route path="/intake" component={IntakeForm} />
      <Route path="/success" component={Success} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/agents" component={AgentSelector} />
      
      {/* Agent-specific application pages */}
      {AGENTS.map((agent) => (
        <Route 
          key={agent.initials} 
          path={`/${agent.initials}`}
        >
          {() => <FullApplication agent={agent} />}
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
