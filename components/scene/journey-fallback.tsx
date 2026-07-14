// Static CSS fallback for no-WebGL / while the canvas chunk loads.
// Synthwave sunset gradient + radial gold sun disc. No JS, no assets.

export default function JourneyFallback() {
  return (
    <div
      className="fixed inset-0 -z-10"
      aria-hidden="true"
      style={{
        background: [
          'radial-gradient(circle 16vmin at 50% 62%, #ffc857 0%, #ffc857 52%, rgba(255, 200, 87, 0) 100%)',
          'linear-gradient(to bottom, #1b0b33, #b636ff 45%, #ff2e88 65%, #ff7a1a 82%, #ffc857)',
        ].join(', '),
      }}
    />
  );
}
