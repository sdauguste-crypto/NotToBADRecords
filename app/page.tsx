import JourneyBackground from "@/components/scene/journey-background";
import { JourneyTracker } from "@/components/scroll/journey-tracker";
import { SiteNav } from "@/components/nav/site-nav";
import { SiteFooter } from "@/components/nav/site-footer";
import { HeroSection } from "@/components/sections/hero-section";
import { MusicSection } from "@/components/sections/music-section";
import { VideosSection } from "@/components/sections/videos-section";
import { GallerySection } from "@/components/sections/gallery-section";
import { StoreSection } from "@/components/sections/store-section";
import { EventsSection } from "@/components/sections/events-section";
import { AboutSection } from "@/components/sections/about-section";
import { ContactSection } from "@/components/sections/contact-section";

export default function Home() {
  return (
    <>
      <JourneyBackground />
      <JourneyTracker />
      <SiteNav />
      <main className="relative z-10">
        <HeroSection />
        <MusicSection />
        <VideosSection />
        <GallerySection />
        <StoreSection />
        <EventsSection />
        <AboutSection />
        <ContactSection />
      </main>
      <SiteFooter />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #000 0 1px, transparent 1px 3px)",
        }}
      />
    </>
  );
}
