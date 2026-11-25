import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, RefreshCw, Copy, Check, AlertCircle, Zap } from "lucide-react";
import {
  analyzeSalesDataWithMeta,
  getCachedSalesInsights,
  type AnalyticsLang,
} from "@/services/geminiService";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIInsightsWidgetProps {
  orders: any[];
  products: any[];
  collections?: any[];
  customers?: any[];
  onSyncCloud?: () => Promise<void>;
}

function InsightsSkeleton({ isBn }: { isBn: boolean }) {
  return (
    <div className="space-y-4 py-2 animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5 text-xs text-primary font-medium">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>
          {isBn
            ? "লাইভ বিক্রয়, কালেকশন ও ইনভেন্টরি বিশ্লেষণ করে বাংলা রিপোর্ট তৈরি করা হচ্ছে..."
            : "Analyzing live sales velocity, collections, and inventory metrics..."}
        </span>
      </div>

      {/* Simulated Executive Table Skeleton */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="grid grid-cols-3 gap-3 bg-muted/50 px-3 py-2.5 border-b border-border/50">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3 w-28 rounded bg-muted animate-pulse" />
        </div>
        <div className="divide-y divide-border/40 p-3 space-y-2.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="grid grid-cols-3 gap-3 pt-1 first:pt-0">
              <div className="h-3.5 w-3/4 rounded bg-muted/70 animate-pulse" />
              <div className="h-3.5 w-1/2 rounded bg-muted/70 animate-pulse" />
              <div className="h-3.5 w-5/6 rounded bg-muted/70 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Simulated Recommendations Skeleton */}
      <div className="space-y-2">
        <div className="h-3.5 w-44 rounded bg-muted/80 animate-pulse" />
        <div className="h-3 w-full rounded bg-muted/60 animate-pulse" />
        <div className="h-3 w-11/12 rounded bg-muted/60 animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-muted/60 animate-pulse" />
      </div>
    </div>
  );
}

export const AIInsightsWidget = memo(function AIInsightsWidget({
  orders,
  products,
  collections,
  customers,
  onSyncCloud,
}: AIInsightsWidgetProps) {
  const { lang } = useI18n();
  const activeLang: AnalyticsLang = lang === "bn" ? "bn" : "en";
  const isBn = activeLang === "bn";

  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(() => {
    const cached = getCachedSalesInsights(activeLang, orders, products, collections, customers);
    return cached?.markdown ?? null;
  });
  const [insightsLang, setInsightsLang] = useState<AnalyticsLang | null>(() => {
    const cached = getCachedSalesInsights(activeLang, orders, products, collections, customers);
    return cached?.lang ?? null;
  });
  const [isCachedResult, setIsCachedResult] = useState<boolean>(() => {
    return Boolean(getCachedSalesInsights(activeLang, orders, products, collections, customers));
  });
  const [generatedAt, setGeneratedAt] = useState<number | null>(() => {
    const cached = getCachedSalesInsights(activeLang, orders, products, collections, customers);
    return cached?.generatedAt ?? null;
  });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const hasVisibleInsightsRef = useRef(Boolean(insights));
  hasVisibleInsightsRef.current = Boolean(insights);

  const runAnalysis = useCallback(
    async (opts?: { forceRefresh?: boolean; silentToast?: boolean }) => {
      const reqId = ++requestSeqRef.current;
      const forceRefresh = opts?.forceRefresh === true;
      const targetLang = activeLang;

      setError(null);

      // Instant zero-latency cache hit when not forcing regeneration
      if (!forceRefresh) {
        const hit = getCachedSalesInsights(targetLang, orders, products, collections, customers);
        if (hit) {
          setInsights(hit.markdown);
          setInsightsLang(hit.lang);
          setIsCachedResult(true);
          setGeneratedAt(hit.generatedAt);
          return;
        }
      }

      setLoading(true);
      try {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          throw new Error(
            targetLang === "bn"
              ? "ইন্টারনেট সংযোগ বর্তমানে বিচ্ছিন্ন রয়েছে। লাইভ ক্লাউড এআই অ্যানালিটিক্স চালাতে সংযোগ পুনঃস্থাপন করে আবার চেষ্টা করুন।"
              : "Internet connection is currently unavailable. Please reconnect and click Try Again to run Live Cloud AI Analytics.",
          );
        }

        // Only trigger a capped cloud sync when explicitly regenerating; avoid blocking normal generation
        if (forceRefresh && onSyncCloud) {
          await Promise.race([
            onSyncCloud().catch(() => undefined),
            new Promise<void>((resolve) => setTimeout(resolve, 2200)),
          ]);
        }

        const result = await analyzeSalesDataWithMeta(orders, products, collections, customers, {
          lang: targetLang,
          forceRefresh,
          syncCloud: false,
        });

        if (reqId !== requestSeqRef.current) return;

        setInsights(result.markdown);
        setInsightsLang(result.lang);
        setIsCachedResult(result.cached);
        setGeneratedAt(result.generatedAt);

        if (!opts?.silentToast) {
          toast.success(
            targetLang === "bn"
              ? result.cached
                ? "ক্যাশ থেকে তাৎক্ষণিক এআই বিশ্লেষণ লোড হয়েছে!"
                : "রিয়েল-টাইম বাংলা এআই ইনসাইটস তৈরি হয়েছে!"
              : result.cached
                ? "Loaded instant cached AI insights!"
                : "Real-time cloud AI insights generated!",
          );
        }
      } catch (err: any) {
        if (reqId !== requestSeqRef.current) return;
        console.warn("AI Insights widget catch:", err);
        const errMsg =
          err?.message ||
          (targetLang === "bn"
            ? "লাইভ ক্লাউড অ্যানালিটিক্স সার্ভিসের সাথে সংযোগ করা যায়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন।"
            : "Failed to synchronize with live cloud analytics service. Please check your internet connection.");
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        if (reqId === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [activeLang, orders, products, collections, customers, onSyncCloud],
  );

  // Auto-hydrate valid cache on mount/data update, and seamlessly switch language if user toggles EN <-> বাংলা
  useEffect(() => {
    const cached = getCachedSalesInsights(activeLang, orders, products, collections, customers);
    if (cached) {
      setInsights(cached.markdown);
      setInsightsLang(cached.lang);
      setIsCachedResult(true);
      setGeneratedAt(cached.generatedAt);
      setError(null);
      return;
    }

    // If insights were already open in the previous language, automatically regenerate in the newly selected language
    if (hasVisibleInsightsRef.current && insightsLang && insightsLang !== activeLang) {
      void runAnalysis({ forceRefresh: false, silentToast: true });
    }
  }, [activeLang, orders, products, collections, customers, insightsLang, runAnalysis]);

  const handleCopy = () => {
    if (!insights) return;
    navigator.clipboard.writeText(insights);
    setCopied(true);
    toast.success(isBn ? "ইনসাইটস ক্লিপবোর্ডে কপি করা হয়েছে!" : "Insights copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedGenTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString(isBn ? "bn-BD" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Card className="bg-gradient-to-br from-white/50 via-white/35 to-sky-100/40 dark:from-slate-900/50 dark:via-slate-900/38 dark:to-sky-950/40 overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/60 dark:border-white/10 bg-white/25 dark:bg-white/[0.03]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-semibold">
                  {isBn
                    ? "এক্সিকিউটিভ এআই ইন্টেলিজেন্স ও অ্যানালিটিক্স"
                    : "Executive AI Intelligence & Analytics"}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30 font-medium py-0 h-4 flex items-center gap-1"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {insights
                    ? isCachedResult
                      ? isBn
                        ? `তাৎক্ষণিক ক্যাশ${formattedGenTime ? ` · ${formattedGenTime}` : ""}`
                        : `Instant Cache${formattedGenTime ? ` · ${formattedGenTime}` : ""}`
                      : isBn
                        ? "লাইভ ক্লাউড সিঙ্ক"
                        : "Live Cloud Sync"
                    : isBn
                      ? "রিয়েল-টাইম অনলাইন অ্যানালিটিক্স"
                      : "Real-Time Online Analytics"}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                {isBn
                  ? "অ্যাডভান্সড এআই প্রযুক্তি দ্বারা চালিত — স্বয়ংক্রিয় চাহিদা পূর্বাভাস, কালেকশন গতি এবং ডিস্ট্রিবিউশন স্বাস্থ্য বিশ্লেষণ।"
                  : "Powered by Advanced AI Technology — automated demand forecasting, collection velocity, and distribution health auditing."}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {insights && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 text-xs gap-1.5"
                title={isBn ? "রিপোর্ট কপি করুন" : "Copy markdown text"}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? (isBn ? "কপি হয়েছে" : "Copied") : (isBn ? "কপি" : "Copy")}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => void runAnalysis({ forceRefresh: Boolean(insights) })}
              disabled={loading}
              className="h-8 text-xs gap-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isBn ? "বিশ্লেষণ হচ্ছে..." : "Analyzing..."}
                </>
              ) : (
                <>
                  {insights ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {insights
                    ? isBn
                      ? "পুনরায় বিশ্লেষণ"
                      : "Regenerate"
                    : isBn
                      ? "এআই ইনসাইট তৈরি করুন"
                      : "Generate AI Insights"}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <InsightsSkeleton isBn={isBn} />
        ) : error ? (
          <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/5 text-xs text-destructive flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runAnalysis({ forceRefresh: true })}
              className="h-7 text-[11px] shrink-0"
            >
              {isBn ? "আবার চেষ্টা করুন" : "Try Again"}
            </Button>
          </div>
        ) : insights ? (
          <div className="text-xs sm:text-sm text-foreground/90 space-y-3 leading-relaxed">
            {isCachedResult && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 border border-border/50 rounded-md px-2.5 py-1 w-fit">
                <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                <span>
                  {isBn
                    ? "সর্বশেষ অর্ডার/কালেকশন ডেটা অপরিবর্তিত থাকায় তাৎক্ষণিক ক্যাশড রিপোর্ট প্রদর্শিত হচ্ছে।"
                    : "Showing instant cached report — auto-refreshes whenever orders, collections, or stock change."}
                </span>
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-base sm:text-lg font-bold text-foreground mt-4 mb-2 pb-1.5 border-b border-border/60 flex items-center gap-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-sm sm:text-base font-semibold text-foreground mt-4 mb-2 flex items-center gap-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground/95 mt-3 mb-1.5" {...props} />
                ),
                h4: ({ node, ...props }) => (
                  <h4 className="text-xs font-semibold text-foreground/90 mt-2 mb-1" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="my-1.5 text-xs sm:text-sm leading-relaxed text-foreground/85" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-outside ml-5 my-2 space-y-1 text-xs sm:text-sm text-foreground/85" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-outside ml-5 my-2 space-y-1 text-xs sm:text-sm text-foreground/85" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="leading-relaxed" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-foreground" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-3 rounded-lg border border-border/80 shadow-xs">
                    <table className="w-full text-xs text-left border-collapse" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-muted/70 text-foreground font-semibold border-b border-border/80" {...props} />
                ),
                tbody: ({ node, ...props }) => (
                  <tbody className="divide-y divide-border/40 bg-white/30 dark:bg-white/[0.03]" {...props} />
                ),
                tr: ({ node, ...props }) => (
                  <tr className="hover:bg-muted/30 transition-colors" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="py-2 px-3 text-foreground/85 whitespace-normal" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-3 border-primary/60 bg-primary/5 pl-3 py-1.5 my-2.5 rounded-r text-xs italic text-muted-foreground" {...props} />
                ),
                code: ({ node, className, ...props }) => (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-primary border border-border/50" {...props} />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="my-3 border-border/60" {...props} />
                ),
              }}
            >
              {insights}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <span>
                {isBn ? (
                  <>
                    সর্বাধিক বিক্রিত কুকওয়্যার, গ্রাহকের বকেয়া স্থিতি এবং আগামী ৭ দিনের পূর্বাভাস জানতে{" "}
                    <strong>এআই ইনসাইট তৈরি করুন</strong> বাটনে ক্লিক করুন।
                  </>
                ) : (
                  <>
                    Click <strong>Generate AI Insights</strong> to run an instant diagnostic on top-selling cookware,
                    customer balances, and 7-day forecasts.
                  </>
                )}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runAnalysis({ forceRefresh: false })}
              className="text-xs h-7 shrink-0 font-medium self-end sm:self-auto"
            >
              {isBn ? "এখনই বিশ্লেষণ করুন" : "Analyze Now"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default AIInsightsWidget;
