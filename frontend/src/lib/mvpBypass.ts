const MVP_BYPASS_KEY = "beyondchat_mvp_bypass";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isMvpBypassSessionActive(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(MVP_BYPASS_KEY) === "1";
}

export function activateMvpBypassSession() {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MVP_BYPASS_KEY, "1");
}

export function clearMvpBypassSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(MVP_BYPASS_KEY);
}
