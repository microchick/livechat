"use client";

import { useCallback, useEffect, useRef } from "react";

type UseStickyChatScrollOptions = {
  enabled?: boolean;
  itemCount: number;
  resetKey?: string | null;
  threshold?: number;
};

export function useStickyChatScroll({
  enabled = true,
  itemCount,
  resetKey,
  threshold = 96,
}: UseStickyChatScrollOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickRef = useRef(true);
  const previousCountRef = useRef(0);
  const previousKeyRef = useRef<string | null | undefined>(resetKey);

  const updateStickiness = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      shouldStickRef.current = true;
      return;
    }

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickRef.current = distanceToBottom <= threshold;
  }, [threshold]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const keyChanged = previousKeyRef.current !== resetKey;
    const countChanged = previousCountRef.current !== itemCount;

    if (keyChanged) {
      shouldStickRef.current = true;
    }

    if (keyChanged || (countChanged && shouldStickRef.current)) {
      const frameId = window.requestAnimationFrame(() => {
        scrollToBottom("auto");
      });

      previousCountRef.current = itemCount;
      previousKeyRef.current = resetKey;

      return () => window.cancelAnimationFrame(frameId);
    }

    previousCountRef.current = itemCount;
    previousKeyRef.current = resetKey;
  }, [enabled, itemCount, resetKey, scrollToBottom]);

  return {
    containerRef,
    handleScroll: updateStickiness,
    scrollToBottom,
  };
}
