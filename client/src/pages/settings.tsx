import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Save,
  Loader2,
  Globe,
  KeyRound,
  CheckCircle2,
  Info,
  Server,
} from "lucide-react";

interface McpConfig {
  serverUrl: string;
  hasAuthToken: boolean;
  tallyUrl: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [serverUrl, setServerUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [tallyUrl, setTallyUrl] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const configQuery = useQuery<McpConfig>({
    queryKey: ["/api/mcp/config"],
  });

  useEffect(() => {
    if (configQuery.data) {
      setServerUrl(configQuery.data.serverUrl);
      setTallyUrl(configQuery.data.tallyUrl || "");
      setHasChanges(false);
    }
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: { serverUrl: string; authToken?: string; tallyUrl?: string }) => {
      const res = await apiRequest("POST", "/api/mcp/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/status"] });
      setHasChanges(false);
      setAuthToken("");
      toast({ title: "Settings saved", description: "Configuration updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const saveTallyUrlMutation = useMutation({
    mutationFn: async (data: { tallyUrl: string }) => {
      const res = await apiRequest("POST", "/api/mcp/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/config"] });
      toast({ title: "Tally URL saved", description: "TallyPrime Gateway URL updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!serverUrl.trim()) {
      toast({ title: "Validation error", description: "Server URL is required", variant: "destructive" });
      return;
    }
    try {
      new URL(serverUrl);
    } catch {
      toast({ title: "Validation error", description: "Please enter a valid URL", variant: "destructive" });
      return;
    }
    const data: { serverUrl: string; authToken?: string } = { serverUrl: serverUrl.trim() };
    if (authToken) {
      data.authToken = authToken;
    }
    saveMutation.mutate(data);
  };

  const handleSaveTallyUrl = () => {
    if (tallyUrl.trim()) {
      try {
        new URL(tallyUrl);
      } catch {
        toast({ title: "Validation error", description: "Please enter a valid URL (e.g., http://localhost:9000)", variant: "destructive" });
        return;
      }
    }
    saveTallyUrlMutation.mutate({ tallyUrl: tallyUrl.trim() });
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-settings-title">
            Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure the MCP server connection settings
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Server Configuration
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="server-url" className="flex items-center gap-1.5">
                Server URL
                <Badge variant="secondary" className="text-[10px]">Required</Badge>
              </Label>
              <p className="text-xs text-muted-foreground">
                The SSE endpoint URL of your Tally MCP server
              </p>
              <Input
                id="server-url"
                placeholder="https://your-server.run.app/sse"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setHasChanges(true);
                }}
                data-testid="input-server-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-token" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Authentication Token
                <Badge variant="secondary" className="text-[10px]">Optional</Badge>
              </Label>
              <p className="text-xs text-muted-foreground">
                Bearer token for authenticating with the MCP server (if required)
              </p>
              <Input
                id="auth-token"
                type="password"
                placeholder={configQuery.data?.hasAuthToken ? "Token is set (enter new to replace)" : "Enter auth token..."}
                value={authToken}
                onChange={(e) => {
                  setAuthToken(e.target.value);
                  setHasChanges(true);
                }}
                data-testid="input-auth-token"
              />
              {configQuery.data?.hasAuthToken && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Authentication token is configured
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-md p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                After saving settings, go to the Dashboard to connect to the server. If your server returns a 401 error, make sure to provide the correct authentication token here first.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasChanges}
                data-testid="button-save-settings"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              TallyPrime Gateway
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tally-url" className="flex items-center gap-1.5">
                TallyPrime URL
                <Badge variant="secondary" className="text-[10px]">Global Default</Badge>
              </Label>
              <p className="text-xs text-muted-foreground">
                The URL of your TallyPrime instance (e.g., http://localhost:9000 or https://xyz.trycloudflare.com). This will be automatically sent with every tool execution.
              </p>
              <Input
                id="tally-url"
                placeholder="http://localhost:9000"
                value={tallyUrl}
                onChange={(e) => setTallyUrl(e.target.value)}
                data-testid="input-tally-url"
              />
              {configQuery.data?.tallyUrl && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  TallyPrime URL is configured: {configQuery.data.tallyUrl}
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-md p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                This URL is automatically included as the <code className="bg-muted px-1 py-0.5 rounded text-[11px]">tally_url</code> parameter in every tool call, so you don't need to enter it each time.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveTallyUrl}
                disabled={saveTallyUrlMutation.isPending}
                data-testid="button-save-tally-url"
              >
                {saveTallyUrlMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Save Tally URL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
