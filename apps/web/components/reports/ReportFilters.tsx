"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  from: string;
  to: string;
}

export default function ReportFilters({ from, to }: Props) {
  const router = useRouter();
  const [fromVal, setFromVal] = useState(from);
  const [toVal, setToVal] = useState(to);

  function handleApply() {
    router.push(`/dashboard/reports?from=${fromVal}&to=${toVal}`);
  }

  function handleToday() {
    const today = new Date().toISOString().slice(0, 10);
    setFromVal(today);
    setToVal(today);
    router.push(`/dashboard/reports?from=${today}&to=${today}`);
  }

  function handleThisWeek() {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const fromStr = monday.toISOString().slice(0, 10);
    const toStr = now.toISOString().slice(0, 10);
    setFromVal(fromStr);
    setToVal(toStr);
    router.push(`/dashboard/reports?from=${fromStr}&to=${toStr}`);
  }

  function handleThisMonth() {
    const now = new Date();
    const fromStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const toStr = now.toISOString().slice(0, 10);
    setFromVal(fromStr);
    setToVal(toStr);
    router.push(`/dashboard/reports?from=${fromStr}&to=${toStr}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <Label htmlFor="from">Dari</Label>
        <Input
          id="from"
          type="date"
          value={fromVal}
          onChange={(e) => setFromVal(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to">Sampai</Label>
        <Input
          id="to"
          type="date"
          value={toVal}
          onChange={(e) => setToVal(e.target.value)}
          className="w-40"
        />
      </div>
      <Button onClick={handleApply}>Tampilkan</Button>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleToday}>Hari ini</Button>
        <Button variant="outline" size="sm" onClick={handleThisWeek}>Minggu ini</Button>
        <Button variant="outline" size="sm" onClick={handleThisMonth}>Bulan ini</Button>
      </div>
    </div>
  );
}
