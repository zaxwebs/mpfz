"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Spots" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" }
];

function formatDataDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata"
  }).format(date);
}

export default function AppNav() {
  const pathname = usePathname();
  const [dataDate, setDataDate] = useState<string | null>(null);

  useEffect(() => {
    async function loadDataDate() {
      try {
        const response = await fetch("/api/pfz/maharashtra", {
          cache: "no-store"
        });
        const payload = await response.json();

        if (!response.ok || typeof payload.fetchedAt !== "string") {
          return;
        }

        setDataDate(formatDataDate(payload.fetchedAt));
      } catch {
        setDataDate(null);
      }
    }

    void loadDataDate();
  }, []);

  return (
    <nav className="appNav" aria-label="Primary navigation">
      <Link className="appBrand" href="/">
        <span>MPFZ</span>
        {dataDate ? <span className="appBrandDate">{dataDate}</span> : null}
      </Link>
      <div className="appNavLinks">
        {links.map((link) => {
          const isActive =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`appNavLink ${isActive ? "active" : ""}`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
