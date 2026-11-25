import { useRef, useState } from "react";
import { downloadBackup, parseBackup, summarize, applyBackup } from "../utils/backup.js";
import { label, btnPrimary, btnOutline } from "../utils/ui.js";

export default function Backup() {
  const fileRef = useRef(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null); // { name, exportedAt, data } waiting for Merge / Replace

  const handleExport = () => {
    const n = downloadBackup();
    setError("");
    setNotice(`Saved a backup with ${n} data table${n === 1 ? "" : "s"}. Move that file to your other device and import it there.`);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again later
    if (!file) return;
    setNotice("");
    try {
      const { exportedAt, data } = parseBackup(await file.text());
      if (Object.keys(data).length === 0) throw new Error("That backup has no data in it.");
      setError("");
      setPending({ name: file.name, exportedAt, data });
    } catch (err) {
      setPending(null);
      setError(err.message);
    }
  };

  const confirm = (mode) => {
    if (mode === "replace" && !window.confirm("Replace everything on this device with the backup? Your current data here will be overwritten.")) return;
    applyBackup(pending.data, mode);
    setNotice(mode === "replace" ? "Imported. This device now matches the backup." : "Imported. Anything new from the backup was added; entries you already had here were kept.");
    setPending(null);
  };

  return (
    <section className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-5xl text-ink">Backup &amp; transfer</h1>
        <p className="mt-2 text-mute">
          Your campaigns, players, NPCs, items and monsters live in this browser only. To use them on another device, export a file here and import it there.
        </p>
      </div>

      {notice && <p className="border border-line bg-white px-4 py-3 text-ink" role="status">{notice}</p>}
      {error && <p className="border border-blood bg-white px-4 py-3 text-blood" role="alert">{error}</p>}

      <div className="space-y-3 border border-line bg-white p-5">
        <h2 className="font-display text-2xl text-ink">Export</h2>
        <p className="text-sm text-mute">Downloads one file with everything. Send it to yourself (email, cloud drive, messaging app) to open it on another device.</p>
        <button onClick={handleExport} className={btnPrimary}>Download backup</button>
      </div>

      <div className="space-y-3 border border-line bg-white p-5">
        <h2 className="font-display text-2xl text-ink">Import</h2>
        <p className="text-sm text-mute">Pick a backup file made by this app. You'll see what's inside before anything changes.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className={btnOutline}>Choose backup file</button>

        {pending && (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="text-ink">
              {pending.name}
              {pending.exportedAt && <span className="text-mute"> · made {new Date(pending.exportedAt).toLocaleString()}</span>}
            </p>
            <ul className="flex flex-wrap gap-2">
              {summarize(pending.data).map((s) => (
                <li key={s.key} className="border border-line bg-paper px-2 py-1 text-xs text-ink">{s.count} {s.name}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => confirm("merge")} className={btnPrimary}>Merge into this device</button>
              <button onClick={() => confirm("replace")} className={btnOutline}>Replace this device</button>
              <button onClick={() => setPending(null)} className={`px-3 text-mute hover:text-ink ${label}`}>Cancel</button>
            </div>
            <p className="text-xs text-mute">
              Merge adds anything this device is missing and keeps your version of anything both devices have. Replace makes this device an exact copy of the backup.
            </p>
          </div>
        )}
      </div>

      <p className="text-sm text-mute">
        Heads up: this moves data when you ask it to, it doesn't keep devices in sync automatically. Live sync would need an online account or server, which this app doesn't have.
      </p>
    </section>
  );
}
