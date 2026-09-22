import assert from 'node:assert/strict';
import {
  Environment, infer, sameTerm,
  levelOfNat, levelSucc, levelIMax,
} from '../packages/kernel/dist/index.js';

const env = new Environment();
const S = (level) => ({tag:'sort', level});
const B = (index) => ({tag:'bvar', index});
const Pi = (domain, body) => ({tag:'pi', domain, body, binderInfo:'explicit'});
const Lam = (domain, body) => ({tag:'lam', domain, body, binderInfo:'explicit'});
const App = (fn, arg) => ({tag:'app', fn, arg});
const Let = (type, value, body) => ({tag:'let', type, value, body, nondep:false});

let total = 0;
let failures = 0;
function check(term, expected, label) {
  total++;
  try {
    const actual = infer(env, [], term);
    if (!sameTerm(actual, expected)) {
      failures++;
      if (failures <= 10) console.error(`MISMATCH ${label}`, {actual, expected});
    }
  } catch (e) {
    failures++;
    if (failures <= 10) console.error(`REJECTED ${label}: ${e?.stack ?? e}`);
  }
}

for (let i=0;i<250;i++) {
  const u=levelOfNat(i%7);
  check(S(u), S(levelSucc(u)), `sort-${i}`);
}
for (let i=0;i<250;i++) {
  const u=levelOfNat(i%7);
  const v=levelOfNat((i*3+1)%7);
  const d=S(u), b=S(v);
  check(Pi(d,b), S(levelIMax(levelSucc(u),levelSucc(v))), `pi-${i}`);
}
for (let i=0;i<250;i++) {
  const k=levelOfNat(i%7);
  const d=S(levelSucc(k));
  check(Lam(d,B(0)), Pi(d,d), `lam-${i}`);
}
for (let i=0;i<125;i++) {
  const k=levelOfNat(i%7);
  const d=S(levelSucc(k));
  const arg=S(k);
  check(App(Lam(d,B(0)),arg), d, `app-${i}`);
}
for (let i=0;i<125;i++) {
  const k=levelOfNat(i%7);
  const t=S(levelSucc(k));
  const value=S(k);
  check(Let(t,value,B(0)), t, `let-${i}`);
}

assert.equal(total,1000);
assert.equal(failures,0,`${failures} direct typing cases failed`);
console.log(`TYPING_TS_CASES=${total} FAILURES=${failures}`);
