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
    typeof cast.hero?.title === "string" &&
    typeof cast.hero?.subtitle === "string" &&
    typeof cast.hero?.ctaMain === "string" &&
    typeof cast.hero?.ctaSecondary === "string" &&
    typeof (cast as any).section?.heading === "string" &&
    typeof (cast as any).section?.description === "string" &&
    typeof (cast as any).footer?.companyName === "string" &&
    typeof (cast as any).footer?.businessNumber === "string" &&
    typeof (cast as any).footer?.address === "string" &&
    typeof (cast as any).footer?.customerCenter === "string" &&
    typeof (cast as any).footer?.email === "string" &&
    typeof (cast as any).footer?.hours === "string" &&
    typeof (cast as any).footer?.copyright === "string" &&
    typeof (cast as any).footer?.bankName === "string" &&
    typeof (cast as any).footer?.accountNumber === "string" &&
    typeof (cast as any).footer?.accountHolder === "string" &&
    typeof (cast as any).footer?.depositDue === "string" &&
    Array.isArray(cast.products)
  );
};

export default function AdminPage() {
  const [data, setData] = useState<LandingData>(defaultLandingData);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    banner: true,
    products: true,
    footer: true,
    backup: true,
  });
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => {
    loadLandingData().then(setData).catch(() => setData(defaultLandingData));
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
          price: "0원",
          image: "",
          tag: "럭셔리",
          paymentMode: "bank-transfer",
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

  const handleAdditionalImageDrop = (index: number, imageIndex: number, event: DragEvent<HTMLDivElement>) => {
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

  const handleImageDrop = (index: number, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    handleImageFile(index, file);
  };

  const toggleProductExpand = (productId: string) => {
    setExpandedProduct((prev) => (prev === productId ? null : productId));
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
    try {
      await saveLandingData(data);
      setSaveError(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error(error);
      setSaveError("저장 중 오류가 발생했습니다. 이미지 크기를 줄이고 다시 시도하세요.");
    }
  };

  const handleReset = async () => {
    setData(defaultLandingData);
    try {
      await saveLandingData(defaultLandingData);
      setSaveError(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error(error);
      setSaveError("저장 중 오류가 발생했습니다. 이미지 크기를 줄이고 다시 시도하세요.");
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
      setData(parsed);
      setImportError(null);
      setJsonInput("");
    } catch {
      setImportError("JSON 파싱에 실패했습니다.");
    }
  };

  const applyTemplate = () => {
    setData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: `template-${Date.now()}`,
          name: "템플릿 상품",
          description: "빠르게 추가할 수 있는 기본 템플릿 상품입니다.",
          price: "199,000원",
          image: "",
          tag: "럭셔리",
          paymentMode: "bank-transfer",
          additionalImages: [],
          active: true,
        },
      ],
    }));
  };

  const activeProductCount = data.products.filter((product) => product.active !== false).length;

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-8 sticky top-6 z-50 rounded-4xl bg-zinc-950/95 p-5 backdrop-blur-xl shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-white/50">관리자 페이지</p>
                <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
                  랜딩 페이지 컨텐츠 편집
                </h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/admin/orders"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  주문 관리 페이지로 이동
                </Link>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 hover:cursor-pointer"
                >
                  저장하기
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  기본값 복원
                </button>
              </div>
            </div>

            {saved && (
              <div className="mt-5 rounded-3xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                변경 내용이 저장되었습니다.
              </div>
            )}
            {saveError && (
              <div className="mt-5 rounded-3xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {saveError}
              </div>
            )}
          </div>

          <section className="space-y-6">
            <div className="rounded-4xl border border-white/10 bg-zinc-950/30 p-6">
              <h2
                className="text-xl font-semibold cursor-pointer"
                onClick={() => setSectionsOpen((prev) => ({ ...prev, banner: !prev.banner }))}
              >
                배너 / CTA 설정 {sectionsOpen.banner ? "▼" : "▶"}
              </h2>
              {sectionsOpen.banner && (
                <div className="mt-6 space-y-5">
                  <div className="space-y-2 text-sm text-white/80">
                    <span>배너 배경 이미지 업로드</span>
                    <div
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleHeroImageDrop}
                      className="group relative rounded-3xl border border-dashed border-white/20 bg-zinc-950/40 p-4 text-center transition hover:border-white/40"
                    >
                      {data.hero.backgroundImage ? (
                        <img
                          src={data.hero.backgroundImage}
                          alt="Hero background"
                          className="mx-auto mb-3 h-44 w-full max-w-2xl object-cover rounded-3xl"
                        />
                      ) : (
                        <div className="mx-auto mb-3 flex h-44 w-full max-w-2xl items-center justify-center rounded-3xl bg-white/5 text-xs text-white/60">
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

            <div className="rounded-4xl border border-white/10 bg-zinc-950/30 p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    className="text-xl font-semibold cursor-pointer"
                    onClick={() => setSectionsOpen((prev) => ({ ...prev, products: !prev.products }))}
                  >
                    상품 목록 {sectionsOpen.products ? "▼" : "▶"}
                  </h2>
                  <p className="text-sm text-white/60">버튼으로 순서를 변경하고, 복제/삭제가 가능합니다.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={addProduct}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    상품 추가
                  </button>
                  <button
                    type="button"
                    onClick={applyTemplate}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    템플릿 추가
                  </button>
                </div>
              </div>

              {sectionsOpen.products && (
                <div className="space-y-3">
                  {data.products.map((product, index) => {
                    const isExpanded = expandedProduct === product.id;
                    return (
                      <div key={product.id} className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden transition">
                        <div
                          className="p-4 flex items-center gap-3 justify-between hover:bg-white/10 transition"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => toggleProductExpand(product.id)}>
                            {product.image && (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-16 w-16 rounded-2xl object-cover shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-white truncate">{product.name}</h3>
                              <p className="text-xs text-white/50">{product.price}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
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
                              className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
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
                              className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
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
                              className="ml-1"
                            >
                              <span className={`text-2xl transition ${expandedProduct === product.id ? "rotate-180" : ""}`}>▼</span>
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-white/10 bg-zinc-950/50 p-4 space-y-4">
                            <div className="space-y-4">
                              <div className="grid gap-3 sm:grid-cols-3">
                                <label className="space-y-1 text-sm text-white/80">
                                  <span className="text-xs">상품명</span>
                                  <input
                                    type="text"
                                    value={product.name}
                                    onChange={(event) => updateProductField(index, "name", event.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
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
                                  <span className="text-xs">태그</span>
                                  <input
                                    type="text"
                                    value={product.tag}
                                    onChange={(event) => updateProductField(index, "tag", event.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                </label>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
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

                                <div className="space-y-2">
                                  <span className="text-xs font-semibold text-white/80">상품 이미지</span>
                                  <label className="block rounded-2xl border border-dashed border-white/20 bg-zinc-950/40 p-2 text-center cursor-pointer transition hover:border-white/40 h-20">
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
                                          <label className="block rounded-2xl border border-dashed border-white/20 bg-zinc-950/40 overflow-hidden cursor-pointer transition hover:border-white/40">
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

            <div className="rounded-4xl border border-white/10 bg-zinc-950/30 p-6">
              <div className="mb-6">
                <h2
                  className="text-xl font-semibold cursor-pointer"
                  onClick={() => setSectionsOpen((prev) => ({ ...prev, footer: !prev.footer }))}
                >
                  푸터 정보 {sectionsOpen.footer ? "▼" : "▶"}
                </h2>
                <p className="text-sm text-white/60">하단 사업자 정보와 고객센터 정보를 입력하세요.</p>
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

            <div className="rounded-4xl border border-white/10 bg-zinc-950/30 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2
                  className="text-xl font-semibold cursor-pointer"
                  onClick={() => setSectionsOpen((prev) => ({ ...prev, backup: !prev.backup }))}
                >
                  데이터 백업 / 복원 {sectionsOpen.backup ? "▼" : "▶"}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
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

            <div className="rounded-4xl border border-white/10 bg-zinc-950/30 p-6">
              <h2 className="text-xl font-semibold">관리 요약</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-white/5 p-4 text-sm text-white/80">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">상품 총 개수</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{data.products.length}</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-4 text-sm text-white/80">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">활성 상품</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{activeProductCount}</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-4 text-sm text-white/80">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">저장된 데이터 크기</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{JSON.stringify(data).length} bytes</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
