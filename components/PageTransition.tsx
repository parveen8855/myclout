"use client";

import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  return <div className="page-content page-enter">{children}</div>;
}
