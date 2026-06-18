import React, { useState, useEffect } from "react";
import { loadSettings, updateSettings } from "../../core/storage";
import { loadAllPacks } from "../../core/storage";
import type { ChrPack } from "../../core/types";
import { getLocalizedField } from "../../core/chr-pack";
import { getCurrentLocale } from "../../i18n";
import { en } from "../../i18n/en";
import { zh } from "../../i18n/zh";

export default function PopupApp() {
  const loc = getCurrentLocale();
  const d = loc === "zh" ? zh : en;
  const p = d.popup;

  const [enabled, setEnabled] = useState(true);
  const [packs, setPacks] = useState<ChrPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await loadSettings();
        setEnabled(s.enabled);
        if (s.activePackIds.length > 0) {
          const all = await loadAllPacks();
          setPacks(s.activePackIds.map((id) => all.get(id)).filter(Boolean) as ChrPack[]);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggle = async () => {
    const v = !enabled;
    setEnabled(v);
    await updateSettings({ enabled: v });
  };

  const openOptions = () => {
    try { chrome.runtime.openOptionsPage(); }
    catch { chrome.tabs.create({ url: chrome.runtime.getURL("/options.html") }); }
  };

  if (loading) {
    return (
      <div style={{ width: 280, minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--muted-fg)", animation: "spin 1s linear infinite" }}>refresh</span>
      </div>
    );
  }

  return (
    <div style={{ width: 280, padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--bg)", color: "var(--fg)", fontSize: "0.8rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/icons/32.png" alt="" style={{ width: 20, height: 20, borderRadius: 4 }} />
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{p.title}</span>
        </div>
        <Tgl chk={enabled} onChange={toggle} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--muted-fg)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: enabled ? "var(--primary)" : "var(--muted-fg)" }} />
        {enabled ? p.enabled : p.disabled}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {packs.length === 0 ? (
          <div style={{ background: "var(--secondary)", borderRadius: 8, padding: "10px 12px", color: "var(--muted-fg)", fontSize: "0.75rem" }}>
            {p.noPack}
          </div>
        ) : packs.map((pack) => (
          <div key={pack.id} style={{ background: "var(--secondary)", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            {pack.iconUrl
              ? <img src={pack.iconUrl} alt="" style={{ width: 24, height: 24, borderRadius: 5, objectFit: "cover" }} />
              : <div style={{ width: 24, height: 24, borderRadius: 5, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--muted-fg)" }}>face</span>
                </div>}
            <div style={{ flex: 1, minWidth: 0, fontSize: "0.75rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {getLocalizedField(pack.manifest, "character_name", loc)}
            </div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}>v{pack.manifest.version}</div>
          </div>
        ))}
      </div>

      <button onClick={openOptions} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
        border: "none", cursor: "pointer", background: "var(--primary)", color: "var(--primary-fg)",
      }}>
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>settings</span>
        {p.openOptions}
      </button>
    </div>
  );
}

function Tgl({ chk, onChange }: { chk: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!chk)} style={{
      position: "relative", width: 34, height: 20, borderRadius: 999,
      background: chk ? "var(--primary)" : "var(--muted)", border: "none", cursor: "pointer", padding: 0,
      transition: "background 0.2s",
    }}>
      <span style={{ position: "absolute", top: 3, left: chk ? 17 : 3, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
    </button>
  );
}
