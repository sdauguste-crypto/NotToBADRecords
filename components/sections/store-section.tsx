"use client";

import { motion } from "motion/react";

import { products, type Product } from "@/lib/content";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

function MerchSilhouette({
  kind,
  uid,
}: {
  kind: Product["kind"];
  uid: string;
}) {
  const gradId = `merch-grad-${uid}`;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2e88" />
          <stop offset="50%" stopColor="#1e6fff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {kind === "tee" ? (
        <path
          d="M35 18 L20 26 L10 44 L22 50 L24 42 L24 86 H76 L76 42 L78 50 L90 44 L80 26 L65 18 C62 26 55 30 50 30 C45 30 38 26 35 18 Z"
          fill={`url(#${gradId})`}
        />
      ) : kind === "hoodie" ? (
        <>
          <path
            d="M36 22 L20 30 L10 50 L22 56 L25 47 L25 88 H75 L75 47 L78 56 L90 50 L80 30 L64 22 C62 30 56 34 50 34 C44 34 38 30 36 22 Z"
            fill={`url(#${gradId})`}
          />
          <path
            d="M38 22 C38 14 44 10 50 10 C56 10 62 14 62 22 C58 28 54 30 50 30 C46 30 42 28 38 22 Z"
            fill={`url(#${gradId})`}
            opacity="0.7"
          />
          <path d="M42 60 H58 V78 H42 Z" fill="#04070f" opacity="0.35" />
        </>
      ) : kind === "vinyl" ? (
        <>
          <circle cx="50" cy="50" r="40" fill={`url(#${gradId})`} />
          <circle cx="50" cy="50" r="26" fill="none" stroke="#04070f" strokeWidth="1.5" opacity="0.5" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="#04070f" strokeWidth="1.5" opacity="0.5" />
          <circle cx="50" cy="50" r="12" fill="#04070f" opacity="0.7" />
          <circle cx="50" cy="50" r="2.5" fill="#22d3ee" />
        </>
      ) : kind === "cap" ? (
        <>
          <path
            d="M18 56 C18 34 32 22 50 22 C68 22 82 34 82 56 L82 60 H18 Z"
            fill={`url(#${gradId})`}
          />
          <path
            d="M14 60 C34 54 66 54 92 62 C94 64 92 68 88 68 C64 62 36 62 16 66 C12 66 12 62 14 60 Z"
            fill={`url(#${gradId})`}
            opacity="0.8"
          />
          <path d="M50 22 L50 58" stroke="#04070f" strokeWidth="1.5" opacity="0.4" />
        </>
      ) : (
        <>
          <rect x="24" y="12" width="52" height="76" rx="2" fill={`url(#${gradId})`} />
          <circle cx="50" cy="40" r="12" fill="#04070f" opacity="0.45" />
          <path d="M28 74 L44 58 L54 68 L62 60 L72 72 L72 84 H28 Z" fill="#04070f" opacity="0.35" />
        </>
      )}
    </svg>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="glass-panel relative flex flex-col items-center overflow-hidden p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blood/60">
      {/* diamond-plate cargo floor behind the merch */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "url('/textures/diamond-plate.webp')",
          backgroundSize: "340px auto",
        }}
      />
      {product.featured ? (
        <>
          <BorderBeam size={60} duration={8} colorFrom="#ff2e88" colorTo="#22d3ee" />
          <span className="absolute right-3 top-3 rounded-full bg-blood px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_16px_rgba(180,28,37,.7)]">
            LIMITED
          </span>
        </>
      ) : null}

      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image}
          alt={product.name}
          className="h-40 w-40 rounded-lg border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center drop-shadow-[0_0_18px_rgba(34,211,238,.35)]">
          <MerchSilhouette kind={product.kind} uid={product.id} />
        </div>
      )}

      <h3 className="mt-4 font-bold uppercase tracking-wide text-foreground">
        {product.name}
      </h3>
      <p className="mt-2 font-bold text-2xl text-[#ebeef1]">
        ${product.price}
      </p>

      {/* live commerce when the Shopify link exists; coming-soon otherwise */}
      <a
        href={product.shopifyUrl ?? "#contact"}
        target={product.shopifyUrl ? "_blank" : undefined}
        rel={product.shopifyUrl ? "noreferrer" : undefined}
        className="mt-5 inline-block"
      >
        <ShimmerButton
          shimmerColor="#ebeef1"
          background="linear-gradient(180deg, rgba(180,28,37,.30), rgba(180,28,37,.14))"
          className="border border-blood px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-[#ebeef1] hover:border-oxblood"
        >
          {product.shopifyUrl ? "BUY NOW" : "NOTIFY ME"}
        </ShimmerButton>
      </a>
    </article>
  );
}

export function StoreSection() {
  const reduced = useReducedMotion();

  return (
    <SectionShell
      id="store"
      hudLabel="// SECTION 04 — SUPPLY"
      title="THE CARGO BAY"
      accent="gold"
      subtitle="Hyperspace shipping soon."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: reduced ? 0 : 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.08 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}
