import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { loadSettings } from "@/lib/settingsStorage";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ToolsPage from "@/pages/tools";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tools" component={ToolsPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SettingsRestorer() {
  useEffect(() => {
    const saved = loadSettings();
    if (!saved.serverUrl && !saved.tallyUrl) return;
    const payload: Record<string, string> = {};
    if (saved.serverUrl) payload.serverUrl = saved.serverUrl;
    if (saved.tallyUrl) payload.tallyUrl = saved.tallyUrl;
    apiRequest("POST", "/api/mcp/config", payload).catch(() => {});
  }, []);
  return null;
}

export default function App() {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsRestorer />
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-2 p-2 border-b">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-hidden flex flex-col">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
