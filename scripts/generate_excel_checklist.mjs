import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

async function generateAuditChecklist() {
  console.log("Generating Bengali ERP Audit Checklist Excel spreadsheet...");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ERP System Auditor";
  workbook.lastModifiedBy = "ERP System Auditor";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("অডিট চেকলিস্ট", {
    views: [{ showGridLines: true }],
  });

  // Define Columns
  worksheet.columns = [
    { header: "ক্রমিক", key: "sl", width: 10 },
    { header: "ক্যাটাগরি", key: "category", width: 30 },
    { header: "অডিট আইটেম", key: "item", width: 35 },
    { header: "বিবরণ", key: "description", width: 65 },
    { header: "গুরুত্ব", key: "severity", width: 16 },
    { header: "স্ট্যাটাস", key: "status", width: 16 },
    { header: "তারিখ", key: "date", width: 18 },
    { header: "মন্তব্য", key: "notes", width: 55 },
  ];

  // Header Styling: Dark Blue background with bold white text
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Deep Navy Blue
    };
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" }, // White text
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } },
    };
  });

  // Audit data in Bengali
  const auditData = [
    {
      sl: "১",
      category: "উচ্চ ঝুঁকি ও কোর লজিক",
      item: "SFA ভিজিট তারিখ ভ্যালিডেশন",
      description: "LogVisitModal-এ visit_date ফিল্ড বাধ্যতামূলক করা এবং ফাঁকা তারিখ সাবমিশন রোধ করা।",
      severity: "উচ্চ (High)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "datetime-local ইনপুট ফিল্ড ও সঠিক ভ্যালিডেশন সক্রিয়।",
    },
    {
      sl: "২",
      category: "উচ্চ ঝুঁকি ও কোর লজিক",
      item: "বাতিল অর্ডারের পেমেন্ট রিভার্সাল",
      description: "অর্ডার বাতিল হলে সংশ্লিষ্ট কালেকশন রিফান্ড অ্যামাউন্ট গ্রাহকের অগ্রিম ব্যালেন্সে যোগ করা।",
      severity: "উচ্চ (High)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "ক্যানসেলড অর্ডারের পেমেন্ট আনলিংক হয়ে Advance Balance-এ স্থানান্তরিত হয়।",
    },
    {
      sl: "৩",
      category: "উচ্চ ঝুঁকি ও কোর লজিক",
      item: "লোকাল স্টোরেজ মেমোরি ম্যানেজমেন্ট",
      description: "QuotaExceededError রোধে TTL ভিত্তিক স্বয়ংক্রিয় ডেটা ক্লিনআপ ও এক্সপায়ারি নিয়ম সক্রিয় করা।",
      severity: "উচ্চ (High)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "storageManager-এর মাধ্যমে মেয়াদোত্তীর্ণ ক্যাশ স্বয়ংক্রিয়ভাবে ক্লিনআপ হয়।",
    },
    {
      sl: "৪",
      category: "উচ্চ ঝুঁকি ও কোর লজিক",
      item: "অর্ডার তৈরিতে স্টক ভ্যালিডেশন",
      description: "গুদামে থাকা স্টকের অতিরিক্ত পণ্য অর্ডারে সিলেক্ট করা এবং বিক্রি ব্লক করা।",
      severity: "উচ্চ (High)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "পর্যাপ্ত স্টক না থাকলে অর্ডার অনুমোদন হয় না; ড্রাফট মোডে সতর্কবার্তা প্রদর্শিত হয়।",
    },
    {
      sl: "৫",
      category: "উচ্চ ঝুঁকি ও কোর লজিক",
      item: "কাস্টমার লেজার ব্যালেন্সের নির্ভুলতা",
      description: "চলমান ব্যালেন্স ও দেনা-পাওনা ট্রানজ্যাকশন হিস্ট্রির সাথে সঠিকভাবে সমন্বয় করা।",
      severity: "উচ্চ (High)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "recalculateCustomerLedger ও r2 রাউন্ডিংয়ের মাধ্যমে শতভাগ নির্ভুল ব্যালেন্স সংরক্ষিত।",
    },
    {
      sl: "৬",
      category: "উচ্চ ঝুঁকি ও কোর লজিক",
      item: "রোল ভিত্তিক এক্সেস কন্ট্রোল (RBAC)",
      description: "অননুমোদিত ইউজার বা রোলের জন্য সীমাবদ্ধ পেজ ও অ্যাকশন ব্লক করা।",
      severity: "উচ্চ (High)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "অ্যাডমিন, সেলস রিপ্রেজেন্টেটিভ ও অ্যাকাউন্ট্যান্টের রোল অনুযায়ী অনুমতি নির্ধারিত।",
    },
    {
      sl: "৭",
      category: "উচ্চ ঝুঁকি ও কোর লজিক",
      item: "সুপাবেস রো লেভেল সিকিউরিটি (RLS)",
      description: "ডাটাবেস টেবিলগুলোতে রো লেভেল সিকিউরিটি ও নিরাপত্তা পলিসি কার্যকর রাখা।",
      severity: "উচ্চ (High)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "ডাটাবেসের সকল টেবিলে RLS পলিসি ও JWT অথেন্টিকেশন সক্রিয়।",
    },
    {
      sl: "৮",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "উচ্চ নির্ভুলতার GPS লোকেশন ক্যাপচার",
      description: "ফলব্যাক ছাড়া আসল জিপিএস লোকেশন পেতে enableHighAccuracy এবং টাইমআউট অপশন ব্যবহার।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "হাই-অ্যাকিউরেসি জিপিএস লক এবং স্পষ্ট পারমিশন এরর নোটিফিকেশন যুক্ত।",
    },
    {
      sl: "৯",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "ক্লিকেবল গুগল ম্যাপস লিংক",
      description: "ভিজিট লগ টেবিলে অক্ষাংশ ও দ্রাঘিমাংশ কোঅর্ডিনেটসে ক্লিক করলে গুগল ম্যাপ ওপেন হওয়া।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "নতুন ট্যাবে (target='_blank') সঠিক পিন সহ গুগল ম্যাপ লিংক কাজ করছে।",
    },
    {
      sl: "১০",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "ভিজিট লগ ডিলিট অ্যাকশন",
      description: "ভিজিট লগ টেবিলে ডিলিট বাটন ও ডিলিট করার আগে নিশ্চিতকরণ বার্তা প্রদর্শন।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "কনফার্মেশন ডায়ালগ ও স্টেট/ডাটাবেস থেকে নিরাপদ মোছার সুবিধা নিশ্চিত।",
    },
    {
      sl: "১১",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "CSV / Excel এক্সপোর্ট নিরাপত্তা",
      description: "এক্সেল ফর্মুলা ইনজেকশন রোধে লিডিং সিম্বল (=, +, -, @) সঠিকভাবে এস্কেপ করা।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "ফর্মুলা ইনজেকশন প্রোটেকশন এক্সপোর্ট লজিকে নিশ্চিত করা হয়েছে।",
    },
    {
      sl: "১২",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "অর্ডার ডিলিট কনফার্মেশন ডায়ালগ",
      description: "অর্ডার তালিকায় ডিলিট আইকনে ক্লিক করলে নিশ্চিতকরণ নোটিশ প্রদর্শন করা।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "স্পষ্ট বার্তা সহ Yes/No ডায়ালগ সফলভাবে যুক্ত ও ভেরিফায়েড।",
    },
    {
      sl: "১৩",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "কাস্টমার একটিভ/ইনএকটিভ ফিল্টার",
      description: "কাস্টমার তালিকায় সক্রিয় ও নিষ্ক্রিয় গ্রাহকদের আলাদা করার ফিল্টারিং ব্যবস্থা।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "স্ট্যাটাস ফিল্টার সক্রিয় এবং ইনএকটিভ গ্রাহকদের রুট প্ল্যানে ব্লক করা হয়েছে।",
    },
    {
      sl: "১৪",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "ডিসকাউন্ট ও ভ্যাট হিসাবায়ন",
      description: "ইনভয়েস ও অর্ডারে স্বয়ংক্রিয়ভাবে ডিসকাউন্ট ও ভ্যাট হিসাবের সঠিকতা।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "টিয়ার প্রাইসিং ও লাইন আইটেম সাবটোটাল স্বয়ংক্রিয়ভাবে হিসাব হয়।",
    },
    {
      sl: "১৫",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "কালেকশন সার্চ ও পেজিনেশন",
      description: "পেমেন্ট কালেকশন তালিকায় ফিল্টারিং, সার্চিং এবং পেজিনেশন ব্যবস্থা।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "গ্রাহক নাম ও পেমেন্ট মেথড অনুযায়ী সার্চ এবং পেজিনেশন সক্রিয়।",
    },
    {
      sl: "১৬",
      category: "মাঝারি ঝুঁকি ও ওয়ার্কফ্লো",
      item: "প্রোডাক্ট SKU ইউনিকনেস চেক",
      description: "প্রোডাক্ট এন্ট্রির সময় ডুপ্লিকেট এসকেইউ কোড তৈরিতে বাধা প্রদান।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "প্রতিটি প্রোডাক্টের জন্য অনন্য sku_code বাধ্যতামূলক ও যাচাইকৃত।",
    },
    {
      sl: "১৭",
      category: "বাদ দেওয়া / ঐচ্ছিক আইটেম",
      item: "ডেড কোড ক্লিনআপ (payloadSanitizer.ts)",
      description: "স্পেসিফিকেশন অনুযায়ী বর্তমান ইউটিলিটি কোড অপরিবর্তিত রাখা হয়েছে।",
      severity: "কম (Low)",
      status: "SKIPPED",
      date: "০২/১০/২০২৬",
      notes: "ডিপেনডেন্সি অক্ষুণ্ণ রাখতে ইচ্ছাকৃতভাবে বাদ (Skipped) রাখা হয়েছে।",
    },
    {
      sl: "১৮",
      category: "বাদ দেওয়া / ঐচ্ছিক আইটেম",
      item: "চেক কালেকশন ওয়ার্কফ্লো",
      description: "সরাসরি ক্যাশ ও ক্লিয়ার্ড কালেকশন পদ্ধতি ব্যবহারের কারণে চেক প্রসেসিং বাদ রাখা হয়েছে।",
      severity: "কম (Low)",
      status: "SKIPPED",
      date: "০২/১০/২০২৬",
      notes: "বর্তমান ব্যবসায়িক নিয়মানুযায়ী সরাসরি ক্যাশ কালেকশন প্রযোজ্য।",
    },
    {
      sl: "১৯",
      category: "ইউআই রেসপন্সিভনেস",
      item: "মোবাইল রেসপন্সিভ লেআউট",
      description: "মোবাইল ও ট্যাবলেটে ড্যাশবোর্ড এবং ডাটা টেবিলগুলোর উপযুক্ত প্রদর্শন।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "স্ক্রল কন্টেইনার ও রেসপন্সিভ গ্রিড দ্বারা মোবাইল ফ্রেন্ডলি ডিসপ্লে নিশ্চিত।",
    },
    {
      sl: "২০",
      category: "অডিট ও নিরাপত্তা",
      item: "সিস্টেম অডিট লগ ট্রেইল",
      description: "আর্থিক লেনদেন ও পরিবর্তনের রেকর্ড ট্র্যাকিং নিশ্চিত করা।",
      severity: "মাঝারি (Medium)",
      status: "PASSED",
      date: "০২/১০/২০২৬",
      notes: "প্রকিউরমেন্ট ও লেজার স্টেট পরিবর্তনের স্বয়ংক্রিয় অডিট লগ রেকর্ড হয়।",
    },
  ];

  // Insert rows and apply styles
  auditData.forEach((data, index) => {
    const row = worksheet.addRow(data);
    row.height = 24;

    const isEven = index % 2 === 0;
    const baseBg = isEven ? "FFFFFFFF" : "FFF8FAFC"; // Subtle alternating zebra stripe

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      cell.font = {
        name: "Calibri",
        size: 10,
        color: { argb: "FF1E293B" },
      };

      // Alignment rules
      if (colNumber === 1 || colNumber === 5 || colNumber === 6 || colNumber === 7) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }

      // Default background
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: baseBg },
      };

      // Status column styling (Column 6)
      if (colNumber === 6) {
        if (data.status === "PASSED") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDCFCE7" }, // Light Green
          };
          cell.font = {
            name: "Calibri",
            size: 10,
            bold: true,
            color: { argb: "FF15803D" }, // Deep Green
          };
        } else if (data.status === "SKIPPED") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF9C3" }, // Light Yellow
          };
          cell.font = {
            name: "Calibri",
            size: 10,
            bold: true,
            color: { argb: "FFA16207" }, // Dark Gold / Brown
          };
        }
      }
    });
  });

  // Target paths: root project directory and parent workspace root
  const pathsToWrite = [
    path.resolve("ERP_Audit_Checklist.xlsx"),
    path.resolve("..", "ERP_Audit_Checklist.xlsx"),
  ];

  for (const filePath of pathsToWrite) {
    try {
      await workbook.xlsx.writeFile(filePath);
      console.log(`Successfully created: ${filePath}`);
    } catch (e) {
      console.warn(`Notice writing to ${filePath}:`, e.message);
    }
  }

  console.log("Bengali Excel Audit Checklist generated successfully.");
}

generateAuditChecklist().catch(console.error);
