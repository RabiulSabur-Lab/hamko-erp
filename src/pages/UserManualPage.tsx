import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Download,
  Printer,
  Search,
  Globe,
  Cloud,
  ShieldCheck,
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  Warehouse,
  Wallet,
  MapPin,
  BarChart3,
  UserCog,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  RefreshCw,
  ArrowRight,
  FileSpreadsheet,
  Bell,
  Lock,
} from "lucide-react";

type ManualLangMode = "bilingual" | "en" | "bn";

interface CalloutItem {
  num: string;
  labelEn: string;
  labelBn: string;
  descEn: string;
  descBn: string;
}

interface StepItem {
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
}

interface ManualSection {
  id: string;
  number: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  icon: any;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  routeHint: string;
  overviewEn: string;
  overviewBn: string;
  callouts: CalloutItem[];
  steps: StepItem[];
  tipEn: string;
  tipBn: string;
  warningEn?: string;
  warningBn?: string;
  mockupType:
    | "cloud"
    | "auth"
    | "dashboard"
    | "crm"
    | "products"
    | "orders"
    | "procurement"
    | "inventory"
    | "accounts"
    | "sfa"
    | "reports"
    | "users"
    | "troubleshooting";
}

const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "overview-cloud-sync",
    number: "01",
    titleEn: "System Overview & 100% Live Cloud Sync",
    titleBn: "সিস্টেম পরিচিতি ও ১০০% লাইভ ক্লাউড সিঙ্ক",
    subtitleEn: "Real-Time 19-Table Supabase CDC & Local-First Resilience",
    subtitleBn: "১৯টি টেবিলে রিয়েল-টাইম ক্লাউড সিঙ্ক ও মাল্টি-ডিভাইস ডেটা সুরক্ষা",
    icon: Cloud,
    colorClass: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-500/10",
    borderClass: "border-sky-500/30",
    routeHint: "/#/dashboard",
    overviewEn:
      "Hamko Sales ERP is a high-performance distribution & sales management platform engineered with a Dual-Write (Local Cache + Sanitized Supabase Cloud) architecture across 19 operational tables. Every action made on a PC, laptop, or mobile browser is immediately broadcast to all connected devices.",
    overviewBn:
      "হামকো সেলস ইআরপি (Hamko Sales ERP) হলো একটি আধুনিক ডিস্ট্রিবিউশন ও সেলস ম্যানেজমেন্ট সফটওয়্যার, যা ১৯টি অপারেশনাল ডেটাবেস টেবিলের সাথে ডুয়াল-রাইট (লোকাল ক্যাশ + সুপাবেস ক্লাউড) প্রযুক্তিতে কাজ করে। পিসি, ল্যাপটপ বা মোবাইল থেকে যেকোনো এন্ট্রি করার সাথে সাথে তা স্বয়ংক্রিয়ভাবে সকল ডিভাইসে আপডেট হয়ে যায়।",
    callouts: [
      {
        num: "①",
        labelEn: "Live Sync Button",
        labelBn: "লাইভ সিঙ্ক বাটন",
        descEn: "Forces an immediate bidirectional cloud pull & push across all 19 tables.",
        descBn: "যেকোনো পেজের উপরে থাকা Live Sync বাটনে ক্লিক করলে ১৯টি টেবিলের সর্বশেষ ক্লাউড ডেটা তাৎক্ষণিক সিঙ্ক হয়।",
      },
      {
        num: "②",
        labelEn: "Language Switcher (EN / বাং)",
        labelBn: "ভাষা পরিবর্তন (EN / বাং)",
        descEn: "Toggles the entire ERP interface between English and Bengali instantly.",
        descBn: "উপরের হেডার বার থেকে এক ক্লিকেই পুরো সফটওয়্যারের ভাষা ইংরেজি (EN) অথবা বাংলা (বাং)-তে পরিবর্তন করা যায়।",
      },
      {
        num: "③",
        labelEn: "Realtime CDC Status",
        labelBn: "রিয়েল-টাইম ক্লাউড স্ট্যাটাস",
        descEn: "Streams Postgres changes live without requiring manual page reloads.",
        descBn: "পেজ রিলোড ছাড়াই নতুন অর্ডার, কালেকশন ও স্টক আপডেট তাৎক্ষণিকভাবে স্ক্রিনে প্রদর্শন করে।",
      },
    ],
    steps: [
      {
        titleEn: "Automatic Cold-Start Hydration",
        titleBn: "তাৎক্ষণিক পেজ লোডিং ও ক্যাশ হাইড্রেশন",
        descEn: "Pages load instantaneously from the verified local cache while synchronizing fresh cloud state in the background.",
        descBn: "অ্যাপ ওপেন করার সাথে সাথেই ডেটা প্রদর্শিত হয় এবং ব্যাকগ্রাউন্ডে ক্লাউড সার্ভার থেকে সর্বশেষ তথ্য যাচাই করে নেয়।",
      },
      {
        titleEn: "Strict RFC 4122 UUID & Schema Resilience",
        titleBn: "স্বয়ংক্রিয় ডেটা ভ্যালিডেশন ও স্কিমা সুরক্ষা",
        descEn: "All primary and foreign keys use strict UUIDs with automatic payload sanitization to prevent database type errors.",
        descBn: "প্রতিটি রেকর্ড সংরক্ষণের সময় স্বয়ংক্রিয়ভাবে UUID ও ডেটা ফরম্যাট যাচাই করা হয়, ফলে ডেটাবেস এরর হওয়ার কোনো ঝুঁকি থাকে না।",
      },
    ],
    tipEn: "Click the 'Live Sync' or 'Refresh' button whenever switching between office PC and mobile field view to confirm up-to-the-second totals.",
    tipBn: "অফিস পিসি এবং মোবাইলের মধ্যে কাজের সমন্বয় নিশ্চিত করতে যেকোনো পেজের উপরে থাকা 'Live Sync' বা 'Refresh' বাটন ব্যবহার করুন।",
    mockupType: "cloud",
  },
  {
    id: "auth-roles",
    number: "02",
    titleEn: "Authentication & Role Permissions",
    titleBn: "লগইন ও ইউজার রোল ব্যবস্থাপনা",
    subtitleEn: "Role-Based Access Control (RBAC) for 5 Operational Roles",
    subtitleBn: "৫টি প্রাতিষ্ঠানিক রোলের জন্য নিরাপদ অ্যাক্সেস কন্ট্রোল ও পারমিশন",
    icon: ShieldCheck,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/30",
    routeHint: "/#/login",
    overviewEn:
      "Access to Hamko Sales ERP is strictly governed by Role-Based Access Control (RBAC). Accounts are provisioned by the Super Admin, ensuring field officers and administrative staff only access modules authorized for their responsibilities.",
    overviewBn:
      "হামকো সেলস ইআরপি-তে প্রতিটি ব্যবহারকারীর দায়িত্ব অনুযায়ী নির্দিষ্ট মডিউল অ্যাক্সেস নির্ধারিত থাকে। শুধুমাত্র সুপার অ্যাডমিন নতুন ইউজার অ্যাকাউন্ট তৈরি ও রোল নির্ধারণ করতে পারেন।",
    callouts: [
      {
        num: "①",
        labelEn: "Email & Password Sign-In",
        labelBn: "ইমেইল ও পাসওয়ার্ড লগইন",
        descEn: "Enter your authorized company email and minimum 6-character password.",
        descBn: "আপনার নিবন্ধিত ইমেইল এবং ন্যূনতম ৬ অক্ষরের পাসওয়ার্ড দিয়ে নিরাপদে সাইন-ইন করুন।",
      },
      {
        num: "②",
        labelEn: "Password Recovery (Email & SMS OTP)",
        labelBn: "পাসওয়ার্ড রিকভারি (ইমেইল ও এসএমএস ওটিপি)",
        descEn: "Use 'Forgot Password?' on the login screen to reset credentials via email link or 6-digit mobile OTP.",
        descBn: "পাসওয়ার্ড ভুলে গেলে লগইন পেজের 'Forgot Password?' অপশন থেকে ইমেইল লিংক বা মোবাইল OTP দিয়ে নতুন পাসওয়ার্ড সেট করুন।",
      },
      {
        num: "③",
        labelEn: "Role Permission Matrix",
        labelBn: "রোল অনুযায়ী মডিউল পারমিশন",
        descEn: "Super Admin has full 100% access; Sales Officers are scoped to field sales, CRM, collections, and SFA.",
        descBn: "সুপার অ্যাডমিন সকল মডিউল নিয়ন্ত্রণ করেন; সেলস অফিসারগণ অর্ডার, কাস্টমার, কালেকশন ও ভিজিট মডিউলে কাজ করেন।",
      },
    ],
    steps: [
      {
        titleEn: "Super Admin (সুপার অ্যাডমিন)",
        titleBn: "সুপার অ্যাডমিন (Super Admin)",
        descEn: "Full administrative access across all modules including Procurement, Financial Reports, and User Management.",
        descBn: "ড্যাশবোর্ড, প্রকিউরমেন্ট, ফিন্যান্সিয়াল রিপোর্ট ও ইউজার ম্যানেজমেন্টসহ সম্পূর্ণ সিস্টেমের ১০০% নিয়ন্ত্রণ।",
      },
      {
        titleEn: "Sales Manager & Accountant (সেলস ম্যানেজার ও অ্যাকাউন্ট্যান্ট)",
        titleBn: "সেলস ম্যানেজার ও হিসাবরক্ষক (Sales Manager & Accountant)",
        descEn: "Supervises order approvals, sales targets, territory performance, cash collections, expenses, and daily cash book.",
        descBn: "অর্ডার অনুমোদন, সেলস টার্গেট, কালেকশন যাচাই, খরচ এন্ট্রি এবং দৈনিক ক্যাশ বুক ও লেজার পরিচালনা।",
      },
      {
        titleEn: "Sales Officer & Distributor (সেলস অফিসার ও ডিস্ট্রিবিউটর)",
        titleBn: "সেলস অফিসার ও ডিস্ট্রিবিউটর (Sales Officer & Distributor)",
        descEn: "Creates field sales orders, logs customer shop visits, records cash collections, and performs day-end cash handovers.",
        descBn: "মাঠ পর্যায়ে নতুন অর্ডার তৈরি, দোকান ভিজিট লগ, নগদ কালেকশন এন্ট্রি এবং দিনশেষে ক্যাশ হ্যান্ডওভার সম্পন্ন করা।",
      },
    ],
    tipEn: "For security, public self-signup is disabled. Contact your Super Admin to provision new staff accounts.",
    tipBn: "নিরাপত্তার স্বার্থে পাবলিক সাইন-আপ বন্ধ রাখা হয়েছে। নতুন অ্যাকাউন্টের জন্য প্রতিষ্ঠানের সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।",
    mockupType: "auth",
  },
  {
    id: "dashboard-ai",
    number: "03",
    titleEn: "Dashboard & Live Executive AI Analytics",
    titleBn: "ড্যাশবোর্ড ও লাইভ এআই অ্যানালিটিক্স",
    subtitleEn: "6 Real-Time KPI Cards, Visual Charts & 100% Online Cloud AI Insights",
    subtitleBn: "৬টি রিয়েল-টাইম কেপিআই কার্ড, সেলস চার্ট এবং লাইভ ক্লাউড এআই রিপোর্ট",
    icon: LayoutDashboard,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    routeHint: "/#/dashboard",
    overviewEn:
      "The Executive Dashboard provides a 360-degree live pulse of your distribution business. It combines 6 clickable KPI summary cards, a 7-day sales area chart, order status distribution, top-selling products, and the 100% Online Executive AI Intelligence engine.",
    overviewBn:
      "ড্যাশবোর্ড পেজে ব্যবসার সম্পূর্ণ লাইভ চিত্র এক নজরে দেখা যায়। এতে রয়েছে ৬টি ইন্টারঅ্যাক্টিভ কেপিআই কার্ড, ৭ দিনের বিক্রয় গ্রাফ, অর্ডারের অবস্থা, শীর্ষ বিক্রিত পণ্য এবং ১০০% অনলাইন লাইভ এআই অ্যানালিটিক্স ইঞ্জিন।",
    callouts: [
      {
        num: "①",
        labelEn: "6 Interactive KPI Cards",
        labelBn: "৬টি ইন্টারঅ্যাক্টিভ কেপিআই কার্ড",
        descEn: "Today's Sales, Monthly Sales, Current Month Collection (with Lifetime total), Outstanding Due, Total Customers (Active/Inactive), and Low Stock Alerts.",
        descBn: "আজকের বিক্রয়, মাসিক বিক্রয়, চলতি মাসের কালেকশন (সর্বমোটসহ), মোট বকেয়া, মোট কাস্টমার (Active/Inactive) এবং কম স্টকের সতর্কতা—প্রতিটি কার্ডে ক্লিক করলে সংশ্লিষ্ট পেজে যাওয়া যায়।",
      },
      {
        num: "②",
        labelEn: "Generate AI Insights (Live Cloud Sync)",
        labelBn: "লাইভ এআই ইনসাইটস তৈরি (Generate AI Insights)",
        descEn: "Pulls fresh cloud data from Supabase first, then generates a 4-part executive report on revenue, SKU velocity, credit risk, and 7-day forecast.",
        descBn: "ক্লিক করার সাথে সাথে সুপাবেস ক্লাউড থেকে সর্বশেষ ডেটা সিঙ্ক করে রাজস্ব, শীর্ষ পণ্য, বকেয়া ঝুঁকি এবং আগামী ৭ দিনের বিক্রয় পূর্বাভাস ও রিস্টকিং প্ল্যান তৈরি করে।",
      },
      {
        num: "③",
        labelEn: "7-Day Sales Trend & Status Pie Chart",
        labelBn: "৭ দিনের বিক্রয় গ্রাফ ও অর্ডার স্ট্যাটাস চার্ট",
        descEn: "Visualizes daily revenue trajectory and the breakdown of Delivered, Approved, Pending, and Draft orders.",
        descBn: "গত ৭ দিনের প্রতিদিনের বিক্রয় প্রবণতা এবং ডেলিভার্ড, অনুমোদিত ও পেন্ডিং অর্ডারের অনুপাত চার্ট আকারে দেখায়।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Review Daily KPIs & Growth Trends",
        titleBn: "ধাপ ১: দৈনিক ও মাসিক কেপিআই পর্যবেক্ষণ",
        descEn: "Check percentage growth badges (+% / -%) on each KPI card comparing today vs. yesterday and current month vs. previous month.",
        descBn: "প্রতিটি কার্ডের উপরে থাকা গ্রোথ ব্যাজ (+% / -%) দেখে গতকালের তুলনায় আজকের এবং গত মাসের তুলনায় চলতি মাসের প্রবৃদ্ধি যাচাই করুন।",
      },
      {
        titleEn: "Step 2: Run Live Online Executive AI Analysis",
        titleBn: "ধাপ ২: লাইভ অনলাইন এআই অ্যানালিটিক্স রান করুন",
        descEn: "Click 'Generate AI Insights' or 'Analyze Now' to audit top products, overdue dealers, and recommended restock quantities.",
        descBn: "'Generate AI Insights' বা 'Analyze Now' বাটনে ক্লিক করে শীর্ষ বিক্রিত পণ্য, বকেয়া কাস্টমার এবং কোন পণ্য কত পিস রিস্টক করতে হবে তার তাৎক্ষণিক রিপোর্ট পান।",
      },
    ],
    tipEn: "Use the 'Copy' button on the AI Insights card to copy the formatted Markdown summary directly into management WhatsApp or email briefings.",
    tipBn: "এআই রিপোর্ট তৈরি হওয়ার পর 'Copy' বাটনে ক্লিক করে সম্পূর্ণ রিপোর্টটি কপি করে হোয়াটসঅ্যাপ বা ইমেইলে ম্যানেজমেন্টকে পাঠাতে পারবেন।",
    mockupType: "dashboard",
  },
  {
    id: "crm-customers",
    number: "04",
    titleEn: "CRM / Customer & Retailer Management",
    titleBn: "কাস্টমার, ডিলার ও রিটেইলার ব্যবস্থাপনা (CRM)",
    subtitleEn: "Outlets, Territory Mapping, Opening Balances & Party Due Ledgers",
    subtitleBn: "আউটলেট প্রোফাইল, এরিয়া ম্যাপিং, ওপেনিং ব্যালেন্স ও কাস্টমার বকেয়া লেজার",
    icon: Users,
    colorClass: "text-violet-600 dark:text-violet-400",
    bgClass: "bg-violet-500/10",
    borderClass: "border-violet-500/30",
    routeHint: "/#/customers",
    overviewEn:
      "The CRM module maintains your complete directory of Dealers, Retailers, and Wholesale outlets. It dynamically calculates every customer's live due balance from their Opening Balance + Delivered/Active Orders − Cash Collections − Sales Returns.",
    overviewBn:
      "সিআরএম (CRM) মডিউলে আপনার সকল ডিলার, রিটেইলার এবং পাইকারি কাস্টমারদের বিস্তারিত তথ্য সংরক্ষিত থাকে। কাস্টমারের ওপেনিং ব্যালেন্স, অর্ডার, কালেকশন ও সেলস রিটার্নের ওপর ভিত্তি করে স্বয়ংক্রিয়ভাবে রিয়েল-টাইম বকেয়া (Current Due) হিসাব হয়।",
    callouts: [
      {
        num: "①",
        labelEn: "+ Add Customer & Area Management",
        labelBn: "+ নতুন কাস্টমার ও এরিয়া ব্যবস্থাপনা",
        descEn: "Register new outlets with Customer Type (Dealer/Retailer/Wholesale), Territory/Area, Trade License, and Opening Balance.",
        descBn: "কাস্টমারের নাম, ধরন (Dealer/Retailer/Wholesale), ফোন নম্বর, এরিয়া/টেরিটরি এবং প্রারম্ভিক বকেয়া (Opening Balance) দিয়ে নতুন কাস্টমার যুক্ত করুন।",
      },
      {
        num: "②",
        labelEn: "Due Status & Territory Filters",
        labelBn: "বকেয়া স্ট্যাটাস ও এরিয়া ফিল্টার",
        descEn: "Filter outlets instantly by Clear, Partial, or Overdue status, customer type, or assigned territory.",
        descBn: "বকেয়া আছে (Overdue/Partial) নাকি পরিষ্কার (Clear), অথবা নির্দিষ্ট এলাকা অনুযায়ী কাস্টমার তালিকা ফিল্টার করুন।",
      },
      {
        num: "③",
        labelEn: "AI Payment Reminder & Customer Statement",
        labelBn: "এআই পেমেন্ট রিমাইন্ডার ও কাস্টমার লেজার",
        descEn: "Generate polite Bengali payment reminder messages for WhatsApp/SMS and inspect full order/collection history.",
        descBn: "বকেয়া কাস্টমারদের এক ক্লিকেই বাংলায় সুন্দর পেমেন্ট রিমাইন্ডার মেসেজ পাঠান এবং তাদের সম্পূর্ণ লেনদেনের বিবরণী দেখুন।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Create Territories / Areas First",
        titleBn: "ধাপ ১: এরিয়া বা টেরিটরি তৈরি করুন",
        descEn: "Organize regions (e.g., Dhaka North, Chittagong, Bogura) so every customer is mapped to a geographic sales route.",
        descBn: "কাস্টমার তৈরির আগে আপনার বিক্রয় অঞ্চলগুলো (যেমন: ঢাকা নর্থ, চট্টগ্রাম, বগুড়া) তৈরি করে নিন, এতে রুট প্ল্যানিং সহজ হবে।",
      },
      {
        titleEn: "Step 2: Monitor Live Current Due",
        titleBn: "ধাপ ২: লাইভ বকেয়া (Current Due) ট্র্যাক করুন",
        descEn: "Whenever an order is created or a cash collection is logged, the customer's Current Due updates automatically across CRM and Accounts.",
        descBn: "নতুন অর্ডার বা ক্যাশ কালেকশন এন্ট্রি করার সাথে সাথেই কাস্টমারের বকেয়া ব্যালেন্স স্বয়ংক্রিয়ভাবে আপডেট হয়ে যায়।",
      },
    ],
    tipEn: "Keep customer phone numbers in valid format (+8801XXXXXXXXX) so Sales Officers can dial or send WhatsApp reminders with a single tap.",
    tipBn: "কাস্টমারের সঠিক মোবাইল নম্বর (+8801XXXXXXXXX) সংরক্ষণ করুন, যাতে সেলস অফিসাররা সরাসরি কল বা হোয়াটসঅ্যাপ রিমাইন্ডার পাঠাতে পারেন।",
    mockupType: "crm",
  },
  {
    id: "products-pricing",
    number: "05",
    titleEn: "Products & Multi-Tier Pricing Catalog",
    titleBn: "প্রোডাক্ট ও মাল্টি-টিয়ার প্রাইসিং ক্যাটালগ",
    subtitleEn: "Cookware SKUs, Dealer Tiers (DP, D10, B12, MRP) & Reorder Thresholds",
    subtitleBn: "কুকওয়্যার এসকেইউ (SKU), ডিলার প্রাইস টিয়ার (DP, D10, B12, MRP) ও স্টক অ্যালার্ট",
    icon: Package,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    routeHint: "/#/products",
    overviewEn:
      "Manage your complete Hamko Cookware catalog with SKU codes, categories, multi-tier wholesale/dealer pricing (DP, D6, B8, D8, D10, B12, D12, B14, Custom, MRP), live stock quantities, and automated low-stock warning thresholds.",
    overviewBn:
      "হামকো কুকওয়্যারের সকল পণ্যের এসকেইউ (SKU) কোড, ক্যাটাগরি, বিভিন্ন ডিলার প্রাইস টিয়ার (DP, D10, B12, MRP ইত্যাদি), বর্তমান স্টক এবং রিঅর্ডার লেভেল এই মডিউল থেকে পরিচালনা করা হয়।",
    callouts: [
      {
        num: "①",
        labelEn: "+ Add Product & Category Filter",
        labelBn: "+ নতুন পণ্য যোগ ও ক্যাটাগরি ফিল্টার",
        descEn: "Create SKUs with brand, category (Pressure Cooker, Fry Pan, Kadai, etc.), unit type (pcs/set/box), and opening stock.",
        descBn: "পণ্যের নাম, SKU কোড, ক্যাটাগরি (প্রেসার কুকার, ফ্রাই প্যান, কড়াই ইত্যাদি), ইউনিট এবং প্রারম্ভিক স্টক দিয়ে নতুন পণ্য যুক্ত করুন।",
      },
      {
        num: "②",
        labelEn: "Dynamic Price Tiers (DP / D10 / B12 / MRP)",
        labelBn: "মাল্টি-টিয়ার প্রাইসিং (DP / D10 / B12 / MRP)",
        descEn: "Configure tier rates so order creation automatically applies the right rate for each dealer tier.",
        descBn: "ডিলার ও পাইকারি কাস্টমারদের জন্য আলাদা প্রাইস টিয়ার সেট করুন, যা অর্ডার করার সময় স্বয়ংক্রিয়ভাবে প্রযোজ্য হবে।",
      },
      {
        num: "③",
        labelEn: "Low-Stock & Stock Value Badges",
        labelBn: "কম স্টক সতর্কতা ও মোট স্টক ভ্যালু",
        descEn: "Highlights items where stock_quantity <= reorder_level in red/amber so procurement can restock immediately.",
        descBn: "কোনো পণ্যের স্টক রিঅর্ডার লেভেলের নিচে নামলে সাথে সাথে লাল/হলুদ সতর্কতা ব্যাজ প্রদর্শিত হয়।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Set Accurate Reorder Levels",
        titleBn: "ধাপ ১: সঠিক রিঅর্ডার লেভেল নির্ধারণ করুন",
        descEn: "Define a minimum buffer threshold (e.g., 10 pcs) on fast-moving cookware items to trigger automatic low-stock alerts.",
        descBn: "বেশি বিক্রি হওয়া পণ্যের জন্য সর্বনিম্ন স্টক সীমা (যেমন: ১০ পিস) নির্ধারণ করে রাখুন, যাতে স্টক ফুরানোর আগেই সতর্কবার্তা পাওয়া যায়।",
      },
      {
        titleEn: "Step 2: Export Product Catalog to Excel",
        titleBn: "ধাপ ২: প্রোডাক্ট ক্যাটালগ এক্সেলে ডাউনলোড",
        descEn: "Use the Export button to download the complete price list and current stock valuation sheet.",
        descBn: "যেকোনো সময় সম্পূর্ণ মূল্য তালিকা ও বর্তমান স্টকের ভ্যালুয়েশন শিট এক্সেল ফাইলে ডাউনলোড করে নিন।",
      },
    ],
    tipEn: "Every SKU code is automatically normalized to uppercase to prevent duplicate product entries across devices.",
    tipBn: "ডুপ্লিকেট এন্ট্রি রোধ করতে প্রতিটি পণ্যের SKU কোড স্বয়ংক্রিয়ভাবে বড় হাতের অক্ষরে (Uppercase) সংরক্ষিত হয়।",
    mockupType: "products",
  },
  {
    id: "orders-invoicing",
    number: "06",
    titleEn: "Orders & Invoicing Workflow",
    titleBn: "অর্ডার ও ইনভয়েস ব্যবস্থাপনা",
    subtitleEn: "+ New Order, Smart Voice AI Order, Status Lifecycle, Sales Return & Invoice Print",
    subtitleBn: "নতুন অর্ডার তৈরি, স্মার্ট এআই অর্ডার, স্ট্যাটাস পরিবর্তন, সেলস রিটার্ন ও ইনভয়েস প্রিন্ট",
    icon: ShoppingCart,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    routeHint: "/#/orders",
    overviewEn:
      "The Orders module handles the entire Order-to-Cash lifecycle: creating multi-item dealer invoices with tier pricing, Smart Voice/Text AI order parsing, progressing orders from Draft → Pending → Approved → Delivered, processing Sales Returns, and printing branded A4/Chalan invoices.",
    overviewBn:
      "অর্ডার মডিউলের মাধ্যমে কাস্টমারের জন্য মাল্টি-আইটেম অর্ডার তৈরি, ভয়েস/টেক্সট এআই অর্ডার এন্ট্রি, অর্ডারের স্ট্যাটাস পরিবর্তন (Draft → Pending → Approved → Delivered), সেলস রিটার্ন সমন্বয় এবং প্রফেশনাল ইনভয়েস ও চালান প্রিন্ট করা যায়।",
    callouts: [
      {
        num: "①",
        labelEn: "+ New Order & Smart Order AI",
        labelBn: "+ নতুন অর্ডার ও স্মার্ট এআই অর্ডার",
        descEn: "Create orders manually with live stock & tier-price calculation, or dictate/type natural Bengali/English phrases via Smart Order AI.",
        descBn: "ম্যানুয়ালি পণ্য ও প্রাইস টিয়ার সিলেক্ট করে অথবা বাংলায়/ইংরেজিতে লিখে বা ভয়েস দিয়ে স্মার্ট এআই-এর মাধ্যমে দ্রুত অর্ডার তৈরি করুন।",
      },
      {
        num: "②",
        labelEn: "Status Progression & Stock Deduction",
        labelBn: "অর্ডার স্ট্যাটাস ও স্বয়ংক্রিয় স্টক কর্তন",
        descEn: "Moving an order to 'Delivered' or 'Approved' automatically deducts inventory and updates the customer's due ledger.",
        descBn: "অর্ডার অনুমোদন ও ডেলিভার্ড করার সাথে সাথে স্বয়ংক্রিয়ভাবে গোডাউন স্টক থেকে পণ্য কমে যায় এবং কাস্টমারের বকেয়া হিসাব আপডেট হয়।",
      },
      {
        num: "③",
        labelEn: "Print Invoice / Chalan & Sales Return",
        labelBn: "ইনভয়েস/চালান প্রিন্ট ও সেলস রিটার্ন",
        descEn: "Print thermal or A4 invoices with company branding, or record partial item returns to credit the customer's due balance.",
        descBn: "এক ক্লিকেই কাস্টমারের জন্য ব্র্যান্ডেড ইনভয়েস বা ডেলিভারি চালান প্রিন্ট করুন এবং কোনো পণ্য ফেরত আসলে 'Sales Return' এন্ট্রি করুন।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Select Customer & Sales Officer",
        titleBn: "ধাপ ১: কাস্টমার ও সেলস অফিসার নির্বাচন করুন",
        descEn: "Choose the outlet (auto-displays their current due balance) and verify the assigned Sales Officer.",
        descBn: "অর্ডার ফরমে কাস্টমার নির্বাচন করলেই তার পূর্বের বকেয়া দেখাবে এবং দায়িত্বপ্রাপ্ত সেলস অফিসার যুক্ত হবে।",
      },
      {
        titleEn: "Step 2: Add Items, Price Tiers & Discounts",
        titleBn: "ধাপ ২: পণ্য, প্রাইস টিয়ার ও ডিসকাউন্ট যুক্ত করুন",
        descEn: "Select cookware SKUs, choose the pricing tier (DP, D10, B12, etc.), enter quantities, and record any advance cash paid.",
        descBn: "পণ্য নির্বাচন করে নির্দিষ্ট প্রাইস টিয়ার (DP, D10, B12), পরিমাণ ও ডিসকাউন্ট দিন। নগদ জমা থাকলে Paid Amount ঘরে লিখুন।",
      },
      {
        titleEn: "Step 3: Print Invoice & Export Excel",
        titleBn: "ধাপ ৩: ইনভয়েস প্রিন্ট ও এক্সেল এক্সপোর্ট",
        descEn: "Click the Print icon on any order row to generate a formal invoice, or export filtered orders to Excel.",
        descBn: "যেকোনো অর্ডারের পাশে থাকা প্রিন্ট আইকনে ক্লিক করে ইনভয়েস প্রিন্ট করুন অথবা এক্সেলে সম্পূর্ণ তালিকা ডাউনলোড করুন।",
      },
    ],
    tipEn: "If a customer returns damaged or excess goods from a delivered order, use the 'Return' action on that order—it automatically restores stock and reduces customer due.",
    tipBn: "ডেলিভার্ড অর্ডার থেকে কোনো পণ্য ফেরত আসলে অর্ডার লিস্টের 'Return' অপশন ব্যবহার করুন—এতে স্বয়ংক্রিয়ভাবে স্টক বাড়বে এবং কাস্টমারের বকেয়া কমে যাবে।",
    warningEn: "Cancelling or deleting a Delivered order automatically reverses its stock deduction so inventory counts always stay 100% accurate.",
    warningBn: "কোনো ডেলিভার্ড অর্ডার বাতিল (Cancel) বা ডিলিট করা হলে তার কেটে নেওয়া স্টক স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে ফেরত যুক্ত হয়।",
    mockupType: "orders",
  },
  {
    id: "procurement-supplier",
    number: "07",
    titleEn: "Procurement & Supplier Payable Ledger",
    titleBn: "প্রকিউরমেন্ট ও সাপ্লায়ার পেয়েবল লেজার",
    subtitleEn: "+ Add Purchase Chalan, $ Record Payment, Debit Notes & Running Balance",
    subtitleBn: "পারচেজ চালান (+), সাপ্লায়ার পেমেন্ট (-), ডেবিট নোট এবং রানিং ব্যালেন্স লেজার",
    icon: Truck,
    colorClass: "text-cyan-600 dark:text-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/30",
    routeHint: "/#/procurement",
    overviewEn:
      "The Procurement module tracks all factory/supplier purchases (e.g., HAMKO Industries Ltd.), incoming stock chalans, outgoing supplier payments, purchase return debit notes, and the chronological running payable balance.",
    overviewBn:
      "প্রকিউরমেন্ট (Procurement / Supplier Ledger) মডিউলে ফ্যাক্টরি বা সাপ্লায়ার (যেমন: HAMKO Industries Ltd.) থেকে পণ্য ক্রয়ের চালান, সাপ্লায়ারকে প্রদানকৃত পেমেন্ট, পারচেজ রিটার্ন (ডেবিট নোট) এবং ক্রমানুসারে রানিং বকেয়া ব্যালেন্স সংরক্ষিত থাকে।",
    callouts: [
      {
        num: "①",
        labelEn: "+ Add Purchase Chalan (Stock In)",
        labelBn: "+ নতুন পারচেজ চালান যোগ (Stock In)",
        descEn: "Enter factory chalan number, date, and purchased items. Automatically increases warehouse stock and supplier payable balance.",
        descBn: "ফ্যাক্টরির চালান নম্বর, তারিখ ও পণ্যের তালিকা এন্ট্রি করলে স্বয়ংক্রিয়ভাবে গোডাউনের স্টক বৃদ্ধি পায় এবং সাপ্লায়ারের পাওনা ব্যালেন্সে যোগ হয়।",
      },
      {
        num: "②",
        labelEn: "$ Record Payment & Debit Note",
        labelBn: "$ সাপ্লায়ার পেমেন্ট ও ডেবিট নোট",
        descEn: "Log payments (Cash, Bank, Cheque, MFS/bKash) or return defective factory items via Debit Note to reduce payable due.",
        descBn: "সাপ্লায়ারকে নগদ, ব্যাংক, চেক বা বিকাশে পেমেন্ট করলে তা এন্ট্রি করুন। ত্রুটিপূর্ণ পণ্য ফ্যাক্টরিতে ফেরত পাঠাতে 'Debit Note' ব্যবহার করুন।",
      },
      {
        num: "③",
        labelEn: "Chronological Ledger & Backup/Restore",
        labelBn: "রানিং ব্যালেন্স লেজার, প্রিন্ট ও ব্যাকআপ",
        descEn: "View every Chalan (+) and Payment (−) with running balance, edit/delete entries, print A4 statements, or export/restore JSON backups.",
        descBn: "প্রতিটি চালান (+) ও পেমেন্ট (−)-এর পর সর্বশেষ রানিং ব্যালেন্স দেখুন, প্রয়োজনে এডিট/ডিলিট করুন এবং A4 লেজার প্রিন্ট বা এক্সেল এক্সপোর্ট করুন।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Enter Factory Purchase Chalan",
        titleBn: "ধাপ ১: ফ্যাক্টরি পারচেজ চালান এন্ট্রি করুন",
        descEn: "Click '+ Add Purchase Chalan', pick the supplier & warehouse, add products with purchase rates, and save.",
        descBn: "'+ Add Purchase Chalan'-এ ক্লিক করে সাপ্লায়ার ও গোডাউন নির্বাচন করুন, পণ্যের পরিমাণ ও ক্রয়মূল্য দিয়ে চালানটি সেভ করুন।",
      },
      {
        titleEn: "Step 2: Record Supplier Payments",
        titleBn: "ধাপ ২: সাপ্লায়ার পেমেন্ট রেকর্ড করুন",
        descEn: "Click '$ Record Payment', enter the amount, payment mode, and reference number. This also syncs to Accounts outflows.",
        descBn: "'$ Record Payment' বাটনে ক্লিক করে টাকার পরিমাণ, পেমেন্ট মাধ্যম ও রেফারেন্স নম্বর দিন। এটি স্বয়ংক্রিয়ভাবে ক্যাশ আউটফ্লো-তেও যুক্ত হবে।",
      },
    ],
    tipEn: "Procurement chalans and supplier payments sync across devices automatically—even across fresh browser sessions—via our cloud ledger reconstruction engine.",
    tipBn: "যেকোনো ডিভাইস থেকে পারচেজ চালান বা সাপ্লায়ার পেমেন্ট এন্ট্রি করলে তা ক্লাউড সিঙ্কের মাধ্যমে অন্য সকল কম্পিউটার ও মোবাইলে স্বয়ংক্রিয়ভাবে চলে আসে।",
    mockupType: "procurement",
  },
  {
    id: "inventory-stock",
    number: "08",
    titleEn: "Inventory & Warehouse Stock Control",
    titleBn: "ইনভেন্টরি ও গোডাউন স্টক নিয়ন্ত্রণ",
    subtitleEn: "Live Stock Levels, Stock In/Out/Transfer/Damage & Transaction Audit Log",
    subtitleBn: "লাইভ স্টক পরিমাণ, স্টক ইন/আউট/ট্রান্সফার/ড্যামেজ এবং ট্রানজেকশন লগ",
    icon: Warehouse,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/30",
    routeHint: "/#/inventory",
    overviewEn:
      "The Inventory module provides real-time visibility into physical stock quantities across warehouses, total inventory valuation, low-stock / out-of-stock alerts, and a complete audit trail of every Stock In, Stock Out, Transfer, Adjustment, and Damage transaction.",
    overviewBn:
      "ইনভেন্টরি মডিউলে গোডাউনের প্রতিটি পণ্যের বর্তমান স্টক, মোট মজুদ পণ্যের আর্থিক মূল্য, কম স্টক বা স্টক শেষ হওয়া পণ্যের তালিকা এবং প্রতিটি স্টক ইন, স্টক আউট, ট্রান্সফার ও ড্যামেজের সম্পূর্ণ ইতিহাস দেখা যায়।",
    callouts: [
      {
        num: "①",
        labelEn: "+ Record Stock Transaction",
        labelBn: "+ স্টক ট্রানজেকশন রেকর্ড করুন",
        descEn: "Log manual Stock In, Stock Out, Warehouse Transfer, Inventory Adjustment, or Damage write-offs with reference notes.",
        descBn: "ম্যানুয়াল স্টক ইন, স্টক আউট, গোডাউন ট্রান্সফার, স্টক সমন্বয় (Adjustment) বা ড্যামেজ পণ্যের হিসাব রেফারেন্স নোটসহ এন্ট্রি করুন।",
      },
      {
        num: "②",
        labelEn: "Stock Health Filter Tabs",
        labelBn: "স্টক হেলথ ফিল্টার (All / Low Stock / Out of Stock)",
        descEn: "Switch between All Inventory, Low Stock items needing urgent reorder, and Out of Stock items.",
        descBn: "সব পণ্য, কম স্টক (Low Stock) এবং স্টক শেষ হওয়া (Out of Stock) পণ্যগুলো আলাদা ট্যাবে ফিল্টার করে দেখুন।",
      },
      {
        num: "③",
        labelEn: "Complete Movement Audit Log",
        labelBn: "স্টক মুভমেন্ট অডিট লগ",
        descEn: "Tracks every automated order deduction, procurement chalan receipt, sales return, and manual stock adjustment.",
        descBn: "কোন চালানে কত পিস স্টক ঢুকেছে এবং কোন অর্ডারে কত পিস ডেলিভারি হয়েছে তার প্রতিটি লেনদেন তারিখ ও রেফারেন্সসহ সংরক্ষিত থাকে।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Audit Low-Stock Alerts Daily",
        titleBn: "ধাপ ১: প্রতিদিন কম স্টকের তালিকা যাচাই করুন",
        descEn: "Filter by 'Low Stock' to identify SKUs at or below their reorder level before taking large dealer orders.",
        descBn: "বড় অর্ডার নেওয়ার আগে 'Low Stock' ফিল্টারে ক্লিক করে কোন কোন পণ্যের মজুদ কমে গেছে তা দেখে নিন।",
      },
      {
        titleEn: "Step 2: Record Physical Stock Adjustments",
        titleBn: "ধাপ ২: ফিজিক্যাল স্টক ও ড্যামেজ সমন্বয়",
        descEn: "If physical warehouse counting reveals breakage or variance, record a 'Damage' or 'Adjustment' transaction to keep digital stock exact.",
        descBn: "গোডাউন গণনায় কোনো ভাঙা বা ড্যামেজ পণ্য পাওয়া গেলে 'Damage' বা 'Adjustment' এন্ট্রি দিয়ে সফটওয়্যারের স্টক মিলিয়ে রাখুন।",
      },
    ],
    tipEn: "You do not need to manually deduct stock for customer orders or manually add stock for purchase chalans—the ERP handles both automatically!",
    tipBn: "কাস্টমার অর্ডার বা পারচেজ চালানের জন্য আলাদাভাবে ম্যানুয়াল স্টক ইন/আউট করতে হয় না—অর্ডার ও চালান এন্ট্রি করলেই স্টক স্বয়ংক্রিয়ভাবে সমন্বয় হয়!",
    mockupType: "inventory",
  },
  {
    id: "accounts-finance",
    number: "09",
    titleEn: "Accounts, Collections & Financial Cash Book",
    titleBn: "অ্যাকাউন্টস, নগদ কালেকশন ও দৈনিক ক্যাশ বুক",
    subtitleEn: "+ Cash Collection, Expense Entry (OPEX vs Supplier), Daily Cash Book & Net Cash Flow",
    subtitleBn: "ক্যাশ কালেকশন (+), খরচ এন্ট্রি (OPEX ও সাপ্লায়ার পেমেন্ট), ক্যাশ বুক ও নিট ক্যাশ ফ্লো",
    icon: Wallet,
    colorClass: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-500/10",
    borderClass: "border-teal-500/30",
    routeHint: "/#/accounts",
    overviewEn:
      "The Accounts & Finance module is the financial command center of Hamko Sales ERP. It manages customer Cash Collections, operational Expenses (Salary, Rent, Transport, Utilities, Marketing) vs. Supplier Payment outflows, Customer Due statements, and the automated Daily Cash Book.",
    overviewBn:
      "অ্যাকাউন্টস ও ফিন্যান্স মডিউল থেকে কাস্টমারদের কাছ থেকে আদায়কৃত নগদ কালেকশন, অফিসের দৈনন্দিন খরচ (বেতন, ভাড়া, পরিবহন, মার্কেটিং), সাপ্লায়ার পেমেন্ট, কাস্টমার বকেয়া এবং দৈনিক ক্যাশ বুক ও নিট ক্যাশ ফ্লো পরিচালনা করা হয়।",
    callouts: [
      {
        num: "①",
        labelEn: "+ Cash Collection & Money Receipt Print",
        labelBn: "+ ক্যাশ কালেকশন ও মানি রিসিট প্রিন্ট",
        descEn: "Record customer payments (Cash, Bank Transfer, Mobile Banking/bKash, Cheque), auto-reduce customer due, and print official Money Receipts.",
        descBn: "কাস্টমারের কাছ থেকে নগদ, ব্যাংক, বিকাশ বা চেকের মাধ্যমে টাকা আদায় এন্ট্রি করুন এবং সাথে সাথে প্রিন্টেড মানি রিসিট (Money Receipt) প্রদান করুন।",
      },
      {
        num: "②",
        labelEn: "+ Expense Entry (OPEX vs Supplier Outflow)",
        labelBn: "+ খরচ এন্ট্রি (অফিস খরচ বনাম সাপ্লায়ার পেমেন্ট)",
        descEn: "Separates regular Operating Expenses (OPEX) from Supplier Payment cash outflows for clean profit & cash-flow accounting.",
        descBn: "অফিসের নিয়মিত পরিচালন ব্যয় (OPEX) এবং সাপ্লায়ার পেমেন্ট আলাদাভাবে ট্র্যাক করে নিখুঁত লাভ-ক্ষতি ও ক্যাশ ফ্লো হিসাব রাখে।",
      },
      {
        num: "③",
        labelEn: "4 Financial Tabs & Officer Handover Verification",
        labelBn: "৪টি ফিন্যান্সিয়াল ট্যাব ও ক্যাশ হ্যান্ডওভার যাচাই",
        descEn: "Switch across Cash Collections, Expense Ledger, Daily Cash Book (Inflow vs Outflow), and Customer Due Aging.",
        descBn: "Cash Collection, Expense Entry, Daily Cash Book এবং Customer Due—এই ৪টি ট্যাবে সম্পূর্ণ আর্থিক হিসাব এবং সেলস অফিসারের দিনশেষের ক্যাশ হ্যান্ডওভার যাচাই করুন।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Log Customer Cash Collections",
        titleBn: "ধাপ ১: কাস্টমার কালেকশন এন্ট্রি করুন",
        descEn: "Click '+ Cash Collection', select the customer (and optional order invoice), enter the collected amount and payment method, and save.",
        descBn: "'+ Cash Collection' বাটনে ক্লিক করে কাস্টমার নির্বাচন করুন, আদায়কৃত টাকার পরিমাণ ও মাধ্যম (Cash/Bank/Mobile Banking/Cheque) দিয়ে সেভ করুন।",
      },
      {
        titleEn: "Step 2: Reconcile Daily Cash Book & Net Cash Flow",
        titleBn: "ধাপ ২: দৈনিক ক্যাশ বুক ও নিট ক্যাশ ফ্লো মেলান",
        descEn: "Open the 'Daily Cash Book' tab to verify Total Collections (Inflow) minus Total Expenses & Supplier Payments (Outflow) = Net Cash in Hand.",
        descBn: "'Daily Cash Book' ট্যাবে গিয়ে প্রতিদিনের মোট আদায় (Inflow) থেকে মোট খরচ ও সাপ্লায়ার পেমেন্ট (Outflow) বাদ দিয়ে হাতে থাকা নিট ক্যাশ (Net Cash Flow) মিলিয়ে নিন।",
      },
    ],
    tipEn: "Every Cash Collection automatically generates a unique receipt number (e.g., COL-XXXXX) and immediately deducts the amount from the customer's due balance.",
    tipBn: "প্রতিটি কালেকশন এন্ট্রিতে স্বয়ংক্রিয়ভাবে একটি ইউনিক মানি রিসিট নম্বর (COL-XXXXX) তৈরি হয় এবং কাস্টমারের মোট বকেয়া থেকে ওই টাকা সাথে সাথে কমে যায়।",
    mockupType: "accounts",
  },
  {
    id: "sfa-field-ops",
    number: "10",
    titleEn: "Sales Force Automation (SFA) & Day-End Handover",
    titleBn: "সেলস ফোর্স অটোমেশন (SFA) ও ডে-এন্ড হ্যান্ডওভার",
    subtitleEn: "Weekly Route Plan, GPS/Shop Visit Logging, Sales Targets & PIN Cash Handover",
    subtitleBn: "সাপ্তাহিক রুট প্ল্যান, দোকান ভিজিট লগ, সেলস টার্গেট এবং পিন-ভিত্তিক ক্যাশ হ্যান্ডওভার",
    icon: MapPin,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-500/10",
    borderClass: "border-indigo-500/30",
    routeHint: "/#/sfa",
    overviewEn:
      "The SFA module empowers field Sales Officers and Managers to plan day-of-week outlet routes, log shop check-ins and outcomes, track monthly/quarterly sales target achievement from delivered orders, and execute secure PIN-verified Evening Cash Handovers.",
    overviewBn:
      "সেলস ফোর্স (SFA) মডিউলের মাধ্যমে মাঠ পর্যায়ের সেলস অফিসারদের সাপ্তাহিক রুট প্ল্যান, দোকান ভিজিট লগ, মাসিক/ত্রৈমাসিক বিক্রয় টার্গেট অর্জন এবং দিনশেষে পিন (PIN) যাচাইকৃত ক্যাশ হ্যান্ডওভার পরিচালনা করা হয়।",
    callouts: [
      {
        num: "①",
        labelEn: "Log Visit & Weekly Route Plan",
        labelBn: "ভিজিট লগ ও সাপ্তাহিক রুট প্ল্যান",
        descEn: "Assign customers to days of the week (Saturday–Thursday) and log visit check-in time, purpose, and outcome.",
        descBn: "সপ্তাহের কোন দিন কোন এলাকার কোন দোকানে ভিজিট করা হবে তার রুট প্ল্যান সাজান এবং ভিজিট শেষে ফলাফল (Order Taken / Payment Collected / Follow-up) লগ করুন।",
      },
      {
        num: "②",
        labelEn: "Sales Targets & Live Achievement %",
        labelBn: "সেলস টার্গেট ও লাইভ অর্জন (%)",
        descEn: "Set officer or territory targets (Daily, Weekly, Monthly, Quarterly, Yearly) and track automated achievement progress bars.",
        descBn: "অফিসার বা এরিয়া অনুযায়ী মাসিক/ত্রৈমাসিক বিক্রয় টার্গেট সেট করুন এবং ডেলিভার্ড অর্ডারের বিপরীতে কত শতাংশ টার্গেট পূরণ হয়েছে তা প্রগ্রেস বারে দেখুন।",
      },
      {
        num: "③",
        labelEn: "Evening Cash Handover Modal (4-Digit PIN)",
        labelBn: "দিনশেষের ক্যাশ হ্যান্ডওভার (৪-ডিজিট পিন)",
        descEn: "Summarizes the officer's daily Cash, bKash, and Cheque collections with a 4-digit verification PIN for cashier sign-off.",
        descBn: "দিনশেষে সেলস অফিসার সারাদিনের আদায়কৃত নগদ, বিকাশ ও চেকের হিসাব ৪-ডিজিট পিন কোডসহ অ্যাকাউন্টস বিভাগে হ্যান্ডওভার করবেন।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Follow Today's Assigned Route",
        titleBn: "ধাপ ১: নির্ধারিত দিনের রুট প্ল্যান অনুসরণ করুন",
        descEn: "Filter the Route Plan tab by today's day of the week and territory to see every scheduled outlet stop.",
        descBn: "'Route Plan' ট্যাবে গিয়ে আজকের বার ও এলাকা নির্বাচন করে নির্ধারিত দোকানগুলোর তালিকা দেখে ভিজিট শুরু করুন।",
      },
      {
        titleEn: "Step 2: Submit Evening Cash Handover",
        titleBn: "ধাপ ২: দিনশেষে ক্যাশ হ্যান্ডওভার সাবমিট করুন",
        descEn: "At the end of the shift, open Evening Handover to generate the collection summary and verification PIN for the accountant.",
        descBn: "দিনের কাজ শেষে 'Evening Handover'-এ ক্লিক করে সারাদিনের মোট কালেকশন সামারি ও পিন জেনারেট করে ক্যাশিয়ারের কাছে জমা দিন।",
      },
    ],
    tipEn: "Sales Target achievement percentages update automatically whenever an officer's order status is marked as 'Delivered'.",
    tipBn: "সেলস অফিসারের কোনো অর্ডার 'Delivered' স্ট্যাটাসে গেলে তার সেলস টার্গেট অর্জনের শতাংশ স্বয়ংক্রিয়ভাবে বৃদ্ধি পায়।",
    mockupType: "sfa",
  },
  {
    id: "reports-exports",
    number: "11",
    titleEn: "Executive Reports & Multi-Sheet Excel Exports",
    titleBn: "এক্সিকিউটিভ রিপোর্ট ও এক্সেল/পিডিএফ এক্সপোর্ট",
    subtitleEn: "Date-Filtered Sales, Product, Customer, Territory, Due & Financial Statements",
    subtitleBn: "তারিখ অনুযায়ী বিক্রয়, পণ্য, কাস্টমার, এরিয়া, বকেয়া ও লাভ-ক্ষতির বিস্তারিত রিপোর্ট",
    icon: BarChart3,
    colorClass: "text-pink-600 dark:text-pink-400",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/30",
    routeHint: "/#/reports",
    overviewEn:
      "The Reports module (restricted to Super Admin) compiles date-filtered business intelligence across sales, product velocity, customer ledgers, territory performance, collection efficiency, expenses, and Profit & Loss, with one-click Excel (.xlsx) and print exports.",
    overviewBn:
      "রিপোর্ট মডিউল (সুপার অ্যাডমিনের জন্য সংরক্ষিত) থেকে নির্দিষ্ট তারিখ বা মাসের বিক্রয়, পণ্যভিত্তিক বিক্রয়, কাস্টমার ও এরিয়া পারফরম্যান্স, কালেকশন, খরচ এবং লাভ-ক্ষতির (Profit & Loss) পূর্ণাঙ্গ রিপোর্ট দেখা ও এক্সেল (.xlsx) ফাইলে ডাউনলোড করা যায়।",
    callouts: [
      {
        num: "①",
        labelEn: "Date Range & Preset Period Filters",
        labelBn: "তারিখ ও সময়কাল ফিল্টার",
        descEn: "Filter reports by Today, This Week, This Month, This Year, or custom Start Date and End Date.",
        descBn: "আজ, এই সপ্তাহ, চলতি মাস, চলতি বছর অথবা নির্দিষ্ট শুরুর তারিখ ও শেষ তারিখ দিয়ে যেকোনো রিপোর্ট ফিল্টার করুন।",
      },
      {
        num: "②",
        labelEn: "Multi-Tab Analytical Breakdown",
        labelBn: "মাল্টি-ট্যাব অ্যানালিটিক্যাল রিপোর্ট",
        descEn: "Switch between Sales Summary, Product-Wise Sales, Customer-Wise Due, Territory Performance, and Expense Analysis.",
        descBn: "বিক্রয় সামারি, পণ্যভিত্তিক বিক্রয়, কাস্টমার বকেয়া, এরিয়াভিত্তিক বিক্রয় এবং খরচের বিশ্লেষণ আলাদা ট্যাবে দেখুন।",
      },
      {
        num: "③",
        labelEn: "One-Click Export Excel & Print PDF",
        labelBn: "এক ক্লিকে এক্সেল ও পিডিএফ এক্সপোর্ট",
        descEn: "Download formatted spreadsheets for accounting audits or print executive summary statements.",
        descBn: "হিসাব নিরীক্ষা বা সংরক্ষণের জন্য এক ক্লিকেই রিপোর্টগুলো এক্সেল শিটে ডাউনলোড অথবা প্রিন্ট করে নিন।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Select Date Window & Report Category",
        titleBn: "ধাপ ১: তারিখের সীমা ও রিপোর্টের ধরন নির্বাচন করুন",
        descEn: "Choose your desired date range at the top of the Reports page to recalculate all charts and tables dynamically.",
        descBn: "রিপোর্ট পেজের উপরে শুরুর তারিখ ও শেষ তারিখ নির্বাচন করলেই সকল চার্ট ও টেবিল ওই সময়ের ডেটা অনুযায়ী আপডেট হয়ে যাবে।",
      },
      {
        titleEn: "Step 2: Export Clean Excel Workbooks",
        titleBn: "ধাপ ২: এক্সেল ফাইল ডাউনলোড করুন",
        descEn: "Click 'Export Excel' to download properly formatted columns ready for Microsoft Excel or Google Sheets.",
        descBn: "'Export Excel' বাটনে ক্লিক করে মাইক্রোসফট এক্সেল বা গুগল শিটে ব্যবহারের উপযোগী ফাইল ডাউনলোড করুন।",
      },
    ],
    tipEn: "Run the Monthly Sales & Due Report on the last day of every month and archive the exported Excel file for quarterly tax and audit reviews.",
    tipBn: "প্রতি মাসের শেষ দিনে মাসিক বিক্রয় ও বকেয়া রিপোর্ট এক্সেলে ডাউনলোড করে প্রতিষ্ঠানের অডিট ফাইলে সংরক্ষণ করুন।",
    mockupType: "reports",
  },
  {
    id: "users-notifications",
    number: "12",
    titleEn: "User Management & System Notifications",
    titleBn: "ইউজার ম্যানেজমেন্ট ও সিস্টেম নোটিফিকেশন",
    subtitleEn: "+ Add New User, Role/Password Management & Automated Alert Center",
    subtitleBn: "নতুন ইউজার তৈরি, রোল ও পাসওয়ার্ড পরিবর্তন এবং স্বয়ংক্রিয় সতর্কবার্তা",
    icon: UserCog,
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/30",
    routeHint: "/#/users",
    overviewEn:
      "The User Management portal allows Super Admins to provision new Super Admin and Sales Officer accounts with sanitized dual-write persistence, edit emails/phones/passwords, suspend inactive accounts, and monitor real-time system notifications.",
    overviewBn:
      "ইউজার ম্যানেজমেন্ট পোর্টাল থেকে সুপার অ্যাডমিন নতুন ইউজার অ্যাকাউন্ট (Super Admin বা Sales Officer) তৈরি করতে, ইমেইল/ফোন/পাসওয়ার্ড পরিবর্তন করতে এবং যেকোনো অ্যাকাউন্ট সক্রিয় বা নিষ্ক্রিয় (Active/Inactive) করতে পারেন। পাশাপাশি নোটিফিকেশন সেন্টারে স্টক ও বকেয়ার সকল সতর্কবার্তা পাওয়া যায়।",
    callouts: [
      {
        num: "①",
        labelEn: "+ Add New User & Live Sync",
        labelBn: "+ নতুন ইউজার যোগ ও লাইভ সিঙ্ক",
        descEn: "Create accounts with Full Name, Email, Phone, Password, and Role (Super Admin / Sales Officer) with instant cloud & local dual-write.",
        descBn: "নাম, ইমেইল, ফোন নম্বর, পাসওয়ার্ড ও রোল দিয়ে নতুন ইউজার তৈরি করুন—যা ডুয়াল-রাইট প্রযুক্তিতে ক্লাউড ও লোকাল স্টোরে স্থায়ীভাবে সংরক্ষিত হয়।",
      },
      {
        num: "②",
        labelEn: "Edit Credentials & Self-Lockout Safety Guard",
        labelBn: "প্রোফাইল এডিট ও সেলফ-লকআউট সেফটি গার্ড",
        descEn: "Reset staff passwords or roles anytime. Built-in safety guards prevent you from accidentally deleting or demoting your own active admin account.",
        descBn: "যেকোনো ইউজারের তথ্য বা পাসওয়ার্ড আপডেট করুন। ভুলবশত নিজের সুপার অ্যাডমিন অ্যাকাউন্ট ডিলিট বা ডিমোট হওয়া রোধ করতে এতে বিশেষ সেফটি গার্ড রয়েছে।",
      },
      {
        num: "③",
        labelEn: "Real-Time Notifications Center",
        labelBn: "রিয়েল-টাইম নোটিফিকেশন সেন্টার",
        descEn: "Click the top-right Bell icon to view Low Stock Alerts, Overdue Payment Reminders, and Order Status updates.",
        descBn: "উপরের ডানপাশের বেল (Bell) আইকনে ক্লিক করে কম স্টকের সতর্কতা, বকেয়া তাগিদ এবং অর্ডারের সর্বশেষ নোটিফিকেশনগুলো দেখুন।",
      },
    ],
    steps: [
      {
        titleEn: "Step 1: Provision a Sales Officer Account",
        titleBn: "ধাপ ১: নতুন সেলস অফিসার অ্যাকাউন্ট তৈরি করুন",
        descEn: "Click '+ Add New User', enter the officer's name, email, phone, and password, choose 'Sales Officer', and click 'Create User'.",
        descBn: "'+ Add New User'-এ ক্লিক করে অফিসারের নাম, ইমেইল, ফোন ও পাসওয়ার্ড দিন, রোল হিসেবে 'Sales Officer' সিলেক্ট করে 'Create User'-এ ক্লিক করুন।",
      },
      {
        titleEn: "Step 2: Assign Officer to Orders & Collections",
        titleBn: "ধাপ ২: অর্ডার ও কালেকশনে অফিসার অ্যাসাইন করুন",
        descEn: "Newly created Sales Officers immediately appear in the Sales Officer dropdowns across Orders, Accounts, and SFA.",
        descBn: "নতুন সেলস অফিসার তৈরি করার সাথে সাথেই অর্ডার, কালেকশন ও সেলস ফোর্স পেজের ড্রপডাউনে তার নাম স্বয়ংক্রিয়ভাবে যুক্ত হয়ে যাবে।",
      },
    ],
    tipEn: "Each user is assigned a clean Employee ID badge (e.g., EMP-001 for Admins, SO-101 for Sales Officers) for easy identification on invoices and reports.",
    tipBn: "সহজে শনাক্ত করার জন্য প্রতিটি অ্যাডমিনকে EMP-001 এবং সেলস অফিসারকে SO-101 ফরম্যাটে স্বয়ংক্রিয় এমপ্লয়ি কোড প্রদান করা হয়।",
    mockupType: "users",
  },
  {
    id: "troubleshooting-checklist",
    number: "13",
    titleEn: "Troubleshooting & Daily Operational Checklist",
    titleBn: "সমস্যা সমাধান ও দৈনন্দিন কাজের চেকলিস্ট",
    subtitleEn: "Hard Refresh (Ctrl + F5), Live Cloud Sync & Day-End Closing Routine",
    subtitleBn: "হার্ড রিফ্রেশ (Ctrl + F5), লাইভ সিঙ্ক এবং প্রতিদিনের হিসাব ক্লোজিং রুটিন",
    icon: CheckCircle2,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    routeHint: "/#/manual",
    overviewEn:
      "Follow these standard operating procedures and quick troubleshooting steps to ensure 100% data consistency across all company computers and mobile devices every day.",
    overviewBn:
      "প্রতিদিন অফিসের সকল কম্পিউটার ও মোবাইলে ১০০% নির্ভুল ডেটা ও হিসাবের মিল বজায় রাখতে নিচের দৈনন্দিন চেকলিস্ট এবং সমস্যা সমাধানের নিয়মাবলী অনুসরণ করুন।",
    callouts: [
      {
        num: "①",
        labelEn: "Hard Refresh (Ctrl + F5 / Cmd + Shift + R)",
        labelBn: "হার্ড রিফ্রেশ (Ctrl + F5)",
        descEn: "If a browser tab was left open for days, press Ctrl + F5 to load the latest application build and fresh cloud schema.",
        descBn: "ব্রাউজারে কোনো পেজ দীর্ঘক্ষণ খোলা থাকলে বা নতুন আপডেট আসলে কিবোর্ডে Ctrl + F5 চেপে হার্ড রিফ্রেশ দিন।",
      },
      {
        num: "②",
        labelEn: "Click 'Live Sync' Before Day-End Closing",
        labelBn: "দিনশেষে 'Live Sync' বাটনে ক্লিক করুন",
        descEn: "Click 'Live Sync' on Procurement, Accounts, or User Management to guarantee all pending local mutations are pushed and verified.",
        descBn: "দিনের হিসাব বন্ধ করার আগে 'Live Sync' বাটনে ক্লিক করুন, যাতে সকল ডিভাইসের ডেটা ১০০% ক্লাউডে সিঙ্ক ও যাচাই হয়ে যায়।",
      },
      {
        num: "③",
        labelEn: "Export JSON / Excel Backup",
        labelBn: "নিয়মিত ব্যাকআপ ডাউনলোড",
        descEn: "Use the Backup & Restore button in Procurement or Export Excel in Reports to keep an offline audit archive.",
        descBn: "সাপ্তাহিক বা মাসিক ভিত্তিতে প্রকিউরমেন্ট ব্যাকআপ এবং রিপোর্ট পেজ থেকে এক্সেল শিট ডাউনলোড করে সংরক্ষণ করুন।",
      },
    ],
    steps: [
      {
        titleEn: "Morning Routine (সকালের রুটিন)",
        titleBn: "সকালের রুটিন (Morning Routine)",
        descEn: "1. Open Dashboard & click Refresh. 2. Run Executive AI Insights to check low-stock SKUs. 3. Review Today's SFA Route Plan.",
        descBn: "১. ড্যাশবোর্ড ওপেন করে Refresh দিন। ২. AI Insights রান করে কম স্টকের পণ্যগুলো দেখুন। ৩. আজকের SFA রুট প্ল্যান যাচাই করুন।",
      },
      {
        titleEn: "Daytime Operations (দিনের কার্যক্রম)",
        titleBn: "দিনের কার্যক্রম (Daytime Operations)",
        descEn: "1. Enter Factory Purchase Chalans before dispatching new stock. 2. Progress approved orders to Delivered. 3. Log Cash Collections with receipt numbers.",
        descBn: "১. ফ্যাক্টরি থেকে নতুন মাল আসলে আগে Purchase Chalan এন্ট্রি করুন। ২. ডেলিভারি সম্পন্ন হলে অর্ডার স্ট্যাটাস Delivered করুন। ৩. প্রতিটি নগদ আদায়ের সাথে সাথে Cash Collection এন্ট্রি দিন।",
      },
      {
        titleEn: "Evening Closing Checklist (সন্ধ্যার ক্লোজিং চেকলিস্ট)",
        titleBn: "দিনশেষের ক্লোজিং চেকলিস্ট (Evening Closing Checklist)",
        descEn: "1. Verify Sales Officer Evening Handover PINs. 2. Log all daily OPEX & Supplier Payments. 3. Match Daily Cash Book Net Cash Flow with physical cash drawer.",
        descBn: "১. সেলস অফিসারদের ইভিনিং হ্যান্ডওভার পিন যাচাই করুন। ২. দিনের সকল অফিস খরচ ও সাপ্লায়ার পেমেন্ট এন্ট্রি সম্পন্ন করুন। ৩. Daily Cash Book-এর নিট ক্যাশ ব্যালেন্সের সাথে ক্যাশ ড্রয়ারের নগদ টাকা মিলিয়ে নিন।",
      },
    ],
    tipEn: "You can print or save this entire illustrated manual as an A4 PDF anytime by clicking the 'Download PDF (A4)' button at the top right!",
    tipBn: "উপরের ডানপাশে থাকা 'Download PDF (A4)' বাটনে ক্লিক করে যেকোনো সময় এই সম্পূর্ণ সচিত্র ম্যানুয়ালটি A4 সাইজের PDF হিসেবে সেভ বা প্রিন্ট করে রাখতে পারবেন!",
    mockupType: "troubleshooting",
  },
];

function AnnotatedMockupPreview({ type }: { type: ManualSection["mockupType"] }) {
  switch (type) {
    case "cloud":
      return (
        <div className="rounded-xl border border-sky-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-sky-300">HAMKO Sales ERP • Cloud Header</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                ③ 19-Table CDC Active
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200 font-semibold">
                ① Live Sync
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-semibold">
                ② EN / বাং
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
              <p className="text-slate-400">Local Cache (Instant)</p>
              <p className="font-bold text-emerald-400 mt-0.5">0ms Cold-Start</p>
            </div>
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
              <p className="text-slate-400">Payload Sanitizer</p>
              <p className="font-bold text-sky-400 mt-0.5">RFC 4122 UUID</p>
            </div>
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
              <p className="text-slate-400">Supabase Realtime</p>
              <p className="font-bold text-purple-400 mt-0.5">Multi-Device Sync</p>
            </div>
          </div>
        </div>
      );
    case "auth":
      return (
        <div className="rounded-xl border border-purple-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-purple-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> ① Secure ERP Sign-In Portal
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
              ③ RBAC Protected
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5 space-y-1.5">
              <div className="text-[10px] text-slate-400">Email: admin@hamko.com.bd</div>
              <div className="text-[10px] text-slate-400">Password: ••••••••</div>
              <div className="flex items-center justify-between pt-1">
                <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold">
                  Sign In
                </span>
                <span className="text-[10px] text-amber-300 underline">② Forgot Password? (OTP)</span>
              </div>
            </div>
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-purple-300 font-semibold">Super Admin (EMP-001)</span>
                <span className="text-emerald-400">All 12 Modules</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sky-300 font-semibold">Accountant / Manager</span>
                <span className="text-emerald-400">Orders & Finance</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-300 font-semibold">Sales Officer (SO-101)</span>
                <span className="text-emerald-400">CRM, Orders, SFA</span>
              </div>
            </div>
          </div>
        </div>
      );
    case "dashboard":
      return (
        <div className="rounded-xl border border-blue-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2.5 shadow-inner">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px]">
            {[
              { lbl: "① Today's Sales", val: "৳48,500", c: "text-sky-400" },
              { lbl: "Monthly Sales", val: "৳14.2L", c: "text-blue-400" },
              { lbl: "Collection", val: "৳11.8L", c: "text-emerald-400" },
              { lbl: "Market Due", val: "৳2.4L", c: "text-amber-400" },
              { lbl: "Customers", val: "142 Active", c: "text-violet-400" },
              { lbl: "Low Stock", val: "3 Alerts", c: "text-rose-400" },
            ].map((k) => (
              <div key={k.lbl} className="rounded bg-slate-900 border border-slate-800 p-1.5">
                <p className="text-slate-400 truncate">{k.lbl}</p>
                <p className={`font-bold ${k.c}`}>{k.val}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-950/40 border border-blue-500/30 p-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="font-semibold text-blue-200">Executive AI Intelligence</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/40">
                Live Cloud Sync
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-semibold">
                ② Generate AI Insights
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px]">
                ③ 7-Day Trend Chart
              </span>
            </div>
          </div>
        </div>
      );
    case "crm":
      return (
        <div className="rounded-xl border border-violet-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-violet-600 text-white text-[10px] font-semibold">
                ① + Add Customer
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-violet-200 text-[10px]">
                ① Manage Areas
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 text-[10px]">
              ② Filter: Overdue / Dealer / Territory
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 p-2 text-[11px]">
            <div>
              <p className="font-semibold text-white">Bismillah Crockeries & Gift (Dealer)</p>
              <p className="text-[10px] text-slate-400">Chittagong • +880 1711-XXXXXX</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                Due: ৳34,500
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px]">
                ③ AI Reminder
              </span>
            </div>
          </div>
        </div>
      );
    case "products":
      return (
        <div className="rounded-xl border border-amber-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-semibold">
              ① + Add Product SKU
            </span>
            <span className="text-[10px] text-amber-300">
              ② Multi-Tier Pricing: DP • D10 • B12 • MRP
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 p-2 text-[11px]">
            <div>
              <p className="font-semibold text-white">HAMKO Aluminum Pressure Cooker 5.5L</p>
              <p className="text-[10px] text-slate-400">SKU: HPC-550 • DP: ৳1,450 • D10: ৳1,380 • MRP: ৳1,850</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-semibold">
              ③ Low Stock: 4 pcs (Reorder: 10)
            </span>
          </div>
        </div>
      );
    case "orders":
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                ① + New Order
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[10px]">
                ① Smart Voice AI Order
              </span>
            </div>
            <span className="text-[10px] text-emerald-300">
              ② Status: Draft → Pending → Approved → Delivered
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 p-2 text-[11px]">
            <div>
              <p className="font-semibold text-white">ORD-202611-089 • Mayer Doa Store</p>
              <p className="text-[10px] text-slate-400">Officer: Tanvir Ahmed (SO-101) • Total: ৳28,400</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">Delivered</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 text-[10px]">
                ③ Print Invoice / Return
              </span>
            </div>
          </div>
        </div>
      );
    case "procurement":
      return (
        <div className="rounded-xl border border-cyan-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-cyan-600 text-white text-[10px] font-semibold">
                ① + Add Purchase Chalan
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                ② $ Record Payment
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px]">
                ② Debit Note
              </span>
            </div>
            <span className="text-[10px] text-cyan-300">③ Running Payable Balance: ৳1,45,000</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded bg-slate-900 border border-slate-800 p-2">
              <span className="text-cyan-300 font-semibold">CHALAN #CH-904 (+)</span>
              <p className="text-slate-300 mt-0.5">Purchase: +৳2,20,000 (Stock In)</p>
            </div>
            <div className="rounded bg-slate-900 border border-slate-800 p-2">
              <span className="text-emerald-300 font-semibold">PAYMENT #PAY-312 (−)</span>
              <p className="text-slate-300 mt-0.5">Paid via Bank: −৳75,000</p>
            </div>
          </div>
        </div>
      );
    case "inventory":
      return (
        <div className="rounded-xl border border-orange-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="px-2 py-0.5 rounded bg-orange-600 text-white text-[10px] font-semibold">
              ① + Record Stock Transaction
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-orange-200 text-[10px]">
              ② Tabs: All SKUs • Low Stock • Out of Stock
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 p-2 text-[11px]">
            <span>③ Audit Log: Stock In (+50 pcs Chalan) • Stock Out (−12 pcs ORD-089)</span>
            <span className="text-emerald-400 font-semibold">Main Warehouse</span>
          </div>
        </div>
      );
    case "accounts":
      return (
        <div className="rounded-xl border border-teal-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                ① + Cash Collection
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-semibold">
                ② + Expense Entry (OPEX)
              </span>
            </div>
            <span className="text-[10px] text-teal-300">
              ③ Tabs: Collections • Expenses • Daily Cash Book • Customer Due
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded bg-slate-900 border border-slate-800 p-2">
              <p className="text-slate-400">Total Inflow (+)</p>
              <p className="font-bold text-emerald-400">৳3,80,000</p>
            </div>
            <div className="rounded bg-slate-900 border border-slate-800 p-2">
              <p className="text-slate-400">OPEX + Supplier (−)</p>
              <p className="font-bold text-rose-400">৳1,25,000</p>
            </div>
            <div className="rounded bg-slate-900 border border-slate-800 p-2">
              <p className="text-slate-400">Net Cash Flow</p>
              <p className="font-bold text-sky-400">৳2,55,000</p>
            </div>
          </div>
        </div>
      );
    case "sfa":
      return (
        <div className="rounded-xl border border-indigo-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold">
                ① + Log Shop Visit
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-200 text-[10px]">
                ① Route Plan (Sat–Thu)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
              ③ Evening Cash Handover (PIN: 4829)
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 p-2 text-[10px]">
            <span>② Monthly Target: ৳5,00,000 • Achieved: ৳4,10,000 (82%)</span>
            <span className="text-emerald-400 font-bold">On Track</span>
          </div>
        </div>
      );
    case "reports":
      return (
        <div className="rounded-xl border border-pink-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-pink-200 text-[10px]">
              ① Period: 01 Nov 2026 → 30 Nov 2026
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" /> ③ Export Excel (.xlsx)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px]">
                ③ Print PDF
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-300">
            ② Report Views: Daily/Monthly Sales • Product-Wise • Customer Due • Territory • Profit & Loss
          </div>
        </div>
      );
    case "users":
      return (
        <div className="rounded-xl border border-rose-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-semibold">
                ① + Add New User
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px]">
                ① Live Sync
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] flex items-center gap-1">
              <Bell className="h-3 w-3" /> ③ Notifications Center
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 p-2 text-[11px]">
            <div>
              <p className="font-semibold text-white">Tanvir Ahmed • ID: SO-101</p>
              <p className="text-[10px] text-slate-400">tanvir@hamko.com.bd • Role: Sales Officer</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 text-[10px]">
              ② Edit Role / Reset Password
            </span>
          </div>
        </div>
      );
    case "troubleshooting":
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-slate-950 text-slate-100 p-3.5 text-xs space-y-2 shadow-inner">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
            <div className="rounded bg-slate-900 border border-slate-800 p-2">
              <p className="text-amber-300 font-semibold">① Hard Refresh</p>
              <p className="text-slate-300 mt-0.5">Press Ctrl + F5 to reload latest cache & schema.</p>
            </div>
            <div className="rounded bg-slate-900 border border-slate-800 p-2">
              <p className="text-sky-300 font-semibold">② Force Live Sync</p>
              <p className="text-slate-300 mt-0.5">Click Live Sync to reconcile all 19 cloud tables.</p>
            </div>
            <div className="rounded bg-slate-900 border border-slate-800 p-2">
              <p className="text-emerald-300 font-semibold">③ Day-End Audit</p>
              <p className="text-slate-300 mt-0.5">Verify Handover PIN & Daily Cash Book balance.</p>
            </div>
          </div>
        </div>
      );
  }
}

export function UserManualPage() {
  const [langMode, setLangMode] = useState<ManualLangMode>("bilingual");
  const [searchQuery, setSearchQuery] = useState("");

  const showEn = langMode === "bilingual" || langMode === "en";
  const showBn = langMode === "bilingual" || langMode === "bn";

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return MANUAL_SECTIONS;
    return MANUAL_SECTIONS.filter(
      (s) =>
        s.titleEn.toLowerCase().includes(q) ||
        s.titleBn.toLowerCase().includes(q) ||
        s.subtitleEn.toLowerCase().includes(q) ||
        s.subtitleBn.toLowerCase().includes(q) ||
        s.overviewEn.toLowerCase().includes(q) ||
        s.overviewBn.toLowerCase().includes(q) ||
        s.steps.some(
          (st) =>
            st.titleEn.toLowerCase().includes(q) ||
            st.titleBn.toLowerCase().includes(q) ||
            st.descEn.toLowerCase().includes(q) ||
            st.descBn.toLowerCase().includes(q),
        ),
    );
  }, [searchQuery]);

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="manual-root space-y-6 pb-12">
      {/* A4 Print & PDF Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body, html {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          aside, header, .no-print {
            display: none !important;
          }
          .lg\\:pl-64 {
            padding-left: 0 !important;
          }
          main {
            padding: 0 !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-page-break {
            break-before: page !important;
            page-break-before: always !important;
          }
        }
      `}</style>

      {/* Top Hero Banner & Action Controls */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-card to-sky-500/10 shadow-sm overflow-hidden print-avoid-break">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground text-xs px-2.5 py-0.5">
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  A-to-Z Illustrated ERP Guide
                </Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  100% Live Cloud Sync Edition
                </Badge>
              </div>
              {showEn && (
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  HAMKO Sales ERP — Complete Illustrated User Manual
                </h1>
              )}
              {showBn && (
                <h2 className="text-lg sm:text-xl font-bold text-primary">
                  হামকো সেলস ইআরপি — সচিত্র বাংলা ও ইংরেজি পূর্ণাঙ্গ ব্যবহারবিধি (A to Z)
                </h2>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
                {showEn && "Step-by-step visual workflows, SVG architecture flowcharts, annotated UI wireframes, and daily operational checklists. "}
                {showBn && "প্রতিটি মডিউলের সচিত্র ডায়াগ্রাম, বাটন পরিচিতি, ধাপে ধাপে কাজের নিয়ম এবং দৈনন্দিন হিসাব মেলানোর গাইডলাইন।"}
              </p>
            </div>

            {/* Action Buttons: Language Switcher & A4 PDF Download */}
            <div className="flex flex-wrap items-center gap-2 no-print shrink-0">
              <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setLangMode("bilingual")}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    langMode === "bilingual"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bilingual / উভয় ভাষা
                </button>
                <button
                  type="button"
                  onClick={() => setLangMode("en")}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    langMode === "en"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  English Only
                </button>
                <button
                  type="button"
                  onClick={() => setLangMode("bn")}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    langMode === "bn"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  বাংলা মাত্র
                </button>
              </div>

              <Button
                onClick={handleDownloadPdf}
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9 px-3.5"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF (A4) / পিডিএফ</span>
              </Button>
            </div>
          </div>

          {/* Search & Quick Module Jump Pills */}
          <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center gap-3 no-print">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search manual (e.g. Chalan, Due, AI, হ্যান্ডওভার)..."
                className="pl-9 h-8 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {MANUAL_SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#manual-${sec.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`manual-${sec.id}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-muted/70 hover:bg-primary/15 hover:text-primary transition-colors border border-border/60"
                >
                  {sec.number}. {langMode === "bn" ? sec.titleBn.split(" ")[0] : sec.titleEn.split(" ")[0]}
                </a>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================================
          INTERACTIVE SVG WORKFLOW DIAGRAMS (সচিত্র ফ্লোচার্ট ও আর্কিটেকচার ডায়াগ্রাম)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print-avoid-break">
        {/* Diagram 1: Order-to-Cash Lifecycle */}
        <Card className="border-emerald-500/30 shadow-xs overflow-hidden print-avoid-break">
          <CardHeader className="pb-2 bg-emerald-500/5 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <ShoppingCart className="h-4 w-4" />
              {langMode === "bn"
                ? "ডায়াগ্রাম ১: অর্ডার থেকে ক্যাশ কালেকশন ফ্লো"
                : "Diagram 1: Order-to-Cash Lifecycle"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5">
            <svg viewBox="0 0 380 185" className="w-full h-auto" role="img" aria-label="Order to Cash Flowchart">
              <rect x="8" y="10" width="105" height="44" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
              <text x="60" y="29" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">1. Draft / Pending</text>
              <text x="60" y="44" textAnchor="middle" fill="#94a3b8" fontSize="9.5">খসড়া / অপেক্ষমাণ</text>

              <path d="M115 32 L135 32" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowG)" />

              <rect x="138" y="10" width="105" height="44" rx="8" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5" />
              <text x="190" y="29" textAnchor="middle" fill="#dbeafe" fontSize="11" fontWeight="bold">2. Approved</text>
              <text x="190" y="44" textAnchor="middle" fill="#93c5fd" fontSize="9.5">অনুমোদিত অর্ডার</text>

              <path d="M245 32 L265 32" stroke="#10b981" strokeWidth="2" />

              <rect x="268" y="10" width="104" height="44" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
              <text x="320" y="29" textAnchor="middle" fill="#d1fae5" fontSize="11" fontWeight="bold">3. Delivered</text>
              <text x="320" y="44" textAnchor="middle" fill="#6ee7b7" fontSize="9.5">স্টক কর্তন ও বকেয়া</text>

              <path d="M320 56 L320 82 L190 82 L190 98" stroke="#10b981" strokeWidth="2" fill="none" />

              <rect x="20" y="100" width="160" height="58" rx="8" fill="#0f766e" stroke="#14b8a6" strokeWidth="1.5" />
              <text x="100" y="122" textAnchor="middle" fill="#ccfbf1" fontSize="11" fontWeight="bold">4. Cash Collection (+)</text>
              <text x="100" y="138" textAnchor="middle" fill="#99f6e4" fontSize="9.5">নগদ / ব্যাংক / বিকাশ আদায়</text>
              <text x="100" y="151" textAnchor="middle" fill="#5eead4" fontSize="8.5">Money Receipt (COL-XXXX)</text>

              <path d="M182 129 L208 129" stroke="#14b8a6" strokeWidth="2" />

              <rect x="210" y="100" width="155" height="58" rx="8" fill="#312e81" stroke="#6366f1" strokeWidth="1.5" />
              <text x="287" y="122" textAnchor="middle" fill="#e0e7ff" fontSize="11" fontWeight="bold">5. Auto Due Reduction</text>
              <text x="287" y="138" textAnchor="middle" fill="#c7d2fe" fontSize="9.5">স্বয়ংক্রিয় বকেয়া হ্রাস</text>
              <text x="287" y="151" textAnchor="middle" fill="#a5b4fc" fontSize="8.5">Cash Book &amp; CRM Updated</text>
            </svg>
          </CardContent>
        </Card>

        {/* Diagram 2: Procurement & Running Balance Flow */}
        <Card className="border-cyan-500/30 shadow-xs overflow-hidden print-avoid-break">
          <CardHeader className="pb-2 bg-cyan-500/5 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
              <Truck className="h-4 w-4" />
              {langMode === "bn"
                ? "ডায়াগ্রাম ২: প্রকিউরমেন্ট ও সাপ্লায়ার ব্যালেন্স ফ্লো"
                : "Diagram 2: Procurement & Payable Balance"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5">
            <svg viewBox="0 0 380 185" className="w-full h-auto" role="img" aria-label="Procurement Flowchart">
              <rect x="10" y="10" width="165" height="48" rx="8" fill="#164e63" stroke="#06b6d4" strokeWidth="1.5" />
              <text x="92" y="30" textAnchor="middle" fill="#cffafe" fontSize="11" fontWeight="bold">1. Purchase Chalan (+)</text>
              <text x="92" y="46" textAnchor="middle" fill="#67e8f9" fontSize="9.5">ফ্যাক্টরি চালান ও স্টক ইন</text>

              <path d="M177 34 L203 34" stroke="#06b6d4" strokeWidth="2" />

              <rect x="205" y="10" width="165" height="48" rx="8" fill="#7c2d12" stroke="#f97316" strokeWidth="1.5" />
              <text x="287" y="30" textAnchor="middle" fill="#ffedd5" fontSize="11" fontWeight="bold">2. Warehouse Stock In</text>
              <text x="287" y="46" textAnchor="middle" fill="#fdba74" fontSize="9.5">গোডাউন মজুদ স্বয়ংক্রিয় বৃদ্ধি</text>

              <path d="M287 60 L287 82 L92 82 L92 98" stroke="#06b6d4" strokeWidth="2" fill="none" />

              <rect x="10" y="100" width="165" height="58" rx="8" fill="#065f46" stroke="#10b981" strokeWidth="1.5" />
              <text x="92" y="122" textAnchor="middle" fill="#d1fae5" fontSize="11" fontWeight="bold">3. Supplier Payment (−)</text>
              <text x="92" y="138" textAnchor="middle" fill="#6ee7b7" fontSize="9.5">পেমেন্ট ও ডেবিট নোট বাদ</text>
              <text x="92" y="151" textAnchor="middle" fill="#34d399" fontSize="8.5">Cash / Bank / Cheque / MFS</text>

              <path d="M177 129 L203 129" stroke="#10b981" strokeWidth="2" />

              <rect x="205" y="100" width="165" height="58" rx="8" fill="#3b0764" stroke="#a855f7" strokeWidth="1.5" />
              <text x="287" y="122" textAnchor="middle" fill="#f3e8ff" fontSize="11" fontWeight="bold">4. Running Payable Due</text>
              <text x="287" y="138" textAnchor="middle" fill="#d8b4fe" fontSize="9.5">সাপ্লায়ারের নিট পাওনা ব্যালেন্স</text>
              <text x="287" y="151" textAnchor="middle" fill="#c084fc" fontSize="8.5">Opening + Chalan − Paid</text>
            </svg>
          </CardContent>
        </Card>

        {/* Diagram 3: 100% Live Cloud Sync Architecture */}
        <Card className="border-sky-500/30 shadow-xs overflow-hidden print-avoid-break">
          <CardHeader className="pb-2 bg-sky-500/5 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-sky-700 dark:text-sky-400">
              <Cloud className="h-4 w-4" />
              {langMode === "bn"
                ? "ডায়াগ্রাম ৩: ১০০% লাইভ ক্লাউড সিঙ্ক আর্কিটেকচার"
                : "Diagram 3: 100% Live Cloud Sync"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5">
            <svg viewBox="0 0 380 185" className="w-full h-auto" role="img" aria-label="Cloud Sync Flowchart">
              <rect x="10" y="10" width="165" height="48" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="92" y="30" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontWeight="bold">1. User CRUD Action</text>
              <text x="92" y="46" textAnchor="middle" fill="#7dd3fc" fontSize="9.5">পিসি বা মোবাইলে ডেটা এন্ট্রি</text>

              <path d="M177 34 L203 34" stroke="#38bdf8" strokeWidth="2" />

              <rect x="205" y="10" width="165" height="48" rx="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
              <text x="287" y="30" textAnchor="middle" fill="#e0e7ff" fontSize="11" fontWeight="bold">2. Sanitized Dual-Write</text>
              <text x="287" y="46" textAnchor="middle" fill="#a5b4fc" fontSize="9.5">UUID যাচাই ও ডুয়াল সেভ</text>

              <path d="M287 60 L287 82 L92 82 L92 98" stroke="#38bdf8" strokeWidth="2" fill="none" />

              <rect x="10" y="100" width="165" height="58" rx="8" fill="#0c4a6e" stroke="#0ea5e9" strokeWidth="1.5" />
              <text x="92" y="122" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontWeight="bold">3. Supabase 19-Table CDC</text>
              <text x="92" y="138" textAnchor="middle" fill="#7dd3fc" fontSize="9.5">রিয়েল-টাইম ক্লাউড ব্রডকাস্ট</text>
              <text x="92" y="151" textAnchor="middle" fill="#38bdf8" fontSize="8.5">PostgreSQL Realtime Stream</text>

              <path d="M177 129 L203 129" stroke="#0ea5e9" strokeWidth="2" />

              <rect x="205" y="100" width="165" height="58" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
              <text x="287" y="122" textAnchor="middle" fill="#d1fae5" fontSize="11" fontWeight="bold">4. All Devices Updated</text>
              <text x="287" y="138" textAnchor="middle" fill="#6ee7b7" fontSize="9.5">সকল ডিভাইসে তাৎক্ষণিক সিঙ্ক</text>
              <text x="287" y="151" textAnchor="middle" fill="#34d399" fontSize="8.5">Office PC + Field Mobile</text>
            </svg>
          </CardContent>
        </Card>
      </div>

      {/* =====================================================================
          13 ILLUSTRATED MODULE CHAPTERS (১৩টি পূর্ণাঙ্গ সচিত্র অধ্যায়)
         ===================================================================== */}
      <div className="space-y-6">
        {filteredSections.map((sec) => {
          const Icon = sec.icon;
          return (
            <Card
              key={sec.id}
              id={`manual-${sec.id}`}
              className={`border ${sec.borderClass} shadow-xs overflow-hidden print-avoid-break`}
            >
              {/* Chapter Header */}
              <CardHeader className={`pb-3 ${sec.bgClass} border-b border-border/50`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card border ${sec.borderClass} ${sec.colorClass} font-bold shadow-xs`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`font-mono text-xs ${sec.colorClass} ${sec.borderClass}`}>
                          CHAPTER {sec.number}
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          Route: {sec.routeHint}
                        </Badge>
                      </div>
                      {showEn && (
                        <CardTitle className="text-base sm:text-lg font-bold text-foreground mt-1">
                          {sec.titleEn}
                        </CardTitle>
                      )}
                      {showBn && (
                        <p className={`text-sm sm:text-base font-bold ${sec.colorClass} mt-0.5`}>
                          {sec.titleBn}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    {showEn && <p className="text-xs font-medium text-muted-foreground">{sec.subtitleEn}</p>}
                    {showBn && <p className="text-xs text-muted-foreground">{sec.subtitleBn}</p>}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Bilingual Module Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl bg-muted/30 border border-border/60 p-3.5">
                  {showEn && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3 text-primary" /> Overview (English)
                      </span>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{sec.overviewEn}</p>
                    </div>
                  )}
                  {showBn && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <Globe className="h-3 w-3 text-primary" /> মডিউল পরিচিতি (বাংলা)
                      </span>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{sec.overviewBn}</p>
                    </div>
                  )}
                </div>

                {/* Annotated UI Wireframe Preview Card */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {langMode === "bn"
                      ? "সচিত্র ইন্টারফেস প্রিভিউ ও বাটন নির্দেশিকা (Annotated UI Mockup):"
                      : "Illustrated UI Screen Wireframe & Callout Badges (① ② ③):"}
                  </p>
                  <AnnotatedMockupPreview type={sec.mockupType} />
                </div>

                {/* Numbered Callout Badges Breakdown (① ② ③) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {sec.callouts.map((c) => (
                    <div
                      key={c.num + c.labelEn}
                      className="rounded-xl border border-border/80 bg-card p-3 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${sec.bgClass} ${sec.colorClass} font-bold text-xs`}>
                          {c.num}
                        </span>
                        <div>
                          {showEn && <p className="text-xs font-bold text-foreground">{c.labelEn}</p>}
                          {showBn && <p className={`text-xs font-semibold ${sec.colorClass}`}>{c.labelBn}</p>}
                        </div>
                      </div>
                      {showEn && <p className="text-xs text-muted-foreground leading-relaxed">{c.descEn}</p>}
                      {showBn && <p className="text-xs text-foreground/85 leading-relaxed">{c.descBn}</p>}
                    </div>
                  ))}
                </div>

                {/* Step-by-Step Operational Workflow Cards */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    {langMode === "bn" ? "ধাপে ধাপে কাজের নিয়ম (Step-by-Step Guide):" : "Step-by-Step Operational Workflow:"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sec.steps.map((st, idx) => (
                      <div
                        key={st.titleEn + idx}
                        className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-1.5"
                      >
                        {showEn && (
                          <p className="text-xs sm:text-sm font-bold text-foreground">{st.titleEn}</p>
                        )}
                        {showBn && (
                          <p className="text-xs sm:text-sm font-bold text-primary">{st.titleBn}</p>
                        )}
                        {showEn && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{st.descEn}</p>
                        )}
                        {showBn && (
                          <p className="text-xs text-foreground/90 leading-relaxed">{st.descBn}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro-Tip & Warning Callout Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2.5">
                    <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      {showEn && (
                        <p className="text-foreground/90">
                          <strong className="text-emerald-700 dark:text-emerald-400">💡 Pro-Tip: </strong>
                          {sec.tipEn}
                        </p>
                      )}
                      {showBn && (
                        <p className="text-foreground/90">
                          <strong className="text-emerald-700 dark:text-emerald-400">💡 বিশেষ টিপস: </strong>
                          {sec.tipBn}
                        </p>
                      )}
                    </div>
                  </div>

                  {sec.warningEn && sec.warningBn ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        {showEn && (
                          <p className="text-foreground/90">
                            <strong className="text-amber-700 dark:text-amber-400">⚠️ Important Notice: </strong>
                            {sec.warningEn}
                          </p>
                        )}
                        {showBn && (
                          <p className="text-foreground/90">
                            <strong className="text-amber-700 dark:text-amber-400">⚠️ সতর্কতা: </strong>
                            {sec.warningBn}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 flex items-start gap-2.5">
                      <RefreshCw className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        {showEn && (
                          <p className="text-foreground/90">
                            <strong className="text-sky-700 dark:text-sky-400">⚡ Live Cloud Guarantee: </strong>
                            Every record saved in this module is sanitized and synchronized in real time across all connected devices.
                          </p>
                        )}
                        {showBn && (
                          <p className="text-foreground/90">
                            <strong className="text-sky-700 dark:text-sky-400">⚡ লাইভ ক্লাউড নিশ্চয়তা: </strong>
                            এই মডিউলে সেভ করা প্রতিটি তথ্য তাৎক্ষণিকভাবে ক্লাউড ডেটাবেসে সংরক্ষিত হয় এবং সকল ডিভাইসে আপডেট দেখায়।
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer Print Bar */}
      <Card className="border-border/60 bg-muted/20 print-avoid-break">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">
              HAMKO Sales ERP • Production Enterprise Distribution &amp; Financial Suite
            </p>
            <p>
              19-Table Realtime Supabase Cloud Architecture • Bilingual English &amp; বাংলা Edition
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="gap-1.5 no-print self-start sm:self-auto"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save A4 PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserManualPage;
