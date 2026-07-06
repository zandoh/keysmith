export type Platform = "mac" | "other";

interface NavigatorWithHints extends Navigator {
  userAgentData?: { platform?: string };
}

/**
 * Detects the platform for `mod` resolution: Meta on Apple platforms,
 * Control elsewhere. Overridable in tests and via manager options.
 */
export function detectPlatform(
  nav: Navigator | undefined = typeof navigator === "undefined" ? undefined : navigator,
): Platform {
  const hint =
    (nav as NavigatorWithHints | undefined)?.userAgentData?.platform ?? nav?.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(hint) ? "mac" : "other";
}
