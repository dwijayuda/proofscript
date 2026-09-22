#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";

const root=process.cwd();
const scopeFile=path.join(root,"packages/parser/src/scopeCommandParser.ts");
assert.ok(fs.existsSync(scopeFile),"expected packages/parser/src/scopeCommandParser.ts to exist after scope command extraction");

const scopeSource=fs.readFileSync(scopeFile,"utf8");
for(const symbol of [
  "parseImportCommand",
  "parseUniverseCommand",
  "parseNamespaceCommand",
  "parseSectionCommand",
  "parseOpenCommand",
  "resolveNamespaceAtCommand"
]) assert.ok(scopeSource.includes(`export function ${symbol}`),`expected scopeCommandParser.ts to export ${symbol}`);

const indexSource=fs.readFileSync(path.join(root,"packages/parser/src/index.ts"),"utf8");
for(const forbidden of [
  "private parseImportCommand",
  "private parseUniverseCommand",
  "private parseNamespaceCommand",
  "private parseSectionCommand",
  "private parseOpenCommand",
  "private resolveNamespaceAtCommand"
]) assert.ok(!indexSource.includes(forbidden),`index.ts should delegate ${forbidden} to scopeCommandParser.ts`);
assert.ok(indexSource.includes("makeScopeCommandHost"),"index.ts should expose a narrow host adapter for scope commands");

const require=createRequire(import.meta.url);
const parser=require("../packages/parser/dist/index.js");
const parsed=parser.parseSource(`
import Foo.Bar;
universe u;
namespace A {
  def x: Nat := { 1 }
  section S {
    variable (n: Nat);
    def id: Nat := { n }
  }
}
`,{commandIndex:0,grammarRevision:0,universeParams:[]},{knownGlobalNames:["Nat"]});
assert.deepEqual(parsed.imports,["Foo.Bar"]);
assert.deepEqual(parsed.finalState.universeParams,["u"]);
assert.equal(parsed.declarations.length,2);
assert.deepEqual(parsed.declarations.map(d=>[d.name,d.namespacePath?.join(".")]),[["x","A"],["id","A"]]);
const idDecl=parsed.declarations.find(d=>d.name==="id");
assert.ok(idDecl,"expected section declaration to parse");
assert.equal(idDecl.binders.length,1,"section variable should still generalize value declaration");
assert.equal(idDecl.binders[0].name,"n");
console.log("parser scope command extraction checks passed");
