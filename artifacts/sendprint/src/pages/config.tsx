import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetConfig, 
  useUpdateConfig, 
  useRotateApiKey,
  getGetConfigQueryKey
} from "@workspace/api-client-react";
import { Copy, RefreshCw, Save, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";

const configSchema = z.object({
  printerIp: z.string().min(1, "Printer IP is required"),
  printerPort: z.coerce.number().min(1, "Port must be at least 1").max(65535, "Port must be at most 65535"),
  serverPort: z.coerce.number().min(1, "Port must be at least 1").max(65535, "Port must be at most 65535"),
  apiKey: z.string().min(8, "API key must be at least 8 characters"),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function ConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: config, isLoading } = useGetConfig();

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      printerIp: "",
      printerPort: 9100,
      serverPort: 8080,
      apiKey: "",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        printerIp: config.printerIp,
        printerPort: config.printerPort,
        serverPort: config.serverPort,
        apiKey: config.apiKey,
      });
    }
  }, [config, form]);

  const updateConfig = useUpdateConfig({
    mutation: {
      onSuccess: () => {
        toast({ title: "Configuration saved", description: "Printer settings have been updated." });
        queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to save", description: err?.error || "Unknown error occurred", variant: "destructive" });
      }
    }
  });

  const rotateKey = useRotateApiKey({
    mutation: {
      onSuccess: (newConfig) => {
        form.setValue("apiKey", newConfig.apiKey, { shouldDirty: true });
        toast({ title: "API Key rotated", description: "New API key generated successfully." });
        queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to rotate key", description: err?.error || "Unknown error occurred", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: ConfigFormValues) => {
    updateConfig.mutate({ data });
  };

  const copyToClipboard = () => {
    const key = form.getValues("apiKey");
    if (key) {
      navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    }
  };

  const integrationUrl = `${window.location.origin}/api/print`;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage bridge settings and integration keys.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Printer Settings</CardTitle>
            <CardDescription>Target network destination for incoming print jobs.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="printerIp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Printer IP Address</FormLabel>
                        <FormControl>
                          <Input placeholder="192.168.1.100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="printerPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Printer Port</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serverPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server Port</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          HTTP port the bridge listens on. Takes effect after restart.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 border-t border-border">
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key (Auth Secret)</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input readOnly type="text" className="font-mono text-sm bg-muted/50" {...field} />
                            </FormControl>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              onClick={copyToClipboard}
                              title="Copy API Key"
                            >
                              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => rotateKey.mutate()}
                              disabled={rotateKey.isPending}
                              title="Generate New Key"
                            >
                              <RefreshCw className={`h-4 w-4 ${rotateKey.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={updateConfig.isPending || !form.formState.isDirty}>
                      {updateConfig.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Configuration
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Snippet</CardTitle>
            <CardDescription>How to send jobs from Promesse to this bridge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Endpoint URL (POST)</Label>
              <div className="p-3 bg-slate-900 rounded-md text-slate-100 font-mono text-sm break-all">
                {integrationUrl}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground">Headers</Label>
              <div className="p-3 bg-slate-900 rounded-md text-slate-100 font-mono text-sm">
                X-API-Key: {form.getValues("apiKey") || "<your-api-key>"}
                <br />
                Content-Type: application/json
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">JSON Body Example</Label>
              <div className="p-3 bg-slate-900 rounded-md text-slate-100 font-mono text-sm whitespace-pre overflow-x-auto">
{`{
  "zpl": "^XA^FO50,50^ADN,36,20^FDHello^FS^XZ",
  "source": "Promesse"
}`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
