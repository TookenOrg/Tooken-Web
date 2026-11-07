"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

const MARKER = "__tookenUnsavedAsset";
const MESSAGE = "You have unsaved changes. Leave without saving?";

export function useUnsavedAsset(dirty: boolean) {
  const router = useRouter();
  const dirtyRef = useRef(dirty);
  const armed = useRef(false);
  const leaving = useRef(false);
  const marker = useRef(`${Date.now()}-${Math.random()}`);
  const original = useRef<{ url: string; state: unknown } | null>(null);
  const afterPop = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  dirtyRef.current = dirty;

  const navigate = useCallback(
    (href: string) => {
      leaving.current = true;
      const finish = () => {
        if (!afterPop.current) return;
        afterPop.current = null;
        if (timer.current) clearTimeout(timer.current);
        armed.current = false;
        router.push(href);
      };
      if (armed.current && window.history.state?.[MARKER] === marker.current) {
        afterPop.current = finish;
        window.history.back();
        timer.current = setTimeout(finish, 500);
      } else {
        armed.current = false;
        router.push(href);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!dirty || armed.current || leaving.current) return;
    original.current = {
      url: window.location.href,
      state: window.history.state,
    };
    window.history.pushState(
      { ...window.history.state, [MARKER]: marker.current },
      "",
      window.location.href,
    );
    armed.current = true;
  }, [dirty]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current || leaving.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      if (
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      ) {
        return;
      }
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      if (!dirtyRef.current && !armed.current) return;
      event.preventDefault();
      event.stopPropagation();
      if (dirtyRef.current && !window.confirm(MESSAGE)) return;
      navigate(`${url.pathname}${url.search}${url.hash}`);
    };

    const pop = () => {
      if (afterPop.current) {
        afterPop.current();
        return;
      }
      if (!armed.current || leaving.current) return;
      if (window.history.state?.[MARKER] === marker.current) return;

      if (dirtyRef.current && !window.confirm(MESSAGE)) {
        const previous = original.current;
        if (previous) {
          window.history.pushState(
            { ...(previous.state as object), [MARKER]: marker.current },
            "",
            previous.url,
          );
        }
        return;
      }
      armed.current = false;
      leaving.current = true;
      if (original.current && window.location.href === original.current.url) {
        window.history.back();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [navigate]);

  return navigate;
}
