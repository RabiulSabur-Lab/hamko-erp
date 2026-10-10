import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "@/router";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, Sun, Moon, Globe, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export function ResetPassword() {
  const { navigate, query } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useI18n();

  const [verifyingSession, setVerifyingSession] = useState(true);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function verifyRecoveryToken() {
      // Check URL search and hash for recovery tokens
      const hashStr = typeof window !== "undefined" ? window.location.hash : "";
      const searchStr = typeof window !== "undefined" ? window.location.search : "";

      const accessToken = query.access_token || "";
      const refreshToken = query.refresh_token || "";
      const code = query.code || "";
      const isRecoveryType = query.type === "recovery" || hashStr.includes("type=recovery");

      const hasUrlToken = Boolean(
        accessToken ||
        code ||
        isRecoveryType ||
        hashStr.includes("access_token") ||
        searchStr.includes("code=")
      );

      // If absolutely no recovery token in URL and no session exists, reject immediately
      if (!hasUrlToken) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (isMounted) {
            toast.error("Access denied. Please click the password reset link sent to your email inbox.");
            navigate("/signin");
          }
          return;
        }
      }

      // Handle PKCE code exchange
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            if (isMounted) {
              setTokenVerified(true);
              setUserEmail(data.session.user?.email || null);
              setVerifyingSession(false);
            }
            return;
          }
        } catch (err) {
          console.warn("Notice exchanging recovery code:", err);
        }
      }

      // Handle implicit hash tokens
      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session) {
            if (isMounted) {
              setTokenVerified(true);
              setUserEmail(data.session.user?.email || null);
              setVerifyingSession(false);
            }
            return;
          }
        } catch (err) {
          console.warn("Notice setting recovery session from token:", err);
        }
      }

      // Check current session
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession.session) {
        if (isMounted) {
          setTokenVerified(true);
          setUserEmail(currentSession.session.user?.email || null);
          setVerifyingSession(false);
        }
        return;
      }

      // Listen for Supabase PASSWORD_RECOVERY event
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
          if (isMounted) {
            setTokenVerified(true);
            setUserEmail(session.user?.email || null);
            setVerifyingSession(false);
          }
        }
      });
      authSubscription = listener.subscription;

      // Allow a brief grace period for Supabase auth state reconciliation before redirecting
      setTimeout(async () => {
        if (!isMounted) return;
        const { data: finalCheck } = await supabase.auth.getSession();
        if (finalCheck.session) {
          setTokenVerified(true);
          setUserEmail(finalCheck.session.user?.email || null);
          setVerifyingSession(false);
        } else {
          toast.error("Your password reset link is invalid or has expired. Please request a new link.");
          navigate("/signin");
        }
      }, 1500);
    }

    verifyRecoveryToken();

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, [query, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please recheck.");
      return;
    }

    setSubmitting(true);
    try {
      // Update Supabase Auth user password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message || "Failed to update password. Please request a new reset link.");
        return;
      }

      // Terminate the recovery session so clean sign-in is required with new credentials
      try {
        await supabase.auth.signOut();
      } catch {}

      setIsSuccess(true);
      toast.success("Password updated successfully! Please sign in with your new credentials.");

      setTimeout(() => {
        navigate("/signin");
      }, 1500);
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast.error(err?.message || "Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Loading / Token Verification State
  if (verifyingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/20">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Verifying Recovery Token</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Validating your secure password reset credentials with Supabase...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Denied State (if verification failed before navigation fires)
  if (!tokenVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/20">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Access Denied</h3>
          <p className="text-xs text-muted-foreground">
            A valid password reset token is required. Please request a new link from the login page.
          </p>
          <Button size="sm" onClick={() => navigate("/signin")} className="mt-2 text-xs">
            Return to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // 3. Authenticated Set New Password Form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/20 relative">
      {/* Top action controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLang(lang === "en" ? "bn" : "en")}
          className="h-8 w-8 rounded-full"
          title="Toggle Language"
        >
          <Globe className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-full"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-white/95 dark:bg-card p-2.5 rounded-2xl shadow-sm border border-border/60 mb-3 inline-flex items-center justify-center">
            <img src="/Hamko.png" alt="Hamko" className="h-9 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Sales ERP Pro</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Secure Password Reset Portal</p>
        </div>

        <Card className="border-border/80 shadow-md backdrop-blur-sm bg-card/95">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <CardTitle className="text-lg">Set New Password</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {userEmail
                ? `Recovery token verified for ${userEmail}. Enter your new password below.`
                : "Your recovery token has been verified. Enter your new password below."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Password Reset Complete!</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Your new password is set. Redirecting you to the sign-in screen...
                </p>
                <Button
                  onClick={() => navigate("/signin")}
                  className="mt-2 text-xs h-8"
                  size="sm"
                >
                  Go to Sign In Now
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="reset-new-password" className="text-xs font-semibold">
                    New Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 h-9 text-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="reset-confirm-password" className="text-xs font-semibold">
                    Confirm New Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-9 h-9 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Must be at least 6 characters and match exactly.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    className="w-full text-xs h-9 gap-1.5"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Save New Password
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/signin")}
                    className="w-full text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Cancel & Back to Sign In
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetPassword;
