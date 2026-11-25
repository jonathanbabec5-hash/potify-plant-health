import {seriesFor} from "./model.js";

const HOUR = 3_600_000;
const HORIZON = 12;

function percentile(sorted, fraction) {
  const index = (sorted.length - 1) * fraction;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

export function soilForecast(plant, now = Date.now()) {
  const all = seriesFor(plant,"moisture");
  const last = all.at(-1);
  if (!last) return {status:"insufficient"};
  const lastTime = Date.parse(last.ts);
  if (now - lastTime >= HORIZON * HOUR) return {status:"stale"};

  const times = plant.events.filter(item => item.type === "watering").map(item => Date.parse(item.ts));
  if (times.some(time => time > lastTime && time <= now)) return {status:"watered"};
  const points = all.filter(point => point.sourceId === last.sourceId && Date.parse(point.ts) >= lastTime - 30 * 24 * HOUR);
  const intervals = [];
  for (let i = 1; i < points.length; i++) {
    const before = points[i - 1], after = points[i];
    const start = Date.parse(before.ts), end = Date.parse(after.ts);
    const hours = (end - start) / HOUR;
    const change = after.value - before.value;
    if (hours < 1 || hours > 36 || change > .2) continue;
    if (times.some(time => time > start && time <= end)) continue;
    intervals.push({hours,level:(before.value + after.value) / 2,rate:Math.max(0,-change / hours)});
  }
  const hours = intervals.reduce((total, interval) => total + interval.hours,0);
  if (intervals.length < 4 || hours < 36) return {status:"insufficient"};

  // Nearest-neighbor regression uses past dry-down intervals at comparable moisture levels.
  const neighbors = intervals.sort((a,b) => Math.abs(a.level-last.value) - Math.abs(b.level-last.value)).slice(0,8);
  const totalWeight = neighbors.reduce((total,item) => total + item.hours,0);
  const rate = neighbors.reduce((total,item) => total + item.rate * item.hours,0) / totalWeight;
  const rates = neighbors.map(item => item.rate).sort((a,b) => a-b);
  const project = n => Math.max(0,Math.round((last.value - HORIZON * n)*10)/10);
  const estimate = project(rate);
  return {
    status:"ready",
    estimate,
    low:Math.min(estimate,project(percentile(rates,.75))),
    high:Math.max(estimate,project(percentile(rates,.25))),
    hours:HORIZON,
    count:neighbors.length,
    source:last.source,
    asOf:last.ts,
    at:new Date(lastTime + HORIZON * HOUR).toISOString()
  };
}
