import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Sparkles,
  AlertTriangle,
  Smartphone,
  ExternalLink,
  LogOut,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import {
  type AppUpdateCheckResult,
  triggerApkDownload,
  exitMobileApp,
} from "@/services/appUpdateService";

interface AppUpdateModalProps {
  open: boolean;
  updateInfo: AppUpdateCheckResult | null;
  onClose: () => void;
}

export function AppUpdateModal({ open, updateInfo, onClose }: AppUpdateModalProps) {
  const { lang } = useI18n();
  const [downloadStarted, setDownloadStarted] = useState(false);

  const isForced = Boolean(updateInfo?.isForced);
  const metadata = updateInfo?.metadata;

  useEffect(() => {
    if (!open) {
      setDownloadStarted(false);
      return;
    }

    if (isForced) {
      // Prevent body scrolling when forced
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isForced) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, isForced, onClose]);

  if (!open || !updateInfo || !updateInfo.hasUpdate || !metadata) {
    return null;
  }

  const handleDownload = () => {
    setDownloadStarted(true);
    triggerApkDownload(metadata.apkUrl);
  };

  const handleDismiss = () => {
    if (isForced) return;
    try {
      localStorage.setItem("hamko_app_update_dismissed_version", updateInfo.latestVersion);
      localStorage.setItem("hamko_app_update_dismissed_at", Date.now().toString());
    } catch {
      // Storage unavailable
    }
    onClose();
  };

  const handleExit = async () => {
    await exitMobileApp();
  };

  const releaseNotesList = (metadata.releaseNotes || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isForced ? undefined : handleDismiss}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Close Button (Hidden if Forced) */}
        {!isForced && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isForced
                ? "bg-rose-500/10 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isForced ? <AlertTriangle className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold leading-tight">
                {isForced
                  ? lang === "bn"
                    ? "জরুরি সিস্টেম আপডেট প্রয়োজন"
                    : "Mandatory Update Required"
                  : lang === "bn"
                  ? "নতুন আপডেট পাওয়া গেছে"
                  : "New Update Available"}
              </h2>
              {isForced && (
                <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
                  Required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hamko ERP Mobile App
            </p>
          </div>
        </div>

        {/* Version Badges */}
        <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3 mb-4 text-xs">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground">
              {lang === "bn" ? "বর্তমান ভার্সন" : "Current Version"}
            </span>
            <span className="font-mono font-semibold text-foreground">
              v{updateInfo.currentVersion} ({lang === "bn" ? "বিল্ড" : "Build"} #{updateInfo.currentBuild})
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-primary font-bold">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
            <span className="text-muted-foreground">→</span>
            <span className="font-mono bg-primary/15 text-primary px-2 py-0.5 rounded-md text-xs">
              v{updateInfo.latestVersion}
            </span>
          </div>
        </div>

        {/* Forced Warning Alert if Mandatory */}
        {isForced && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 mb-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            <p className="font-medium">
              {lang === "bn"
                ? "আপনার বর্তমান অ্যাপ সংস্করণটি ডেপ্রিকেটেড। সিস্টেমে ডেটা সমন্বয় এবং নিরবচ্ছিন্ন ব্যবহারের জন্য অনুগ্রহ করে সর্বশেষ সংস্করণে আপডেট করুন।"
                : "Your current app version is out of date. To ensure database synchronization and security, please install the latest version."}
            </p>
          </div>
        )}

        {/* Release Notes */}
        <div className="space-y-2 mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {lang === "bn" ? "নতুন যা থাকছে" : "What's New in this Version"}
          </h4>
          <div className="rounded-xl border bg-muted/30 p-3 max-h-36 overflow-y-auto text-xs space-y-1.5">
            {releaseNotesList.length > 0 ? (
              releaseNotesList.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span className="text-foreground/90">{item.replace(/^[-•*]\s*/, "")}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground italic">
                {lang === "bn" ? "পারফরম্যান্স ও বাগ ফিক্স।" : "Performance improvements and bug fixes."}
              </p>
            )}
          </div>
        </div>

        {/* Download State Notification */}
        {downloadStarted && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 mb-4 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              {lang === "bn"
                ? "ডাউনলোড শুরু হয়েছে! নোটিফিকেশন বার অথবা ডাউনলোড ফোল্ডার থেকে APK ফাইলটি ওপেন করে ইনস্টল করুন।"
                : "APK download initiated! When complete, open the file from your notifications to install."}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={handleDownload}
            className="w-full h-11 text-sm font-semibold gap-2 shadow-md"
          >
            <Download className="h-4 w-4" />
            {lang === "bn" ? "ডাউনলোড ও ইনস্টল করুন" : "Download & Install Update"}
            <ExternalLink className="h-3.5 w-3.5 opacity-70 ml-auto" />
          </Button>

          {isForced ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleExit}
              className="w-full text-xs text-muted-foreground gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              {lang === "bn" ? "অ্যাপ বন্ধ করুন" : "Exit App"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismiss}
              className="w-full text-xs text-muted-foreground"
            >
              {lang === "bn" ? "পরে মনে করিয়ে দিন" : "Remind Me Later"}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AppUpdateModal;

