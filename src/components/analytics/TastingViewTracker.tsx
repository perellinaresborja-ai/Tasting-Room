"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/app/actions/analytics";

export default function TastingViewTracker({ tastingId }: { tastingId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per mount to avoid React Strict Mode double firing
    if (!tracked.current) {
      tracked.current = true;
      trackAnalyticsEvent({
        event_name: 'tasting_view',
        tasting_id: tastingId
      }).catch(console.error);
    }
  }, [tastingId]);

  return null; // Invisible component
}
