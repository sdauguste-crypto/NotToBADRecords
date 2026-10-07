/** Marks a page driven by the ?preview / ?at test switch, so a test view is never mistaken for the live one. */
export function PreviewTag({ released }: { released: boolean }) {
  return (
    <p className="pointer-events-none fixed top-3 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-blood bg-black/80 px-4 py-1.5 text-[0.6rem] font-bold tracking-[0.3em] text-[#ebeef1]">
      TEST VIEW · {released ? "AFTER RELEASE" : "BEFORE RELEASE"}
    </p>
  );
}
