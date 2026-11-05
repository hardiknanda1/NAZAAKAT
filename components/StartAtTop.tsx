"use client";

import { useEffect } from "react";

// The site always opens at the top of the home page: no restored scroll position after a reload,
// and no jump to a section from a shared link such as "/#book". Menu links still scroll as usual.
export default function StartAtTop() {
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo(0, 0);
  }, []);
  return null;
}
