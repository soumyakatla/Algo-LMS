"use client";

import React, { useEffect } from "react";
import { app } from "@microsoft/teams-js";

export default function TeamsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function initTeams() {
      try {
        await app.initialize();
        app.notifyAppLoaded();
        app.notifySuccess();
      } catch {
        // Silently continue if rendered in standard web browser
      }
    }
    initTeams();
  }, []);

  return <>{children}</>;
}
