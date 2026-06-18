import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ExtensionSettings, ChrPack, Platform } from "../../core/types";
import { PLATFORMS, defaultSettings } from "../../core/types";
import { loadSettings, saveSettings } from "../../core/storage";
import { installPackFromUrl, installPackFromFile, uninstallPack, checkPackUpdate, getLocalizedField } from "../../core/chr-pack";
import { loadAllPacks } from "../../core/storage";
import { getCurrentLocale, setCurrentLocale } from "../../i18n";
import type { TranslationKeys } from "../../i18n";
import { en } from "../../i18n/en";
import { zh } from "../../i18n/zh";

function startReveals() {
  document.querySelectorAll(".reveal").forEach((el) => {
    (el as HTMLElement).style.animationPlayState = "running";
  });
}

type Tab = "general" | "packs" | "platforms" | "about";
const TAB_IDS: Tab[] = ["general", "packs", "platforms", "about"];
const TAB_ICONS: Record<Tab, string> = { general: "settings", packs: "face", platforms: "devices", about: "info" };
const PN: Record<Platform, string> = { youtube: "YouTube", bilibili: "Bilibili", niconico: "Niconico" };

function Icon({ n, s = 20 }: { n: string; s?: number }) {
  return <span className="material-symbols-rounded" style={{ fontSize: s, lineHeight: 1, display: "inline-flex", verticalAlign: "middle" }}>{n}</span>;
}

export default function OptionsApp({ initialInstallUrl, initialTab }: { initialInstallUrl?: string | null; initialTab?: Tab }) {
  const [loc, setLoc] = useState(getCurrentLocale);
  const D: TranslationKeys = loc === "zh" ? zh : en;
  const o = D.options;

  const [settings, setSettings] = useState<ExtensionSettings>(defaultSettings());
  const [packs, setPacks] = useState<Map<string, ChrPack>>(new Map());
  const [tab, setTab] = useState<Tab>(initialTab || "general");
  useEffect(() => { setTimeout(startReveals, 50); }, [tab]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [upd, setUpd] = useState<Record<string, "checking" | "available" | "latest">>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState<{ text: string; pct: number } | null>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s); applyTheme(s.theme);
      return loadAllPacks();
    }).then((p) => {
      setPacks(p);
      setTimeout(startReveals, 50); // 数据加载完后启动动画
    });
  }, []);

  // 来自 store 劫持的自动安装
  useEffect(() => {
    if (initialInstallUrl) {
      setTab("packs");
      setUrl(initialInstallUrl);
      // 自动触发安装
      setTimeout(async () => {
        setBusy(true); setErr("");
        setProgress({ text: "正在下载...", pct: 0 });
        try {
          const pack = await installPackFromUrl(initialInstallUrl, (phase, pct) => {
            setProgress({ text: phase === "downloading" ? "正在下载..." : "正在解压...", pct });
          });
          setProgress(null);
          await done(pack);
        } catch (e: any) {
          setProgress(null);
          setErr(e.message);
        } finally { setBusy(false); }
      }, 200);
    }
  }, []);

  const show = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); }, []);
  const save = useCallback(async (p: Partial<ExtensionSettings>) => {
    const s = { ...settings, ...p }; setSettings(s); await saveSettings(s);
  }, [settings]);

  const doUrlInstall = useCallback(async () => {
    if (!url.trim()) return; setBusy(true); setErr("");
    setProgress({ text: "正在下载...", pct: 0 });
    try {
      const pack = await installPackFromUrl(url.trim(), (phase, pct) => {
        setProgress({ text: phase === "downloading" ? "正在下载..." : "正在解压...", pct });
      });
      setProgress(null);
      await done(pack);
    } catch (e: any) { setProgress(null); setErr(e.message); } finally { setBusy(false); }
  }, [url]);

  const doFileInstall = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; setBusy(true); setErr("");
    try { const pack = await installPackFromFile(f); await done(pack); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }, []);

  const done = useCallback(async (pack: ChrPack) => {
    if (!settings.activePackIds.includes(pack.id)) {
      await save({ activePackIds: [...settings.activePackIds, pack.id] });
    }
    // 刷新页面跳到角色包 tab
    location.hash = "#tab=packs";
    location.reload();
  }, [settings.activePackIds]);

  const togglePack = useCallback(async (id: string) => {
    const ids = settings.activePackIds.includes(id)
      ? settings.activePackIds.filter((x) => x !== id) : [...settings.activePackIds, id];
    await save({ activePackIds: ids });
  }, [settings.activePackIds]);

  const doRemove = useCallback(async (id: string) => {
    await uninstallPack(id); setPacks(await loadAllPacks());
    if (settings.activePackIds.includes(id)) await save({ activePackIds: settings.activePackIds.filter((x) => x !== id) });
  }, [settings.activePackIds]);

  const doCheck = useCallback(async (id: string) => {
    const pack = packs.get(id); if (!pack) return;
    const status = upd[id];
    // 如果已是 available 状态，点击触发实际更新
    if (status === "available") {
      setUpd((u) => ({ ...u, [id]: "checking" }));
      try {
        const r = await checkPackUpdate(pack);
        if (r?.hasUpdate && r.downloadUrl) {
          setProgress({ text: "正在下载更新...", pct: 0 });
          const newPack = await installPackFromUrl(r.downloadUrl, (phase, pct) => {
            setProgress({ text: phase === "downloading" ? "正在下载更新..." : "正在解压...", pct });
          });
          setProgress(null);
          setPacks(await loadAllPacks()); setTab("packs");
          show(`${getLocalizedField(newPack.manifest, "character_name", loc)} ${o.installed} v${newPack.manifest.version}`);
          // 自动启用新包
          if (!settings.activePackIds.includes(newPack.id)) {
            await save({ activePackIds: [...settings.activePackIds.filter((x) => x !== id), newPack.id] });
          }
          // 卸载旧包
          await uninstallPack(id);
          setPacks(await loadAllPacks());
          setUpd((u) => ({ ...u, [id]: "latest" }));
          return;
        }
      } catch (e: any) { show(`更新失败: ${e.message}`); }
      setUpd((u) => ({ ...u, [id]: "latest" }));
      return;
    }
    // 检查更新
    setUpd((u) => ({ ...u, [id]: "checking" }));
    try {
      const r = await checkPackUpdate(pack);
      setUpd((u) => ({ ...u, [id]: r?.hasUpdate ? "available" : "latest" }));
      if (r?.hasUpdate && r.downloadUrl) {
        show(`${getLocalizedField(pack.manifest, "character_name", loc)} v${r.latestVersion} ${o.updateAvailable}（再次点击此按钮安装）`);
      }
    } catch { setUpd((u) => ({ ...u, [id]: "latest" })); }
  }, [packs, upd, settings.activePackIds, loc]);

  const list = Array.from(packs.values());

  return (
    <div style={{ position: "relative", zIndex: 10, maxWidth: 800, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="reveal d1" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Memeify Thumbnail</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-fg)" }}>{o.title}</p>
      </div>

      <div className="reveal d2" style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 24, overflowX: "auto" }}>
        {TAB_IDS.map((tid) => (
          <button key={tid} onClick={() => setTab(tid)} style={{
            padding: "10px 18px", fontSize: "0.82rem", fontWeight: 500, whiteSpace: "nowrap",
            color: tab === tid ? "var(--primary)" : "var(--muted-fg)",
            borderBottom: tab === tid ? "2px solid var(--primary)" : "2px solid transparent",
            background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            transition: "color 0.15s, border-color 0.15s",
          }}><Icon n={TAB_ICONS[tid]} s={18} />{String(o[tid as keyof typeof o])}</button>
        ))}
      </div>

      {tab === "general" && (
        <div className="reveal d3" style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, boxShadow: "var(--shadow)" }}>
          <Row label={o.enableExtension as string} desc={o.enableExtensionDesc as string}
            control={<Tgl chk={settings.enabled} onChange={(v) => save({ enabled: v })} />} />
          <Row label={o.locale as string} control={
            <select value={settings.locale} onChange={(e) => { const v = e.target.value as "en" | "zh"; setLoc(v); setCurrentLocale(v); save({ locale: v }); }}
              style={{ padding: "6px 30px 6px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--fg)", fontSize: "0.78rem", minWidth: 100 }}>
              <option value="en">English</option><option value="zh">简体中文</option>
            </select>
          } />
          <Row label={o.theme as string} control={
            <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 8, background: "var(--secondary)", border: "1px solid var(--border)" }}>
              {(["dark", "light", "auto"] as const).map((t) => (
                <button key={t} onClick={(e) => { save({ theme: t }); applyTheme(t, e.clientX, e.clientY); }} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 500, border: "none", cursor: "pointer",
                  background: settings.theme === t ? "var(--card-bg)" : "transparent",
                  color: settings.theme === t ? "var(--fg)" : "var(--muted-fg)",
                  boxShadow: settings.theme === t ? "var(--shadow)" : "none", transition: "background 0.15s",
                }}><Icon n={t === "dark" ? "dark_mode" : t === "light" ? "light_mode" : "contrast"} s={16} /></button>
              ))}
            </div>
          } />
        </div>
      )}

      {tab === "packs" && (
        <>
          <div className="reveal d3" style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4 }}>{o.installPack as string}</div>
            <div style={{ fontSize: "0.76rem", color: "var(--muted-fg)", marginBottom: 14 }}>{o.installPackDesc as string}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={o.packUrlPlaceholder as string}
                onKeyDown={(e) => e.key === "Enter" && doUrlInstall()}
                style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--fg)", fontSize: "0.82rem" }} />
              <Btn primary onClick={doUrlInstall} disabled={busy || !url.trim()}>
                <Icon n={busy ? "refresh" : "download"} s={18} />{busy ? o.installing as string : o.installFromUrl as string}
              </Btn>
              <Btn onClick={() => fileRef.current?.click()} disabled={busy}>
                <Icon n="file_open" s={18} />{o.installFromFile as string}
              </Btn>
              <input ref={fileRef} type="file" accept=".zip" style={{ display: "none" }} onChange={doFileInstall} />
            </div>
            {err && <p style={{ color: "var(--destructive)", fontSize: "0.78rem", marginTop: 8 }}>{err}</p>}
          </div>

          {list.length === 0 ? (
            <div className="reveal d4" style={{ textAlign: "center", padding: 40, color: "var(--muted-fg)" }}>
              <Icon n="add_photo_alternate" s={48} /><p style={{ marginTop: 12 }}>{o.noPack as string}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {list.map((pack, i) => (
                <div key={pack.id} className={`reveal d${Math.min(i + 3, 5)}`} style={{
                  background: "var(--card-bg)", border: `1px solid ${settings.activePackIds.includes(pack.id) ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 12, overflow: "hidden", boxShadow: settings.activePackIds.includes(pack.id) ? "0 0 0 1px var(--primary)" : "var(--shadow)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderBottom: "1px solid var(--border)" }}>
                    {pack.iconUrl
                      ? <img src={pack.iconUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", background: "var(--secondary)" }} />
                      : <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="face" s={24} /></div>}
                    <div style={{ flex: 1, fontWeight: 700, fontSize: "0.9rem" }}>{getLocalizedField(pack.manifest, "character_name", loc)}</div>
                    <Tgl chk={settings.activePackIds.includes(pack.id)} onChange={() => togglePack(pack.id)} />
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <p style={{ fontSize: "0.76rem", color: "var(--muted-fg)", lineHeight: 1.5, marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {getLocalizedField(pack.manifest, "description", loc)}
                    </p>
                    <div style={{ display: "flex", gap: 16, fontSize: "0.7rem", color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}>
                      <span>v{pack.manifest.version}</span>
                      <span>{(o.imagesCount as string).replace("{count}", String(pack.images.size))}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, padding: "0 14px 12px", flexWrap: "wrap" }}>
                    <Btn onClick={() => doCheck(pack.id)} disabled={upd[pack.id] === "checking"}>
                      <Icon n={upd[pack.id] === "checking" ? "refresh" : "sync"} s={16} />
                      {upd[pack.id] === "checking" ? o.checkUpdates as string : upd[pack.id] === "available" ? o.updateAvailable as string : o.checkUpdates as string}
                    </Btn>
                    <Btn onClick={() => doRemove(pack.id)} style={{ border: "1px solid var(--destructive)", color: "var(--destructive)" }}>
                      <Icon n="delete" s={16} />{o.uninstall as string}
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "platforms" && PLATFORMS.map((p, i) => (
        <div key={p} className={`reveal d${Math.min(i + 3, 5)}`} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "var(--shadow)" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4 }}>{PN[p]}</div>
          <Row label={`${o.enablePlatform as string} ${PN[p]}`} control={
            <Tgl chk={settings.platforms[p].enabled} onChange={(v) => save({ platforms: { ...settings.platforms, [p]: { ...settings.platforms[p], enabled: v } } })} />
          } />
        </div>
      ))}

      {tab === "about" && (
        <div className="reveal d3" style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <img src="/icons/128.png" alt="" style={{ width: 48, height: 48, borderRadius: 12, background: "var(--secondary)" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>Memeify Thumbnail</div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}>v0.1.0</div>
            </div>
          </div>
          <div style={{ fontSize: "0.82rem", lineHeight: 2 }}>
            <div><span style={{ color: "var(--muted-fg)", width: 80, display: "inline-block" }}>{o.projectUrl as string}</span>
              <a href="https://github.com/Memeify-Thumbnail" target="_blank" rel="noopener" style={{ color: "var(--primary)" }}>github.com/Memeify-Thumbnail</a></div>
            <div><span style={{ color: "var(--muted-fg)", width: 80, display: "inline-block" }}>{o.license as string}</span>MIT</div>
          </div>
        </div>
      )}

      {/* 进度弹窗 */}
      {progress && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14,
            padding: "28px 32px", boxShadow: "var(--shadow), 0 8px 40px rgba(0,0,0,0.2)",
            minWidth: 260, textAlign: "center",
          }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 14 }}>{progress.text}</p>
            <div style={{ background: "var(--secondary)", borderRadius: 999, height: 5, overflow: "hidden" }}>
              <div style={{ width: progress.pct + "%", height: "100%", background: "var(--primary)", borderRadius: 999, transition: "width 0.3s ease" }} />
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--muted-fg)", fontFamily: "var(--font-mono)", marginTop: 8 }}>{progress.pct}%</p>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999 }}>
          <div style={{ background: "var(--card-bg)", color: "var(--fg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 20px", fontSize: "0.82rem", boxShadow: "var(--shadow), 0 8px 32px rgba(0,0,0,0.15)", backdropFilter: "blur(12px)", animation: "toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, desc, control }: { label: string; desc?: string; control: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: "0.72rem", color: "var(--muted-fg)", marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function Btn({ children, onClick, disabled, style }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--fg)", ...style,
    }}>{children}</button>
  );
}

function Tgl({ chk, onChange }: { chk: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!chk)} style={{
      position: "relative", width: 40, height: 22, borderRadius: 999,
      background: chk ? "var(--primary)" : "var(--muted)", border: "none", cursor: "pointer", padding: 0, transition: "background 0.2s",
    }}>
      <span style={{ position: "absolute", top: 3, left: chk ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </button>
  );
}

function applyTheme(theme: string, x?: number, y?: number) {
  const isDark = theme === "dark" || (theme === "auto" && matchMedia("(prefers-color-scheme:dark)").matches);
  const r = document.documentElement;
  if (isDark === r.classList.contains("dark")) return;
  function apply() { r.classList.toggle("dark", isDark); try { localStorage.setItem("memeify-theme", theme); } catch {} }
  r.classList.add("no-transitions");
  setTimeout(() => r.classList.remove("no-transitions"), 600);
  if ((document as any).startViewTransition) {
    if (x !== undefined) { r.style.setProperty("--vt-origin-x", x + "px"); r.style.setProperty("--vt-origin-y", y + "px"); }
    (document as any).startViewTransition(() => apply());
  } else apply();
}
