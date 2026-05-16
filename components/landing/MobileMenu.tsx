"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const links = [["#promo","Promo"],["#fitur","Fitur"],["#cara-kerja","Cara Kerja"],["#ulasan","Ulasan"]];

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-label="Menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed inset-0 top-16 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-100 p-6 flex flex-col gap-1">
          {links.map(([h, l]) => (
            <Link
              key={l} href={h}
              onClick={() => setOpen(false)}
              className="text-lg font-medium text-gray-700 hover:text-gray-900 py-3 border-b border-gray-100 transition-colors"
            >
              {l}
            </Link>
          ))}
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full h-12">Masuk</Button>
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <Button className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold">Mulai Gratis</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
