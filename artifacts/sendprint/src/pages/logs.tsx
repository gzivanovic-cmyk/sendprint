import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetLogs, 
  useClearLogs,
  getGetLogsQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Trash2, CheckCircle2, XCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function LogsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useGetLogs(
    { limit: 200 },
    { query: { queryKey: getGetLogsQueryKey({ limit: 200 }) } }
  );

  const clearLogs = useClearLogs({
    mutation: {
      onSuccess: () => {
        toast({ title: "History cleared", description: "All print jobs have been deleted." });
        queryClient.invalidateQueries({ queryKey: getGetLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/logs/stats"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to clear logs", description: err?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Print History</h1>
          <p className="text-muted-foreground mt-1">Detailed log of the last 200 print jobs.</p>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={clearLogs.isPending || !logs?.length}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear history
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your entire print job history from the bridge database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => clearLogs.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear all logs
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-48">Timestamp</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Source</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead>Details / Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No print jobs found in history.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((job) => (
                  <TableRow key={job.id} className="group">
                    <TableCell className="font-mono text-xs text-slate-600 align-top pt-4">
                      {format(new Date(job.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="align-top pt-3">
                      {job.status === "success" ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="align-top pt-4 text-sm">
                      {job.source || "-"}
                    </TableCell>
                    <TableCell className="align-top pt-4 text-sm text-muted-foreground">
                      {job.bytesSent} B
                    </TableCell>
                    <TableCell className="align-top pt-3 pb-3">
                      {job.errorMessage && (
                        <div className="mb-2 text-sm text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                          <strong>Error:</strong> {job.errorMessage}
                        </div>
                      )}
                      
                      {job.zplPreview && (
                        <Collapsible className="w-full">
                          <CollapsibleTrigger className="flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
                            <ChevronDown className="w-3 h-3 mr-1" />
                            View ZPL Payload
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="bg-slate-900 text-slate-300 p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {job.zplPreview}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
