/**
 * Schedule runner — polls /api/admin/blog/schedule/process every 30 seconds.
 * Designed to run as a background interval in the Next.js process.
 */

let _timer: ReturnType<typeof setInterval> | null = null;

export function startScheduleRunner(intervalMs = 30_000): void {
  if (_timer) {
    // Already running
    return;
  }

  console.log(`[schedule] Runner started (interval: ${intervalMs / 1000}s)`);

  const tick = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/admin/blog/schedule/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.error(`[schedule] Process endpoint returned ${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.processed > 0) {
        console.log(`[schedule] Triggered processing of ${data.processed} posts`);
      }
    } catch (err) {
      // Silently ignore — server might not be ready yet, or network issue
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("ECONNREFUSED")) {
        // Server not ready yet — skip this tick
      } else {
        console.warn(`[schedule] Tick failed: ${msg}`);
      }
    }
  };

  // Run first tick immediately (with a small delay to let the server start)
  setTimeout(() => {
    tick();
    _timer = setInterval(tick, intervalMs);
  }, 5_000);
}

export function stopScheduleRunner(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log("[schedule] Runner stopped");
  }
}
