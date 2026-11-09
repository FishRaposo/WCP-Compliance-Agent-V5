import { IS_MOCK } from "@/utils/api-client";

export default function SampleDataBadge() {
  if (!IS_MOCK) return null;

  return (
    <span
      className="text-xs font-medium text-gray-400 tracking-wide uppercase px-2 py-1 rounded-md bg-white/5 border border-white/10"
      aria-label="Sample data mode"
    >
      Sample data
    </span>
  );
}
