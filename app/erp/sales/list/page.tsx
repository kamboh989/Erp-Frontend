import React, { Suspense } from "react";
import SalesList from "./sales-list";

export default function Page() {
  return (
    <Suspense>
      <SalesList />
    </Suspense>
  );
}
