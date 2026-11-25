import {mkdir, readFile, readdir, rm, writeFile} from "node:fs/promises";
import {extname, join, relative} from "node:path";
import {fileURLToPath} from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));
const frontend = join(project,"app");
const dist = join(project,"dist");
const media = {
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".webp":"image/webp",
  ".woff2":"font/woff2",
  ".webmanifest":"application/manifest+json; charset=utf-8"
};

export async function build() {
  const files = (await readdir(frontend,{recursive:true,withFileTypes:true})).filter(item => item.isFile());
  const entries = await Promise.all(files.map(async item => {
    const path = join(item.parentPath,item.name);
    const type = media[extname(path)];
    if (!type) return null;
    const binary = /\.(png|webp|woff2)$/.test(path);
    const data = await readFile(path,binary ? "base64" : "utf8");
    return ["/" + relative(frontend,path),{data,type,binary}];
  }));
  const source = await readFile(join(project,"worker/index.js"),"utf8");
  const placeholder = "/* POTIFY_BUILD_ASSETS */ {}";
  if (!source.includes(placeholder)) throw new Error("Worker asset placeholder is missing.");
  const bundle = source.replace(placeholder,() => JSON.stringify(Object.fromEntries(entries.filter(Boolean))));
  await rm(dist,{recursive:true,force:true});
  await mkdir(join(dist,"server"),{recursive:true});
  await writeFile(join(dist,"server/index.js"),bundle);
  return join(dist,"server/index.js");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
