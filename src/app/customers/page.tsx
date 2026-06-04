import Link from "next/link";
import { ChevronRight, Plus, Search, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";

type CustomersPageProps = {
  searchParams: {
    q?: string;
  };
};

function formatDate(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function customerCode(id: string) {
  return `C-${id.slice(-5).toUpperCase()}`;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { q } = searchParams;
  const keyword = q?.trim() ?? "";
  const customers = await prisma.customer.findMany({
    where: keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { phone: { contains: keyword, mode: "insensitive" } },
            { memo: { contains: keyword, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: {
      visits: {
        orderBy: { visitedAt: "desc" },
        take: 1
      },
      preference: true
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-800">Customers</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">顧客一覧</h1>
          <p className="mt-1 text-sm text-stone-600">来店前に必要なカルテ、NG条件、最終来店日を素早く確認できます。</p>
        </div>
        <Link
          href="/customers/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-900"
        >
          <Plus className="h-4 w-4" />
          新規顧客登録
        </Link>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <form className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              name="q"
              defaultValue={keyword}
              placeholder="顧客名・電話番号・メモで検索"
              className="h-11 w-full rounded-md border border-stone-200 bg-white px-11 text-sm shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-md border border-stone-200 bg-stone-50 px-5 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-100"
          >
            検索
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-teal-800" />
            <h2 className="font-semibold text-stone-950">顧客カルテ</h2>
          </div>
          <span className="text-sm text-stone-500">{customers.length}件</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead className="bg-[#fbf8f3] text-left text-xs font-semibold text-stone-500">
              <tr>
                <th className="px-5 py-3">顧客</th>
                <th className="px-5 py-3">性別 / 生年</th>
                <th className="px-5 py-3">電話番号</th>
                <th className="px-5 py-3">最終来店日</th>
                <th className="px-5 py-3">NG条件</th>
                <th className="px-5 py-3">メモ</th>
                <th className="px-5 py-3 text-right">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-[#fbf8f3]">
                  <td className="whitespace-nowrap px-5 py-4">
                    <Link href={`/customers/${customer.id}`} className="font-semibold text-stone-950 hover:text-teal-800">
                      {customer.name}
                    </Link>
                    <div className="mt-1 text-xs font-medium text-teal-800">{customerCode(customer.id)}</div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    {customer.gender ?? "-"} / {customer.birthYear ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">{customer.phone ?? "-"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    {formatDate(customer.visits[0]?.visitedAt)}
                  </td>
                  <td className="px-5 py-4">
                    {customer.preference?.dislikes ? (
                      <span className="inline-flex rounded bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        あり
                      </span>
                    ) : (
                      <span className="text-stone-400">-</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-5 py-4 text-stone-600">{customer.memo ?? "-"}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-teal-800"
                      aria-label={`${customer.name}の詳細`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-stone-500">
                    顧客が見つかりません。検索条件を変えるか、新規顧客を登録してください。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
