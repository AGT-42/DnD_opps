import { useRef, useState } from "react";

// One drag-and-drop engine for every page (combat stat blocks, NPCs, lore, groups).
// Mouse: native HTML5 drag from the grip. Touch: pointer events on the grip (native drag doesn't work on most phones).
//
//   const dnd = useDragDrop({ accepts: (drag, target) => bool, onDrop: (drag, target) => void });
//   <DragGrip gripProps={dnd.gripProps("card", id)} />      // what you grab
//   <article {...dnd.dropProps("card", id)} />               // where you can drop
//   dnd.drag, dnd.isOver("card", id)                         // for highlighting
const TARGET = "[data-drop-kind]";
const same = (a, b) => a === b || (a && b && a.kind === b.kind && a.id === b.id);

export function useDragDrop({ accepts, onDrop }) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const dragRef = useRef(null);
  const touching = useRef(false);

  const begin = (d) => {
    dragRef.current = d;
    setDrag(d);
  };
  const end = () => {
    dragRef.current = null;
    touching.current = false;
    setDrag(null);
    setOver(null);
  };
  const ok = (t) => !!dragRef.current && accepts(dragRef.current, t);
  const hover = (t) => setOver((prev) => (same(prev, t) ? prev : t));

  // Finger position -> the innermost drop target that accepts what is being dragged.
  const targetAt = (x, y) => {
    let el = document.elementFromPoint(x, y)?.closest(TARGET);
    while (el) {
      const t = { kind: el.dataset.dropKind, id: el.dataset.dropId };
      if (ok(t)) return t;
      el = el.parentElement?.closest(TARGET);
    }
    return null;
  };

  const gripProps = (kind, id) => ({
    draggable: true,
    style: { touchAction: "none" }, // the finger drags the card instead of scrolling the page
    onContextMenu: (e) => touching.current && e.preventDefault(),
    onDragStart: (e) => {
      if (touching.current) return e.preventDefault(); // touch is handled by the pointer events below
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      const image = e.currentTarget.closest("[data-drag-image]");
      if (image) e.dataTransfer.setDragImage(image, 24, 24);
      begin({ kind, id });
    },
    onDragEnd: end,
    onPointerDown: (e) => {
      touching.current = e.pointerType === "touch";
    },
    onPointerMove: (e) => {
      if (!touching.current) return;
      if (!dragRef.current) begin({ kind, id });
      hover(targetAt(e.clientX, e.clientY));
      // keep long pages scrollable while dragging
      if (e.clientY < 70) window.scrollBy(0, -14);
      else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
    },
    onPointerUp: (e) => {
      if (!touching.current) return;
      const target = dragRef.current ? targetAt(e.clientX, e.clientY) : null;
      if (target) onDrop(dragRef.current, target);
      end();
    },
    onPointerCancel: () => touching.current && end(),
  });

  const dropProps = (kind, id) => ({
    "data-drop-kind": kind,
    "data-drop-id": id,
    onDragOver: (e) => {
      if (!ok({ kind, id })) return; // not ours: let a parent target take it
      e.preventDefault();
      e.stopPropagation();
      hover({ kind, id });
    },
    onDrop: (e) => {
      if (!ok({ kind, id })) return;
      e.preventDefault();
      e.stopPropagation();
      onDrop(dragRef.current, { kind, id });
      end();
    },
  });

  const isOver = (kind, id) => !!drag && !!over && over.kind === kind && over.id === id;

  return { drag, gripProps, dropProps, isOver };
}
