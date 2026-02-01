"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

type AuthAwareLinkProps = {
  children: React.ReactNode;
  className?: string;
  authedHref?: string;
  unauthHref?: string;
  ariaLabel?: string;
};

export default function AuthAwareLink({
  children,
  className,
  authedHref = "/home",
  unauthHref = "/auth",
  ariaLabel,
}: AuthAwareLinkProps) {
  const isAuthed = useSyncExternalStore(
    () => () => {},
    () => Boolean(localStorage.getItem("scribeloop_token")),
    () => false
  );

  return (
    <Link
      href={isAuthed ? authedHref : unauthHref}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
