import {
  assertEquals,
  assertStringIncludes,
  assertThrowsAsync,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";
import { getMediaType, readDirCreateSource } from "./mod.ts";

Deno.test("readDirCreateSource", async () => {
  const source = await readDirCreateSource("testdata", undefined, {
    gzipTimestamp: 0,
  });
  assertEquals(
    source,
    `
// This script is generated by https://deno.land/x/deploy_dir@v0.1.6
import { decode } from "https://deno.land/std@0.97.0/encoding/base64.ts";
import { gunzip } from "https://raw.githubusercontent.com/kt3k/compress/bbe0a818d2acd399350b30036ff8772354b1c2df/gzip/gzip.ts";
console.log("init");
const dirData: Record<string, [Uint8Array, string]> = {};
dirData["/bar.ts"] = [decode("H4sIAAAAAAAAA0vOzyvOz0nVy8lP11BKSixS0rTmAgCz8kN9FAAAAA=="), "text/typescript"];
dirData["/foo.txt"] = [decode("H4sIAAAAAAAAA0vLz+cCAKhlMn4EAAAA"), "text/plain"];
dirData["/index.html"] = [decode("H4sIAAAAAAAAA/NIzcnJV+QCAJ7YQrAHAAAA"), "text/html"];
addEventListener("fetch", (e) => {
  let { pathname } = new URL(e.request.url);
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }
  let data = dirData[pathname];
  if (!data) {
    data = dirData[pathname + '.html'];
  }
  if (data) {
    const [bytes, mediaType] = data;
    const acceptsGzip = e.request.headers.get("accept-encoding")?.split(/[,;]s*/).includes("gzip");
    if (acceptsGzip) {
      e.respondWith(new Response(bytes, { headers: {
        "content-type": mediaType,
        "content-encoding": "gzip",
      } }));
    } else {
      e.respondWith(new Response(gunzip(bytes), { headers: { "content-type": mediaType } }));
    }
    return;
  }
  e.respondWith(new Response("404 Not Found", { status: 404 }));
});
`.trim(),
  );
});

Deno.test("readDirCreateSource - toJavaScript", async () => {
  const source = await readDirCreateSource("testdata", undefined, {
    toJavaScript: true,
  });
  assertStringIncludes(source, "const dirData = {};");
});

Deno.test("readDirCreateSource - with basic auth", async () => {
  await assertThrowsAsync(
    async () => {
      await readDirCreateSource("testdata", undefined, {
        basicAuth: "user-pw",
      });
    },
    Error,
    "Invalid form of basic auth creadentials: user-pw",
  );
});

Deno.test("readDirCreateSource - with basic auth", async () => {
  const source = await readDirCreateSource("testdata", undefined, {
    basicAuth: "user:pw",
  });
  assertStringIncludes(
    source,
    `import { basicAuth } from "https://deno.land/x/basic_auth@v1.0.0/mod.ts";`,
  );
  assertStringIncludes(
    source,
    `
  const unauthorized = basicAuth(e.request, "Access to the site", {"user":"pw"});
  if (unauthorized) {
    e.respondWith(unauthorized);
    return;
  }`.trim(),
  );
});

Deno.test("readDirCreateSource with root", async () => {
  assertStringIncludes(
    await readDirCreateSource("testdata", "/root", { gzipTimestamp: 0 }),
    `
dirData["/root/bar.ts"] = [decode("H4sIAAAAAAAAA0vOzyvOz0nVy8lP11BKSixS0rTmAgCz8kN9FAAAAA=="), "text/typescript"];
dirData["/root/foo.txt"] = [decode("H4sIAAAAAAAAA0vLz+cCAKhlMn4EAAAA"), "text/plain"];
dirData["/root/index.html"] = [decode("H4sIAAAAAAAAA/NIzcnJV+QCAJ7YQrAHAAAA"), "text/html"];
`.trim(),
  );
});

Deno.test("readDirCreateSource with root 2", async () => {
  assertStringIncludes(
    await readDirCreateSource("testdata", "root", { gzipTimestamp: 0 }),
    `
dirData["/root/bar.ts"] = [decode("H4sIAAAAAAAAA0vOzyvOz0nVy8lP11BKSixS0rTmAgCz8kN9FAAAAA=="), "text/typescript"];
dirData["/root/foo.txt"] = [decode("H4sIAAAAAAAAA0vLz+cCAKhlMn4EAAAA"), "text/plain"];
dirData["/root/index.html"] = [decode("H4sIAAAAAAAAA/NIzcnJV+QCAJ7YQrAHAAAA"), "text/html"];
`.trim(),
  );
});

Deno.test("getMediaType", () => {
  assertEquals(getMediaType("README.md"), "text/markdown");
  assertEquals(getMediaType("index.html"), "text/html");
  assertEquals(getMediaType("inde.htm"), "text/html");
  assertEquals(getMediaType("package.json"), "application/json");
  assertEquals(getMediaType("image.jpg"), "image/jpeg");
  assertEquals(getMediaType("image.jpeg"), "image/jpeg");
  assertEquals(getMediaType("image.avif"), "image/avif");
  assertEquals(getMediaType("image.webp"), "image/webp");
  assertEquals(getMediaType("image.png"), "image/png");
  assertEquals(getMediaType("image.gif"), "image/gif");
  assertEquals(getMediaType("foo.txt"), "text/plain");
  assertEquals(getMediaType("foo.ts"), "text/typescript");
  assertEquals(getMediaType("Component.tsx"), "text/tsx");
  assertEquals(getMediaType("script.js"), "application/javascript");
  assertEquals(getMediaType("Component.jsx"), "text/jsx");
  assertEquals(getMediaType("archive.tar.gz"), "application/gzip");
  assertEquals(getMediaType("style.css"), "text/css");
  assertEquals(getMediaType("lib.wasm"), "application/wasm");
  assertEquals(getMediaType("mod.mjs"), "application/javascript");
  assertEquals(getMediaType("logo.svg"), "image/svg+xml");
});
