import {createServer} from "node:http";
import {Readable} from "node:stream";
import {pathToFileURL} from "node:url";
import {build} from "./build.mjs";

const worker = (await import(pathToFileURL(await build()))).default;
const portArg = process.argv.indexOf("--port");
const port = Number(process.env.PORT || (portArg >= 0 && process.argv[portArg + 1]) || 3000);

createServer(async (incoming,outgoing) => {
  try {
    const url = "http://" + (incoming.headers.host || "localhost") + incoming.url;
    const init = {method:incoming.method,headers:incoming.headers};
    if (!["GET","HEAD"].includes(incoming.method)) Object.assign(init,{body:Readable.toWeb(incoming),duplex:"half"});
    const response = await worker.fetch(new Request(url,init),{});
    outgoing.writeHead(response.status,Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch {
    outgoing.writeHead(500).end();
  }
}).listen(port,"0.0.0.0",() => console.log("Plant Health preview is listening on " + port));
