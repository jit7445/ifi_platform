import type { ExportFormat, TaskType } from "./api";

export const EXPORT_LABELS: Record<ExportFormat, string> = {
  evaluation_results_jsonl: "Evaluation results (JSONL)",
  sft_jsonl: "SFT conversations (JSONL)",
  preference_pairs_jsonl: "Preference pairs, TRL format (JSONL)",
};

/** Mirrors the contract: sft_jsonl needs corrections, preference_pairs_jsonl needs pairwise_preference. */
export function allowedExportFormats(taskType: TaskType, rubricRequiresCorrection: boolean): ExportFormat[] {
  const out: ExportFormat[] = ["evaluation_results_jsonl"];
  if (taskType === "sft_correction" || rubricRequiresCorrection) out.push("sft_jsonl");
  if (taskType === "pairwise_preference") out.push("preference_pairs_jsonl");
  return out;
}
