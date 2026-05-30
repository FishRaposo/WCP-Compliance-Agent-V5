import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Props {
  onFile: (file: File) => void;
  onTextSubmit?: (text: string) => void;
  accept?: string;
  label?: string;
  disabled?: boolean;
}

export default function UploadDropzone({
  onFile,
  onTextSubmit,
  accept = ".pdf,.csv",
  label = "Drop certified WH-347 payroll here",
  disabled = false,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
          disabled ? "opacity-40 cursor-not-allowed border-white/5 bg-transparent" :
          dragging ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/5" : "border-white/10 bg-glass hover:border-white/20 hover:bg-glass/80"
        }`}
      >
        {/* Decorative gradient top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-premium opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="mx-auto w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors mb-4 border border-white/5">
          <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:scale-105 transition-all" />
        </div>
        <p className="text-sm font-bold text-white tracking-wide">{label}</p>
        <p className="text-xs text-gray-500 mt-2">or click to browse &middot; Max 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>

      {onTextSubmit && (
        <>
          <div className="relative flex items-center py-2">
            <Separator className="flex-1 bg-white/5" />
            <span className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#030303] relative z-10">Or paste text</span>
            <Separator className="flex-1 bg-white/5" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste raw WH-347 payroll schema logs here..."
              className="min-h-[110px] flex-1 bg-black/40 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 text-xs rounded-xl transition-all"
              disabled={disabled}
            />
            <Button
              onClick={() => { if (text.trim()) onTextSubmit(text.trim()); }}
              disabled={disabled || !text.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-10 px-5 rounded-xl transition-all w-full sm:w-auto shrink-0"
            >
              Analyze Schedule
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

