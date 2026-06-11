"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ConversationsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const hasFilters = search || dateFrom || dateTo;

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by patient name or status…"
          defaultValue={search}
          onChange={(e) => update("search", e.target.value)}
          className="pl-9"
        />
      </div>
      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => update("dateFrom", e.target.value)}
        className="w-40"
        aria-label="From date"
      />
      <span className="text-sm text-slate-400">–</span>
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => update("dateTo", e.target.value)}
        className="w-40"
        aria-label="To date"
      />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("?")}
          className="gap-1 text-slate-500"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
