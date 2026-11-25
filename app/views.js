import {ageInDays, briefFor, dataSource, dateText, eventLabel, eventTypes, formatValue, latestDelta, latestSoil, metricInfo, newest, numericText, seriesFor, timeText, useRange} from "./model.js";

import {soilForecast} from "./forecast.js";

export const routes = {
  overview: ["Overview", "grid", "Home"],
  soil: ["Living Soil", "soil", "Soil"],
  journal: ["Grow Journal", "journal", "Journal"],
  doctor: ["Plant Doctor", "sparkles", "Doctor"],
  devices: ["Devices", "sensor", "Devices"]
};

const icons = {
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
  sprout:'<path d="M12 21v-8m0 3a8 8 0 0 1 8-8h1v1a8 8 0 0 1-8 8m-1 1a7 7 0 0 0-7-7H3v1a7 7 0 0 0 7 7h2M8 21h8"/>',
  soil:'<path d="M3 15h18M4 19c2 0 2 1.3 4 1.3S10 19 12 19s2 1.3 4 1.3 2-1.3 4-1.3M12 15V8m0 2c0-4 3-6 7-6-1 4-3 6-7 6Zm0 2c-4 0-6-2-7-5 4 0 7 2 7 5Z"/>',
  journal:'<path d="M6 4h12a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm1 0v16m3-11h6m-6 4h5"/>',
  sensor:'<rect x="5" y="3.5" width="14" height="16" rx="3"/><path d="M9 20v1m6-1v1M9 8.5a5.5 5.5 0 0 1 6 0m-5 3a3.5 3.5 0 0 1 4 0m-2 3h.01"/>',
  sparkles:'<path d="M12 2.5 14.2 9.7 21.5 12l-7.3 2.3L12 21.5l-2.3-7.2L2.5 12l7.2-2.3L12 2.5Zm7.7 1v4.4m2.2-2.2h-4.4"/>',
  drop:'<path d="M12 2.9c2.6 4.2 5.9 7.8 5.9 11.5a5.9 5.9 0 1 1-11.8 0c0-3.7 3.3-7.3 5.9-11.5Zm-2.4 12.3c.2 1.2.9 1.9 2.2 2.2"/>',
  thermometer:'<path d="M9 14.4V5.5a3 3 0 0 1 6 0v8.9a4.5 4.5 0 1 1-6 0Zm3-6.9v8.1"/><circle cx="12" cy="17.6" r="1.2"/>',
  ruler:'<path d="m3.5 15.3 11.8-11.8a1 1 0 0 1 1.4 0l3.8 3.8a1 1 0 0 1 0 1.4L8.7 20.5a1 1 0 0 1-1.4 0l-3.8-3.8a1 1 0 0 1 0-1.4Z"/><path d="m13 5.8 2 2m-5.2 1.2 2 2m-5.2 1.2 2 2"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  chevron:'<path d="m10 6 6 6-6 6"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  note:'<path d="M7 4h10l2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 6h6m-6 4h6"/>',
  flask:'<path d="M9 3h6m-5 0v7l-5.5 8.1A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.9L14 10V3M8 15h8"/>',
  camera:'<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.4" r="3.1"/>',
  pulse:'<path d="M2.5 12h4.3l2.1-4.4 3.2 9.2 2.6-5.5h6.8"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  refresh:'<path d="M19.5 9a8 8 0 1 0 .1 5.3M20 4v5h-5"/>',
  upload:'<path d="M12 16V4m-4 4 4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>',
  external:'<path d="M14 5h5v5m0-5-7 7m5 1v5H6V7h5"/>'
};

export const safe = value => String(value ?? "").replace(/[&<>"']/g, mark => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[mark]);
export const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${icons[name] ?? ""}</svg>`;
const tile = (name, tint = "") => `<span class="tile-icon ${tint}">${icon(name)}</span>`;
export const action = (label,name,style = "secondary",glyph = "",attrs = "") => `<button type="button" class="button ${style}" data-action="${name}" ${attrs}>${glyph ? icon(glyph) : ""}${label}</button>`;
const routeLink = (label, route) => `<a class="link" href="#${route}">${label} ${icon("arrow")}</a>`;
const external = (label, url) => `<a class="link" href="${url}" target="_blank" rel="noopener">${label} ${icon("external")}</a>`;
const plantDoctorURL = "https://potifywebsite.com/plant-doctor";

export function nav(route, mobile) {
  return Object.entries(routes).map(([key,[label,glyph,short]]) => `<a href="#${key}" data-route="${key}" class="nav-link" ${key === route ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${mobile ? short : label}</span></a>`).join("");
}

export function sourceChip(plant) {
  const state = dataSource(plant);
  return `<span class="dot ${state.css}"></span><span>${safe(state.title)}</span>`;
}

export function sidebarState(plant) {
  return `<a href="#devices">${sourceChip(plant)}</a><small>${safe(dataSource(plant).description)}</small>`;
}

export function topbar(route, plant) {
  return `<div class="topbar-trail">${icon("sprout")}<span>My grow room</span><span class="divider">${icon("chevron")}</span><b>${routes[route][0]}</b></div><div class="topbar-actions"><button class="source-chip" type="button" data-action="devices">${sourceChip(plant)}</button>${action("Log entry","log","primary","plus")}</div>`;
}

function switchPlant(plant) {
  return `<button class="plant-switch" type="button" data-action="plants" aria-label="Choose plant, current plant ${safe(plant.name)}">${icon("sprout")}<strong>${safe(plant.name)}</strong><span>· Day ${ageInDays(plant)}</span>${icon("down")}</button>`;
}

function pageTitle(title, subtitle, plant) {
  return `<div class="page-title"><div><h1>${title}</h1><p>${subtitle}</p></div>${switchPlant(plant)}</div>`;
}

function pointSource(point) {
  return {demo:"Sample", manual:"Manual", probe:"Probe", csv:"CSV import"}[point.source] ?? "Manual";
}

function metricTile(plant, key) {
  const {label, unit, icon:glyph, tint} = metricInfo[key];
  const {recent, delta} = latestDelta(plant,key);
  if (!recent) return metricCard(label,glyph,tint,"—","","Awaiting a reading");
  const change = delta == null ? timeText(recent.ts) : `${delta > .05 ? "+" : delta < -.05 ? "−" : ""}${numericText(Math.abs(delta))}${key === "moisture" ? " pp" : " " + unit} vs. previous`;
  return metricCard(label,glyph,tint,numericText(recent.value),unit,`${pointSource(recent)} · ${change}`);
}

function metricCard(label, glyph, tint, value, unit, sub) {
  return `<article class="metric"><div class="metric-title">${tile(glyph,tint)}${label}</div><div class="metric-value">${safe(value)}${unit ? `<span>${safe(unit)}</span>` : ""}</div><small class="metric-sub">${safe(sub)}</small></article>`;
}

function metrics(plant) {
  const notes = latestSoil(plant);
  return `<div class="metric-grid">${metricTile(plant,"moisture")}${metricTile(plant,"temperature")}${metricTile(plant,"height")}${metricCard("Soil observations","soil","",notes.length,"",notes.length ? `Last logged ${dateText(notes[0].ts)}` : "Add an observation or soil test")}</div>`;
}

function chartSvg(points, events, unit) {
  const width = 590, height = 184, left = 41, right = width - 24, top = 12, bottom = 148;
  const first = Date.parse(points[0].ts), last = Date.parse(points.at(-1).ts);
  const span = Math.max(last - first,1);
  const min = Math.min(...points.map(point => point.value));
  const max = Math.max(...points.map(point => point.value));
  const step = (max - min || Math.max(Math.abs(max)*.08,1))/4;
  const floor = unit === "%" ? Math.max(0,min-step) : min-step;
  const ceiling = unit === "%" ? Math.min(100,max+step) : max+step;
  const x = timestamp => points.length === 1 || span === 1 ? (left+right)/2 : left+(Date.parse(timestamp)-first)/span*(right-left);
  const y = value => bottom-(value-floor)/(ceiling-floor)*(bottom-top);
  const coordinates = points.map(point => [x(point.ts),y(point.value)]);
  const oneSource = points.every(point => point.sourceId === points[0].sourceId);
  const line = coordinates.map(([cx,cy],i) => `${i && points[i].sourceId === points[i-1].sourceId ? "L" : "M"}${cx.toFixed(1)} ${cy.toFixed(1)}`).join(" ");
  const grid = [0,.3333,.6667,1].map(fraction => {
    const value = floor+(ceiling-floor)*fraction;
    return `<line class="chart-grid" x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}"/><text x="${left-6}" y="${y(value)+3}" text-anchor="end">${safe(numericText(value))}${unit === "%" ? "%" : ""}</text>`;
  }).join("");
  const times = span <= 1 ? [first] : [first, first+span/2, last];
  const labels = times.map((ts,index) => {
    const stamp = new Date(ts).toISOString();
    const label = span > 36 * 3_600_000 ? dateText(stamp) : new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"}).format(new Date(ts));
    const anchor = times.length === 1 || index === 1 ? "middle" : index === 0 ? "start" : "end";
    return `<text x="${x(stamp)}" y="${height-9}" text-anchor="${anchor}">${safe(label)}</text>`;
  }).join("");
  const markers = events.filter(event => Date.parse(event.ts) >= first && Date.parse(event.ts) <= last).slice(0,30).map(event => {
    const cx = x(event.ts);
    return `<line class="chart-event" x1="${cx}" x2="${cx}" y1="${top}" y2="${bottom}"><title>Watering · ${safe(timeText(event.ts))}</title></line><circle cx="${cx}" cy="${bottom}" r="2.5" fill="#e4ba79"/>`;
  }).join("");
  const area = oneSource && coordinates.length > 1 ? `<path class="chart-area" d="${line} L${coordinates.at(-1)[0]} ${bottom} L${coordinates[0][0]} ${bottom} Z"/>` : "";
  const circles = points.length > 120 && oneSource ? [points.at(-1)] : points;
  const dots = circles.map(point => `<circle class="chart-point" cx="${x(point.ts)}" cy="${y(point.value)}" r="${point === points.at(-1) ? 4.4 : 2.5}"><title>${safe(formatValue(point.value,unit))} · ${safe(timeText(point.ts))} · ${pointSource(point)}</title></circle>`).join("");
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${points.length === 1 ? "1 reading, " + safe(formatValue(points[0].value,unit)) : points.length + " readings, from " + safe(formatValue(points[0].value,unit)) + " to " + safe(formatValue(points.at(-1).value,unit))}"><defs><linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#9bc273" stop-opacity=".24"/><stop offset="1" stop-color="#9bc273" stop-opacity="0"/></linearGradient></defs>${grid}${area}${markers}<path class="chart-line" d="${line}"/>${dots}${labels}</svg>`;
}

function chartPanel(plant, chart, options = {}) {
  const available = options.metrics ?? ["moisture","temperature","height"];
  const key = available.includes(chart.metric) ? chart.metric : available[0];
  const {unit} = metricInfo[key];
  const points = useRange(seriesFor(plant,key), chart.range);
  const watering = plant.events.filter(event => event.type === "watering");
  const ranges = [3,7,14,30].map(days => `<button type="button" data-action="range" data-value="${days}" aria-pressed="${chart.range === days}" aria-label="${days} days">${days}d</button>`).join("");
  const names = {moisture:"Moisture",temperature:"Temperature",height:"Height"};
  const tabs = available.length > 1 ? `<div class="chart-tabs" role="group" aria-label="Measurement">${available.map(metric => `<button type="button" data-action="metric" data-value="${metric}" aria-pressed="${metric === key}">${names[metric]}</button>`).join("")}</div>` : "";
  const table = points.length ? `<details class="data-disclosure"><summary>View latest readings</summary><table><thead><tr><th scope="col">Time</th><th scope="col">${names[key]}</th><th scope="col">Source</th></tr></thead><tbody>${points.slice(-30).reverse().map(point => `<tr><td>${safe(timeText(point.ts))}</td><td>${safe(formatValue(point.value,unit))}</td><td>${pointSource(point)}</td></tr>`).join("")}</tbody></table></details>` : "";
  const body = points.length
    ? `${chartSvg(points,watering,unit)}<div class="chart-note">${icon("drop")} Watering events · window ends at the latest reading</div>${table}`
    : `<div class="empty"><p>${names[key]} readings will appear here.</p>${action(key === "height" ? "Log height" : "Add a reading",key === "height" ? "entry" : "reading","secondary","plus",key === "height" ? 'data-value="height"' : "")}</div>`;
  return `<section class="panel"><div class="panel-head"><div><h2>${options.title ?? "Root-zone trends"}</h2><p>${options.subtitle ?? "Compare readings with your watering history."}</p></div><div class="segment" role="group" aria-label="Time range">${ranges}</div></div>${tabs}${body}</section>`;
}

function eventsList(events, editable) {
  if (!events.length) return '<div class="empty"><p>No entries yet.</p></div>';
  return `<ul class="activity">${events.map(event => {
    const photo = typeof event.photo === "string" && /^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(event.photo) ? `<a href="${event.photo}" download="potify-progress.jpg"><img class="activity-photo" src="${event.photo}" alt="Plant progress photo" loading="lazy"></a>` : "";
    const remove = editable ? `<button type="button" data-action="delete-entry" data-value="${safe(event.id)}">Delete entry</button>` : "";
    return `<li>${tile(eventTypes[event.type].icon,event.type === "watering" ? "blue" : "")}<div><h3>${safe(eventLabel(event))}</h3>${event.text ? `<p>${safe(event.text)}</p>` : ""}${photo}<div class="activity-meta"><time datetime="${safe(event.ts)}">${safe(timeText(event.ts))}</time>${remove}</div></div></li>`;
  }).join("")}</ul>`;
}

function activity(plant, showAll = false) {
  const entries = newest(plant.events);
  return `<section class="panel"><div class="panel-head"><div><h2>${showAll ? "Journal timeline" : "Recent activity"}</h2><p>${showAll ? "Measurements, photos, and care notes." : "What changed in this plant’s grow."}</p></div>${showAll ? "" : routeLink("Journal","journal")}</div>${eventsList(showAll ? entries : entries.slice(0,4),showAll && !plant.demo)}</section>`;
}

function forecastPanel(plant) {
  const result = soilForecast(plant);
  const detail = {
    insufficient:"Add at least four comparable dry-down intervals across 36 hours to see an estimate.",
    stale:"Add a fresh moisture reading. The last one is at least 12 hours old.",
    watered:"Add a moisture reading after the most recent watering."
  };
  const summary = result.status === "ready"
    ? `<div class="forecast-number">${safe(numericText(result.estimate))}<span>%</span></div><p class="muted">${safe(numericText(result.low))}–${safe(numericText(result.high))}% history-based range · ${result.count} similar intervals</p><p class="forecast-note">${result.source === "demo" ? "Sample readings · " : ""}Estimate for ${safe(timeText(result.at))}, assuming no watering after the last reading.</p>`
    : `<p class="forecast-note">${detail[result.status]}</p>`;
  return `<section class="panel forecast"><div class="panel-head"><div><h2>12-hour moisture forecast</h2><p>Estimates dry-down from this plant’s reading history.</p></div><span class="biology-label">${icon("sparkles")} Local model</span></div>${summary}</section>`;
}

function overview(plant, state) {
  return `<div class="stack"><section class="hero"><img src="/assets/living-soil.webp" alt="" fetchpriority="high"><div class="hero-content"><span class="hero-kicker">${icon("soil")} Living soil monitor</span><h1>Your grow, from<br>the roots up.</h1><p>Follow the soil and the plant through every stage.</p>${switchPlant(plant)}</div></section>
  <section class="brief">${tile("sparkles")}<div><h2>Plant Doctor · soil briefing</h2><p>${safe(briefFor(plant))}</p></div>${action("Ask Plant Doctor","doctor","secondary","arrow")}</section>
  ${metrics(plant)}<div class="columns">${chartPanel(plant,state.chart,{title:"Soil & growth trends"})}<div class="stack">${forecastPanel(plant)}${activity(plant)}</div></div></div>`;
}

function soil(plant, state) {
  const notes = latestSoil(plant);
  return `<div class="stack">${pageTitle("Living Soil","Track the root-zone conditions and signs of biological activity.",plant)}${metrics(plant)}
  <div class="columns">${chartPanel(plant,state.chart,{metrics:["moisture","temperature"]})}<section class="panel"><div class="panel-head"><div><h2>Soil biology</h2><p>Grower observations and test results.</p></div><span class="biology-label">${icon("flask")} Journal</span></div><div class="indicator-list"><div><h3>Observations</h3><p>Log mulch condition, visible soil life, smell, or changes in soil structure.</p></div><div><h3>Soil tests</h3><p>Record soil respiration, pH, or lab results with the test method and units.</p></div></div><div class="button-row">${action("Log observation","entry","secondary","plus",'data-value="soil"')}${action("Log test","entry","quiet","flask",'data-value="test"')}</div></section></div>
  <div class="columns"><section class="panel"><div class="panel-head"><div><h2>Soil record</h2><p>Observations and test results for this substrate.</p></div></div>${eventsList(notes,!plant.demo)}</section><div class="stack">${forecastPanel(plant)}<section class="panel help"><h2>Soil health indicators</h2><p style="margin-top:8px">Moisture and temperature describe physical conditions. Biological observations and tests add evidence about how the soil is functioning.</p><p>${external("USDA soil health assessment","https://www.nrcs.usda.gov/conservation-basics/soil/soil-health/soil-health-assessment")}</p></section></div></div></div>`;
}

function journal(plant, state) {
  return `<div class="stack">${pageTitle("Grow Journal","Track growth, watering, and changes you can see.",plant)}
  <div class="columns"><section class="panel"><div class="panel-head"><div><h2>${safe(plant.name)}</h2><p>${safe(plant.species)} · ${safe(plant.stage)} · ${safe(plant.substrate)}</p></div>${plant.demo ? "" : action("Edit plant","edit-plant","quiet")}</div><div class="journal-toolbar">
  ${action("Measure height","entry","secondary","ruler",'data-value="height"')}${action("Add photo","entry","secondary","camera",'data-value="photo"')}${action("Log watering","entry","secondary","drop",'data-value="watering"')}${action("Add note","entry","secondary","note",'data-value="note"')}
  </div></section>${chartPanel(plant,state.chart,{metrics:["height"],title:"Height over time",subtitle:"Measurements from the grow journal."})}</div>${activity(plant,true)}</div>`;
}

function evidencePanel(plant) {
  const last = key => {
    const point = seriesFor(plant,key).at(-1);
    return point ? `${formatValue(point.value,metricInfo[key].unit)} · ${pointSource(point)} · ${timeText(point.ts)}` : "Awaiting a reading";
  };
  const lastWatering = newest(plant.events.filter(event => event.type === "watering"))[0];
  const lastBiology = latestSoil(plant)[0];
  return `<section class="panel"><div class="panel-head"><div><h2>Plant evidence</h2><p>Readings and notes for ${safe(plant.name)}.</p></div></div>
    <div class="indicator-list">
    <div><h3>Soil moisture</h3><p>${safe(last("moisture"))}</p></div>
    <div><h3>Root-zone temperature</h3><p>${safe(last("temperature"))}</p></div>
    <div><h3>Plant height</h3><p>${safe(last("height"))}</p></div>
    <div><h3>Watering</h3><p>${lastWatering ? safe(eventLabel(lastWatering) + " · " + timeText(lastWatering.ts)) : "No watering logged"}</p></div>
    <div><h3>Soil biology</h3><p>${lastBiology ? safe(lastBiology.text) : "No observation or test logged"}</p></div>
    </div>${routeLink("View living-soil record","soil")}</section>`;
}

function doctor(plant, state) {
  const messages = state.chats[plant.id] ?? [];
  const text = state.aiEnabled
    ? "Ask about a change in soil readings or plant growth. Plant Doctor can review the recent readings and journal notes with you."
    : "Ask about moisture, temperature, plant height, or soil biology for a review of this plant’s records.";
  const prompts = ["How is the soil drying?","What’s the moisture forecast?","How is growth changing?","What do we know about soil biology?"];
  const photoOption = state.aiEnabled && plant.events.some(event => event.type === "photo" && event.photo) ? '<label class="checkline"><input type="checkbox" name="include-photo"> Include latest progress photo</label>' : "";
  const mode = state.aiEnabled ? "AI review available" : "Local review";
  return `<div class="stack">${pageTitle("Plant Doctor","Review soil readings, care notes, and growth together.",plant)}
  <div class="columns doctor-layout"><section class="panel doctor-panel"><div class="panel-head"><div>${tile("sparkles")}<div><h2>Ask Plant Doctor</h2><p>${safe(plant.name)}</p></div></div><span class="doctor-mode">${mode}</span></div>
    <div class="chat-thread" role="log" aria-label="Plant Doctor conversation"><div class="chat-message"><p>${text}</p></div>${messages.map(message => `<div class="chat-message ${message.role === "user" ? "user" : ""}"><p>${safe(message.text)}</p>${message.mode ? `<small>${safe(message.mode)}</small>` : ""}</div>`).join("")}${state.pending.has(plant.id) ? '<div class="chat-message"><p>Reviewing your records…</p></div>' : ""}</div>
    <div class="chat-prompts">${prompts.map(prompt => `<button type="button" class="prompt" data-action="prompt" data-value="${safe(prompt)}" ${state.pending.has(plant.id) ? "disabled" : ""}>${safe(prompt)}</button>`).join("")}</div>
    <form class="chat-form" id="chat-form"><textarea rows="1" name="question" aria-label="Question for Plant Doctor" maxlength="800" required placeholder="Ask about this plant"></textarea>${photoOption}<button class="button primary" type="submit" ${state.pending.has(plant.id) ? "disabled" : ""}>${icon("sparkles")} Review</button></form>
    <p class="help chat-help">${state.aiEnabled ? "AI review sends the question, recent measurements, journal notes, and any selected photo for analysis." : "Local review uses rules and your entries. Open POTIFY’s existing Plant Doctor for AI photo diagnosis."}</p>
    <div class="button-row" style="margin-top:10px">${external("Open POTIFY Plant Doctor",plantDoctorURL)}${action("Copy plant summary","copy-context","quiet")}</div>
  </section>${evidencePanel(plant)}</div></div>`;
}

function devices(plant, state) {
  const connection = plant.connection;
  const busy = state.syncing.has(plant.id);
  const tokenNeeded = connection?.hasToken && !state.feedTokens.has(plant.id);
  const details = connection ? `<div class="connection-summary"><strong>${safe(connection.name)}</strong><br>Last reading · ${safe(timeText(connection.newestTs))}<br>Last successful sync · ${safe(timeText(connection.checkedAt))}${connection.error ? `<br><span class="form-error">${safe(connection.error)}</span>` : ""}${tokenNeeded ? "<br>Re-enter the read-only token to resume syncing." : ""}</div>` : "";
  return `<div class="stack">${pageTitle("Devices","Bring readings from your living-soil substrate into the grow record.",plant)}
  <div class="device-grid">
  <section class="panel device-card">${tile("sensor")}<h2>Soil probe feed</h2><p class="muted">Connect a probe or gateway that publishes an HTTPS JSON feed. Readings refresh every 15 minutes while this app is open. You can also sync manually.</p>${details}<div class="button-row">
  ${action(connection ? "Edit connection" : "Connect feed","connect","primary","plus")}
  ${connection ? action("Sync now","sync","secondary","refresh",busy ? "disabled" : "") + action("Disconnect","disconnect","quiet") : ""}</div></section>
  <section class="panel device-card">${tile("upload","blue")}<h2>Import CSV</h2><p class="muted">Import readings from a data logger or a device export.</p><div class="button-row">${action("Import readings","import","secondary","upload")}${action("Download CSV template","csv-template","quiet")}</div></section>
  <section class="panel device-card">${tile("drop","blue")}<h2>Manual readings</h2><p class="muted">Enter moisture or root-zone temperature from a handheld meter.</p><div class="button-row">${action("Add a reading","reading","secondary","plus")}</div></section>
  <section class="panel device-card">${tile("sprout")}<h2>${plant.demo ? "Try it with your plant" : "Your grow record"}</h2><p class="muted">${plant.demo ? "Add your plant to start a fresh record with your own data." : "Journal entries, photos, and imported readings are saved in this browser."}</p><div class="button-row">${action(plant.demo ? "Add your plant" : "Manage plants",plant.demo ? "add-plant" : "plants","secondary",plant.demo ? "plus" : "sprout")}</div></section>
  </div><section class="panel help"><h2>Probe feed format</h2><p style="margin-top:8px">Your gateway must allow cross-origin requests from this app and return JSON with a timestamp and one or both measurements. Use a timestamp with a timezone.</p>
  <code class="format">{"timestamp":"2026-11-12T15:30:00Z","moisturePct":42,"temperatureC":23.1}</code><p>For history, return the same objects in a <code>readings</code> array. Up to 500 records are accepted per sync. This web app connects through the feed URL.</p></section></div>`;
}

export const pages = {overview,soil,journal,doctor,devices};
