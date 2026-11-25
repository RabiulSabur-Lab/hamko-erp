import { useState, useMemo } from "react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "@/router";
import { Button } from "@/components/ui/button";
import {
  Moon, Sun, Globe, ArrowRight, BarChart3, Users, Package,
  Warehouse, Wallet, MapPin, ShieldCheck, TrendingUp,
  CheckCircle2, Sparkles, RefreshCw, Activity,
  ChevronRight, Building2, FileSpreadsheet, Lock, Clock,
  ShoppingCart, Check,
} from "lucide-react";

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { navigate } = useRouter();
  const [activeRole, setActiveRole] = useState<"admin" | "manager" | "officer" | "distributor" | "accountant">("admin");

  // 9 Core ERP Modules (Fully Localized EN / BN)
  const modules = useMemo(
    () => [
      {
        icon: BarChart3,
        title: t("landing.mod.1.title"),
        desc: t("landing.mod.1.desc"),
        badge: t("landing.mod.1.badge"),
        color: "from-sky-500 to-blue-600",
        bullets: [t("landing.mod.1.b1"), t("landing.mod.1.b2"), t("landing.mod.1.b3")],
      },
      {
        icon: Users,
        title: t("landing.mod.2.title"),
        desc: t("landing.mod.2.desc"),
        badge: t("landing.mod.2.badge"),
        color: "from-emerald-500 to-teal-600",
        bullets: [t("landing.mod.2.b1"), t("landing.mod.2.b2"), t("landing.mod.2.b3")],
      },
      {
        icon: Package,
        title: t("landing.mod.3.title"),
        desc: t("landing.mod.3.desc"),
        badge: t("landing.mod.3.badge"),
        color: "from-amber-500 to-orange-600",
        bullets: [t("landing.mod.3.b1"), t("landing.mod.3.b2"), t("landing.mod.3.b3")],
      },
      {
        icon: Warehouse,
        title: t("landing.mod.4.title"),
        desc: t("landing.mod.4.desc"),
        badge: t("landing.mod.4.badge"),
        color: "from-violet-500 to-purple-600",
        bullets: [t("landing.mod.4.b1"), t("landing.mod.4.b2"), t("landing.mod.4.b3")],
      },
      {
        icon: ShoppingCart,
        title: t("landing.mod.5.title"),
        desc: t("landing.mod.5.desc"),
        badge: t("landing.mod.5.badge"),
        color: "from-blue-500 to-indigo-600",
        bullets: [t("landing.mod.5.b1"), t("landing.mod.5.b2"), t("landing.mod.5.b3")],
      },
      {
        icon: Wallet,
        title: t("landing.mod.6.title"),
        desc: t("landing.mod.6.desc"),
        badge: t("landing.mod.6.badge"),
        color: "from-rose-500 to-pink-600",
        bullets: [t("landing.mod.6.b1"), t("landing.mod.6.b2"), t("landing.mod.6.b3")],
      },
      {
        icon: MapPin,
        title: t("landing.mod.7.title"),
        desc: t("landing.mod.7.desc"),
        badge: t("landing.mod.7.badge"),
        color: "from-cyan-500 to-blue-600",
        bullets: [t("landing.mod.7.b1"), t("landing.mod.7.b2"), t("landing.mod.7.b3")],
      },
      {
        icon: FileSpreadsheet,
        title: t("landing.mod.8.title"),
        desc: t("landing.mod.8.desc"),
        badge: t("landing.mod.8.badge"),
        color: "from-teal-500 to-emerald-600",
        bullets: [t("landing.mod.8.b1"), t("landing.mod.8.b2"), t("landing.mod.8.b3")],
      },
      {
        icon: TrendingUp,
        title: t("landing.mod.9.title"),
        desc: t("landing.mod.9.desc"),
        badge: t("landing.mod.9.badge"),
        color: "from-indigo-500 to-violet-600",
        bullets: [t("landing.mod.9.b1"), t("landing.mod.9.b2"), t("landing.mod.9.b3")],
      },
    ],
    [t],
  );

  // Enterprise Counter Badges
  const stats = useMemo(
    () => [
      { value: t("landing.stat.1.val"), label: t("landing.stat.1.label"), note: t("landing.stat.1.note"), icon: Package },
      { value: t("landing.stat.2.val"), label: t("landing.stat.2.label"), note: t("landing.stat.2.note"), icon: Users },
      { value: t("landing.stat.3.val"), label: t("landing.stat.3.label"), note: t("landing.stat.3.note"), icon: Wallet },
      { value: t("landing.stat.4.val"), label: t("landing.stat.4.label"), note: t("landing.stat.4.note"), icon: ShieldCheck },
    ],
    [t],
  );

  // Interactive Role Showcase Data
  const roles = useMemo(
    () => [
      {
        id: "admin" as const,
        name: t("landing.role.admin.name"),
        title: t("landing.role.admin.title"),
        tagline: t("landing.role.admin.tagline"),
        icon: ShieldCheck,
        features: [t("landing.role.admin.f1"), t("landing.role.admin.f2"), t("landing.role.admin.f3")],
        previewStats: [
          { label: t("landing.role.admin.s1Label"), val: t("landing.role.admin.s1Val"), sub: t("landing.role.admin.s1Sub") },
          { label: t("landing.role.admin.s2Label"), val: t("landing.role.admin.s2Val"), sub: t("landing.role.admin.s2Sub") },
          { label: t("landing.role.admin.s3Label"), val: t("landing.role.admin.s3Val"), sub: t("landing.role.admin.s3Sub") },
        ],
        previewHeadline: t("landing.role.admin.headline"),
        previewItems: [
          { title: t("landing.role.admin.i1Title"), status: t("landing.role.admin.i1Status"), badge: t("landing.role.admin.i1Badge") },
          { title: t("landing.role.admin.i2Title"), status: t("landing.role.admin.i2Status"), badge: t("landing.role.admin.i2Badge") },
          { title: t("landing.role.admin.i3Title"), status: t("landing.role.admin.i3Status"), badge: t("landing.role.admin.i3Badge") },
        ],
      },
      {
        id: "manager" as const,
        name: t("landing.role.manager.name"),
        title: t("landing.role.manager.title"),
        tagline: t("landing.role.manager.tagline"),
        icon: TrendingUp,
        features: [t("landing.role.manager.f1"), t("landing.role.manager.f2"), t("landing.role.manager.f3")],
        previewStats: [
          { label: t("landing.role.manager.s1Label"), val: t("landing.role.manager.s1Val"), sub: t("landing.role.manager.s1Sub") },
          { label: t("landing.role.manager.s2Label"), val: t("landing.role.manager.s2Val"), sub: t("landing.role.manager.s2Sub") },
          { label: t("landing.role.manager.s3Label"), val: t("landing.role.manager.s3Val"), sub: t("landing.role.manager.s3Sub") },
        ],
        previewHeadline: t("landing.role.manager.headline"),
        previewItems: [
          { title: t("landing.role.manager.i1Title"), status: t("landing.role.manager.i1Status"), badge: t("landing.role.manager.i1Badge") },
          { title: t("landing.role.manager.i2Title"), status: t("landing.role.manager.i2Status"), badge: t("landing.role.manager.i2Badge") },
          { title: t("landing.role.manager.i3Title"), status: t("landing.role.manager.i3Status"), badge: t("landing.role.manager.i3Badge") },
        ],
      },
      {
        id: "officer" as const,
        name: t("landing.role.officer.name"),
        title: t("landing.role.officer.title"),
        tagline: t("landing.role.officer.tagline"),
        icon: MapPin,
        features: [t("landing.role.officer.f1"), t("landing.role.officer.f2"), t("landing.role.officer.f3")],
        previewStats: [
          { label: t("landing.role.officer.s1Label"), val: t("landing.role.officer.s1Val"), sub: t("landing.role.officer.s1Sub") },
          { label: t("landing.role.officer.s2Label"), val: t("landing.role.officer.s2Val"), sub: t("landing.role.officer.s2Sub") },
          { label: t("landing.role.officer.s3Label"), val: t("landing.role.officer.s3Val"), sub: t("landing.role.officer.s3Sub") },
        ],
        previewHeadline: t("landing.role.officer.headline"),
        previewItems: [
          { title: t("landing.role.officer.i1Title"), status: t("landing.role.officer.i1Status"), badge: t("landing.role.officer.i1Badge") },
          { title: t("landing.role.officer.i2Title"), status: t("landing.role.officer.i2Status"), badge: t("landing.role.officer.i2Badge") },
          { title: t("landing.role.officer.i3Title"), status: t("landing.role.officer.i3Status"), badge: t("landing.role.officer.i3Badge") },
        ],
      },
      {
        id: "distributor" as const,
        name: t("landing.role.distributor.name"),
        title: t("landing.role.distributor.title"),
        tagline: t("landing.role.distributor.tagline"),
        icon: Package,
        features: [t("landing.role.distributor.f1"), t("landing.role.distributor.f2"), t("landing.role.distributor.f3")],
        previewStats: [
          { label: t("landing.role.distributor.s1Label"), val: t("landing.role.distributor.s1Val"), sub: t("landing.role.distributor.s1Sub") },
          { label: t("landing.role.distributor.s2Label"), val: t("landing.role.distributor.s2Val"), sub: t("landing.role.distributor.s2Sub") },
          { label: t("landing.role.distributor.s3Label"), val: t("landing.role.distributor.s3Val"), sub: t("landing.role.distributor.s3Sub") },
        ],
        previewHeadline: t("landing.role.distributor.headline"),
        previewItems: [
          { title: t("landing.role.distributor.i1Title"), status: t("landing.role.distributor.i1Status"), badge: t("landing.role.distributor.i1Badge") },
          { title: t("landing.role.distributor.i2Title"), status: t("landing.role.distributor.i2Status"), badge: t("landing.role.distributor.i2Badge") },
          { title: t("landing.role.distributor.i3Title"), status: t("landing.role.distributor.i3Status"), badge: t("landing.role.distributor.i3Badge") },
        ],
      },
      {
        id: "accountant" as const,
        name: t("landing.role.accountant.name"),
        title: t("landing.role.accountant.title"),
        tagline: t("landing.role.accountant.tagline"),
        icon: Wallet,
        features: [t("landing.role.accountant.f1"), t("landing.role.accountant.f2"), t("landing.role.accountant.f3")],
        previewStats: [
          { label: t("landing.role.accountant.s1Label"), val: t("landing.role.accountant.s1Val"), sub: t("landing.role.accountant.s1Sub") },
          { label: t("landing.role.accountant.s2Label"), val: t("landing.role.accountant.s2Val"), sub: t("landing.role.accountant.s2Sub") },
          { label: t("landing.role.accountant.s3Label"), val: t("landing.role.accountant.s3Val"), sub: t("landing.role.accountant.s3Sub") },
        ],
        previewHeadline: t("landing.role.accountant.headline"),
        previewItems: [
          { title: t("landing.role.accountant.i1Title"), status: t("landing.role.accountant.i1Status"), badge: t("landing.role.accountant.i1Badge") },
          { title: t("landing.role.accountant.i2Title"), status: t("landing.role.accountant.i2Status"), badge: t("landing.role.accountant.i2Badge") },
          { title: t("landing.role.accountant.i3Title"), status: t("landing.role.accountant.i3Status"), badge: t("landing.role.accountant.i3Badge") },
        ],
      },
    ],
    [t],
  );

  const previewMetrics = useMemo(
    () => [
      { label: t("landing.preview.m1Label"), value: t("landing.preview.m1Val"), change: t("landing.preview.m1Change"), color: "text-emerald-500", icon: Wallet },
      { label: t("landing.preview.m2Label"), value: t("landing.preview.m2Val"), change: t("landing.preview.m2Change"), color: "text-sky-500", icon: Package },
      { label: t("landing.preview.m3Label"), value: t("landing.preview.m3Val"), change: t("landing.preview.m3Change"), color: "text-violet-500", icon: CheckCircle2 },
      { label: t("landing.preview.m4Label"), value: t("landing.preview.m4Val"), change: t("landing.preview.m4Change"), color: "text-amber-500", icon: Clock },
    ],
    [t],
  );

  const previewMonths = useMemo(() => t("landing.preview.months").split(","), [t]);

  const previewFeed = useMemo(
    () => [
      {
        dealer: t("landing.preview.feed1Dealer"),
        meta: t("landing.preview.feed1Meta"),
        status: t("landing.preview.feed1Status"),
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      },
      {
        dealer: t("landing.preview.feed2Dealer"),
        meta: t("landing.preview.feed2Meta"),
        status: t("landing.preview.feed2Status"),
        color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      },
      {
        dealer: t("landing.preview.feed3Dealer"),
        meta: t("landing.preview.feed3Meta"),
        status: t("landing.preview.feed3Status"),
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      },
    ],
    [t],
  );

  const currentRoleData = roles.find((r) => r.id === activeRole) || roles[0];

  return (
    <div className="relative isolate min-h-screen overflow-x-clip landing-light-canvas dark:bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Light Mode: Subtle Modern Dot-Grid & Soft Ambient Radial Mesh Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden dark:hidden" aria-hidden="true">
        <div className="absolute inset-0 landing-light-dots" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[440px] w-[860px] rounded-full bg-gradient-to-b from-sky-200/45 via-blue-100/30 to-transparent blur-3xl" />
        <div className="absolute top-[22%] -left-24 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute top-[16%] -right-24 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      {/* Dark Mode: Preserved Huawei-Style Ethereal Radial Glows */}
      <div className="hidden dark:block fixed inset-0 -z-50 pointer-events-none overflow-hidden huawei-radial-glow" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      {/* Apple-Style Minimalist Floating Navigation */}
      <header className="sticky top-0 z-50 apple-glass border-b border-slate-200/75 dark:border-border/50 transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center py-1 select-none">
            <img
              src="/Hamko.png"
              alt="Hamko Cookware"
              className="h-10 sm:h-12 w-auto object-contain shrink-0"
            />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-4 py-1 text-xs font-medium backdrop-blur-md">
            <button
              onClick={() => document.getElementById("hero-preview")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {t("landing.nav.overview")}
            </button>
            <button
              onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {t("landing.nav.features")}
            </button>
            <button
              onClick={() => document.getElementById("metrics")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {t("landing.nav.data")}
            </button>
            <button
              onClick={() => document.getElementById("roles")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {t("landing.nav.roles")}
            </button>
          </nav>

          {/* Action Controls (Visible EN/BN Pill Switcher + Theme + Sign In) */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
              className="h-8 rounded-full border-slate-200/80 dark:border-white/15 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md px-3 text-xs font-semibold text-foreground hover:bg-white/90 dark:hover:bg-slate-800/80 gap-1.5 transition-all"
              title={t("landing.nav.toggleLangTitle")}
              aria-label={t("landing.nav.toggleLangTitle")}
            >
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>{lang === "en" ? "বাংলা" : "EN"}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              title={t("landing.nav.toggleThemeTitle")}
              aria-label={t("landing.nav.toggleThemeTitle")}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button
              onClick={() => navigate("login")}
              size="sm"
              className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium px-4 h-8 text-xs shadow-sm transition-all gap-1.5"
            >
              {t("landing.nav.signIn")} <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="relative z-10 pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/85 px-3.5 py-1 text-xs font-medium text-slate-700 dark:border-border/80 dark:bg-muted/40 dark:text-muted-foreground backdrop-blur-xl shadow-xs mb-6">
              <Sparkles className="h-3.5 w-3.5 text-sky-500 animate-pulse shrink-0" />
              <span>{t("landing.hero.badge")}</span>
            </div>

            {/* Clean, Large Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-[1.12] text-foreground">
              {t("landing.hero.titlePrefix")}{" "}
              <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {t("landing.hero.titleHighlight")}
              </span>{" "}
              {t("landing.hero.titleSuffix")}
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-muted-foreground text-balance max-w-2xl mx-auto font-normal leading-relaxed">
              {t("landing.hero.subtitle")}
            </p>

            {/* CTA Group */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button
                size="lg"
                onClick={() => navigate("signin")}
                className="h-11 px-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:scale-[1.02] transition-all gap-2 text-sm"
              >
                {t("landing.hero.ctaPrimary")} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
                className="h-11 px-7 rounded-full border-slate-300/85 bg-white/85 text-slate-800 hover:bg-white shadow-xs dark:border-border/80 dark:bg-background/60 dark:text-foreground dark:hover:bg-accent/80 backdrop-blur-md font-medium text-sm transition-all"
              >
                {t("landing.hero.ctaSecondary")}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-500 stroke-[2.5]" /> {t("landing.hero.trust1")}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" /> {t("landing.hero.trust2")}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" /> {t("landing.hero.trust3")}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" /> {t("landing.hero.trust4")}
              </span>
            </div>
          </div>

          {/* 3D-Style Floating App Dashboard Preview Mockup */}
          <div id="hero-preview" className="relative mt-16 lg:mt-24 mx-auto max-w-5xl">
            {/* Subtle Ethereal Halo behind Mockup */}
            <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-b from-sky-500/15 via-indigo-500/10 to-transparent blur-3xl opacity-70 pointer-events-none" />

            {/* Floating Glassmorphic Badge 1: Top Left */}
            <div className="hidden sm:flex absolute -top-5 -left-5 z-20 items-center gap-3 rounded-2xl apple-glass border border-border/70 p-3 shadow-xl animate-float-slow">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] font-bold text-foreground">{t("landing.preview.badge1Title")}</p>
                </div>
                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  {t("landing.preview.badge1Val")}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">{t("landing.preview.badge1Sub")}</span>
                </p>
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
                  <p className="text-[11px] font-bold text-foreground">{t("landing.preview.badge2Title")}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("landing.preview.badge2Sub")}</p>
              </div>
            </div>

            {/* Floating Glassmorphic Badge 3: Top Right */}
            <div className="hidden lg:flex absolute top-10 -right-8 z-20 items-center gap-2.5 rounded-2xl apple-glass border border-border/70 px-3.5 py-2 shadow-xl animate-float-slow">
              <Building2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[11px] font-bold">{t("landing.preview.badge3Title")}</p>
                <p className="text-[9px] text-muted-foreground">{t("landing.preview.badge3Sub")}</p>
              </div>
            </div>

            {/* Realistic High-Res Mockup Window Frame */}
            <div className="relative rounded-[26px] border border-slate-200/90 dark:border-border/80 bg-white/95 dark:bg-card/95 shadow-[0_25px_65px_-12px_rgba(15,23,42,0.12)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.55)] overflow-hidden">
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
                  <span className="hidden sm:inline text-muted-foreground text-[10px]">{t("landing.preview.cloudSynced")}</span>
                </div>
              </div>

              {/* Mock Dashboard Inner Body */}
              <div className="p-4 sm:p-6 bg-gradient-to-b from-card via-background to-background">
                {/* Internal Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight">{t("landing.preview.cmdTitle")}</h3>
                    <p className="text-xs text-muted-foreground">{t("landing.preview.cmdSub")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-0.5 text-xs font-medium">
                      {t("landing.preview.period")}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {t("landing.preview.live")}
                    </span>
                  </div>
                </div>

                {/* 4 Metric Tiles */}
                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {previewMetrics.map((m) => {
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
                        <p className="text-xs font-bold">{t("landing.preview.chartTitle")}</p>
                        <p className="text-[10px] text-muted-foreground">{t("landing.preview.chartSub")}</p>
                      </div>
                      <span className="text-xs font-extrabold text-primary">{t("landing.preview.aiMonitored")}</span>
                    </div>

                    <div className="h-32 flex items-end gap-2 pt-4">
                      {[35, 52, 45, 68, 80, 62, 74, 91, 85, 78, 94, 88].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-sky-500 to-indigo-500 group-hover:from-sky-400 group-hover:to-indigo-400 transition-all"
                            style={{ height: `${h}%` }}
                          />
                          <span className="text-[9px] text-muted-foreground hidden sm:block">
                            {previewMonths[i] ?? ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Recent Dealer Orders */}
                  <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold">{t("landing.preview.feedTitle")}</p>
                      <span className="text-[10px] font-semibold text-emerald-500">{t("landing.preview.autoDeducted")}</span>
                    </div>
                    <div className="space-y-2">
                      {previewFeed.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-[11px] leading-tight truncate">{item.dealer}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.meta}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold shrink-0 ${item.color}`}>
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

      {/* 2. Feature Modules & Cards (9 Core Modules in 3-Column Grid) */}
      <section id="modules" className="relative z-10 py-20 lg:py-28 border-t border-slate-200/75 dark:border-border/60 bg-gradient-to-b from-white/75 via-slate-50/70 to-indigo-50/25 dark:bg-none">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-semibold text-primary">
              {t("landing.modules.eyebrow")}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t("landing.modules.title")}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-muted-foreground leading-relaxed">
              {t("landing.modules.subtitle")}
            </p>
          </div>

          {/* 3-Column Interactive Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m, modIdx) => {
              const Icon = m.icon;
              return (
                <div
                  key={modIdx}
                  className="card-hover-elevation rounded-[24px] border border-slate-200/85 dark:border-border/70 bg-white/85 dark:bg-card/60 p-6 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_32px_-8px_rgba(15,23,42,0.10)] hover:border-sky-300/70 dark:shadow-xs dark:hover:shadow-none dark:hover:border-border/70 flex flex-col justify-between"
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
                    <span>{t("landing.modules.statusActive")}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Dynamic Stats & Metrics Section */}
      <section id="metrics" className="relative z-10 border-t border-slate-200/75 dark:border-border/60 bg-gradient-to-b from-slate-100/70 via-sky-50/40 to-slate-100/55 dark:bg-none dark:bg-muted/20 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">{t("landing.metrics.eyebrow")}</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t("landing.metrics.title")}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-muted-foreground">
              {t("landing.metrics.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className="rounded-[24px] border border-slate-200/85 dark:border-border/70 bg-white/90 dark:bg-card p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] dark:shadow-xs card-hover-elevation text-center"
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

      {/* 4. Interactive Role Showcase & Bottom Keynote CTA */}
      <section id="roles" className="relative z-10 border-t border-slate-200/75 dark:border-border/60 bg-gradient-to-b from-white/75 via-slate-50/65 to-sky-50/30 dark:bg-none py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-semibold text-primary">
              {t("landing.roles.eyebrow")}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t("landing.roles.title")}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-muted-foreground">
              {t("landing.roles.subtitle")}
            </p>
          </div>

          {/* Pill Switcher Tab Bar */}
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
                      : "border border-slate-200/90 bg-white/85 text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs dark:border-border/70 dark:bg-card/60 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-card"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Preview Card */}
          <div className="rounded-[28px] border border-slate-200/90 dark:border-border/80 bg-white/95 dark:bg-card p-6 sm:p-8 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)] dark:shadow-xl max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {currentRoleData.name} {t("landing.roles.consoleSuffix")}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mt-0.5">{currentRoleData.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{currentRoleData.tagline}</p>
              </div>
              <Button size="sm" onClick={() => navigate("signin")} className="rounded-full gap-1.5 text-xs px-4 shrink-0">
                {t("landing.roles.openWorkspace")} <ArrowRight className="h-3 w-3" />
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
                <span className="text-[10px] font-semibold text-emerald-500">{t("landing.roles.liveStatus")}</span>
              </div>
              <div className="space-y-2">
                {currentRoleData.previewItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-2.5 text-xs gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.status}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary shrink-0">
                      {item.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="mt-5 pt-4 border-t border-border/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {t("landing.roles.scopeHeading")}
              </p>
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

          {/* Sleek Dark/Gradient Bottom CTA Section */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="relative rounded-[32px] overflow-hidden border border-white/10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl">
              {/* Radial Luminous Arc */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-sky-500/20 blur-3xl pointer-events-none rounded-full" />

              <div className="relative z-10 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-medium text-sky-300 mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  <span>{t("landing.cta.badge")}</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {t("landing.cta.title")}
                </h2>

                <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                  {t("landing.cta.subtitle")}
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate("signin")}
                    className="h-11 px-8 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-bold shadow-[0_0_30px_rgba(56,189,248,0.35)] hover:scale-105 transition-all gap-2 text-sm"
                  >
                    {t("landing.cta.primary")} <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="h-11 px-8 rounded-full border-white/20 bg-white/5 hover:bg-white/15 text-white font-medium text-sm transition-all"
                  >
                    {t("landing.cta.secondary")}
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
                  <span>{t("landing.cta.pill1")}</span>
                  <span>{t("landing.cta.pill2")}</span>
                  <span>{t("landing.cta.pill3")}</span>
                  <span>{t("landing.cta.pill4")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Clean Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 dark:border-border/50 bg-white/80 dark:bg-background/50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 select-none">
              <img src="/Hamko.png" alt="Hamko" className="h-5 sm:h-6 w-auto object-contain shrink-0" />
              <p className="leading-none">{t("landing.footer.copyright")}</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <button onClick={() => navigate("signin")} className="hover:text-foreground transition cursor-pointer leading-none">
                {t("landing.footer.consoleAccess")}
              </button>
              <span className="text-border select-none">·</span>
              <button onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition cursor-pointer leading-none">
                {t("landing.footer.features")}
              </button>
              <span className="text-border select-none">·</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-500 font-semibold leading-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("landing.footer.operational")}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
