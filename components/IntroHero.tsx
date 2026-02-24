"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  // استخدام قيمة ثابتة عند SSR وأول عرض على العميل لتجنب hydration mismatch
  // لأن useReducedMotion يعتمد على window.matchMedia غير المتوفر على الخادم
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setReducedMotion(prefersReducedMotion ?? false);
  }, [prefersReducedMotion]);
  const [isLeaving, setLeaving] = useState(false);
  const dateTimeStr = formatArabicDateTime(new Date());

  const handleEnter = () => {
    setLeaving(true);
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

  const iraqVariants: Variants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: 0.15 } } }
    : {
        initial: { opacity: 0, scale: 0.92 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.65, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      };

  const sadiqoonVariants: Variants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: 0.5 } } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, delay: 0.6 },
        },
      };

  const dividerVariants: Variants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: 0.7 } } }
    : {
        initial: { width: 0, opacity: 0.8 },
        animate: {
          width: 160,
          opacity: 1,
          transition: { duration: 0.55, delay: 0.85 },
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
    >
      {/* إطار مزدوج: ذهبي خارجي + ماروني (أحمر رسمي) داخلي */}
      <div
        className="pointer-events-none absolute inset-6 rounded-2xl"
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
        {/* Corner accents — 28px، 2px سمك، لون أغمق قليلاً من الخط */}
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
            key={i}
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
        className="relative z-10 flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-4"
      >
        {/* Header: شعاران على نفس الـ baseline — أحجام متوازنة، gap أقل */}
        <header className="flex shrink-0 flex-col items-center pt-8 md:pt-10">
          <div className="flex items-end gap-6 md:gap-8">
            <motion.div
              variants={iraqVariants}
              className="flex h-20 shrink-0 items-end md:h-24 lg:h-28"
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
              variants={sadiqoonVariants}
              className="flex h-[4.5rem] shrink-0 items-end md:h-[5.5rem] lg:h-[6.5rem]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sadiqoon.png"
                alt="شعار كتلة الصادقون"
                width={104}
                height={104}
                className="h-full w-auto object-contain object-bottom drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                loading="lazy"
              />
            </motion.div>
          </div>
          {/* شريط ذهبي معدني — تدرج + خط سفلي داكن + glow خفيف */}
          <div className="relative mt-4 w-56 shrink-0 md:mt-5 md:w-72 lg:w-80">
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
        <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-4 text-center sm:mt-10 sm:gap-5">
          <h1
            className="flex max-w-3xl shrink-0 flex-wrap justify-center gap-x-2 gap-y-0 text-center text-5xl font-bold leading-tight tracking-tight text-[#1B1B1B] lg:text-6xl"
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
            className="max-w-xl shrink-0 leading-relaxed text-neutral-600"
            style={{ fontSize: "clamp(0.8125rem, 1.5vw + 0.5rem, 1.125rem)" }}
          >
            منصة إلكترونية لإدارة الطلبات والخدمات والمتابعة المركزية
          </motion.p>

          <motion.div
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            className="w-full shrink-0 sm:w-auto"
          >
            <motion.button
              type="button"
              onClick={handleEnter}
              disabled={isLeaving}
              className="relative inline-flex w-full min-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-[#B88A1A]/70 px-16 py-[18px] font-semibold tracking-wide text-white md:px-20 md:py-5 sm:w-auto"
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
          </motion.div>
        </div>
      </motion.div>

      {/* التاريخ والوقت — أسفل الصفحة، أقصى اليسار، مع مسافة عن الإطار */}
      <p
        className="absolute bottom-8 left-6 z-10 tabular-nums text-sm font-medium text-[#6E5310]"
        aria-label="التاريخ والوقت"
        suppressHydrationWarning
      >
        {dateTimeStr}
      </p>
    </div>
  );
}
