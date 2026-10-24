// Browser bridge only: all palette and interaction behavior lives in goml.
(async () => {
  const unavailable = () => {
    const note = document.getElementById("image-availability") || document.getElementById("load");
    if (note) {
      note.hidden = false;
      note.dataset.tone = "error";
      note.textContent = "Image picking could not load. Reload to try again; the color and hex inputs still work in the server app.";
    }
  };
  try {
    const go = new Go();
    go.argv = ["palettegen-browser", location.search, document.documentElement.dataset.paletteMode || "enhance"];
    const compressed = "DecompressionStream" in globalThis;
    const response = await fetch(compressed ? "app.wasm.gz" : "app.wasm");
    if (!response.ok) throw new Error("Could not load the browser application");
    const bytes = compressed
      ? await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()
      : await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, go.importObject);
    go.run(instance).catch(unavailable);
  } catch {
    unavailable();
  }
})();
