import { useState } from "react";
import ImageCropper from "./ImageCropper.jsx";
import { fileToDataUrl } from "../utils/image.js";
import { label, btnSmall } from "../utils/ui.js";

// Upload / replace / remove control with a preview. `value` is a data URL ("" for none).
// With `square`, a picked file opens the manual cropper and the result is saved as a square.
export default function ImageField({ value, onChange, square = false, title = "Image (map, portrait, artwork)" }) {
  const [cropSrc, setCropSrc] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets you pick the same file again later
    if (!file) return;
    try {
      if (square) setCropSrc(await fileToDataUrl(file, 1600, 0.92)); // keep extra detail to crop from
      else onChange(await fileToDataUrl(file));
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div>
      <span className="mb-1 block text-sm text-mute">{title}</span>
      {value && <img src={value} alt="Preview" className={square ? "mb-2 h-28 w-28 border border-line object-cover" : "mb-2 max-h-48 border border-line"} />}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${btnSmall} cursor-pointer`}>
          {value ? "Replace image" : "Upload image"}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
        {value && (
          <button type="button" onClick={() => onChange("")} className={`text-blood hover:underline ${label}`}>
            Remove image
          </button>
        )}
      </div>
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onDone={(url) => {
            onChange(url);
            setCropSrc("");
          }}
          onCancel={() => setCropSrc("")}
        />
      )}
    </div>
  );
}
