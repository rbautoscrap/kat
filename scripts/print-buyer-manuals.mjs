import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const files = [
  ["docs/buyer-manual-ar.html", "public/manuals/kat-manual-ar.pdf"],
  ["docs/buyer-manual-ru.html", "public/manuals/kat-manual-ru.pdf"],
  ["docs/buyer-manual-es.html", "public/manuals/kat-manual-es.pdf"],
];

const userDataDir = mkdtempSync(join(tmpdir(), "kat-manual-print-"));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  userDataDir,
  args: [
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-component-update",
  ],
});

for (const [src, dest] of files) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(root, src)).href, {
    waitUntil: "load",
    timeout: 60000,
  });
  await page.pdf({
    path: join(root, dest),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await page.close();
  console.log("wrote", dest);
}

await browser.close();
