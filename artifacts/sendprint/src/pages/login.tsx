import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage({ needsSetup }: { needsSetup: boolean }) {
  const { login, setup } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const isSetup = needsSetup;
  const pending = login.isPending || setup.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSetup) {
      if (password.length < 8) {
        toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
        return;
      }
      if (password !== confirm) {
        toast({ title: "Passwords do not match", variant: "destructive" });
        return;
      }
      try {
        await setup.mutateAsync({ data: { password } });
      } catch (err: any) {
        toast({ title: "Setup failed", description: err?.data?.error || err?.message, variant: "destructive" });
      }
      return;
    }
    try {
      await login.mutateAsync({ data: { password } });
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.data?.error || "Invalid password", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/20 p-2 rounded-md">
              <Printer className="w-6 h-6 text-primary" />
            </div>
            <span className="font-semibold text-lg tracking-tight">SendPrint</span>
          </div>
          <CardTitle>{isSetup ? "Set admin password" : "Sign in"}</CardTitle>
          <CardDescription>
            {isSetup
              ? "No admin password is configured yet. Choose one to secure this dashboard."
              : "Enter the admin password to manage this printer bridge."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{isSetup ? "New password" : "Password"}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSetup ? "new-password" : "current-password"}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSetup ? 8 : 1}
              />
            </div>
            {isSetup && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {isSetup ? "Create admin & sign in" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
