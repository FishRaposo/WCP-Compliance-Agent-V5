import { useEffect, useState } from "react";

function matches(query: string): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

/** Track a CSS media query so a component renders one element per breakpoint, not two. */
export function useMediaQuery(query: string): boolean {
  const [isMatch, setIsMatch] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const onChange = () => setIsMatch(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return isMatch;
}
