"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  theme: "light";
  size: "flexible";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
};

export function TurnstileWidget({ siteKey, onToken }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    const turnstile = window.turnstile;
    if (!scriptReady || !container.current || !turnstile) return;

    const widgetId = turnstile.render(container.current, {
      sitekey: siteKey,
      theme: "light",
      size: "flexible",
      callback: (token) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
    return () => turnstile.remove(widgetId);
  }, [scriptReady, siteKey, onToken]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setScriptReady(true)}
      />
      <div ref={container} />
    </>
  );
}
