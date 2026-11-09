import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

/** Countdown for timed series (150 s, 20 s, 10 s …). Vibrates and beeps at zero. */
export function SeriesTimer({ seconds }: { seconds: number }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);

  useEffect(() => {
    if (endsAt == null) return;
    fired.current = false;
    const tick = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(tick);
  }, [endsAt]);

  const left = endsAt == null ? seconds : Math.max(0, (endsAt - now) / 1000);
  const running = endsAt != null && left > 0;

  useEffect(() => {
    if (endsAt != null && left === 0 && !fired.current) {
      fired.current = true;
      navigator.vibrate?.([200, 100, 200]);
      beep();
    }
  }, [endsAt, left]);

  const label = left >= 10 ? Math.ceil(left).toString() : left.toFixed(1).replace(".", ",");

  return (
    <button
      type="button"
      onClick={() => {
        if (running || (endsAt != null && left === 0)) {
          setEndsAt(null);
        } else {
          setNow(Date.now());
          setEndsAt(Date.now() + seconds * 1000);
        }
      }}
      className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 font-semibold tabular-nums ${
        endsAt != null && left === 0
          ? "border-miss bg-miss text-bg"
          : running
            ? "border-brass text-brass"
            : "border-line text-fg"
      }`}
      aria-label={
        running
          ? `${Math.ceil(left)} sekunder igjen, trykk for å nullstille`
          : `Start ${seconds} sekunders klokke`
      }
    >
      {running || (endsAt != null && left === 0) ? (
        <RotateCcw className="size-4" aria-hidden="true" />
      ) : (
        <Play className="size-4" aria-hidden="true" />
      )}
      {label} s
    </button>
  );
}

function beep() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => void ctx.close();
  } catch {
    /* audio unavailable */
  }
}
