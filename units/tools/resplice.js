/* Re-splice H-protocol units into index.html between their marker headers.
   Every replacement is asserted (CLAUDE.md 7.2): a missing anchor aborts, it does not no-op. */
"use strict";
const fs=require("fs"), path=require("path");
const REPO=path.join(__dirname,"..","..");
const OUT=path.join(__dirname,"..");            /* the units live beside this tool, in the repo */
const UNITS=process.argv.slice(2);
if(!UNITS.length){ console.error("usage: resplice.js <unit> [unit...]"); process.exit(2); }
const ORDER=["volspace","calendar","detect","schema","prereg"];
const hdr=u=>`/* ---------------- H protocol: ${u} ---------------- */`;
const TAIL="/* ---------------------------------------------------------------- clock / loop */";

let src=fs.readFileSync(path.join(REPO,"index.html"),"utf8");
for(const u of UNITS){
  const h=hdr(u), i=src.indexOf(h);
  if(i<0){ console.error(`ABORT: marker not found for ${u}`); process.exit(1); }
  const after=i+h.length;
  // end = next unit header that exists after this one, else the clock/loop anchor
  let end=-1;
  for(const v of ORDER.slice(ORDER.indexOf(u)+1)){
    const j=src.indexOf(hdr(v),after);
    if(j>=0){ end=j; break; }
  }
  if(end<0) end=src.indexOf(TAIL,after);
  if(end<0){ console.error(`ABORT: end boundary not found for ${u}`); process.exit(1); }
  const code=fs.readFileSync(path.join(OUT,u,"code.js"),"utf8").replace(/\s+$/,"");
  if(!code.length){ console.error(`ABORT: empty code.js for ${u}`); process.exit(1); }
  if(/[^\x00-\x7F]/.test(code)){
    const bad=code.match(/[^\x00-\x7F]/g);
    console.error(`ABORT: non-ASCII in ${u}/code.js: ${JSON.stringify(bad.slice(0,5))}`); process.exit(1);
  }
  const before=src.slice(after,end);
  src=src.slice(0,after)+"\n"+code+"\n\n"+src.slice(end);
  const delta=(code.length+2)-before.length;
  console.log(`${u}: ${before.length} -> ${code.length+2} chars (${delta>=0?"+":""}${delta})`);
}
fs.writeFileSync(path.join(REPO,"index.html"),src);
console.log("wrote index.html, "+src.split("\n").length+" lines");
