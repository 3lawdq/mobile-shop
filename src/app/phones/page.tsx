"use client";

import { Suspense } from "react";
import ProductsList from "./ProductsList";

export default function PhonesPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10">جاري التحميل...</div>}>
      <ProductsList />
    </Suspense>
  );
}
