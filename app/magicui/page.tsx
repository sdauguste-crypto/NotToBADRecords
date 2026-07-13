import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Marquee } from "@/components/magicui/marquee";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

const artists = [
  "VELVET STATIC",
  "JULES QUARTER",
  "OKTAVE",
  "NTB ALLSTARS",
  "CHROME HEARTS",
  "MIDNIGHT ALLOY",
];

export default function MagicUIDemo() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-16 px-6 py-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold md:text-6xl">
          <AnimatedGradientText>MagicUI is installed</AnimatedGradientText>
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Marquee, Shimmer Button, Border Beam, and Animated Gradient Text —
          ready to use from{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 text-sm">
            @/components/magicui
          </code>
        </p>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border py-6">
        <Marquee pauseOnHover className="[--duration:20s]">
          {artists.map((name) => (
            <span
              key={name}
              className="text-muted-foreground mx-6 text-xl font-semibold tracking-widest"
            >
              {name}
            </span>
          ))}
        </Marquee>
        <BorderBeam size={80} duration={8} />
      </div>

      <ShimmerButton className="shadow-2xl">
        <span className="text-sm font-medium tracking-wide whitespace-pre-wrap">
          Shimmer Button
        </span>
      </ShimmerButton>
    </main>
  );
}
