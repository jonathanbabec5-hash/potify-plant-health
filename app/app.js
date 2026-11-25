import {currentPlant, datedInput, eventTypes, id, localAnswer, mergeReadings, newest, normalizeReading, parseCsv, reviewContext, sampleWorkspace, stages} from "./model.js";
import {soilForecast} from "./forecast.js";
import {fetchFeed} from "./feed.js";
import {loadWorkspace, rememberPlant, selectedPlantId, updateWorkspace} from "./storage.js";
import {nav, pages, routes, sidebarState, sourceChip, topbar} from "./views.js";
import {entryForm, feedForm, importForm, logMenu, needsPlantDialog, plantForm, plantsDialog, readingForm, removeForm} from "./dialogs.js";

const view = document.querySelector("#view");
const modal = document.querySelector("#modal");
const notice = document.querySelector("#notice");
let tabs;
try { tabs = new BroadcastChannel("potify-grow-record"); } catch { /* A single tab can still use the grow record. */ }
const feedTokens = new Map();
const plantIdFromStorage = selectedPlantId();
let toastTimer;
let modalData = {};
let modalReturnFocus;
const state = {
  route:"overview",
  chart:{metric:"moisture",range:7},
  workspace:sampleWorkspace(),
  selected:plantIdFromStorage,
  chats:{},
  pending:new Set(),
  syncing:new Set(),
  feedTokens,
  aiEnabled:false,
  loading:true,
  storageReady:true
};

function plantNow() {
  return currentPlant({...state.workspace,selected:state.selected});
}

function routeNow() {
  const hash = location.hash.slice(1);
  return Object.hasOwn(routes,hash) ? hash : "overview";
}

function render() {
  if (state.loading) return;
  const plant = plantNow();
  document.querySelector("#desktop-nav").innerHTML = nav(state.route,false);
  document.querySelector("#mobile-nav").innerHTML = nav(state.route,true);
  document.querySelector("#sidebar-state").innerHTML = sidebarState(plant);
  document.querySelector("#mobile-source").innerHTML = sourceChip(plant);
  document.querySelector("#topbar").innerHTML = topbar(state.route,plant);
  view.innerHTML = pages[state.route](plant,state);
  view.setAttribute("aria-busy","false");
  const thread = view.querySelector(".chat-thread");
  if (thread) thread.scrollTop = thread.scrollHeight;
}

function changePage() {
  const previous = state.route;
  state.route = routeNow();
  if (state.route === previous) return;
  state.chart.metric = state.route === "journal" ? "height" : "moisture";
  render();
  window.scrollTo({top:0,behavior:"instant"});
  view.querySelector("h1")?.setAttribute("tabindex","-1");
  view.querySelector("h1")?.focus({preventScroll:true});
}

function go(route) {
  if (state.route !== route) location.hash = route;
}

function announce(message) {
  clearTimeout(toastTimer);
  notice.textContent = message;
  toastTimer = setTimeout(() => { notice.textContent = ""; },5200);
}

function showModal(html, details = {}) {
  if (!modal.open) modalReturnFocus = document.activeElement;
  modalData = details;
  modal.innerHTML = html;
  if (!modal.open) modal.showModal();
  const firstField = modal.querySelector('form input:not([type=hidden]),form select,form textarea');
  (firstField ?? modal.querySelector(".icon-button"))?.focus();
}

function withPlant(plant, callback) {
  if (plant.demo) {
    showModal(needsPlantDialog());
    return;
  }
  callback();
}

async function mutate(edit) {
  if (!state.storageReady) throw new Error("Allow browser storage to save your grow record.");
  state.workspace = await updateWorkspace(edit);
  tabs?.postMessage("updated");
}

function findPlant(workspace, plantId) {
  const plant = workspace.plants.find(item => item.id === plantId && !item.demo);
  if (!plant) throw new Error("Choose one of your plants first.");
  return plant;
}

function choosePlant(plantId) {
  state.selected = plantId;
  rememberPlant(plantId);
}

function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),5000);
}

async function copySummary(plant) {
  const summary = JSON.stringify(reviewContext(plant),null,2);
  try {
    await navigator.clipboard.writeText(summary);
    announce("Plant summary copied.");
  } catch {
    download(summary,"potify-plant-summary.json","application/json");
    announce("Plant summary downloaded.");
  }
}

function requiredText(data, key, label, max) {
  const value = String(data.get(key) ?? "").trim();
  if (!value || value.length > max) throw new Error(`Enter ${label} using up to ${max} characters.`);
  return value;
}

function numberInRange(data, key, label, min, max) {
  const value = data.get(key);
  const number = Number(value);
  if (value === "" || value == null || !Number.isFinite(number) || number < min || number > max) {
    throw new Error(`Enter ${label} from ${min} to ${max}.`);
  }
  return number;
}

async function photoData(file) {
  if (!file?.size || !file.type.startsWith("image/")) throw new Error("Choose a plant photo.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Choose a photo under 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); }
    catch { throw new Error("This photo format could not be read. Try JPEG or PNG."); }
    const scale = Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height = Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/jpeg",.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function syncFeed(plant, quiet = false) {
  const connection = plant.connection;
  if (!connection || state.syncing.has(plant.id)) return;
  const token = feedTokens.get(plant.id);
  if (connection.hasToken && !token) {
    if (!quiet) announce("Open Edit connection and enter the read-only token for this tab.");
    return;
  }
  state.syncing.add(plant.id);
  if (!quiet) render();
  try {
    const readings = (await fetchFeed(connection.url,token)).map(row => ({...row,feedId:connection.feedId}));
    let synced = false;
    await mutate(workspace => {
      const stored = findPlant(workspace,plant.id);
      if (stored.connection?.id !== connection.id) return;
      stored.readings = mergeReadings(stored.readings,readings);
      stored.connection = {...stored.connection,checkedAt:new Date().toISOString(),newestTs:newest([{ts:stored.connection.newestTs},...readings])[0].ts,error:null};
      synced = true;
    });
    if (!quiet && synced) announce("Probe feed synced.");
  } catch (error) {
    try {
      await mutate(workspace => {
        const stored = findPlant(workspace,plant.id);
        if (stored.connection?.id === connection.id) stored.connection.error = error.message;
      });
    } catch { /* Keep the previous readings if the browser cannot save the sync state. */ }
    if (!quiet) announce(error.message);
  } finally {
    state.syncing.delete(plant.id);
    if (!quiet || state.route !== "doctor") render();
  }
}

async function review(question, includePhoto = false) {
  const plant = plantNow();
  const messages = state.chats[plant.id] ??= [];
  if (!question || question.length > 800 || state.pending.has(plant.id)) return;
  state.pending.add(plant.id);
  const history = messages.slice(-4).map(({role,text}) => ({role,text}));
  messages.push({role:"user",text:question});
  render();
  let text = localAnswer(plant,question);
  const forecast = soilForecast(plant);
  if (/forecast|predict|next 12/i.test(question)) {
    const forecastReply = {
      ready:"The local forecast estimates " + forecast.estimate + "% moisture 12 hours after the last reading, assuming no watering. It uses " + forecast.count + " similar dry-down intervals.",
      insufficient:"I need at least four comparable dry-down intervals across 36 hours to estimate moisture.",
      stale:"The latest moisture reading is at least 12 hours old. Add a fresh reading before forecasting.",
      watered:"Watering was logged after the latest moisture reading. Add a post-watering reading before forecasting."
    };
    text = forecastReply[forecast.status] + "\n\n" + text;
  }
  let mode = "Local review";
  if (state.aiEnabled) {
    try {
      const photo = includePhoto ? newest(plant.events).find(event => event.type === "photo" && event.photo)?.photo : undefined;
      const response = await fetch("/api/review",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({question,plant:{...reviewContext(plant),soilForecast:forecast},history,photo}),
        signal:AbortSignal.timeout(30000)
      });
      const answer = await response.json();
      if (!response.ok || typeof answer.text !== "string" || !answer.text) throw new Error("AI review is temporarily unavailable.");
      text = answer.text;
      mode = "AI review";
    } catch {
      mode = "Local review · AI service unavailable";
    }
  }
  messages.push({role:"assistant",text,mode});
  if (messages.length > 24) messages.splice(0,messages.length-24);
  state.pending.delete(plant.id);
  if (state.route === "doctor" && plantNow().id === plant.id) {
    render();
    if (document.activeElement === document.body) view.querySelector("textarea[name=question]")?.focus({preventScroll:true});
  }
}

async function savePlant(data, details, edit) {
  const name = requiredText(data,"name","a plant name",60);
  const species = requiredText(data,"species","the species or variety",70);
  const substrate = requiredText(data,"substrate","the substrate",100);
  const stage = data.get("stage");
  const started = data.get("started");
  if (!stages.includes(stage) || !/^\d{4}-\d{2}-\d{2}$/.test(started)) throw new Error("Choose a stage and start date.");
  const created = datedInput(started+"T00:00");
  const plantId = edit ? details.plantId : id();
  await mutate(workspace => {
    if (edit) Object.assign(findPlant(workspace,plantId),{name,species,stage,substrate,created});
    else workspace.plants.push({id:plantId,name,species,stage,substrate,created,demo:false,connection:null,readings:[],events:[]});
  });
  choosePlant(plantId);
  return edit ? "Plant details updated." : "Plant added.";
}

async function saveEntry(data, {plantId}) {
  const type = data.get("type");
  if (!Object.hasOwn(eventTypes,type)) throw new Error("Choose a journal entry type.");
  const event = {id:id(),type,ts:datedInput(data.get("timestamp")),text:String(data.get("note") ?? "").trim(),source:"manual"};
  if (event.text.length > 1000) throw new Error("Keep the note under 1,000 characters.");
  if (type === "height") event.height = numberInRange(data,"height","the height",0.1,15000);
  if (type === "watering" && data.get("amount")) event.amount = numberInRange(data,"amount","the volume",1,500000);
  if (type === "photo") event.photo = await photoData(data.get("photo"));
  if (["note","soil","test"].includes(type) && !event.text) throw new Error("Write a short note for this entry.");
  await mutate(workspace => findPlant(workspace,plantId).events.push(event));
  return "Journal entry saved.";
}

async function saveReading(data, {plantId}) {
  const reading = normalizeReading({
    timestamp:datedInput(data.get("timestamp")),moisturePct:data.get("moisturePct"),temperatureC:data.get("temperatureC")
  },"manual");
  await mutate(workspace => {
    const plant = findPlant(workspace,plantId);
    plant.readings = mergeReadings(plant.readings,[reading]);
  });
  return "Soil reading saved.";
}

async function saveImport(data, {plantId}) {
  const file = data.get("csv");
  if (!file?.size || file.size > 1_000_000) throw new Error("Choose a CSV file under 1 MB.");
  const readings = parseCsv(await file.text());
  await mutate(workspace => {
    const plant = findPlant(workspace,plantId);
    plant.readings = mergeReadings(plant.readings,readings);
  });
  return `${readings.length} reading${readings.length === 1 ? "" : "s"} imported.`;
}

async function saveFeed(data, {plantId}) {
  const name = requiredText(data,"name","a feed name",60);
  const endpoint = new URL(requiredText(data,"url","an HTTPS feed URL",400));
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.hash) throw new Error("Enter an HTTPS URL without embedded credentials or a fragment.");
  const current = findPlant(state.workspace,plantId).connection;
  const token = String(data.get("token") ?? "").trim() || (current?.url === endpoint.href ? feedTokens.get(plantId) : undefined);
  if (token && !/^[\x21-\x7e]{1,512}$/.test(token)) throw new Error("Enter a valid read-only bearer token.");
  const readings = await fetchFeed(endpoint.href,token);
  await mutate(workspace => {
    const plant = findPlant(workspace,plantId);
    const sameFeed = plant.connection?.url === endpoint.href;
    const sourceChanged = Boolean(plant.connection && !sameFeed);
    const feedId = (sameFeed && plant.connection.feedId) || id();
    const received = readings.map(row => ({...row,feedId}));
    const lastReading = newest(sameFeed ? [{ts:plant.connection.newestTs},...received] : received)[0];
    plant.readings = mergeReadings(plant.readings,received);
    plant.connection = {
      id:id(),feedId,name,url:endpoint.href,checkedAt:new Date().toISOString(),newestTs:lastReading.ts,error:null,hasToken:Boolean(token)
    };
    if (sourceChanged) plant.events.push({id:id(),type:"note",ts:new Date().toISOString(),text:"Soil probe feed changed.",source:"manual"});
  });
  if (token) feedTokens.set(plantId,token);
  else feedTokens.delete(plantId);
  return `Probe connected · ${readings.length} reading${readings.length === 1 ? "" : "s"} received.`;
}

const formActions = {
  plant:(data,details) => savePlant(data,details,false),
  "edit-plant":(data,details) => savePlant(data,details,true),
  entry:saveEntry,
  reading:saveReading,
  import:saveImport,
  connect:saveFeed,
  "delete-entry":async (_, {plantId,eventId}) => {
    await mutate(workspace => {
      const plant = findPlant(workspace,plantId);
      plant.events = plant.events.filter(event => event.id !== eventId);
    });
    return "Journal entry deleted.";
  },
  disconnect:async (_, {plantId}) => {
    await mutate(workspace => { findPlant(workspace,plantId).connection = null; });
    feedTokens.delete(plantId);
    return "Probe feed disconnected. Past readings are still in the grow record.";
  }
};

const clickActions = {
  plants:plant => showModal(plantsDialog(state.workspace,plant)),
  "add-plant":() => showModal(plantForm()),
  "edit-plant":plant => withPlant(plant,() => showModal(plantForm(plant),{plantId:plant.id})),
  "select-plant":(_, value) => { choosePlant(value); modal.close(); render(); syncFeed(plantNow(),true); },
  log:plant => withPlant(plant,() => showModal(logMenu(plant))),
  entry:(plant,value) => withPlant(plant,() => showModal(entryForm(value,plant),{plantId:plant.id})),
  reading:plant => withPlant(plant,() => showModal(readingForm(plant),{plantId:plant.id})),
  import:plant => withPlant(plant,() => showModal(importForm(plant),{plantId:plant.id})),
  connect:plant => withPlant(plant,() => showModal(feedForm(plant),{plantId:plant.id})),
  sync:plant => syncFeed(plant),
  doctor:() => go("doctor"),
  devices:() => go("devices"),
  close:() => modal.close(),
  range:(_,value) => { state.chart.range = Number(value); render(); },
  metric:(_,value) => { state.chart.metric = value; render(); },
  prompt:(_,value) => review(value),
  "copy-context":copySummary,
  "csv-template":() => download("timestamp,moisturePct,temperatureC\n2026-11-12T15:30:00Z,42,23.1\n","potify-readings-template.csv","text/csv"),
  "delete-entry":(plant,value) => withPlant(plant,() => showModal(removeForm("Delete this entry?","This entry will be removed from the plant’s journal.","delete-entry","Delete entry"),{plantId:plant.id,eventId:value})),
  disconnect:plant => withPlant(plant,() => showModal(removeForm("Disconnect the probe feed?","Previous readings will stay in this plant’s record.","disconnect","Disconnect"),{plantId:plant.id}))
};

document.addEventListener("click",event => {
  if (event.target.closest(".skip")) {
    event.preventDefault();
    document.querySelector("#content")?.focus();
    return;
  }
  const control = event.target.closest("[data-action]");
  if (!control || state.loading) return;
  const {action,value} = control.dataset;
  clickActions[action]?.(plantNow(),value);
  if (action === "range" || action === "metric") {
    view.querySelector('[data-action="'+action+'"][aria-pressed=true]')?.focus({preventScroll:true});
  }
});

document.addEventListener("submit",async event => {
  const form = event.target;
  if (form.id === "chat-form") {
    event.preventDefault();
    const data = new FormData(form);
    const question = String(data.get("question") ?? "").trim();
    if (question) review(question,data.has("include-photo"));
    return;
  }
  const handler = formActions[form.dataset.form];
  if (!handler) return;
  event.preventDefault();
  const submit = form.querySelector("[type=submit]");
  if (submit.disabled) return;
  submit.disabled = true;
  const alert = form.querySelector(".form-error");
  alert.textContent = "";
  try {
    const message = await handler(new FormData(form),modalData);
    if (modal.contains(form)) modal.close();
    render();
    announce(message);
  } catch (error) {
    alert.textContent = error.message || "Could not save this change.";
  } finally {
    submit.disabled = false;
  }
});

modal.addEventListener("close",() => {
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus({preventScroll:true});
  else document.querySelector("#topbar .button")?.focus({preventScroll:true});
});
window.addEventListener("hashchange",changePage);
tabs?.addEventListener("message",async () => {
  try {
    state.workspace = await loadWorkspace();
    if (state.route !== "doctor") render();
  } catch { /* A future update can reload the records. */ }
});

async function init() {
  try { state.workspace = await loadWorkspace(); }
  catch { state.storageReady = false; }
  state.route = routeNow();
  state.loading = false;
  render();
  if (!state.storageReady) announce("Browser storage is unavailable. The sample dashboard is available.");
  if (state.storageReady) syncFeed(plantNow(),true);
  try {
    const response = await fetch("/api/status",{cache:"no-store",signal:AbortSignal.timeout(5000)});
    const status = await response.json();
    if (response.ok && status.aiAvailable === true) {
      state.aiEnabled = true;
      if (state.route !== "doctor" || !view.querySelector("textarea")?.value) render();
    }
  } catch { /* The local review remains available. */ }
}
void init();

setInterval(() => {
  if (!state.loading && document.visibilityState === "visible") syncFeed(plantNow(),true);
},15 * 60_000);
