"use client";

import Link from "next/link";
import { useEffect, useState, type DragEvent } from "react";
import {
  LandingData,
  defaultLandingData,
  loadLandingData,
  saveLandingData,
} from "../lib/landing-data";

const validateLandingData = (value: unknown): value is LandingData => {
  if (!value || typeof value !== "object") return false;
  const cast = value as LandingData;
  return (
    typeof cast.hero?.highlight === "string" &&
    (cast.access === undefined ||
      (typeof cast.access?.mode === "string" &&
        typeof cast.access?.inviteCode === "string" &&
        typeof cast.access?.startDate === "string" &&
        typeof cast.access?.endDate === "string")) &&
    (cast.display === undefined || typeof cast.display?.showStockQuantity === "boolean") &&
    typeof cast.hero?.title === "string" &&
    typeof cast.hero?.subtitle === "string" &&
    typeof cast.hero?.ctaMain === "string" &&
    typeof cast.hero?.ctaSecondary === "string" &&
    typeof cast.section?.heading === "string" &&
    typeof cast.section?.description === "string" &&
    typeof cast.footer?.companyName === "string" &&
    typeof cast.footer?.businessNumber === "string" &&
    typeof cast.footer?.address === "string" &&
    typeof cast.footer?.customerCenter === "string" &&
    typeof cast.footer?.email === "string" &&
    typeof cast.footer?.hours === "string" &&
    typeof cast.footer?.copyright === "string" &&
    typeof cast.footer?.bankName === "string" &&
    typeof cast.footer?.accountNumber === "string" &&
    typeof cast.footer?.accountHolder === "string" &&
    typeof cast.footer?.depositDue === "string" &&
    Array.isArray(cast.products)
  );
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "알 수 없는 오류가 발생했습니다.";
};

const toDateTimeLocalValue = (value: string, edge: "start" | "end") => {
  if (!value) return "";
  if (value.includes("T")) return value.slice(0, 16);
  return `${value}T${edge === "start" ? "00:00" : "23:59"}`;
};

export default function AdminPage() {
  const [data, setData] = useState<LandingData>(defaultLandingData);
  const [lastSavedData, setLastSavedData] = useState<LandingData>(defaultLandingData);
  const [isLandingDataLoading, setIsLandingDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    banner: false,
    access: false,
    products: false,
    footer: false,
    backup: false,
  });
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedOptionProduct, setExpandedOptionProduct] = useState<string | null>(null);
  const hasUnsavedChanges = JSON.stringify(data) !== JSON.stringify(lastSavedData);

  useEffect(() => {
    loadLandingData()
      .then((loadedData) => {
        setData(loadedData);
        setLastSavedData(loadedData);
      })
      .catch(() => {
        setData(defaultLandingData);
        setLastSavedData(defaultLandingData);
      })
      .finally(() => setIsLandingDataLoading(false));
  }, []);

  const updateHeroField = (field: keyof LandingData["hero"], value: string) => {
    setData((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [field]: value,
      },
    }));
  };

  const updateAccessField = <T extends keyof LandingData["access"]>(
    field: T,
    value: LandingData["access"][T],
  ) => {
    setData((prev) => ({
      ...prev,
      access: {
        ...prev.access,
        [field]: value,
      },
    }));
  };

  const updateDisplayField = <T extends keyof LandingData["display"]>(
    field: T,
    value: LandingData["display"][T],
  ) => {
    setData((prev) => ({
      ...prev,
      display: {
        ...prev.display,
        [field]: value,
      },
    }));
  };

  const updateSectionField = (field: keyof LandingData["section"], value: string) => {
    setData((prev) => ({
      ...prev,
      section: {
        ...prev.section,
        [field]: value,
      },
    }));
  };

  const updateProductField = <T extends keyof LandingData["products"][number]>(
    index: number,
    field: T,
    value: LandingData["products"][number][T],
  ) => {
    setData((prev) => {
      const products = [...prev.products];
      products[index] = {
        ...products[index],
        [field]: value,
      };
      return { ...prev, products };
    });
  };

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("이미지 로드에 실패했습니다."));
        }
      };
      reader.onerror = () => reject(new Error("이미지 읽기 중 오류가 발생했습니다."));
      reader.readAsDataURL(file);
    });

  const compressImageFile = async (file: File, maxWidth = 1100, quality = 0.75) => {
    const dataUrl = await readFileAsDataURL(file);
    return new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scale = image.width > maxWidth ? maxWidth / image.width : 1;
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 초기화 실패"));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      image.onerror = () => reject(new Error("이미지 처리에 실패했습니다."));
      image.src = dataUrl;
    });
  };

  const toggleProductActive = (index: number) => {
    setData((prev) => {
      const products = [...prev.products];
      products[index] = {
        ...products[index],
        active: !products[index].active,
      };
      return { ...prev, products };
    });
  };

  const addProduct = () => {
    setData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: `product-${Date.now()}`,
          name: "새 상품",
          description: "상품 설명을 입력하세요.",
          initialPrice: "",
          price: "0원",
          image: "",
          tag: "럭셔리",
          stockQuantity: 10,
          maxOrderQuantity: 1,
          optionName: "",
          optionValues: [],
          paymentMode: "bank-transfer",
          orderGuide: "이 상품은 내부 무통장 주문으로 처리됩니다. 주문 정보 입력 후 입금 안내를 받으세요.",
          additionalImages: [],
          active: true,
        },
      ],
    }));
  };

  const cloneProduct = (index: number) => {
    setData((prev) => {
      const cloned = {
        ...prev.products[index],
        id: `clone-${Date.now()}`,
        additionalImages: [...prev.products[index].additionalImages],
        optionValues: [...(prev.products[index].optionValues || [])],
      };
      const products = [...prev.products];
      products.splice(index + 1, 0, cloned);
      return { ...prev, products };
    });
  };

  const handleImageFile = async (index: number, file: File) => {
    const compressed = await compressImageFile(file);
    updateProductField(index, "image", compressed);
  };

  const handleAdditionalImageFile = async (index: number, imageIndex: number, file: File) => {
    const compressed = await compressImageFile(file);
    setData((prev) => {
      const products = [...prev.products];
      const selectedProduct = { ...products[index] };
      const additionalImages = [...selectedProduct.additionalImages];
      additionalImages[imageIndex] = compressed;
      selectedProduct.additionalImages = additionalImages;
      products[index] = selectedProduct;
      return { ...prev, products };
    });
  };

  const handleAdditionalImageDrop = (index: number, imageIndex: number, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    handleAdditionalImageFile(index, imageIndex, file);
  };

  const removeAdditionalImage = (index: number, imageIndex: number) => {
    setData((prev) => {
      const products = [...prev.products];
      const selectedProduct = { ...products[index] };
      const additionalImages = [...selectedProduct.additionalImages];
      additionalImages[imageIndex] = "";
      selectedProduct.additionalImages = additionalImages;
      products[index] = selectedProduct;
      return { ...prev, products };
    });
  };

  const handleHeroImageFile = async (file: File) => {
    const compressed = await compressImageFile(file);
    updateHeroField("backgroundImage", compressed);
  };

  const handleHeroImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    handleHeroImageFile(file);
  };

  const handleImageDrop = (index: number, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    handleImageFile(index, file);
  };

  const toggleProductExpand = (productId: string) => {
    setExpandedProduct((prev) => (prev === productId ? null : productId));
  };

  const toggleProductOptionExpand = (productId: string) => {
    setExpandedOptionProduct((prev) => (prev === productId ? null : productId));
  };

  const updateProductOptionValue = (index: number, optionIndex: number, value: string) => {
    setData((prev) => {
      const products = [...prev.products];
      const product = { ...products[index] };
      const optionValues = [...(product.optionValues || [])];
      optionValues[optionIndex] = value.slice(0, 20);
      product.optionValues = optionValues;
      products[index] = product;
      return { ...prev, products };
    });
  };

  const addProductOptionValue = (index: number) => {
    setData((prev) => {
      const products = [...prev.products];
      const product = { ...products[index] };
      const optionValues = [...(product.optionValues || [])].slice(0, 10);
      if (optionValues.length >= 10) return prev;
      optionValues.push("");
      product.optionValues = optionValues;
      if (!product.optionName) product.optionName = "옵션";
      products[index] = product;
      return { ...prev, products };
    });
  };

  const removeProductOptionValue = (index: number, optionIndex: number) => {
    setData((prev) => {
      const products = [...prev.products];
      const product = { ...products[index] };
      product.optionValues = [...(product.optionValues || [])].filter((_, currentIndex) => currentIndex !== optionIndex);
      products[index] = product;
      return { ...prev, products };
    });
  };

  const removeProduct = (index: number) => {
    setData((prev) => ({
      ...prev,
      products: prev.products.filter((_, productIndex) => productIndex !== index),
    }));
  };

  const moveProduct = (from: number, to: number) => {
    setData((prev) => {
      const products = [...prev.products];
      const [moved] = products.splice(from, 1);
      products.splice(to, 0, moved);
      return { ...prev, products };
    });
  };

  const moveProductBy = (index: number, direction: 1 | -1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= data.products.length) return;
    moveProduct(index, nextIndex);
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const savedData = await saveLandingData(data, lastSavedData);
      setData(savedData);
      setLastSavedData(savedData);
      setSaveError(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error(error);
      setSaveError(`저장 중 오류가 발생했습니다: ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setData(defaultLandingData);
    try {
      const savedData = await saveLandingData(defaultLandingData, lastSavedData);
      setData(savedData);
      setLastSavedData(savedData);
      setSaveError(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error(error);
      setSaveError(`저장 중 오류가 발생했습니다: ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCopy = async () => {
    const json = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopyMessage("클립보드에 복사되었습니다.");
      window.setTimeout(() => setCopyMessage(null), 1800);
    } catch {
      setCopyMessage("복사에 실패했습니다. 아래 텍스트를 수동으로 복사하세요.");
      window.setTimeout(() => setCopyMessage(null), 1800);
    }
  };

  const handleExportDownload = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "landing-data.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!validateLandingData(parsed)) {
        setImportError("유효하지 않은 데이터 형식입니다.");
        return;
      }
      setData({
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
      });
      setImportError(null);
      setJsonInput("");
    } catch {
      setImportError("JSON 파싱에 실패했습니다.");
    }
  };

  const activeProductCount = data.products.filter((product) => product.active !== false).length;

  if (isLandingDataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="h-10 w-10 rounded-full border border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-4 text-white sm:px-10 sm:py-8">
      {(isSaving || saved || saveError) && (
        <div
          className={`fixed right-4 top-4 z-[100] max-w-sm rounded-3xl border px-5 py-4 text-sm font-semibold shadow-2xl shadow-black/40 backdrop-blur sm:right-8 sm:top-8 ${
            isSaving
              ? "border-sky-300/30 bg-sky-500/15 text-sky-100"
              : saved
                ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                : "border-rose-300/30 bg-rose-500/15 text-rose-100"
          }`}
        >
          {isSaving ? "저장 중입니다. 이미지 업로드가 끝날 때까지 기다려주세요." : saved ? "변경 내용이 저장되었습니다." : saveError}
        </div>
      )}
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30 sm:rounded-4xl sm:p-8">
          <div className="sticky top-2 z-50 mb-5 rounded-3xl bg-zinc-950/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:top-6 sm:mb-8 sm:rounded-4xl sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50 sm:text-sm sm:tracking-[0.28em]">관리자 페이지</p>
                <h1 className="mt-2 text-xl font-semibold leading-tight sm:mt-3 sm:text-3xl">
                  랜딩 페이지 컨텐츠 편집
                </h1>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row lg:gap-3">
                <Link
                  href="/dlqudrnrrhksflwk/orders"
                  className="col-span-2 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 lg:col-span-1 lg:px-5 lg:py-3 lg:text-sm"
                >
                  주문 관리 페이지로 이동
                </Link>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex min-w-0 cursor-pointer items-center justify-center rounded-full bg-white px-3 py-2.5 text-xs font-semibold text-zinc-950 transition hover:cursor-pointer hover:bg-zinc-100 disabled:cursor-wait disabled:bg-white/30 disabled:text-white/50 lg:min-w-30 lg:px-5 lg:py-3 lg:text-sm"
                >
                  {isSaving ? "저장 중..." : hasUnsavedChanges ? "변경사항 저장" : "저장하기"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 lg:px-5 lg:py-3 lg:text-sm"
                >
                  기본값 복원
                </button>
              </div>
            </div>

            {hasUnsavedChanges && !isSaving && (
              <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 sm:mt-5 sm:rounded-3xl sm:px-4 sm:py-3 sm:text-sm">
                저장하지 않은 변경사항이 있습니다.
              </div>
            )}
            {saved && (
              <div className="mt-3 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 sm:mt-5 sm:rounded-3xl sm:px-4 sm:py-3 sm:text-sm">
                변경 내용이 저장되었습니다.
              </div>
            )}
            {saveError && (
              <div className="mt-3 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 sm:mt-5 sm:rounded-3xl sm:px-4 sm:py-3 sm:text-sm">
                {saveError}
              </div>
            )}
          </div>

          <section className="space-y-4 sm:space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4 sm:rounded-4xl sm:p-6">
              <h2
                className="cursor-pointer text-lg font-semibold sm:text-xl"
                onClick={() => setSectionsOpen((prev) => ({ ...prev, banner: !prev.banner }))}
              >
                배너 / CTA 설정 {sectionsOpen.banner ? "▼" : "▶"}
              </h2>
              {!sectionsOpen.banner && (
                <p className="mt-2 text-sm leading-6 text-white/60">
                  첫 화면 배경 이미지, 상단 문구, 상품 섹션 제목과 설명을 수정합니다.
                </p>
              )}
              {sectionsOpen.banner && (
                <div className="mt-6 space-y-5">
                  <div className="space-y-2 text-sm text-white/80">
                    <span>배너 배경 이미지 업로드</span>
                    <p className="text-xs leading-5 text-white/50">
                      권장 사이즈: 1920×1080px, 16:9 비율. 중요한 상품/문구는 중앙 70% 안쪽에 배치하세요.
                    </p>
                    <div
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleHeroImageDrop}
                      className="group relative rounded-3xl border border-dashed border-white/20 bg-zinc-950/40 p-4 text-center transition hover:border-white/40"
                    >
                      {data.hero.backgroundImage ? (
                        <img
                          src={data.hero.backgroundImage}
                          alt="Hero background"
                          className="mx-auto mb-3 aspect-video h-auto w-full max-w-2xl rounded-3xl bg-zinc-950/70 object-contain"
                        />
                      ) : (
                        <div className="mx-auto mb-3 flex aspect-video h-auto w-full max-w-2xl items-center justify-center rounded-3xl bg-white/5 text-xs text-white/60">
                          이미지 파일을 드래그하거나 클릭하여 업로드
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleHeroImageFile(file);
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-white/80">
                      하이라이트 텍스트
                      <input
                        type="text"
                        value={data.hero.highlight}
                        onChange={(event) => updateHeroField("highlight", event.target.value)}
                        className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-white/80">
                      메인 문구
                      <input
                        type="text"
                        value={data.hero.title}
                        onChange={(event) => updateHeroField("title", event.target.value)}
                        className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                      />
                    </label>
                  </div>

                  <label className="space-y-2 text-sm text-white/80">
                    서브 타이틀
                    <textarea
                      rows={3}
                      value={data.hero.subtitle}
                      onChange={(event) => updateHeroField("subtitle", event.target.value)}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>

                  <hr className="my-6 border-white/10" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">중간 텍스트 영역</h3>
                    <label className="space-y-2 text-sm text-white/80">
                      제목
                      <input
                        type="text"
                        value={data.section.heading}
                        onChange={(event) => updateSectionField("heading", event.target.value)}
                        className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-white/80">
                      설명
                      <textarea
                        rows={3}
                        value={data.section.description}
                        onChange={(event) => updateSectionField("description", event.target.value)}
                        className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4 sm:rounded-4xl sm:p-6">
              <h2
                className="cursor-pointer text-lg font-semibold sm:text-xl"
                onClick={() => setSectionsOpen((prev) => ({ ...prev, access: !prev.access }))}
              >
                접근 설정 {sectionsOpen.access ? "▼" : "▶"}
              </h2>
              {!sectionsOpen.access && (
                <p className="mt-2 text-sm leading-6 text-white/60">
                  현재 {data.access.mode === "open" ? "오픈형" : "폐쇄형"}입니다. 초대코드, 이용 기간, 재고 표시 여부를 관리합니다.
                </p>
              )}
              {sectionsOpen.access && (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateAccessField("mode", "open")}
                      className={`rounded-3xl px-5 py-4 text-sm font-semibold transition ${
                        data.access.mode === "open"
                          ? "border border-emerald-300/30 bg-emerald-500/20 text-emerald-100"
                          : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      오픈형
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAccessField("mode", "closed")}
                      className={`rounded-3xl px-5 py-4 text-sm font-semibold transition ${
                        data.access.mode === "closed"
                          ? "border border-blue-300/30 bg-blue-500/20 text-blue-100"
                          : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      폐쇄형
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="space-y-2 text-sm text-white/80">
                      초대코드
                      <input
                        type="text"
                        value={data.access.inviteCode}
                        onChange={(event) => updateAccessField("inviteCode", event.target.value)}
                        className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                        placeholder="예: PRIVATE2026"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-white/80">
                      시작일 / 시간
                      <input
                        type="datetime-local"
                        value={toDateTimeLocalValue(data.access.startDate, "start")}
                        onChange={(event) => updateAccessField("startDate", event.target.value)}
                        className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-white/80">
                      종료일 / 시간
                      <input
                        type="datetime-local"
                        value={toDateTimeLocalValue(data.access.endDate, "end")}
                        onChange={(event) => updateAccessField("endDate", event.target.value)}
                        className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                      />
                    </label>
                  </div>

                  <p className="text-sm leading-6 text-white/60">
                    폐쇄형으로 설정하면 설정한 기간 안에 초대코드를 입력한 사용자만 랜딩페이지를 이용할 수 있습니다.
                  </p>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">상품 재고 수량 표시</p>
                        <p className="mt-1 text-sm text-white/60">랜딩 페이지 상품 카드와 상세 화면에 남은 수량을 표시합니다.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateDisplayField("showStockQuantity", true)}
                          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                            data.display.showStockQuantity
                              ? "bg-white text-zinc-950"
                              : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                          }`}
                        >
                          ON
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDisplayField("showStockQuantity", false)}
                          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                            !data.display.showStockQuantity
                              ? "bg-white text-zinc-950"
                              : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                          }`}
                        >
                          OFF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4 sm:rounded-4xl sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <h2
                    className="cursor-pointer text-lg font-semibold sm:text-xl"
                    onClick={() => setSectionsOpen((prev) => ({ ...prev, products: !prev.products }))}
                  >
                    상품 목록 {sectionsOpen.products ? "▼" : "▶"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-white/60 sm:mt-0">
                    {sectionsOpen.products
                      ? "버튼으로 순서를 변경하고, 복제/삭제가 가능합니다."
                      : `총 ${data.products.length}개 상품, 활성 ${activeProductCount}개입니다. 상품 이미지, 가격, 재고, 최대 주문수량을 관리합니다.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={addProduct}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    상품 추가
                  </button>
                </div>
              </div>

              {sectionsOpen.products && (
                <div className="space-y-3">
                  {data.products.map((product, index) => {
                    const isExpanded = expandedProduct === product.id;
                    const isSoldOut = Math.max(0, Number(product.stockQuantity) || 0) <= 0;
                    return (
                      <div key={product.id} className={`overflow-hidden rounded-3xl border bg-white/5 transition ${isSoldOut ? "border-rose-300/20" : "border-white/10"}`}>
                        <div
                          className="flex flex-col gap-3 p-3 transition hover:bg-white/10 sm:p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="flex w-full min-w-0 flex-1 cursor-pointer items-center gap-3 lg:w-auto" onClick={() => toggleProductExpand(product.id)}>
                            {product.image && (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-12 w-12 shrink-0 rounded-2xl object-cover sm:h-16 sm:w-16"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold text-white sm:text-base">{product.name}</h3>
                                {isSoldOut && (
                                  <span className="rounded-full border border-rose-300/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
                                    품절
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/60">{product.tag}</span>
                                {product.initialPrice && (
                                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/45 line-through decoration-white/35">
                                    {product.initialPrice}
                                  </span>
                                )}
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80">{product.price}</span>
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/60">
                                  {isSoldOut ? "품절" : `${Math.max(0, Number(product.stockQuantity) || 0)}개 남음`}
                                </span>
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/60">
                                  최대 {Math.max(1, Number(product.maxOrderQuantity) || 1)}개
                                </span>
                              </div>
                              <p className="mt-1 hidden text-xs text-white/50 lg:block">
                                {product.tag} · {product.initialPrice ? `${product.initialPrice} → ` : ""}{product.price} · {isSoldOut ? "품절" : `${Math.max(0, Number(product.stockQuantity) || 0)}개 남음`} · 최대 {Math.max(1, Number(product.maxOrderQuantity) || 1)}개
                              </p>
                            </div>
                          </div>

                          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 border-t border-white/10 pt-3 lg:w-auto lg:justify-end lg:border-t-0 lg:pt-0">
                            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/60">
                              {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveProductBy(index, -1);
                              }}
                              disabled={index === 0}
                              className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 text-xs text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 lg:h-auto lg:min-w-0 lg:py-1"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveProductBy(index, 1);
                              }}
                              disabled={index === data.products.length - 1}
                              className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 text-xs text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 lg:h-auto lg:min-w-0 lg:py-1"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cloneProduct(index);
                              }}
                              className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white transition hover:bg-white/10"
                            >
                              복제
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProductActive(index);
                              }}
                              className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                                product.active ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/60"
                              }`}
                            >
                              {product.active ? "활성" : "비활성"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeProduct(index);
                              }}
                              className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                            >
                              삭제
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleProductExpand(product.id)}
                              className="ml-auto lg:ml-1"
                            >
                              <span className={`text-base transition lg:text-2xl ${expandedProduct === product.id ? "rotate-180" : ""}`}>▼</span>
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="space-y-4 border-t border-white/10 bg-zinc-950/50 p-3 sm:p-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                                <label className="space-y-1 text-sm text-white/80">
                                  <span className="text-xs">태그</span>
                                  <input
                                    type="text"
                                    value={product.tag}
                                    onChange={(event) => updateProductField(index, "tag", event.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                </label>
                                <label className="col-span-2 space-y-1 text-sm text-white/80 sm:col-span-1">
                                  <span className="text-xs">상품명</span>
                                  <input
                                    type="text"
                                    value={product.name}
                                    onChange={(event) => updateProductField(index, "name", event.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                </label>
                                <label className="space-y-1 text-sm text-white/80">
                                  <span className="text-xs">최초판매가</span>
                                  <input
                                    type="text"
                                    value={product.initialPrice || ""}
                                    onChange={(event) => updateProductField(index, "initialPrice", event.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                    placeholder="예: 289,000원"
                                  />
                                </label>
                                <label className="space-y-1 text-sm text-white/80">
                                  <span className="text-xs">가격</span>
                                  <input
                                    type="text"
                                    value={product.price}
                                    onChange={(event) => updateProductField(index, "price", event.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                </label>
                                <label className="space-y-1 text-sm text-white/80">
                                  <span className="text-xs">재고수량</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={Math.max(0, Number(product.stockQuantity) || 0)}
                                    onChange={(event) =>
                                      updateProductField(index, "stockQuantity", Math.max(0, Number(event.target.value) || 0))
                                    }
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                </label>
                                <label className="space-y-1 text-sm text-white/80">
                                  <span className="text-xs">최대주문수량</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={Math.max(1, Number(product.maxOrderQuantity) || 1)}
                                    onChange={(event) =>
                                      updateProductField(index, "maxOrderQuantity", Math.max(1, Number(event.target.value) || 1))
                                    }
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                </label>
                              </div>

                              <label className="space-y-1 text-sm text-white/80">
                                <span className="text-xs">상품 설명</span>
                                <textarea
                                  rows={2}
                                  value={product.description}
                                  onChange={(event) => updateProductField(index, "description", event.target.value)}
                                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-white/80">
                                <span className="text-xs">주문 안내 멘트</span>
                                <textarea
                                  rows={2}
                                  value={product.orderGuide || ""}
                                  onChange={(event) => updateProductField(index, "orderGuide", event.target.value)}
                                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                  placeholder="상세 팝업에서 가격 아래에 노출될 주문 안내 문구"
                                />
                              </label>

                              <div className="rounded-2xl border border-white/10 bg-zinc-950/50">
                                <button
                                  type="button"
                                  onClick={() => toggleProductOptionExpand(product.id)}
                                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-white">주문 옵션</p>
                                    <p className="mt-1 text-xs text-white/50">
                                      {(product.optionValues || []).filter(Boolean).length > 0
                                        ? `${product.optionName || "옵션"} · ${(product.optionValues || []).filter(Boolean).length}개`
                                        : "색상, 사이즈처럼 고객이 선택할 옵션을 최대 10개까지 설정합니다."}
                                    </p>
                                  </div>
                                  <span className="text-xl text-white">
                                    {expandedOptionProduct === product.id ? "▲" : "▼"}
                                  </span>
                                </button>

                                {expandedOptionProduct === product.id && (
                                  <div className="space-y-3 border-t border-white/10 p-4">
                                    <label className="space-y-1 text-sm text-white/80">
                                      <span className="text-xs">옵션명</span>
                                      <input
                                        type="text"
                                        maxLength={20}
                                        value={product.optionName || ""}
                                        onChange={(event) => updateProductField(index, "optionName", event.target.value.slice(0, 20))}
                                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                        placeholder="예: 색상, 사이즈"
                                      />
                                    </label>

                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-white/80">옵션값</span>
                                        <button
                                          type="button"
                                          onClick={() => addProductOptionValue(index)}
                                          disabled={(product.optionValues || []).length >= 10}
                                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          옵션 추가
                                        </button>
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {(product.optionValues || []).map((option, optionIndex) => (
                                          <div key={optionIndex} className="flex gap-2">
                                            <input
                                              type="text"
                                              maxLength={20}
                                              value={option}
                                              onChange={(event) => updateProductOptionValue(index, optionIndex, event.target.value)}
                                              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                              placeholder={`옵션 ${optionIndex + 1}`}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeProductOptionValue(index, optionIndex)}
                                              className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                                            >
                                              삭제
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                      {(product.optionValues || []).length === 0 && (
                                        <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-white/50">
                                          옵션을 사용하지 않으면 고객 주문 화면에 옵션 선택 영역이 표시되지 않습니다.
                                        </p>
                                      )}
                                      <p className="text-xs text-white/45">옵션값은 20자까지, 최대 10개까지 입력할 수 있습니다.</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <span className="text-xs font-semibold text-white/80">상품 이미지</span>
                                  <label
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => handleImageDrop(index, event)}
                                    className="block rounded-2xl border border-dashed border-white/20 bg-zinc-950/40 p-2 text-center cursor-pointer transition hover:border-white/40 h-20"
                                  >
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="mx-auto h-full w-full rounded-2xl object-cover" />
                                    ) : (
                                      <div className="flex h-full items-center justify-center text-xs text-white/50">클릭하여 업로드</div>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) handleImageFile(index, file);
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>

                                <div className="space-y-2">
                                  <span className="text-xs font-semibold text-white/80">결제 방식</span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => updateProductField(index, "paymentMode", "bank-transfer")}
                                      className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                                        product.paymentMode === "bank-transfer"
                                          ? "bg-blue-500/20 text-blue-200 border border-blue-300/30"
                                          : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                                      }`}
                                    >
                                      무통장
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateProductField(index, "paymentMode", "external")}
                                      className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                                        product.paymentMode === "external"
                                          ? "bg-blue-500/20 text-blue-200 border border-blue-300/30"
                                          : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                                      }`}
                                    >
                                      링크
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {product.paymentMode === "external" && (
                                <label className="space-y-1 text-sm text-white/80">
                                  <span className="text-xs">결제 링크</span>
                                  <input
                                    type="text"
                                    value={product.paymentLink || ""}
                                    onChange={(event) => updateProductField(index, "paymentLink", event.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                    placeholder="https://example.com"
                                  />
                                </label>
                              )}

                              {product.paymentMode === "bank-transfer" && (
                                <div className="space-y-2">
                                  <span className="text-xs font-semibold text-white/80">추가 이미지 (최대 5장)</span>
                                  <div className="grid gap-2 grid-cols-5">
                                    {[0, 1, 2, 3, 4].map((imageIndex) => {
                                      const preview = product.additionalImages[imageIndex] || "";
                                      return (
                                        <div key={imageIndex} className="relative">
                                          <label
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={(event) => handleAdditionalImageDrop(index, imageIndex, event)}
                                            className="block rounded-2xl border border-dashed border-white/20 bg-zinc-950/40 overflow-hidden cursor-pointer transition hover:border-white/40"
                                          >
                                            {preview ? (
                                              <img src={preview} alt={`추가 ${imageIndex + 1}`} className="h-20 w-full object-cover" />
                                            ) : (
                                              <div className="flex h-20 items-center justify-center text-[10px] text-white/50">+</div>
                                            )}
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                if (file) handleAdditionalImageFile(index, imageIndex, file);
                                              }}
                                              className="hidden"
                                            />
                                          </label>
                                          {preview && (
                                            <button
                                              type="button"
                                              onClick={() => removeAdditionalImage(index, imageIndex)}
                                              className="absolute -top-2 -right-2 rounded-full bg-rose-500/80 w-5 h-5 text-xs text-white flex items-center justify-center"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4 sm:rounded-4xl sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h2
                  className="cursor-pointer text-lg font-semibold sm:text-xl"
                  onClick={() => setSectionsOpen((prev) => ({ ...prev, footer: !prev.footer }))}
                >
                  푸터 정보 {sectionsOpen.footer ? "▼" : "▶"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  {sectionsOpen.footer
                    ? "하단 사업자 정보와 고객센터 정보를 입력하세요."
                    : "랜딩페이지 하단에 노출되는 회사 정보, 고객센터, 무통장 입금 계좌를 관리합니다."}
                </p>
              </div>
              {sectionsOpen.footer && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-white/80">
                    회사명
                    <input
                      type="text"
                      value={data.footer.companyName}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            companyName: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    사업자등록번호
                    <input
                      type="text"
                      value={data.footer.businessNumber}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            businessNumber: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    주소
                    <input
                      type="text"
                      value={data.footer.address}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            address: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    고객센터 전화
                    <input
                      type="text"
                      value={data.footer.customerCenter}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            customerCenter: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    은행명
                    <input
                      type="text"
                      value={data.footer.bankName}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            bankName: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    계좌번호
                    <input
                      type="text"
                      value={data.footer.accountNumber}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            accountNumber: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    예금주
                    <input
                      type="text"
                      value={data.footer.accountHolder}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            accountHolder: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    입금 기한
                    <input
                      type="text"
                      value={data.footer.depositDue}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            depositDue: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    이메일
                    <input
                      type="email"
                      value={data.footer.email}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            email: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80">
                    운영시간
                    <input
                      type="text"
                      value={data.footer.hours}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            hours: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/80 sm:col-span-2">
                    저작권 문구
                    <textarea
                      rows={3}
                      value={data.footer.copyright}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            copyright: event.target.value,
                          },
                        }))}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4 sm:rounded-4xl sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6 sm:gap-4">
                <h2
                  className="cursor-pointer text-lg font-semibold sm:text-xl"
                  onClick={() => setSectionsOpen((prev) => ({ ...prev, backup: !prev.backup }))}
                >
                  데이터 백업 / 복원 {sectionsOpen.backup ? "▼" : "▶"}
                </h2>
                {!sectionsOpen.backup && (
                  <p className="w-full text-sm leading-6 text-white/60 sm:w-auto">
                    현재 설정을 JSON으로 보관하거나, 백업한 JSON을 다시 가져옵니다.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleExportCopy}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    JSON 복사
                  </button>
                  <button
                    type="button"
                    onClick={handleExportDownload}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    JSON 다운로드
                  </button>
                </div>
              </div>
              {sectionsOpen.backup && (
                <>
                  {copyMessage && (
                    <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                      {copyMessage}
                    </div>
                  )}
                  <label className="space-y-2 text-sm text-white/80">
                    JSON 가져오기
                    <textarea
                      rows={6}
                      value={jsonInput}
                      onChange={(event) => setJsonInput(event.target.value)}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    />
                  </label>
                  {importError && <p className="text-sm text-rose-300">{importError}</p>}
                  <button
                    type="button"
                    onClick={handleImport}
                    className="mt-4 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10"
                  >
                    JSON 적용
                  </button>
                </>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4 sm:rounded-4xl sm:p-6">
              <h2 className="text-lg font-semibold sm:text-xl">관리 요약</h2>
              <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-3 sm:gap-4">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3 text-sm text-white/80 sm:block sm:rounded-3xl sm:p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 sm:text-xs sm:tracking-[0.25em]">상품 총 개수</p>
                  <p className="text-xl font-semibold text-white sm:mt-3 sm:text-2xl">{data.products.length}</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3 text-sm text-white/80 sm:block sm:rounded-3xl sm:p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 sm:text-xs sm:tracking-[0.25em]">활성 상품</p>
                  <p className="text-xl font-semibold text-white sm:mt-3 sm:text-2xl">{activeProductCount}</p>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-3 text-sm text-white/80 sm:block sm:rounded-3xl sm:p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 sm:text-xs sm:tracking-[0.25em]">저장된 데이터 크기</p>
                  <p className="shrink-0 text-xl font-semibold text-white sm:mt-3 sm:text-2xl">{JSON.stringify(data).length} bytes</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
