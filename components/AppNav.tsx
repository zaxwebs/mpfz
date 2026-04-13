"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Spots" },
  { href: "/map", label: "Map" },
  { href: "/settings", label: "Settings" },
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  function isLinkActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <nav className="appNav" aria-label="Primary navigation">
      <Link className="appBrand" href="/">
        <span>MPFZ</span>
        {dataDate ? <span className="appBrandDate">{dataDate}</span> : null}
      </Link>
      <div className="appNavLinks">
        {links.map((link) => {
          const isActive = isLinkActive(link.href);

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
      <button
        aria-expanded={isMenuOpen}
        aria-label="Open menu"
        className="appMenuButton"
        onClick={() => setIsMenuOpen(true)}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="currentColor"
          focusable="false"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
            fillRule="evenodd"
          />
        </svg>
      </button>

      {isMenuOpen ? (
        <div className="appMenuOverlay" role="presentation">
          <button
            aria-label="Close menu"
            className="appMenuBackdrop"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          />
          <div aria-modal="true" className="appMenuModal" role="dialog">
            <div className="appMenuHeader">
              <strong>Menu</strong>
              <button
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="appMenuLinks">
              {links.map((link) => {
                const isActive = isLinkActive(link.href);

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={`appMenuLink ${isActive ? "active" : ""}`}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
