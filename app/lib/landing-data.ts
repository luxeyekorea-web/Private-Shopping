import { getImage, saveImage } from "./image-db";

export type ProductItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  tag: string;
  active?: boolean;
  paymentLink?: string;
  paymentMode: "external" | "bank-transfer";
  additionalImages: string[];
  imageKey?: string;
  additionalImageKeys?: (string | null)[];
};

export type LandingData = {
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

const STORAGE_KEY = "lux-eyewear-landing-data";

export const defaultLandingData: LandingData = {
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
      description: "골드 프레임과 다크 템플이 만드는 시그니처 매력.",
      price: "259,000원",
      image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      paymentMode: "bank-transfer",
        additionalImages: [],
      active: true,
    },
    {
      id: "noir-vision",
      name: "Noir Vision",
      description: "프리미엄 블랙 실루엣으로 완성한 모던 아이웨어.",
      price: "219,000원",
      image: "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      paymentMode: "bank-transfer",
        additionalImages: [],
      active: true,
    },
    {
      id: "selenium-pearl",
      name: "Selenia Pearl",
      description: "부드러운 곡선과 펄 컬러가 돋보이는 럭셔리 디자인.",
      price: "289,000원",
      image: "https://images.unsplash.com/photo-1562158074-9b1470a2865d?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      paymentMode: "bank-transfer",
        additionalImages: [],
      active: true,
    },
    {
      id: "aurora-frame",
      name: "Aurora Frame",
      description: "미니멀한 실루엣과 은은한 광택의 시크 포인트.",
      price: "239,000원",
      image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      paymentMode: "bank-transfer",
        additionalImages: [],
      active: true,
    },
    {
      id: "velvet-edge",
      name: "Velvet Edge",
      description: "소프트 텍스처와 클래식한 형태가 어우러진 아이웨어.",
      price: "249,000원",
      image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
      paymentMode: "bank-transfer",
        additionalImages: [],
      active: true,
    },
    {
      id: "opal-shadow",
      name: "Opal Shadow",
      description: "빛에 따라 다채롭게 변하는 트랜스페어런트 라인.",
      price: "279,000원",
      image: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=800&q=80",
      tag: "럭셔리",
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

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return defaultLandingData;
    }

    const parsed = JSON.parse(saved) as LandingData;
    if (!parsed || !parsed.hero || !Array.isArray(parsed.products)) {
      return defaultLandingData;
    }

    const products = await Promise.all(
      parsed.products.map(async (product) => {
        const hydrated = await hydrateProductImages({
          ...product,
          active: product.active !== false,
          paymentLink: product.paymentLink || "",
          paymentMode: product.paymentMode || "bank-transfer",
          additionalImages: Array.isArray(product.additionalImages)
            ? product.additionalImages.map((item) => String(item))
            : [],
          imageKey: product.imageKey,
          additionalImageKeys: Array.isArray(product.additionalImageKeys)
            ? product.additionalImageKeys.map((item) => (item === null ? null : String(item)))
            : [],
          tag: product.tag || "럭셔리",
        });
        return hydrated;
      }),
    );

    return {
      ...parsed,
      products,
      footer: {
        ...defaultLandingData.footer,
        ...parsed.footer,
      },
      section: {
        ...defaultLandingData.section,
        ...parsed.section,
      },
    };
  } catch {
    return defaultLandingData;
  }
}

async function hydrateProductImages(product: ProductItem): Promise<ProductItem> {
  let image = product.image;
  if (!image && product.imageKey) {
    const stored = await getImage(product.imageKey);
    image = stored || "";
  }

  const additionalImages: string[] = [];
  const keys = Array.isArray(product.additionalImageKeys) ? product.additionalImageKeys : [];
  for (let index = 0; index < 5; index += 1) {
    const key = keys[index];
    if (key) {
      const stored = await getImage(key);
      additionalImages[index] = stored || "";
    } else {
      additionalImages[index] = String(product.additionalImages?.[index] || "");
    }
  }

  return {
    ...product,
    image,
    additionalImages,
    additionalImageKeys: keys,
  };
}

function isDataUrl(value: string) {
  return value.startsWith("data:");
}

function buildImageKey(productId: string, suffix: string) {
  return `product-image-${productId}-${suffix}`;
}

async function preparePersistableData(data: LandingData) {
  const clone = {
    ...data,
    products: await Promise.all(
      data.products.map(async (product) => {
        const item = {
          ...product,
          additionalImages: [...(product.additionalImages || [])],
          additionalImageKeys: product.additionalImageKeys ? [...product.additionalImageKeys] : [],
        };
        if (isDataUrl(item.image)) {
          const key = item.imageKey || buildImageKey(item.id, "main");
          await saveImage(key, item.image);
          item.imageKey = key;
          item.image = "";
        }

        const keys: (string | null)[] = item.additionalImageKeys
          ? [...item.additionalImageKeys]
          : [];
        item.additionalImages = [...(item.additionalImages || [])];

        for (let index = 0; index < 5; index += 1) {
          const imageValue = item.additionalImages[index] || "";
          if (isDataUrl(imageValue)) {
            const key = keys[index] || buildImageKey(item.id, `additional-${index}`);
            await saveImage(key, imageValue);
            keys[index] = key;
            item.additionalImages[index] = "";
          } else if (imageValue) {
            keys[index] = keys[index] || null;
          } else {
            keys[index] = keys[index] || null;
          }
        }

        item.additionalImageKeys = keys;
        return item;
      }),
    ),
  };
  return clone;
}

export async function saveLandingData(data: LandingData) {
  if (typeof window === "undefined") {
    return;
  }

  const persistable = await preparePersistableData(data);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
}
