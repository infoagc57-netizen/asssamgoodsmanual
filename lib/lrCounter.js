import Counter from "@/models/Counter";

export const LR_COUNTER_KEY = "lr_number";
export const FIRST_LR_NUMBER = 7900000001;
export const MAX_LR_NUMBER = 7999999999;

export async function getNextLrNumber() {
  // Step 1: Seed counter if it doesn't exist yet
  const existing = await Counter.findOne({ key: LR_COUNTER_KEY });
  if (!existing) {
    await Counter.create({ key: LR_COUNTER_KEY, value: FIRST_LR_NUMBER - 1 });
  }

  // Step 2: Atomically increment and get the new value
  const updated = await Counter.findOneAndUpdate(
    { key: LR_COUNTER_KEY },
    { $inc: { value: 1 } },
    { new: true },
  );

  // Step 3: Range check
  if (!updated || updated.value > MAX_LR_NUMBER) {
    throw new Error("LR number range exhausted. Please contact admin.");
  }

  // Step 4: Return as 10-digit string
  return String(updated.value);
}

export async function peekNextLrNumber() {
  // Return the next number WITHOUT incrementing (for UI preview only)
  const doc = await Counter.findOne({ key: LR_COUNTER_KEY });
  const next = doc ? doc.value + 1 : FIRST_LR_NUMBER;
  return String(next);
}
