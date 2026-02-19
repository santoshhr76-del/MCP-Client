import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ChevronRight,
  Braces,
  ArrowUpRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ToolExecution } from "@shared/schema";

export default function HistoryPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExecution, setSelectedExecution] = useState<ToolExecution | null>(null);

  const historyQuery = useQuery<ToolExecution[]>({
    queryKey: ["/api/mcp/history"],
  });

  const executions = historyQuery.data || [];
  const filtered = executions.filter(
    (e) =>
      e.toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast({ title: "Copied", description: "Data copied to clipboard" });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-history-title">
              Execution History
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View past tool executions and their results
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-history"
            />
          </div>
        </div>

        {historyQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
              <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No executions match your search" : "No tool executions yet"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Execute a tool from the Tools page to see results here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((execution) => (
              <Card
                key={execution.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedExecution(execution)}
                data-testid={`history-card-${execution.id}`}
              >
                <CardContent className="py-3.5">
                  <div className="flex items-center gap-3">
                    {statusIcon(execution.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{execution.toolName}</p>
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {execution.executedAt
                          ? new Date(execution.executedAt).toLocaleString()
                          : "Unknown time"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedExecution} onOpenChange={(open) => !open && setSelectedExecution(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedExecution && statusIcon(selectedExecution.status)}
              {selectedExecution?.toolName}
            </DialogTitle>
            <DialogDescription>
              Executed{" "}
              {selectedExecution?.executedAt
                ? new Date(selectedExecution.executedAt).toLocaleString()
                : "recently"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {selectedExecution?.arguments && Object.keys(selectedExecution.arguments as any).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Arguments</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedExecution.arguments)}
                      data-testid="button-copy-args"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedExecution.arguments, null, 2)}
                  </pre>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Braces className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {selectedExecution?.status === "error" ? "Error" : "Result"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(selectedExecution?.result ?? selectedExecution?.error)
                    }
                    data-testid="button-copy-detail-result"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words">
                  {selectedExecution?.status === "error"
                    ? selectedExecution.error
                    : JSON.stringify(selectedExecution?.result, null, 2)}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
