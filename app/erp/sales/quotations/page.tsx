import React, { Suspense } from "react";
import QuotationList from "./quotation-list";

export default function Page() {
  return (
    <Suspense>
      <QuotationList />
    </Suspense>
  );
}
