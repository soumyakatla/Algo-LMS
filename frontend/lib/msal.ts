import { PublicClientApplication, Configuration, LogLevel } from "@azure/msal-browser";

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "67d0ee58-c22f-405f-b275-fd9ac185a281";
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "common";

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
      },
      logLevel: LogLevel.Error,
    },
  },
};

let msalInstance: PublicClientApplication | null = null;

export const getMsalInstance = async (): Promise<PublicClientApplication> => {
  if (!msalInstance && typeof window !== "undefined") {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    await msalInstance.handleRedirectPromise().catch(() => null);
  }
  return msalInstance as PublicClientApplication;
};

export const loginRequest = {
  scopes: ["User.Read", "openid", "profile", "email"],
  prompt: "select_account",
};
