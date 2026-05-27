import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetPrinterStatus, 
  useGetLogStats, 
  useGetLogs, 
  useTestPrint,
  getGetLogsQueryKey,
  getGetPrinterStatusQueryKey,
  getGetLogStatsQueryKey
} from "@workspace/api-client-react";
import { 
  Printer, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff,
  Send,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
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

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: printerStatus, isLoading: statusLoading } = useGetPrinterStatus({
    query: { queryKey: getGetPrinterStatusQueryKey(), refetchInterval: 10000 }
  });
  
  const { data: stats, isLoading: statsLoading } = useGetLogStats({
    query: { queryKey: getGetLogStatsQueryKey() }
  });
  
  const { data: logs, isLoading: logsLoading } = useGetLogs(
    { limit: 10 },
    { query: { queryKey: getGetLogsQueryKey({ limit: 10 }) } }
  );

  const testPrint = useTestPrint({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: data.success ? "Test print sent" : "Test print failed",
          description: data.message || "The test label was sent to the printer.",
          variant: data.success ? "default" : "destructive",
        });
        queryClient.invalidateQueries({ queryKey: getGetLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/logs/stats"] });
      },
      onError: (err: any) => {
        toast({
          title: "Test print failed",
          description: err?.error || "Could not connect to the bridge.",
          variant: "destructive",
        });
      }
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your print bridge and hardware status.</p>
        </div>
        <Button 
          onClick={() => testPrint.mutate()} 
          disabled={testPrint.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          {testPrint.isPending ? (
            <Activity className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Send test print
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-4 bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-full">
                <Printer className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">Zebra Printer Status</h3>
                <div className="flex items-center gap-2 mt-1">
                  {statusLoading ? (
                    <Skeleton className="h-5 w-24" />
                  ) : printerStatus?.online ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium px-2 py-0.5">
                      <Wifi className="w-3 h-3 mr-1" />
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-medium px-2 py-0.5">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                  {printerStatus && (
                    <span className="text-sm text-muted-foreground">
                      {printerStatus.printerIp}:{printerStatus.printerPort}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {printerStatus?.message && !printerStatus.online && (
              <div className="flex items-center text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-md">
                <AlertCircle className="w-4 h-4 mr-2" />
                {printerStatus.message}
              </div>
            )}
          </CardContent>
        </Card>

        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalJobs ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Last 24 Hours</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.last24hCount ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  {stats?.totalJobs ? Math.round((stats.successCount / stats.totalJobs) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Failed Jobs</p>
                <p className="text-3xl font-bold text-rose-600 mt-2">{stats?.failedCount ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Print Jobs</CardTitle>
          <CardDescription>The 10 most recent print requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Target IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No print jobs recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(job.createdAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
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
                    <TableCell>{job.source || "Unknown"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.bytesSent} B
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {job.printerIp || "-"}
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
