// The handle you grab to move a card or a group. Deliberately big (44px) so it's easy to hit with a thumb.
// gripProps comes from useDragDrop().gripProps(kind, id).
const Dots = () => Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-current" />);

export default function DragGrip({ gripProps, variant = "bar", label = "Drag to move this card" }) {
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
        className="grid h-11 w-11 shrink-0 cursor-grab select-none grid-cols-3 content-center justify-items-center gap-1 border border-line bg-paper px-2 text-mute hover:text-ink active:cursor-grabbing"
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
