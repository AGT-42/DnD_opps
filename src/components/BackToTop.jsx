import { useEffect, useState } from "react";

// Floating "back to top" button that appears once you've scrolled `after` pixels down.
export default function BackToTop({ after = 600 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > after);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [after]);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-blood px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg hover:brightness-110"
    >
      <span aria-hidden className="text-base leading-none">↑</span> Top
    </button>
  );
}
