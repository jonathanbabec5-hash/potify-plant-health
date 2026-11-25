import {parseFeed} from "./model.js";

export async function fetchFeed(url, token) {
  const headers = new Headers({Accept:"application/json"});
  if (token) headers.set("Authorization","Bearer " + token);
  let response;
  try {
    response = await fetch(url,{
      headers,mode:"cors",credentials:"omit",redirect:"error",cache:"no-store",
      referrerPolicy:"no-referrer",signal:AbortSignal.timeout(10000)
    });
  } catch (error) {
    throw new Error(error.name === "TimeoutError" ? "The probe feed timed out." : "Could not reach the feed. Check the URL and cross-origin access.");
  }
  if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}. Check its URL or read-only token.`);
  if (Number(response.headers.get("Content-Length")) > 1_000_000) throw new Error("The probe feed is over 1 MB.");
  const stream = response.body?.getReader();
  if (!stream) throw new Error("The feed returned an empty response.");
  let total = 0;
  const chunks = [];
  try {
    for (;;) {
      const {value,done} = await stream.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1_000_000) throw new Error("The probe feed is over 1 MB.");
      chunks.push(value);
    }
  } catch (error) {
    await stream.cancel().catch(() => {});
    throw error;
  }
  const text = await new Blob(chunks).text();
  let body;
  try { body = JSON.parse(text); }
  catch { throw new Error("The feed must return valid JSON."); }
  return parseFeed(body);
}

