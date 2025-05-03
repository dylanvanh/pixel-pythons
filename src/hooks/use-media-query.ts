"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Set initial value for server-side rendering
    if (typeof window !== "undefined") {
      setMatches(window.matchMedia(query).matches);
    }

    // Create a MediaQueryList to observe changes
    const mediaQuery = window.matchMedia(query);

    // Define the handler function
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add the event listener
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    // Clean up the event listener on unmount
    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, [query]);

  return matches;
}
