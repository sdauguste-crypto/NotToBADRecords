import { AppleMusicIcon, SpotifyIcon } from "@/components/icons/platform-icons";
import { cn } from "@/lib/utils";

const PILL =
  "flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] text-[0.7rem] font-semibold tracking-[0.2em] text-chrome transition-colors duration-300 hover:border-blood hover:bg-blood active:scale-[0.98]";

/**
 * SPOTIFY / APPLE MUSIC as a pair of pills: one look for the store links
 * everywhere on /wednesday (the single card, the song open in MORE MUSIC).
 */
export function StoreLinks({
  title,
  spotifyUrl,
  appleMusicUrl,
  className,
}: {
  /** The song: read out before the store, "Wednesday on Spotify". */
  title: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  className?: string;
}) {
  if (!spotifyUrl && !appleMusicUrl) return null;
  // sentence case for screen readers, which may spell out an all-caps title
  const spoken = `${title.charAt(0)}${title.slice(1).toLowerCase()}`;
  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
      {spotifyUrl ? (
        <a href={spotifyUrl} target="_blank" rel="noreferrer" aria-label={`${spoken} on Spotify`} className={PILL}>
          <SpotifyIcon className="h-4 w-4" />
          SPOTIFY
        </a>
      ) : null}
      {appleMusicUrl ? (
        <a href={appleMusicUrl} target="_blank" rel="noreferrer" aria-label={`${spoken} on Apple Music`} className={PILL}>
          <AppleMusicIcon className="h-4 w-4" />
          APPLE MUSIC
        </a>
      ) : null}
    </div>
  );
}
