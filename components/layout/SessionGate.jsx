"use client";

import { useSession } from "next-auth/react";

export default function SessionGate({ children }) {
  const { status } = useSession();

  if (status === "loading") return null;
  if (status === "unauthenticated") return null;

  return children;
}
