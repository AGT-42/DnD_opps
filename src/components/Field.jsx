export default function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm text-mute">{label}</span>
      {children}
    </label>
  );
}
