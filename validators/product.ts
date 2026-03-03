import { z } from "zod";

export const productSchema = z
  .object({
    name: z.string().min(2, "Product name is required"),
    sku: z.string().min(2, "SKU is required").transform((v) => v.trim().toUpperCase()),

    categoryId: z.string().min(1, "Category is required"),
    unitId: z.string().min(1, "Unit is required"),

    manageStock: z.boolean(),

    openingStock: z.number().min(0),
    alertQty: z.number().min(0),

    purchasePrice: z.number().min(0),
    sellingPrice: z.number().min(0),
  })
  .superRefine((val, ctx) => {
    // Business rule optional: selling >= purchase
    if (val.sellingPrice < val.purchasePrice) {
      ctx.addIssue({ code: "custom", message: "Selling price should be >= purchase price" });
    }
    // manageStock OFF is handled in API (force 0), but keep logic safe here too
    if (!val.manageStock && (val.openingStock !== 0 || val.alertQty !== 0)) {
      // not an error; API will force to 0
    }
  });

export type ProductInput = z.infer<typeof productSchema>;