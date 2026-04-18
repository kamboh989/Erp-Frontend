import { Suspense } from "react";
import New from "./addnew";

export default function Page() {
  return (
    <Suspense>
      <New />
    </Suspense>
  );
}