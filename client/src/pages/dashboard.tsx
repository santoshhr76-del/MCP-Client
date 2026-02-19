import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Plug,
  PlugZap,
  Wrench,
  History,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Zap,
  Server,
  Activity,
} from "lucide-react";
import type { McpConnectionStatus, McpTool, ToolExecution } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();

  const connectionQuery = useQuery<McpConnectionStatus>({
    queryKey: ["/api/mcp/status"],
    refetchInterval: 10000,
  });

  const toolsQuery = useQuery<McpTool[]>({
    queryKey: ["/api/mcp/tools"],
    enabled: connectionQuery.data?.connected === true,
  });

  const historyQuery = useQuery<ToolExecution[]>({
    queryKey: ["/api/mcp/history"],
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mcp/connect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/tools"] });
      toast({ title: "Connected", description: "Successfully connected to MCP server" });
    },
    onError: (err: Error) => {
      toast({ title: "Connection Failed", description: err.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mcp/disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/tools"] });
      toast({ title: "Disconnected", description: "Disconnected from MCP server" });
    },
  });

  const isConnected = connectionQuery.data?.connected === true;
  const recentHistory = (historyQuery.data || []).slice(0, 5);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your Tally MCP server connection and monitor tool activity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${isConnected ? "bg-green-500/10 dark:bg-green-500/20" : "bg-muted"}`}>
                    {isConnected ? (
                      <PlugZap className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Plug className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium" data-testid="text-connection-status">
                      {connectionQuery.isLoading ? "Checking..." : isConnected ? "Connected" : "Disconnected"}
                    </p>
                  </div>
                </div>
                <Badge variant={isConnected ? "default" : "secondary"} data-testid="badge-connection">
                  {isConnected ? "Live" : "Offline"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Tools</p>
                  <p className="font-medium" data-testid="text-tool-count">
                    {toolsQuery.isLoading ? (
                      <Skeleton className="h-5 w-8 inline-block" />
                    ) : (
                      toolsQuery.data?.length ?? 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-accent">
                  <History className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Executions</p>
                  <p className="font-medium" data-testid="text-execution-count">
                    {historyQuery.isLoading ? (
                      <Skeleton className="h-5 w-8 inline-block" />
                    ) : (
                      historyQuery.data?.length ?? 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                Server Connection
              </CardTitle>
              <Button
                size="sm"
                variant={isConnected ? "secondary" : "default"}
                onClick={() => (isConnected ? disconnectMutation.mutate() : connectMutation.mutate())}
                disabled={connectMutation.isPending || disconnectMutation.isPending}
                data-testid="button-connect-toggle"
              >
                {connectMutation.isPending || disconnectMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                ) : isConnected ? (
                  <XCircle className="h-4 w-4 mr-1.5" />
                ) : (
                  <Zap className="h-4 w-4 mr-1.5" />
                )}
                {isConnected ? "Disconnect" : "Connect"}
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Server URL</span>
                  <span className="font-mono text-xs truncate max-w-[220px]" data-testid="text-server-url">
                    {connectionQuery.data?.serverUrl || "Not configured"}
                  </span>
                </div>
                {isConnected && connectionQuery.data?.serverName && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Server Name</span>
                    <span data-testid="text-server-name">{connectionQuery.data.serverName}</span>
                  </div>
                )}
                {isConnected && connectionQuery.data?.serverVersion && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Version</span>
                    <span data-testid="text-server-version">{connectionQuery.data.serverVersion}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Transport</span>
                  <Badge variant="secondary">SSE</Badge>
                </div>
              </div>
              {!isConnected && (
                <div className="bg-muted/50 rounded-md p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Click Connect to establish an SSE connection with the Tally MCP server and discover available tools.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
              {recentHistory.length > 0 && (
                <Button size="sm" variant="ghost" asChild>
                  <a href="/history" data-testid="link-view-all-history">
                    View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </a>
                </Button>
              )}
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {historyQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    Tool executions will appear here
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[240px]">
                  <div className="space-y-2">
                    {recentHistory.map((execution) => (
                      <div
                        key={execution.id}
                        className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                        data-testid={`history-item-${execution.id}`}
                      >
                        {execution.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                        ) : execution.status === "error" ? (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{execution.toolName}</p>
                          <p className="text-xs text-muted-foreground">
                            {execution.executedAt
                              ? new Date(execution.executedAt).toLocaleString()
                              : "Just now"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            execution.status === "success"
                              ? "default"
                              : execution.status === "error"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {execution.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
