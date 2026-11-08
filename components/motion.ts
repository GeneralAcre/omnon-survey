"use client";

import { animate, createScope, onScroll, stagger, utils, type Scope } from "animejs";
import { useEffect, type RefObject } from "react";

/**
 * Runs anime.js setup inside a scope rooted at `root`, so string selectors only match inside it,
 * and reverts everything (inline styles, observers, split text) on unmount.
 * Skipped entirely for people who ask for reduced motion.
 */
export function useAnime(root: RefObject<HTMLElement | null>, setup: (scope: Scope) => void | (() => void)) {
  useEffect(() => {
    const scope = createScope({ root, mediaQueries: { reduce: "(prefers-reduced-motion: reduce)" } }).add((self) => {
      if (!self || self.matches.reduce) return;
      return setup(self);
    });
    return () => {
      scope.revert();
    };
    // The setup runs once per mount; it reads the DOM, not props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Plays once when the element's top comes 80px above the bottom of the screen, and never pauses.
export const onView = (target: Element) => onScroll({ target, enter: "bottom-=80 top", sync: "play" });

/**
 * The scroll reveals used across the page:
 * - `data-reveal`: the element rises in on its own.
 * - `data-stagger`: its children rise in one after another.
 * Only elements whose nearest `data-scope` is `root`, so nested scopes don't animate twice.
 */
export function scrollReveals(root: Element | null) {
  const own = (sel: string) => utils.$(sel).filter((el) => el.closest("[data-scope]") === root);
  for (const el of own("[data-reveal]")) {
    utils.set(el, { opacity: 0, y: 28 });
    animate(el, { opacity: 1, y: 0, duration: 900, ease: "out(3)", autoplay: onView(el) });
  }
  for (const group of own("[data-stagger]")) {
    utils.set(group.children, { opacity: 0, y: 32 });
    animate(group.children, {
      opacity: 1,
      y: 0,
      duration: 800,
      delay: stagger(90),
      ease: "out(3)",
      autoplay: onView(group),
    });
  }
}
