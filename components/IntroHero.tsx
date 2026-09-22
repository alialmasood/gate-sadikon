"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";

const TITLE_WORDS = ["بوابة", "الصادقون"];

const FEATURES = [
  { title: "الطلبات", hint: "تسجيل ومتابعة" },
  { title: "الخدمات", hint: "مسارات معتمدة" },
  { title: "المتابعة", hint: "إشراف مركزي" },
] as const;

const reducedTransition: Transition = {
  duration: 0.32,
  ease: "easeOut",
};

function formatArabicDateTime(date: Date) {
  const d = new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    numberingSystem: "arab",
  }).format(date);
  const m = new Intl.DateTimeFormat("ar-IQ", { month: "long" }).format(date);
  const y = new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    numberingSystem: "arab",
  }).format(date);
  const t = new Intl.DateTimeFormat("ar-IQ", {
    hour: "numeric",
    minute: "2-digit",
    numberingSystem: "arab",
  }).format(date);
  return { date: `${d} ${m} ${y}`, time: t };
}

function OrnamentDivider() {
  return (
    <div className="flex w-full max-w-[220px] items-center gap-3 sm:max-w-[260px]" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-l from-[#C4A574]/80 to-transparent" />
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-[#A4844A]">
        <path
          d="M7 1.2 L12.8 7 L7 12.8 L1.2 7 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <circle cx="7" cy="7" r="1.15" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-r from-[#C4A574]/80 to-transparent" />
    </div>
  );
}

function LoginIcon() {
  return (
    <svg className="h-[1.05em] w-[1.05em] -scale-x-100" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 17H7.2C6.08 17 5.52 17 5.09 16.78C4.72 16.59 4.41 16.28 4.22 15.91C4 15.48 4 14.92 4 13.8V10.2C4 9.08 4 8.52 4.22 8.09C4.41 7.72 4.72 7.41 5.09 7.22C5.52 7 6.08 7 7.2 7H10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10 12H20M20 12L16.5 8.5M20 12L16.5 15.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ComplaintIcon() {
  return (
    <svg className="h-[1.05em] w-[1.05em]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7H16M8 11H14M8 15H12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7.2 4H16.8C17.92 4 18.48 4 18.91 4.22C19.28 4.41 19.59 4.72 19.78 5.09C20 5.52 20 6.08 20 7.2V16.8C20 17.92 20 18.48 19.78 18.91C19.59 19.28 19.28 19.59 18.91 19.78C18.48 20 17.92 20 16.8 20H7.2C6.08 20 5.52 20 5.09 19.78C4.72 19.59 4.41 19.28 4.22 18.91C4 18.48 4 17.92 4 16.8V7.2C4 6.08 4 5.52 4.22 5.09C4.41 4.72 4.72 4.41 5.09 4.22C5.52 4 6.08 4 7.2 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function IntroHero() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;
  const [isLeaving, setLeaving] = useState(false);
  const [clock, setClock] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    const tick = () => setClock(formatArabicDateTime(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const handleEnter = () => {
    setLeaving(true);
  };
  const handleComplaint = () => {
    router.push("/complaints");
  };

  const cardExit = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -18, filter: "blur(8px)" };

  const containerVariants: Variants = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.35 } },
        exit: { opacity: 0, transition: { duration: 0.25 } },
      }
    : {
        initial: { opacity: 0, y: 16 },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        },
        exit: {
          ...cardExit,
          transition: { duration: 0.4, ease: "easeIn" },
        },
      };

  const logoVariants: Variants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: 0.12 } } }
    : {
        initial: { opacity: 0, scale: 0.94 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 },
        },
      };

  const wordVariants: Variants = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: (i: number) => ({
          opacity: 1,
          transition: { delay: 0.35 + i * 0.08 },
        }),
      }
    : {
        initial: { opacity: 0, y: 10 },
        animate: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { delay: 0.28 + i * 0.1, duration: 0.42 },
        }),
      };

  const fadeUp: Variants = {
    initial: { opacity: 0, y: reducedMotion ? 0 : 8 },
    animate: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay, duration: reducedMotion ? 0.28 : 0.4 },
    }),
  };

  return (
    <div
      className="intro-portal relative flex min-h-dvh w-full flex-col overflow-x-hidden text-[#17202A]"
      style={{
        backgroundColor: "#F1EDE4",
        backgroundImage: [
          "radial-gradient(ellipse 80% 55% at 100% 0%, rgba(20, 48, 68, 0.16) 0%, transparent 58%)",
          "radial-gradient(ellipse 70% 50% at 0% 100%, rgba(164, 132, 74, 0.14) 0%, transparent 52%)",
          "linear-gradient(180deg, #E8EEF2 0%, #F1EDE4 42%, #EDE6D8 100%)",
        ].join(", "),
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] max-md:opacity-[0.035]" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="portal-geo" x="0" y="0" width="72" height="72" patternUnits="userSpaceOnUse">
              <circle cx="36" cy="36" r="14" fill="none" stroke="#143044" strokeWidth="0.6" />
              <rect x="26" y="26" width="20" height="20" fill="none" stroke="#A4844A" strokeWidth="0.45" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#portal-geo)" />
        </svg>
      </div>

      <header
        className="relative z-20 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 text-white sm:px-6 sm:py-3 lg:px-10"
        style={{
          background: "linear-gradient(180deg, #143044 0%, #0E2433 100%)",
          paddingTop: "max(0.65rem, env(safe-area-inset-top))",
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden h-1.5 w-1.5 rounded-full bg-[#C4A574] sm:inline-block" aria-hidden />
          <p className="truncate text-[11px] font-medium text-white/80 sm:text-xs">
            جمهورية العراق · المنصة الإلكترونية الرسمية
          </p>
        </div>
        <p
          className="shrink-0 text-[11px] tabular-nums text-[#E8D7B0] sm:text-xs"
          aria-label="التاريخ والوقت"
          suppressHydrationWarning
        >
          {clock ? `${clock.date} — ${clock.time}` : "\u00a0"}
        </p>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <motion.div
          key="intro-content"
          variants={containerVariants}
          initial="initial"
          animate={isLeaving ? "exit" : "animate"}
          onAnimationComplete={(definition) => {
            if (isLeaving && definition === "exit") {
              router.push("/login");
            }
          }}
          className="intro-portal-card relative w-full max-w-[40rem] overflow-hidden rounded-[1.75rem] border border-white/70 px-5 py-8 shadow-[0_24px_80px_rgba(14,36,51,0.12)] sm:px-10 sm:py-11 md:max-w-[44rem] md:px-12"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,253,249,0.94) 0%, rgba(252,248,241,0.9) 100%)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div
            className="absolute inset-x-8 top-0 h-px bg-gradient-to-l from-transparent via-[#C4A574] to-transparent sm:inset-x-12"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background: "linear-gradient(90deg, #0E2433 0%, #A4844A 50%, #0E2433 100%)",
            }}
            aria-hidden
          />

          <div className="flex flex-col items-center text-center">
            <motion.div
              variants={logoVariants}
              initial="initial"
              animate="animate"
              className="flex items-end justify-center gap-5 sm:gap-8"
            >
              <div className="flex h-[4.25rem] items-end sm:h-[5.25rem] md:h-24">
                <Image
                  src="/iraq.png"
                  alt="شعار جمهورية العراق"
                  width={112}
                  height={112}
                  className="h-full w-auto object-contain object-bottom drop-shadow-[0_6px_16px_rgba(14,36,51,0.12)]"
                  sizes="(max-width: 640px) 68px, (max-width: 768px) 84px, 112px"
                  priority
                />
              </div>
              <div className="flex h-[4.25rem] items-end sm:h-[5.25rem] md:h-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sadiqoon.png"
                  alt="شعار كتلة الصادقون"
                  width={112}
                  height={112}
                  className="h-full w-auto object-contain object-bottom drop-shadow-[0_6px_16px_rgba(14,36,51,0.12)]"
                />
              </div>
            </motion.div>

            <motion.p
              variants={fadeUp}
              initial="initial"
              animate="animate"
              custom={0.22}
              className="mt-5 font-heading text-[11px] font-medium text-[#8A7044] sm:mt-6 sm:text-xs"
            >
              المنصة الإلكترونية الرسمية
            </motion.p>

            <h1 className="mt-2 flex max-w-xl flex-wrap justify-center gap-x-2.5 text-[2.15rem] font-bold leading-[1.35] text-[#0E2433] sm:mt-3 sm:text-5xl sm:leading-[1.3] md:text-[3.35rem]">
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

            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              custom={0.42}
              className="mt-4 sm:mt-5"
            >
              <OrnamentDivider />
            </motion.div>

            <motion.p
              variants={fadeUp}
              initial="initial"
              animate="animate"
              custom={0.5}
              className="mt-4 max-w-md text-[0.95rem] leading-8 text-[#5C6770] sm:mt-5 sm:text-base sm:leading-8"
            >
              منصة إلكترونية لإدارة الطلبات والخدمات والمتابعة المركزية
            </motion.p>

            <motion.ul
              variants={fadeUp}
              initial="initial"
              animate="animate"
              custom={0.58}
              className="mt-6 grid w-full grid-cols-3 gap-2 sm:mt-7 sm:gap-3"
            >
              {FEATURES.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-[#143044]/10 bg-[#143044]/[0.03] px-1.5 py-2.5 sm:px-3 sm:py-3"
                >
                  <p className="font-heading text-xs font-semibold text-[#143044] sm:text-sm">{item.title}</p>
                  <p className="mt-0.5 hidden text-[11px] text-[#6B7380] sm:block">{item.hint}</p>
                </li>
              ))}
            </motion.ul>

            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              custom={0.68}
              className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center"
            >
              <motion.button
                type="button"
                onClick={handleEnter}
                disabled={isLeaving}
                className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-6 text-[0.95rem] font-semibold text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#C4A574] focus-visible:ring-offset-2 sm:min-h-[3.25rem] sm:w-auto sm:min-w-[13.5rem] sm:px-8"
                style={{
                  background: "linear-gradient(180deg, #1A3F52 0%, #0E2433 100%)",
                  boxShadow: "0 14px 32px rgba(14, 36, 51, 0.22)",
                }}
                whileHover={
                  isLeaving
                    ? undefined
                    : { y: -2, boxShadow: "0 18px 40px rgba(14, 36, 51, 0.28)" }
                }
                whileTap={isLeaving ? undefined : { scale: 0.985 }}
                transition={reducedTransition}
              >
                {isLeaving ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                      aria-hidden
                    />
                    جاري التحويل...
                  </span>
                ) : (
                  <>
                    <LoginIcon />
                    دخول إلى النظام
                  </>
                )}
              </motion.button>

              <motion.button
                type="button"
                onClick={handleComplaint}
                className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-[#A4844A]/55 bg-white/70 px-6 text-[0.95rem] font-semibold text-[#5A4A28] outline-none focus-visible:ring-2 focus-visible:ring-[#A4844A] focus-visible:ring-offset-2 sm:min-h-[3.25rem] sm:w-auto sm:min-w-[13.5rem] sm:px-8"
                whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.95)" }}
                whileTap={{ scale: 0.985 }}
                transition={reducedTransition}
              >
                <ComplaintIcon />
                تقديم شكوى
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <footer
        className="relative z-10 px-4 pb-4 text-center text-[11px] text-[#6B7380] sm:px-6 sm:pb-5 sm:text-xs"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        منصة معتمدة لإدارة الطلبات والخدمات والمتابعة الرسمية
      </footer>
    </div>
  );
}
