import React from "react";
import ReactDOM from "react-dom/client";
import OptionsApp from "./App";
import "../../styles/globals.css";

function startReveals() {
  document.querySelectorAll(".reveal").forEach((el) => {
    (el as HTMLElement).style.animationPlayState = "running";
  });
}

// 从 URL hash 中提取安装 URL（#install=xxx）
const installUrl = location.hash.startsWith("#install=")
  ? decodeURIComponent(location.hash.slice(9))
  : null;

// 从 URL hash 中提取 tab（#tab=packs）
const initialTab = location.hash.startsWith("#tab=")
  ? (location.hash.slice(5) as "general" | "packs" | "platforms" | "about")
  : undefined;

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <OptionsApp initialInstallUrl={installUrl} initialTab={initialTab} />
    </React.StrictMode>
  );
  setTimeout(startReveals, 100);
}
