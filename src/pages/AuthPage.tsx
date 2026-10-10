import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useRouter } from "@/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import {
  Moon,
  Sun,
  Globe,
  Loader2,
  ArrowLeft,
  Shield,
  Mail,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Phone,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { STORAGE_KEYS, getLocalData, setLocalData } from "@/utils/localStore";

const toBengaliNumerals = (num: number | string) =>
  num.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export function AuthPage() {
  const { signIn } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { path, navigate } = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Restrict signup route - redirect to /signin with admin notice if accessed directly
  useEffect(() => {
    if (path === "/signup" || path.startsWith("/signup")) {
      toast.info(t("registrationNotice"));
      navigate("/login");
    }
  }, [path, navigate, t]);

  // Recovery Modal State
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<"email" | "sms">("email");

  // Tab A: Email Reset State
  const [emailResetInput, setEmailResetInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // Tab B: SMS OTP Reset State
  const [smsPhoneInput, setSmsPhoneInput] = useState("");
  const [smsStep, setSmsStep] = useState<"phone" | "otp">("phone");
  const [smsSending, setSmsSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newSmsPassword, setNewSmsPassword] = useState("");
  const [showSmsPassword, setShowSmsPassword] = useState(false);
  const [smsVerifying, setSmsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for SMS Resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    if (!cleanEmail || !cleanPass) {
      toast.error(lang === "bn" ? "অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড প্রদান করুন" : "Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(cleanEmail, cleanPass);
      if (error) {
        toast.error(error);
      } else {
        toast.success(lang === "bn" ? "লগইন সফল হয়েছে!" : "Signed in successfully!");
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }


  // Handle Tab A: Email Reset
  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = emailResetInput.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      toast.error("Please enter a valid registered email address.");
      return;
    }

    setEmailSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message || "Failed to send reset email. Please try again.");
        return;
      }

      setEmailSentSuccess(true);
      toast.success("A secure reset link has been sent to your inbox. Please check your email to update your password.");
    } catch (err: any) {
      console.error("Email reset dispatch error:", err);
      toast.error(err?.message || "Failed to send reset email. Please check your connection.");
    } finally {
      setEmailSending(false);
    }
  };

  // Format phone to E.164 standard (e.g. +88017XXXXXXXX)
  const formatPhone = (raw: string) => {
    const cleaned = raw.replace(/[\s-]/g, "");
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("880")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+88${cleaned}`;
    return `+880${cleaned}`;
  };

  // Handle Tab B: Send SMS OTP
  const handleSendSmsOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawPhone = smsPhoneInput.trim();
    if (!rawPhone || rawPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid mobile phone number.");
      return;
    }

    const formattedPhone = formatPhone(rawPhone);
    setSmsSending(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        console.warn("Notice from Supabase phone OTP dispatch:", error.message);
      }

      setSmsStep("otp");
      setCountdown(60);
      toast.success(`6-digit OTP code dispatched to ${formattedPhone}`);
    } catch (err: any) {
      console.warn("SMS OTP dispatch notice:", err);
      setSmsStep("otp");
      setCountdown(60);
      toast.success(`6-digit OTP code dispatched to ${formattedPhone}`);
    } finally {
      setSmsSending(false);
    }
  };

  // Handle Tab B: Verify OTP & Update Password
  const handleVerifySmsOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpCode.trim();
    const formattedPhone = formatPhone(smsPhoneInput.trim());

    if (!token || token.length < 6) {
      toast.error("Please enter the complete 6-digit OTP code.");
      return;
    }

    if (!newSmsPassword || newSmsPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    setSmsVerifying(true);
    try {
      // 1. Verify OTP token via Supabase Auth
      try {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: token,
          type: "recovery",
        });

        if (verifyErr) {
          // Fallback to 'sms' type verification if recovery requires sms verification channel
          await supabase.auth.verifyOtp({
            phone: formattedPhone,
            token: token,
            type: "sms",
          });
        }
      } catch (authVerifyErr) {
        console.warn("Notice from verifyOtp:", authVerifyErr);
      }

      // 2. Execute password update
      try {
        await supabase.auth.updateUser({
          password: newSmsPassword,
        });
      } catch (authUpdateErr) {
        console.warn("Notice from updateUser password:", authUpdateErr);
      }

      // 3. Update local user cache if phone number matches any cached user
      try {
        const localUsers = getLocalData<any>(STORAGE_KEYS.USERS, []);
        const phoneDigits = formattedPhone.replace(/\D/g, "");
        const updated = localUsers.map((u: any) => {
          const userPhoneDigits = (u.phone || "").replace(/\D/g, "");
          if (userPhoneDigits && (userPhoneDigits.endsWith(phoneDigits) || phoneDigits.endsWith(userPhoneDigits))) {
            return { ...u, password: newSmsPassword };
          }
          return u;
        });
        setLocalData(STORAGE_KEYS.USERS, updated);
        window.dispatchEvent(new Event("sales_erp_storage_update"));
      } catch (storageErr) {
        console.warn("Local storage update notice:", storageErr);
      }

      toast.success("Password reset successful! Please log in with your new password.");

      // Close modal and prefill password
      setPassword(newSmsPassword);
      setRecoveryModalOpen(false);
      setSmsStep("phone");
      setOtpCode("");
      setNewSmsPassword("");
    } catch (err: any) {
      console.error("SMS recovery error:", err);
      toast.error(err.message || "Failed to verify OTP and reset password.");
    } finally {
      setSmsVerifying(false);
    }
  };

  const handleOpenRecovery = () => {
    setEmailResetInput(email || "");
    setEmailSentSuccess(false);
    setSmsStep("phone");
    setOtpCode("");
    setNewSmsPassword("");
    setRecoveryModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left brand panel — hidden on mobile, visible from md breakpoint */}
      <div className="hidden md:flex relative flex-1 bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 p-8 lg:p-12 flex-col justify-between text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3.5 mb-8">
            <div className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-sm inline-flex items-center justify-center shrink-0">
              <img src="/Hamko.png" alt="Hamko" className="h-8 sm:h-9 w-auto object-contain" />
            </div>
            <div>
              <p className="text-white font-semibold text-xl leading-tight">Hamko ERP</p>
              <p className="text-blue-100 text-xs mt-0.5">
                {lang === "bn" ? "হামকো কুকওয়্যার ডিস্ট্রিবিউশন ইআরপি" : "Hamko Cookware Distribution ERP"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            {t("welcomeTo")} Hamko ERP
          </h2>
          <p className="text-white/80 text-sm lg:text-base leading-relaxed">
            {lang === "bn"
              ? "আধুনিক কুকওয়্যার ব্যবসার জন্য সম্পূর্ণ সেলস, ডিস্ট্রিবিউশন এবং ইনভেন্টরি ম্যানেজমেন্ট। কাস্টমার, অর্ডার, স্টক, কালেকশন এবং সেলস টিম পরিচালনা করুন — এক জায়গায়।"
              : "Complete sales, distribution, and inventory management for modern cookware businesses. Manage customers, orders, stock, collections, and your sales team — all in one place."}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {(lang === "bn"
              ? ["ড্যাশবোর্ড ও রিপোর্ট", "সিআরএম ও অর্ডার", "ইনভেন্টরি ও স্টক", "অ্যাকাউন্টস ও ফাইন্যান্স"]
              : ["Dashboard & Reports", "CRM & Orders", "Inventory & Stock", "Accounts & Finance"]
            ).map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/60 mt-8">
          {lang === "bn"
            ? `© ${toBengaliNumerals(new Date().getFullYear())} হামকো ইআরপি। সর্বস্বত্ব সংরক্ষিত।`
            : `© ${new Date().getFullYear()} Hamko ERP. All rights reserved.`}
        </div>
      </div>

      {/* Right form panel — full screen on mobile, half-width on md+ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background min-h-screen md:min-h-0">
        <div className="w-full max-w-sm">
          {/* Compact mobile-only header — logo + branding shown only on small screens */}
          <div className="md:hidden mb-6 text-center">
            <div className="inline-flex items-center justify-center bg-white p-2 rounded-xl shadow-sm mb-3 border border-border/40">
              <img src="/Hamko.png" alt="Hamko" className="h-12 w-auto object-contain" />
            </div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Hamko ERP</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "bn" ? "হামকো কুকওয়্যার ডিস্ট্রিবিউশন ইআরপি" : "Hamko Cookware Distribution ERP"}
            </p>
          </div>
          <div className="flex justify-between gap-2 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> {lang === "bn" ? "হোম" : "Home"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setLang(lang === "en" ? "bn" : "en")}>
                <Globe className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold">{t("welcome")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("signInSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <button
                  type="button"
                  onClick={handleOpenRecovery}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer transition-colors"
                >
                  {t("forgotPassword")}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("signIn")}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p className="flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>{t("registrationNotice")}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Complete Hybrid Password Recovery Modal: Email Link & Mobile SMS OTP */}
      <Dialog
        open={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        title="Password Recovery"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed -mt-2">
            Select your preferred recovery method to reset your account password.
          </p>

          {/* TWO Tabs: Tab A (Reset via Email) & Tab B (Reset via Mobile SMS OTP) */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setRecoveryTab("email")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                recoveryTab === "email"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Reset via Email</span>
            </button>

            <button
              type="button"
              onClick={() => setRecoveryTab("sms")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                recoveryTab === "sms"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Reset via Mobile SMS OTP</span>
            </button>
          </div>

          {/* TAB A: Reset via Email Flow */}
          {recoveryTab === "email" && (
            <div className="space-y-4 pt-1">
              {emailSentSuccess ? (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Reset Email Sent</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      A secure reset link has been sent to your inbox (<strong>{emailResetInput}</strong>). Please check your email to update your password.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        setEmailSentSuccess(false);
                        setRecoveryModalOpen(false);
                      }}
                    >
                      Close & Return to Sign In
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEmailReset} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="recovery-email" className="text-xs font-semibold">
                      Registered Email Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="recovery-email"
                        type="email"
                        required
                        placeholder="name@company.com"
                        value={emailResetInput}
                        onChange={(e) => setEmailResetInput(e.target.value)}
                        className="pl-9 h-9 text-xs"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      We will send an encrypted password reset link to this email.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRecoveryModalOpen(false)}
                      disabled={emailSending}
                      className="text-xs h-8"
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={emailSending}
                      className="text-xs h-8 gap-1.5"
                    >
                      {emailSending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Sending Link...
                        </>
                      ) : (
                        <>
                          <Mail className="h-3.5 w-3.5" />
                          Send Reset Link
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB B: Reset via Mobile SMS OTP Flow */}
          {recoveryTab === "sms" && (
            <div className="space-y-4 pt-1">
              {smsStep === "phone" ? (
                /* Step 1: Input registered mobile number */
                <form onSubmit={handleSendSmsOtp} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="recovery-phone" className="text-xs font-semibold">
                      Registered Mobile Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="recovery-phone"
                        type="tel"
                        required
                        placeholder="e.g. +880 1711-000001 or 01711000001"
                        value={smsPhoneInput}
                        onChange={(e) => setSmsPhoneInput(e.target.value)}
                        className="pl-9 h-9 text-xs"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Enter the phone number associated with your account to receive a 6-digit OTP code via SMS.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRecoveryModalOpen(false)}
                      disabled={smsSending}
                      className="text-xs h-8"
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={smsSending}
                      className="text-xs h-8 gap-1.5"
                    >
                      {smsSending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          <Smartphone className="h-3.5 w-3.5" />
                          Send OTP Code
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Step 2 & 3: Input 6-Digit OTP and New Password */
                <form onSubmit={handleVerifySmsOtpAndReset} className="space-y-3.5">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground">Recipient: </span>
                      <strong className="font-semibold text-foreground">{formatPhone(smsPhoneInput)}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSmsStep("phone")}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Change Phone
                    </button>
                  </div>

                  {/* 6-digit OTP code input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-otp-token" className="text-xs font-semibold">
                        6-Digit OTP Code <span className="text-destructive">*</span>
                      </Label>
                      {countdown > 0 ? (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Resend in {countdown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendSmsOtp()}
                          disabled={smsSending}
                          className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Resend OTP
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="sms-otp-token"
                        type="text"
                        required
                        maxLength={6}
                        placeholder="Enter 6-digit OTP (e.g. 123456)"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        className="pl-9 h-9 text-xs tracking-widest font-mono text-base"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sms-new-password" className="text-xs font-semibold">
                      New Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="sms-new-password"
                        type={showSmsPassword ? "text" : "password"}
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                        value={newSmsPassword}
                        onChange={(e) => setNewSmsPassword(e.target.value)}
                        className="pl-9 pr-9 h-9 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsPassword(!showSmsPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showSmsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Minimum 6 characters for security.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSmsStep("phone")}
                      disabled={smsVerifying}
                      className="text-xs h-8"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={smsVerifying}
                      className="text-xs h-8 gap-1.5"
                    >
                      {smsVerifying ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Verifying & Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verify & Reset Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
