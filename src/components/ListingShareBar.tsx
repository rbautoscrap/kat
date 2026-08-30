"use client";

import { useEffect, useMemo, useState } from "react";
import { isKakaoShareReady, shareToKakaoTalk } from "@/lib/kakao-share";

type Props = {
  title: string;
  path: string;
  priceLabel?: string | null;
  imageUrl?: string | null;
};

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M9.102 23.691v-7.98H6.627v-3.667h2.475v-1.58c0-4.085 1.848-5.978 5.859-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-.99 0-1.303.37-1.303 1.5v2.47h3.23l-.428 3.667h-2.802v7.98z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[1.05rem] w-[1.05rem]" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06a1.5 1.5 0 1 0-.002-2.998 1.5 1.5 0 0 0 .002 2.997zm-11.814 0a1.5 1.5 0 1 0-.002-2.997 1.5 1.5 0 0 0 .002 2.997zm5.907 0a1.5 1.5 0 1 0-.002-2.997 1.5 1.5 0 0 0 .002 2.997z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.846-10.405a1.44 1.44 0 1 0 0-2.88 1.44 1.44 0 0 0 0 2.88z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
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
  const [copied, setCopied] = useState<"link" | "instagram" | "kakao" | null>(
    null,
  );
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
      if (isKakaoShareReady()) {
        await shareToKakaoTalk({
          url: share.url,
          title,
          description: priceLabel?.trim() || "KOREA AUTO TRADE listing",
          imageUrl,
        });
        return;
      }
      if (typeof navigator.share === "function") {
        await navigator.share({
          title,
          text: share.text,
          url: share.url,
        });
        return;
      }
      await navigator.clipboard.writeText(share.text);
      setCopied("kakao");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setKakaoError("Could not open KakaoTalk. Try again.");
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
          className="listing-share-btn is-kakao"
          title="Share on KakaoTalk"
          aria-label="Share on KakaoTalk"
          disabled={kakaoPending}
          onClick={() => void shareKakao()}
        >
          <KakaoIcon />
        </button>
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
            : copied === "kakao"
              ? "Copied. Open KakaoTalk and paste it."
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
