// ============================================================
//  Pack Card — displays installed CHR-pack info
// ============================================================

import React from "react";
import type { ChrPack } from "../core/types";
import { getLocalizedField } from "../core/chr-pack";
import type { TranslationKeys } from "../i18n";

interface PackCardProps {
  pack: ChrPack;
  isActive: boolean;
  locale: string;
  t: TranslationKeys["options"];
  onActivate: (packId: string) => void;
  onUninstall: (packId: string) => void;
  onCheckUpdate: (packId: string) => void;
  updateStatus?: "checking" | "available" | "latest" | null;
}

export function PackCard({
  pack,
  isActive,
  locale,
  t,
  onActivate,
  onUninstall,
  onCheckUpdate,
  updateStatus,
}: PackCardProps) {
  const name = getLocalizedField(pack.manifest, "character_name", locale);
  const desc = getLocalizedField(pack.manifest, "description", locale);

  return (
    <div className={`pack-card ${isActive ? "pack-card-active" : ""}`}>
      <div className="pack-card-header">
        {pack.iconUrl ? (
          <img
            src={pack.iconUrl}
            alt={name}
            className="pack-card-icon"
          />
        ) : (
          <div className="pack-card-icon flex items-center justify-center text-lg">
            <span className="material-symbols-rounded">face</span>
          </div>
        )}
        <div className="pack-card-title">{name}</div>
        {isActive && (
          <span className="badge badge-primary">Active</span>
        )}
      </div>

      <div className="pack-card-body">
        <div className="pack-card-desc">{desc}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-medium">{t.packVersion}:</span> v{pack.manifest.version}
          </span>
          <span>
            <span className="font-medium">{t.packAuthor}:</span> {pack.manifest.author}
          </span>
          <span>
            <span className="font-medium">{t.packImages}:</span> {pack.images.size}
          </span>
        </div>
      </div>

      <div className="pack-card-actions">
        {!isActive && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onActivate(pack.id)}
          >
            <span className="material-symbols-rounded text-sm">check_circle</span>
            Activate
          </button>
        )}
        <button
          className="btn btn-sm"
          onClick={() => onCheckUpdate(pack.id)}
          disabled={updateStatus === "checking"}
        >
          {updateStatus === "checking" ? (
            <>
              <span className="material-symbols-rounded text-sm animate-spin">refresh</span>
              Checking...
            </>
          ) : updateStatus === "available" ? (
            <>
              <span className="material-symbols-rounded text-sm">system_update</span>
              Update
            </>
          ) : (
            <>
              <span className="material-symbols-rounded text-sm">sync</span>
              {t.checkUpdates}
            </>
          )}
        </button>
        <button
          className="btn btn-destructive btn-sm"
          onClick={() => onUninstall(pack.id)}
        >
          <span className="material-symbols-rounded text-sm">delete</span>
          {t.uninstall}
        </button>
      </div>
    </div>
  );
}
