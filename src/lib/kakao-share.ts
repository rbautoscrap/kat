const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js";

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendDefault: (settings: Record<string, unknown>) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

function kakaoJsKey() {
  return process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim() ?? "";
}

export function isKakaoShareReady() {
  return Boolean(kakaoJsKey());
}

function loadKakaoSdk(): Promise<KakaoSdk> {
  if (window.Kakao) return Promise.resolve(window.Kakao);

  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-kakao-js-sdk]",
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener(
        "load",
        () => {
          if (window.Kakao) resolve(window.Kakao);
          else reject(new Error("kakao-sdk"));
        },
        { once: true },
      );
      existing.addEventListener("error", () => reject(new Error("kakao-sdk")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KAKAO_SDK_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.kakaoJsSdk = "1";
    script.onload = () => {
      if (window.Kakao) resolve(window.Kakao);
      else reject(new Error("kakao-sdk"));
    };
    script.onerror = () => reject(new Error("kakao-sdk"));
    document.head.appendChild(script);
  });
}

export async function shareToKakaoTalk(options: {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
}) {
  const key = kakaoJsKey();
  if (!key) throw new Error("kakao-key");

  const Kakao = await loadKakaoSdk();
  if (!Kakao.isInitialized()) Kakao.init(key);

  const imageUrl =
    options.imageUrl?.trim() ||
    `${window.location.origin}/brand/rbauto-logo.png`;

  Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: options.title,
      description: options.description || "KOREA AUTO TRADE",
      imageUrl,
      link: {
        mobileWebUrl: options.url,
        webUrl: options.url,
      },
    },
    buttons: [
      {
        title: "View listing",
        link: {
          mobileWebUrl: options.url,
          webUrl: options.url,
        },
      },
    ],
  });
}
