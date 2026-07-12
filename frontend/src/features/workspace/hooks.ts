import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/sessionClient";
import { type SectionState, sectionLoading } from "./api";

function settle<T>(value: T): SectionState<T> {
  const empty = Array.isArray(value)
    ? value.length === 0
    : value && typeof value === "object" && Array.isArray((value as { items?: unknown[] }).items)
      ? ((value as { items: unknown[] }).items.length === 0)
      : false;
  return { status: empty ? "empty" : "ready", data: value, message: null };
}

/**
 * Race-safe section loader: each reload bumps a generation counter so a stale
 * response from a previous organization/project selection can never overwrite
 * a newer one. Failures degrade only their own section.
 */
export function useSection<T>(loader: () => Promise<T>, key: string): SectionState<T> & { reload: () => void } {
  const [state, setState] = useState<SectionState<T>>(sectionLoading);
  const generation = useRef(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const load = useCallback(() => {
    const ticket = ++generation.current;
    setState(sectionLoading);
    loaderRef.current().then(
      (value) => {
        if (generation.current === ticket) setState(settle(value));
      },
      (cause: unknown) => {
        if (generation.current !== ticket) return;
        if (cause instanceof ApiError && (cause.status === 403 || cause.status === 401)) {
          setState({ status: "forbidden", data: null, message: cause.message });
        } else {
          setState({
            status: "error",
            data: null,
            message: cause instanceof Error ? cause.message : "The request failed.",
          });
        }
      },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Deferred so the effect body never sets state synchronously.
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
      // Invalidate in-flight responses when the key (org/project) changes.
      generation.current += 1;
    };
  }, [key, load]);

  return { ...state, reload: load };
}
