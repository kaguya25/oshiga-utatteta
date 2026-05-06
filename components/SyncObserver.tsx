"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export function SyncObserver() {
  const { status } = useSession();
  const hasSynced = useRef(false);

  useEffect(() => {
    // 認証済みの場合のみ、マウント時に1回だけバックグラウンドで同期を実行
    if (status === "authenticated" && !hasSynced.current) {
      hasSynced.current = true;
      
      fetch("/api/spotify/sync", {
        method: "POST",
      }).catch((err) => {
        console.error("Failed to sync Spotify history on initial load:", err);
      });
    }
  }, [status]);

  return null;
}
