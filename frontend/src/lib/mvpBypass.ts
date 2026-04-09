const bypassStorageKey = "bc.dev_bypass";
const bypassEventName = "bc:mvp-bypass-change";

export function isMvpBypassEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_MVP_BYPASS === "true";
}

export function isMvpBypassActive() {
  if (typeof window === "undefined") {
    return false;
  }
  return isMvpBypassEnabled() && window.localStorage.getItem(bypassStorageKey) === "true";
}

export function setMvpBypassActive(active: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (active) {
    window.localStorage.setItem(bypassStorageKey, "true");
  } else {
    window.localStorage.removeItem(bypassStorageKey);
  }

  window.dispatchEvent(new CustomEvent(bypassEventName, { detail: active }));
}

export function getMvpBypassEventName() {
  return bypassEventName;
}
