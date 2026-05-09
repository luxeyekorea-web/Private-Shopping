"use client";

import { useEffect, useState } from "react";
import { LandingData, defaultLandingData, loadLandingData } from "./lib/landing-data";
import { appendOrder, defaultBankInfo, loadOrders, type OrderItem } from "./lib/order-data";
export default function Home() {
  const [data, setData] = useState<LandingData>(defaultLandingData);
  const [selectedProduct, setSelectedProduct] = useState<LandingData["products"][number] | null>(null);
  const [modalStep, setModalStep] = useState<"detail" | "orderForm" | "confirmation">("detail");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [orderForm, setOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    quantity: 1,
    deliveryNote: "",
  });
  const [createdOrder, setCreatedOrder] = useState<OrderItem | null>(null);
  const [orderInquiryOpen, setOrderInquiryOpen] = useState(false);
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderQueryResults, setOrderQueryResults] = useState<OrderItem[] | null>(null);
  const [orderSearchError, setOrderSearchError] = useState<string | null>(null);

  useEffect(() => {
    loadLandingData().then(setData).catch(() => setData(defaultLandingData));
  }, []);

  const activeProducts = data.products.filter((product) => product.active !== false);

  const closeModal = () => {
    setSelectedProduct(null);
    setModalStep("detail");
    setGalleryIndex(0);
    setOrderForm({
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      quantity: 1,
      deliveryNote: "",
    });
    setCreatedOrder(null);
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

  const searchOrders = () => {
    const query = orderSearchInput.trim();
    if (!query) {
      setOrderSearchError("주문번호 또는 휴대폰 번호를 입력하세요.");
      setOrderQueryResults(null);
      return;
    }

    const orders = loadOrders();
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
    setSelectedProduct(product);
    setModalStep("detail");
    setGalleryIndex(0);
    setCreatedOrder(null);
  };

  const handleOrderFormChange = (field: keyof typeof orderForm, value: string | number) => {
    setOrderForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateOrder = () => {
    if (!selectedProduct) return;
    const orderId = `ORDER-${Date.now()}`;
    const totalPrice = selectedProduct.price.replace(/[^0-9]/g, "") || "0";
    const quantity = orderForm.quantity;
    const totalAmount = `${Number(totalPrice) * quantity}원`;

    const bankInfo = {
      bankName: data.footer.bankName || defaultBankInfo.bankName,
      accountNumber: data.footer.accountNumber || defaultBankInfo.accountNumber,
      accountHolder: data.footer.accountHolder || defaultBankInfo.accountHolder,
      depositDue: data.footer.depositDue || defaultBankInfo.depositDue,
    };

    const order: OrderItem = {
      id: orderId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productPrice: selectedProduct.price,
      quantity,
      totalPrice: totalAmount,
      customerName: orderForm.customerName,
      customerPhone: orderForm.customerPhone,
      customerAddress: orderForm.customerAddress,
      deliveryNote: orderForm.deliveryNote,
      status: "입금대기",
      createdAt: new Date().toISOString(),
      bankInfo: {
        ...bankInfo,
      },
    };

    appendOrder(order);
    setCreatedOrder(order);
    setModalStep("confirmation");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header
        className="relative overflow-hidden py-16 px-6 sm:px-12"
        style={{
          backgroundImage: `${data.hero.backgroundImage ? `linear-gradient(rgba(8,7,11,0.72), rgba(8,7,11,0.72)), url(${data.hero.backgroundImage}),` : ""} radial-gradient(circle at top, rgba(255,255,255,0.14), transparent 30%), linear-gradient(180deg, #111827 0%, #05060a 100%)`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
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
          {activeProducts.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:bg-white/10 sm:p-8"
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="mb-6 aspect-square w-full rounded-[1.75rem] object-cover shadow-inner shadow-black/20"
                />
              ) : (
                <div className="mb-6 aspect-square w-full rounded-[1.75rem] bg-white/10 shadow-inner shadow-black/20" />
              )}
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-white/50">{product.tag}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{product.name}</h3>
                <p className="mt-4 text-base leading-7 text-white/70">{product.description}</p>
              </div>
              <div className="mt-8 flex items-center justify-between gap-4 text-sm sm:text-base">
                <span className="font-semibold text-white">{product.price}</span>
                <button
                  type="button"
                  onClick={() => openProductModal(product)}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white transition hover:bg-white/10"
                >
                  자세히 보기
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl rounded-4xl bg-zinc-950 shadow-2xl shadow-black/70 my-8">
            <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-zinc-900 px-6 py-4 z-10">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">상품상세정보</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{selectedProduct.name}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 shrink-0"
              >
                닫기
              </button>
            </div>
            <div className="space-y-6 p-6">
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
                      <p className="mt-2 text-3xl font-semibold text-white">{selectedProduct.price}</p>
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
                    <div className="flex flex-col gap-3">
                      {selectedProduct.paymentMode === "external" ? (
                        <a
                          href={selectedProduct.paymentLink || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${selectedProduct.paymentLink ? "bg-white text-zinc-950 hover:bg-white/90" : "bg-white/10 text-white/50 cursor-not-allowed"}`}
                        >
                          외부 쇼핑몰 이동
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModalStep("orderForm")}
                          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/90"
                        >
                          무통장 주문하기
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
                          value={orderForm.quantity}
                          onChange={(event) => handleOrderFormChange("quantity", Number(event.target.value))}
                          className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                        />
                      </label>
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setModalStep("detail")}
                      className="rounded-full border border-white/15 bg-zinc-950/80 px-6 py-3 text-sm text-white transition hover:bg-white/10"
                    >
                      뒤로
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateOrder}
                      className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/90"
                    >
                      주문 생성
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
                      <p className="text-base text-white/80">총액: {createdOrder.totalPrice}</p>
                      <p className="text-base text-white/80">주문자 성함과 휴대폰 번호로 주문 확인이 가능하니, 꼭 기억하시기 바랍니다.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl rounded-4xl bg-zinc-950 shadow-2xl shadow-black/70 my-8">
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
            <div className="space-y-6 p-6">
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
                          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1 text-sm text-white/70">
                            <p>상품명</p>
                            <p className="text-white">{order.productName}</p>
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
    </div>
  );
}
