// The handle you grab to move a card or a group. Deliberately big (44px) so it's easy to hit with a thumb.
// gripProps comes from useDragDrop().gripProps(kind, id).
const Dots = () => Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-current" />);

// compact: a smaller (36px) square, used in slim folder headers.
export default function DragGrip({ gripProps, variant = "bar", label = "Drag to move this card", compact = false }) {
  const common = {
    ...gripProps,
    title: label,
    "aria-label": label,
    role: "button",
  };
  if (variant === "square") {
    return (
      <div
        {...common}
        className={`grid shrink-0 cursor-grab select-none grid-cols-3 content-center justify-items-center gap-1 border border-line bg-paper text-mute hover:text-ink active:cursor-grabbing ${compact ? "h-9 w-9 px-1" : "h-11 w-11 px-2"}`}
      >
        <Dots />
      </div>
    );
  }
  return (
    <div
      {...common}
      className="flex h-11 cursor-grab select-none items-center justify-center gap-2 bg-paper text-mute hover:text-ink active:cursor-grabbing"
    >
      <Dots />
    </div>
  );
}
