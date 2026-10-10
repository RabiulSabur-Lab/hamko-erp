import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Bot, TrendingUp, RefreshCw, Copy, Check, AlertCircle } from "lucide-react";
import { analyzeSalesData } from "@/services/geminiService";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIInsightsWidgetProps {
  orders: any[];
  products: any[];
}

export function AIInsightsWidget({ orders, products }: AIInsightsWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeSalesData(orders, products);
      setInsights(result);
      toast.success("Gemini 1.5 Flash analysis generated!");
    } catch (err: any) {
      console.warn("AI Insights widget catch:", err);
      setError(err?.message || "Failed to contact Gemini API. Please check your internet connection.");
      toast.error("Could not fetch AI insights. Local fallback available.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!insights) return;
    navigator.clipboard.writeText(insights);
    setCopied(true);
    toast.success("Insights copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border border-border/80 shadow-sm bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Executive AI Intelligence & Analytics</CardTitle>
                {insights ? (
                  insights.includes("(Offline Mode)") ? (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400 font-mono py-0 h-4">
                      Offline Mode
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30 font-medium py-0 h-4 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Online (Gemini AI)
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-medium py-0 h-4">
                    AI Powered
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                Powered by Advanced AI Technology — automated demand forecasting, collection velocity, and distribution health auditing.
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
                title="Copy markdown text"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={loading}
              className="h-8 text-xs gap-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  {insights ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {insights ? "Regenerate" : "Generate AI Insights"}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                <Bot className="h-6 w-6" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Synthesizing Sales & Inventory Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gemini 1.5 Flash is examining dealer order trends, stock velocity, and accounts aging...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/5 text-xs text-destructive flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerate} className="h-7 text-[11px]">
              Try Again
            </Button>
          </div>
        ) : insights ? (
          <div className="text-xs sm:text-sm text-foreground/90 space-y-3 leading-relaxed">
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
                  <tbody className="divide-y divide-border/40 bg-card" {...props} />
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
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <span>
                Click <strong>Generate AI Summary</strong> to run an instant diagnostic on top-selling cookware, customer balances, and 7-day forecasts.
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              className="text-xs h-7 shrink-0 font-medium"
            >
              Analyze Now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIInsightsWidget;
