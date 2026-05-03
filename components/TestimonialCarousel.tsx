"use client";

import type { LandingReview } from "@/app/page";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Star } from "lucide-react";

const CARD_WIDTH = 350;
const CARD_GAP = 24;

function TestimonialCard({ review }: { review: LandingReview }) {
  const initials = (review.displayName || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const rating = Math.max(1, Math.min(5, Math.round(review.rating || 5)));

  return (
    <Card
      className="flex-shrink-0"
      style={{ width: `${CARD_WIDTH}px` }}
    >
      <CardHeader>
        <div className="flex items-center gap-1 text-yellow-500 mb-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star
              key={idx}
              className={`h-4 w-4 ${idx + 1 <= rating ? "fill-current" : ""}`}
            />
          ))}
        </div>
        <CardDescription className="text-sm line-clamp-4">
          &ldquo;{review.message}&rdquo;
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
            {initials || "U"}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{review.displayName}</div>
            {review.role && (
              <div className="text-xs text-gray-600">{review.role}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TestimonialCarousel({
  reviews,
}: {
  reviews: LandingReview[];
}) {
  // Duplicate menjadi 2 set identik — animasi -50% = tepat 1 set
  // Saat set pertama keluar kiri, set kedua langsung masuk kanan (seamless)
  const doubledReviews = [...reviews, ...reviews];
  const oneSetWidth = reviews.length * (CARD_WIDTH + CARD_GAP);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        // Fade mask di kiri dan kanan supaya kartu masuk/keluar halus
        maskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
    >
      {/* Track: lebar 2× set, animasi geser -50% (= 1 set) lalu loop */}
      <div
        className="flex gap-6 testimonial-marquee"
        style={{
          width: `${doubledReviews.length * (CARD_WIDTH + CARD_GAP)}px`,
          ["--one-set-width" as string]: `${oneSetWidth}px`,
        }}
      >
        {doubledReviews.map((review, idx) => (
          <TestimonialCard key={`${review.id}-${idx}`} review={review} />
        ))}
      </div>

      <style>{`
        @keyframes testimonial-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-1 * var(--one-set-width))); }
        }
        .testimonial-marquee {
          animation: testimonial-scroll 20s linear infinite;
        }
        .testimonial-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

