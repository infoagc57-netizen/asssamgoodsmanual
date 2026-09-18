"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    window.localStorage.removeItem("agc_session");
    router.replace("/login");
  }, [router]);

  return null;
}
