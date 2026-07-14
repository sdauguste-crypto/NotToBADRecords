// Static CSS fallback for no-WebGL / while the canvas chunk loads.
// Synthwave sunset gradient + radial gold sun disc. No JS, no assets.

export default function JourneyFallback() {
  return (
    <div
      className="fixed inset-0 -z-10"
      aria-hidden="true"
      style={{
        background: [
          'radial-gradient(circle 16vmin at 50% 62%, #d9a8ff 0%, #d9a8ff 52%, rgba(217, 168, 255, 0) 100%)',
          'linear-gradient(to bottom, #1b0b33, #b636ff 45%, #ff2e88 65%, #ff4fc3 82%, #d9a8ff)',
        ].join(', '),
      }}
    />
  );
}
