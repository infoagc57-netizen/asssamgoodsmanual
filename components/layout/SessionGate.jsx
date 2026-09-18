"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionGate({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let valid = false;
    try {
      const session = JSON.parse(window.localStorage.getItem("agc_session") || "null");
      valid = Boolean(session && session.loggedIn);
    } catch {
      valid = false;
    }
    if (!valid) {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) return null;
  return children;
}
