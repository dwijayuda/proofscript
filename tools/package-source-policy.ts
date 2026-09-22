import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const packages=path.join(ROOT,"packages");
const violations:string[]=[];

function walk(dir:string):void{
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name);
    const st=fs.statSync(p);
    if(st.isDirectory()){
      if(name==="dist"||name==="node_modules")continue;
      walk(p);
    }else if(p.endsWith(".mjs")){
      violations.push(path.relative(ROOT,p).replace(/\\/g,"/"));
    }
  }
}
walk(packages);

if(violations.length){
  console.error("package-source-policy: FAIL");
  for(const p of violations)console.error("hand-authored .mjs under packages/: "+p);
  process.exit(1);
}
console.log("package-source-policy: PASS (packages are TypeScript-first)");
