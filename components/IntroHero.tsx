"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
  type Transition,
} from "framer-motion";

const TITLE_WORDS = ["بوابة", "الصادقون"];

const reducedTransition: Transition = {
  duration: 0.35,
  ease: "easeOut",
};

function formatArabicDateTime(date: Date) {
  const d = new Intl.DateTimeFormat("ar-IQ", { day: "numeric", numberingSystem: "arab" }).format(date);
  const m = new Intl.DateTimeFormat("ar-IQ", { month: "long" }).format(date);
  const y = new Intl.DateTimeFormat("ar-IQ", { year: "numeric", numberingSystem: "arab" }).format(date);
  const t = new Intl.DateTimeFormat("ar-IQ", { hour: "numeric", minute: "2-digit", numberingSystem: "arab" }).format(date);
  return `${d} ${m} ${y} — ${t}`;
}

export default function IntroHero() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;
  const [isLeaving, setLeaving] = useState(false);
  const dateTimeStr = formatArabicDateTime(new Date());

  const handleEnter = () => {
    setLeaving(true);
  };
  const handleComplaint = () => {
    router.push("/complaints");
  };

  const cardExit = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -28, filter: "blur(10px)" };

  const containerVariants: Variants = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.4 } },
        exit: { opacity: 0, transition: { duration: 0.3 } },
      }
    : {
        initial: { opacity: 0, scale: 1.02 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
        },
        exit: {
          ...cardExit,
          transition: { duration: 0.45, ease: "easeIn" },
        },
      };

  const logoVariants: Variants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: 0.15 } } }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      };

  const wordVariants: Variants = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: (i: number) => ({
          opacity: 1,
          transition: { delay: 0.9 + i * 0.1 },
        }),
      }
    : {
        initial: { opacity: 0, y: 12 },
        animate: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { delay: 1.1 + i * 0.14, duration: 0.42 },
        }),
      };

  const descVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { delay: reducedMotion ? 1.15 : 1.5, duration: 0.4 },
    },
  };

  const buttonVariants: Variants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: 1.35 } } }
    : {
        initial: { opacity: 0, scale: 0.97 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { delay: 1.7, duration: 0.38 },
        },
      };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#F4F6F8]"
      style={{
        backgroundImage: [
          "radial-gradient(ellipse 90% 80% at 50% 20%, rgba(201, 162, 39, 0.06) 0%, transparent 55%)",
          "radial-gradient(ellipse 70% 60% at 80% 90%, rgba(184, 138, 26, 0.04) 0%, transparent 50%)",
          "radial-gradient(ellipse 60% 70% at 20% 80%, rgba(140, 106, 18, 0.035) 0%, transparent 45%)",
        ].join(", "),
      }}
    >
      {/* نمط هندسي إسلامي خلفية — دوائر، سداسيات، مربعات، خطوط (بدون نجوم) */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.09] max-md:opacity-[0.05]" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="islamic-circles" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="12" fill="none" stroke="#8C6A12" strokeWidth="0.5" />
              <circle cx="30" cy="30" r="6" fill="none" stroke="#B88A1A" strokeWidth="0.4" opacity="0.8" />
            </pattern>
            <pattern id="islamic-hex" x="0" y="0" width="80" height="69.28" patternUnits="userSpaceOnUse">
              <polygon points="40,0 80,17.32 80,51.96 40,69.28 0,51.96 0,17.32" fill="none" stroke="#B88A1A" strokeWidth="0.4" opacity="0.7" />
            </pattern>
            <pattern id="islamic-squares" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <rect x="5" y="5" width="40" height="40" fill="none" stroke="#8C6A12" strokeWidth="0.4" />
              <rect x="15" y="15" width="20" height="20" fill="none" stroke="#B88A1A" strokeWidth="0.3" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#islamic-circles)" />
          <rect width="100%" height="100%" fill="url(#islamic-hex)" opacity="0.5" />
          <rect width="100%" height="100%" fill="url(#islamic-squares)" opacity="0.4" />
        </svg>
      </div>

      {/* زخارف إسلامية في الزوايا — زخرفة أرابيسك بسيطة */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.08] max-md:opacity-[0.04]" aria-hidden>
        <svg className="absolute -top-20 -right-20 h-80 w-80" viewBox="0 0 160 160" fill="none">
          <path d="M0 80 Q40 40 80 80 Q120 120 160 80" stroke="#8C6A12" strokeWidth="0.8" fill="none" />
          <path d="M20 80 Q60 50 100 80 Q140 110 160 80" stroke="#B88A1A" strokeWidth="0.5" fill="none" opacity="0.8" />
          <path d="M0 60 Q50 80 80 40 Q110 0 160 40" stroke="#8C6A12" strokeWidth="0.5" fill="none" opacity="0.6" />
        </svg>
        <svg className="absolute -bottom-20 -left-20 h-80 w-80 rotate-180" viewBox="0 0 160 160" fill="none">
          <path d="M0 80 Q40 40 80 80 Q120 120 160 80" stroke="#8C6A12" strokeWidth="0.8" fill="none" />
          <path d="M20 80 Q60 50 100 80 Q140 110 160 80" stroke="#B88A1A" strokeWidth="0.5" fill="none" opacity="0.8" />
        </svg>
        <svg className="absolute top-1/2 -left-32 h-64 w-64 -translate-y-1/2 -rotate-90 opacity-70" viewBox="0 0 100 100" fill="none">
          <path d="M0 50 Q25 25 50 50 Q75 75 100 50" stroke="#8C6A12" strokeWidth="0.6" fill="none" />
        </svg>
        <svg className="absolute top-1/2 -right-32 h-64 w-64 -translate-y-1/2 rotate-90 opacity-70" viewBox="0 0 100 100" fill="none">
          <path d="M0 50 Q25 25 50 50 Q75 75 100 50" stroke="#8C6A12" strokeWidth="0.6" fill="none" />
        </svg>
      </div>

      {/* شبكة خفيفة — إحساس بالتناظر الهندسي */}
      <div
        className="pointer-events-none absolute inset-6 max-md:inset-3 rounded-2xl opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(140, 106, 18, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(140, 106, 18, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />

      {/* إطار مزدوج: ذهبي خارجي + ماروني (أحمر رسمي) داخلي */}
      <div
        className="pointer-events-none absolute inset-6 max-md:inset-3 rounded-2xl max-md:rounded-xl"
        style={{
          border: "2px solid rgba(184, 138, 26, 0.85)",
          boxShadow: [
            "0 0 0 1px rgba(184, 138, 26, 0.08)",
            "inset 0 0 0 2px rgba(114, 47, 55, 0.85)",
            "inset 0 0 0 1px rgba(255, 215, 0, 0.04)",
          ].join(", "),
        }}
        aria-hidden
      >
        {/* زوايا مزخرفة — هندسة إسلامية بسيطة */}
        {[
          { top: 0, right: 0, transform: "none" },
          { top: 0, left: 0, transform: "scaleX(-1)" },
          { bottom: 0, right: 0, transform: "scaleY(-1)" },
          { bottom: 0, left: 0, transform: "scale(-1)" },
        ].map((pos, i) => (
          <svg
            key={i}
            className="absolute h-16 w-16 max-md:h-10 max-md:w-10 max-md:m-1 md:h-20 md:w-20 md:m-2"
            style={pos}
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden
          >
            <path d="M0 32 L32 0 L64 32 L32 64 Z" stroke="rgba(140, 106, 18, 0.55)" strokeWidth="1.2" fill="none" />
            <path d="M8 32 L32 8 L56 32 L32 56 Z" stroke="rgba(184, 138, 26, 0.4)" strokeWidth="0.8" fill="none" />
            <circle cx="32" cy="32" r="3" fill="none" stroke="rgba(140, 106, 18, 0.6)" strokeWidth="0.8" />
          </svg>
        ))}
        {/* خطوط الزوايا التقليدية */}
        {[
          { top: 0, right: 0, width: "28px", height: "2px" },
          { top: 0, right: 0, width: "2px", height: "28px" },
          { top: 0, left: 0, width: "28px", height: "2px" },
          { top: 0, left: 0, width: "2px", height: "28px" },
          { bottom: 0, right: 0, width: "28px", height: "2px" },
          { bottom: 0, right: 0, width: "2px", height: "28px" },
          { bottom: 0, left: 0, width: "28px", height: "2px" },
          { bottom: 0, left: 0, width: "2px", height: "28px" },
        ].map((acc, i) => (
          <div
            key={`line-${i}`}
            className="absolute rounded-full"
            style={{
              ...acc,
              backgroundColor: "rgba(140, 106, 18, 0.9)",
            }}
            aria-hidden
          />
        ))}
      </div>

      <motion.div
        key="intro-content"
        variants={containerVariants}
        initial="initial"
        animate={isLeaving ? "exit" : "animate"}
        exit="exit"
        onAnimationComplete={(definition) => {
          if (isLeaving && definition === "exit") {
            router.push("/login");
          }
        }}
        className="relative z-10 flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-4 max-md:px-4 max-md:py-3 max-md:min-h-0"
      >
        {/* Header: شعاران على نفس الـ baseline — أحجام متوازنة، gap أقل */}
        <header className="flex shrink-0 flex-col items-center pt-8 max-md:pt-5 md:pt-10">
          <div className="flex items-end gap-6 max-md:gap-4 md:gap-8">
            <motion.div
              variants={logoVariants}
              initial="initial"
              animate="animate"
              className="flex h-20 max-md:h-14 shrink-0 items-end md:h-24 lg:h-28"
            >
              <Image
                src="/iraq.png"
                alt="شعار جمهورية العراق"
                width={112}
                height={112}
                className="h-full w-auto object-contain object-bottom drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                sizes="(max-width: 768px) 80px, 96px, 112px"
                priority
              />
            </motion.div>
            <motion.div
              variants={logoVariants}
              initial="initial"
              animate="animate"
              className="flex h-20 max-md:h-14 shrink-0 items-end md:h-24 lg:h-28"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sadiqoon.png"
                alt="شعار كتلة الصادقون"
                width={112}
                height={112}
                className="h-full w-auto object-contain object-bottom drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                loading="lazy"
              />
            </motion.div>
          </div>
          {/* شريط ذهبي معدني — تدرج + خط سفلي داكن + glow خفيف */}
          <div className="relative mt-4 w-56 max-md:mt-3 max-md:w-40 shrink-0 md:mt-5 md:w-72 lg:w-80">
            {/* الشريط الرئيسي: 4px تدرج + ظل + توهج خفيف في المنتصف */}
            <div
              className="relative h-[4px] w-full rounded-full"
              style={{
                background: "linear-gradient(to right, #8C6A12, #E2C46C, #8C6A12)",
                boxShadow: [
                  "0 2px 4px rgba(0,0,0,0.15)",
                  "0 0 16px rgba(226, 196, 108, 0.18)",
                ].join(", "),
              }}
            />
            {/* خط سفلي 1px داكن — عمق معدني */}
            <div
              className="absolute bottom-[-2px] left-0 h-[1px] w-full rounded-full bg-[#5A430F] opacity-40"
              aria-hidden
            />
          </div>
        </header>

        {/* عنوان + وصف + زر — فراغ معقول بدون إفراغ */}
        <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-4 text-center max-md:mt-5 max-md:gap-3 sm:mt-10 sm:gap-5">
          <h1
            className="flex max-w-3xl shrink-0 flex-wrap justify-center gap-x-2 gap-y-0 text-center text-5xl font-bold leading-tight tracking-tight text-[#1B1B1B] max-md:text-3xl max-md:leading-snug lg:text-6xl"
          >
            {TITLE_WORDS.map((word, i) => (
              <motion.span
                key={word}
                variants={wordVariants}
                initial="initial"
                animate="animate"
                custom={i}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            variants={descVariants}
            initial="initial"
            animate="animate"
            className="max-w-xl shrink-0 leading-relaxed text-neutral-600 max-md:leading-snug max-md:px-2"
            style={{ fontSize: "clamp(0.8125rem, 1.5vw + 0.5rem, 1.125rem)" }}
          >
            منصة إلكترونية لإدارة الطلبات والخدمات والمتابعة المركزية
          </motion.p>

          <motion.div
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row"
          >
            <motion.button
              type="button"
              onClick={handleEnter}
              disabled={isLeaving}
              className="relative inline-flex w-full min-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-[#B88A1A]/70 px-16 py-[18px] font-semibold tracking-wide text-white max-md:min-w-0 max-md:py-4 max-md:text-base md:px-20 md:py-5 sm:w-auto"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 38%), linear-gradient(180deg, #2F7A3F 0%, #236434 100%)",
                boxShadow: "0 18px 42px rgba(0,0,0,0.14)",
              }}
              whileHover={
                isLeaving
                  ? undefined
                  : {
                      y: -2,
                      boxShadow: "0 24px 56px rgba(0,0,0,0.2)",
                      filter: "brightness(1.05)",
                    }
              }
              whileTap={isLeaving ? undefined : { scale: 0.98 }}
              transition={reducedTransition}
            >
              {isLeaving ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                  <span>جاري التحويل...</span>
                </span>
              ) : (
                "دخول إلى النظام"
              )}
            </motion.button>

            <motion.button
              type="button"
              onClick={handleComplaint}
              className="relative inline-flex w-full min-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-[#8C6A12]/70 px-10 py-[18px] font-semibold tracking-wide text-[#5A430F] max-md:min-w-0 max-md:py-4 max-md:text-base sm:w-auto"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, #FFF8E9 100%)",
                boxShadow: "0 14px 34px rgba(0,0,0,0.1)",
              }}
              whileHover={{ y: -2, filter: "brightness(1.02)" }}
              whileTap={{ scale: 0.98 }}
              transition={reducedTransition}
            >
              تقديم شكوى
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* التاريخ والوقت — أسفل الصفحة، أقصى اليسار، مع مسافة عن الإطار */}
      <p
        className="absolute bottom-8 left-6 z-10 tabular-nums text-sm font-medium text-[#6E5310] max-md:bottom-4 max-md:left-4 max-md:text-xs"
        aria-label="التاريخ والوقت"
        suppressHydrationWarning
      >
        {dateTimeStr}
      </p>
    </div>
  );
}
