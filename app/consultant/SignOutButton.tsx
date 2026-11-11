"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/consultant/logout", { method: "POST" });
        router.refresh();
      }}
      className="text-base text-muted underline underline-offset-4 hover:text-chocolate"
    >
      Sign out
    </button>
  );
}
