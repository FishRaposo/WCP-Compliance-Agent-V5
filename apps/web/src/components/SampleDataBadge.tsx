import { IS_MOCK } from "@/utils/api-client";

export default function SampleDataBadge() {
  if (!IS_MOCK) return null;

  return (
    <span
      className="text-[10px] font-medium text-gray-500 tracking-wide uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/10"
      aria-label="Sample data mode"
    >
      Sample data
    </span>
  );
}
