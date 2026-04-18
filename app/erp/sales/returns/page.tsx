import React, { Suspense } from "react";
import SaleReturnList from "./sale-return-list";

export default function Page() {
  return (
    <Suspense>
      <SaleReturnList />
    </Suspense>
  );
}
