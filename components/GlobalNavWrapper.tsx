"use client";

import { usePathname } from "next/navigation";
import GlobalNav from "@/components/GlobalNav";
import { useAuthStore } from "@/store/useAuthStore";

const hiddenNavPaths = ["/login", "/onboarding"];

export default function GlobalNavWrapper() {
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const hideNav = hiddenNavPaths.includes(pathname);

  if (hideNav || !user) {
    return null;
  }

  return <GlobalNav />;
}
