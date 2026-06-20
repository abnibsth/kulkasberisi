"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Menu } from "lucide-react";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const links = [
    ["#promo", "Promo"],
    ["#fitur", "Fitur"],
    ["#cara-kerja", "Cara Kerja"],
    ["#ulasan", "Ulasan"],
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full border border-black/[0.08] bg-white/80 flex items-center justify-center text-[#5a5550] hover:text-[#141210] transition-all duration-200 hover:border-black/[0.15]"
        aria-label={open ? "Tutup menu" : "Buka menu"}
      >
        {open
          ? <X className="h-4 w-4" strokeWidth={1.75} />
          : <Menu className="h-4 w-4" strokeWidth={1.75} />
        }
      </button>

      {/* Full-screen overlay */}
      {mounted && createPortal(
        <div
          className={`fixed inset-0 z-[60] transition-all duration-500 ${
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          style={{ background: "rgba(254,252,248,0.97)", backdropFilter: "blur(24px)" }}
        >
          {/* Close button */}
          <div className="flex justify-end px-5 pt-6">
            <button
              onClick={() => setOpen(false)}
              className="w-10 h-10 rounded-full border border-black/10 bg-white flex items-center justify-center text-[#5a5550] hover:text-[#141210] transition-colors"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col px-8 pt-8 gap-0">
            {links.map(([h, l], i) => (
              <Link
                key={l}
                href={h}
                onClick={() => setOpen(false)}
                className="py-5 border-b border-black/[0.06] text-2xl font-semibold tracking-tight text-[#141210] hover:text-[#2d6a4f] transition-colors duration-200"
                style={{
                  transitionDelay: open ? `${i * 60}ms` : "0ms",
                  transform: open ? "translateY(0)" : "translateY(16px)",
                  opacity: open ? 1 : 0,
                  transition: `opacity 0.4s ease ${i * 60}ms, transform 0.4s ease ${i * 60}ms, color 0.2s`,
                }}
              >
                {l}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div
            className="px-8 mt-8 flex flex-col gap-3"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.4s ease 260ms, transform 0.4s ease 260ms",
            }}
          >
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="w-full h-12 flex items-center justify-center rounded-full border border-black/[0.12] text-[#141210] font-semibold text-sm hover:bg-black/[0.03] transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="btn-primary w-full justify-center"
            >
              <span>Mulai Gratis</span>
              <span className="btn-icon">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
            </Link>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
