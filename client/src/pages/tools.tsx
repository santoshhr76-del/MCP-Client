import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wrench,
  Search,
  Play,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  FileJson,
  ArrowRight,
  Braces,
  PlugZap,
  Building2,
  BookOpen,
  Receipt,
  BarChart3,
  Database,
} from "lucide-react";
import type { McpTool, McpConnectionStatus } from "@shared/schema";

function getPropertyFields(inputSchema: any): Array<{ name: string; type: string; description: string; required: boolean; defaultValue?: any; enumValues?: string[] }> {
  if (!inputSchema?.properties) return [];
  const required = inputSchema.required || [];
  return Object.entries(inputSchema.properties)
    .filter(([name]) => name !== "tally_url")
    .map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type || "string",
      description: prop.description || "",
      required: required.includes(name),
      defaultValue: prop.default,
      enumValues: prop.enum,
    }));
}

const CATEGORIES = [
  {
    key: "company",
    label: "Company",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    keywords: ["company", "companies"],
  },
  {
    key: "ledger",
    label: "Ledger",
    icon: BookOpen,
    color: "text-green-600",
    bg: "bg-green-500/10",
    keywords: ["ledger", "ledgers"],
  },
  {
    key: "voucher",
    label: "Voucher",
    icon: Receipt,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    keywords: ["voucher", "vouchers", "outstanding", "payment", "receipt", "sales", "purchase", "journal"],
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    keywords: ["trial_balance", "balance_sheet", "profit_loss", "report", "stock", "daybook"],
  },
  {
    key: "masters",
    label: "Masters",
    icon: Database,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    keywords: ["group", "unit", "godown", "cost_category", "cost_centre", "currency", "budget", "debug"],
  },
] as const;

function getToolCategory(toolName: string) {
  const lower = toolName.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return {
    key: "other",
    label: "Other",
    icon: Wrench,
    color: "text-muted-foreground",
    bg: "bg-muted",
  };
}

function groupTools(tools: McpTool[]) {
  const groups: Record<string, { category: ReturnType<typeof getToolCategory>; tools: McpTool[] }> = {};
  for (const tool of tools) {
    const cat = getToolCategory(tool.name);
    if (!groups[cat.key]) groups[cat.key] = { category: cat, tools: [] };
    groups[cat.key].tools.push(tool);
  }
  const order = [...CATEGORIES.map((c) => c.key), "other"];
  return order.filter((k) => groups[k]).map((k) => groups[k]);
}

export default function ToolsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const connectionQuery = useQuery<McpConnectionStatus>({
    queryKey: ["/api/mcp/status"],
  });

  const toolsQuery = useQuery<McpTool[]>({
    queryKey: ["/api/mcp/tools"],
    enabled: connectionQuery.data?.connected === true,
  });

  const executeMutation = useMutation({
    mutationFn: async ({ toolName, args }: { toolName: string; args: Record<string, any> }) => {
      const res = await apiRequest("POST", "/api/mcp/execute", { toolName, arguments: args });
      return res.json();
    },
    onSuccess: (data) => {
      setExecutionResult(data);
      setShowResult(true);
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/history"] });
      toast({ title: "Tool executed", description: "Check the result below" });
    },
    onError: (err: Error) => {
      setExecutionResult({ status: "error", error: err.message });
      setShowResult(true);
      toast({ title: "Execution failed", description: err.message, variant: "destructive" });
    },
  });

  const isConnected = connectionQuery.data?.connected === true;
  const tools = toolsQuery.data || [];
  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const groupedTools = groupTools(filteredTools);

  const handleExecute = () => {
    if (!selectedTool) return;
    const fields = getPropertyFields(selectedTool.inputSchema);
    const args: Record<string, any> = {};
    fields.forEach((field) => {
      const val = formValues[field.name];
      if (val !== undefined && val !== "") {
        if (field.type === "number" || field.type === "integer") {
          args[field.name] = Number(val);
        } else if (field.type === "boolean") {
          args[field.name] = val === "true";
        } else if (field.type === "array" || field.type === "object") {
          try {
            args[field.name] = JSON.parse(val);
          } catch {
            args[field.name] = val;
          }
        } else {
          args[field.name] = val;
        }
      }
    });
    executeMutation.mutate({ toolName: selectedTool.name, args });
  };

  const openToolDialog = (tool: McpTool) => {
    setSelectedTool(tool);
    setFormValues({});
    setExecutionResult(null);
    setShowResult(false);
  };

  const copyResult = () => {
    if (executionResult) {
      navigator.clipboard.writeText(JSON.stringify(executionResult, null, 2));
      toast({ title: "Copied", description: "Result copied to clipboard" });
    }
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="p-3 rounded-md bg-muted mb-4">
              <PlugZap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-1">Not Connected</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Connect to the Tally MCP server from the Dashboard to browse and execute tools.
            </p>
            <Button asChild>
              <a href="/" data-testid="link-go-to-dashboard">Go to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-tools-title">
              Tools
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse and execute tools exposed by the Tally MCP server
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-tools"
            />
          </div>
        </div>

        {toolsQuery.isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((g) => (
              <div key={g} className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-5 pb-4 space-y-3">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-8 w-20 mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredTools.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
              <Wrench className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No tools match your search" : "No tools available from the server"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedTools.map(({ category, tools: catTools }) => {
              const CatIcon = category.icon;
              return (
                <div key={category.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${category.bg}`}>
                      <CatIcon className={`h-4 w-4 ${category.color}`} />
                    </div>
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                      {category.label}
                    </h2>
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {catTools.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catTools.map((tool) => {
                      const fields = getPropertyFields(tool.inputSchema);
                      return (
                        <Card key={tool.name} className="hover-elevate cursor-pointer" onClick={() => openToolDialog(tool)}>
                          <CardContent className="pt-5 pb-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`p-1.5 rounded-md ${category.bg} shrink-0`}>
                                  <CatIcon className={`h-4 w-4 ${category.color}`} />
                                </div>
                                <h3 className="font-medium text-sm truncate" data-testid={`text-tool-name-${tool.name}`}>
                                  {tool.name}
                                </h3>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">
                              {tool.description || "No description available"}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {fields.length > 0 ? (
                                <Badge variant="secondary">
                                  <Braces className="h-3 w-3 mr-1" />
                                  {fields.length} param{fields.length !== 1 ? "s" : ""}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No params</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedTool} onOpenChange={(open) => !open && setSelectedTool(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {selectedTool?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTool?.description || "Execute this tool with the parameters below"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
            <div className="space-y-4 pb-4">
              {selectedTool && getPropertyFields(selectedTool.inputSchema).length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Parameters</span>
                  </div>
                  {getPropertyFields(selectedTool.inputSchema).map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        {field.name}
                        {field.required && <span className="text-destructive text-xs">*</span>}
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {field.type}
                        </Badge>
                      </Label>
                      {field.description && (
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      )}
                      {field.type === "object" || field.type === "array" ? (
                        <Textarea
                          placeholder={`Enter ${field.type} as JSON...`}
                          value={formValues[field.name] || ""}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                          }
                          className="font-mono text-sm"
                          data-testid={`input-param-${field.name}`}
                        />
                      ) : (
                        <Input
                          type={field.type === "number" || field.type === "integer" ? "number" : "text"}
                          placeholder={`Enter ${field.name}...`}
                          value={formValues[field.name] || ""}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                          }
                          data-testid={`input-param-${field.name}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/50 rounded-md p-4 text-sm text-muted-foreground text-center">
                  This tool requires no parameters
                </div>
              )}

              {showResult && executionResult && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {executionResult.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm font-medium">Result</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={copyResult} data-testid="button-copy-result">
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(executionResult.result ?? executionResult.error, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="secondary" onClick={() => setSelectedTool(null)} data-testid="button-cancel-tool">
              Close
            </Button>
            <Button
              onClick={handleExecute}
              disabled={executeMutation.isPending}
              data-testid="button-execute-tool"
            >
              {executeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Play className="h-4 w-4 mr-1.5" />
              )}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
