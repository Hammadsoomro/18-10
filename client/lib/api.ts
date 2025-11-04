export async function apiFetch(input: string, init?: RequestInit) {
  try {
    // Try relative first
    const res = await fetch(input, init);
    return res;
  } catch (err) {
    // If relative failed (network), try prefixed with origin (fallback)
    try {
      if (typeof window !== "undefined" && window.location && window.location.origin) {
        const alt = window.location.origin.replace(/\/$/, "") + input;
        const res2 = await fetch(alt, init);
        return res2;
      }
    } catch (e) {
      // fallthrough
    }
    throw err;
  }
}
