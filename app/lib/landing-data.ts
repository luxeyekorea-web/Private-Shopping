import { isSupabaseReady, supabase } from "./supabase-client";

export type ProductItem = {
  id: string;
  name: string;
  description: string;
  initialPrice?: string;
  price: string;
  image: string;
  tag: string;
  active?: boolean;
  stockQuantity: number;
  maxOrderQuantity: number;
  optionName: string;
  optionValues: string[];
  paymentLink?: string;
  paymentMode: "external" | "bank-transfer";
  additionalImages: string[];
  imageKey?: string;
  additionalImageKeys?: (string | null)[];
};

export type LandingData = {
  access: {
    mode: "open" | "closed";
    inviteCode: string;
    startDate: string;
    endDate: string;
  };
  display: {
    showStockQuantity: boolean;
  };
  hero: {
    highlight: string;
    title: string;
    subtitle: string;
    ctaMain: string;
    ctaMainLink?: string;
    ctaSecondary: string;
    ctaSecondaryLink?: string;
    backgroundImage?: string;
  };
  section: {
    heading: string;
    description: string;
  };
  footer: {
    companyName: string;
    businessNumber: string;
    address: string;
    customerCenter: string;
    email: string;
    hours: string;
    copyright: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    depositDue: string;
  };
  products: ProductItem[];
};

const LANDING_TABLE = "landing_data";
const LANDING_ROW_ID = "default";
const LANDING_IMAGE_BUCKET = "landing-images";
const SUPABASE_LOAD_TIMEOUT_MS = 6000;

function withLoadTimeout<T>(promise: PromiseLike<T>, timeoutMessage: string): Promise<T> {
  if (typeof window === "undefined") {
    return Promise.resolve(promise);
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, SUPABASE_LOAD_TIMEOUT_MS);

    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function getSupabaseErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const parts = [
      "message" in error && typeof error.message === "string" ? error.message : null,
      "details" in error && typeof error.details === "string" ? error.details : null,
      "hint" in error && typeof error.hint === "string" ? error.hint : null,
      "code" in error && typeof error.code === "string" ? `code: ${error.code}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return "Unknown Supabase error";
}

function isDataUrl(value?: string) {
  return Boolean(value?.startsWith("data:"));
}

function createProductId(index: number) {
  return `product-${Date.now()}-${index}`;
}

function normalizeProductId(value: string, fallbackIndex: number) {
  const productId = value.trim();
  return productId || createProductId(fallbackIndex);
}

function normalizeProducts(products: ProductItem[]) {
  const usedIds = new Set<string>();

  return products.map((product, index) => {
    const baseId = normalizeProductId(product.id || "", index);
    const id = usedIds.has(baseId) ? `${baseId}-${index + 1}` : baseId;
    usedIds.add(id);

    return {
      ...product,
      id,
      initialPrice: typeof product.initialPrice === "string" ? product.initialPrice : "",
      additionalImages: Array.isArray(product.additionalImages) ? product.additionalImages : [],
      stockQuantity: Number.isFinite(Number(product.stockQuantity))
        ? Math.max(0, Number(product.stockQuantity))
        : 1,
      maxOrderQuantity: Number.isFinite(Number(product.maxOrderQuantity))
        ? Math.max(1, Number(product.maxOrderQuantity))
        : 1,
      optionName: typeof product.optionName === "string" ? product.optionName : "",
      optionValues: Array.isArray(product.optionValues)
        ? product.optionValues
            .filter((option) => typeof option === "string")
            .map((option) => option.trim().slice(0, 20))
            .filter(Boolean)
            .slice(0, 10)
        : [],
    };
  });
}

function getDataUrlContentType(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match?.[1] || "image/jpeg";
}

function getExtensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function uploadLandingImage(dataUrl: string, pathPrefix: string) {
  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const contentType = getDataUrlContentType(dataUrl);
  const extension = getExtensionFromContentType(contentType);
  const blob = await dataUrlToBlob(dataUrl);
  const objectPath = `${pathPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await supabase.storage
    .from(LANDING_IMAGE_BUCKET)
    .upload(objectPath, blob, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error("Supabase image upload failed:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  const { data } = supabase.storage.from(LANDING_IMAGE_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

function getLandingImageObjectPath(url?: string) {
  if (!url || !supabase) return null;

  try {
    const pathname = new URL(url).pathname;
    const marker = `/storage/v1/object/public/${LANDING_IMAGE_BUCKET}/`;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    return decodeURIComponent(pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function collectStoragePaths(data?: LandingData) {
  if (!data) return [];

  const paths = [
    getLandingImageObjectPath(data.hero.backgroundImage),
    ...data.products.flatMap((product) => [
      getLandingImageObjectPath(product.image),
      ...(product.additionalImages || []).map(getLandingImageObjectPath),
    ]),
  ];

  return paths.filter((path): path is string => Boolean(path));
}

async function deleteLandingImages(objectPaths: string[]) {
  if (!supabase || objectPaths.length === 0) return;

  const uniquePaths = Array.from(new Set(objectPaths));
  const { error } = await supabase.storage.from(LANDING_IMAGE_BUCKET).remove(uniquePaths);

  if (error) {
    console.error("Supabase image delete failed:", error);
  }
}

export const defaultLandingData: LandingData = {
  access: {
    mode: "open",
    inviteCode: "",
    startDate: "",
    endDate: "",
  },
  display: {
    showStockQuantity: true,
  },
  hero: {
    highlight: "럭셔리 아이웨어 기획전",
    title: "당신의 눈빛을 완성하는 프리미엄 아이웨어 컬렉션",
    subtitle:
      "세련된 디자인과 고급 소재가 만나는 아이웨어. 지금 바로 스타일을 경험하세요.",
    ctaMain: "지금 쇼핑하기",
    ctaMainLink: "#products",
    ctaSecondary: "컬렉션 보기",
    ctaSecondaryLink: "#details",
    backgroundImage:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1600&q=80",
  },
  section: {
    heading: "엄선된 6가지 프리미엄 아이웨어",
    description: "클래식한 디자인과 현대적인 감각을 모두 담은 룩. 럭셔리한 착용감을 위한 완벽한 선택입니다.",
  },
  footer: {
    companyName: "럭셔리 아이웨어 주식회사",
    businessNumber: "123-45-67890",
    address: "서울특별시 강남구 테헤란로 123, 10층",
    customerCenter: "02-1234-5678",
    email: "support@luxeyewear.com",
    hours: "월-금 10:00 - 18:00",
    copyright: "© 2026 럭셔리 아이웨어. All rights reserved.",
    bankName: "국민은행",
    accountNumber: "123-456-7890",
    accountHolder: "럭셔리 아이웨어",
    depositDue: "48시간 이내",
  },
  products: [
    {
      id: "astra-luxe",
      name: "Astra Luxe",
      initialPrice: "",
      description: "골드 프레임과 다크 템플이 만드는 시그니처 매력.",
      price: "259,000원",
      image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      stockQuantity: 10,
      maxOrderQuantity: 1,
      optionName: "",
      optionValues: [],
      paymentMode: "bank-transfer",
      additionalImages: [],
      active: true,
    },
    {
      id: "noir-vision",
      name: "Noir Vision",
      initialPrice: "",
      description: "프리미엄 블랙 실루엣으로 완성한 모던 아이웨어.",
      price: "219,000원",
      image: "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      stockQuantity: 10,
      maxOrderQuantity: 1,
      optionName: "",
      optionValues: [],
      paymentMode: "bank-transfer",
      additionalImages: [],
      active: true,
    },
    {
      id: "selenium-pearl",
      name: "Selenia Pearl",
      initialPrice: "",
      description: "부드러운 곡선과 펄 컬러가 돋보이는 럭셔리 디자인.",
      price: "289,000원",
      image: "https://images.unsplash.com/photo-1562158074-9b1470a2865d?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      stockQuantity: 10,
      maxOrderQuantity: 1,
      optionName: "",
      optionValues: [],
      paymentMode: "bank-transfer",
      additionalImages: [],
      active: true,
    },
    {
      id: "aurora-frame",
      name: "Aurora Frame",
      initialPrice: "",
      description: "미니멀한 실루엣과 은은한 광택의 시크 포인트.",
      price: "239,000원",
      image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      stockQuantity: 10,
      maxOrderQuantity: 1,
      optionName: "",
      optionValues: [],
      paymentMode: "bank-transfer",
      additionalImages: [],
      active: true,
    },
    {
      id: "velvet-edge",
      name: "Velvet Edge",
      initialPrice: "",
      description: "소프트 텍스처와 클래식한 형태가 어우러진 아이웨어.",
      price: "249,000원",
      image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      stockQuantity: 10,
      maxOrderQuantity: 1,
      optionName: "",
      optionValues: [],
      paymentMode: "bank-transfer",
      additionalImages: [],
      active: true,
    },
    {
      id: "opal-shadow",
      name: "Opal Shadow",
      initialPrice: "",
      description: "빛에 따라 다채롭게 변하는 트랜스페어런트 라인.",
      price: "279,000원",
      image: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      stockQuantity: 10,
      maxOrderQuantity: 1,
      optionName: "",
      optionValues: [],
      paymentMode: "bank-transfer",
      additionalImages: [],
      active: true,
    },
  ],
};

export async function loadLandingData(): Promise<LandingData> {
  if (typeof window === "undefined") {
    return defaultLandingData;
  }

  if (!isSupabaseReady) {
    console.error("Supabase environment variables are not configured.");
    return defaultLandingData;
  }

  try {
    const { data, error } = await withLoadTimeout(
      supabase!
        .from(LANDING_TABLE)
        .select("payload")
        .eq("id", LANDING_ROW_ID)
        .single(),
      "Supabase landing load timed out.",
    );

    if (error || !data?.payload) {
      if (error) console.error("Supabase landing load failed:", error);
      return defaultLandingData;
    }

    const parsed = data.payload as LandingData;
    return {
      ...defaultLandingData,
      ...parsed,
      access: {
        ...defaultLandingData.access,
        ...parsed.access,
      },
      display: {
        ...defaultLandingData.display,
        ...parsed.display,
      },
      section: {
        ...defaultLandingData.section,
        ...parsed.section,
      },
      footer: {
        ...defaultLandingData.footer,
        ...parsed.footer,
      },
      products: Array.isArray(parsed.products)
        ? normalizeProducts(parsed.products)
        : defaultLandingData.products,
    };
  } catch (error) {
    console.error("Supabase landing load failed:", error);
    return defaultLandingData;
  }
}

async function preparePersistableData(data: LandingData, previousData?: LandingData) {
  const heroBackgroundImage = isDataUrl(data.hero.backgroundImage)
    ? await uploadLandingImage(data.hero.backgroundImage || "", "hero/background")
    : data.hero.backgroundImage;

  const normalizedProducts = normalizeProducts(data.products);

  const products = await Promise.all(
    normalizedProducts.map(async (product) => {
      const productPath = `products/${product.id}`;
      const image = isDataUrl(product.image)
        ? await uploadLandingImage(product.image, `${productPath}/main`)
        : product.image;

      const additionalImages = await Promise.all(
        (product.additionalImages || []).map((imageValue, imageIndex) =>
          isDataUrl(imageValue)
            ? uploadLandingImage(imageValue, `${productPath}/additional-${imageIndex + 1}`)
            : Promise.resolve(imageValue),
        ),
      );

      return {
        ...product,
        image,
        additionalImages,
      };
    }),
  );

  const persistable = {
    ...data,
    hero: {
      ...data.hero,
      backgroundImage: heroBackgroundImage,
    },
    products,
  };

  const currentPaths = new Set(collectStoragePaths(persistable));
  const pendingDeletePaths = collectStoragePaths(previousData).filter((path) => !currentPaths.has(path));

  return {
    persistable,
    pendingDeletePaths,
  };
}

export async function saveLandingData(data: LandingData, previousData?: LandingData) {
  if (typeof window === "undefined") {
    return data;
  }

  if (!isSupabaseReady) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const { persistable, pendingDeletePaths } = await preparePersistableData(data, previousData);
  const { error } = await supabase!
    .from(LANDING_TABLE)
    .upsert({ id: LANDING_ROW_ID, payload: persistable }, { onConflict: "id" });

  if (error) {
    console.error("Supabase landing save failed:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  await deleteLandingImages(pendingDeletePaths);
  return persistable;
}
