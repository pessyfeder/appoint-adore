// Static hosts have no server to rewrite deep links (/book, /schedule...) to the app.
// 404.html (GitHub Pages) and _redirects (Netlify/Cloudflare Pages) make them serve index.html instead.
import { copyFileSync, writeFileSync } from "node:fs";
copyFileSync("dist/index.html", "dist/404.html");
writeFileSync("dist/_redirects", "/*  /index.html  200\n");
