// Node harness for the try/ wasm build (mirrors what the browser shell does):
//   node tools/run_wasm.mjs app.wasm '?c=7C3AED'
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
process.on("uncaughtException", (e) => {
  if (String(e).includes("already exited")) process.exit(0);
  console.error(e); process.exit(1);
});
const goroot = execSync("go env GOROOT").toString().trim();
await import(goroot + "/lib/wasm/wasm_exec.js");
const go = new Go();
go.argv = ["palettegen-try", process.argv[3] ?? ""];
const wasm = readFileSync(process.argv[2]);
const { instance } = await WebAssembly.instantiate(wasm, go.importObject);
await go.run(instance);
