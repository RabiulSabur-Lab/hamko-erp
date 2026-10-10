import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "@/router";
import { Button } from "@/components/ui/button";
import {
  Moon, Sun, Globe, ArrowRight, BarChart3, Users, Package,
  Warehouse, Wallet, MapPin, ShieldCheck, Zap, TrendingUp,
  CheckCircle2, Sparkles, RefreshCw, Activity,
  ChevronRight, Building2, FileSpreadsheet, Lock, Clock,
  ShoppingCart, FileText, Check, Layers, Laptop
} from "lucide-react";

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useI18n();
  const { navigate } = useRouter();
  const [activeRole, setActiveRole] = useState<"admin" | "manager" | "officer" | "distributor" | "accountant">("admin");

  // Huawei Enterprise Style: 9 Core ERP Modules
  const modules = [
    {
      icon: BarChart3,
      title: "Executive Dashboard & KPIs",
      desc: "Live analytics on distribution velocity, fulfillment rates, collection health, and partner network activity with dynamic visual trends.",
      badge: "Analytics",
      color: "from-sky-500 to-blue-600",
      bullets: ["AI Executive Insights", "Fulfillment & Velocity Trends", "Smart Health & Audit Engine"],
    },
    {
      icon: Users,
      title: "Dealer & CRM Management",
      desc: "Centralized directory for authorized distribution partners across regional territories with real-time credit status and engagement tracking.",
      badge: "CRM",
      color: "from-emerald-500 to-teal-600",
      bullets: ["Automated Ledger Calculation", "Credit Limit Safeguards", "Partner Performance History"],
    },
    {
      icon: Package,
      title: "Product Catalog & Pricing Governance",
      desc: "Manage cookware catalog with intelligent rate schedules, standardized tier governance, and instant SKU code lookup.",
      badge: "Smart Pricing",
      color: "from-amber-500 to-orange-600",
      bullets: ["Cookware & Kitchenware SKUs", "Standardized Tier Governance", "Instant SKU Code Lookup"],
    },
    {
      icon: Warehouse,
      title: "Warehouse Inventory & Smart Sync",
      desc: "Precise stock management with real-time deductions on delivery, automatic restoration on cancellation, and low-stock alarms.",
      badge: "Inventory",
      color: "from-violet-500 to-purple-600",
      bullets: ["Real-Time Dispatch Deductions", "Automated Return Reconciliation", "Multi-Terminal Real-Time Sync"],
    },
    {
      icon: ShoppingCart,
      title: "Orders & Invoice Dispatch",
      desc: "End-to-end order processing from digital quotation to delivery, with print-ready tax invoices and real-time status pipelines.",
      badge: "Orders",
      color: "from-blue-500 to-indigo-600",
      bullets: ["Rapid Order Placement", "Printable Tax Invoices", "Multi-Stage Delivery Workflow"],
    },
    {
      icon: Wallet,
      title: "Accounts, Finance & Cash Book",
      desc: "Track collections, expenses, bank deposits, and customer balances with automated double-entry verification.",
      badge: "Finance",
      color: "from-rose-500 to-pink-600",
      bullets: ["Multi-Channel Receipt Verification", "Expense Categorization", "Master Cash Book Balance"],
    },
    {
      icon: MapPin,
      title: "Sales Force Automation & AI Mobility",
      desc: "Empower field officers with AI-assisted route planning, GPS geotagged partner visit check-ins, and target achievement tracking.",
      badge: "AI Field Sales",
      color: "from-cyan-500 to-blue-600",
      bullets: ["GPS Visit Verification", "Digital Order Booking", "AI Route & Target Guidance"],
    },
    {
      icon: FileSpreadsheet,
      title: "Customer Ledger & Smart Reminders",
      desc: "Transparent partner ledger statements with opening balance, order billings, cash collections, and automated AI payment reminders.",
      badge: "Statements",
      color: "from-teal-500 to-emerald-600",
      bullets: ["Zero-Discrepancy Ledger", "AI Payment Reminder Drafts", "Direct PDF Statement Print"],
    },
    {
      icon: TrendingUp,
      title: "Executive Reports & Intelligence",
      desc: "Deep-dive distribution intelligence backed by AI-driven predictive insights, territory performance sheets, and Excel exports.",
      badge: "Intelligence",
      color: "from-indigo-500 to-violet-600",
      bullets: ["One-Click Excel Exports", "Territory Sales Breakdown", "Financial Audit Records"],
    },
  ];

  // Apple-Inspired Refined Counter Badges
  const stats = [
    { value: "150+", label: "Product Portfolio", note: "Optimized catalog & tier governance", icon: Package },
    { value: "100%", label: "Partner Coverage", note: "Authorized regional distribution", icon: Users },
    { value: "Verified", label: "Ledger Reconciliation", note: "Zero-discrepancy balance auditing", icon: Wallet },
    { value: "99.99%", label: "Sync & AI Reliability", note: "Cloud database + offline engine", icon: ShieldCheck },
  ];

  // Role Showcase Data
  const roles = [
    {
      id: "admin" as const,
      name: "Super Admin",
      title: "Total Enterprise Command",
      tagline: "Unrestricted operational oversight across all branches, users, and datasets.",
      icon: ShieldCheck,
      features: [
        "Full system administration & user role management",
        "Master data overrides & database sync control",
        "Comprehensive financial audits and P&L summaries",
      ],
      previewStats: [
        { label: "Network Status", val: "Optimal", sub: "100% Operational" },
        { label: "Financial Health", val: "Audited", sub: "Optimized Growth MTD" },
        { label: "AI Engine", val: "Online", sub: "Smart Automation Active" },
      ],
      previewHeadline: "System Health & Cloud Infrastructure",
      previewItems: [
        { title: "Supabase Cloud Database", status: "Healthy · 22ms latency", badge: "Live" },
        { title: "Inventory Ledger Sync", status: "All SKUs reconciled in real-time", badge: "Synced" },
        { title: "AI Intelligence Services", status: "Automated analysis & ledger audits active", badge: "Active" },
      ],
    },
    {
      id: "manager" as const,
      name: "Sales Manager",
      title: "Territory & Team Leadership",
      tagline: "Drive revenue, monitor dealer pipelines, and review sales rep KPIs.",
      icon: TrendingUp,
      features: [
        "Set and track monthly representative sales quotas",
        "Approve special pricing discounts and bulk orders",
        "Territory performance leaderboard by dealer volume",
      ],
      previewStats: [
        { label: "Team Velocity", val: "On Track", sub: "Target Pace Maintained" },
        { label: "Fulfillment Queue", val: "Priority", sub: "Pending Review & Clearance" },
        { label: "Territory Coverage", val: "100%", sub: "Regional Routes Active" },
      ],
      previewHeadline: "Sales Quota & Field Team Velocity",
      previewItems: [
        { title: "Regional Field Team", status: "All officers active on route", badge: "Active" },
        { title: "AI Quota & Target Analysis", status: "Predictive pacing on track", badge: "Optimized" },
        { title: "Territory Route Coverage", status: "Planned itineraries completed", badge: "Complete" },
      ],
    },
    {
      id: "officer" as const,
      name: "Sales Officer",
      title: "Field Mobility & Rapid Booking",
      tagline: "Perform on-site dealer visits, check stock, and place instant orders.",
      icon: MapPin,
      features: [
        "Mobile-optimized order booking with standardized pricing governance",
        "GPS geotagged check-ins for verified dealer visits",
        "Instant view of dealer outstanding balance and credit limits",
      ],
      previewStats: [
        { label: "Today's Route", val: "Completed", sub: "Scheduled Field Visits" },
        { label: "Orders Booked", val: "Verified", sub: "Standard Tier Applied" },
        { label: "Partner Account", val: "Active Plan", sub: "Credit Limits Verified" },
      ],
      previewHeadline: "Mobile Order Booking & Visit Route",
      previewItems: [
        { title: "Regional Partner Check-In", status: "GPS verified check-in completed", badge: "Done" },
        { title: "Digital Order Booking", status: "Optimized pricing applied", badge: "Synced" },
        { title: "AI Reminder Assistant", status: "Smart payment draft ready", badge: "Ready" },
      ],
    },
    {
      id: "distributor" as const,
      name: "Distributor / Dealer",
      title: "Transparent Stock & Orders",
      tagline: "Real-time visibility into order status, price sheets, and dispatch tracking.",
      icon: Package,
      features: [
        "Live catalog with standardized dealer tier pricing",
        "Track shipments from dispatch to delivered status",
        "Download verifiable statements and printable tax invoices",
      ],
      previewStats: [
        { label: "Account Status", val: "Active Plan", sub: "Standard Tier Applied" },
        { label: "Active Orders", val: "In-Transit", sub: "Delivery Expected Today" },
        { label: "Pricing Tier", val: "Standard Tier Applied", sub: "Optimized Pricing Active" },
      ],
      previewHeadline: "Dealer Order Tracker & Delivery Dispatch",
      previewItems: [
        { title: "Shipment Tracking · Batch Order", status: "Out for Delivery (Central Warehouse)", badge: "Dispatched" },
        { title: "Tax Invoice & Delivery Receipt", status: "Delivered & Cleared", badge: "Settled" },
        { title: "Pricing Schedule", status: "Standard Tier Applied", badge: "Active" },
      ],
    },
    {
      id: "accountant" as const,
      name: "Accountant",
      title: "Financial Precision & Dues",
      tagline: "Maintain bulletproof cash ledgers, verify payments, and reconcile balances.",
      icon: Wallet,
      features: [
        "Record cash, bank deposit, and security cheque vouchers",
        "Instant ledger reconciliation with zero math discrepancies",
        "Export professional reports directly to Excel and PDF",
      ],
      previewStats: [
        { label: "Daily Collections", val: "Reconciled", sub: "All Vouchers Recorded" },
        { label: "Ledger Balance", val: "Balanced", sub: "Zero Variance Detected" },
        { label: "Audit Health", val: "Verified", sub: "Master Cash Book In Sync" },
      ],
      previewHeadline: "Cash Collection & Dealer Ledger Statement",
      previewItems: [
        { title: "Settlement Voucher · Partner Account", status: "Bank Transfer · Verified", badge: "Settled" },
        { title: "Collection Receipt · Cash Deposit", status: "Cash Collection · Verified", badge: "Verified" },
        { title: "Security Instrument Registry", status: "Banking Channel · Confirmed", badge: "Verified" },
      ],
    },
  ];

  const currentRoleData = roles.find((r) => r.id === activeRole) || roles[0];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Huawei-Style Ethereal Radial Glows */}
      <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden huawei-radial-glow">
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      {/* Apple-Style Minimalist Floating Navigation */}
      <header className="sticky top-0 z-50 apple-glass border-b border-border/50 transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand (Huawei Corporate Clean Style) */}
          <div className="flex items-center py-1 select-none">
            <img
              src="/Hamko.png"
              alt="Hamko Cookware"
              className="h-10 sm:h-12 w-auto object-contain shrink-0"
            />
          </div>

          {/* Navigation Links (Features, Data, Roles) */}
          <nav className="hidden md:flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-4 py-1 text-xs font-medium backdrop-blur-md">
            <button
              onClick={() => document.getElementById("hero-preview")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Overview
            </button>
            <button
              onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById("metrics")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Data
            </button>
            <button
              onClick={() => document.getElementById("roles")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Roles
            </button>
          </nav>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              title="Toggle Language"
            >
              <Globe className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button
              onClick={() => navigate("login")}
              size="sm"
              className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium px-4 h-8 text-xs shadow-sm transition-all gap-1.5"
            >
              Sign In <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      {/* 1. Hero Section (Apple-Style Minimalist & Dynamic + Huawei Luminous Glow) */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur-xl shadow-xs mb-6">
              <Sparkles className="h-3.5 w-3.5 text-sky-500 animate-pulse" />
              <span>Next-Gen Enterprise Architecture · Powered by Advanced AI Technology</span>
            </div>

            {/* Apple-Style Clean, Large Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-[1.08] text-foreground">
              Precision Cookware{" "}
              <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Sales ERP
              </span>{" "}
              System.
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-muted-foreground text-balance max-w-2xl mx-auto font-normal leading-relaxed">
              Powered by Advanced AI Technology with smart pricing governance, real-time inventory deductions on delivery, automated credit ledgers, and intelligent field sales mobility.
            </p>

            {/* CTA Group */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button
                size="lg"
                onClick={() => navigate("signin")}
                className="h-11 px-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:scale-[1.02] transition-all gap-2 text-sm"
              >
                Access ERP Console <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
                className="h-11 px-7 rounded-full border-border/80 bg-background/60 backdrop-blur-md hover:bg-accent/80 font-medium text-sm transition-all"
              >
                Explore 9 Modules
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-500 stroke-[2.5]" /> Advanced AI Automation
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" /> Authorized Partner Network
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" /> Zero Ghost Stock
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" /> Bilingual EN/BN
              </span>
            </div>
          </div>

          {/* 3D-Style Floating App Dashboard Preview Mockup (Apple Glassmorphism + Depth) */}
          <div id="hero-preview" className="relative mt-16 lg:mt-24 mx-auto max-w-5xl">
            {/* Subtle Ethereal Halo behind Mockup (Huawei Style) */}
            <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-b from-sky-500/15 via-indigo-500/10 to-transparent blur-3xl opacity-70 pointer-events-none" />

            {/* Floating Glassmorphic Badge 1: Top Left */}
            <div className="hidden sm:flex absolute -top-5 -left-5 z-20 items-center gap-3 rounded-2xl apple-glass border border-border/70 p-3 shadow-xl animate-float-slow">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] font-bold text-foreground">Operational Status</p>
                </div>
                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">All Systems Nominal <span className="text-[10px] font-normal text-muted-foreground">live</span></p>
              </div>
            </div>

            {/* Floating Glassmorphic Badge 2: Bottom Right */}
            <div className="hidden sm:flex absolute -bottom-5 -right-5 z-20 items-center gap-3 rounded-2xl apple-glass border border-border/70 p-3 shadow-xl animate-float-delayed">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <p className="text-[11px] font-bold text-foreground">Instant Sync</p>
                </div>
                <p className="text-[10px] text-muted-foreground">AI-driven stock & ledger governance</p>
              </div>
            </div>

            {/* Floating Glassmorphic Badge 3: Top Right */}
            <div className="hidden lg:flex absolute top-10 -right-8 z-20 items-center gap-2.5 rounded-2xl apple-glass border border-border/70 px-3.5 py-2 shadow-xl animate-float-slow">
              <Building2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[11px] font-bold">Partner Network Active</p>
                <p className="text-[9px] text-muted-foreground">Regional Territory Hubs</p>
              </div>
            </div>

            {/* Realistic High-Res Mockup Window Frame */}
            <div className="relative rounded-[26px] border border-border/80 bg-card/95 shadow-[0_25px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.55)] overflow-hidden">
              {/* Window Chrome Header */}
              <div className="flex h-11 items-center justify-between border-b border-border/60 bg-muted/30 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3.5 py-1 text-[11px] font-mono text-muted-foreground">
                  <Lock className="h-3 w-3 text-emerald-500" />
                  <span>erp.hamkocookware.com/dashboard</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline text-muted-foreground text-[10px]">Cloud Synced</span>
                </div>
              </div>

              {/* Mock Dashboard Inner Body */}
              <div className="p-4 sm:p-6 bg-gradient-to-b from-card via-background to-background">
                {/* Internal Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight">Cookware Distribution Command</h3>
                    <p className="text-xs text-muted-foreground">Integrated datasets: Credit Summary, Pricing Governance & Invoicing</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-0.5 text-xs font-medium">
                      September 2026
                    </span>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Live
                    </span>
                  </div>
                </div>

                {/* 4 Metric Tiles */}
                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Fulfillment Velocity", value: "Optimal", change: "+18.4% Efficiency", color: "text-emerald-500", icon: Wallet },
                    { label: "Active Orders", value: "Processing", change: "Fulfillment on Schedule", color: "text-sky-500", icon: Package },
                    { label: "Collection Health", value: "Reconciled", change: "Standard Settlement Pace", color: "text-violet-500", icon: CheckCircle2 },
                    { label: "Account Governance", value: "Verified", change: "Zero Variance Detected", color: "text-amber-500", icon: Clock },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="rounded-2xl border border-border/70 bg-card/50 p-3.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground">{m.label}</span>
                          <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                        </div>
                        <p className="mt-1 text-base sm:text-lg font-bold tracking-tight">{m.value}</p>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {m.change}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Performance Chart & Recent Live Orders Feed */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Left: Monthly Trend Bar Chart */}
                  <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold">Performance Trajectory</p>
                        <p className="text-[10px] text-muted-foreground">Fulfillment Velocity vs Partner Collections</p>
                      </div>
                      <span className="text-xs font-extrabold text-primary">AI Monitored</span>
                    </div>

                    <div className="h-32 flex items-end gap-2 pt-4">
                      {[35, 52, 45, 68, 80, 62, 74, 91, 85, 78, 94, 88].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-sky-500 to-indigo-500 group-hover:from-sky-400 group-hover:to-indigo-400 transition-all"
                            style={{ height: `${h}%` }}
                          />
                          <span className="text-[9px] text-muted-foreground hidden sm:block">
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Recent Dealer Orders */}
                  <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold">Live Order Feed</p>
                      <span className="text-[10px] font-semibold text-emerald-500">Auto-Deducted</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { dealer: "Regional Distribution Partner", area: "Territory North", items: "Cookware Line Batch", status: "Delivered", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
                        { dealer: "Authorized Channel Partner", area: "Territory Central", items: "Kitchenware Line Batch", status: "Approved", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
                        { dealer: "Metro Channel Outlet", area: "Territory South", items: "Commercial Line Batch", status: "Processing", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs">
                          <div>
                            <p className="font-semibold text-[11px] leading-tight">{item.dealer}</p>
                            <p className="text-[10px] text-muted-foreground">{item.area} · {item.items}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${item.color}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Feature Modules & Cards (Huawei Enterprise Style: 9 Core Modules in 3-Column Grid) */}
      <section id="modules" className="py-20 lg:py-28 border-t border-border/60 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-semibold text-primary">
              Enterprise Architecture
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              9 Integrated Core ERP Modules
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Enhanced by Advanced AI Technology for regional cookware distribution with zero ghost stock, automated master ledgers, and intelligent field mobility.
            </p>
          </div>

          {/* 3-Column Interactive Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.title}
                  className="card-hover-elevation rounded-[24px] border border-border/70 bg-card/60 p-6 backdrop-blur-md shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Icon & Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} text-white shadow-sm`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {m.badge}
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <h3 className="text-base font-bold text-foreground">
                      {m.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {m.desc}
                    </p>

                    {/* Features Checklist */}
                    <ul className="mt-4 space-y-1.5 border-t border-border/50 pt-4">
                      {m.bullets.map((b, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-foreground/80 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>Module Active</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Dynamic Stats & Metrics Section (Apple-Inspired Rounded Squircle Badges) */}
      <section id="metrics" className="border-t border-border/60 bg-muted/20 py-16 lg:py-20 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Platform Excellence</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Enterprise-Grade Performance
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Real-time operational indicators reflecting active distribution nodes and automated operations across the network.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-[24px] border border-border/70 bg-card p-6 shadow-xs card-hover-elevation text-center"
                >
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight text-foreground">{s.value}</h3>
                  <p className="text-xs font-bold text-foreground/90 mt-1">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Interactive Role Showcase & Apple-Like CTA */}
      <section id="roles" className="border-t border-border/60 py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-semibold text-primary">
              Persona-Driven Workflows
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built for Every Team Member
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Click any role to see how Sales ERP Pro tailors views, authorizations, and operational speed.
            </p>
          </div>

          {/* Apple-Style Pill Switcher Tab Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {roles.map((r) => {
              const isSelected = activeRole === r.id;
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveRole(r.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-foreground text-background shadow-md shadow-foreground/10"
                      : "border border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Preview Card */}
          <div className="rounded-[28px] border border-border/80 bg-card p-6 sm:p-8 shadow-xl max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{currentRoleData.name} Console</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mt-0.5">{currentRoleData.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{currentRoleData.tagline}</p>
              </div>
              <Button size="sm" onClick={() => navigate("signin")} className="rounded-full gap-1.5 text-xs px-4">
                Open Workspace <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {/* Metrics Row */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {currentRoleData.previewStats.map((st, i) => (
                <div key={i} className="rounded-2xl border border-border/70 bg-muted/20 p-3.5 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground">{st.label}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{st.val}</p>
                  <p className="text-[10px] font-semibold text-primary mt-0.5">{st.sub}</p>
                </div>
              ))}
            </div>

            {/* Role Items Feed */}
            <div className="mt-5 rounded-2xl border border-border/70 bg-background/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold">{currentRoleData.previewHeadline}</p>
                <span className="text-[10px] font-semibold text-emerald-500">Live Status</span>
              </div>
              <div className="space-y-2">
                {currentRoleData.previewItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-xs text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.status}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">
                      {item.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="mt-5 pt-4 border-t border-border/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Role Scope & Authorization</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {currentRoleData.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-foreground/80">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sleek Apple-Like Dark/Gradient Bottom CTA Section */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="relative rounded-[32px] overflow-hidden border border-white/10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl">
              {/* Radial Luminous Arc (Huawei/Apple Keynote) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-sky-500/20 blur-3xl pointer-events-none rounded-full" />

              <div className="relative z-10 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-medium text-sky-300 mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  <span>Powered by Advanced AI Technology</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Ready to Streamline Your Distribution Network?
                </h2>

                <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                  Access live inventory synchronization, automated pricing governance, and intelligent master customer ledgers in one unified console.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate("signin")}
                    className="h-11 px-8 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-bold shadow-[0_0_30px_rgba(56,189,248,0.35)] hover:scale-105 transition-all gap-2 text-sm"
                  >
                    Open Sales ERP Console <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="h-11 px-8 rounded-full border-white/20 bg-white/5 hover:bg-white/15 text-white font-medium text-sm transition-all"
                  >
                    Back to Top
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
                  <span>⚡ 99.99% Uptime</span>
                  <span>🔒 Enterprise Security</span>
                  <span>🤖 AI Smart Automation</span>
                  <span>📊 Real-Time Sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Clean Footer (Apple Minimalist Style) */}
      <footer className="border-t border-border/50 bg-background/50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 select-none">
              <img src="/Hamko.png" alt="Hamko" className="h-5 sm:h-6 w-auto object-contain shrink-0" />
              <p className="leading-none">© 2026 Sales ERP Pro · Hamko Industries Ltd. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <button onClick={() => navigate("signin")} className="hover:text-foreground transition cursor-pointer leading-none">Console Access</button>
              <span className="text-border select-none">·</span>
              <button onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition cursor-pointer leading-none">Features</button>
              <span className="text-border select-none">·</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-500 font-semibold leading-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
