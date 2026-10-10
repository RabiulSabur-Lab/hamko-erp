import { useState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mic, MicOff, Send, Loader2, Bot, Wand2, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseVoiceOrder, type ParsedVoiceItem } from "@/services/geminiService";
import { toast } from "sonner";

interface SmartOrderAIModalProps {
  open: boolean;
  onClose: () => void;
  products: any[];
  onAddItems: (parsedItems: ParsedVoiceItem[]) => void;
}

export function SmartOrderAIModal({
  open,
  onClose,
  products,
  onAddItems,
}: SmartOrderAIModalProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedVoiceItem[] | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "bn-BD"; // Primary Bengali speech recognition with English fallback

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInputText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech Recognition is not supported on this browser. You can type or paste below.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Listening... Speak in Bengali or English");
      } catch (err) {
        console.warn("Error starting speech recognition:", err);
      }
    }
  };

  const handleParse = async () => {
    const textToParse = inputText.trim();
    if (!textToParse) {
      toast.error("Please speak or enter an order description first.");
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch {}
    }

    setLoading(true);
    setParsedPreview(null);

    try {
      const items = await parseVoiceOrder(textToParse, products);
      if (items.length === 0) {
        toast.error("Could not match any products in the catalog. Please check your wording.");
        setLoading(false);
        return;
      }

      setParsedPreview(items);
      toast.success(`Gemini AI matched ${items.length} item(s)!`);
    } catch (err: any) {
      console.warn("Parse voice order catch:", err);
      toast.error(err?.message || "Failed to parse order with Gemini AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndInsert = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    onAddItems(parsedPreview);
    toast.success(`Added ${parsedPreview.length} item(s) to order table!`);
    onClose();
    setInputText("");
    setParsedPreview(null);
  };

  const samplePrompts = [
    "১০টা D10 কুকার আর ৫টা B12 কুকার দাও",
    "5 pcs Pressure Cooker 4.5L D10 and 10 pcs Nonstick Kadai DP",
    "সাদিয়া স্টোরকে ১২টা D12 প্রেশার কুকার পাঠিয়ে দাও",
  ];

  return (
    <Dialog open={open} onClose={onClose} title="Smart AI Order Entry" size="md">
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed -mt-2">
          Speak in Bengali/English or type your order request. Gemini 1.5 Flash will automatically match SKUs, quantities, and dealer price tiers.
        </p>

        {/* Input area */}
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              rows={4}
              placeholder="e.g. ১০টা D10 কুকার আর ৫টা B12 ফ্রাইপ্যান দাও..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="text-xs sm:text-sm pr-12 resize-none"
              autoFocus
            />

            {recognitionSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse shadow-md ring-4 ring-rose-500/20"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
                title={isListening ? "Stop Listening" : "Start Voice Dictation"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>

          {isListening && (
            <div className="flex items-center gap-2 text-xs text-rose-600 font-medium animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              <span>Listening to voice input... speak clearly into your microphone.</span>
            </div>
          )}
        </div>

        {/* Quick Sample Prompts */}
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Wand2 className="h-3 w-3 text-primary" /> Try 1-Click Sample Prompts:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(p)}
                className="text-[11px] py-1 px-2.5 rounded-full border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all text-left truncate max-w-full"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Parsed items preview */}
        {parsedPreview && parsedPreview.length > 0 && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Gemini AI Matched Items ({parsedPreview.length})
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                Ready to Insert
              </Badge>
            </div>
            <div className="divide-y divide-emerald-500/20 max-h-36 overflow-y-auto">
              {parsedPreview.map((item, i) => {
                const prod = products.find((p) => String(p.id) === String(item.productId));
                return (
                  <div key={i} className="py-1.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-medium text-foreground truncate">{prod?.name || item.productName || "Product"}</p>
                      <p className="text-[10px] text-muted-foreground">SKU: {prod?.sku_code || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-foreground">{item.qty} pcs</span>
                      <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {item.tier || "DP"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            {parsedPreview && parsedPreview.length > 0 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmAndInsert}
                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Apply to Order Table
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleParse}
                disabled={loading || !inputText.trim()}
                className="text-xs h-8 gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Parsing with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Parse with Gemini AI
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default SmartOrderAIModal;
