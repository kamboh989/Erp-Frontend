import React, { Suspense } from "react";
import AddSaleReturn from "./add-sale-return";

export default function Page() {
  return (
    <Suspense>
      <AddSaleReturn />
    </Suspense>
  );
}
