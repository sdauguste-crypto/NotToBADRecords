import type { Release } from "@/lib/content";
import { CoverArt } from "@/components/fanhub/cover-art";

type ReleaseCardProps = {
  release: Release;
};

export function ReleaseCard({ release }: ReleaseCardProps) {
  return (
    <article className="glass-panel group relative overflow-hidden p-4 transition-all duration-300 hover:-translate-y-1 hover:border-sunset-pink/60 hover:shadow-[0_0_36px_rgba(255,46,136,.3)]">
      {release.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={release.coverImage}
          alt={`${release.title} — cover art`}
          className="aspect-square w-full rounded-xl border border-sunset-pink/15 object-cover"
        />
      ) : (
        <CoverArt
          seed={release.seed}
          title={release.title}
          className="aspect-square w-full"
        />
      )}
      <h3 className="mt-4 truncate font-bold uppercase tracking-wide text-foreground">
        {release.title}
      </h3>
      <p className="mt-1 text-xs tracking-[0.2em] text-foreground/60">
        {release.artist} · {release.year}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {release.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-sunset-pink/30 px-2.5 py-0.5 text-xs uppercase tracking-[0.15em] text-foreground/70"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs font-bold uppercase tracking-[0.25em]">
        {release.spotifyUrl ? (
          <a
            href={release.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sunset-gold opacity-0 transition-opacity duration-300 hover:underline group-hover:opacity-100"
          >
            SPOTIFY ▸
          </a>
        ) : null}
        {release.appleMusicUrl ? (
          <a
            href={release.appleMusicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sunset-pink opacity-0 transition-opacity duration-300 hover:underline group-hover:opacity-100"
          >
            APPLE ▸
          </a>
        ) : null}
      </div>
    </article>
  );
}
