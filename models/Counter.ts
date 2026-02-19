import mongoose, { Schema } from "mongoose";

const CounterSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    key: { type: String, required: true }, // e.g. "LEAD"
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CounterSchema.index({ companyId: 1, key: 1 }, { unique: true });

export default mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
