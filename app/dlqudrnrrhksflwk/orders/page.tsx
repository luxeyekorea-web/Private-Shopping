"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteOrder,
  loadOrders,
  type OrderItem,
  updateOrder,
} from "../../lib/order-data";

const ORDER_STATUSES: OrderItem["status"][] = ["입금대기", "결제완료", "배송중", "구매완료", "취소"];

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderItem["status"] | "전체">("전체");
  const [filtered, setFiltered] = useState<OrderItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [savingOrderIds, setSavingOrderIds] = useState<string[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<OrderItem["status"]>("입금대기");

  useEffect(() => {
    const load = async () => {
      const stored = await loadOrders();
      setOrders(stored);
      setFiltered(stored);
    };
    load();
  }, []);

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  const getFilteredOrders = (
    source: OrderItem[],
    query: string,
    status: OrderItem["status"] | "전체",
  ) => {
    const normalizedQuery = query.trim();

    return source.filter((order) => {
      const matchesStatus = status === "전체" || order.status === status;
      const matchesSearch =
        !normalizedQuery ||
        order.id.includes(normalizedQuery) ||
        order.customerPhone.includes(normalizedQuery) ||
        order.customerName.includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });
  };

  const syncFiltered = (
    nextOrders: OrderItem[],
    nextSearch = search,
    nextStatusFilter = statusFilter,
  ) => {
    const nextFiltered = getFilteredOrders(nextOrders, nextSearch, nextStatusFilter);
    setFiltered(nextFiltered);
    setSelectedOrderIds((prev) => prev.filter((id) => nextFiltered.some((order) => order.id === id)));
  };

  const handleSearch = () => {
    syncFiltered(orders);
  };

  const handleStatusFilterChange = (status: OrderItem["status"] | "전체") => {
    setStatusFilter(status);
    syncFiltered(orders, search, status);
  };

  const toggleOrderSelect = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  const toggleSelectAllFiltered = () => {
    const visibleIds = filtered.map((order) => order.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedOrderIds.includes(id));

    setSelectedOrderIds((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds])),
    );
  };

  const handleStatusChange = async (orderId: string, status: OrderItem["status"]) => {
    if (savingOrderIds.includes(orderId)) return;

    setSavingOrderIds((prev) => [...prev, orderId]);
    const next = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status,
            shippingInfo: order.shippingInfo || { carrier: "", trackingNumber: "" },
          }
        : order,
    );
    try {
      await updateOrder(next.find((order) => order.id === orderId)!);
      setOrders(next);
      syncFiltered(next);
      setMessage("주문 상태가 저장되었습니다.");
    } finally {
      setSavingOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleBulkStatusChange = async () => {
    if (selectedOrderIds.length === 0) {
      setMessage("상태를 변경할 주문을 선택해주세요.");
      return;
    }

    const targetIds = selectedOrderIds.filter((id) => !savingOrderIds.includes(id));
    if (targetIds.length === 0) return;

    setSavingOrderIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    const next = orders.map((order) =>
      targetIds.includes(order.id)
        ? {
            ...order,
            status: bulkStatus,
            shippingInfo: order.shippingInfo || { carrier: "", trackingNumber: "" },
          }
        : order,
    );

    try {
      await Promise.all(next.filter((order) => targetIds.includes(order.id)).map(updateOrder));
      setOrders(next);
      syncFiltered(next);
      setSelectedOrderIds([]);
      setMessage(`${targetIds.length}건의 주문 상태가 변경되었습니다.`);
    } finally {
      setSavingOrderIds((prev) => prev.filter((id) => !targetIds.includes(id)));
    }
  };

  const handleShippingInfoChange = (
    orderId: string,
    field: keyof NonNullable<OrderItem["shippingInfo"]>,
    value: string,
  ) => {
    const applyShippingInfo = (order: OrderItem): OrderItem =>
      order.id === orderId
        ? {
            ...order,
            shippingInfo: {
              carrier: order.shippingInfo?.carrier || "",
              trackingNumber: order.shippingInfo?.trackingNumber || "",
              [field]: value,
            },
          }
        : order;

    setOrders((prev) => prev.map(applyShippingInfo));
    setFiltered((prev) => prev.map(applyShippingInfo));
  };

  const handleShippingSave = async (orderId: string) => {
    if (savingOrderIds.includes(orderId)) return;

    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    setSavingOrderIds((prev) => [...prev, orderId]);
    const nextOrder: OrderItem = {
      ...order,
      status: "배송중",
      shippingInfo: {
        carrier: order.shippingInfo?.carrier || "",
        trackingNumber: order.shippingInfo?.trackingNumber || "",
      },
    };

    try {
      await updateOrder(nextOrder);
      const next = orders.map((item) => (item.id === orderId ? nextOrder : item));
      setOrders(next);
      syncFiltered(next);
      setMessage("배송 정보가 저장되었습니다.");
    } finally {
      setSavingOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleDelete = async (orderId: string) => {
    await deleteOrder(orderId);
    const next = orders.filter((order) => order.id !== orderId);
    setOrders(next);
    syncFiltered(next);
    setSelectedOrderIds((prev) => prev.filter((id) => id !== orderId));
    setMessage("주문이 삭제되었습니다.");
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("전체");
    syncFiltered(orders, "", "전체");
  };

  const escapeCsvValue = (value: string | number | undefined) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const downloadOrdersCsv = () => {
    const selectedOrders = filtered.filter((order) => selectedOrderIds.includes(order.id));
    const exportOrders = selectedOrders.length > 0 ? selectedOrders : filtered;

    if (exportOrders.length === 0) {
      setMessage("다운로드할 주문 내역이 없습니다.");
      return;
    }

    const headers = ["주문일시", "주문 번호", "주문자 이름", "주소", "연락처", "상품명", "옵션", "수량", "배송메시지", "결제 금액"];
    const rows = exportOrders.map((order) => [
      new Date(order.createdAt).toLocaleString("ko-KR"),
      order.id,
      order.customerName,
      order.customerAddress,
      order.customerPhone,
      order.productName,
      order.selectedOption ? `${order.selectedOption.name}: ${order.selectedOption.value}` : "",
      order.quantity,
      order.deliveryNote || "",
      order.totalPrice,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `orders-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-white sm:px-10">
      {message && (
        <div className="fixed right-4 top-4 z-[100] max-w-sm rounded-3xl border border-emerald-300/30 bg-emerald-500/15 px-5 py-4 text-sm font-semibold text-emerald-100 shadow-2xl shadow-black/40 backdrop-blur sm:right-8 sm:top-8">
          {message}
        </div>
      )}
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-8 rounded-4xl bg-zinc-950/95 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-white/50">관리자 주문 관리</p>
                <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">주문 현황 및 처리</h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dlqudrnrrhksflwk"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  상품 관리 페이지로 이동
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-4xl border border-white/10 bg-zinc-950/30 p-6">
            <div className="flex flex-col gap-5">
              <div className="grid w-full gap-4 lg:grid-cols-[1.4fr_auto] lg:items-end">
                <label className="space-y-2 text-sm text-white/80">
                  주문번호 / 휴대폰 / 주문자 검색
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    placeholder="ORDER-123456 또는 01012345678..."
                  />
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="inline-flex min-w-22.5 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/90"
                  >
                    검색
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex min-w-22.5 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    초기화
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["전체", ...ORDER_STATUSES] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusFilterChange(status)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      statusFilter === status
                        ? "border-white bg-white text-zinc-950"
                        : status === "전체"
                          ? "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                          : getOrderStatusClassName(status)
                    }`}
                  >
                    {status}
                    <span className="ml-2 text-xs opacity-70">
                      {status === "전체" ? orders.length : orders.filter((order) => order.status === status).length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    className="rounded-full border border-white/15 bg-zinc-950/50 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {filtered.length > 0 && filtered.every((order) => selectedOrderIds.includes(order.id))
                      ? "전체 선택 해제"
                      : "전체 선택"}
                  </button>
                  <span className="inline-flex items-center rounded-full bg-black/30 px-4 py-2 text-sm text-white/60">
                    선택 {selectedOrderIds.length}건 / 표시 {filtered.length}건
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={bulkStatus}
                    onChange={(event) => setBulkStatus(event.target.value as OrderItem["status"])}
                    className="rounded-full border border-white/10 bg-zinc-950/70 px-4 py-2 text-sm text-white outline-none"
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status} className="bg-zinc-950 text-white">
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkStatusChange}
                    disabled={selectedOrderIds.length === 0}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/50"
                  >
                    선택 상태변경
                  </button>
                </div>
                <button
                  type="button"
                  onClick={downloadOrdersCsv}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  엑셀 다운로드
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-white/15 bg-zinc-950/50 p-8 text-center text-sm text-white/60">
                아직 저장된 주문이 없습니다.
              </div>
            ) : (
              filtered.map((order) => {
                const isExpanded = expandedOrderIds.includes(order.id);
                const isSavingOrder = savingOrderIds.includes(order.id);

                return (
                  <div key={order.id} className={`rounded-3xl border bg-white/5 px-4 py-3 ${order.status === "취소" ? "border-rose-300/20 opacity-75" : "border-white/10"}`}>
                    <div className="flex items-center gap-3">
                      <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-zinc-950/60">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleOrderSelect(order.id)}
                          className="h-4 w-4 accent-white"
                        />
                        <span className="sr-only">주문 선택</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleOrderExpand(order.id)}
                        className="grid min-w-0 flex-1 cursor-pointer gap-3 text-left md:grid-cols-[1.5fr_0.8fr_1.2fr_auto] md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-white">{order.id}</p>
                          <p className="mt-1 text-xs text-white/55">{new Date(order.createdAt).toLocaleString("ko-KR")}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-white/40">주문자</p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-white">{order.customerName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-white/40">상품 / 금액</p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-white">{order.productName} · {order.totalPrice}</p>
                          {order.selectedOption && (
                            <p className="mt-0.5 truncate text-xs text-white/50">
                              {order.selectedOption.name}: {order.selectedOption.value}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 md:justify-end">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusClassName(order.status)}`}>
                            {order.status}
                          </span>
                          {isSavingOrder && <span className="text-xs text-white/45">저장 중</span>}
                          <span className="text-lg text-white">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </button>
                    </div>

                    {isExpanded && (
                      <>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 rounded-3xl bg-zinc-950/70 p-4 text-sm text-white/75">
                      <p className="font-semibold text-white">주문자 정보</p>
                      <p>상품명: {order.productName}</p>
                      {order.selectedOption && (
                        <p>옵션: {order.selectedOption.name} / {order.selectedOption.value}</p>
                      )}
                      <p>주문자: {order.customerName}</p>
                      <p>연락처: {order.customerPhone}</p>
                      <p>주소: {order.customerAddress}</p>
                      {order.deliveryNote ? <p>배송 메모: {order.deliveryNote}</p> : null}
                    </div>
                    <div className="space-y-2 rounded-3xl bg-zinc-950/70 p-4 text-sm text-white/75">
                      <p className="font-semibold text-white">결제 / 입금 정보</p>
                      <p>상품 가격: {order.productPrice}</p>
                      <p>수량: {order.quantity}개</p>
                      <p>총액: {order.totalPrice}</p>
                      <p>은행명: {order.bankInfo.bankName}</p>
                      <p>계좌번호: {order.bankInfo.accountNumber}</p>
                      <p>예금주: {order.bankInfo.accountHolder}</p>
                      <p>입금기한: {order.bankInfo.depositDue}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                        상태 변경
                        <select
                          value={order.status}
                          onChange={(event) => handleStatusChange(order.id, event.target.value as OrderItem["status"])}
                          disabled={isSavingOrder}
                          className="rounded-full border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none disabled:cursor-wait disabled:opacity-50"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status} className="bg-zinc-950 text-white">
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(order.id)}
                      disabled={isSavingOrder}
                      className="inline-flex items-center justify-center rounded-full border border-rose-300/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      주문 삭제
                    </button>
                  </div>
                  {order.status === "배송중" && (
                    <div className="mt-5 rounded-3xl border border-white/10 bg-zinc-950/60 p-4">
                      <p className="text-sm font-semibold text-white">배송 정보</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <label className="space-y-2 text-sm text-white/80">
                          배송사
                          <input
                            type="text"
                            value={order.shippingInfo?.carrier || ""}
                            onChange={(event) => handleShippingInfoChange(order.id, "carrier", event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                            placeholder="예: CJ대한통운"
                          />
                        </label>
                        <label className="space-y-2 text-sm text-white/80">
                          송장번호
                          <input
                            type="text"
                            value={order.shippingInfo?.trackingNumber || ""}
                            onChange={(event) => handleShippingInfoChange(order.id, "trackingNumber", event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
                            placeholder="송장번호 입력"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleShippingSave(order.id)}
                          disabled={isSavingOrder}
                          className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white/90 disabled:cursor-wait disabled:bg-white/40"
                        >
                          {isSavingOrder ? "저장 중..." : "배송정보 저장"}
                        </button>
                      </div>
                    </div>
                  )}
                      </>
                    )}
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
