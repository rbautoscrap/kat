"use client";

import { useEffect, useMemo, useState } from "react";
import { shareToKakaoTalk } from "@/lib/kakao-share";

type Props = {
  title: string;
  path: string;
  priceLabel?: string | null;
  imageUrl?: string | null;
};

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M14.5 8.5V6.7c0-.7.5-1.2 1.2-1.2h1.3V3h-2.2C12.4 3 11 4.5 11 6.9v1.6H9v2.6h2V21h3.5v-9.9h2.3l.3-2.6h-2.6Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M17.47 14.3c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.45-.61-.46h-.52c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3s.98 2.67 1.12 2.85c.14.18 1.93 2.95 4.67 4.13.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
      <path d="M12.04 2C6.58 2 2.15 6.42 2.15 11.87c0 1.9.5 3.75 1.45 5.38L2 22l4.9-1.28a9.86 9.86 0 0 0 5.14 1.4h.01c5.46 0 9.89-4.42 9.89-9.87C21.94 6.42 17.5 2 12.04 2zm0 18.06h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.09.81.83-3.01-.2-.31a8.18 8.18 0 0 1-1.26-4.35c0-4.53 3.7-8.21 8.22-8.21 4.52 0 8.21 3.68 8.21 8.21 0 4.53-3.69 8.19-8.22 8.19z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M12 4.2c-4.7 0-8.5 3-8.5 6.7 0 2.4 1.6 4.5 4 5.7l-.9 3.3c-.1.3.3.6.6.4l3.9-2.6c.3 0 .6.1.9.1 4.7 0 8.5-3 8.5-6.7S16.7 4.2 12 4.2Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M8.2 3h7.6C18.4 3 21 5.6 21 8.2v7.6c0 2.6-2.6 5.2-5.2 5.2H8.2C5.6 21 3 18.4 3 15.8V8.2C3 5.6 5.6 3 8.2 3Zm0 1.7c-1.7 0-3.5 1.8-3.5 3.5v7.6c0 1.7 1.8 3.5 3.5 3.5h7.6c1.7 0 3.5-1.8 3.5-3.5V8.2c0-1.7-1.8-3.5-3.5-3.5H8.2ZM16.7 6.4a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7.6A4.4 4.4 0 1 1 7.6 12 4.4 4.4 0 0 1 12 7.6Zm0 1.7A2.7 2.7 0 1 0 14.7 12 2.7 2.7 0 0 0 12 9.3Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M20.6 4.3 3.7 10.8c-1.15.45-1.14 1.08-.2 1.36l4.34 1.35 10.05-6.34c.47-.29.91-.13.55.18l-8.13 7.34-.31 4.66c.45 0 .65-.2.9-.45l2.16-2.1 4.49 3.32c.83.46 1.42.22 1.63-.77l2.95-13.9c.3-1.2-.46-1.74-1.53-1.3Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
      <path d="M14.7 10.3 21.2 3h-1.5l-5.6 6.3L9.6 3H3.5l6.8 9.7L3.5 21h1.5l6-6.8 4.7 6.8h6.1l-7.1-10.7ZM11.8 13.3l-.7-1L5.6 4.2h2.4l4.5 6.3.7 1 5.9 8.3h-2.4l-4.9-6.5Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 13a5 5 0 0 0 7.1.1l1.8-1.8a5 5 0 0 0-7.1-7.1L10.3 5.7" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 0-7.1-.1L5.1 12.7a5 5 0 0 0 7.1 7.1l1.5-1.5" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M12 8.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm0 5.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm0 5.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />
    </svg>
  );
}

export function ListingShareBar({
  title,
  path,
  priceLabel,
  imageUrl,
}: Props) {
  const [copied, setCopied] = useState<"link" | "instagram" | null>(null);
  const [kakaoError, setKakaoError] = useState<string | null>(null);
  const [kakaoPending, setKakaoPending] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const share = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = origin ? `${origin}${path}` : path;
    const lines = [title.trim() || "KOREA AUTO TRADE listing"];
    if (priceLabel?.trim()) lines.push(priceLabel.trim());
    lines.push(url);
    const text = lines.join("\n");
    return { url, text };
  }, [path, priceLabel, title]);

  useEffect(() => {
    if (typeof navigator.share === "function") setCanNativeShare(true);
  }, []);

  async function copyLink(kind: "link" | "instagram") {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      window.prompt("Copy this listing link", share.url);
    }
  }

  async function shareKakao() {
    setKakaoError(null);
    setKakaoPending(true);
    try {
      await shareToKakaoTalk({
        url: share.url,
        title,
        description: priceLabel?.trim() || "KOREA AUTO TRADE listing",
        imageUrl,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setKakaoError(
        code === "kakao-key"
          ? "KakaoTalk share is not configured yet."
          : "Could not open KakaoTalk. Try again.",
      );
    } finally {
      setKakaoPending(false);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({
        title,
        text: share.text,
        url: share.url,
      });
    } catch {
      // User cancelled or share is unavailable.
    }
  }

  const encodedUrl = encodeURIComponent(share.url);
  const encodedText = encodeURIComponent(share.text);

  return (
    <div className="listing-share">
      <p className="listing-share-label">Share</p>
      <div className="listing-share-actions">
        <a
          className="listing-share-btn is-whatsapp"
          href={`https://wa.me/?text=${encodedText}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on WhatsApp"
          aria-label="Share on WhatsApp"
        >
          <WhatsAppIcon />
        </a>
        <button
          type="button"
          className="listing-share-btn is-kakao"
          title="Share on KakaoTalk"
          aria-label="Share on KakaoTalk"
          disabled={kakaoPending}
          onClick={() => void shareKakao()}
        >
          <KakaoIcon />
        </button>
        <a
          className="listing-share-btn is-facebook"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on Facebook"
          aria-label="Share on Facebook"
        >
          <FacebookIcon />
        </a>
        <button
          type="button"
          className="listing-share-btn is-instagram"
          title="Copy link for Instagram"
          aria-label="Copy link for Instagram"
          onClick={() => void copyLink("instagram")}
        >
          <InstagramIcon />
        </button>
        <a
          className="listing-share-btn is-telegram"
          href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on Telegram"
          aria-label="Share on Telegram"
        >
          <TelegramIcon />
        </a>
        <a
          className="listing-share-btn is-x"
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on X"
          aria-label="Share on X"
        >
          <XIcon />
        </a>
        <button
          type="button"
          className="listing-share-btn is-link"
          title="Copy listing link"
          aria-label="Copy listing link"
          onClick={() => void copyLink("link")}
        >
          <LinkIcon />
        </button>
        {canNativeShare ? (
          <button
            type="button"
            className="listing-share-btn is-more"
            title="More share options"
            aria-label="More share options"
            onClick={() => void nativeShare()}
          >
            <MoreIcon />
          </button>
        ) : null}
      </div>
      {copied ? (
        <p className="listing-share-copied" role="status">
          {copied === "instagram"
            ? "Link copied. Paste it in Instagram."
            : "Link copied."}
        </p>
      ) : null}
      {kakaoError ? (
        <p className="listing-share-error" role="alert">
          {kakaoError}
        </p>
      ) : null}
    </div>
  );
}
