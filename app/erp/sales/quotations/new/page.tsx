import React, { Suspense } from "react";
import AddQuotation from "./add-quotation";

export default function Page() {
  return (
    <Suspense>
      <AddQuotation />
    </Suspense>
  );
}
