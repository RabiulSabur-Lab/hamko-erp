import { useState, useMemo, useCallback } from "react";
import html2pdf from "html2pdf.js";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Download,
  Printer,
  Search,
  LogIn,
  Users,
  Package,
  ShoppingCart,
  Wallet,
  Warehouse,
  MapPin,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  RefreshCw,
  ArrowRight,
  PhoneCall,
  ClipboardCheck,
  Clock,
  Receipt,
} from "lucide-react";

type ManualLangMode = "bilingual" | "bn" | "en";
type ManualOrientationMode = "hybrid" | "portrait" | "landscape";

interface HowToStep {
  stepNum: string;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
}

interface ScreenCallout {
  badge: string;
  nameBn: string;
  nameEn: string;
  actionBn: string;
  actionEn: string;
}

interface FieldMappingItem {
  elementLabel: string;
  controlTypeBn: string;
  controlTypeEn: string;
  systemBehaviorBn: string;
  systemBehaviorEn: string;
}

interface ManualChapter {
  id: string;
  chapterNo: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  icon: any;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  menuNameBn: string;
  menuNameEn: string;
  whyItMattersBn: string;
  whyItMattersEn: string;
  realScenarioBn: string;
  realScenarioEn: string;
  howToSteps: HowToStep[];
  screenCallouts: ScreenCallout[];
  fieldMappings: FieldMappingItem[];
  proTipBn: string;
  proTipEn: string;
  mistakeWarningBn: string;
  mistakeWarningEn: string;
  mockupKey:
    | "login"
    | "crm"
    | "products"
    | "orders"
    | "collections"
    | "inventory"
    | "sfa"
    | "troubleshooting";
}

const CHAPTERS: ManualChapter[] = [
  {
    id: "ch1-first-day-login",
    chapterNo: "অধ্যায় ১ / Chapter 1",
    titleBn: "প্রথম দিনের প্রস্তুতি ও লগইন (First Day & Login)",
    titleEn: "First Day Preparation, Login & Dashboard Overview",
    subtitleBn: "অ্যাপ ওপেন করা, সেলস অফিসার হিসেবে লগইন এবং ড্যাশবোর্ড পরিচিতি",
    subtitleEn: "How to sign in, verify your profile & territory, and use the Dashboard Quick Actions",
    icon: LogIn,
    accentText: "text-sky-600 dark:text-sky-400",
    accentBg: "bg-sky-500/10",
    accentBorder: "border-sky-500/30",
    menuNameBn: "Login → Dashboard (ড্যাশবোর্ড)",
    menuNameEn: "Login → Dashboard",
    whyItMattersBn:
      "হামকো কুকওয়্যার ইউনিটে সেলস অফিসার হিসেবে আপনার প্রতিদিনের কাজ শুরু হবে এই অ্যাপে লগইন করার মাধ্যমে। লগইন করার পর ড্যাশবোর্ড থেকেই আপনি এক নজরে আজকের বিক্রি, চলতি মাসের কালেকশন, মার্কেটের মোট বকেয়া এবং দ্রুত কাজ করার শর্টকাট বাটনগুলো পেয়ে যাবেন।",
    whyItMattersEn:
      "Your daily field shift starts by signing into the Hamko Sales ERP app. Right after login, the Dashboard gives you an instant view of Today's Sales, Monthly Collections, Market Dues, and one-tap Quick Action buttons.",
    realScenarioBn:
      "বাস্তব উদাহরণ: আপনি সকালে মার্কেটে বের হওয়ার আগে মোবাইলে অ্যাপটি ওপেন করলেন। নিজের ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করে দেখে নিলেন আপনার এরিয়ায় আজ কত টাকা বকেয়া আছে এবং কোনো পণ্যের স্টক কম আছে কি না।",
    realScenarioEn:
      "Real-World Scenario: Before heading to the market at 9:00 AM, you open the app on your phone, log in with your Sales Officer email and password, and check today's sales summary and low-stock cookware alerts.",
    howToSteps: [
      {
        stepNum: "①",
        titleBn: "অ্যাপ ওপেন ও লগইন করুন",
        titleEn: "Open the App & Sign In",
        descBn:
          "মোবাইল বা কম্পিউটারের ব্রাউজারে অ্যাপটি ওপেন করুন। অফিস থেকে দেওয়া আপনার ইমেইল (যেমন: officer@hamko.com.bd) এবং পাসওয়ার্ড লিখে 'Sign In' বাটনে চাপুন।",
        descEn:
          "Open the ERP app on your mobile browser or office PC. Enter your assigned company email and password, then tap 'Sign In'.",
      },
      {
        stepNum: "②",
        titleBn: "ভাষা নির্বাচন ও নিজের প্রোফাইল যাচাই করুন",
        titleEn: "Choose Language (বাং / EN) & Verify Profile",
        descBn:
          "উপরের ডানপাশে 'EN / বাং' বাটনে ট্যাপ করে আপনার সুবিধামতো বাংলা বা ইংরেজি ভাষা সেট করে নিন। ডানপাশের প্রোফাইল আইকনে ট্যাপ করে আপনার নাম ও রোল (Sales Officer) ঠিক আছে কি না দেখুন।",
        descEn:
          "Tap the 'EN / বাং' button in the top bar to switch between Bengali and English anytime. Check your name and 'Sales Officer' badge in the top-right profile menu.",
      },
      {
        stepNum: "③",
        titleBn: "ড্যাশবোর্ডের 'দ্রুত সেবা (Quick Actions)' ব্যবহার করুন",
        titleEn: "Use the Top 'Quick Action Hub' Tiles",
        descBn:
          "ড্যাশবোর্ডের একদম উপরে ৮টি বড় শর্টকাট বাটন আছে: '+ নতুন অর্ডার', '$ ক্যাশ কালেকশন', '+ কাস্টমার', 'ইনভেন্টরি স্টক', 'ফিল্ড ভিজিট' ও 'লাইভ সিঙ্ক'। এক ট্যাপেই সরাসরি যেকোনো কাজে চলে যেতে পারবেন।",
        descEn:
          "At the top of the Dashboard, use the touch-friendly tiles (+ New Order, $ Cash Collection, + Customers, Inventory Stock, Field Visit, Live Sync) to jump straight to your task in one tap.",
      },
      {
        stepNum: "④",
        titleBn: "৬টি সামারি কার্ড ও AI রিপোর্ট দেখে দিন শুরু করুন",
        titleEn: "Check the 6 KPI Cards & Live AI Insights",
        descBn:
          "ড্যাশবোর্ডের ৬টি কার্ডে আজকের বিক্রি, মাসিক বিক্রি, চলতি মাসের কালেকশন, মোট বকেয়া, সক্রিয় কাস্টমার ও কম স্টকের পণ্যের সংখ্যা দেখা যায়। নিচে 'Generate AI Insights'-এ চাপ দিলে কোন পণ্য বেশি চলছে ও কার কাছে বকেয়া বেশি তার রেডিমেড রিপোর্ট পাবেন।",
        descEn:
          "Review the 6 KPI cards for Today's Sales, Monthly Sales, Collections, Outstanding Due, Active Customers, and Low Stock products. Tap 'Generate AI Insights' for an automated market briefing.",
      },
    ],
    screenCallouts: [
      {
        badge: "①",
        nameBn: "+ নতুন অর্ডার / Quick Actions",
        nameEn: "+ New Order / Quick Action Tiles",
        actionBn: "দোকানে বসে এক ট্যাপেই নতুন অর্ডার বা ক্যাশ কালেকশন শুরু করার বাটন।",
        actionEn: "One-tap shortcut tiles at the top of the dashboard for instant field actions.",
      },
      {
        badge: "②",
        nameBn: "লাইভ সিঙ্ক / রিফ্রেশ (Refresh)",
        nameEn: "Live Sync / Refresh Button",
        actionBn: "অফিস ও মার্কেটের সর্বশেষ হিসাব সাথে সাথে আপডেট করে নেওয়ার বাটন।",
        actionEn: "Pulls the latest orders, stock, and balances from the central office cloud.",
      },
      {
        badge: "③",
        nameBn: "ভাষা পরিবর্তন (EN / বাং)",
        nameEn: "Language Toggle (EN / বাং)",
        actionBn: "পুরো সফটওয়্যার এক ক্লিকে বাংলা অথবা ইংরেজিতে দেখার বাটন।",
        actionEn: "Switches all menus, buttons, and labels between Bengali and English.",
      },
    ],
    fieldMappings: [
      {
        elementLabel: "Email & Password → [Sign In]",
        controlTypeBn: "লগইন ইনপুট ও বাটন",
        controlTypeEn: "Text Input & Submit Button",
        systemBehaviorBn: "অফিস থেকে প্রদত্ত ইমেইল ও ন্যূনতম ৬ অক্ষরের পাসওয়ার্ড যাচাই করে আপনার Sales Officer সেশন চালু করে।",
        systemBehaviorEn: "Authenticates your credentials and loads your role-scoped ERP workspace.",
      },
      {
        elementLabel: "[🔄 রিফ্রেশ / Refresh] & [লাইভ সিঙ্ক / Live Sync]",
        controlTypeBn: "হেডার ও কুইক অ্যাকশন বাটন",
        controlTypeEn: "Header & Quick Action Button",
        systemBehaviorBn: "সুপাবেস ক্লাউড ডেটাবেস থেকে সর্বশেষ অর্ডার, কালেকশন, বকেয়া ও গোডাউন স্টক তাৎক্ষণিক সিঙ্ক করে।",
        systemBehaviorEn: "Triggers a fresh cloud pull across all operational tables to update KPIs and stock.",
      },
      {
        elementLabel: "[🌐 EN / বাং] & [☀️/🌙 Theme]",
        controlTypeBn: "হেডার টগল বাটন",
        controlTypeEn: "Top Header Toggle Buttons",
        systemBehaviorBn: "এক ক্লিকে সম্পূর্ণ অ্যাপের ভাষা (বাংলা/English) এবং লাইট/ডার্ক থিম পরিবর্তন করে।",
        systemBehaviorEn: "Switches UI language between Bangla and English and toggles Light/Dark mode.",
      },
      {
        elementLabel: "8-Tile Quick Action Hub & 6 KPI Cards",
        controlTypeBn: "ড্যাশবোর্ড গ্রিড কার্ড",
        controlTypeEn: "Interactive Dashboard Grid",
        systemBehaviorBn: "এক ট্যাপে অর্ডার, কালেকশন, চালান, কাস্টমার, ইনভেন্টরি, SFA ও ম্যানুয়ালে নিয়ে যায় এবং ৬টি লাইভ কেপিআই দেখায়।",
        systemBehaviorEn: "Provides one-tap navigation to core modules and displays real-time revenue, collections, due, and low stock.",
      },
    ],
    proTipBn:
      "মার্কেটে বের হওয়ার আগে প্রতিদিন সকালে একবার ড্যাশবোর্ডের 'রিফ্রেশ (Refresh)' বাটনে ট্যাপ করুন—এতে গোডাউনের সর্বশেষ স্টক ও নতুন দাম আপনার মোবাইলে আপডেট হয়ে যাবে।",
    proTipEn:
      "Tap 'Refresh' on the Dashboard every morning before starting your market route so your phone has the latest warehouse stock and price list.",
    mistakeWarningBn:
      "নিজের পাসওয়ার্ড অন্য কারো সাথে শেয়ার করবেন না। কাজ শেষে শেয়ার্ড কম্পিউটার থেকে অবশ্যই 'Sign Out' করবেন।",
    mistakeWarningEn:
      "Never share your login password with others. Always tap 'Sign Out' if you log in from a shared office computer.",
    mockupKey: "login",
  },
  {
    id: "ch2-add-retailer-crm",
    chapterNo: "অধ্যায় ২ / Chapter 2",
    titleBn: "কাস্টমার বা রিটেইলার অ্যাড করা (Adding a New Retailer/Outlet - CRM)",
    titleEn: "Adding a New Retailer or Dealer Outlet (CRM)",
    subtitleBn: "নতুন দোকান নিবন্ধন, এরিয়া নির্ধারণ ও কাস্টমারের বকেয়া খাতা দেখা",
    subtitleEn: "How to register a new cookware shop, assign territory, and track outlet due balances",
    icon: Users,
    accentText: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/30",
    menuNameBn: "বাম মেনু → কাস্টমার ম্যানেজমেন্ট (CRM)",
    menuNameEn: "Sidebar → CRM (Customers)",
    whyItMattersBn:
      "মার্কেটে কোনো নতুন ক্রোকারিজ বা কুকওয়্যারের দোকানে অর্ডার কাটার আগে দোকানটিকে একবার কাস্টমার তালিকায় (CRM) যুক্ত করে নিতে হয়। একবার অ্যাড করলে পরবর্তীতে শুধু দোকানের নাম সিলেক্ট করলেই অর্ডার ও কালেকশন করা যাবে।",
    whyItMattersEn:
      "Before booking an order for a new cookware retailer or dealer, you register the outlet once in CRM. After that, the shop's address, phone number, and running due ledger are tracked automatically.",
    realScenarioBn:
      "বাস্তব উদাহরণ: আপনি চকবাজার মার্কেটে 'বিসমিল্লাহ ক্রোকারিজ' নামে একটি নতুন দোকানে গেলেন। মালিক মো. করিম সাহেব হামকোর প্রেসার কুকার ও ফ্রাই প্যান নিতে চান। অর্ডার লেখার আগে আপনি ১ মিনিটে তার দোকানটি CRM-এ যুক্ত করে নিলেন।",
    realScenarioEn:
      "Real-World Scenario: You visit a new shop named 'Bismillah Crockeries' in Chawkbazar. The owner, Mr. Karim, wants to order Hamko Pressure Cookers. You first add his shop in CRM in under 60 seconds.",
    howToSteps: [
      {
        stepNum: "①",
        titleBn: "'কাস্টমার ম্যানেজমেন্ট (CRM)' পেজে যান",
        titleEn: "Open the CRM / Customers Page",
        descBn:
          "বাম পাশের মেনু থেকে 'কাস্টমার ম্যানেজমেন্ট (CRM)'-এ ট্যাপ করুন এবং উপরের '+ নতুন কাস্টমার (+ Add Customer)' বাটনে ক্লিক করুন।",
        descEn:
          "Tap 'CRM' from the sidebar menu (or '+ Customers' from the Dashboard) and click the '+ Add Customer' button.",
      },
      {
        stepNum: "②",
        titleBn: "দোকানের নাম, মালিকের নাম ও মোবাইল নম্বর লিখুন",
        titleEn: "Enter Shop Name, Owner Name & Mobile Number",
        descBn:
          "Shop/Customer Name ঘরে দোকানের নাম (যেমন: বিসমিল্লাহ ক্রোকারিজ), Contact Person ঘরে মালিকের নাম এবং Phone ঘরে ১১ ডিজিটের সঠিক মোবাইল নম্বর (017XXXXXXXX) লিখুন।",
        descEn:
          "Fill in the Shop Name (e.g., Bismillah Crockeries), Contact Person (owner/manager name), and an active 11-digit mobile number.",
      },
      {
        stepNum: "③",
        titleBn: "কাস্টমার টাইপ, এরিয়া (Territory) ও ঠিকানা দিন",
        titleEn: "Select Customer Type, Territory & Address",
        descBn:
          "দোকানটি ডিলার হলে 'Dealer', খুচরা দোকান হলে 'Retailer', আর পাইকারি হলে 'Wholesale' সিলেক্ট করুন। এরপর আপনার এরিয়া/টেরিটরি ও দোকানের পূর্ণ ঠিকানা লিখুন।",
        descEn:
          "Choose 'Dealer', 'Retailer', or 'Wholesale', select the shop's Territory/Area, and enter the market address and Trade License (if available).",
      },
      {
        stepNum: "④",
        titleBn: "পূর্বের বকেয়া (যদি থাকে) দিয়ে 'Save' করুন",
        titleEn: "Set Opening Balance (if any) & Save",
        descBn:
          "নতুন দোকান হলে Opening Balance ঘরে 0 রাখুন (আর পুরাতন খাতার বকেয়া থাকলে সেই টাকার পরিমাণ লিখুন)। এরপর 'Save' বাটনে চাপ দিলেই দোকানটি তালিকায় যুক্ত হয়ে যাবে।",
        descEn:
          "Leave Opening Balance as 0 for a brand-new outlet (or enter any pre-existing ledger balance), then click 'Save'.",
      },
    ],
    screenCallouts: [
      {
        badge: "①",
        nameBn: "+ নতুন কাস্টমার (+ Add Customer)",
        nameEn: "+ Add Customer Button",
        actionBn: "নতুন রিটেইলার বা ডিলার দোকান নিবন্ধনের ফরম ওপেন করে।",
        actionEn: "Opens the form to register a new retailer, dealer, or wholesale outlet.",
      },
      {
        badge: "②",
        nameBn: "এরিয়া ও বকেয়া ফিল্টার (Area & Due Filter)",
        nameEn: "Territory & Due Status Filters",
        actionBn: "নির্দিষ্ট এলাকার দোকান অথবা যাদের বকেয়া (Overdue) আছে তাদের আলাদা করে দেখায়।",
        actionEn: "Filters your customer list by Territory, Customer Type, or Overdue balance.",
      },
      {
        badge: "③",
        nameBn: "কল ও হোয়াটসঅ্যাপ রিমাইন্ডার",
        nameEn: "Call & AI Payment Reminder",
        actionBn: "কাস্টমারকে সরাসরি কল করা বা বকেয়া তাগাদার বাংলা মেসেজ তৈরির বাটন।",
        actionEn: "Generates a polite Bengali payment reminder message for WhatsApp or SMS.",
      },
    ],
    fieldMappings: [
      {
        elementLabel: "[+ নতুন কাস্টমার / + Add Customer]",
        controlTypeBn: "প্রাইমারি অ্যাকশন বাটন",
        controlTypeEn: "Primary Modal Trigger Button",
        systemBehaviorBn: "নতুন ডিলার, রিটেইলার বা পাইকারি দোকান নিবন্ধনের ফরম ওপেন করে।",
        systemBehaviorEn: "Opens the customer registration modal dialog.",
      },
      {
        elementLabel: "Customer / Outlet Name * & Contact Person",
        controlTypeBn: "টেক্সট ইনপুট ফিল্ড",
        controlTypeEn: "Required Text Inputs",
        systemBehaviorBn: "দোকানের নাম (যেমন: বিসমিল্লাহ ক্রোকারিজ) এবং মালিক বা ম্যানেজারের নাম সংরক্ষণ করে।",
        systemBehaviorEn: "Stores the official shop name and primary contact person for invoices and receipts.",
      },
      {
        elementLabel: "Phone * & Customer Type (Dealer / Retailer / Wholesale)",
        controlTypeBn: "ফোন ইনপুট ও ড্রপডাউন",
        controlTypeEn: "Tel Input & Select Dropdown",
        systemBehaviorBn: "১১ ডিজিট মোবাইল নম্বর এবং কাস্টমারের ধরন নির্ধারণ করে।",
        systemBehaviorEn: "Saves phone number for direct calling/SMS and classifies the outlet tier.",
      },
      {
        elementLabel: "Territory / Area & Opening Balance → [✓ Save]",
        controlTypeBn: "এরিয়া ড্রপডাউন ও বকেয়া ইনপুট",
        controlTypeEn: "Area Select & Numeric Input",
        systemBehaviorBn: "দোকানটিকে নির্দিষ্ট বিক্রয় রুটে যুক্ত করে এবং প্রারম্ভিক বকেয়ার সাথে নতুন অর্ডার/কালেকশন মিলিয়ে Current Due হিসাব করে।",
        systemBehaviorEn: "Maps the outlet to a territory and initializes its running party due ledger.",
      },
    ],
    proTipBn:
      "দোকানের নামের সাথে বাজার বা রোডের নাম সংক্ষেপে লিখে রাখলে (যেমন: 'বিসমিল্লাহ ক্রোকারিজ - চকবাজার') একই নামের একাধিক দোকান থাকলেও অর্ডার কাটার সময় কখনো ভুল হবে না।",
    proTipEn:
      "Include the market name next to common shop names (e.g., 'Mayer Doa Store - Mirpur 10') so you can distinguish outlets with similar names instantly.",
    mistakeWarningBn:
      "একই দোকান দুবার অ্যাড করবেন না। নতুন দোকান যোগ করার আগে সার্চ বক্সে দোকানের নাম বা মোবাইল নম্বর লিখে একবার খুঁজে দেখুন আগে থেকেই আছে কি না।",
    mistakeWarningEn:
      "Always search by shop name or phone number before adding a new outlet to avoid creating duplicate customer records.",
    mockupKey: "crm",
  },
  {
    id: "ch3-products-pricing",
    chapterNo: "অধ্যায় ৩ / Chapter 3",
    titleBn: "প্রোডাক্ট ও প্রাইসিং ক্যাটালগ দেখা (Products & Pricing Catalog)",
    titleEn: "Checking Products, Pricing Tiers & Live Stock",
    subtitleBn: "কুকওয়্যার আইটেম, ডিলার প্রাইস (DP, D10, B12, MRP) এবং গোডাউন স্টক যাচাই",
    subtitleEn: "How to check cookware SKUs, dealer price tiers, and available stock before taking orders",
    icon: Package,
    accentText: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/30",
    menuNameBn: "বাম মেনু → পণ্য (Products)",
    menuNameEn: "Sidebar → Products",
    whyItMattersBn:
      "দোকানদারের সামনে বসে অর্ডার নেওয়ার সময় কোন প্রেসার কুকার, ফ্রাই প্যান, কড়াই বা ব্লেন্ডারের কত দাম (DP বা MRP) এবং গোডাউনে ওই মুহূর্তে কত পিস মাল রেডি আছে—তা এই পেজ থেকে ১ সেকেন্ডে দেখে নেওয়া যায়। ফলে স্টকে না থাকা পণ্যের অর্ডার নেওয়ার বিড়ম্বনা হয় না।",
    whyItMattersEn:
      "While sitting with a shopkeeper, the Products page lets you instantly verify the exact Dealer Price (DP), tier rates (D10, B12), MRP, and live warehouse stock so you never promise an out-of-stock item.",
    realScenarioBn:
      "বাস্তব উদাহরণ: দোকানদার জানতে চাইলেন 'হামকো ৫.৫ লিটার প্রেসার কুকারের ডিলার রেট কত এবং আজ ৫০ পিস দেওয়া যাবে কি না?' আপনি Products পেজে সার্চ দিয়ে দেখলেন রেট ১,৪৫০ টাকা এবং গোডাউনে ১২০ পিস স্টকে আছে—সাথে সাথে নিশ্চিত হয়ে অর্ডার নিয়ে নিলেন!",
    realScenarioEn:
      "Real-World Scenario: A dealer asks for the D10 rate on the Hamko 5.5L Pressure Cooker and whether 50 pcs can be delivered today. You search '5.5L' in Products, confirm 120 pcs are in stock, and quote the exact rate.",
    howToSteps: [
      {
        stepNum: "①",
        titleBn: "'পণ্য (Products)' মেনুতে গিয়ে সার্চ করুন",
        titleEn: "Search by Product Name, SKU Code, or Category",
        descBn:
          "বাম মেনু থেকে 'পণ্য (Products)'-এ যান। উপরের সার্চ বক্সে পণ্যের নাম (যেমন: Cooker, Fry Pan, Blender) বা SKU কোড লিখলেই পণ্যটি চলে আসবে।",
        descEn:
          "Open 'Products' from the sidebar. Type any keyword (e.g., Cooker, Kadai, Non-stick) or SKU code into the search bar, or filter by Category.",
      },
      {
        stepNum: "②",
        titleBn: "প্রাইস টিয়ার (DP / D10 / B12 / MRP) বুঝে নিন",
        titleEn: "Understand the Pricing Tiers (DP, D10, B12, MRP)",
        descBn:
          "প্রতিটি পণ্যের কার্ড বা সারিতে একক মূল্য / ডিলার প্রাইস (DP), স্পেশাল ডিলার টিয়ার (D10, B12) এবং সর্বোচ্চ খুচরা মূল্য (MRP) স্পষ্টভাবে লেখা থাকে। কাস্টমারের ক্যাটাগরি অনুযায়ী সঠিক রেট বলুন।",
        descEn:
          "Review the pricing columns: DP (standard Dealer Price), volume discount tiers (D10, B12, etc.), and MRP (Maximum Retail Price).",
      },
      {
        stepNum: "③",
        titleBn: "স্টক সংখ্যা (Stock Qty) দেখে অর্ডার নিশ্চিত করুন",
        titleEn: "Verify Available Stock Quantity",
        descBn:
          "পণ্যের পাশে সবুজ রঙে স্টক সংখ্যা লেখা থাকলে বুঝবেন পর্যাপ্ত মাল আছে। হলুদ বা লাল রঙে 'Low Stock' বা 'Out of Stock' লেখা থাকলে অর্ডার নেওয়ার আগে অফিস বা গোডাউনে কথা বলে নিন।",
        descEn:
          "Green stock badges mean ready for dispatch. Amber 'Low Stock' or Red 'Out of Stock' badges warn you that warehouse inventory is running low.",
      },
    ],
    screenCallouts: [
      {
        badge: "①",
        nameBn: "পণ্য সার্চ ও ক্যাটাগরি ফিল্টার",
        nameEn: "Product Search & Category Filter",
        actionBn: "কুকার, ফ্রাই প্যান, সসপ্যান বা ব্লেন্ডার ক্যাটাগরি অনুযায়ী দ্রুত পণ্য খোঁজার বক্স।",
        actionEn: "Instantly filters cookware items by name, SKU code, or category.",
      },
      {
        badge: "②",
        nameBn: "ডিলার প্রাইস ও টিয়ার রেট",
        nameEn: "Dealer Price (DP) & Tier Rates",
        actionBn: "প্রতিটি পণ্যের ডিলার প্রাইস (DP), পাইকারি টিয়ার এবং খুচরা মূল্য (MRP) দেখায়।",
        actionEn: "Displays standard Dealer Price (DP), special tier rates, and retail MRP.",
      },
      {
        badge: "③",
        nameBn: "লাইভ স্টক ব্যাজ (In Stock / Low Stock)",
        nameEn: "Live Stock Availability Badge",
        actionBn: "গোডাউনে বর্তমানে কত পিস পণ্য বিক্রির জন্য প্রস্তুত আছে তা দেখায়।",
        actionEn: "Shows exact available quantity in the warehouse right now.",
      },
    ],
    fieldMappings: [
      {
        elementLabel: "Search Box (পণ্যের নাম, SKU বা ক্যাটাগরি দিয়ে খুঁজুন...)",
        controlTypeBn: "লাইভ সার্চ ইনপুট",
        controlTypeEn: "Instant Search Input",
        systemBehaviorBn: "পণ্যের নাম (Cooker, Fry Pan), SKU কোড (HPC-550) বা ক্যাটাগরি লিখলে তাৎক্ষণিক তালিকা ফিল্টার করে।",
        systemBehaviorEn: "Filters the cookware catalog in real time by name, SKU code, or category.",
      },
      {
        elementLabel: "DP (Dealer Price) / D10 / B12 / MRP Columns",
        controlTypeBn: "৪-স্তরের মূল্য তালিকা",
        controlTypeEn: "4-Tier Pricing Matrix",
        systemBehaviorBn: "সাধারণ ডিলার রেট (DP), ভলিউম ডিসকাউন্ট টিয়ার (D10, B12) এবং সর্বোচ্চ খুচরা মূল্য (MRP) প্রদর্শন করে।",
        systemBehaviorEn: "Displays standard Dealer Price (DP), volume tiers (D10, B12), and retail MRP.",
      },
      {
        elementLabel: "Stock Qty Badge (In Stock / Low Stock / Out of Stock)",
        controlTypeBn: "রঙিন স্টক স্ট্যাটাস ব্যাজ",
        controlTypeEn: "Color-Coded Stock Status Pill",
        systemBehaviorBn: "পর্যাপ্ত স্টক থাকলে সবুজ, রিঅর্ডার লেভেলের নিচে নামলে হলুদ (Low Stock) এবং ০ হলে লাল (Out of Stock) দেখায়।",
        systemBehaviorEn: "Indicates green when stock is healthy, amber when <= reorder level, and red when 0.",
      },
    ],
    proTipBn:
      "কোনো পণ্যের স্টক কম থাকলে দোকানদারকে একই ক্যাটাগরির অন্য সাইজ বা মডেল (যার স্টক বেশি আছে) সাজেস্ট করুন—এতে আপনার অর্ডার মিস হবে না।",
    proTipEn:
      "If a specific size is low on stock, check the Products list for the next closest cookware model with high stock and recommend it to the retailer on the spot.",
    mistakeWarningBn:
      "'Out of Stock' (স্টক ০) থাকা পণ্যের জরুরি ডেলিভারির প্রতিশ্রুতি দেবেন না; এতে ডেলিভারির সময় কাস্টমারের সাথে ভুল বোঝাবুঝি হতে পারে।",
    mistakeWarningEn:
      "Do not promise same-day delivery for an 'Out of Stock' SKU without confirming an incoming factory chalan with the warehouse manager.",
    mockupKey: "products",
  },
  {
    id: "ch4-create-order-invoice",
    chapterNo: "অধ্যায় ৪ / Chapter 4",
    titleBn: "নতুন অর্ডার তৈরি ও ইনভয়েস (Creating a New Order & Invoicing)",
    titleEn: "Booking a New Sales Order & Printing the Invoice",
    subtitleBn: "+ নতুন অর্ডার, প্রাইস টিয়ার প্রয়োগ, স্মার্ট ভয়েস এআই এবং ইনভয়েস প্রিন্ট/শেয়ার",
    subtitleEn: "Step-by-step guide to creating retailer orders, applying tier rates, and generating invoices",
    icon: ShoppingCart,
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/30",
    menuNameBn: "বাম মেনু → অর্ডার (Orders) → + নতুন অর্ডার",
    menuNameEn: "Sidebar → Orders → + New Order",
    whyItMattersBn:
      "সেলস অফিসারের সবচেয়ে প্রধান কাজ হলো দোকানের অর্ডার সঠিকভাবে এন্ট্রি করা। এই অ্যাপে অর্ডার কাটার সাথে সাথে স্বয়ংক্রিয়ভাবে মোট বিল, ডিসকাউন্ট, নগদ জমা ও বাকি টাকা হিসাব হয়ে যায় এবং হেড অফিসের কম্পিউটারে সাথে সাথে অর্ডারটি চলে যায়।",
    whyItMattersEn:
      "Booking orders is your core daily operation. Every order you submit automatically calculates item totals, tier pricing, discounts, and net due, while syncing immediately to the central office for dispatch.",
    realScenarioBn:
      "বাস্তব উদাহরণ: 'মায়ের দোয়া স্টোর' আপনাকে ১০ পিস ৪.৫ লিটার প্রেসার কুকার (D10 রেটে) এবং ৫ পিস নন-স্টিক ফ্রাই প্যানের অর্ডার দিল এবং সাথে ৫,০০০ টাকা নগদ অগ্রিম দিল। আপনি ২ মিনিটে অর্ডারটি সাবমিট করে তাকে ইনভয়েস দেখিয়ে দিলেন।",
    realScenarioEn:
      "Real-World Scenario: 'Mayer Doa Store' orders 10 pcs of 4.5L Pressure Cookers at D10 rate and 5 pcs of Non-Stick Fry Pans, paying ৳5,000 advance cash. You enter and submit the order in under 2 minutes.",
    howToSteps: [
      {
        stepNum: "①",
        titleBn: "'+ নতুন অর্ডার (+ New Order)' বাটনে চাপুন",
        titleEn: "Tap '+ New Order' (from Dashboard or Orders Page)",
        descBn:
          "ড্যাশবোর্ডের উপরে '+ নতুন অর্ডার' বাটনে অথবা অর্ডার পেজে গিয়ে '+ New Order' বাটনে ক্লিক করুন। (চাইলে 'Smart Order AI' বাটনে চাপ দিয়ে বাংলায় মুখে বলে বা লিখেও অর্ডার তুলতে পারেন!)।",
        descEn:
          "Tap '+ New Order' on the Dashboard or Orders page. (You can also use 'Smart Order AI' to dictate or type the order in natural Bengali or English!).",
      },
      {
        stepNum: "②",
        titleBn: "কাস্টমার (দোকান) ও ডেলিভারি তারিখ সিলেক্ট করুন",
        titleEn: "Select the Retailer/Customer & Delivery Date",
        descBn:
          "Customer ড্রপডাউন থেকে দোকানের নাম সিলেক্ট করুন (পাশেই ওই দোকানের আগের কত বকেয়া আছে তা দেখাবে)। আপনার নাম Sales Officer হিসেবে সিলেক্ট করা থাকবে।",
        descEn:
          "Pick the customer from the dropdown (their current due balance is displayed automatically) and set the order/delivery date.",
      },
      {
        stepNum: "③",
        titleBn: "পণ্য, পরিমাণ (Quantity) ও প্রাইস টিয়ার (Price Tier) দিন",
        titleEn: "Add Products, Quantities & Select Price Tier",
        descBn:
          "তালিকা থেকে পণ্য সিলেক্ট করুন, প্রাইস টিয়ার (যেমন: DP, D10, B12 বা Custom) বেছে নিন এবং কয় পিস লাগবে (Quantity) তা লিখুন। আরও পণ্য যোগ করতে '+ Add Item' বাটনে চাপুন।",
        descEn:
          "Choose each cookware item, select the authorized Price Tier (DP, D10, B12, etc.), and enter the quantity. Tap '+ Add Item' for additional products.",
      },
      {
        stepNum: "④",
        titleBn: "ডিসকাউন্ট ও নগদ জমা (Paid Amount) লিখে সেভ করুন",
        titleEn: "Enter Discount / Advance Paid & Submit Order",
        descBn:
          "কোনো ছাড় থাকলে Discount ঘরে এবং নগদ টাকা দিলে Paid Amount ঘরে লিখুন। বাকি টাকা (Due Amount) অ্যাপ নিজেই হিসাব করবে। সবশেষে 'Create Order / Save' বাটনে চাপুন।",
        descEn:
          "Enter any special discount and advance payment received in 'Paid Amount'. Verify the net Due Amount and tap 'Save / Create Order'.",
      },
      {
        stepNum: "⑤",
        titleBn: "ইনভয়েস প্রিন্ট ও অর্ডার স্ট্যাটাস (Delivered) আপডেট",
        titleEn: "Print/Share Invoice & Track Delivery Status",
        descBn:
          "অর্ডার লিস্টে যেকোনো অর্ডারের পাশে থাকা প্রিন্ট (Print) আইকনে চাপ দিয়ে কাস্টমারের জন্য সুন্দর ইনভয়েস বা চালান প্রিন্ট/পিডিএফ বের করুন। মাল ডেলিভারি হয়ে গেলে স্ট্যাটাস 'Delivered' করে দিন।",
        descEn:
          "Click the Print icon on any order row to print or save a PDF invoice for the retailer. Once goods are handed over, update status to 'Delivered'.",
      },
    ],
    screenCallouts: [
      {
        badge: "①",
        nameBn: "+ নতুন অর্ডার ও Smart Voice AI",
        nameEn: "+ New Order & Smart Order AI",
        actionBn: "ম্যানুয়ালি অথবা বাংলায় ভয়েস/টেক্সট লিখে দ্রুত অর্ডার তৈরির বাটন।",
        actionEn: "Creates a new multi-item invoice manually or via Bengali voice/text AI.",
      },
      {
        badge: "②",
        nameBn: "প্রাইস টিয়ার ও অটো বিল হিসাব",
        nameEn: "Tier Pricing & Auto Total Calculator",
        actionBn: "DP, D10 বা B12 সিলেক্ট করলেই পণ্যের দাম ও মোট বিল স্বয়ংক্রিয়ভাবে বসে যায়।",
        actionEn: "Automatically applies tier unit prices and computes subtotal, discount, and due.",
      },
      {
        badge: "③",
        nameBn: "প্রিন্ট ইনভয়েস ও সেলস রিটার্ন",
        nameEn: "Print Invoice & Sales Return",
        actionBn: "কাস্টমারকে পাকা ইনভয়েস প্রিন্ট দিতে বা ডেলিভারির পর ফেরত পণ্য সমন্বয় করতে ব্যবহৃত হয়।",
        actionEn: "Prints branded invoices/chalans or processes returned items to reduce due.",
      },
    ],
    fieldMappings: [
      {
        elementLabel: "[+ New Order] & [🎙️ Smart Order AI]",
        controlTypeBn: "অর্ডার তৈরি ও ভয়েস এআই বাটন",
        controlTypeEn: "Order Form & AI Parser Triggers",
        systemBehaviorBn: "ম্যানুয়াল অর্ডার ফরম খোলে অথবা বাংলা/ইংরেজি ভয়েস ও টেক্সট থেকে স্বয়ংক্রিয়ভাবে পণ্য, পরিমাণ ও টিয়ার বসিয়ে দেয়।",
        systemBehaviorEn: "Launches the order form or parses natural Bangla/English text into structured order lines.",
      },
      {
        elementLabel: "Select Customer * & Sales Officer",
        controlTypeBn: "কাস্টমার ও অফিসার ড্রপডাউন",
        controlTypeEn: "Customer & Rep Selectors",
        systemBehaviorBn: "দোকান নির্বাচন করার সাথে সাথে তার বর্তমান বকেয়া (Current Due) দেখায় এবং অর্ডারটি আপনার নামে ট্যাগ করে।",
        systemBehaviorEn: "Links the invoice to the customer's due ledger and assigns your Sales Officer ID.",
      },
      {
        elementLabel: "Product * + Price Tier (DP / D10 / B12) + Quantity",
        controlTypeBn: "অর্ডার আইটেম রো",
        controlTypeEn: "Line-Item Table Controls",
        systemBehaviorBn: "নির্বাচিত টিয়ার অনুযায়ী একক দাম বসিয়ে পরিমাণ দিয়ে গুণ করে সাবটোটাল বের করে।",
        systemBehaviorEn: "Applies the chosen tier rate and calculates line subtotal automatically.",
      },
      {
        elementLabel: "Discount + Paid Amount → [Create Order] & [🖨️ Print]",
        controlTypeBn: "বিল সামারি ও ইনভয়েস প্রিন্ট",
        controlTypeEn: "Financial Summary & Print Action",
        systemBehaviorBn: "মোট বিল থেকে ডিসকাউন্ট ও নগদ জমা বাদ দিয়ে নিট বকেয়া (Due Amount) সেভ করে এবং A4/চালান প্রিন্ট করে।",
        systemBehaviorEn: "Computes net receivable due, syncs to cloud, and prints the official invoice.",
      },
    ],
    proTipBn:
      "স্মার্ট এআই অর্ডার টিপস: 'Smart Order AI' বাটনে ক্লিক করে 'মায়ের দোয়া স্টোরকে ১০টা ৫.৫ লিটার কুকার D10 রেটে দাও' বললে বা লিখলে অ্যাপ নিজেই পণ্য ও দাম বসিয়ে দেবে!",
    proTipEn:
      "Fast Field Trick: Open 'Smart Order AI' and speak or type in Bangla/English—the app automatically matches the product SKU, quantity, and price tier!",
    mistakeWarningBn:
      "অর্ডার সেভ করার আগে পণ্যের পরিমাণ (Quantity) এবং প্রাইস টিয়ার (DP নাকি D10) অবশ্যই একবার মিলিয়ে দেখবেন।",
    mistakeWarningEn:
      "Double-check the selected Price Tier (DP vs D10/B12) and item quantities before submitting the order.",
    mockupKey: "orders",
  },
  {
    id: "ch5-cash-collection-due",
    chapterNo: "অধ্যায় ৫ / Chapter 5",
    titleBn: "ক্যাশ কালেকশন ও বকেয়া হিসাব (Cash Collection & Due Management)",
    titleEn: "Recording Cash Collections & Managing Customer Dues",
    subtitleBn: "দোকান থেকে টাকা আদায় এন্ট্রি, মানি রিসিট প্রদান ও ৮৫%+ কালেকশন রিকভারি",
    subtitleEn: "How to log cash/bKash/bank collections, print money receipts, and audit party due ledgers",
    icon: Wallet,
    accentText: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-500/10",
    accentBorder: "border-teal-500/30",
    menuNameBn: "বাম মেনু → হিসাব ও অর্থ (Accounts & Finance)",
    menuNameEn: "Sidebar → Accounts & Finance",
    whyItMattersBn:
      "মাল ডেলিভারি দেওয়ার পর সময়মতো টাকা আদায় (Collection) করা ব্যবসার মূল চালিকাশক্তি। আপনি দোকানদারের কাছ থেকে যে টাকাই তুলবেন (নগদ, বিকাশ, নগদ, ব্যাংক বা চেক), তা সাথে সাথে অ্যাপে এন্ট্রি দিলে কাস্টমারের বকেয়া অটোমেটিক কমে যাবে এবং একটি মানি রিসিট তৈরি হবে।",
    whyItMattersEn:
      "Timely collection is the lifeblood of distribution. Recording every payment immediately in Accounts automatically reduces the retailer's due balance, generates an official Money Receipt, and credits your officer collection log.",
    realScenarioBn:
      "বাস্তব উদাহরণ: 'বিসমিল্লাহ ক্রোকারিজ'-এর কাছে ৩৪,৫০০ টাকা বকেয়া ছিল। আপনি দোকানে গিয়ে ২০,০০০ টাকা নগদ আদায় করলেন। সাথে সাথে '+ নগদ কালেকশন'-এ গিয়ে ২০,০০০ টাকা এন্ট্রি দিলেন—অ্যাপে তার নতুন বকেয়া হয়ে গেল ১৪,৫০০ টাকা!",
    realScenarioEn:
      "Real-World Scenario: 'Bismillah Crockeries' owes ৳34,500. You visit the shop and collect ৳20,000 in cash. As soon as you log the collection, their remaining due automatically updates to ৳14,500.",
    howToSteps: [
      {
        stepNum: "①",
        titleBn: "'$ ক্যাশ কালেকশন (+ Cash Collection)' বাটনে চাপুন",
        titleEn: "Tap '$ Cash Collection' (Dashboard or Accounts Page)",
        descBn:
          "ড্যাশবোর্ড থেকে '$ ক্যাশ কালেকশন' বাটনে অথবা 'হিসাব ও অর্থ (Accounts)' পেজে গিয়ে '+ নগদ কালেকশন (+ Cash Collection)' বাটনে ক্লিক করুন।",
        descEn:
          "Tap '$ Cash Collection' from the Dashboard Quick Action Hub or open 'Accounts & Finance' and click '+ Cash Collection'.",
      },
      {
        stepNum: "②",
        titleBn: "কাস্টমার সিলেক্ট করুন ও টাকার পরিমাণ লিখুন",
        titleEn: "Select the Retailer & Enter Collected Amount",
        descBn:
          "তালিকা থেকে দোকানের নাম সিলেক্ট করুন (যদি নির্দিষ্ট কোনো অর্ডারের বিপরীতে টাকা দেয় তবে Order নং সিলেক্ট করতে পারেন) এবং Amount ঘরে আদায়কৃত টাকার পরিমাণ লিখুন।",
        descEn:
          "Select the customer (and optional invoice number), then enter the exact amount received in the Amount field.",
      },
      {
        stepNum: "③",
        titleBn: "পেমেন্ট মাধ্যম (Cash / Mobile Banking / Bank / Cheque) দিন",
        titleEn: "Select Payment Method & Reference Notes",
        descBn:
          "নগদ টাকা হলে 'Cash', বিকাশ/নগদ হলে 'Mobile Banking', ব্যাংক জমার স্লিপ হলে 'Bank Transfer' এবং চেক হলে 'Cheque' সিলেক্ট করুন। নোট ঘরে ট্রানজেকশন আইডি বা চেক নম্বর লিখে 'Save' করুন।",
        descEn:
          "Choose Cash, Mobile Banking (bKash/Nagad), Bank Transfer, or Cheque. Add the bKash TrxID or cheque number in Notes and click 'Save'.",
      },
      {
        stepNum: "④",
        titleBn: "'কাস্টমার বকেয়া (Customer Due)' ট্যাব দেখে বকেয়া আদায় ত্বরান্বিত করুন",
        titleEn: "Monitor 'Customer Due' Ledger for 85%+ Recovery",
        descBn:
          "Accounts পেজের ৪ নম্বর ট্যাব 'কাস্টমার বকেয়া (Customer Due)'-তে গেলে কোন দোকানের কাছে কত টাকা পাওনা আছে তার পূর্ণ তালিকা পাবেন। এখান থেকে নিয়মিত ফলো-আপ করে ৮৫%+ কালেকশন হার বজায় রাখুন।",
        descEn:
          "Switch to the 'Customer Due' tab in Accounts to view party-wise outstanding balances and prioritize overdue accounts on your route.",
      },
    ],
    screenCallouts: [
      {
        badge: "①",
        nameBn: "+ নগদ কালেকশন (+ Cash Collection)",
        nameEn: "+ Cash Collection Button",
        actionBn: "কাস্টমারের কাছ থেকে আদায়কৃত টাকা এন্ট্রি করা ও মানি রিসিট তৈরির বাটন।",
        actionEn: "Logs a customer payment and generates a printable Money Receipt (COL-XXXX).",
      },
      {
        badge: "②",
        nameBn: "আমার মোট কালেকশন (My Total Collections)",
        nameEn: "My Total Collections Card",
        actionBn: "সেলস অফিসার হিসেবে আপনি নিজে মোট কত টাকা মার্কেট থেকে আদায় করেছেন তা দেখায়।",
        actionEn: "Displays the total collections logged by you for easy daily tracking.",
      },
      {
        badge: "③",
        nameBn: "কাস্টমার বকেয়া ও দৈনিক ক্যাশ বুক ট্যাব",
        nameEn: "Customer Due & Daily Cash Book Tabs",
        actionBn: "পার্টি অনুযায়ী বকেয়া তালিকা এবং প্রতিদিনের জমা-খরচের নিট ক্যাশ ব্যালেন্স দেখায়।",
        actionEn: "Shows party-wise due ledgers and daily inflow vs. outflow cash book.",
      },
    ],
    fieldMappings: [
      {
        elementLabel: "[+ নগদ কালেকশন / + Cash Collection]",
        controlTypeBn: "কালেকশন এন্ট্রি বাটন",
        controlTypeEn: "Collection Modal Trigger",
        systemBehaviorBn: "কাস্টমারের কাছ থেকে আদায়কৃত টাকা এন্ট্রি করার ফরম ওপেন করে এবং ইউনিক রিসিট নম্বর (COL-XXXX) তৈরি করে।",
        systemBehaviorEn: "Opens the payment collection modal and generates a sequential receipt number.",
      },
      {
        elementLabel: "Select Customer * & Order Invoice (Optional)",
        controlTypeBn: "কাস্টমার ও ইনভয়েস ড্রপডাউন",
        controlTypeEn: "Customer & Order Selectors",
        systemBehaviorBn: "কাস্টমার সিলেক্ট করলে তার মোট বকেয়া দেখায় এবং টাকা সেভ করলে ওই বকেয়া থেকে সাথে সাথে বিয়োগ হয়।",
        systemBehaviorEn: "Targets the customer's due ledger and immediately deducts the collected amount.",
      },
      {
        elementLabel: "Amount * + Payment Method (Cash / Mobile Banking / Bank / Cheque)",
        controlTypeBn: "টাকার অংক ও পেমেন্ট মাধ্যম",
        controlTypeEn: "Amount Input & Method Select",
        systemBehaviorBn: "নগদ, বিকাশ/নগদ (Mobile Banking), ব্যাংক ট্রান্সফার অথবা চেক অনুযায়ী আদায় শ্রেণিবদ্ধ করে।",
        systemBehaviorEn: "Records the exact amount and payment channel for Daily Cash Book & Evening Handover.",
      },
      {
        elementLabel: "Notes (TrxID / Cheque No) & [Customer Due] Tab",
        controlTypeBn: "রেফারেন্স নোট ও বকেয়া ট্যাব",
        controlTypeEn: "Reference Input & Ledger Tab",
        systemBehaviorBn: "বিকাশ TrxID বা চেক নম্বর সংরক্ষণ করে এবং পার্টি-ওয়াইজ বকেয়া খাতায় ৮৫%+ রিকভারি ট্র্যাক করে।",
        systemBehaviorEn: "Stores payment verification references and updates the party-wise due aging table.",
      },
    ],
    proTipBn:
      "বিকাশ বা ব্যাংকে টাকা নিলে Notes-এর ঘরে অবশ্যই বিকাশ নম্বর/TrxID বা ব্যাংকের জমার স্লিপ নম্বর লিখে রাখবেন—এতে সন্ধ্যায় অ্যাকাউন্টস বিভাগে হিসাব মেলাতে মাত্র কয়েক সেকেন্ড লাগবে।",
    proTipEn:
      "Always write the bKash TrxID, sender number, or bank slip reference in the 'Notes' field so the cashier can verify your collection in seconds.",
    mistakeWarningBn:
      "দোকান থেকে টাকা নেওয়ার সাথে সাথেই দোকানে বসে অ্যাপে কালেকশন এন্ট্রি দিন। পরে এন্ট্রি করব ভেবে রেখে দিলে টাকার অংক বা দোকানের নাম ভুল হওয়ার ঝুঁকি থাকে।",
    mistakeWarningEn:
      "Log every cash collection immediately at the shop before walking to the next outlet so no payment is ever forgotten or misattributed.",
    mockupKey: "collections",
  },
  {
    id: "ch6-inventory-stock-basics",
    chapterNo: "অধ্যায় ৬ / Chapter 6",
    titleBn: "স্টক ও প্রকিউরমেন্ট বেসিক (Inventory & Stock Awareness)",
    titleEn: "Warehouse Inventory & Stock Awareness",
    subtitleBn: "গোডাউন স্টক লেভেল দেখা, কম স্টক চিহ্নিত করা ও ফ্যাক্টরি চালান বোঝা",
    subtitleEn: "How to monitor warehouse stock levels, low-stock alerts, and incoming factory chalans",
    icon: Warehouse,
    accentText: "text-orange-600 dark:text-orange-400",
    accentBg: "bg-orange-500/10",
    accentBorder: "border-orange-500/30",
    menuNameBn: "বাম মেনু → ইনভেন্টরি (Inventory)",
    menuNameEn: "Sidebar → Inventory",
    whyItMattersBn:
      "একজন দক্ষ সেলস অফিসার সবসময় জানেন গোডাউনে কোন পণ্যের স্টক ভরপুর আছে আর কোন পণ্যটি শেষের পথে। ইনভেন্টরি পেজ থেকে আপনি প্রতি মুহূর্তে গোডাউনের আসল স্টক দেখতে পাবেন, ফলে যেসব পণ্যের স্টক বেশি আছে সেগুলোর ওপর জোর দিয়ে বেশি অর্ডার আনতে পারবেন।",
    whyItMattersEn:
      "A smart Sales Officer always knows which cookware items are heavily stocked in the warehouse and which ones are running low. Checking Inventory helps you push high-stock items and avoid stock-out delays.",
    realScenarioBn:
      "বাস্তব উদাহরণ: আপনি ইনভেন্টরি পেজে গিয়ে দেখলেন নন-স্টিক কড়াই সেটের ২০০ পিস নতুন স্টক গোডাউনে ঢুকেছে, আর ৩ লিটার কুকার মাত্র ৪ পিস বাকি আছে। আপনি আজ মার্কেটে সব দোকানদারকে নন-স্টিক কড়াই সেট বেশি করে অর্ডার করতে উৎসাহিত করলেন।",
    realScenarioEn:
      "Real-World Scenario: You check Inventory and see 200 pcs of Non-Stick Kadai Sets just arrived in the warehouse, while 3L Cookers have only 4 pcs left. You focus your sales pitch today on the Non-Stick Kadai Sets.",
    howToSteps: [
      {
        stepNum: "①",
        titleBn: "'ইনভেন্টরি (Inventory)' পেজ ওপেন করুন",
        titleEn: "Open the Inventory Module",
        descBn:
          "বাম মেনু থেকে 'ইনভেন্টরি'-তে ট্যাপ করুন। উপরে মোট কত ধরনের পণ্য (SKUs) আছে, কয়টি কম স্টকে (Low Stock) আছে এবং কয়টি শেষ (Out of Stock) তা কার্ড আকারে দেখতে পাবেন।",
        descEn:
          "Tap 'Inventory' from the sidebar or Dashboard. The top summary cards show Available SKUs, Low Stock count, and Out of Stock items.",
      },
      {
        stepNum: "②",
        titleBn: "'Low Stock' ও 'Out of Stock' ফিল্টার চেক করুন",
        titleEn: "Filter by 'Low Stock' or 'Out of Stock'",
        descBn:
          "তালিকার উপরে থাকা ফিল্টার বাটনে চাপ দিয়ে কম স্টকের পণ্যগুলো এক নজরে দেখে নিন এবং অফিসকে জানান কোন পণ্যটি মার্কেটে বেশি চাহিদা থাকায় দ্রুত ফ্যাক্টরি থেকে আনতে হবে।",
        descEn:
          "Tap the 'Low Stock' filter tab to see items at or below reorder threshold so you can inform management which fast-moving SKUs need urgent restocking.",
      },
      {
        stepNum: "③",
        titleBn: "অটোমেটিক স্টক আপডেট কীভাবে কাজ করে জানুন",
        titleEn: "Understand Automatic Stock In & Stock Out",
        descBn:
          "অফিস যখন ফ্যাক্টরি থেকে নতুন মালের চালান (Purchase Chalan) এন্ট্রি দেয় তখন স্টক অটোমেটিক বাড়ে, আর আপনার অর্ডার যখন ডেলিভারি (Delivered) হয় তখন স্টক অটোমেটিক কমে যায়।",
        descEn:
          "Warehouse stock increases automatically when admin logs a Factory Purchase Chalan, and decreases automatically when your sales orders are marked Delivered.",
      },
    ],
    screenCallouts: [
      {
        badge: "①",
        nameBn: "স্টক সামারি কার্ড (Available / Low / Out)",
        nameEn: "Stock Health Summary Cards",
        actionBn: "গোডাউনে মোট সচল পণ্য, কম স্টক এবং স্টক শেষ হওয়া পণ্যের সংখ্যা দেখায়।",
        actionEn: "Summarizes healthy SKUs, low-stock warnings, and zero-stock items.",
      },
      {
        badge: "②",
        nameBn: "পণ্য ও ক্যাটাগরি সার্চ",
        nameEn: "Instant SKU & Stock Search",
        actionBn: "যেকোনো পণ্যের নাম লিখে গোডাউনে ঠিক কয় পিস মাল আছে তা দেখার বক্স।",
        actionEn: "Search any cookware item to see its exact warehouse quantity.",
      },
      {
        badge: "③",
        nameBn: "স্টক ট্রানজেকশন ইতিহাস (Audit Log)",
        nameEn: "Stock Movement History",
        actionBn: "কখন কোন চালানে মাল ঢুকেছে বা কোন অর্ডারে মাল বের হয়েছে তার তালিকা।",
        actionEn: "Shows every incoming factory chalan and outgoing order delivery.",
      },
    ],
    fieldMappings: [
      {
        elementLabel: "Available SKUs / Low Stock / Out of Stock Cards",
        controlTypeBn: "ইনভেন্টরি কেপিআই কার্ড",
        controlTypeEn: "Inventory Summary KPI Cards",
        systemBehaviorBn: "গোডাউনে মোট কয়টি সচল পণ্য আছে, কয়টি রিঅর্ডার লেভেলের নিচে (Low Stock) এবং কয়টি শেষ (Out of Stock) তা দেখায়।",
        systemBehaviorEn: "Summarizes active catalog SKUs, low-stock warnings, and depleted items.",
      },
      {
        elementLabel: "Filter Tabs: [All] • [Low Stock] • [Out of Stock]",
        controlTypeBn: "স্টক হেলথ ফিল্টার ট্যাব",
        controlTypeEn: "Stock Health Filter Pills",
        systemBehaviorBn: "এক ক্লিকে শুধুমাত্র কম স্টক বা স্টক শেষ হওয়া পণ্যগুলো আলাদা করে দেখায়।",
        systemBehaviorEn: "Isolates low-stock or zero-stock cookware items for restocking priority.",
      },
      {
        elementLabel: "Auto Stock In (Chalan) & Auto Stock Out (Delivered Order)",
        controlTypeBn: "স্বয়ংক্রিয় স্টক ইঞ্জিন",
        controlTypeEn: "Automated Stock Sync Engine",
        systemBehaviorBn: "প্রকিউরমেন্ট চালান এন্ট্রিতে স্টক যোগ (+) এবং অর্ডার ডেলিভারিতে স্টক বিয়োগ (−) স্বয়ংক্রিয়ভাবে সম্পন্ন করে।",
        systemBehaviorEn: "Automatically increments stock on Purchase Chalans and decrements on Delivered Orders.",
      },
    ],
    proTipBn:
      "মার্কেটে কোনো বিশেষ পণ্যের ব্যাপক চাহিদা দেখলে সাথে সাথে ইনভেন্টরিতে স্টক চেক করে সুপার অ্যাডমিন বা ম্যানেজারকে জানান, যাতে সময়মতো ফ্যাক্টরি থেকে নতুন চালান আনানো যায়।",
    proTipEn:
      "When you spot high market demand for an item on your route, check its Inventory count and alert your manager early so a factory Purchase Chalan can be placed in advance.",
    mistakeWarningBn:
      "গোডাউনে ফিজিক্যালি মাল ড্যামেজ বা নষ্ট না হলে অযথা ম্যানুয়াল স্টক অ্যাডজাস্টমেন্ট বা স্টক আউট এন্ট্রি দেবেন না।",
    mistakeWarningEn:
      "Do not create manual Stock Out entries for regular customer sales—customer orders deduct stock automatically!",
    mockupKey: "inventory",
  },
  {
    id: "ch7-sfa-route-handover",
    chapterNo: "অধ্যায় ৭ / Chapter 7",
    titleBn: "ফিল্ড ভিজিট, রুট প্ল্যান ও সন্ধ্যার ক্যাশ হ্যান্ডওভার (Field Visit & SFA)",
    titleEn: "Daily Route Plan, Shop Visits & Evening Cash Handover",
    subtitleBn: "দৈনিক মার্কেট ভিজিট লগ, সেলস টার্গেট ট্র্যাকিং এবং ৪-ডিজিট পিনে ক্যাশ জমা দেওয়া",
    subtitleEn: "How to follow your daily market route, log shop visits, track targets, and hand over daily cash",
    icon: MapPin,
    accentText: "text-indigo-600 dark:text-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/30",
    menuNameBn: "বাম মেনু → সেলস ফোর্স (Sales Force / SFA)",
    menuNameEn: "Sidebar → Sales Force (SFA)",
    whyItMattersBn:
      "প্রতিদিন আপনি কোন কোন মার্কেটে গেলেন, কয়টি দোকান ভিজিট করলেন, আপনার মাসিক বিক্রয় টার্গেটের কত শতাংশ পূরণ হলো এবং দিনশেষে সারাদিনের আদায়কৃত টাকা কীভাবে অফিসে বুঝিয়ে দেবেন—তার সবই এই 'সেলস ফোর্স (SFA)' পেজে রয়েছে।",
    whyItMattersEn:
      "The Sales Force (SFA) module organizes your weekly market route, records your daily shop visits, tracks your monthly sales target progress, and provides a 4-digit PIN Evening Cash Handover slip for the office cashier.",
    realScenarioBn:
      "বাস্তব উদাহরণ: আজ সোমবার আপনার মিরপুর-১০ রুটে ১২টি দোকান ভিজিট করার কথা। আপনি দোকানে গিয়ে 'ভিজিট লগ করুন'-এ এন্ট্রি দিলেন। আর সন্ধ্যায় অফিসে ফিরে 'Evening Handover'-এ ক্লিক করে সারাদিনের আদায় করা ৪৫,০০০ টাকার পিন কোড ক্যাশিয়ারকে দেখিয়ে হিসাব ক্লোজ করলেন।",
    realScenarioEn:
      "Real-World Scenario: On Monday you follow your Mirpur-10 Route Plan, log each shop visit outcome, and at 7:00 PM open 'Evening Handover' to hand over ৳45,000 collected cash using your 4-digit verification PIN.",
    howToSteps: [
      {
        stepNum: "①",
        titleBn: "'রুট প্ল্যান (Route Plan)' ট্যাবে আজকের দোকানগুলো দেখুন",
        titleEn: "Check Today's Assigned Shops in 'Route Plan'",
        descBn:
          "বাম মেনু থেকে 'সেলস ফোর্স (SFA)' পেজে যান এবং 'রুট প্ল্যান (Route Plan)' ট্যাবে ক্লিক করুন। আজকের বার (যেমন: শনিবার, রবিবার বা সোমবার) সিলেক্ট করলেই আজ আপনার কোন কোন দোকানে যাওয়ার কথা তার তালিকা চলে আসবে।",
        descEn:
          "Open 'Sales Force (SFA)' and select the 'Route Plan' tab. Filter by today's day of the week to view all outlets scheduled for your market visit.",
      },
      {
        stepNum: "②",
        titleBn: "দোকানে গিয়ে '+ ভিজিট লগ করুন (Log Visit)' এন্ট্রি দিন",
        titleEn: "Log Every Shop Visit ('+ Log Visit')",
        descBn:
          "দোকানে পৌঁছানোর পর '+ ভিজিট লগ করুন' বাটনে চাপুন। দোকানের নাম সিলেক্ট করুন, ভিজিটের উদ্দেশ্য (Order Collection / Payment Follow-up / Routine Visit) এবং ফলাফল (অর্ডার দিয়েছে নাকি পরে দেবে) লিখে সেভ করুন।",
        descEn:
          "Tap '+ Log Visit' when visiting an outlet. Select the customer, choose the visit purpose and outcome (e.g., Order Taken, Payment Collected, Follow-up Needed), and save.",
      },
      {
        stepNum: "③",
        titleBn: "'বিক্রয় টার্গেট (Sales Target)' ট্যাবে নিজের অগ্রগতি দেখুন",
        titleEn: "Track Your Monthly Sales Target Achievement",
        descBn:
          "'Sales Target' ট্যাবে গেলে আপনার চলতি মাসের টার্গেট কত টাকা এবং ডেলিভার্ড অর্ডার থেকে এ পর্যন্ত কত টাকা ও কত শতাংশ (%) অর্জিত হয়েছে তা রঙিন প্রগ্রেস বারে দেখতে পাবেন।",
        descEn:
          "Open the 'Sales Target' tab to see your assigned monthly target amount, achieved sales from delivered orders, and completion percentage bar.",
      },
      {
        stepNum: "④",
        titleBn: "দিনশেষে 'Evening Cash Handover' দিয়ে হিসাব বুঝিয়ে দিন",
        titleEn: "Complete Evening Cash Handover with 4-Digit PIN",
        descBn:
          "সন্ধ্যায় মার্কেট থেকে ফিরে SFA পেজের উপরে থাকা 'Evening Handover' বাটনে ক্লিক করুন। সারাদিনে আপনি নগদ (Cash), বিকাশ (bKash) ও চেকের মাধ্যমে মোট কত টাকা তুলেছেন তার অটোমেটিক সামারি ও একটি ৪-ডিজিট পিন কোড তৈরি হবে। ক্যাশিয়ারকে টাকা ও পিন বুঝিয়ে দিয়ে দিনের কাজ শেষ করুন।",
        descEn:
          "At shift end, click 'Evening Handover'. The app summarizes your total Cash, bKash, and Cheque collections for the day and generates a 4-digit verification PIN for cashier sign-off.",
      },
    ],
    screenCallouts: [
      {
        badge: "①",
        nameBn: "+ ভিজিট লগ করুন (+ Log Visit)",
        nameEn: "+ Log Visit Button",
        actionBn: "প্রতিটি দোকান ভিজিটের সময়, উদ্দেশ্য ও ফলাফল রেকর্ড করার বাটন।",
        actionEn: "Records your shop check-in, visit purpose, and market feedback.",
      },
      {
        badge: "②",
        nameBn: "রুট প্ল্যান ও সেলস টার্গেট ট্যাব",
        nameEn: "Route Plan & Sales Target Tabs",
        actionBn: "বার অনুযায়ী দোকানের রুট তালিকা এবং মাসিক টার্গেট অর্জনের হিসাব দেখায়।",
        actionEn: "Displays day-of-week outlet routes and real-time target achievement %.",
      },
      {
        badge: "③",
        nameBn: "Evening Handover (দিনশেষের ক্যাশ জমা)",
        nameEn: "Evening Cash Handover Modal",
        actionBn: "সারাদিনের আদায়কৃত টাকার সামারি ও ৪-ডিজিট পিন কোড তৈরি করে।",
        actionEn: "Generates your daily collection summary and 4-digit PIN for office deposit.",
      },
    ],
    fieldMappings: [
      {
        elementLabel: "[+ ভিজিট লগ করুন / + Log Visit]",
        controlTypeBn: "ভিজিট চেক-ইন বাটন",
        controlTypeEn: "Shop Visit Modal Trigger",
        systemBehaviorBn: "দোকানের নাম, ভিজিটের সময়, উদ্দেশ্য (Purpose) এবং ফলাফল (Outcome) রেকর্ড করে।",
        systemBehaviorEn: "Logs your physical shop check-in, visit purpose, and market outcome.",
      },
      {
        elementLabel: "[Route Plan] & [Sales Target] Tabs",
        controlTypeBn: "রুট ও টার্গেট ট্যাব",
        controlTypeEn: "Route & Target View Tabs",
        systemBehaviorBn: "শনিবার থেকে বৃহস্পতিবার পর্যন্ত নির্ধারিত দোকানের রুট এবং মাসিক বিক্রয় টার্গেট অর্জনের শতাংশ (%) দেখায়।",
        systemBehaviorEn: "Displays day-of-week outlet schedules and live target achievement progress bars.",
      },
      {
        elementLabel: "[🔐 Evening Handover] → 4-Digit Verification PIN",
        controlTypeBn: "ডে-এন্ড ক্যাশ হ্যান্ডওভার মডাল",
        controlTypeEn: "Evening Cash Handover Generator",
        systemBehaviorBn: "সারাদিনের Cash, bKash ও Cheque আদায় একত্রিত করে ক্যাশিয়ারের কাছে জমা দেওয়ার জন্য ৪-ডিজিট পিন তৈরি করে।",
        systemBehaviorEn: "Aggregates daily Cash, bKash, and Cheque collections with a 4-digit verification PIN.",
      },
    ],
    proTipBn:
      "কোনো দোকানে গিয়ে অর্ডার বা পেমেন্ট না পেলেও অবশ্যই 'Log Visit'-এ গিয়ে নোট লিখে রাখবেন (যেমন: 'মালিক দোকানে ছিলেন না, বৃহস্পতিবার যেতে বলেছেন')—এতে আপনার মার্কেট ভিজিটের ১০০% রেকর্ড থাকবে।",
    proTipEn:
      "Even if a shopkeeper does not place an order today, still log the visit with a short follow-up note so management sees your complete daily market coverage.",
    mistakeWarningBn:
      "দিনশেষে ক্যাশ হ্যান্ডওভার করার আগে আপনার হাতের নগদ টাকা ও বিকাশ ট্রানজেকশনের সাথে অ্যাপের কালেকশন লিস্ট একবার মিলিয়ে নেবেন।",
    mistakeWarningEn:
      "Always count your physical cash and verify bKash TrxIDs against your daily collection list before submitting your Evening Cash Handover.",
    mockupKey: "sfa",
  },
  {
    id: "ch8-troubleshooting-faqs",
    chapterNo: "অধ্যায় ৮ / Chapter 8",
    titleBn: "জরুরি সমস্যা সমাধান ও সাধারণ প্রশ্নোত্তর (Troubleshooting & FAQs)",
    titleEn: "Quick Troubleshooting, FAQs & Support Guide",
    subtitleBn: "ইন্টারনেট ধীরগতি, লাইভ সিঙ্ক, হার্ড রিফ্রেশ (Ctrl + F5) ও পাসওয়ার্ড সমস্যার সমাধান",
    subtitleEn: "What to do when internet is slow, how to force Live Sync, and who to contact for help",
    icon: HelpCircle,
    accentText: "text-rose-600 dark:text-rose-400",
    accentBg: "bg-rose-500/10",
    accentBorder: "border-rose-500/30",
    menuNameBn: "যেকোনো পেজ → Live Sync / সাপোর্ট",
    menuNameEn: "Any Page → Live Sync / Support",
    whyItMattersBn:
      "মাঠ পর্যায়ে কাজ করার সময় কখনো মোবাইলের নেটওয়ার্ক দুর্বল থাকতে পারে বা পাসওয়ার্ড মনে নাও থাকতে পারে। এই অধ্যায়ের সহজ নিয়মগুলো জানলে যেকোনো ছোটখাটো কারিগরি সমস্যা আপনি নিজেই ৩০ সেকেন্ডে সমাধান করে ফেলতে পারবেন।",
    whyItMattersEn:
      "In the field, mobile networks can fluctuate. Knowing these simple 30-second fixes ensures you never get stuck while booking an order or logging a collection.",
    realScenarioBn:
      "বাস্তব উদাহরণ: আপনি মার্কেটে দুর্বল নেটওয়ার্কের মধ্যে একটি অর্ডার সেভ করলেন। পরে ভালো নেটওয়ার্কে এসে উপরের 'Live Sync' বাটনে একবার চাপ দিলেন—আপনার অর্ডারটি ১০০% নিশ্চিতভাবে হেড অফিসের ক্লাউডে সিঙ্ক হয়ে গেল!",
    realScenarioEn:
      "Real-World Scenario: You save an order inside a market basement with weak mobile data. Once you step outside to strong 4G coverage, you tap 'Live Sync' to confirm instant cloud synchronization.",
    howToSteps: [
      {
        stepNum: "①",
        titleBn: "ডেটা লোড হতে দেরি হলে বা নতুন আপডেট না দেখালে কী করবেন?",
        titleEn: "If Data Looks Delayed or Doesn't Load Immediately",
        descBn:
          "পেজের উপরে ডানপাশে থাকা 'Live Sync' অথবা 'Refresh (রিফ্রেশ)' বাটনে একবার ট্যাপ করুন। কম্পিউটারে থাকলে কিবোর্ডের 'Ctrl + F5' একসাথে চাপুন (মোবাইলে ব্রাউজার পেজটি ওপর থেকে নিচে টেনে রিফ্রেশ করুন)।",
        descEn:
          "Tap the 'Live Sync' or 'Refresh' button at the top right of the page. On an office PC, press 'Ctrl + F5' for a clean hard refresh.",
      },
      {
        stepNum: "②",
        titleBn: "ইন্টারনেট একদম ধীরগতির হলে কীভাবে কাজ করবেন?",
        titleEn: "What if Mobile Internet Drops Temporarily?",
        descBn:
          "হামকো ইআরপি-তে স্মার্ট ক্যাশ সুরক্ষা রয়েছে। নেটওয়ার্ক দুর্বল থাকলেও আপনার স্ক্রিনের ডেটা মুছে যাবে না। নেটওয়ার্ক স্বাভাবিক হওয়ার সাথে সাথে একবার 'Live Sync' বাটনে চাপ দিলেই সব তথ্য ক্লাউডে আপডেট হয়ে যাবে।",
        descEn:
          "Hamko Sales ERP protects your active data in local cache during brief signal drops. As soon as your 4G/Wi-Fi signal returns, tap 'Live Sync' to synchronize with the cloud.",
      },
      {
        stepNum: "③",
        titleBn: "পাসওয়ার্ড ভুলে গেলে বা লগইন না হলে কী করবেন?",
        titleEn: "If You Forget Your Password or Cannot Log In",
        descBn:
          "লগইন পেজে 'পাসওয়ার্ড ভুলে গেছেন? (Forgot Password?)' লিংকে চাপ দিয়ে আপনার ইমেইল অথবা মোবাইল OTP দিয়ে নতুন পাসওয়ার্ড সেট করুন। অথবা সরাসরি আপনার সুপার অ্যাডমিন / সেলস ম্যানেজারকে জানান—তিনি ১ মিনিটে আপনার নতুন পাসওয়ার্ড সেট করে দেবেন।",
        descEn:
          "Tap 'Forgot Password?' on the login screen to reset via Email or SMS OTP, or contact your Super Admin who can reset your password immediately from User Management.",
      },
      {
        stepNum: "④",
        titleBn: "অর্ডার বা কালেকশনে ভুল অংক উঠে গেলে কার সাথে যোগাযোগ করবেন?",
        titleEn: "Who to Contact If an Order or Collection Needs Correction",
        descBn:
          "খসড়া (Draft/Pending) অর্ডার আপনি নিজেই এডিট করতে পারবেন। তবে ডেলিভার্ড অর্ডার বা ফাইন্যান্সিয়াল লেজার সংশোধনের প্রয়োজন হলে সাথে সাথে সুপার অ্যাডমিন বা অ্যাকাউন্টস বিভাগে ইনভয়েস/রিসিট নম্বরটি জানান।",
        descEn:
          "Draft or Pending orders can be edited directly. If a Delivered order or posted Cash Collection needs adjustment, share the Order/Receipt number with your Super Admin or Accountant.",
      },
    ],
    screenCallouts: [
      {
        badge: "①",
        nameBn: "Live Sync / Refresh বাটন",
        nameEn: "Live Sync / Refresh Button",
        actionBn: "সার্ভারের সাথে তাৎক্ষণিক ডেটা আদান-প্রদান ও হিসাব মেলানোর বাটন।",
        actionEn: "Forces an immediate cloud sync across all ERP tables.",
      },
      {
        badge: "②",
        nameBn: "Ctrl + F5 (হার্ড রিফ্রেশ)",
        nameEn: "Ctrl + F5 Hard Refresh",
        actionBn: "কম্পিউটার ব্রাউজারের পুরনো ক্যাশ পরিষ্কার করে নতুন ভার্সন লোড করে।",
        actionEn: "Clears stale browser cache on PC and loads the freshest app build.",
      },
      {
        badge: "③",
        nameBn: "সুপার অ্যাডমিন সাপোর্ট",
        nameEn: "Super Admin & Accounts Desk",
        actionBn: "পাসওয়ার্ড রিসেট, নতুন এরিয়া যোগ বা লেজার সংশোধনের জন্য তাৎক্ষণিক সহায়তা।",
        actionEn: "Resets passwords, assigns territories, and verifies daily cash handovers.",
      },
    ],
    fieldMappings: [
      {
        elementLabel: "[🔄 Live Sync] / [Refresh (রিফ্রেশ)]",
        controlTypeBn: "তাৎক্ষণিক ক্লাউড সিঙ্ক বাটন",
        controlTypeEn: "Manual Cloud Sync Trigger",
        systemBehaviorBn: "দুর্বল নেটওয়ার্ক থেকে ভালো নেটওয়ার্কে আসলে ১ ক্লিকে ১৯টি টেবিলের সব ডেটা ক্লাউডে পুশ ও পুল করে।",
        systemBehaviorEn: "Pushes pending local records and pulls fresh cloud state across all 19 tables.",
      },
      {
        elementLabel: "Keyboard [Ctrl + F5] / Mobile Pull-to-Refresh",
        controlTypeBn: "ব্রাউজার হার্ড রিফ্রেশ",
        controlTypeEn: "Browser Cache Hard Reload",
        systemBehaviorBn: "পুরনো ব্রাউজার ক্যাশ পরিষ্কার করে অ্যাপের সর্বশেষ আপডেট ও স্কিমা লোড করে।",
        systemBehaviorEn: "Clears stale browser assets and reloads the latest production build.",
      },
      {
        elementLabel: "[Forgot Password?] (Email Link / 6-Digit SMS OTP)",
        controlTypeBn: "পাসওয়ার্ড রিকভারি মডাল",
        controlTypeEn: "Password Recovery Dialog",
        systemBehaviorBn: "পাসওয়ার্ড ভুলে গেলে ইমেইল লিংক বা মোবাইলে ৬-ডিজিট OTP কোডের মাধ্যমে নতুন পাসওয়ার্ড সেট করে।",
        systemBehaviorEn: "Allows self-service password reset via registered email or mobile SMS OTP.",
      },
    ],
    proTipBn:
      "এই পুরো গাইডটি আপনার মোবাইলে পিডিএফ হিসেবে সেভ করে রাখতে বা প্রিন্ট করে ব্যাগে রাখতে উপরের সবুজ 'Download PDF (A4)' বাটনে ক্লিক করুন!",
    proTipEn:
      "Tap the green 'Download PDF (A4)' button at the top of this page to save a clean PDF copy on your phone or print a physical booklet!",
    mistakeWarningBn:
      "ব্রাউজারের History বা Site Data নিজ থেকে Clear/Delete করবেন না, বিশেষ করে যখন আপনি মার্কেটে অফলাইন বা দুর্বল নেটওয়ার্কে কাজ করছেন।",
    mistakeWarningEn:
      "Never clear your browser's site data/storage while out in the field before clicking 'Live Sync' to confirm all entries are synced.",
    mockupKey: "troubleshooting",
  },
];

interface ErpShellNavItem {
  id: ManualChapter["mockupKey"];
  labelBn: string;
  labelEn: string;
  iconText: string;
}

const ERP_SIDEBAR_ITEMS: ErpShellNavItem[] = [
  { id: "login", labelBn: "ড্যাশবোর্ড", labelEn: "Dashboard", iconText: "📊" },
  { id: "crm", labelBn: "কাস্টমার (CRM)", labelEn: "CRM / Outlets", iconText: "👥" },
  { id: "products", labelBn: "পণ্য ও দর", labelEn: "Products", iconText: "📦" },
  { id: "orders", labelBn: "সেলস অর্ডার", labelEn: "Sales Orders", iconText: "🛒" },
  { id: "inventory", labelBn: "গোডাউন স্টক", labelEn: "Inventory", iconText: "🏭" },
  { id: "collections", labelBn: "ক্যাশ ও বকেয়া", labelEn: "Accounts", iconText: "💵" },
  { id: "sfa", labelBn: "ফিল্ড ভিজিট (SFA)", labelEn: "SFA & Route", iconText: "📍" },
  { id: "troubleshooting", labelBn: "ব্যবহারবিধি", labelEn: "User Manual", iconText: "📖" },
];

/**
 * High-fidelity enterprise web ERP shell replicating the exact live layout of Hamko Sales ERP:
 * - Permanent left sidebar with HAMKO Cookware branding and 8 navigation modules (active route in primary blue)
 * - Top header bar with page title, [📖 ব্যবহারবিধি / Manual], [🌐 EN / বাং], [🌙 Theme], [🔔 Bell], and Officer Profile Badge
 * - Main workspace canvas containing the chapter's exact KPI cards, tables, forms, and ① ② ③ callout badges
 */
function EnterpriseErpMockupFrame({
  activeNav,
  screenTitleBn,
  routePath,
  headerHighlightCallout,
  children,
}: {
  activeNav: ManualChapter["mockupKey"];
  screenTitleBn: string;
  routePath: string;
  headerHighlightCallout?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-none min-w-0 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-card text-foreground overflow-hidden shadow-md">
      {/* Browser Window Top Chrome */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-slate-100 px-4 py-2 text-xs border-b border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="ml-2 font-bold tracking-tight text-white truncate">{screenTitleBn}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded bg-slate-800 border border-slate-700 px-2.5 py-0.5 font-mono text-[11px] text-sky-300">
            https://hamko-erp.app/{routePath}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            ● Live Enterprise UI
          </span>
        </div>
      </div>

      {/* Main Enterprise ERP Layout: Left Sidebar (xl:w-48) + Full-Width Fluid Right Workspace */}
      <div className="flex flex-col xl:flex-row w-full min-w-0 bg-slate-50/70 dark:bg-slate-950/40">
        {/* Left Sidebar (Matches src/components/Sidebar.tsx) */}
        <div className="w-full xl:w-48 shrink-0 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            {/* Brand Logo Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-sky-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                  H
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
                    HAMKO
                  </p>
                  <p className="text-[9.5px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    Cookware ERP
                  </p>
                </div>
              </div>
              <span className="rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[9.5px] font-bold">
                v2.5
              </span>
            </div>

            {/* Sidebar Navigation Menu */}
            <div className="p-2 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-1 gap-1.5 text-[11px]">
              {ERP_SIDEBAR_ITEMS.map((item) => {
                const isActive = item.id === activeNav;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-semibold transition-colors min-w-0 ${
                      isActive
                        ? "bg-sky-600 text-white shadow-2xs font-bold ring-2 ring-sky-400/50"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-xs shrink-0">{item.iconText}</span>
                    <div className="truncate leading-tight min-w-0">
                      <span className="block truncate">{item.labelBn}</span>
                      <span
                        className={`block text-[9px] truncate ${
                          isActive ? "text-sky-100" : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {item.labelEn}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar Footer Status */}
          <div className="hidden xl:block p-2.5 m-2 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 text-[10px]">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Cloud Sync Active
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Hamko Group Cookware Unit</p>
          </div>
        </div>

        {/* Right Column: Top Header Bar (AppLayout.tsx) + Page Workspace */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Header Bar (Matches src/components/layout/AppLayout.tsx) */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                {ERP_SIDEBAR_ITEMS.find((i) => i.id === activeNav)?.labelBn} (
                {ERP_SIDEBAR_ITEMS.find((i) => i.id === activeNav)?.labelEn})
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                ● Online
              </span>
            </div>

            {/* Header Right Actions: Manual, Language, Theme, Notifications, User Profile */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[10.5px] font-bold text-slate-700 dark:text-slate-200">
                📖 ব্যবহারবিধি
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10.5px] font-bold ${
                  headerHighlightCallout
                    ? "border-2 border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-2xs"
                    : "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                }`}
              >
                {headerHighlightCallout ? "③ [🌐 EN / বাং]" : "🌐 EN / বাং"}
              </span>
              <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[10.5px]">
                🌙
              </span>
              <span className="relative inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[10.5px]">
                🔔
                <span className="ml-0.5 rounded-full bg-rose-500 text-white px-1 text-[9px] font-bold">
                  2
                </span>
              </span>
              {/* Profile Badge */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 pl-1.5 pr-2.5 py-0.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white text-[10px] font-extrabold shrink-0">
                  TA
                </span>
                <div className="leading-none hidden sm:block">
                  <p className="text-[10.5px] font-bold text-slate-800 dark:text-slate-100">তানভীর আহমেদ</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">Sales Officer</p>
                </div>
                <span className="text-[9px] text-slate-400">▾</span>
              </div>
            </div>
          </div>

          {/* Main ERP Workspace Content */}
          <div className="p-3.5 sm:p-5 space-y-3.5 text-xs w-full min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ChapterScreenMockup({ mockupKey }: { mockupKey: ManualChapter["mockupKey"] }) {
  switch (mockupKey) {
    case "login":
      return (
        <EnterpriseErpMockupFrame
          activeNav="login"
          screenTitleBn="🖥️ স্ক্রিন মডেল ১: লগইন ও এন্টারপ্রাইজ ড্যাশবোর্ড (Live Enterprise ERP — Login & Dashboard)"
          routePath="#/dashboard"
          headerHighlightCallout
        >
          {/* Top Sub-Header: Welcome + Live Sync Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xs">
            <div>
              <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                স্বাগতম, তানভীর আহমেদ (Sales Officer • ঢাকা দক্ষিণ রুট)
              </p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                Hamko Group Cookware Unit • আজকের লাইভ সেলস ও কালেকশন ড্যাশবোর্ড
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg border-2 border-sky-500 bg-sky-500/15 text-sky-800 dark:text-sky-300 px-2.5 py-1 text-[10.5px] font-extrabold shadow-2xs">
                ② [🔄 রিফ্রেশ / Live Sync] ◄── সর্বশেষ হিসাব টানুন
              </span>
            </div>
          </div>

          {/* Split Row: ① Sign-In Authentication Card + Enterprise 6-KPI Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* Left: Sign In Card Preview */}
            <div className="xl:col-span-4 rounded-xl border-2 border-sky-500/50 bg-white dark:bg-slate-900 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-600 text-white font-black text-[10px]">
                    H
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                    🔐 ERP Sign In (/#/login)
                  </span>
                </div>
                <span className="rounded-full bg-sky-600 text-white px-2 py-0.5 text-[9.5px] font-bold">
                  ① লগইন ফরম
                </span>
              </div>
              <div className="space-y-1.5 text-[10.5px]">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 flex items-center justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    officer@hamko.com.bd
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 flex items-center justify-between">
                  <span className="text-slate-500">Password:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">•••••••• 👁️</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-sky-600 text-white px-3 py-1 font-extrabold text-[10.5px] shadow-2xs">
                    ① [ Sign In (প্রবেশ করুন) ]
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 underline font-bold">
                    Forgot Password?
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Enterprise 6 KPI Summary Cards Grid (Matches DashboardPage.tsx) */}
            <div className="xl:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 uppercase">
                  📊 এন্টারপ্রাইজ ড্যাশবোর্ডের ৬টি লাইভ সামারি কার্ড (Enterprise 6-KPI Grid):
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  ● Real-Time Metrics
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10.5px]">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2.5">
                  <span className="text-[9.5px] font-semibold text-slate-500 block">
                    আজকের বিক্রি (Today&apos;s Sales)
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">৳৪৮,৫০০</span>
                  <span className="block text-[9px] text-emerald-600 font-bold mt-0.5">▲ ৪টি অর্ডার</span>
                </div>
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5">
                  <span className="text-[9.5px] font-semibold text-sky-700 dark:text-sky-300 block">
                    চলতি মাসের বিক্রি (Monthly Sales)
                  </span>
                  <span className="text-sm font-black text-sky-700 dark:text-sky-300">৳১২,৮০,০০০</span>
                  <span className="block text-[9px] text-sky-600 font-bold mt-0.5">টার্গেটের ৮৪%</span>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                  <span className="text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                    মাসের আদায় (Month Collection)
                  </span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">৳৯,৪৫,০০০</span>
                  <span className="block text-[9px] text-emerald-600 font-bold mt-0.5">নগদ ও বিকাশ</span>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                  <span className="text-[9.5px] font-semibold text-amber-700 dark:text-amber-300 block">
                    মোট মার্কেট বকেয়া (Outstanding Due)
                  </span>
                  <span className="text-sm font-black text-amber-700 dark:text-amber-300">৳৩,৩৫,০০০</span>
                  <span className="block text-[9px] text-amber-600 font-bold mt-0.5">১৮টি দোকানে বাকি</span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2.5">
                  <span className="text-[9.5px] font-semibold text-slate-500 block">
                    মোট কাস্টমার (Total Customers)
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">১৪২টি দোকান</span>
                  <span className="block text-[9px] text-violet-600 font-bold mt-0.5">Dealer &amp; Retailer</span>
                </div>
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2.5">
                  <span className="text-[9.5px] font-semibold text-rose-700 dark:text-rose-300 block">
                    কম স্টক পণ্য (Low Stock Items)
                  </span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">৩টি আইটেম</span>
                  <span className="block text-[9px] text-rose-600 font-bold mt-0.5">⚠️ রিস্টক প্রয়োজন</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8-Tile Quick Action Hub — 4 columns x 2 rows so labels never wrap vertically */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                ① দ্রুত সেবা (8-Tile Quick Action Hub) ◄── এক ট্যাপে সরাসরি কাজের পেজে যান:
              </span>
              <span className="text-[11px] text-slate-500">বাম পাশের নীল সাইডবার মেনু থেকেও সব পেজে যাওয়া যায়</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-2.5 text-center">
                <p className="font-extrabold text-emerald-800 dark:text-emerald-300">① [+ নতুন অর্ডার]</p>
                <p className="text-slate-500 text-[10.5px] mt-0.5">ইনভয়েস বুকিং</p>
              </div>
              <div className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-2.5 text-center">
                <p className="font-bold text-teal-800 dark:text-teal-300">① [$ ক্যাশ কালেকশন]</p>
                <p className="text-slate-500 text-[10.5px] mt-0.5">বকেয়া টাকা আদায়</p>
              </div>
              <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-2.5 text-center">
                <p className="font-bold text-orange-800 dark:text-orange-300">① [+ পারচেজ চালান]</p>
                <p className="text-slate-500 text-[10.5px] mt-0.5">ফ্যাক্টরি স্টক ইন</p>
              </div>
              <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-2.5 text-center">
                <p className="font-bold text-violet-800 dark:text-violet-300">① [+ কাস্টমার]</p>
                <p className="text-slate-500 text-[10.5px] mt-0.5">নতুন দোকান যোগ</p>
              </div>
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-center">
                <p className="font-bold text-amber-800 dark:text-amber-300">① [ইনভেন্টরি স্টক]</p>
                <p className="text-slate-500 text-[10.5px] mt-0.5">গোডাউন মজুদ</p>
              </div>
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-2.5 text-center">
                <p className="font-bold text-indigo-800 dark:text-indigo-300">① [ফিল্ড ভিজিট]</p>
                <p className="text-slate-500 text-[10.5px] mt-0.5">রুট ও পিন হ্যান্ডওভার</p>
              </div>
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-center">
                <p className="font-bold text-rose-800 dark:text-rose-300">① [ব্যবহারবিধি]</p>
                <p className="text-slate-500 text-[10.5px] mt-0.5">সচিত্র গাইড ও PDF</p>
              </div>
              <div className="rounded-xl border-2 border-sky-500/50 bg-sky-500/10 p-2.5 text-center">
                <p className="font-extrabold text-sky-800 dark:text-sky-300">② [লাইভ সিঙ্ক]</p>
                <p className="text-slate-500 text-[10.5px] mt-0.5">ক্লাউড আপডেট</p>
              </div>
            </div>
          </div>
        </EnterpriseErpMockupFrame>
      );

    case "crm":
      return (
        <EnterpriseErpMockupFrame
          activeNav="crm"
          screenTitleBn="🏪 স্ক্রিন মডেল ২: কাস্টমার তালিকা ও নতুন দোকান নিবন্ধন (Live Enterprise ERP — CRM / Customers)"
          routePath="#/customers"
        >
          {/* Enterprise CRM Action & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-violet-600 text-white px-3 py-1.5 font-extrabold text-[11px] shadow-2xs">
                ① [ + নতুন কাস্টমার (+ Add Customer) ] ◄── নতুন দোকান যোগ করুন
              </span>
              <span className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[10.5px] text-slate-500">
                🔍 নাম, মোবাইল বা এলাকা লিখে খুঁজুন...
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300 px-2 py-1 font-bold">
                ② [এলাকা: চকবাজার ▾]
              </span>
              <span className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-1 font-semibold">
                ② [ধরন: Dealer / Retailer ▾]
              </span>
              <span className="rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2 py-1 font-bold">
                ② [বকেয়া: Overdue Only ▾]
              </span>
            </div>
          </div>

          {/* Enterprise Customer Table + Add Customer Modal Preview */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* Left: Enterprise Customer Data Table */}
            <div className="xl:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              <div className="bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10.5px] font-bold">
                <span>📋 নিবন্ধিত কাস্টমার ও বকেয়া তালিকা (Customer Directory Table)</span>
                <span className="text-slate-500">১৪২টি দোকান</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[520px] text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                      <th className="p-2 font-bold">দোকান ও মালিক (Outlet)</th>
                      <th className="p-2 font-bold">এলাকা ও ধরন</th>
                      <th className="p-2 font-bold text-right">বর্তমান বকেয়া (Due)</th>
                      <th className="p-2 font-bold text-right">অ্যাকশন (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    <tr className="bg-violet-500/5">
                      <td className="p-2">
                        <p className="font-extrabold text-slate-900 dark:text-white">বিসমিল্লাহ ক্রোকারিজ</p>
                        <p className="text-[9.5px] text-slate-500">মো. করিম • 📞 01711-234567</p>
                      </td>
                      <td className="p-2">
                        <span className="rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 text-[9.5px] font-bold">
                          Dealer
                        </span>
                        <span className="block text-[9.5px] text-slate-500 mt-0.5">📍 চকবাজার</span>
                      </td>
                      <td className="p-2 text-right font-extrabold text-amber-600 dark:text-amber-400">
                        ৳৩৪,৫০০
                      </td>
                      <td className="p-2 text-right">
                        <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[9.5px] font-extrabold">
                          ③ [💬 বাংলা তাগাদা]
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <p className="font-bold text-slate-900 dark:text-white">মায়ের দোয়া স্টোর</p>
                        <p className="text-[9.5px] text-slate-500">হাজী রফিক • 📞 01819-554433</p>
                      </td>
                      <td className="p-2">
                        <span className="rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[9.5px] font-bold">
                          Retailer
                        </span>
                        <span className="block text-[9.5px] text-slate-500 mt-0.5">📍 মিরপুর-১০</span>
                      </td>
                      <td className="p-2 text-right font-bold text-amber-600 dark:text-amber-400">
                        ৳১২,০০০
                      </td>
                      <td className="p-2 text-right">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9.5px] font-semibold">
                          [লেজার]
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: ① Add Customer Modal Form */}
            <div className="xl:col-span-5 rounded-xl border-2 border-violet-500/50 bg-white dark:bg-slate-900 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-[11px] font-extrabold text-violet-700 dark:text-violet-300">
                  ① নতুন দোকান নিবন্ধনের ফরম (Add Customer Modal)
                </span>
                <span className="text-[10px] text-slate-400 font-bold">✕</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10.5px]">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-1">
                  <span className="text-slate-500 text-[9.5px] block">Shop / Outlet Name *</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    বিসমিল্লাহ ক্রোকারিজ - চকবাজার
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-1">
                  <span className="text-slate-500 text-[9.5px] block">Owner / Contact Person</span>
                  <span className="font-semibold text-slate-900 dark:text-white">মো. করিম সাহেব</span>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-1">
                  <span className="text-slate-500 text-[9.5px] block">Mobile Phone *</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">01711-234567</span>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-1">
                  <span className="text-slate-500 text-[9.5px] block">Customer Type &amp; Opening Due</span>
                  <span className="font-bold text-violet-700 dark:text-violet-300">
                    Dealer ▾ • বকেয়া: ৳০
                  </span>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[9.5px] text-slate-500">📍 Area: চকবাজার (ঢাকা দক্ষিণ)</span>
                <span className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-[10.5px] font-extrabold shadow-2xs">
                  [ ✓ Save Customer (সেভ করুন) ]
                </span>
              </div>
            </div>
          </div>
        </EnterpriseErpMockupFrame>
      );

    case "products":
      return (
        <EnterpriseErpMockupFrame
          activeNav="products"
          screenTitleBn="🍲 স্ক্রিন মডেল ৩: পণ্যের ক্যাটালগ, প্রাইস টিয়ার ও স্টক টেবিল (Live Enterprise ERP — Products Catalog)"
          routePath="#/products"
        >
          {/* Search & Category Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 min-w-[220px] rounded-lg border-2 border-amber-500/50 bg-amber-500/5 px-3 py-1.5">
              <span className="font-extrabold text-amber-800 dark:text-amber-300 text-[11px]">
                ① [ 🔍 সার্চ বক্স: &quot;Pressure Cooker 5.5L&quot; বা SKU কোড &quot;HPC-550&quot; লিখুন... ]
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-[10.5px] font-bold">
                ① [ক্যাটাগরি: Pressure Cooker ▾]
              </span>
              <span className="rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2.5 py-1.5 text-[10.5px] font-bold">
                [🔄 স্টক রিফ্রেশ]
              </span>
            </div>
          </div>

          {/* Enterprise Multi-Tier Pricing & Live Stock Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <div className="bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
              <span className="font-extrabold text-slate-900 dark:text-white">
                📦 হামকো কুকওয়্যার প্রাইস লিস্ট ও লাইভ গোডাউন স্টক (Enterprise Product &amp; Tier Table)
              </span>
              <span className="text-amber-700 dark:text-amber-300 font-bold">
                ② কাস্টমারের ধরন অনুযায়ী DP / D10 / B12 রেট যাচাই করুন
              </span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[640px] text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300">
                    <th className="p-2.5 font-extrabold">পণ্যের নাম ও SKU কোড</th>
                    <th className="p-2.5 font-extrabold bg-amber-500/10 text-amber-800 dark:text-amber-300">
                      ② সাধারণ ডিলার (DP)
                    </th>
                    <th className="p-2.5 font-extrabold bg-sky-500/10 text-sky-800 dark:text-sky-300">
                      ② স্পেশাল টিয়ার (D10)
                    </th>
                    <th className="p-2.5 font-extrabold bg-purple-500/10 text-purple-800 dark:text-purple-300">
                      ② বাল্ক টিয়ার (B12)
                    </th>
                    <th className="p-2.5 font-bold">খুচরা (MRP)</th>
                    <th className="p-2.5 font-extrabold text-right">③ গোডাউন স্টক (Live Stock)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  <tr>
                    <td className="p-2.5">
                      <p className="font-extrabold text-slate-900 dark:text-white">
                        HAMKO Aluminum Pressure Cooker 5.5L
                      </p>
                      <p className="text-[9.5px] text-slate-500 font-mono">
                        SKU: <strong>HPC-550</strong> • Cookware • Unit: pcs
                      </p>
                    </td>
                    <td className="p-2.5 font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/5">
                      ৳১,৪৫০
                    </td>
                    <td className="p-2.5 font-extrabold text-sky-700 dark:text-sky-300 bg-sky-500/5">
                      ৳১,৩৮০
                    </td>
                    <td className="p-2.5 font-extrabold text-purple-700 dark:text-purple-300 bg-purple-500/5">
                      ৳১,৩৫০
                    </td>
                    <td className="p-2.5 font-semibold text-slate-500">৳১,৮৫০</td>
                    <td className="p-2.5 text-right">
                      <span className="inline-flex items-center gap-1 rounded-lg border-2 border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 font-extrabold">
                        ③ [🟢 In Stock: ১২০ পিস]
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5">
                      <p className="font-bold text-slate-900 dark:text-white">
                        HAMKO Marble Non-Stick Frypan 24cm
                      </p>
                      <p className="text-[9.5px] text-slate-500 font-mono">
                        SKU: <strong>HNF-240</strong> • Non-Stick • Unit: pcs
                      </p>
                    </td>
                    <td className="p-2.5 font-bold text-amber-700 dark:text-amber-300 bg-amber-500/5">
                      ৳৯৮০
                    </td>
                    <td className="p-2.5 font-bold text-sky-700 dark:text-sky-300 bg-sky-500/5">
                      ৳৯৩০
                    </td>
                    <td className="p-2.5 font-bold text-purple-700 dark:text-purple-300 bg-purple-500/5">
                      ৳৯১০
                    </td>
                    <td className="p-2.5 font-semibold text-slate-500">৳১,২৫০</td>
                    <td className="p-2.5 text-right">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-bold">
                        ③ [🟡 Low Stock: ৮ পিস]
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </EnterpriseErpMockupFrame>
      );

    case "orders":
      return (
        <EnterpriseErpMockupFrame
          activeNav="orders"
          screenTitleBn="🧾 স্ক্রিন মডেল ৪: নতুন অর্ডার বুকিং ও ইনভয়েস প্রিন্ট (Live Enterprise ERP — Sales Orders)"
          routePath="#/orders/create"
        >
          {/* Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 font-extrabold text-[11px] shadow-2xs">
                ① [ 🛒 + নতুন অর্ডার (+ New Order) ]
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border-2 border-purple-500/50 bg-purple-500/15 text-purple-800 dark:text-purple-300 px-2.5 py-1 font-extrabold text-[11px]">
                ① [ 🎙️ Smart Order AI (বাংলায় ভয়েস বা টেক্সটে অর্ডার) ]
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-bold">
                Pending
              </span>
              <span>→</span>
              <span className="rounded bg-sky-500/15 text-sky-800 dark:text-sky-300 px-2 py-0.5 font-bold">
                Approved
              </span>
              <span>→</span>
              <span className="rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 font-bold">
                Delivered (বকেয়া ও স্টক আপডেট)
              </span>
            </div>
          </div>

          {/* Enterprise Order Entry Card */}
          <div className="rounded-xl border-2 border-emerald-500/40 bg-white dark:bg-slate-900 p-3 space-y-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                📝 নতুন সেলস অর্ডার ফরম (Create Sales Order • Auto Invoice #ORD-202611-089)
              </span>
              <span className="text-[10px] font-semibold text-emerald-600">
                Sales Officer: তানভীর আহমেদ (SO-101)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
                <span className="text-[9.5px] text-slate-500 block">
                  ১. কাস্টমার / দোকান নির্বাচন (Select Customer) *
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  মায়ের দোয়া স্টোর — মিরপুর ১০ (পূর্বের বকেয়া: ৳১২,০০০) ▾
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
                <span className="text-[9.5px] text-slate-500 block">
                  ডেলিভারি গোডাউন ও তারিখ (Warehouse &amp; Order Date)
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Main Cookware Warehouse • আজ
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-lg border-2 border-sky-500/40 bg-sky-500/5 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold text-sky-800 dark:text-sky-300">
                  ② অর্ডারের পণ্য, প্রাইস টিয়ার (DP / D10 / B12) ও পরিমাণ যোগ করুন:
                </span>
                <span className="rounded-md bg-sky-600 text-white px-2.5 py-0.5 text-[10px] font-bold">
                  [+ Add Item (আরও পণ্য যুক্ত করুন)]
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 text-[10.5px] items-center">
                <div className="sm:col-span-5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-bold">
                  পণ্য: Hamko Pressure Cooker 5.5L (স্টক: ১২০) ▾
                </div>
                <div className="sm:col-span-3 rounded border-2 border-amber-500 bg-amber-500/15 px-2 py-1.5 font-extrabold text-amber-900 dark:text-amber-300">
                  ② টিয়ার: [ D10 (৳১,৩৮০) ▾ ]
                </div>
                <div className="sm:col-span-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-extrabold">
                  পরিমাণ: [ 20 ] পিস
                </div>
                <div className="sm:col-span-2 text-right font-black text-slate-900 dark:text-white text-xs">
                  = ৳২৭,৬০০
                </div>
              </div>
            </div>

            {/* Totals & Print Invoice Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  মোট বিল: <strong>৳২৭,৬০০</strong>
                </span>
                <span>
                  ডিসকাউন্ট: <strong>[ ৳৬০০ ]</strong>
                </span>
                <span>
                  নগদ জমা (Paid): <strong className="text-emerald-600">[ ৳৭,০০০ ]</strong>
                </span>
                <span className="rounded-md bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 font-extrabold text-amber-800 dark:text-amber-300">
                  নিট বাকি (Due): ৳২০,০০০
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-lg bg-emerald-600 text-white px-3 py-1 font-extrabold text-[11px] shadow-2xs">
                  [ ✓ Create Order (সাবমিট) ]
                </span>
                <span className="rounded-lg border-2 border-sky-500/50 bg-sky-500/15 text-sky-800 dark:text-sky-300 px-2.5 py-1 font-extrabold text-[10.5px]">
                  ③ [🖨️ প্রিন্ট ইনভয়েস (A4/POS)]
                </span>
              </div>
            </div>
          </div>
        </EnterpriseErpMockupFrame>
      );

    case "collections":
      return (
        <EnterpriseErpMockupFrame
          activeNav="collections"
          screenTitleBn="💵 স্ক্রিন মডেল ৫: ক্যাশ কালেকশন এন্ট্রি ও কাস্টমার বকেয়া লেজার (Live Enterprise ERP — Accounts & Due)"
          routePath="#/accounts"
        >
          {/* Accounts KPI Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px]">
            <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-2.5">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                ② আমার মোট কালেকশন (My Total Collections)
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">৳১,৪৫,০০০</span>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-white dark:bg-slate-900 p-2.5">
              <span className="font-bold text-sky-700 dark:text-sky-300 block">
                আজকের নগদ ও বিকাশ আদায় (Today&apos;s Collection)
              </span>
              <span className="text-base font-black text-sky-700 dark:text-sky-300">৳৪৫,০০০</span>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">
                ③ মোট কাস্টমার বকেয়া (Total Customer Due)
              </span>
              <span className="text-base font-black text-amber-700 dark:text-amber-300">৳৩,১৫,০০০</span>
            </div>
          </div>

          {/* Top Action Bar & 4 Financial Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xs">
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 font-extrabold text-[11px] shadow-2xs">
              ① [ 💵 + নগদ কালেকশন (+ Cash Collection) ] ◄── টাকা আদায় এন্ট্রি দিন
            </span>
            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              <span className="rounded-md bg-sky-600 text-white px-2.5 py-1 font-bold">
                [১. নগদ কালেকশন]
              </span>
              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-600 dark:text-slate-300 font-semibold">
                [২. খরচ এন্ট্রি]
              </span>
              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-600 dark:text-slate-300 font-semibold">
                [৩. দৈনিক ক্যাশ বুক]
              </span>
              <span className="rounded-md border-2 border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-300 px-2.5 py-1 font-extrabold">
                ③ [৪. কাস্টমার বকেয়া (Customer Due)]
              </span>
            </div>
          </div>

          {/* Collection Entry Modal + Auto Due Reduction Preview */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 text-[11px]">
            <div className="xl:col-span-7 rounded-xl border-2 border-teal-500/40 bg-white dark:bg-slate-900 p-3 space-y-2 shadow-2xs">
              <p className="font-extrabold text-teal-800 dark:text-teal-300 border-b border-slate-200 dark:border-slate-800 pb-1">
                ① টাকা আদায়ের ফরম (Record Customer Payment Modal):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
                  <span className="text-[9.5px] text-slate-500 block">Customer (দোকানের নাম) *</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    বিসমিল্লাহ ক্রোকারিজ (বকেয়া: ৳৩৪,৫০০) ▾
                  </span>
                </div>
                <div className="rounded-lg border-2 border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1.5">
                  <span className="text-[9.5px] text-emerald-800 dark:text-emerald-300 font-bold block">
                    Amount (আদায়কৃত টাকার পরিমাণ) *
                  </span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">৳২০,০০০</span>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
                  <span className="text-[9.5px] text-slate-500 block">Payment Method (মাধ্যম)</span>
                  <span className="font-bold">Cash / Mobile Banking (bKash) ▾</span>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
                  <span className="text-[9.5px] text-slate-500 block">Notes / TrxID / Cheque No</span>
                  <span className="font-semibold">নগদ প্রাপ্তি (রিসিট #COL-2041)</span>
                </div>
              </div>
              <div className="pt-1 flex justify-end">
                <span className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-[10.5px] font-extrabold shadow-2xs">
                  [ ✓ Save &amp; Print Money Receipt ]
                </span>
              </div>
            </div>

            <div className="xl:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col justify-between space-y-2 shadow-2xs">
              <p className="font-extrabold text-amber-800 dark:text-amber-300 border-b border-slate-200 dark:border-slate-800 pb-1">
                ③ কাস্টমার বকেয়া লেজারে অটোমেটিক সমন্বয়:
              </p>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">বিসমিল্লাহ ক্রোকারিজের আগের বকেয়া:</span>
                  <span className="font-bold">৳৩৪,৫০০</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-extrabold">
                  <span>আজকের কালেকশন এন্ট্রি (−):</span>
                  <span>− ৳২০,০০০</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 font-black text-amber-600 text-xs">
                  <span>বর্তমান নিট বকেয়া (Auto Updated):</span>
                  <span>৳১৪,৫০০</span>
                </div>
              </div>
            </div>
          </div>
        </EnterpriseErpMockupFrame>
      );

    case "inventory":
      return (
        <EnterpriseErpMockupFrame
          activeNav="inventory"
          screenTitleBn="📦 স্ক্রিন মডেল ৬: গোডাউন ইনভেন্টরি ও কম স্টকের সতর্কতা (Live Enterprise ERP — Warehouse Inventory)"
          routePath="#/inventory"
        >
          {/* 3 Enterprise Inventory KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div className="rounded-xl border border-emerald-500/40 bg-white dark:bg-slate-900 p-2.5 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold block">
                ① সচল পণ্য (Available SKUs in Stock)
              </span>
              <span className="text-base font-black text-emerald-600">৬৮টি আইটেম</span>
            </div>
            <div className="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-2.5 shadow-2xs">
              <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 block">
                ① কম স্টক সতর্কতা (Low Stock Alert)
              </span>
              <span className="text-base font-black text-amber-700 dark:text-amber-300">৩টি আইটেম ⚠️</span>
            </div>
            <div className="rounded-xl border border-rose-500/40 bg-white dark:bg-slate-900 p-2.5 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold block">
                ① স্টক শেষ (Out of Stock SKUs)
              </span>
              <span className="text-base font-black text-rose-600">০টি আইটেম</span>
            </div>
          </div>

          {/* Filter Tabs + Warehouse Stock Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5 shadow-2xs text-[11px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-lg bg-sky-600 text-white px-2.5 py-1 text-[10px] font-bold">
                  ② [All Inventory (সব পণ্য)]
                </span>
                <span className="rounded-lg border-2 border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-300 px-2.5 py-1 text-[10px] font-extrabold">
                  ② [⚠️ Low Stock (কম স্টক ফিল্টার)]
                </span>
                <span className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-semibold">
                  [Out of Stock]
                </span>
              </div>
              <span className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                ② [ 🔍 পণ্য বা SKU লিখে খুঁজুন... ]
              </span>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                ③ অটোমেটিক স্টক লেজার: ফ্যাক্টরি পারচেজ চালান এন্ট্রি দিলে স্টক বাড়ে (+) এবং অর্ডার Delivered হলে স্টক অটোমেটিক কমে (−)
              </span>
              <span className="rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 font-bold">
                Main Cookware Warehouse
              </span>
            </div>
          </div>
        </EnterpriseErpMockupFrame>
      );

    case "sfa":
      return (
        <EnterpriseErpMockupFrame
          activeNav="sfa"
          screenTitleBn="📍 স্ক্রিন মডেল ৭: রুট প্ল্যান, ভিজিট লগ ও সন্ধ্যার ক্যাশ হ্যান্ডওভার পিন (Live Enterprise ERP — SFA)"
          routePath="#/sfa"
        >
          {/* Top SFA Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-3 py-1.5 font-extrabold text-[11px] shadow-2xs">
                ① [ 📍 + ভিজিট লগ করুন (+ Log Visit) ]
              </span>
              <span className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold">
                ② [🗺️ আজকের রুট: চকবাজার ও মিরপুর]
              </span>
              <span className="rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300 px-2.5 py-1 text-[10px] font-bold">
                ② [🎯 মাসিক টার্গেট: ৮৪% অর্জিত]
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg border-2 border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 px-3 py-1 font-extrabold text-[11px]">
              ③ [ 🔐 Evening Handover (দিনশেষের ক্যাশ জমা) ]
            </span>
          </div>

          {/* Visit Check-In + Evening Handover PIN Verification Card */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 text-[11px]">
            <div className="xl:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 shadow-2xs">
              <p className="font-extrabold text-indigo-700 dark:text-indigo-300 border-b border-slate-200 dark:border-slate-800 pb-1">
                ① দোকান ভিজিট লগ এন্ট্রি (Shop Visit Check-In):
              </p>
              <p>
                <strong>দোকান (Outlet):</strong> মায়ের দোয়া স্টোর (মিরপুর-১০ রুট)
              </p>
              <p>
                <strong>ভিজিটের উদ্দেশ্য:</strong> Order Booking &amp; Due Collection
              </p>
              <p>
                <strong>ফলাফল (Outcome):</strong>{" "}
                <span className="text-emerald-600 font-extrabold">
                  ✓ ২০ পিস কুকারের অর্ডার ও ৳৭,০০০ নগদ আদায়
                </span>
              </p>
            </div>

            <div className="xl:col-span-6 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/5 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1">
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                  ③ সন্ধ্যায় ক্যাশিয়ারের কাছে ক্যাশ হ্যান্ডওভার পিন স্লিপ:
                </span>
                <span className="rounded-md bg-emerald-600 text-white px-2.5 py-0.5 font-mono font-black text-xs shadow-2xs">
                  PIN: 4829
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5">
                  <span className="text-[9.5px] text-slate-500 block">নগদ (Cash)</span>
                  <span className="font-extrabold">৳৩৫,০০০</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5">
                  <span className="text-[9.5px] text-slate-500 block">বিকাশ (bKash)</span>
                  <span className="font-extrabold">৳১০,০০০</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 border-2 border-emerald-500/50 p-1.5">
                  <span className="text-[9.5px] text-emerald-700 dark:text-emerald-300 font-bold block">
                    মোট জমা
                  </span>
                  <span className="font-black text-emerald-600">৳৪৫,০০০</span>
                </div>
              </div>
            </div>
          </div>
        </EnterpriseErpMockupFrame>
      );

    case "troubleshooting":
      return (
        <EnterpriseErpMockupFrame
          activeNav="troubleshooting"
          screenTitleBn="🛠️ স্ক্রিন মডেল ৮: জরুরি সমস্যা সমাধান ও লাইভ সিঙ্ক কন্ট্রোল (Live Enterprise ERP — Self-Service Controls)"
          routePath="#/manual"
          headerHighlightCallout
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div className="rounded-xl border-2 border-sky-500/50 bg-white dark:bg-slate-900 p-3 space-y-1.5 shadow-2xs">
              <span className="inline-flex items-center gap-1 rounded-lg bg-sky-600 text-white px-2.5 py-1 font-extrabold text-[10.5px]">
                ① [ 🔄 Live Sync / Refresh ]
              </span>
              <p className="font-extrabold text-slate-900 dark:text-white">
                ডেটা বা স্টক আপডেট না দেখালে:
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-[10.5px] leading-relaxed">
                যেকোনো পেজের উপরে ডানপাশে থাকা এই বাটনে ১ বার চাপ দিলেই অফিসের মূল ক্লাউড সার্ভার থেকে সর্বশেষ হিসাব সিঙ্ক হয়ে যাবে।
              </p>
            </div>

            <div className="rounded-xl border-2 border-amber-500/50 bg-white dark:bg-slate-900 p-3 space-y-1.5 shadow-2xs">
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-2.5 py-1 font-extrabold text-[10.5px]">
                ② [ Ctrl ] + [ F5 ] (হার্ড রিফ্রেশ)
              </span>
              <p className="font-extrabold text-slate-900 dark:text-white">
                ব্রাউজার পেজ বা বাটন আটকে গেলে:
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-[10.5px] leading-relaxed">
                কম্পিউটারে Ctrl + F5 একসাথে চাপুন অথবা মোবাইলে পেজটি ওপর থেকে নিচে টেনে (Pull-to-Refresh) রিলোড করুন।
              </p>
            </div>

            <div className="rounded-xl border-2 border-emerald-500/50 bg-white dark:bg-slate-900 p-3 space-y-1.5 shadow-2xs">
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 font-extrabold text-[10.5px]">
                ③ [ 🔑 Forgot Password? (OTP) ]
              </span>
              <p className="font-extrabold text-slate-900 dark:text-white">পাসওয়ার্ড ভুলে গেলে:</p>
              <p className="text-slate-600 dark:text-slate-400 text-[10.5px] leading-relaxed">
                লগইন পেজে OTP দিয়ে রিসেট করুন অথবা সুপার অ্যাডমিনকে জানালে তিনি User Management থেকে ১ মিনিটে নতুন পাসওয়ার্ড দিয়ে দেবেন।
              </p>
            </div>
          </div>
        </EnterpriseErpMockupFrame>
      );
  }
}

/**
 * Pure-Hex A4 PDF table wrapper replicating the live Enterprise Web ERP shell:
 * - Left Blue/Slate Sidebar column with HAMKO Cookware logo + 8 menu items (active route highlighted in #0284c7 blue)
 * - Right Top Header Bar with Active Page Name, [📖 ব্যবহারবিধি], [🌐 EN / বাং], [🔔 2], and [TA] তানভীর আহমেদ (Sales Officer)
 * - Right Main Workspace containing the chapter's exact production UI representation & ① ② ③ callout badges
 */
function wrapPdfEnterpriseErpShell(
  activeNav: ManualChapter["mockupKey"],
  bannerTitle: string,
  routeUrl: string,
  workspaceHtml: string,
): string {
  const sidebarRowsHtml = ERP_SIDEBAR_ITEMS.map((item) => {
    const isActive = item.id === activeNav;
    return `
      <div style="padding: 3px 6px; margin-bottom: 2px; border-radius: 4px; font-size: 9px; font-weight: ${
        isActive ? "800" : "600"
      }; background: ${isActive ? "#0284c7" : "#f8fafc"}; color: ${
        isActive ? "#ffffff" : "#334155"
      }; border: 1px solid ${isActive ? "#0369a1" : "#e2e8f0"};">
        ${item.iconText} ${escapeHtml(item.labelBn)}
      </div>`;
  }).join("");

  const activeItem = ERP_SIDEBAR_ITEMS.find((i) => i.id === activeNav);

  return `
  <div class="avoid-break" style="border: 2px solid #334155; border-radius: 7px; margin-bottom: 10px; background: #ffffff; overflow: hidden;">
    <!-- Browser Window Top Bar -->
    <div style="background: #0f172a; color: #f8fafc; padding: 4px 10px; font-size: 10px; font-weight: 700; border-bottom: 1px solid #1e293b;">
      ● ● ● &nbsp; ${bannerTitle} &nbsp;|&nbsp; <span style="color: #38bdf8; font-family: monospace;">https://hamko-erp.app/${routeUrl}</span>
    </div>
    <!-- Enterprise ERP 2-Column Layout: Left Sidebar + Right Header & Workspace -->
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <!-- Left Permanent Sidebar -->
        <td style="width: 21%; vertical-align: top; background: #f1f5f9; border-right: 1.5px solid #cbd5e1; padding: 6px;">
          <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 5px;">
            <span style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 900; font-size: 10px; padding: 1px 5px; border-radius: 3px; margin-right: 3px;">H</span>
            <strong style="font-size: 10px; color: #0f172a;">HAMKO ERP</strong>
            <div style="font-size: 8px; color: #0369a1; font-weight: 700;">COOKWARE UNIT</div>
          </div>
          ${sidebarRowsHtml}
        </td>
        <!-- Right Main Content Area -->
        <td style="width: 79%; vertical-align: top; background: #f8fafc; padding: 0;">
          <!-- Top Header Bar (AppLayout.tsx) -->
          <div style="background: #ffffff; border-bottom: 1px solid #cbd5e1; padding: 5px 8px; font-size: 9.5px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="border: none; padding: 0; font-weight: 800; color: #0f172a; font-size: 10.5px;">
                  ${activeItem ? `${activeItem.iconText} ${escapeHtml(activeItem.labelBn)} (${escapeHtml(activeItem.labelEn)})` : "Dashboard"}
                </td>
                <td style="border: none; padding: 0; text-align: right;">
                  <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 1px 5px; border-radius: 3px; font-weight: 700; color: #334155;">📖 ব্যবহারবিধি</span>
                  <span style="background: #fef3c7; border: 1px solid #d97706; padding: 1px 5px; border-radius: 3px; font-weight: 700; color: #b45309; margin-left: 3px;">③ 🌐 EN / বাং</span>
                  <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 1px 5px; border-radius: 3px; font-weight: 700; color: #0f172a; margin-left: 3px;">🔔 2</span>
                  <span style="background: #e0f2fe; border: 1px solid #0284c7; padding: 1px 6px; border-radius: 3px; font-weight: 700; color: #0369a1; margin-left: 3px;">[TA] তানভীর (SO) ▾</span>
                </td>
              </tr>
            </table>
          </div>
          <!-- Workspace Body -->
          <div style="padding: 7px 9px; font-size: 10px;">
            ${workspaceHtml}
          </div>
        </td>
      </tr>
    </table>
  </div>`;
}

function buildMockupHtmlForPdf(mockupKey: ManualChapter["mockupKey"]): string {
  switch (mockupKey) {
    case "login":
      return wrapPdfEnterpriseErpShell(
        "login",
        "🖥️ সচিত্র স্ক্রিন মডেল ১: লগইন ও এন্টারপ্রাইজ ড্যাশবোর্ড (Live Enterprise ERP — Login & Dashboard)",
        "#/dashboard",
        `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
          <tr>
            <td style="width: 40%; vertical-align: top; border: 1.5px solid #0284c7; background: #ffffff; padding: 6px 8px;">
              <div style="font-weight: 800; color: #0369a1; margin-bottom: 3px;">🔐 ① ERP Sign In (/#/login)</div>
              <div style="border: 1px solid #94a3b8; padding: 2px 6px; margin-bottom: 3px; font-size: 9.5px;">Email: <strong>officer@hamko.com.bd</strong></div>
              <div style="border: 1px solid #94a3b8; padding: 2px 6px; margin-bottom: 4px; font-size: 9.5px;">Password: <strong>••••••••</strong></div>
              <span style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 700; padding: 2px 8px; border-radius: 3px; font-size: 9.5px;">
                ① [ Sign In (প্রবেশ করুন) ]
              </span>
            </td>
            <td style="width: 60%; vertical-align: top; border: 1px solid #cbd5e1; background: #ffffff; padding: 6px 8px;">
              <div style="margin-bottom: 4px;">
                <strong>📊 ৬টি লাইভ KPI কার্ড:</strong> &nbsp;
                <span style="background: #e0f2fe; border: 1px solid #0284c7; color: #0369a1; font-weight: 700; padding: 1px 6px; border-radius: 3px;">
                  ② [🔄 রিফ্রেশ / Live Sync]
                </span>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                <tr>
                  <td style="border: 1px solid #cbd5e1; padding: 3px 5px;">Today&apos;s Sales: <strong>৳৪৮,৫০০</strong></td>
                  <td style="border: 1px solid #cbd5e1; padding: 3px 5px;">Monthly Sales: <strong style="color:#0284c7;">৳১২,৮০,০০০</strong></td>
                  <td style="border: 1px solid #cbd5e1; padding: 3px 5px;">Collection: <strong style="color:#059669;">৳৯,৪৫,০০০</strong></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #cbd5e1; padding: 3px 5px;">Market Due: <strong style="color:#b45309;">৳৩,৩৫,০০০</strong></td>
                  <td style="border: 1px solid #cbd5e1; padding: 3px 5px;">Customers: <strong>১৪২টি দোকান</strong></td>
                  <td style="border: 1px solid #cbd5e1; padding: 3px 5px;">Low Stock: <strong style="color:#be123c;">৩টি পণ্য</strong></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <tr>
            <td style="border: 1.5px solid #059669; background: #ecfdf5; padding: 3px; text-align: center; font-weight: 700; color: #065f46;">① [+ নতুন অর্ডার]</td>
            <td style="border: 1px solid #0d9488; background: #f0fdfa; padding: 3px; text-align: center; font-weight: 700; color: #0f766e;">① [$ ক্যাশ কালেকশন]</td>
            <td style="border: 1px solid #ea580c; background: #fff7ed; padding: 3px; text-align: center; font-weight: 700; color: #c2410c;">① [+ পারচেজ চালান]</td>
            <td style="border: 1px solid #7c3aed; background: #f5f3ff; padding: 3px; text-align: center; font-weight: 700; color: #6d28d9;">① [+ কাস্টমার]</td>
            <td style="border: 1px solid #d97706; background: #fffbeb; padding: 3px; text-align: center; font-weight: 700; color: #b45309;">① [ইনভেন্টরি স্টক]</td>
            <td style="border: 1px solid #4f46e5; background: #eef2ff; padding: 3px; text-align: center; font-weight: 700; color: #4338ca;">① [ফিল্ড ভিজিট]</td>
            <td style="border: 1px solid #e11d48; background: #fff1f2; padding: 3px; text-align: center; font-weight: 700; color: #be123c;">① [ব্যবহারবিধি]</td>
            <td style="border: 1.5px solid #0284c7; background: #f0f9ff; padding: 3px; text-align: center; font-weight: 700; color: #0369a1;">② [লাইভ সিঙ্ক]</td>
          </tr>
        </table>`,
      );

    case "crm":
      return wrapPdfEnterpriseErpShell(
        "crm",
        "🏪 সচিত্র স্ক্রিন মডেল ২: কাস্টমার তালিকা ও নতুন দোকান নিবন্ধন (Live Enterprise ERP — CRM Screen)",
        "#/customers",
        `
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; background: #7c3aed; color: #ffffff; font-weight: 700; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">
            ① [ + নতুন কাস্টমার (+ Add Customer) ]
          </span>
          <span style="display: inline-block; background: #fef3c7; border: 1px solid #d97706; color: #b45309; font-weight: 700; padding: 2px 7px; border-radius: 3px;">
            ② [ফিল্টার: এলাকা (চকবাজার) • Dealer/Retailer • বকেয়া (Overdue) ▾]
          </span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
          <tr>
            <td style="width: 58%; border: 1px solid #cbd5e1; background: #ffffff; padding: 5px 7px;">
              <strong>📋 কাস্টমার টেবিল: বিসমিল্লাহ ক্রোকারিজ</strong> (মালিক: মো. করিম • 📞 01711-234567)<br/>
              ধরন: <strong>Dealer</strong> • এলাকা: চকবাজার • বর্তমান বকেয়া: <strong style="color: #b45309;">৳৩৪,৫০০</strong> &nbsp;
              <span style="background: #ecfdf5; border: 1px solid #059669; color: #065f46; font-weight: 700; padding: 1px 5px; border-radius: 3px;">
                ③ [💬 বাংলা তাগাদা মেসেজ]
              </span>
            </td>
            <td style="width: 42%; border: 1.5px solid #7c3aed; background: #f5f3ff; padding: 5px 7px;">
              <strong>① নতুন দোকান ফরম (Add Customer):</strong><br/>
              Shop Name *, Mobile *, Type (Dealer), Opening Due (৳০) ➔ <strong style="color: #059669;">[✓ Save]</strong>
            </td>
          </tr>
        </table>`,
      );

    case "products":
      return wrapPdfEnterpriseErpShell(
        "products",
        "🍲 সচিত্র স্ক্রিন মডেল ৩: পণ্যের দাম ও গোডাউন স্টক টেবিল (Live Enterprise ERP — Products Catalog)",
        "#/products",
        `
        <div style="border: 1px solid #94a3b8; background: #ffffff; padding: 3px 7px; border-radius: 3px; margin-bottom: 5px;">
          <strong>① [ 🔍 সার্চ বক্স: &quot;Pressure Cooker 5.5L&quot; বা SKU কোড &quot;HPC-550&quot; লিখুন... ]</strong> &nbsp;|&nbsp; <strong>① [ক্যাটাগরি: Cookware ▾]</strong>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
          <tr style="background: #e2e8f0; font-weight: 700;">
            <td style="border: 1px solid #cbd5e1; padding: 3px 6px;">পণ্য ও SKU কোড</td>
            <td style="border: 1px solid #cbd5e1; padding: 3px 6px; color: #b45309;">② DP রেট</td>
            <td style="border: 1px solid #cbd5e1; padding: 3px 6px; color: #0369a1;">② D10 টিয়ার</td>
            <td style="border: 1px solid #cbd5e1; padding: 3px 6px; color: #6d28d9;">② B12 টিয়ার</td>
            <td style="border: 1px solid #cbd5e1; padding: 3px 6px;">③ গোডাউন স্টক</td>
          </tr>
          <tr style="background: #ffffff;">
            <td style="border: 1px solid #cbd5e1; padding: 4px 6px;"><strong>HAMKO Pressure Cooker 5.5L</strong> (HPC-550)</td>
            <td style="border: 1px solid #cbd5e1; padding: 4px 6px; font-weight: 700;">৳১,৪৫০</td>
            <td style="border: 1px solid #cbd5e1; padding: 4px 6px; font-weight: 700; color: #0369a1;">৳১,৩৮০</td>
            <td style="border: 1px solid #cbd5e1; padding: 4px 6px; font-weight: 700; color: #6d28d9;">৳১,৩৫০</td>
            <td style="border: 1.5px solid #059669; background: #ecfdf5; padding: 4px 6px; font-weight: 700; color: #065f46;">③ 🟢 In Stock: ১২০ পিস</td>
          </tr>
        </table>`,
      );

    case "orders":
      return wrapPdfEnterpriseErpShell(
        "orders",
        "🧾 সচিত্র স্ক্রিন মডেল ৪: নতুন অর্ডার বুকিং ও ইনভয়েস প্রিন্ট (Live Enterprise ERP — Sales Orders)",
        "#/orders/create",
        `
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; background: #059669; color: #ffffff; font-weight: 700; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">
            ① [ 🛒 + নতুন অর্ডার (+ New Order) ]
          </span>
          <span style="display: inline-block; background: #f3e8ff; border: 1px solid #7c3aed; color: #6d28d9; font-weight: 700; padding: 2px 7px; border-radius: 3px;">
            ① [ 🎙️ Smart Order AI (বাংলা ভয়েস/টেক্সট অর্ডার) ]
          </span>
        </div>
        <div style="border: 1px solid #94a3b8; background: #ffffff; padding: 5px 7px; border-radius: 3px; margin-bottom: 4px;">
          <strong>কাস্টমার:</strong> [ মায়ের দোয়া স্টোর ▾ ] &nbsp;|&nbsp; <strong>পণ্য:</strong> [ Pressure Cooker 5.5L ▾ ] &nbsp;|&nbsp;
          <strong style="color: #b45309;">② টিয়ার: [ D10 (৳১,৩৮০) ▾ ]</strong> &nbsp;|&nbsp; <strong>পরিমাণ: [ 20 পিস ]</strong> = <strong>৳২৭,৬০০</strong>
        </div>
        <div style="border: 1px solid #86efac; background: #f0fdf4; padding: 4px 7px; border-radius: 3px;">
          মোট বিল: <strong>৳২৭,৬০০</strong> &nbsp;|&nbsp; ছাড়: <strong>[৳৬০০]</strong> &nbsp;|&nbsp; নগদ জমা: <strong style="color: #059669;">[৳৭,০০০]</strong> &nbsp;|&nbsp;
          <strong style="color: #b45309;">নিট বাকি (Due): ৳২০,০০০</strong> &nbsp;➔&nbsp;
          <strong style="color: #059669;">[✓ Create Order]</strong> &nbsp;
          <strong style="color: #0369a1;">③ [🖨️ প্রিন্ট ইনভয়েস]</strong>
        </div>`,
      );

    case "collections":
      return wrapPdfEnterpriseErpShell(
        "collections",
        "💵 সচিত্র স্ক্রিন মডেল ৫: ক্যাশ কালেকশন ও বকেয়া লেজার (Live Enterprise ERP — Accounts & Due)",
        "#/accounts",
        `
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; background: #059669; color: #ffffff; font-weight: 700; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">
            ① [ 💵 + নগদ কালেকশন (+ Cash Collection) ]
          </span>
          <span style="display: inline-block; background: #fef3c7; border: 1px solid #d97706; color: #b45309; font-weight: 700; padding: 2px 7px; border-radius: 3px;">
            ③ [ট্যাব: ১. নগদ কালেকশন • ২. খরচ • ৩. দৈনিক ক্যাশ বুক • ৪. কাস্টমার বকেয়া]
          </span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
          <tr>
            <td style="width: 60%; border: 1px solid #cbd5e1; background: #ffffff; padding: 5px 7px;">
              <strong>কাস্টমার:</strong> [ বিসমিল্লাহ ক্রোকারিজ (বকেয়া: ৳৩৪,৫০০) ▾ ]<br/>
              <strong>আদায় (Amount):</strong> <strong style="color: #059669;">[ ৳২০,০০০ ]</strong> &nbsp;|&nbsp; <strong>মাধ্যম:</strong> [ Cash / bKash ▾ ] &nbsp;➔&nbsp; <strong>[✓ Save]</strong>
            </td>
            <td style="width: 40%; border: 1px solid #86efac; background: #f0fdf4; padding: 5px 7px;">
              <strong>② আমার মোট কালেকশন: ৳১,৪৫,০০০</strong><br/>
              <span style="color: #b45309; font-weight: 700;">③ নতুন বকেয়া: ৳১৪,৫০০ (অটো আপডেট)</span>
            </td>
          </tr>
        </table>`,
      );

    case "inventory":
      return wrapPdfEnterpriseErpShell(
        "inventory",
        "📦 সচিত্র স্ক্রিন মডেল ৬: গোডাউন ইনভেন্টরি ও কম স্টকের তালিকা (Live Enterprise ERP — Inventory)",
        "#/inventory",
        `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5px;">
          <tr>
            <td style="border: 1px solid #86efac; background: #f0fdf4; padding: 4px 7px; font-weight: 700; color: #15803d;">① সচল পণ্য (Available): ৬৮টি</td>
            <td style="border: 1.5px solid #d97706; background: #fffbeb; padding: 4px 7px; font-weight: 700; color: #b45309;">① কম স্টক (Low Stock): ৩টি ⚠️</td>
            <td style="border: 1px solid #fda4af; background: #fff1f2; padding: 4px 7px; font-weight: 700; color: #be123c;">① স্টক শেষ (Out of Stock): ০টি</td>
          </tr>
        </table>
        <div style="border: 1px solid #cbd5e1; background: #ffffff; padding: 4px 7px; border-radius: 3px;">
          <strong>② ফিল্টার ট্যাব: [All Inventory] [⚠️ Low Stock] [Out of Stock]</strong> &nbsp;|&nbsp;
          <span style="color: #0369a1; font-weight: 700;">③ অটো স্টক সমন্বয়: পারচেজ চালান (+) ও অর্ডার ডেলিভারি (−)</span>
        </div>`,
      );

    case "sfa":
      return wrapPdfEnterpriseErpShell(
        "sfa",
        "📍 সচিত্র স্ক্রিন মডেল ৭: রুট প্ল্যান, ভিজিট লগ ও সন্ধ্যার হ্যান্ডওভার পিন (Live Enterprise ERP — SFA)",
        "#/sfa",
        `
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; background: #4f46e5; color: #ffffff; font-weight: 700; padding: 2px 8px; border-radius: 3px; margin-right: 4px;">
            ① [ 📍 + ভিজিট লগ করুন (+ Log Visit) ]
          </span>
          <span style="display: inline-block; background: #e0f2fe; border: 1px solid #0284c7; color: #0369a1; font-weight: 700; padding: 2px 6px; border-radius: 3px; margin-right: 4px;">
            ② [রুট প্ল্যান ও টার্গেট: ৮৪%]
          </span>
          <span style="display: inline-block; background: #ecfdf5; border: 1.5px solid #059669; color: #065f46; font-weight: 700; padding: 2px 7px; border-radius: 3px;">
            ③ [ 🔐 Evening Handover (পিন কোড: 4829) ]
          </span>
        </div>
        <div style="border: 1px solid #cbd5e1; background: #ffffff; padding: 4px 7px; border-radius: 3px;">
          <strong>আজকের হ্যান্ডওভার সামারি:</strong> নগদ (Cash): <strong>৳৩৫,০০০</strong> &nbsp;|&nbsp; বিকাশ (bKash): <strong>৳১০,০০০</strong> &nbsp;|&nbsp;
          মোট জমা: <strong style="color: #059669;">৳৪৫,০০০</strong> &nbsp;|&nbsp; ক্যাশিয়ার ভেরিফিকেশন পিন: <strong style="color: #0369a1;">[ 4 8 2 9 ]</strong>
        </div>`,
      );

    case "troubleshooting":
      return wrapPdfEnterpriseErpShell(
        "troubleshooting",
        "🛠️ সচিত্র স্ক্রিন মডেল ৮: দ্রুত সমস্যা সমাধান ও লাইভ সিঙ্ক কন্ট্রোল (Live Enterprise ERP — Troubleshooting)",
        "#/manual",
        `
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
          <tr>
            <td style="width: 33.33%; border: 1px solid #cbd5e1; background: #ffffff; padding: 5px 7px;">
              <strong style="color: #0284c7;">① [ 🔄 Live Sync / Refresh ]</strong><br/>
              নেটওয়ার্ক ফিরলে বা নতুন ডেটা দেখতে একবার চাপুন।
            </td>
            <td style="width: 33.33%; border: 1px solid #cbd5e1; background: #ffffff; padding: 5px 7px;">
              <strong style="color: #b45309;">② [ Ctrl ] + [ F5 ]</strong><br/>
              কম্পিউটার ব্রাউজারে পেজ আটকে গেলে একসাথে চাপুন।
            </td>
            <td style="width: 33.33%; border: 1px solid #cbd5e1; background: #ffffff; padding: 5px 7px;">
              <strong style="color: #059669;">③ [ 🔑 Forgot Password? ]</strong><br/>
              OTP দিয়ে রিসেট করুন অথবা সুপার অ্যাডমিনকে জানান।
            </td>
          </tr>
        </table>`,
      );
  }
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds a 100% self-contained, pure-Hex/RGB A4 HTML document with zero external Tailwind v4
 * `oklch()` / `color-mix()` stylesheets or complex flex/grid containers, guaranteeing 100%
 * compatibility with Windows "Microsoft Print to PDF", physical laser printers, and html2pdf.js.
 */
function buildStandaloneA4ManualHtml(
  chapters: ManualChapter[],
  langMode: ManualLangMode,
  includeToolbar = true,
  orientationMode: ManualOrientationMode = "hybrid",
): string {
  const showBn = langMode === "bilingual" || langMode === "bn";
  const showEn = langMode === "bilingual" || langMode === "en";

  const routineRowsHtml = [
    {
      step: langMode === "en" ? "Step 1 (9:00 AM)" : "ধাপ ১ (সকাল ৯:০০)",
      titleBn: "লগইন ও স্টক দেখা",
      titleEn: "Login & Check Stock",
      descBn: "অ্যাপে ঢুকে ড্যাশবোর্ড রিফ্রেশ দিন এবং কোন পণ্যের স্টক কত আছে ও আজকের রুট প্ল্যান দেখে নিন।",
      descEn: "Sign in, tap Refresh, check warehouse stock & today's route plan.",
    },
    {
      step: langMode === "en" ? "Step 2 (Market Visit)" : "ধাপ ২ (মার্কেট ভিজিট)",
      titleBn: "নতুন দোকান ও ভিজিট লগ",
      titleEn: "Add Shop & Log Visit",
      descBn: "নতুন দোকান হলে CRM-এ '+ নতুন কাস্টমার' অ্যাড করুন এবং SFA-তে '+ ভিজিট লগ' এন্ট্রি দিন।",
      descEn: "Register any new outlet in CRM and log your shop call in SFA.",
    },
    {
      step: langMode === "en" ? "Step 3 (Order Booking)" : "ধাপ ৩ (অর্ডার বুকিং)",
      titleBn: "+ নতুন অর্ডার তৈরি",
      titleEn: "Book Sales Order",
      descBn: "দোকানদারের চাহিদা অনুযায়ী '+ নতুন অর্ডার'-এ গিয়ে পণ্য ও প্রাইস টিয়ার (DP/D10) বসিয়ে অর্ডার সাবমিট করুন।",
      descEn: "Tap '+ New Order', select products & price tier (DP/D10), and save.",
    },
    {
      step: langMode === "en" ? "Step 4 (Collection)" : "ধাপ ৪ (বকেয়া আদায়)",
      titleBn: "$ ক্যাশ কালেকশন এন্ট্রি",
      titleEn: "Record Cash Collection",
      descBn: "নগদ, বিকাশ বা চেক যা-ই আদায় করবেন, সাথে সাথে '$ ক্যাশ কালেকশন'-এ এন্ট্রি দিয়ে মানি রিসিট দিন।",
      descEn: "Log every cash, bKash, or cheque payment immediately in Accounts.",
    },
    {
      step: langMode === "en" ? "Step 5 (7:00 PM)" : "ধাপ ৫ (সন্ধ্যা ৭:০০)",
      titleBn: "ইভিনিং ক্যাশ হ্যান্ডওভার",
      titleEn: "Evening Cash Handover",
      descBn: "অফিসে ফিরে SFA পেজের 'Evening Handover' থেকে ৪-ডিজিট পিন কোড ও সারাদিনের ক্যাশ জমা দিন।",
      descEn: "Submit your daily cash & 4-digit Handover PIN to the office cashier.",
    },
  ]
    .map(
      (r) => `
      <tr>
        <td style="width: 22%; font-weight: 700; color: #0369a1; background: #f0f9ff;">${escapeHtml(r.step)}</td>
        <td style="width: 28%; font-weight: 700; color: #0f172a;">
          ${showBn ? `<div>${escapeHtml(r.titleBn)}</div>` : ""}
          ${showEn ? `<div style="font-size: 10.5px; color: #0284c7;">${escapeHtml(r.titleEn)}</div>` : ""}
        </td>
        <td style="width: 50%; color: #1e293b;">
          ${showBn ? `<div>${escapeHtml(r.descBn)}</div>` : ""}
          ${showEn ? `<div style="font-size: 10.5px; color: #475569; margin-top: 2px;">${escapeHtml(r.descEn)}</div>` : ""}
        </td>
      </tr>`,
    )
    .join("");

  const chaptersHtml = chapters
    .map((ch) => {
      const calloutsHtml = ch.screenCallouts
        .map(
          (sc) => `
          <td style="width: 33.33%; vertical-align: top; border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 10px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 11.5px; margin-bottom: 3px;">
              <span style="display: inline-block; background: #0284c7; color: #ffffff; border-radius: 4px; padding: 1px 6px; margin-right: 4px; font-size: 10.5px;">${escapeHtml(sc.badge)}</span>
              ${showBn ? escapeHtml(sc.nameBn) : escapeHtml(sc.nameEn)}
            </div>
            ${showBn && showEn ? `<div style="font-size: 10px; color: #0369a1; font-weight: 600; margin-bottom: 3px;">${escapeHtml(sc.nameEn)}</div>` : ""}
            ${showBn ? `<div style="font-size: 11px; color: #1e293b; line-height: 1.4;">${escapeHtml(sc.actionBn)}</div>` : ""}
            ${showEn ? `<div style="font-size: 10px; color: #475569; line-height: 1.35; margin-top: 2px;">${escapeHtml(sc.actionEn)}</div>` : ""}
          </td>`,
        )
        .join("");

      const stepsHtml = ch.howToSteps
        .map(
          (st) => `
          <div class="avoid-break" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 11px; margin-bottom: 7px; background: #ffffff;">
            <div style="font-weight: 700; font-size: 12px; color: #0f172a; margin-bottom: 3px;">
              <span style="display: inline-block; background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; border-radius: 4px; padding: 0 6px; margin-right: 6px;">${escapeHtml(st.stepNum)}</span>
              ${showBn ? escapeHtml(st.titleBn) : escapeHtml(st.titleEn)}
              ${showBn && showEn ? `<span style="font-size: 11px; color: #0284c7; font-weight: 600;"> — ${escapeHtml(st.titleEn)}</span>` : ""}
            </div>
            ${showBn ? `<div style="font-size: 11.5px; color: #1e293b; line-height: 1.45;">${escapeHtml(st.descBn)}</div>` : ""}
            ${showEn ? `<div style="font-size: 10.5px; color: #475569; line-height: 1.4; margin-top: 3px;">${escapeHtml(st.descEn)}</div>` : ""}
          </div>`,
        )
        .join("");

      return `
      <!-- PART A: PORTRAIT NARRATIVE & STEP-BY-STEP GUIDELINES -->
      <div class="portrait-sheet-block chapter-block" style="border: 1.5px solid #94a3b8; border-radius: 8px; background: #ffffff; padding: 12px 14px;">
        <div class="avoid-break" style="border-bottom: 1.5px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px; background: #f8fafc; padding: 8px 10px; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; color: #0369a1; text-transform: uppercase;">
            <span>${escapeHtml(ch.chapterNo)} &nbsp;|&nbsp; 📍 ${escapeHtml(langMode === "en" ? ch.menuNameEn : ch.menuNameBn)}</span>
            <span style="background: #e0f2fe; border: 1px solid #7dd3fc; color: #0369a1; padding: 1px 7px; border-radius: 4px; font-size: 9.5px;">📄 Portrait Narrative &amp; Steps</span>
          </div>
          ${showBn ? `<div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${escapeHtml(ch.titleBn)}</div>` : ""}
          ${showEn ? `<div style="font-size: 12.5px; font-weight: 700; color: #0284c7; margin-top: 1px;">${escapeHtml(ch.titleEn)}</div>` : ""}
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            ${showBn ? escapeHtml(ch.subtitleBn) : ""} ${showBn && showEn ? " • " : ""} ${showEn ? escapeHtml(ch.subtitleEn) : ""}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;" class="avoid-break">
          <tr>
            <td style="width: 50%; vertical-align: top; border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 10px;">
              <div style="font-size: 10.5px; font-weight: 700; color: #0369a1; margin-bottom: 3px;">কেন এই কাজটি গুরুত্বপূর্ণ? (Overview)</div>
              ${showBn ? `<div style="font-size: 11px; color: #0f172a; line-height: 1.45;">${escapeHtml(ch.whyItMattersBn)}</div>` : ""}
              ${showEn ? `<div style="font-size: 10px; color: #475569; line-height: 1.35; margin-top: 3px;">${escapeHtml(ch.whyItMattersEn)}</div>` : ""}
            </td>
            <td style="width: 50%; vertical-align: top; border: 1px solid #bae6fd; background: #f0f9ff; padding: 8px 10px;">
              <div style="font-size: 10.5px; font-weight: 700; color: #0284c7; margin-bottom: 3px;">বাস্তব উদাহরণ (Real-World Scenario)</div>
              ${showBn ? `<div style="font-size: 11px; color: #0f172a; line-height: 1.45;">${escapeHtml(ch.realScenarioBn)}</div>` : ""}
              ${showEn ? `<div style="font-size: 10px; color: #334155; line-height: 1.35; margin-top: 3px;">${escapeHtml(ch.realScenarioEn)}</div>` : ""}
            </td>
          </tr>
        </table>

        <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
          কীভাবে করবেন? — ধাপে ধাপে নির্দেশনা (Step-by-Step Textual Guidelines):
        </div>
        ${stepsHtml}

        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;" class="avoid-break">
          <tr>
            <td style="width: 50%; vertical-align: top; border: 1px solid #86efac; background: #f0fdf4; padding: 8px 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #15803d; margin-bottom: 2px;">💡 মাঠ পর্যায়ের কার্যকরী টিপস (Field Pro-Tip):</div>
              ${showBn ? `<div style="font-size: 11px; color: #0f172a; line-height: 1.4;">${escapeHtml(ch.proTipBn)}</div>` : ""}
              ${showEn ? `<div style="font-size: 10px; color: #334155; line-height: 1.35; margin-top: 2px;">${escapeHtml(ch.proTipEn)}</div>` : ""}
            </td>
            <td style="width: 50%; vertical-align: top; border: 1px solid #fcd34d; background: #fffbeb; padding: 8px 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #b45309; margin-bottom: 2px;">⚠️ সাধারণ ভুল থেকে সতর্কতা (Warning):</div>
              ${showBn ? `<div style="font-size: 11px; color: #0f172a; line-height: 1.4;">${escapeHtml(ch.mistakeWarningBn)}</div>` : ""}
              ${showEn ? `<div style="font-size: 10px; color: #334155; line-height: 1.35; margin-top: 2px;">${escapeHtml(ch.mistakeWarningEn)}</div>` : ""}
            </td>
          </tr>
        </table>
      </div>

      <!-- PART B: WIDE LANDSCAPE ENTERPRISE UI SCREEN BREAKDOWN & FIELD REFERENCE MATRIX -->
      <div class="landscape-sheet-block" style="border: 2px solid #0284c7; border-radius: 8px; background: #ffffff; padding: 12px 15px;">
        <div class="avoid-break" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #bae6fd; padding-bottom: 6px; margin-bottom: 9px;">
          <div style="font-size: 12px; font-weight: 800; color: #0f172a;">
            🖥️ ${escapeHtml(ch.chapterNo)} — সচিত্র ইআরপি স্ক্রিন মডেল ও ফিল্ড রেফারেন্স (Wide Landscape UI Breakdown &amp; Callouts ① ② ③)
          </div>
          <span style="background: #0284c7; color: #ffffff; font-weight: 700; font-size: 9.5px; padding: 2px 8px; border-radius: 4px;">
            📐 Wide Landscape Canvas (No Text Clipping)
          </span>
        </div>

        ${buildMockupHtmlForPdf(ch.mockupKey)}
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;" class="avoid-break">
          <tr>${calloutsHtml}</tr>
        </table>

        <div class="avoid-break" style="margin-top: 8px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin-bottom: 5px;">
            📋 ফিল্ড ও বাটন রেফারেন্স টেবিল (Line-by-Line UI Field &amp; Button Mapping Matrix):
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
            <thead>
              <tr style="background: #e2e8f0; color: #0f172a;">
                <th style="border: 1px solid #94a3b8; padding: 5px 8px; text-align: left; width: 25%;">বাটন / ইনপুট ফিল্ড (UI Element)</th>
                <th style="border: 1px solid #94a3b8; padding: 5px 8px; text-align: left; width: 19%;">ফিল্ডের ধরন (Control Type)</th>
                <th style="border: 1px solid #94a3b8; padding: 5px 8px; text-align: left; width: 56%;">সিস্টেমের কাজ ও নিয়ম (Exact System Behavior)</th>
              </tr>
            </thead>
            <tbody>
              ${ch.fieldMappings
                .map(
                  (fm) => `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: 700; color: #0f172a; background: #f8fafc; vertical-align: top;">
                  ${escapeHtml(fm.elementLabel)}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; color: #0369a1; font-weight: 600; background: #ffffff; vertical-align: top;">
                  ${showBn ? `<div>${escapeHtml(fm.controlTypeBn)}</div>` : ""}
                  ${showEn ? `<div style="font-size: 9.5px; color: #475569;">${escapeHtml(fm.controlTypeEn)}</div>` : ""}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; color: #1e293b; background: #ffffff; vertical-align: top; line-height: 1.4;">
                  ${showBn ? `<div>${escapeHtml(fm.systemBehaviorBn)}</div>` : ""}
                  ${showEn ? `<div style="font-size: 9.5px; color: #475569; margin-top: 2px;">${escapeHtml(fm.systemBehaviorEn)}</div>` : ""}
                </td>
              </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    })
    .join("");

  const checklistHtml = [
    {
      bn: "১. আজ যতগুলো দোকানে ভিজিট করেছেন, সবগুলোর 'Log Visit' এন্ট্রি দেওয়া হয়েছে কি?",
      en: "1. Have all shop visits from today's market route been logged in SFA?",
    },
    {
      bn: "২. আজকের সব নতুন অর্ডার সাবমিট করা এবং ডেলিভারি হওয়া অর্ডারের স্ট্যাটাস 'Delivered' করা হয়েছে কি?",
      en: "2. Are all new orders submitted and completed deliveries marked as 'Delivered'?",
    },
    {
      bn: "৩. দোকান থেকে তোলা প্রতিটি নগদ টাকা, বিকাশ ও চেক '$ ক্যাশ কালেকশন'-এ এন্ট্রি দিয়েছেন কি?",
      en: "3. Has every cash, bKash, and cheque payment collected today been entered in Cash Collection?",
    },
    {
      bn: "৪. SFA পেজের 'Evening Handover' থেকে ৪-ডিজিট পিন কোড নিয়ে ক্যাশিয়ারের কাছে টাকা বুঝিয়ে দিয়েছেন কি?",
      en: "4. Did you generate your 4-digit Evening Handover PIN and deposit physical cash with the cashier?",
    },
    {
      bn: "৫. সবশেষে উপরে 'Live Sync / Refresh' বাটনে একবার চাপ দিয়ে সব হিসাব ক্লাউডে সিঙ্ক নিশ্চিত করেছেন কি?",
      en: "5. Did you tap 'Live Sync / Refresh' once at the end to confirm 100% cloud synchronization?",
    },
  ]
    .map(
      (item) => `
      <div style="border-bottom: 1px solid #e2e8f0; padding: 6px 0;">
        ${showBn ? `<div style="font-size: 11.5px; font-weight: 700; color: #0f172a;">☑ ${escapeHtml(item.bn)}</div>` : ""}
        ${showEn ? `<div style="font-size: 10.5px; color: #475569; margin-top: 1px;">${escapeHtml(item.en)}</div>` : ""}
      </div>`,
    )
    .join("");

  const defaultPageRule =
    orientationMode === "landscape"
      ? "size: A4 landscape; margin: 10mm 12mm;"
      : "size: A4 portrait; margin: 11mm 13mm;";

  const portraitMaxWidth = orientationMode === "landscape" ? "273mm" : "188mm";
  const landscapeMaxWidth = orientationMode === "portrait" ? "188mm" : "273mm";

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hamko_Sales_ERP_User_Manual_A4</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      ${defaultPageRule}
    }
    @page portrait-sheet {
      size: A4 portrait;
      margin: 11mm 13mm;
    }
    @page landscape-sheet {
      size: A4 landscape;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #0f172a;
      font-family: 'Hind Siliguri', 'Nirmala UI', 'Segoe UI', 'Inter', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .page-wrapper {
      width: 100%;
      max-width: 275mm;
      margin: 0 auto;
      padding: 12px 10px;
      background-color: #ffffff;
    }
    .portrait-sheet-block {
      ${orientationMode === "hybrid" ? "page: portrait-sheet;" : ""}
      width: 100%;
      max-width: ${portraitMaxWidth};
      margin: 0 auto 16px auto;
    }
    .landscape-sheet-block {
      ${orientationMode === "hybrid" ? "page: landscape-sheet;" : ""}
      width: 100%;
      max-width: ${landscapeMaxWidth};
      margin: 0 auto 20px auto;
    }
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      border-bottom: 2px solid #0284c7;
      margin-bottom: 14px;
    }
    .print-btn {
      background: #059669;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .close-btn {
      background: #334155;
      color: #ffffff;
      border: 1px solid #64748b;
      border-radius: 6px;
      padding: 8px 14px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      margin-left: 8px;
    }
    table.routine-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.routine-table th,
    table.routine-table td {
      border: 1px solid #94a3b8;
      padding: 7px 9px;
      font-size: 11px;
      vertical-align: top;
      text-align: left;
    }
    table.routine-table th {
      background-color: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      .print-toolbar {
        display: none !important;
      }
      .page-wrapper {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
    }
  </style>
</head>
<body>
  ${
    includeToolbar
      ? `<div class="print-toolbar">
          <div>
            <strong>HAMKO Sales ERP — Dynamic Portrait &amp; Landscape A4 Print Preview</strong>
            <span style="font-size: 11px; color: #94a3b8; margin-left: 10px;">Select &quot;Save as PDF&quot; or &quot;Microsoft Print to PDF&quot;</span>
          </div>
          <div>
            <button class="print-btn" onclick="window.focus(); window.print();">🖨️ Print / Save A4 PDF</button>
            <button class="close-btn" onclick="window.close();">✕ Close</button>
          </div>
        </div>`
      : ""
  }
  <div id="manual-a4-root" class="page-wrapper">
    <!-- Document Header (Portrait Sheet) -->
    <div class="portrait-sheet-block avoid-break" style="border: 2px solid #0284c7; border-radius: 8px; padding: 14px 16px; background: #f0f9ff;">
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">
        <span>HAMKO GROUP COOKWARE UNIT • হামকো গ্রুপ কুকওয়্যার ইউনিট</span>
        <span style="background: #0284c7; color: #ffffff; padding: 1px 8px; border-radius: 4px; font-size: 9.5px;">📄 Portrait Title &amp; Overview</span>
      </div>
      ${showBn ? `<h1 style="margin: 4px 0 2px 0; font-size: 20px; font-weight: 800; color: #0f172a;">হামকো সেলস ইআরপি (Hamko Sales ERP) — সহজ ও সচিত্র ব্যবহারবিধি</h1>` : ""}
      ${showEn ? `<h2 style="margin: 2px 0 4px 0; font-size: 14.5px; font-weight: 700; color: #0284c7;">Complete Field Sales Officer Onboarding &amp; Operations Manual (A-to-Z Guide)</h2>` : ""}
      <div style="font-size: 11px; color: #334155; margin-top: 4px;">
        ${showBn ? "নতুন সেলস অফিসারদের জন্য প্রথম দিন থেকে নিজে নিজে অ্যাপ পরিচালনার পূর্ণাঙ্গ গাইড (পোট্রেট ওভারভিউ এবং ওয়াইড ল্যান্ডস্কেপ স্ক্রিন ও টেবিল ব্রেকডাউন)।" : "Step-by-step daily field guide featuring Portrait textual guidelines paired with Wide Landscape UI screen breakdowns and pricing tables."}
      </div>
    </div>

    <!-- 5-Step Daily Routine Table (Portrait Sheet) -->
    <div class="portrait-sheet-block avoid-break">
      <div style="font-size: 13px; font-weight: 800; color: #065f46; margin-bottom: 6px;">
        এক নজরে একজন সেলস অফিসারের সারাদিনের ৫টি মূল কাজ (5-Step Daily Routine: 9:00 AM – 7:00 PM)
      </div>
      <table class="routine-table">
        <thead>
          <tr>
            <th>সময় ও ধাপ (Step)</th>
            <th>মূল কাজ (Action)</th>
            <th>কীভাবে করবেন? (What to Do)</th>
          </tr>
        </thead>
        <tbody>
          ${routineRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- 8 Detailed Chapters (Dynamic Portrait Narrative + Wide Landscape UI Breakdown) -->
    ${chaptersHtml}

    <!-- Daily Closing Checklist (Portrait Sheet) -->
    <div class="portrait-sheet-block avoid-break" style="border: 1.5px solid #059669; border-radius: 8px; padding: 12px 14px; background: #f0fdf4; margin-top: 14px;">
      <div style="font-size: 13.5px; font-weight: 800; color: #065f46; margin-bottom: 6px;">
        সেলস অফিসারের দিনশেষের চেকলিস্ট (Daily Closing Checklist Before Leaving Office)
      </div>
      ${checklistHtml}
    </div>
  </div>
</body>
</html>`;
}

export function UserManualPage() {
  const [langMode, setLangMode] = useState<ManualLangMode>("bilingual");
  const [orientationMode, setOrientationMode] = useState<ManualOrientationMode>("hybrid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const showBn = langMode === "bilingual" || langMode === "bn";
  const showEn = langMode === "bilingual" || langMode === "en";

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CHAPTERS;
    return CHAPTERS.filter(
      (ch) =>
        ch.titleBn.toLowerCase().includes(q) ||
        ch.titleEn.toLowerCase().includes(q) ||
        ch.subtitleBn.toLowerCase().includes(q) ||
        ch.subtitleEn.toLowerCase().includes(q) ||
        ch.whyItMattersBn.toLowerCase().includes(q) ||
        ch.whyItMattersEn.toLowerCase().includes(q) ||
        ch.realScenarioBn.toLowerCase().includes(q) ||
        ch.howToSteps.some(
          (st) =>
            st.titleBn.toLowerCase().includes(q) ||
            st.titleEn.toLowerCase().includes(q) ||
            st.descBn.toLowerCase().includes(q) ||
            st.descEn.toLowerCase().includes(q),
        ),
    );
  }, [searchQuery]);

  /**
   * 1. Isolated Clean Window / Iframe Print Handler:
   * Renders a pure-Hex HTML document completely detached from the main app's Tailwind v4 `oklch()`
   * stylesheets and React layout tree so Windows "Microsoft Print to PDF" and laser printers
   * spool 100% cleanly without GDI/XPS driver exceptions.
   */
  const handlePrintPdf = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);
    const htmlContent = buildStandaloneA4ManualHtml(filteredChapters, langMode, true, orientationMode);

    try {
      // Primary: Open isolated standalone print window (zero external CSS conflicts)
      const printWin = window.open("", "_blank");
      if (printWin && printWin.document) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();

        const triggerWinPrint = () => {
          try {
            printWin.focus();
            printWin.print();
          } catch (e) {
            console.warn("[UserManual] Popup window print notice:", e);
          } finally {
            setIsPreparingPrint(false);
          }
        };

        if ((printWin.document as any).fonts?.ready) {
          (printWin.document as any).fonts.ready.then(() => {
            setTimeout(triggerWinPrint, 250);
          }).catch(() => {
            setTimeout(triggerWinPrint, 400);
          });
        } else {
          setTimeout(triggerWinPrint, 450);
        }
        return;
      }

      // Fallback if popup blocker prevented window.open: use an isolated hidden iframe
      const existingFrame = document.getElementById("hamko-isolated-print-iframe");
      if (existingFrame && existingFrame.parentNode) {
        existingFrame.parentNode.removeChild(existingFrame);
      }

      const iframe = document.createElement("iframe");
      iframe.id = "hamko-isolated-print-iframe";
      iframe.title = "Hamko_Sales_ERP_User_Manual_A4";
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:297mm;height:210mm;border:0;opacity:0;pointer-events:none;z-index:-9999;";
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!frameDoc || !iframe.contentWindow) {
        throw new Error("Unable to initialize print frame");
      }

      frameDoc.open();
      frameDoc.write(buildStandaloneA4ManualHtml(filteredChapters, langMode, false, orientationMode));
      frameDoc.close();

      const runFramePrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error("[UserManual] Iframe print error:", err);
          toast.error("Printer driver busy. Use 'Direct Save .PDF' button instead.");
        } finally {
          setTimeout(() => {
            setIsPreparingPrint(false);
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 2000);
        }
      };

      if ((frameDoc as any).fonts?.ready) {
        (frameDoc as any).fonts.ready.then(() => {
          setTimeout(runFramePrint, 250);
        }).catch(() => {
          setTimeout(runFramePrint, 450);
        });
      } else {
        setTimeout(runFramePrint, 500);
      }
    } catch (err) {
      console.error("[UserManual] Print error:", err);
      setIsPreparingPrint(false);
      toast.error("Could not open print preview. Try 'Direct Save .PDF' instead.");
    }
  }, [filteredChapters, isPreparingPrint, langMode, orientationMode]);

  /**
   * 2. Direct One-Click `.PDF` File Download via `html2pdf.js` inside an isolated pure-Hex iframe:
   * Completely bypasses Windows print drivers / Microsoft Print to PDF spooler and saves
   * `Hamko_Sales_ERP_User_Manual_A4.pdf` directly to the user's Downloads folder.
   */
  const handleDirectDownloadPdf = useCallback(async () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (isDownloadingPdf) return;

    setIsDownloadingPdf(true);
    const toastId = `manual-pdf-${Date.now()}`;
    toast.loading("Generating A4 PDF file (পিডিএফ ফাইল তৈরি হচ্ছে)...", { id: toastId });

    const useWideCanvas = orientationMode === "landscape" || orientationMode === "hybrid";
    const renderWidthPx = useWideCanvas ? 1080 : 794;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${renderWidthPx}px;height:1123px;border:0;background:#ffffff;z-index:-9999;`;
    document.body.appendChild(iframe);

    try {
      const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!frameDoc) {
        throw new Error("Could not create isolated PDF render document");
      }

      frameDoc.open();
      frameDoc.write(buildStandaloneA4ManualHtml(filteredChapters, langMode, false, orientationMode));
      frameDoc.close();

      if ((frameDoc as any).fonts?.ready) {
        await Promise.race([
          (frameDoc as any).fonts.ready,
          new Promise((r) => setTimeout(r, 1200)),
        ]);
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }

      const targetEl = frameDoc.getElementById("manual-a4-root") || frameDoc.body;

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: "Hamko_Sales_ERP_User_Manual_A4.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: renderWidthPx,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: orientationMode === "landscape" ? "landscape" : "portrait",
          },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        } as any)
        .from(targetEl)
        .save();

      toast.dismiss(toastId);
      toast.success("A4 PDF downloaded successfully! (পিডিএফ ডাউনলোড সম্পন্ন হয়েছে)");
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error("[UserManual] Direct PDF download error:", err);
      toast.error("Direct PDF generation failed. Opening clean A4 Print view instead...");
      handlePrintPdf();
    } finally {
      setIsDownloadingPdf(false);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  }, [filteredChapters, handlePrintPdf, isDownloadingPdf, langMode, orientationMode]);

  return (
    <div id="print-user-manual" className="manual-root w-full max-w-none min-w-0 space-y-6 pb-12">

      {/* =====================================================================
          HERO BANNER & LANGUAGE / A4 PDF CONTROLS
         ===================================================================== */}
      <Card className="w-full max-w-none min-w-0 rounded-2xl border-primary/30 bg-gradient-to-r from-primary/10 via-card to-emerald-500/10 shadow-sm overflow-hidden print-avoid-break">
        <CardContent className="p-5 sm:p-6 md:p-8 space-y-4">
          <div className="space-y-2 w-full min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground text-xs px-2.5 py-0.5">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                সেলস অফিসার অনবোর্ডিং হ্যান্ডবুক • Sales Officer Field Guide
              </Badge>
              <Badge
                variant="outline"
                className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
              >
                হামকো গ্রুপ কুকওয়্যার ইউনিট • Hamko Group Cookware Unit
              </Badge>
            </div>

            {showBn && (
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mt-1 leading-snug">
                হামকো সেলস ইআরপি (Hamko Sales ERP) — সহজ ও সচিত্র ব্যবহারবিধি
              </h1>
            )}
            {showEn && (
              <h2 className="text-base sm:text-lg font-bold text-primary leading-snug">
                Complete Day-One Onboarding &amp; Field Operations Manual (Step-by-Step)
              </h2>
            )}
            <p className="text-xs sm:text-sm text-muted-foreground w-full leading-relaxed">
              {showBn &&
                "হামকো কুকওয়্যার ইউনিটে নতুন যোগদানকারী যেকোনো সেলস অফিসার যেন কারো সাহায্য ছাড়াই প্রথম দিন থেকে নিজে নিজে কাস্টমার যোগ, স্টক চেক, নতুন অর্ডার তৈরি, ক্যাশ কালেকশন এবং সন্ধ্যার ক্যাশ হ্যান্ডওভার করতে পারেন—সেজন্যই এই সহজ গাইডটি তৈরি করা হয়েছে। "}
              {showEn &&
                "Designed so any new Sales Officer can independently manage outlets, check live stock, book cookware orders, collect payments, and complete evening cash handovers from day one."}
            </p>
          </div>

          {/* Language Switcher, Dynamic Orientation Switcher & A4 PDF Print Buttons in full-width bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 no-print w-full">
            <div className="flex flex-wrap items-center gap-2">
              {/* Language Switcher */}
              <div className="inline-flex flex-wrap rounded-xl border border-border bg-card p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setLangMode("bilingual")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    langMode === "bilingual"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  বাংলা + English
                </button>
                <button
                  type="button"
                  onClick={() => setLangMode("bn")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    langMode === "bn"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  শুধু বাংলা
                </button>
                <button
                  type="button"
                  onClick={() => setLangMode("en")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    langMode === "en"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  English Only
                </button>
              </div>

              {/* Dynamic Orientation Switcher (Portrait + Landscape Hybrid / Portrait / Landscape) */}
              <div className="inline-flex flex-wrap rounded-xl border border-sky-500/30 bg-card p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setOrientationMode("hybrid")}
                  title="Overview & Steps in Portrait + UI Mockups & Tables in Wide Landscape"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    orientationMode === "hybrid"
                      ? "bg-sky-600 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📐 পোট্রেট + ল্যান্ডস্কেপ (Dynamic)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientationMode("portrait")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    orientationMode === "portrait"
                      ? "bg-sky-600 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📄 পোট্রেট (Portrait)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientationMode("landscape")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    orientationMode === "landscape"
                      ? "bg-sky-600 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🖥️ ল্যান্ডস্কেপ (Landscape)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleDirectDownloadPdf}
                disabled={isDownloadingPdf || isPreparingPrint}
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9 px-4 rounded-xl"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isDownloadingPdf
                    ? "Downloading PDF..."
                    : "Download PDF (A4) / পিডিএফ ডাউনলোড"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handlePrintPdf}
                disabled={isPreparingPrint || isDownloadingPdf}
                size="sm"
                className="gap-1.5 h-9 px-3.5 rounded-xl"
              >
                <Printer className="h-4 w-4 text-primary" />
                <span>
                  {isPreparingPrint
                    ? "Opening Print..."
                    : "Print A4 / প্রিন্ট"}
                </span>
              </Button>
            </div>
          </div>

          {/* Search & Quick Chapter Navigation Pills */}
          <div className="pt-3 border-t border-border/60 flex flex-col md:flex-row md:items-center gap-3 no-print w-full">
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="খুঁজুন (যেমন: অর্ডার, কালেকশন, স্টক, হ্যান্ডওভার)..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              {CHAPTERS.map((ch, idx) => (
                <a
                  key={ch.id}
                  href={`#${ch.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(ch.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/70 hover:bg-primary/15 hover:text-primary transition-colors border border-border/60"
                >
                  অধ্যায় {idx + 1}
                </a>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================================
          AT-A-GLANCE DAILY WORKFLOW ROADMAP FOR SALES OFFICERS
          (এক নজরে সেলস অফিসারের সারাদিনের কাজের ধাপ)
         ===================================================================== */}
      <Card className="w-full max-w-none min-w-0 rounded-2xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-sky-500/5 shadow-xs overflow-hidden print-avoid-break">
        <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/40">
          <CardTitle className="text-sm sm:text-base md:text-lg font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Clock className="h-5 w-5 shrink-0" />
            <span>
              {langMode === "en"
                ? "At a Glance: A Sales Officer's 5-Step Daily Routine (Morning to Evening)"
                : "এক নজরে একজন সেলস অফিসারের সারাদিনের ৫টি মূল কাজ (সকাল থেকে সন্ধ্যা)"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 w-full">
            {[
              {
                step: "ধাপ ১ (সকাল ৯:০০)",
                stepEn: "Step 1 (9:00 AM)",
                titleBn: "লগইন ও স্টক দেখা",
                titleEn: "Login & Check Stock",
                descBn: "অ্যাপে ঢুকে ড্যাশবোর্ড রিফ্রেশ দিন এবং কোন পণ্যের স্টক কত আছে ও আজকের রুট প্ল্যান দেখে নিন।",
                descEn: "Sign in, tap Refresh, check warehouse stock & today's route plan.",
                color: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
              },
              {
                step: "ধাপ ২ (মার্কেট ভিজিট)",
                stepEn: "Step 2 (Market Visit)",
                titleBn: "নতুন দোকান ও ভিজিট লগ",
                titleEn: "Add Shop & Log Visit",
                descBn: "নতুন দোকান হলে CRM-এ '+ নতুন কাস্টমার' অ্যাড করুন এবং SFA-তে '+ ভিজিট লগ' এন্ট্রি দিন।",
                descEn: "Register any new outlet in CRM and log your shop call in SFA.",
                color: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
              },
              {
                step: "ধাপ ৩ (অর্ডার বুকিং)",
                stepEn: "Step 3 (Order Booking)",
                titleBn: "+ নতুন অর্ডার তৈরি",
                titleEn: "Book Sales Order",
                descBn: "দোকানদারের চাহিদা অনুযায়ী '+ নতুন অর্ডার'-এ গিয়ে পণ্য ও প্রাইস টিয়ার (DP/D10) বসিয়ে অর্ডার সাবমিট করুন।",
                descEn: "Tap '+ New Order', select products & price tier (DP/D10), and save.",
                color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              },
              {
                step: "ধাপ ৪ (বকেয়া আদায়)",
                stepEn: "Step 4 (Collection)",
                titleBn: "$ ক্যাশ কালেকশন এন্ট্রি",
                titleEn: "Record Cash Collection",
                descBn: "নগদ, বিকাশ বা চেক যা-ই আদায় করবেন, সাথে সাথে '$ ক্যাশ কালেকশন'-এ এন্ট্রি দিয়ে মানি রিসিট দিন।",
                descEn: "Log every cash, bKash, or cheque payment immediately in Accounts.",
                color: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
              },
              {
                step: "ধাপ ৫ (সন্ধ্যা ৭:০০)",
                stepEn: "Step 5 (7:00 PM)",
                titleBn: "ইভিনিং ক্যাশ হ্যান্ডওভার",
                titleEn: "Evening Cash Handover",
                descBn: "অফিসে ফিরে SFA পেজের 'Evening Handover' থেকে ৪-ডিজিট পিন কোড ও সারাদিনের ক্যাশ জমা দিন।",
                descEn: "Submit your daily cash & 4-digit Handover PIN to the office cashier.",
                color: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`rounded-xl border p-3.5 space-y-1.5 min-w-0 ${item.color}`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-85">
                  {langMode === "en" ? item.stepEn : item.step}
                </p>
                {showBn && <p className="text-sm font-extrabold text-foreground leading-snug">{item.titleBn}</p>}
                {showEn && <p className="text-xs font-bold text-primary leading-snug">{item.titleEn}</p>}
                {showBn && <p className="text-xs text-foreground/90 leading-relaxed">{item.descBn}</p>}
                {showEn && <p className="text-xs text-muted-foreground leading-relaxed">{item.descEn}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* =====================================================================
          8 STEP-BY-STEP PRACTICAL CHAPTERS (৮টি সহজ ও বাস্তবমুখী অধ্যায়)
         ===================================================================== */}
      <div className="space-y-6 w-full max-w-none min-w-0">
        {filteredChapters.map((ch) => {
          const Icon = ch.icon;
          return (
            <Card
              key={ch.id}
              id={ch.id}
              className={`manual-chapter-card w-full max-w-none min-w-0 rounded-2xl border ${ch.accentBorder} shadow-xs overflow-hidden`}
            >
              {/* Chapter Header — Full Width Stacked Hierarchy so Titles Never Squeeze */}
              <CardHeader className={`p-4 sm:p-6 ${ch.accentBg} border-b border-border/50`}>
                <div className="flex items-start gap-3.5 w-full min-w-0">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card border ${ch.accentBorder} ${ch.accentText} font-bold shadow-xs mt-0.5`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`font-bold text-xs ${ch.accentText} ${ch.accentBorder}`}>
                        {ch.chapterNo}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-medium">
                        📍 কোথায় পাবেন: {langMode === "en" ? ch.menuNameEn : ch.menuNameBn}
                      </Badge>
                    </div>
                    {showBn && (
                      <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
                        {ch.titleBn}
                      </CardTitle>
                    )}
                    {showEn && (
                      <p className={`text-sm sm:text-base font-bold ${ch.accentText} leading-snug`}>
                        {ch.titleEn}
                      </p>
                    )}
                    <div className="pt-0.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {showBn && <span className="font-medium text-foreground/80">{ch.subtitleBn}</span>}
                      {showBn && showEn && <span className="mx-1.5">•</span>}
                      {showEn && <span>{ch.subtitleEn}</span>}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 w-full max-w-none min-w-0">
                {/* =========================================================
                    SECTION PART A: PORTRAIT CORPORATE NARRATIVE & STEP-BY-STEP
                    (ওভারভিউ, বাস্তব উদাহরণ ও ধাপে ধাপে নির্দেশনা — Full Fluid Width)
                   ========================================================= */}
                <div className="w-full max-w-none min-w-0 rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-6 space-y-5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <span className="text-xs sm:text-sm font-extrabold text-foreground flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {langMode === "en"
                          ? "Part A — Module Overview & Step-by-Step Operational Guidelines"
                          : "পার্ট ক — ওভারভিউ, বাস্তব উদাহরণ ও ধাপে ধাপে কাজের নিয়ম"}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs font-bold border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    >
                      📄 পোট্রেট প্রিন্ট সেকশন • Portrait Narrative Section
                    </Badge>
                  </div>

                  {/* Why It Matters + Real-World Scenario */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0">
                    <div className="rounded-xl bg-muted/30 border border-border/60 p-4 space-y-2 min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span>{langMode === "en" ? "What This Module Does" : "কেন এই কাজটি গুরুত্বপূর্ণ?"}</span>
                      </span>
                      {showBn && (
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                          {ch.whyItMattersBn}
                        </p>
                      )}
                      {showEn && (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {ch.whyItMattersEn}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl bg-primary/5 border border-primary/25 p-4 space-y-2 min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {langMode === "en"
                            ? "Real-World Field Scenario"
                            : "বাস্তব উদাহরণ (মাঠ পর্যায়ের পরিস্থিতি)"}
                        </span>
                      </span>
                      {showBn && (
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                          {ch.realScenarioBn}
                        </p>
                      )}
                      {showEn && (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {ch.realScenarioEn}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* কীভাবে করবেন? (How to Do It - Step-by-Step) */}
                  <div className="space-y-3 w-full min-w-0">
                    <p className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {langMode === "en"
                          ? "How to Do It — Step-by-Step Instructions:"
                          : "কীভাবে করবেন? (ধাপে ধাপে কাজের নিয়ম):"}
                      </span>
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0">
                      {ch.howToSteps.map((st) => (
                        <div
                          key={st.stepNum + st.titleEn}
                          className="rounded-xl border border-border/75 bg-muted/20 p-4 space-y-2 print-avoid-break min-w-0"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ch.accentBg} ${ch.accentText} font-extrabold text-xs mt-0.5`}
                            >
                              {st.stepNum}
                            </span>
                            <div className="space-y-1.5 min-w-0 flex-1">
                              {showBn && (
                                <p className="text-sm font-bold text-foreground leading-snug">
                                  {st.titleBn}
                                </p>
                              )}
                              {showEn && (
                                <p className="text-xs sm:text-sm font-semibold text-primary leading-snug">
                                  {st.titleEn}
                                </p>
                              )}
                              {showBn && (
                                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                                  {st.descBn}
                                </p>
                              )}
                              {showEn && (
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                  {st.descEn}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Field Pro-Tip & Mistake Prevention Warning */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3 min-w-0">
                      <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1.5 text-xs sm:text-sm min-w-0 flex-1">
                        {showBn && (
                          <p className="text-foreground/90 leading-relaxed">
                            <strong className="text-emerald-700 dark:text-emerald-400">
                              💡 মাঠ পর্যায়ের কার্যকরী টিপস:{" "}
                            </strong>
                            {ch.proTipBn}
                          </p>
                        )}
                        {showEn && (
                          <p className="text-muted-foreground leading-relaxed">
                            <strong className="text-emerald-700 dark:text-emerald-400">
                              💡 Field Pro-Tip:{" "}
                            </strong>
                            {ch.proTipEn}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3 min-w-0">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1.5 text-xs sm:text-sm min-w-0 flex-1">
                        {showBn && (
                          <p className="text-foreground/90 leading-relaxed">
                            <strong className="text-amber-700 dark:text-amber-400">
                              ⚠️ সাধারণ ভুল থেকে সতর্কতা:{" "}
                            </strong>
                            {ch.mistakeWarningBn}
                          </p>
                        )}
                        {showEn && (
                          <p className="text-muted-foreground leading-relaxed">
                            <strong className="text-amber-700 dark:text-amber-400">
                              ⚠️ Avoid This Mistake:{" "}
                            </strong>
                            {ch.mistakeWarningEn}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================================
                    SECTION PART B: WIDE LANDSCAPE ENTERPRISE UI BREAKDOWN & MATRIX
                    (ল্যান্ডস্কেপ ওয়াইড স্ক্রিন ব্রেকডাউন, কলআউট ① ② ③ ও ফিল্ড রেফারেন্স টেবিল)
                   ========================================================= */}
                <div
                  className={`w-full max-w-none min-w-0 rounded-2xl border-2 ${ch.accentBorder} bg-muted/10 p-4 sm:p-6 space-y-5 shadow-xs`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <span className="text-xs sm:text-sm font-extrabold text-foreground flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {langMode === "en"
                          ? "Part B — Wide Landscape Live ERP Screen Breakdown, Callouts (① ② ③) & Field Matrix"
                          : "পার্ট খ — সচিত্র ইআরপি স্ক্রিন ব্রেকডাউন (① ② ③) ও ফিল্ড রেফারেন্স টেবিল"}
                      </span>
                    </span>
                    <Badge className="bg-sky-600 text-white text-xs font-bold">
                      🖥️ ল্যান্ডস্কেপ ওয়াইড ক্যানভাস • Wide Landscape Canvas (Zero Clipping)
                    </Badge>
                  </div>

                  {/* Annotated Screen Preview */}
                  <div className="manual-mockup-wrapper w-full min-w-0 space-y-2 print-avoid-break">
                    <ChapterScreenMockup mockupKey={ch.mockupKey} />
                  </div>

                  {/* Screen Callout Pills (① ② ③) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
                    {ch.screenCallouts.map((sc) => (
                      <div
                        key={sc.badge + sc.nameEn}
                        className="rounded-xl border border-border/80 bg-card p-4 space-y-1.5 shadow-2xs print-avoid-break min-w-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ch.accentBg} ${ch.accentText} font-bold text-xs`}
                          >
                            {sc.badge}
                          </span>
                          <div className="min-w-0 flex-1">
                            {showBn && <p className="text-xs sm:text-sm font-bold text-foreground">{sc.nameBn}</p>}
                            {showEn && (
                              <p className={`text-xs font-semibold ${ch.accentText}`}>{sc.nameEn}</p>
                            )}
                          </div>
                        </div>
                        {showBn && (
                          <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">{sc.actionBn}</p>
                        )}
                        {showEn && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {sc.actionEn}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ফিল্ড ও বাটন রেফারেন্স টেবিল (Line-by-Line UI Field & Button Mapping) */}
                  <div className="space-y-2.5 w-full min-w-0 print-avoid-break">
                    <p className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {langMode === "en"
                          ? "Line-by-Line UI Field & Button Reference Mapping Matrix:"
                          : "ফিল্ড ও বাটন রেফারেন্স টেবিল (Line-by-Line UI Field & Button Mapping):"}
                      </span>
                    </p>
                    <div className="w-full overflow-x-auto rounded-xl border border-border/80 bg-card shadow-2xs">
                      <table className="w-full min-w-[680px] text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/60 text-foreground">
                            <th className="p-3 font-extrabold w-[26%]">
                              {langMode === "en"
                                ? "UI Button / Input Field"
                                : "বাটন / ইনপুট ফিল্ড (UI Element)"}
                            </th>
                            <th className="p-3 font-extrabold w-[20%]">
                              {langMode === "en" ? "Control Type" : "ফিল্ডের ধরন (Type)"}
                            </th>
                            <th className="p-3 font-extrabold w-[54%]">
                              {langMode === "en"
                                ? "Exact System Behavior"
                                : "সিস্টেমের কাজ ও নিয়ম (System Behavior)"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {ch.fieldMappings.map((fm) => (
                            <tr key={fm.elementLabel} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3 align-top font-mono font-bold text-foreground bg-muted/15">
                                {fm.elementLabel}
                              </td>
                              <td className="p-3 align-top">
                                {showBn && (
                                  <span
                                    className={`inline-block rounded-md ${ch.accentBg} ${ch.accentText} px-2.5 py-0.5 text-xs font-bold`}
                                  >
                                    {fm.controlTypeBn}
                                  </span>
                                )}
                                {showEn && (
                                  <span className="block text-xs font-semibold text-muted-foreground mt-1">
                                    {fm.controlTypeEn}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 align-top space-y-1">
                                {showBn && (
                                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                                    {fm.systemBehaviorBn}
                                  </p>
                                )}
                                {showEn && (
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {fm.systemBehaviorEn}
                                  </p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* =====================================================================
          SALES OFFICER DAILY CLOSING CHECKLIST & QUICK FAQ CARD
          (দিনশেষের চেকলিস্ট ও সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Checklist */}
        <Card className="manual-chapter-card rounded-2xl border-emerald-500/30 shadow-xs overflow-hidden">
          <CardHeader className="pb-2.5 bg-emerald-500/10 border-b border-border/40">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <ClipboardCheck className="h-4 w-4" />
              {langMode === "en"
                ? "Sales Officer Daily Closing Checklist (Before Leaving Office)"
                : "সেলস অফিসারের দিনশেষের চেকলিস্ট (অফিস থেকে বাসায় যাওয়ার আগে)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            {[
              {
                bn: "১. আজ যতগুলো দোকানে ভিজিট করেছেন, সবগুলোর 'Log Visit' এন্ট্রি দেওয়া হয়েছে কি?",
                en: "1. Have all shop visits from today's market route been logged in SFA?",
              },
              {
                bn: "২. আজকের সব নতুন অর্ডার সাবমিট করা এবং ডেলিভারি হওয়া অর্ডারের স্ট্যাটাস 'Delivered' করা হয়েছে কি?",
                en: "2. Are all new orders submitted and completed deliveries marked as 'Delivered'?",
              },
              {
                bn: "৩. দোকান থেকে তোলা প্রতিটি নগদ টাকা, বিকাশ ও চেক '$ ক্যাশ কালেকশন'-এ এন্ট্রি দিয়েছেন কি?",
                en: "3. Has every cash, bKash, and cheque payment collected today been entered in Cash Collection?",
              },
              {
                bn: "৪. SFA পেজের 'Evening Handover' থেকে ৪-ডিজিট পিন কোড নিয়ে ক্যাশিয়ারের কাছে টাকা বুঝিয়ে দিয়েছেন কি?",
                en: "4. Did you generate your 4-digit Evening Handover PIN and deposit physical cash with the cashier?",
              },
              {
                bn: "৫. সবশেষে উপরে 'Live Sync / Refresh' বাটনে একবার চাপ দিয়ে সব হিসাব ক্লাউডে সিঙ্ক নিশ্চিত করেছেন কি?",
                en: "5. Did you tap 'Live Sync / Refresh' once at the end to confirm 100% cloud synchronization?",
              },
            ].map((chk, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {showBn && <p className="font-semibold text-foreground">{chk.bn}</p>}
                  {showEn && <p className="text-muted-foreground">{chk.en}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick FAQ & Help Contacts */}
        <Card className="manual-chapter-card rounded-2xl border-sky-500/30 shadow-xs overflow-hidden">
          <CardHeader className="pb-2.5 bg-sky-500/10 border-b border-border/40">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-sky-700 dark:text-sky-400">
              <PhoneCall className="h-4 w-4" />
              {langMode === "en"
                ? "Quick Answers to Common Field Questions (FAQs)"
                : "মাঠ পর্যায়ে সচরাচর জিজ্ঞাসিত প্রশ্ন ও দ্রুত উত্তর (FAQs)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            {[
              {
                qBn: "প্রশ্ন: ডেলিভারির পর কাস্টমার ২ পিস পণ্য ফেরত (Return) দিলে কী করব?",
                aBn: "উত্তর: Orders পেজে ওই অর্ডারের পাশে থাকা 'Return' অপশনে গিয়ে ফেরত পণ্যের সংখ্যা লিখুন—স্টক অটো বাড়বে এবং কাস্টমারের বকেয়া অটো কমে যাবে।",
                qEn: "Q: What if a retailer returns 2 damaged items from a delivered order?",
                aEn: "A: Use the 'Return' button on that order row in Orders—warehouse stock restores and customer due reduces automatically.",
              },
              {
                qBn: "প্রশ্ন: কাস্টমারকে বকেয়া টাকার তাগাদা দেওয়ার মেসেজ কীভাবে পাঠাব?",
                aBn: "উত্তর: CRM বা Accounts পেজে কাস্টমারের পাশে থাকা 'Payment Reminder' বাটনে চাপ দিন—বাংলায় সুন্দর মেসেজ তৈরি হয়ে যাবে, যা কপি করে হোয়াটসঅ্যাপ বা SMS-এ পাঠাতে পারবেন।",
                qEn: "Q: How do I send a due payment reminder to an overdue dealer?",
                aEn: "A: Click the Payment Reminder button next to the customer in CRM to generate an official Bengali reminder ready for WhatsApp/SMS.",
              },
              {
                qBn: "প্রশ্ন: আমার মোবাইলে নতুন পণ্য বা সর্বশেষ বকেয়া না দেখালে কী করব?",
                aBn: "উত্তর: পেজের উপরে ডানপাশে 'Live Sync' বা 'Refresh' বাটনে ট্যাপ করুন (পিসিতে Ctrl + F5 চাপুন)। সাথে সাথে সর্বশেষ ক্লাউড ডেটা চলে আসবে।",
                qEn: "Q: What if a newly added product or updated balance isn't visible yet?",
                aEn: "A: Tap 'Live Sync' or 'Refresh' at the top right (or press Ctrl + F5 on PC) to pull the latest cloud state immediately.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1"
              >
                {showBn && <p className="font-bold text-foreground">{faq.qBn}</p>}
                {showBn && <p className="text-foreground/85 leading-relaxed">{faq.aBn}</p>}
                {showEn && <p className="font-semibold text-primary mt-1">{faq.qEn}</p>}
                {showEn && <p className="text-muted-foreground leading-relaxed">{faq.aEn}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Footer Print Bar */}
      <Card className="rounded-2xl border-border/60 bg-muted/20 print-avoid-break">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <div>
            <p className="font-bold text-foreground">
              হামকো গ্রুপ কুকওয়্যার ইউনিট • HAMKO Sales ERP — Field Sales Officer Handbook
            </p>
            <p>
              100% Live Cloud Sync Edition • সচিত্র বাংলা ও ইংরেজি অনবোর্ডিং গাইড
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print self-start sm:self-auto">
            <Button
              type="button"
              onClick={handleDirectDownloadPdf}
              disabled={isDownloadingPdf || isPreparingPrint}
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <Download className="h-3.5 w-3.5" />
              {isDownloadingPdf ? "Downloading PDF..." : "Download PDF (A4)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintPdf}
              disabled={isPreparingPrint || isDownloadingPdf}
              className="gap-1.5 rounded-xl"
            >
              <Printer className="h-3.5 w-3.5" />
              Print A4 (প্রিন্ট)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserManualPage;
