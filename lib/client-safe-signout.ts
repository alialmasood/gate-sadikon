"use client";

import { signOut } from "next-auth/react";

function normalizeCallbackUrl(callbackUrl: string): string {
  if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }

  return "/login";
}

export async function safeSignOut(callbackUrl = "/login") {
  const target = normalizeCallbackUrl(callbackUrl);

  try {
    await signOut({ redirect: false, callbackUrl: target });
  } finally {
    window.location.assign(target);
  }
}
