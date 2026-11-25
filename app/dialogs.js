import {browserDate, eventTypes, stages} from "./model.js";
import {action, icon, safe} from "./views.js";

const input = (label, name, attrs = "", hint = "") => `<label class="field"><span>${label}</span><input name="${name}" ${attrs}>${hint ? '<small>'+hint+'</small>' : ""}</label>`;
const notes = (label, attrs = "") => `<label class="field"><span>${label}</span><textarea name="note" rows="3" maxlength="1000" ${attrs}></textarea></label>`;

export function dialogFrame(title, description, body) {
  return `<div class="dialog-head"><div><h2 id="modal-title">${title}</h2>${description ? `<p class="muted">${description}</p>` : ""}</div><button class="icon-button" type="button" data-action="close" aria-label="Close dialog">${icon("close")}</button></div>${body}`;
}

function form(kind, fields, submit) {
  return `<form class="form-grid" data-form="${kind}">${fields}<p class="form-error" role="alert"></p><div class="form-actions">${action("Cancel","close","quiet")}<button class="button primary" type="submit">${submit}</button></div></form>`;
}

export function plantsDialog(workspace, plant) {
  const choices = workspace.plants.map(item => `<button class="plant-choice" type="button" data-action="select-plant" data-value="${safe(item.id)}" aria-pressed="${item.id === plant.id}">${icon("sprout")}<span><strong>${safe(item.name)}</strong><small>${item.demo ? "Sample plant" : safe(item.species+" · "+item.stage)}</small></span>${item.id === plant.id ? icon("check") : icon("chevron")}</button>`).join("");
  return dialogFrame("Choose a plant","",`<div class="plant-list">${choices}</div><div class="button-row">${action("Add a plant","add-plant","primary","plus")}${plant.demo ? "" : action("Edit current plant","edit-plant","quiet")}</div>`);
}

export function plantForm(plant = null) {
  const created = plant ? browserDate(new Date(plant.created)) : browserDate();
  const fields = `${input("Plant name","name",'required maxlength="60" placeholder="e.g. Kitchen basil" value="'+safe(plant?.name)+'"')}
  <div class="two">${input("Species or variety","species",'required maxlength="70" placeholder="e.g. Genovese basil" value="'+safe(plant?.species)+'"')}<label class="field"><span>Current stage</span><select name="stage">${stages.map(stage => `<option ${plant?.stage === stage ? "selected" : ""}>${stage}</option>`).join("")}</select></label></div>
  ${input("Substrate and container","substrate",'required maxlength="100" placeholder="e.g. Living soil in a fabric pot" value="'+safe(plant?.substrate ?? "Living soil")+'"')}
  ${input("Grow start date","started",'required type="date" value="'+created.slice(0,10)+'" max="'+browserDate().slice(0,10)+'"')}`;
  return dialogFrame(plant ? "Edit plant" : "Add a plant",plant ? "" : "Start a record for your plant and its living-soil substrate.",form(plant ? "edit-plant" : "plant",fields,plant ? "Save changes" : "Add plant"));
}

export function logMenu(plant) {
  const choices = Object.entries(eventTypes).map(([type,item]) => action(item.label,"entry","secondary",item.icon,'data-value="'+type+'"')).join("");
  return dialogFrame("Log an entry",safe(plant.name),`<div class="button-row">${choices}${action("Soil reading","reading","secondary","pulse")}</div>`);
}

export function entryForm(type, plant) {
  const labels = {
    height:["Height measurement", input("Height (cm)","height",'required type="number" min="0.1" max="15000" step="0.1" inputmode="decimal"',"Measure from the soil line.")+notes("Notes (optional)","placeholder=\"e.g. New leaves at the tip\"")],
    watering:["Log watering",input("Water volume in mL (optional)","amount",'type="number" min="1" max="500000" step="1" inputmode="numeric"')+notes("Notes (optional)")],
    soil:["Soil observation",notes("What did you observe?",'required placeholder="e.g. Earthy smell, visible soil life, or a change in the surface"')],
    test:["Soil test",notes("Result, method, and units",'required placeholder="e.g. pH 6.7, lab test, sample from the root zone"')],
    photo:["Progress photo",input("Photo","photo",'type="file" accept="image/*" required',"Use a consistent angle and distance for progress photos.")+notes("Photo notes (optional)")],
    note:["Grow note",notes("What changed?",'required placeholder="e.g. Transplanted to a larger fabric pot"')]
  };
  const [title, fields] = labels[type];
  const date = input("Date and time","timestamp",'required type="datetime-local" value="'+browserDate()+'" max="'+browserDate()+'"');
  return dialogFrame(title,safe(plant.name),form("entry",`<input type="hidden" name="type" value="${type}">${date}${fields}`,"Save entry"));
}

export function readingForm(plant) {
  const date = input("Date and time","timestamp",'required type="datetime-local" value="'+browserDate()+'" max="'+browserDate()+'"');
  const moisture = input("Soil moisture (%)","moisturePct",'type="number" min="0" max="100" step="0.1" inputmode="decimal"');
  const temperature = input("Root-zone temp. (°C)","temperatureC",'type="number" min="-30" max="80" step="0.1" inputmode="decimal"');
  return dialogFrame("Add a soil reading",safe(plant.name) + " · Enter one or both measurements.",form("reading",`${date}<div class="two">${moisture}${temperature}</div>`,"Save reading"));
}

export function feedForm(plant) {
  const connection = plant.connection;
  const name = input("Feed name","name",'required maxlength="60" placeholder="e.g. Basil pot probe" value="'+safe(connection?.name)+'"');
  const url = input("Feed URL","url",'required type="url" maxlength="400" autocomplete="url" placeholder="https://your-gateway.example/soil" value="'+safe(connection?.url)+'"');
  const token = input("Read-only bearer token (optional)","token",'type="password" maxlength="512" autocomplete="off"',"Held in this tab while it’s open.");
  return dialogFrame("Connect a soil probe feed","Enter the HTTPS JSON endpoint provided by your soil probe or gateway.",form("connect",name+url+token,"Test and connect"));
}

export function importForm(plant) {
  const fields = input("CSV file","csv",'required type="file" accept=".csv,text/csv"',"Columns must be timestamp, moisturePct, and temperatureC.");
  return dialogFrame("Import soil readings",safe(plant.name),form("import",fields,"Import readings"));
}

export function removeForm(title, description, kind, label) {
  return dialogFrame(title,description,form(kind,"",label));
}

export function needsPlantDialog() {
  return dialogFrame("Add your plant first","The example plant contains sample readings. Add your own plant to log entries or connect a probe.",`<div class="form-actions">${action("Cancel","close","quiet")}${action("Add a plant","add-plant","primary","plus")}</div>`);
}
