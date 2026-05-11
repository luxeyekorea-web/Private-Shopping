"use client";

import { useEffect, useState } from "react";
import { LandingData, defaultLandingData, loadLandingData, saveLandingData } from "./lib/landing-data";
import { appendOrder, defaultBankInfo, loadOrders, type OrderItem } from "./lib/order-data";

const INVITE_ACCESS_STORAGE_KEY = "private-shopping-invite-access";
const INVITE_ACCESS_DURATION_MS = 3 * 60 * 60 * 1000;

const getOrderStatusClassName = (status: OrderItem["status"]) => {
  const statusStyles: Record<OrderItem["status"], string> = {
    입금대기: "border-amber-300/30 bg-amber-500/15 text-amber-100",
    결제완료: "border-emerald-300/30 bg-emerald-500/15 text-emerald-100",
    배송중: "border-sky-300/30 bg-sky-500/15 text-sky-100",
    구매완료: "border-violet-300/30 bg-violet-500/15 text-violet-100",
    취소: "border-rose-300/30 bg-rose-500/15 text-rose-100",
  };

  return statusStyles[status];
};

const readSavedInviteAccess = () => {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(INVITE_ACCESS_STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as {
      inviteCode?: string;
      grantedAt?: number;
      expiresAt?: number;
    };

    if (Number(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(INVITE_ACCESS_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(INVITE_ACCESS_STORAGE_KEY);
    return null;
  }
};

const parseAccessDateTime = (value: string, edge: "start" | "end") => {
  if (!value) return null;
  const normalizedValue = value.includes("T")
    ? value
    : `${value}T${edge === "start" ? "00:00" : "23:59"}`;
  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function Home() {
  const [data, setData] = useState<LandingData>(defaultLandingData);
  const [isLandingDataLoading, setIsLandingDataLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<LandingData["products"][number] | null>(null);
  const [modalStep, setModalStep] = useState<"detail" | "orderForm" | "confirmation">("detail");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [orderForm, setOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    selectedOption: "",
    quantity: 1,
    deliveryNote: "",
  });
  const [createdOrder, setCreatedOrder] = useState<OrderItem | null>(null);
  const [orderInquiryOpen, setOrderInquiryOpen] = useState(false);
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderQueryResults, setOrderQueryResults] = useState<OrderItem[] | null>(null);
  const [orderSearchError, setOrderSearchError] = useState<string | null>(null);
  const [orderSubmitError, setOrderSubmitError] = useState<string | null>(null);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [savedInviteAccess, setSavedInviteAccess] = useState(readSavedInviteAccess);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    loadLandingData()
      .then(setData)
      .catch(() => setData(defaultLandingData))
      .finally(() => setIsLandingDataLoading(false));
  }, []);

  const activeProducts = data.products.filter((product) => product.active !== false);
  const getStockQuantity = (product: LandingData["products"][number]) => Math.max(0, Number(product.stockQuantity) || 0);
  const getMaxOrderQuantity = (product: LandingData["products"][number]) =>
    Math.max(1, Number(product.maxOrderQuantity) || 1);
  const getAllowedOrderQuantity = (product: LandingData["products"][number]) =>
    Math.max(0, Math.min(getStockQuantity(product), getMaxOrderQuantity(product)));
  const getProductOptions = (product: LandingData["products"][number]) =>
    (product.optionValues || []).map((option) => option.trim()).filter(Boolean).slice(0, 10);
  const access = data.access || defaultLandingData.access;
  const display = data.display || defaultLandingData.display;

  const isWithinAccessPeriod = () => {
    if (access.mode === "open") return true;
    if (!access.startDate || !access.endDate) return false;

    const now = new Date();
    const startsAt = parseAccessDateTime(access.startDate, "start");
    const endsAt = parseAccessDateTime(access.endDate, "end");
    if (!startsAt || !endsAt) return false;

    return now >= startsAt && now <= endsAt;
  };

  const isAccessPeriodOpen = isWithinAccessPeriod();
  const isInviteRequired = access.mode === "closed";
  const hasSavedInviteAccess = savedInviteAccess?.inviteCode === access.inviteCode;
  const canViewLanding = !isInviteRequired || (isAccessPeriodOpen && (accessGranted || hasSavedInviteAccess));

  const handleInviteSubmit = () => {
    const inviteCode = inviteCodeInput.trim();

    if (!access.inviteCode.trim()) {
      setInviteError("초대코드가 설정되지 않았습니다. 관리자에게 문의해주세요.");
      return;
    }

    if (!inviteCode) {
      setInviteError("초대코드를 입력해주세요.");
      return;
    }

    if (inviteCode !== access.inviteCode.trim()) {
      setInviteError("초대코드가 올바르지 않습니다.");
      return;
    }

    try {
      window.localStorage.setItem(
        INVITE_ACCESS_STORAGE_KEY,
        JSON.stringify({
          inviteCode: access.inviteCode.trim(),
          grantedAt: Date.now(),
          expiresAt: Date.now() + INVITE_ACCESS_DURATION_MS,
        }),
      );
      setSavedInviteAccess(readSavedInviteAccess());
    } catch {
      // 브라우저 저장소가 막혀도 현재 화면에서는 입장 처리합니다.
    }

    setInviteError(null);
    setAccessGranted(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setModalStep("detail");
    setGalleryIndex(0);
    setOrderForm({
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      selectedOption: "",
      quantity: 1,
      deliveryNote: "",
    });
    setCreatedOrder(null);
    setOrderSubmitError(null);
  };

  const openOrderInquiry = () => {
    setOrderInquiryOpen(true);
    setOrderSearchInput("");
    setOrderQueryResults(null);
    setOrderSearchError(null);
  };

  const closeOrderInquiry = () => {
    setOrderInquiryOpen(false);
    setOrderSearchInput("");
    setOrderQueryResults(null);
    setOrderSearchError(null);
  };

  const searchOrders = async () => {
    const query = orderSearchInput.trim();
    if (!query) {
      setOrderSearchError("주문번호 또는 휴대폰 번호를 입력하세요.");
      setOrderQueryResults(null);
      return;
    }

    let orders: OrderItem[] = [];
    try {
      orders = await loadOrders();
    } catch {
      setOrderSearchError("주문 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setOrderQueryResults(null);
      return;
    }

    const matched = orders.filter((order) => order.id.includes(query) || order.customerPhone.includes(query));

    if (!matched.length) {
      setOrderSearchError("검색 결과가 없습니다. 주문번호 또는 휴대폰 번호를 다시 확인해주세요.");
      setOrderQueryResults([]);
      return;
    }

    setOrderSearchError(null);
    setOrderQueryResults(matched);
  };

  const openProductModal = (product: LandingData["products"][number]) => {
    if (getStockQuantity(product) <= 0) return;

    if (product.paymentMode === "external") {
      if (product.paymentLink) {
        window.open(product.paymentLink, "_blank", "noopener,noreferrer");
      }
      return;
    }

    setSelectedProduct(product);
    setModalStep("detail");
    setGalleryIndex(0);
    setCreatedOrder(null);
    setOrderSubmitError(null);
    setOrderForm((prev) => ({
      ...prev,
      selectedOption: "",
      quantity: 1,
    }));
  };

  const handleOrderFormChange = (field: keyof typeof orderForm, value: string | number) => {
    if (field === "quantity") {
      const allowedQuantity = selectedProduct ? getAllowedOrderQuantity(selectedProduct) : 1;
      const requestedQuantity = Math.max(1, Number(value) || 1);
      const nextQuantity = Math.min(requestedQuantity, allowedQuantity || 1);

      setOrderForm((prev) => ({
        ...prev,
        quantity: nextQuantity,
      }));

      if (requestedQuantity > allowedQuantity) {
        setOrderSubmitError(`최대 주문가능한 수량은 ${allowedQuantity}개 입니다.`);
      } else {
        setOrderSubmitError(null);
      }
      return;
    }

    setOrderForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateOrder = async () => {
    if (!selectedProduct || isOrderSubmitting) return;

    const currentOptions = getProductOptions(selectedProduct);
    if (!orderForm.customerName.trim() || !orderForm.customerPhone.trim() || !orderForm.customerAddress.trim()) {
      setOrderSubmitError("이름, 휴대폰, 주소를 모두 입력해주세요.");
      return;
    }
    if (currentOptions.length > 0 && !orderForm.selectedOption.trim()) {
      setOrderSubmitError(`${selectedProduct.optionName || "옵션"}을 선택해주세요.`);
      return;
    }

    setIsOrderSubmitting(true);
    setOrderSubmitError(null);

    const quantity = Math.max(1, Number(orderForm.quantity) || 1);
    let rollbackData: LandingData | null = null;

    try {
      const latestData = await loadLandingData();
      const latestProduct = latestData.products.find((product) => product.id === selectedProduct.id);
      if (!latestProduct || getStockQuantity(latestProduct) <= 0) {
        setOrderSubmitError("품절된 상품입니다.");
        return;
      }
      const allowedQuantity = getAllowedOrderQuantity(latestProduct);
      if (quantity > allowedQuantity) {
        setOrderForm((prev) => ({
          ...prev,
          quantity: allowedQuantity,
        }));
        setOrderSubmitError(`최대 주문가능한 수량은 ${allowedQuantity}개 입니다.`);
        return;
      }
      const latestOptions = getProductOptions(latestProduct);
      if (latestOptions.length > 0 && !latestOptions.includes(orderForm.selectedOption.trim())) {
        setOrderSubmitError(`${latestProduct.optionName || "옵션"}을 다시 선택해주세요.`);
        return;
      }

      const orderId = `ORDER-${Date.now()}`;
      const totalPrice = latestProduct.price.replace(/[^0-9]/g, "") || "0";
      const totalAmount = `${Number(totalPrice) * quantity}원`;
      const bankInfo = {
        bankName: latestData.footer.bankName || defaultBankInfo.bankName,
        accountNumber: latestData.footer.accountNumber || defaultBankInfo.accountNumber,
        accountHolder: latestData.footer.accountHolder || defaultBankInfo.accountHolder,
        depositDue: latestData.footer.depositDue || defaultBankInfo.depositDue,
      };
      const order: OrderItem = {
        id: orderId,
        productId: latestProduct.id,
        productName: latestProduct.name,
        productPrice: latestProduct.price,
        selectedOption: latestOptions.length > 0
          ? {
              name: latestProduct.optionName || "옵션",
              value: orderForm.selectedOption.trim(),
            }
          : undefined,
        quantity,
        totalPrice: totalAmount,
        customerName: orderForm.customerName.trim(),
        customerPhone: orderForm.customerPhone.trim(),
        customerAddress: orderForm.customerAddress.trim(),
        deliveryNote: orderForm.deliveryNote.trim(),
        status: "입금대기",
        createdAt: new Date().toISOString(),
        shippingInfo: {
          carrier: "",
          trackingNumber: "",
        },
        bankInfo: {
          ...bankInfo,
        },
      };
      const updatedData = {
        ...latestData,
        products: latestData.products.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                stockQuantity: Math.max(0, getStockQuantity(product) - quantity),
              }
            : product,
        ),
      };

      rollbackData = latestData;
      await saveLandingData(updatedData);
      try {
        await appendOrder(order);
      } catch (error) {
        await saveLandingData(rollbackData);
        throw error;
      }
      setData(updatedData);
      setSelectedProduct(updatedData.products.find((product) => product.id === selectedProduct.id) || selectedProduct);
      setOrderSubmitError(null);
      setCreatedOrder(order);
      setModalStep("confirmation");
    } catch (error) {
      console.error(error);
      setOrderSubmitError("주문 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsOrderSubmitting(false);
    }
  };

  if (isLandingDataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="h-10 w-10 rounded-full border border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  const footer = (
    <footer className="border-t border-white/10 bg-zinc-950/90 py-12 px-6 text-white/70 sm:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">회사 정보</h3>
            <div className="space-y-2.5 text-sm leading-relaxed">
              <p>{data.footer.companyName}</p>
              <p>사업자등록번호 {data.footer.businessNumber}</p>
              <p className="word-break">{data.footer.address}</p>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">고객센터</h3>
            <div className="space-y-2.5 text-sm leading-relaxed">
              <p>전화 {data.footer.customerCenter}</p>
              <p>이메일 {data.footer.email}</p>
              <p>운영시간 {data.footer.hours}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 text-xs text-white/50">
          {data.footer.copyright}
        </div>
      </div>
    </footer>
  );

  if (isInviteRequired && !isAccessPeriodOpen) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
        <main className="flex flex-1 items-center justify-center px-6 py-20">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-zinc-900/80 p-8 text-center shadow-2xl shadow-black/30">
            <p className="text-sm uppercase tracking-[0.28em] text-white/50">PRIVATE SHOPPING CLOSED</p>
            <h1 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">지금은 이용기간이 아닙니다.</h1>
            <p className="mt-5 text-base leading-7 text-white/70">
              관리자에게 문의 해주시기 바랍니다.
            </p>
            {access.startDate && access.endDate && (
              <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                이용 가능 기간: {access.startDate.replace("T", " ")} ~ {access.endDate.replace("T", " ")}
              </p>
            )}
          </div>
        </main>
        {footer}
      </div>
    );
  }

  if (!canViewLanding) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
        <main className="flex flex-1 items-center justify-center px-6 py-20">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-zinc-900/80 p-8 shadow-2xl shadow-black/30">
            <p className="text-sm uppercase tracking-[0.28em] text-white/50">PRIVATE SHOPPING</p>
            <h1 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">초대코드 입력</h1>
            <p className="mt-4 text-sm leading-6 text-white/60">
              초대받은 고객만 이용할 수 있는 페이지입니다. 코드는 입장 후 3시간 동안 유지됩니다.
            </p>
            <div className="mt-7 space-y-3">
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(event) => setInviteCodeInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleInviteSubmit();
                }}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-center text-lg font-semibold text-white outline-none transition placeholder:text-sm placeholder:font-normal focus:border-white/30"
                placeholder="초대코드를 입력하세요"
                autoFocus
              />
              {inviteError && <p className="text-sm text-rose-300">{inviteError}</p>}
              <button
                type="button"
                onClick={handleInviteSubmit}
                className="w-full cursor-pointer rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/90"
              >
                입장하기
              </button>
              {access.startDate && access.endDate && (
                <p className="text-center text-xs text-white/45">
                  이용 가능 기간 {access.startDate.replace("T", " ")} ~ {access.endDate.replace("T", " ")}
                </p>
              )}
            </div>
          </div>
        </main>
        {footer}
      </div>
    );
  }

  const heroBackgroundImage = data.hero.backgroundImage
    ? `url(${data.hero.backgroundImage})`
    : "";
  const heroBackdropImage = data.hero.backgroundImage
    ? `linear-gradient(rgba(8,7,11,0.72), rgba(8,7,11,0.72)), radial-gradient(circle at top, rgba(255,255,255,0.14), transparent 30%), linear-gradient(180deg, #111827 0%, #05060a 100%)`
    : "radial-gradient(circle at top, rgba(255,255,255,0.14), transparent 30%), linear-gradient(180deg, #111827 0%, #05060a 100%)";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header
        className="relative flex min-h-[440px] items-center overflow-hidden px-6 py-16 sm:min-h-[520px] sm:px-12 lg:min-h-[560px]"
        style={{
          backgroundImage: heroBackdropImage,
          backgroundPosition: data.hero.backgroundImage ? "center, center top, center" : "center top, center",
          backgroundRepeat: data.hero.backgroundImage ? "no-repeat, no-repeat, no-repeat" : "no-repeat, no-repeat",
          backgroundSize: data.hero.backgroundImage ? "cover, auto, cover" : "auto, cover",
        }}
      >
        {data.hero.backgroundImage && (
          <div
            className="landing-hero-image absolute inset-0 bg-center bg-no-repeat"
            style={{
              backgroundImage: heroBackgroundImage,
            }}
            aria-hidden="true"
          />
        )}
        <div className="relative z-[1] mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:pl-12 xl:pl-16 2xl:pl-20">
          <div className="w-full max-w-2xl text-left">
            <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm tracking-[0.18em] text-white/75">
              {data.hero.highlight}
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {data.hero.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75 sm:text-xl">
              {data.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openOrderInquiry}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                주문 조회
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="products" className="mx-auto max-w-7xl px-6 py-16 sm:px-12">
        <section className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-white/50">Featured Selection</p>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">{data.section.heading}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            {data.section.description}
          </p>
        </section>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeProducts.map((product) => {
            const isSoldOut = getStockQuantity(product) <= 0;
            return (
              <article
                key={product.id}
                className={`group overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-6 transition sm:p-8 ${
                  isSoldOut ? "opacity-70" : "hover:-translate-y-1 hover:bg-white/10"
                }`}
              >
                <div className="relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="mb-6 aspect-square w-full rounded-[1.75rem] object-cover shadow-inner shadow-black/20"
                    />
                  ) : (
                    <div className="mb-6 aspect-square w-full rounded-[1.75rem] bg-white/10 shadow-inner shadow-black/20" />
                  )}
                  {isSoldOut && (
                    <span className="absolute left-4 top-4 rounded-full border border-rose-200/30 bg-rose-500/90 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-black/30">
                      품절
                    </span>
                  )}
                  {isSoldOut && <div className="absolute inset-0 rounded-[1.75rem] bg-black/35" />}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-white/50">{product.tag}</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{product.name}</h3>
                  <p className="mt-4 text-base leading-7 text-white/70">{product.description}</p>
                </div>
                <div className="mt-8 flex items-center justify-between gap-4 text-sm sm:text-base">
                  <div className="space-y-1">
                    {product.initialPrice?.trim() && (
                      <span className="block text-sm font-medium text-white/45 line-through decoration-white/35 decoration-1">
                        {product.initialPrice}
                      </span>
                    )}
                    <span className="block text-2xl font-semibold text-white">{product.price}</span>
                    {(display.showStockQuantity || isSoldOut) && (
                      <span className="block text-xs text-white/50">
                        {isSoldOut ? "품절" : `${getStockQuantity(product)}개 남음`}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openProductModal(product)}
                    disabled={isSoldOut}
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-rose-300/20 disabled:bg-rose-500/10 disabled:text-rose-100 disabled:hover:bg-rose-500/10"
                  >
                    {isSoldOut ? "품절되었습니다" : product.paymentMode === "external" ? "구매하러 가기" : "자세히 보기"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-0 sm:px-4 sm:py-8">
          <div className="mx-auto min-h-[100dvh] w-full max-w-3xl overflow-hidden bg-zinc-950 shadow-2xl shadow-black/70 sm:min-h-0 sm:rounded-4xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 px-5 py-4 backdrop-blur-xl sm:bg-zinc-900 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45 sm:tracking-[0.24em]">상품상세정보</p>
                <h2 className="mt-2 line-clamp-2 text-2xl font-semibold leading-tight text-white sm:line-clamp-none">
                  {selectedProduct.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="ml-4 shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                닫기
              </button>
            </div>
            <div className="space-y-5 p-5 sm:max-h-[calc(100vh-14rem)] sm:space-y-6 sm:overflow-y-auto sm:p-6">
              {modalStep === "detail" && (
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    {(() => {
                      const galleryItems = [selectedProduct.image, ...(selectedProduct.additionalImages || [])].filter(Boolean);
                      const currentImage = galleryItems[galleryIndex] || "";

                      return (
                        <div className="space-y-4">
                          <div className="relative">
                            {currentImage ? (
                              <img
                                src={currentImage}
                                alt={selectedProduct.name}
                                className="aspect-square w-full rounded-4xl object-cover"
                              />
                            ) : (
                              <div className="flex aspect-square w-full items-center justify-center rounded-4xl bg-white/5 text-white/60">
                                이미지가 없습니다.
                              </div>
                            )}
                            {galleryItems.length > 1 && (
                              <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
                                <button
                                  type="button"
                                  onClick={() => setGalleryIndex((prev) => Math.max(prev - 1, 0))}
                                  disabled={galleryIndex === 0}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <span className="sr-only">이전</span>
                                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                                <span className="rounded-full bg-black/60 px-3 py-2 text-xs text-white/70">
                                  {galleryIndex + 1} / {galleryItems.length}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setGalleryIndex((prev) => Math.min(prev + 1, galleryItems.length - 1))}
                                  disabled={galleryIndex === galleryItems.length - 1}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <span className="sr-only">다음</span>
                                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                                    <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="space-y-3 rounded-4xl bg-white/5 p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">{selectedProduct.tag}</p>
                      <p className="text-lg leading-8 text-white/75">{selectedProduct.description}</p>
                    </div>
                  </div>
                  <div className="space-y-6 rounded-4xl bg-white/5 p-6">
                    <div>
                      <p className="text-sm text-white/50">가격</p>
                      {selectedProduct.initialPrice?.trim() && (
                        <p className="mt-2 text-sm font-medium text-white/45 line-through decoration-white/35 decoration-1">
                          {selectedProduct.initialPrice}
                        </p>
                      )}
                      <p className={`${selectedProduct.initialPrice?.trim() ? "mt-1" : "mt-2"} text-3xl font-semibold text-white`}>
                        {selectedProduct.price}
                      </p>
                      <p className="mt-2 text-sm text-white/60">
                        {getStockQuantity(selectedProduct) <= 0
                          ? "품절"
                          : display.showStockQuantity
                            ? `${getStockQuantity(selectedProduct)}개 남음`
                            : null}
                      </p>
                    </div>
                    <div className="rounded-4xl bg-zinc-950/70 p-4 text-sm text-white/70">
                      {selectedProduct.paymentMode === "bank-transfer" ? (
                        <p>이 상품은 내부 무통장 주문으로 처리됩니다. 주문 정보 입력 후 입금 안내를 받으세요.</p>
                      ) : selectedProduct.paymentLink ? (
                        <p>외부 쇼핑몰 링크로 이동하여 구매를 진행합니다.</p>
                      ) : (
                        <p>외부 링크가 설정되지 않았습니다. 관리자에서 링크를 확인하세요.</p>
                      )}
                    </div>
                    {selectedProduct.paymentMode === "bank-transfer" && getProductOptions(selectedProduct).length > 0 && (
                      <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-3">
                        <p className="text-sm text-white/50">주문 옵션 · {selectedProduct.optionName || "옵션"}</p>
                        <div className="mt-2 space-y-1.5">
                          {getProductOptions(selectedProduct).map((option) => {
                            const selected = orderForm.selectedOption === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleOrderFormChange("selectedOption", option)}
                                className={`relative flex min-h-9 w-full items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold leading-5 transition ${
                                  selected
                                    ? "border-white bg-white text-zinc-950 shadow-md shadow-white/10"
                                    : "border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                                }`}
                              >
                                <span className="break-words">{option}</span>
                                {selected && (
                                  <span className="absolute right-2 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-950 text-[10px] leading-none text-white">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-3">
                      {selectedProduct.paymentMode === "external" ? (
                        <a
                          href={selectedProduct.paymentLink || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${selectedProduct.paymentLink ? "bg-white text-zinc-950 hover:bg-white/90" : "bg-white/10 text-white/50 cursor-not-allowed"}`}
                        >
                          구매하러 가기
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModalStep("orderForm")}
                          disabled={getStockQuantity(selectedProduct) <= 0 || isOrderSubmitting}
                          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
                        >
                          {getStockQuantity(selectedProduct) <= 0 ? "품절" : "주문하기"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-zinc-950/80 px-6 py-3 text-sm text-white transition hover:bg-white/10"
                      >
                        돌아가기
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {modalStep === "orderForm" && (
                <div className="space-y-6">
                  <div className="rounded-4xl bg-white/5 p-6">
                    <p className="text-sm text-white/50">주문 정보</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm text-white/80">
                        이름
                        <input
                          type="text"
                          value={orderForm.customerName}
                          onChange={(event) => handleOrderFormChange("customerName", event.target.value)}
                          className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-white/80">
                        휴대폰
                        <input
                          type="tel"
                          value={orderForm.customerPhone}
                          onChange={(event) => handleOrderFormChange("customerPhone", event.target.value)}
                          className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-white/80 sm:col-span-2">
                        주소
                        <input
                          type="text"
                          value={orderForm.customerAddress}
                          onChange={(event) => handleOrderFormChange("customerAddress", event.target.value)}
                          className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-white/80">
                        수량
                        <input
                          type="number"
                          min={1}
                          max={selectedProduct ? getAllowedOrderQuantity(selectedProduct) : 1}
                          value={orderForm.quantity}
                          onChange={(event) => handleOrderFormChange("quantity", Number(event.target.value))}
                          className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                        />
                        {selectedProduct && (
                          <span className="block text-xs text-white/45">
                            최대 {getAllowedOrderQuantity(selectedProduct)}개까지 주문할 수 있습니다.
                          </span>
                        )}
                      </label>
                      {selectedProduct && getProductOptions(selectedProduct).length > 0 && (
                        <div className="space-y-2 sm:col-span-2">
                          <p className="text-sm text-white/80">주문 옵션 · {selectedProduct.optionName || "옵션"}</p>
                          <div className="rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3">
                            <p className="text-xs text-white/45">선택한 옵션</p>
                            <p className="mt-1 break-words text-base font-semibold text-white">
                              {orderForm.selectedOption || "선택된 옵션이 없습니다."}
                            </p>
                          </div>
                          <p className="text-xs text-white/45">옵션을 변경하려면 뒤로 돌아가 다시 선택해주세요.</p>
                        </div>
                      )}
                      <label className="space-y-2 text-sm text-white/80 sm:col-span-2">
                        배송 메모
                        <textarea
                          rows={3}
                          value={orderForm.deliveryNote}
                          onChange={(event) => handleOrderFormChange("deliveryNote", event.target.value)}
                          className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                        />
                      </label>
                    </div>
                  </div>
                  {orderSubmitError && (
                    <div className="rounded-3xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      {orderSubmitError}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setModalStep("detail")}
                      disabled={isOrderSubmitting}
                      className="rounded-full border border-white/15 bg-zinc-950/80 px-6 py-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      뒤로
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateOrder}
                      disabled={isOrderSubmitting}
                      className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/90 disabled:cursor-wait disabled:bg-white/40 disabled:text-zinc-700"
                    >
                      {isOrderSubmitting ? "주문 생성 중..." : "주문 생성"}
                    </button>
                  </div>
                </div>
              )}
              {modalStep === "confirmation" && createdOrder && (
                <div className="space-y-6">
                  <div className="rounded-4xl bg-white/5 p-6">
                    <p className="text-sm text-white/50">주문이 생성되었습니다.</p>
                    <div className="mt-4 space-y-3">
                      <p className="text-base text-white/80">주문번호: <span className="font-semibold text-white">{createdOrder.id}</span></p>
                      <p className="text-base text-white/80">주문자: {createdOrder.customerName}</p>
                      <p className="text-base text-white/80">연락처: {createdOrder.customerPhone}</p>
                      <p className="text-base text-white/80">배송지: {createdOrder.customerAddress}</p>
                      {createdOrder.selectedOption && (
                        <p className="text-base text-white/80">
                          옵션: {createdOrder.selectedOption.name} / {createdOrder.selectedOption.value}
                        </p>
                      )}
                      <p className="text-base text-white/80">총액: {createdOrder.totalPrice}</p>
                      <p className="text-base text-white/80">주문번호 또는 휴대폰 번호로 주문 조회가 가능하니, 꼭 기억하시기 바랍니다.</p>
                    </div>
                  </div>
                  <div className="rounded-4xl bg-zinc-950/70 p-6">
                    <p className="text-sm text-white/50">입금 안내</p>
                    <div className="mt-4 space-y-3 text-white/80">
                      <p>은행명: {createdOrder.bankInfo.bankName}</p>
                      <p>계좌번호: {createdOrder.bankInfo.accountNumber}</p>
                      <p>예금주: {createdOrder.bankInfo.accountHolder}</p>
                      <p>입금 기한: {createdOrder.bankInfo.depositDue}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/90"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {orderInquiryOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-8">
          <div className="mx-auto w-full max-w-3xl rounded-4xl bg-zinc-950 shadow-2xl shadow-black/70 overflow-hidden">
            <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-zinc-900 px-6 py-4 z-10">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">주문 조회</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">주문번호 또는 휴대폰으로 확인</h2>
              </div>
              <button
                type="button"
                onClick={closeOrderInquiry}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 shrink-0"
              >
                닫기
              </button>
            </div>
            <div className="space-y-6 p-6 max-h-[calc(100vh-14rem)] overflow-y-auto">
              <div className="rounded-4xl bg-white/5 p-6">
                <p className="text-sm text-white/50">조회 정보</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[1.5fr_0.9fr]">
                  <label className="space-y-2 text-sm text-white/80 sm:col-span-2">
                    주문번호 또는 휴대폰 번호
                    <input
                      type="text"
                      value={orderSearchInput}
                      onChange={(event) => setOrderSearchInput(event.target.value)}
                      className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                      placeholder="ORDER-123456 또는 01012345678"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={searchOrders}
                    className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/90"
                  >
                    조회
                  </button>
                </div>
                {orderSearchError && <p className="mt-3 text-sm text-rose-300">{orderSearchError}</p>}
              </div>
              {orderQueryResults && orderQueryResults.length > 0 && (
                <div className="rounded-4xl bg-zinc-950/80 p-6">
                  <p className="text-sm text-white/50">검색 결과</p>
                  <div className="mt-4 space-y-5">
                    {orderQueryResults.map((order) => (
                      <div key={order.id} className="rounded-4xl border border-white/10 bg-white/5 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-white/50">주문번호</p>
                            <p className="mt-1 text-base font-semibold text-white">{order.id}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusClassName(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1 text-sm text-white/70">
                            <p>상품명</p>
                            <p className="text-white">{order.productName}</p>
                            {order.selectedOption && (
                              <p className="mt-1 text-white/60">
                                {order.selectedOption.name}: {order.selectedOption.value}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-white/70">
                            <p>총액</p>
                            <p className="text-white">{order.totalPrice}</p>
                          </div>
                          <div className="space-y-1 text-sm text-white/70">
                            <p>주문자</p>
                            <p className="text-white">{order.customerName}</p>
                          </div>
                          <div className="space-y-1 text-sm text-white/70">
                            <p>연락처</p>
                            <p className="text-white">{order.customerPhone}</p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-3xl bg-white/5 p-4 text-sm text-white/70">
                          <p>주소: {order.customerAddress}</p>
                          {order.deliveryNote ? <p className="mt-2">배송 메모: {order.deliveryNote}</p> : null}
                          <p className="mt-2">입금 안내: {order.bankInfo.bankName} {order.bankInfo.accountNumber} ({order.bankInfo.accountHolder})</p>
                          <p>입금 기한: {order.bankInfo.depositDue}</p>
                          {order.status === "배송중" && (
                            <div className="mt-3 rounded-2xl bg-zinc-950/60 p-3">
                              <p className="font-semibold text-white">배송 정보</p>
                              <p className="mt-1">배송사: {order.shippingInfo?.carrier || "확인 중"}</p>
                              <p>송장번호: {order.shippingInfo?.trackingNumber || "확인 중"}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeOrderInquiry}
                  className="rounded-full border border-white/15 bg-zinc-950/80 px-6 py-3 text-sm text-white transition hover:bg-white/10"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {footer}
    </div>
  );
}
