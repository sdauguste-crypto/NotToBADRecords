"use client";

// Label storefront. Tier I surface: obsidian, chrome, steel, blood.
// Line-up and tiering come from the Brand Merchandise & Apparel Strategy
// doc via lib/content.ts; imagery lives under public/store.

import Image from "next/image";
import { motion } from "motion/react";

import { contactEmail, storeProducts, type StoreProduct } from "@/lib/content";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

const streetwear = storeProducts.filter((p) => p.tier === "streetwear");
const elevated = storeProducts.filter((p) => p.tier === "elevated");
const lookbook = storeProducts.find((p) => p.tier === "print");

function waitlistHref(product: StoreProduct) {
  const subject = encodeURIComponent(`WAITLIST: ${product.name}`);
  const body = encodeURIComponent(
    `Put me on the waitlist for the ${product.name} ($${product.price}).`,
  );
  return `mailto:${contactEmail}?subject=${subject}&body=${body}`;
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function WaitlistButton({ product }: { product: StoreProduct }) {
  return (
    <a
      href={waitlistHref(product)}
      className="font-body inline-flex items-center gap-2 rounded-full border border-blood/60 bg-blood/10 px-5 py-2.5 text-[0.62rem] font-medium tracking-[0.28em] text-chrome transition-colors hover:bg-blood hover:text-white active:translate-y-px"
    >
      JOIN WAITLIST
    </a>
  );
}

function ProductCard({
  product,
  priority = false,
}: {
  product: StoreProduct;
  priority?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col border border-white/10 bg-white/[0.02] transition-colors hover:border-blood/50">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-sm font-bold tracking-[0.14em] text-chrome sm:text-base">
            {product.name.toUpperCase()}
          </h3>
          <p className="font-body shrink-0 text-sm font-medium tracking-[0.08em] text-chrome">
            ${product.price}
          </p>
        </div>
        <p className="font-body text-xs font-light leading-relaxed tracking-[0.04em] text-steel">
          {product.note}
        </p>
        <div className="mt-auto pt-2">
          <WaitlistButton product={product} />
        </div>
      </div>
    </article>
  );
}

export function Storefront() {
  const reduced = useReducedMotion();

  return (
    <div className="relative">
      {/* ---- Hero: campaign shot right, statement left ---- */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pt-10 sm:px-10 lg:grid-cols-12 lg:items-center lg:gap-8">
        <motion.div
          className="lg:col-span-5"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-4xl font-bold leading-[1.05] tracking-[0.08em] text-chrome sm:text-5xl lg:text-6xl">
            WEAR
            <br />
            THE ERA.
          </h1>
          <p className="font-body mt-6 max-w-md text-sm font-light leading-relaxed tracking-[0.04em] text-steel">
            The first apparel line from the label. Streetwear for the fans,
            an elevated cut above it, all guarded by the Doberman.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <a
              href="#drop"
              className="font-body inline-flex items-center gap-3 rounded-full bg-blood px-8 py-3.5 text-xs font-medium tracking-[0.3em] text-white transition-colors hover:bg-oxblood active:translate-y-px"
            >
              SHOP THE DROP
            </a>
            <p className="font-body text-[0.6rem] tracking-[0.3em] text-steel/80">
              $24 TO $220
            </p>
          </div>
        </motion.div>
        <motion.div
          className="lg:col-span-7"
          initial={reduced ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden border border-white/10 bg-black">
            <Image
              src="/store/hero.webp"
              alt="Campaign shot: the Surfer jean jacket worn against a red retro-futurist horizon"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-transparent"
            />
          </div>
        </motion.div>
      </section>

      {/* ---- Streetwear drop ---- */}
      <section
        id="drop"
        className="mx-auto w-full max-w-6xl scroll-mt-10 px-6 pt-24 sm:px-10 sm:pt-32"
      >
        <Reveal>
          <p className="font-body text-[0.6rem] tracking-[0.4em] text-blood">
            DROP 001
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-[0.12em] text-chrome sm:text-3xl">
            STREETWEAR
          </h2>
          <p className="font-body mt-4 max-w-xl text-sm font-light leading-relaxed tracking-[0.04em] text-steel">
            Heavy blanks, psychedelic reverses, prices built for the people
            actually at the show.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-12">
          {streetwear.map((product, i) => (
            <Reveal
              key={product.id}
              delay={i * 0.07}
              className={
                // rows alternate 7+5 then 5+7 so the grid stays full but
                // never reads as a template
                i % 4 === 0 || i % 4 === 3 ? "lg:col-span-7" : "lg:col-span-5"
              }
            >
              <ProductCard product={product} priority={i < 2} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- Elevated line: one featured split + two companions ---- */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-24 sm:px-10 sm:pt-32">
        <Reveal>
          <div className="grid overflow-hidden border border-white/10 bg-white/[0.02] lg:grid-cols-2">
            <div className="relative aspect-[3/4] bg-black lg:aspect-auto lg:min-h-[34rem]">
              <Image
                src={elevated[0].image}
                alt={elevated[0].name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
              <p className="font-body text-[0.6rem] tracking-[0.4em] text-steel">
                THE ELEVATED LINE
              </p>
              <h2 className="text-2xl font-bold tracking-[0.12em] text-chrome sm:text-3xl">
                {elevated[0].name.toUpperCase()}
              </h2>
              <p className="font-body max-w-md text-sm font-light leading-relaxed tracking-[0.04em] text-steel">
                {elevated[0].note} Cut in small runs from sustainable
                materials, sourced through fair-wage partners.
              </p>
              <p className="font-body text-lg font-medium tracking-[0.08em] text-chrome">
                ${elevated[0].price}
              </p>
              <div>
                <WaitlistButton product={elevated[0]} />
              </div>
            </div>
          </div>
        </Reveal>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {elevated.slice(1).map((product, i) => (
            <Reveal key={product.id} delay={i * 0.08}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- Lookbook: image left, story right ---- */}
      {lookbook ? (
        <section className="mx-auto w-full max-w-6xl px-6 pt-24 sm:px-10 sm:pt-32">
          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="relative aspect-[3/4] overflow-hidden border border-white/10 bg-black lg:col-span-5">
                <Image
                  src={lookbook.image}
                  alt={lookbook.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
              <div className="lg:col-span-7">
                <h2 className="text-2xl font-bold tracking-[0.12em] text-chrome sm:text-3xl">
                  THE LOOKBOOK
                </h2>
                <p className="font-body mt-5 max-w-lg text-sm font-light leading-relaxed tracking-[0.04em] text-steel">
                  {lookbook.note} Each chapter of the music unlocks the next
                  set of pieces, so the clothes read like the records do.
                </p>
                <p className="font-body mt-5 text-lg font-medium tracking-[0.08em] text-chrome">
                  ${lookbook.price}
                </p>
                <div className="mt-6">
                  <WaitlistButton product={lookbook} />
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* ---- Sourcing statement ---- */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-4 pt-24 sm:px-10 sm:pt-32">
        <Reveal>
          <div className="border-t border-white/10 pt-10 text-center">
            <p className="font-body mx-auto max-w-2xl text-sm font-light leading-relaxed tracking-[0.06em] text-steel">
              Every piece is waitlist-first. Small runs, ethically sourced
              blanks, fair-wage production. Nothing gets made that nobody
              asked for.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
