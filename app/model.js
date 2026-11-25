const DAY = 86_400_000;
export const eventTypes = {
  height: {label: "Height measurement", icon: "ruler"},
  watering: {label: "Watering", icon: "drop"},
  soil: {label: "Soil observation", icon: "soil"},
  test: {label: "Soil test", icon: "flask"},
  photo: {label: "Progress photo", icon: "camera"},
  note: {label: "Grow note", icon: "note"}
};
export const stages = ["Seedling", "Vegetative", "Flowering", "Fruiting", "Dormant", "Mature"];
export const metricInfo = {
  moisture: {label: "Soil moisture", unit: "%", icon: "drop", tint: "", key: "moisturePct"},
  temperature: {label: "Root-zone temp.", unit: "°C", icon: "thermometer", tint: "blue", key: "temperatureC"},
  height: {label: "Plant height", unit: "cm", icon: "ruler", tint: "gold", key: "height"}
};

export function id() {
  return crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join("-");
}

export function sampleWorkspace(now = Date.now()) {
  const days = (count, hour = 10) => {
    const d = new Date(now);
    d.setHours(hour, 0, 0, 0);
    if (d.getTime() > now) d.setTime(now);
    d.setDate(d.getDate() - count);
    return d.toISOString();
  };
  const example = {id: "example-basil", name: "Genovese Basil", species: "Basil", stage: "Vegetative", substrate: "Living soil · fabric pot", created: days(24), demo: true, connection: null, readings: [], events: []};
  const moisture = [36,35,35,42,41,40,38,35,33,39,37,35,32,39,38,35,33,44,43,41,39,36,34,42,40,38,43,42];
  const temperatures = [21.1,21.5,21.8,22.2,21.7,21.3,21.6,22.5,22.4,22.2,22.5,22.1,22,21.9,22.6,22.3,22.8,23,22.6,22.1,21.8,22.3,22.8,22.3,22.7,23.2,23.4,23.1];
  for (let i = 0; i < moisture.length; i++) {
    const ts = new Date(Date.parse(days(13)) + i * DAY / 2).toISOString();
    if (Date.parse(ts) > now) continue;
    example.readings.push({ts, moisturePct: moisture[i], temperatureC: temperatures[i], source: "demo"});
  }
  // Make the newest sample match the dashboard at any time of day.
  example.readings.push({ts: new Date(now).toISOString(), moisturePct: 42, temperatureC: 23.1, source: "demo"});
  example.events = [
    {id:"sample-1", type:"height", ts:days(0), height:24.6, text:"New growth at the tip.", source:"demo"},
    {id:"sample-2", type:"watering", ts:days(1,16), amount:320, text:"Watered evenly across the surface.", source:"demo"},
    {id:"sample-3", type:"soil", ts:days(3), text:"Mulch intact. Earthy smell at the surface.", source:"demo"},
    {id:"sample-4", type:"height", ts:days(4), height:21.4, text:"Measured from the soil line.", source:"demo"},
    {id:"sample-5", type:"watering", ts:days(5), amount:300, text:"Watered slowly.", source:"demo"},
    {id:"sample-6", type:"height", ts:days(7), height:19.2, text:"Measured from the soil line.", source:"demo"},
    {id:"sample-7", type:"watering", ts:days(9), amount:300, text:"Watered before noon.", source:"demo"},
    {id:"sample-8", type:"height", ts:days(12), height:15.7, text:"First measurement this week.", source:"demo"}
  ];
  return {version:1, selected:example.id, plants:[example]};
}

export function currentPlant(workspace) {
  return workspace.plants.find(plant => plant.id === workspace.selected) ?? workspace.plants[0];
}

export function ageInDays(plant, now = Date.now()) {
  const difference = now - Date.parse(plant.created);
  return Math.max(1, Math.floor(difference / DAY) + 1);
}

export function timeText(timestamp) {
  return new Intl.DateTimeFormat(undefined, {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"}).format(new Date(timestamp));
}

export function dateText(timestamp) {
  return new Intl.DateTimeFormat(undefined, {month:"short",day:"numeric"}).format(new Date(timestamp));
}

export function numericText(value) {
  return new Intl.NumberFormat(undefined, {maximumFractionDigits: 1}).format(value);
}

export function formatValue(value, unit) {
  return `${numericText(value)}${unit === "%" ? "" : " "}${unit}`;
}

export function newest(entries) {
  return [...entries].sort((a,b) => Date.parse(b.ts) - Date.parse(a.ts));
}

export function seriesFor(plant, metric) {
  const key = metricInfo[metric].key;
  const entries = metric === "height" ? plant.events : plant.readings;
  return newest(entries).reverse().filter(item => Number.isFinite(item[key])).map(item => ({
    ts:item.ts, value:item[key], source:item.source ?? "manual", sourceId:item.feedId ?? item.source ?? "manual"
  }));
}

export function latestSoil(plant) {
  return newest(plant.events.filter(item => item.type === "soil" || item.type === "test"));
}

export function eventLabel(event) {
  if (event.type === "height") return `${formatValue(event.height, "cm")} height logged`;
  if (event.type === "watering" && event.amount != null) return `${formatValue(event.amount, "mL")} watered`;
  return eventTypes[event.type].label;
}

export function dataSource(plant) {
  if (plant.demo) return {css:"demo", title:"Demo data", description:"Sample plant and readings"};
  if (plant.connection?.error) return {css:"demo", title:"Sync paused", description:"Check the last connection attempt"};
  if (!plant.connection) return {css:"manual", title:"Manual tracking", description:"Add readings as you go"};
  const stale = Date.now() - Date.parse(plant.connection.newestTs) > DAY;
  return stale
    ? {css:"demo", title:"Probe data delayed", description:"Latest reading is over 24 hours old"}
    : {css:"", title:"Probe feed connected", description: `${plant.connection.name} · ${timeText(plant.connection.newestTs)}`};
}

export function latestDelta(plant, metric) {
  const series = seriesFor(plant, metric);
  const recent = series.at(-1);
  if (!recent) return {recent:null, delta:null};
  const previous = series.slice(0, -1).reverse().find(point => point.sourceId === recent.sourceId);
  return {recent, delta: previous ? recent.value - previous.value : null};
}

export function describeTrend(plant, metric, days = 7) {
  const series = seriesFor(plant, metric);
  const last = series.at(-1);
  if (!last) return "No readings recorded.";
  const {label,unit} = metricInfo[metric];
  const similar = series.filter(point => point.sourceId === last.sourceId && Date.parse(point.ts) >= Date.parse(last.ts) - days * DAY);
  const first = similar[0];
  const difference = last.value - first.value;
  let change = "Add more readings from the same source to see a trend.";
  if (similar.length > 1) {
    const elapsed = Math.max(1, Math.round((Date.parse(last.ts) - Date.parse(first.ts)) / 3_600_000));
    const duration = elapsed < 48 ? `${elapsed} hours` : `${Math.round(elapsed / 24)} days`;
    const variation = Math.abs(difference) < 0.05
      ? "held steady"
      : `${difference > 0 ? "rose" : "fell"} by ${metric === "moisture" ? numericText(Math.abs(difference)) + " percentage points" : formatValue(Math.abs(difference), unit)}`;
    change = `${label} ${variation} over ${duration}.`;
  }
  return `${change} Latest ${formatValue(last.value,unit)} · ${timeText(last.ts)}.`;
}

export function briefFor(plant) {
  const moisture = seriesFor(plant, "moisture");
  const height = seriesFor(plant, "height");
  const latestHeight = height.at(-1);
  const latestMoisture = moisture.at(-1);
  const water = newest(plant.events.filter(event => event.type === "watering"))[0];
  if (plant.demo) {
    return "Soil moisture is at 42% in the sample feed. Compare the dry-down after watering with the next growth check-in.";
  }
  if (!latestMoisture && !latestHeight) return "Add your first soil reading and height measurement to establish this plant’s baseline.";
  if (latestMoisture && water && Date.parse(latestMoisture.ts) > Date.parse(water.ts)) {
    return `${formatValue(latestMoisture.value, "%")} soil moisture at the latest reading. Compare it with the last watering on ${dateText(water.ts)}.`;
  }
  if (latestMoisture) return describeTrend(plant, "moisture");
  return describeTrend(plant, "height");
}

export function localAnswer(plant, question) {
  const q = question.toLowerCase();
  const recentSoil = latestSoil(plant)[0];
  const water = newest(plant.events.filter(event => event.type === "watering"))[0];
  const parts = [];
  if (/water|dry|moist/.test(q)) {
    parts.push(describeTrend(plant, "moisture"));
    parts.push(water ? `${eventLabel(water)} on ${timeText(water.ts)}.` : "Log a watering event to compare the readings before and after it.");
    parts.push("Check moisture at the same spot and depth before comparing readings. Use the plant’s recent history as your baseline.");
  } else if (/biolog|microb|soil test|respirat|organism/.test(q)) {
    parts.push(recentSoil ? `${eventLabel(recentSoil)} on ${dateText(recentSoil.ts)}. ${recentSoil.text}` : "There are no soil observations or test results for this plant yet.");
    parts.push("Moisture and temperature describe the root-zone conditions. Record a biological observation or a soil respiration test for a separate line of evidence.");
  } else if (/growth|height|tall|progress/.test(q)) {
    parts.push(describeTrend(plant, "height"));
    parts.push("Measure from the soil line and take the next photo from the same angle and distance.");
  } else if (/temp|warm|cold/.test(q)) {
    parts.push(describeTrend(plant, "temperature"));
    parts.push("Compare readings from the same depth and around the same time of day.");
  } else {
    parts.push(briefFor(plant));
    parts.push("If you’re tracking a symptom, record where it started and when it first appeared. A dated whole-plant photo and a close-up give Plant Doctor more context.");
  }
  return parts.join("\n\n");
}

export function reviewContext(plant) {
  return {
    name:plant.name, species:plant.species, stage:plant.stage, substrate:plant.substrate, example:Boolean(plant.demo),
    measurements:Object.fromEntries(Object.keys(metricInfo).map(metric => [metric,seriesFor(plant,metric).slice(-18).map(({ts,value,source}) => ({ts,value,source}))])),
    journal:newest(plant.events).slice(0,12).map(({type,ts,height,amount,text}) => ({type,ts,height,amount,text}))
  };
}

function optionalNumber(value, minimum, maximum) {
  if (value === "" || value == null) return null;
  if (!["number","string"].includes(typeof value) || typeof value === "string" && !value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < minimum || n > maximum) throw new Error(`${minimum} to ${maximum} is the supported range.`);
  return n;
}

export function normalizeReading(raw, source, requireNumbers = false) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Every reading needs a timestamp and measurement.");
  const ts = raw.timestamp;
  if (typeof ts !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(ts) || !Number.isFinite(Date.parse(ts))) {
    throw new Error("Use a timestamp with a time zone, such as 2026-11-12T15:30:00Z.");
  }
  if (Date.parse(ts) > Date.now() + 300_000) throw new Error("A reading timestamp is more than five minutes in the future.");
  if (requireNumbers && [raw.moisturePct,raw.temperatureC].some(value => value != null && typeof value !== "number")) throw new Error("Probe measurements must be JSON numbers.");
  let moisturePct;
  let temperatureC;
  try { moisturePct = optionalNumber(raw.moisturePct,0,100); }
  catch { throw new Error("Soil moisture must be between 0% and 100%."); }
  try { temperatureC = optionalNumber(raw.temperatureC,-30,80); }
  catch { throw new Error("Root-zone temperature must be between -30 and 80 °C."); }
  if (moisturePct == null && temperatureC == null) throw new Error("Each reading needs soil moisture, root-zone temperature, or both.");
  return {ts:new Date(ts).toISOString(),moisturePct,temperatureC,source};
}

export function parseFeed(payload) {
  const rows = Array.isArray(payload?.readings) ? payload.readings : [payload];
  if (!rows.length || rows.length > 500) throw new Error("A probe feed must return 1–500 readings.");
  return rows.map(item => normalizeReading(item, "probe", true));
}

export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/,"").trim().split(/\r?\n/).filter(line => line.trim());
  if (lines.shift()?.replace(/\s/g,"") !== "timestamp,moisturePct,temperatureC") throw new Error("Use the header timestamp,moisturePct,temperatureC.");
  if (!lines.length || lines.length > 500) throw new Error("Import between 1 and 500 readings per file.");
  return lines.map((line,index) => {
    const [timestamp,moisturePct,temperatureC,...extra] = line.split(",").map(cell => cell.trim().replace(/^"|"$/g,""));
    if (extra.length || temperatureC === undefined) throw new Error(`${index + 2}: use three CSV columns.`);
    try { return normalizeReading({timestamp,moisturePct,temperatureC}, "csv"); }
    catch (error) { throw new Error(`${index + 2}: ${error.message}`); }
  });
}

export function mergeReadings(existing, additions) {
  const keyOf = row => `${row.feedId ?? row.source}:${row.ts}`;
  const merged = new Map(existing.map(row => [keyOf(row),row]));
  for (const row of additions) {
    const key = keyOf(row);
    const prior = merged.get(key);
    merged.set(key, {...row,moisturePct:row.moisturePct ?? prior?.moisturePct ?? null,temperatureC:row.temperatureC ?? prior?.temperatureC ?? null});
  }
  return newest([...merged.values()]);
}

export function useRange(series, range) {
  if (!series.length) return series;
  const anchor = Date.parse(series.at(-1).ts);
  return series.filter(item => Date.parse(item.ts) >= anchor - range * DAY);
}

export function browserDate(now = new Date()) {
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0,16);
}

export function datedInput(value) {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts) || ts > Date.now() + 300_000) throw new Error("Enter a valid date and time through today.");
  return new Date(ts).toISOString();
}
