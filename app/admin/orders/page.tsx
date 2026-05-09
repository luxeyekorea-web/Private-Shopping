"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteOrder,
  loadOrders,
  type OrderItem,
  updateOrder,
} from "../../lib/order-data";

const ORDER_STATUSES: OrderItem["status"][] = ["입금대기", "결제완료", "배송중", "취소"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<OrderItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadOrders();
    setOrders(stored);
    setFiltered(stored);
  }, []);

  const handleSearch = () => {
    const query = search.trim();
    if (!query) {
      setFiltered(orders);
      return;
    }
    setFiltered(
      orders.filter(
        (order) =>
          order.id.includes(query) || order.customerPhone.includes(query) || order.customerName.includes(query),
      ),
    );
  };

  const handleStatusChange = (orderId: string, status: OrderItem["status"]) => {
    const next = orders.map((order) => (order.id === orderId ? { ...order, status } : order));
    updateOrder(next.find((order) => order.id === orderId)!);
    setOrders(next);
    setFiltered((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    setMessage("주문 상태가 저장되었습니다.");
  };

  const handleDelete = (orderId: string) => {
    deleteOrder(orderId);
    const next = orders.filter((order) => order.id !== orderId);
    setOrders(next);
    setFiltered((prev) => prev.filter((order) => order.id !== orderId));
    setMessage("주문이 삭제되었습니다.");
  };

  const handleReset = () => {
    setSearch("");
    setFiltered(orders);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-white sm:px-10">
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
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  상품 관리 페이지로 이동
                </Link>
              </div>
            </div>
            {message && (
              <div className="mt-5 rounded-3xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {message}
              </div>
            )}
          </div>

          <div className="rounded-4xl border border-white/10 bg-zinc-950/30 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid w-full gap-4 sm:grid-cols-[1.6fr_0.8fr]">
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
            </div>
          </div>

          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-white/15 bg-zinc-950/50 p-8 text-center text-sm text-white/60">
                아직 저장된 주문이 없습니다.
              </div>
            ) : (
              filtered.map((order) => (
                <div key={order.id} className="rounded-4xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm text-white/50">주문번호</p>
                      <p className="mt-1 text-lg font-semibold text-white">{order.id}</p>
                      <p className="mt-2 text-sm text-white/70">{new Date(order.createdAt).toLocaleString("ko-KR")}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-black/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 rounded-3xl bg-zinc-950/70 p-4 text-sm text-white/75">
                      <p className="font-semibold text-white">주문자 정보</p>
                      <p>상품명: {order.productName}</p>
                      <p>주문자: {order.customerName}</p>
                      <p>연락처: {order.customerPhone}</p>
                      <p>주소: {order.customerAddress}</p>
                      {order.deliveryNote ? <p>배송 메모: {order.deliveryNote}</p> : null}
                    </div>
                    <div className="space-y-2 rounded-3xl bg-zinc-950/70 p-4 text-sm text-white/75">
                      <p className="font-semibold text-white">결제 / 입금 정보</p>
                      <p>상품 가격: {order.productPrice}</p>
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
                          className="rounded-full border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none"
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
                      className="inline-flex items-center justify-center rounded-full border border-rose-300/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                    >
                      주문 삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
