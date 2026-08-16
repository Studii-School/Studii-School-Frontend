"use client";

import type { ComponentProps } from "react";
import NextLink from "next/link";
import { useNavigationProgress } from "./use-navigation-progress";

type NavigationProgressLinkProps = ComponentProps<typeof NextLink>;

function resolveDestination(href: NavigationProgressLinkProps["href"]) {
  if (typeof href === "string") return new URL(href, window.location.href);

  const destination = new URL(href.pathname ?? window.location.pathname, window.location.href);
  if (href.search) {
    destination.search = href.search;
  } else if (href.query) {
    const params = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(href.query)) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      for (const value of values) if (value !== undefined) params.append(key, String(value));
    }
    destination.search = params.toString();
  }
  if (href.hash) destination.hash = href.hash;
  return destination;
}

export function NavigationProgressLink({ href, onNavigate, target, download, ...props }: NavigationProgressLinkProps) {
  const { startNavigation } = useNavigationProgress();

  return (
    <NextLink
      {...props}
      href={href}
      target={target}
      download={download}
      onNavigate={(event) => {
        let prevented = false;
        onNavigate?.({
          preventDefault: () => {
            prevented = true;
            event.preventDefault();
          },
        });
        if (prevented || download || (target && target !== "_self")) return;

        const destination = resolveDestination(href);
        const current = new URL(window.location.href);
        const isSameDocument = destination.origin === current.origin
          && destination.pathname === current.pathname
          && destination.search === current.search;

        if (!isSameDocument) startNavigation();
      }}
    />
  );
}

export default NavigationProgressLink;
