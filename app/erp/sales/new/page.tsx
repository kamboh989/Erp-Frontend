import React, { Suspense } from "react";
import AddSale from "./add-sale";

export default function Page() {
  return (
    <Suspense>
      <AddSale />
    </Suspense>
  );
}
