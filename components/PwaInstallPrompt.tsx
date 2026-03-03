"use client";

import { useState, useEffect } from "react";

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const nav = navigator as { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function PwaInstallPrompt({ children }: { children: React.ReactNode }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const standalone = isStandalone();
    const mobile = isMobileDevice();
    setShowPrompt(mobile && !standalone);
  }, [mounted]);

  if (!mounted) return <>{children}</>;
  if (!showPrompt) return <>{children}</>;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1E6B3A] p-6" dir="rtl">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/30 bg-white shadow-lg">
          <img src="/sadiqooniqon.png" alt="بوابة الصادقون" className="h-full w-full object-contain" />
        </div>
        <h1 className="text-xl font-bold text-white">بوابة الصادقون</h1>
        <p className="mt-3 text-base leading-relaxed text-white/95">
          ثبّت التطبيق على سطح المكتب للحصول على تجربة أفضل وشاشة كاملة
        </p>
        <div className="mt-8 w-full space-y-4 rounded-xl border border-white/20 bg-white/10 p-5 text-right text-white">
          {isIOS && (
            <>
              <p className="text-sm font-semibold">خطوات التثبيت على أجهزة آيفون وآيباد:</p>
              <ol className="list-inside list-decimal space-y-2 text-sm">
                <li>اضغط على زر المشاركة (المربع مع السهم للأعلى) في أسفل الشاشة</li>
                <li>اختر «إضافة إلى الشاشة الرئيسية»</li>
                <li>اضغط «إضافة»</li>
                <li>افتح التطبيق من الأيقونة على الشاشة الرئيسية</li>
              </ol>
            </>
          )}
          {isAndroid && (
            <>
              <p className="text-sm font-semibold">خطوات التثبيت على أندرويد:</p>
              <ol className="list-inside list-decimal space-y-2 text-sm">
                <li>اضغط على القائمة (ثلاث نقاط) أعلى المتصفح</li>
                <li>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</li>
                <li>اضغط «تثبيت» أو «إضافة»</li>
                <li>افتح التطبيق من الأيقونة على الشاشة الرئيسية</li>
              </ol>
            </>
          )}
          {!isIOS && !isAndroid && (
            <p className="text-sm">
              استخدم خيار «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق» من قائمة المتصفح
            </p>
          )}
        </div>
        <p className="mt-6 text-sm text-white/80">لا يمكن المتابعة حتى يتم التثبيت</p>
      </div>
    </div>
  );
}
