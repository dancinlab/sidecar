import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, lstatSync, readlinkSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const BIN = process.argv[2];           // global sidecar
const REPO = "/Users/mini/dancinlab/sidecar";
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra="") { (cond?pass++:fail++); if(!cond) fails.push(name); console.log(`  ${cond?"PASS":"FAIL"}  ${name}${extra?` — ${extra}`:""}`); }
function sc(args, input) { return spawnSync(BIN, args, { cwd: REPO, encoding:"utf8", input: input ?? "" }); }

// --- bridge parse replicas (mirror pi/sidecar.ts) ---
function extractContext(r, inclErr=false){const json=[];for(const l of (r.stdout||"").split("\n")){const t=l.trim();if(!t.startsWith("{"))continue;try{const j=JSON.parse(t);const ac=j?.hookSpecificOutput?.additionalContext??j?.additionalContext;if(typeof ac==="string"&&ac.trim())json.push(ac);}catch{}}const parts=[];if(json.length)parts.push(json.join("\n\n"));else if((r.stdout||"").trim())parts.push(r.stdout.trim());if(inclErr&&(r.stderr||"").trim())parts.push(r.stderr.trim());return parts.join("\n\n");}
function extractBlock(r){for(const l of (r.stdout||"").split("\n")){const t=l.trim();if(!t.startsWith("{"))continue;try{const j=JSON.parse(t);const hs=j?.hookSpecificOutput;if(hs?.permissionDecision==="deny")return{reason:hs.permissionDecisionReason};if(j?.decision==="block")return{reason:j.reason};}catch{}}return null;}
function mapTool(toolName,input){const i=input??{};switch(toolName){case"bash":return{kind:"bash",toolInput:{command:i.command??""}};case"write":case"edit":case"multi_edit":return{kind:"write",toolInput:{...i,file_path:i.path??i.file_path??"",content:i.content??""}};case"read":return{kind:"touch",toolInput:{...i,file_path:i.path??i.file_path??""}};default:return{kind:"tool",toolInput:{...i}};}}
function callGuard(toolName,input){const m=mapTool(toolName,input);const payload=JSON.stringify({tool_name:toolName,tool_input:m.toolInput});return sc(["pre",m.kind],payload);}

const PER_EV=JSON.stringify({hook_event_name:"UserPromptSubmit"});
const SES_EV=JSON.stringify({hook_event_name:"SessionStart"});
const SET=process.env.HOME+"/.pi/agent/settings.json";
const LINK=process.env.HOME+"/.pi/agent/extensions/sidecar.ts";
const GLOBAL_SRC=process.env.HOME+"/.sidecar/cli/pi/sidecar.ts";

console.log("=== A. CLI / install ===");
{ const r=sc(["pi","status"]); ok("T1 pi status exit 0 (wired)", r.status===0, `exit=${r.status}`); }
{ const r=sc(["pi","install"]); const set=JSON.parse(readFileSync(SET,"utf8")); const cnt=(set.skills||[]).filter(s=>s.includes(".claude/skills")).length; ok("T2 install idempotent (skills entry not duplicated)", r.status===0 && cnt===1, `claude-skills entries=${cnt}`); }
{ let tgt=null; try{ if(lstatSync(LINK).isSymbolicLink()) tgt=readlinkSync(LINK);}catch{} ok("T3 symlink → global clone", tgt===GLOBAL_SRC, `→ ${tgt}`); }
{ const r=sc(["pi","remove"]); const set=JSON.parse(readFileSync(SET,"utf8")); const has=(set.skills||[]).some(s=>s.includes(".claude/skills")); const linkGone=!existsSync(LINK); ok("T4 remove unwires (symlink+skills gone)", r.status===0 && !has && linkGone, `skills?${has} link?${!linkGone}`); }
{ const r=sc(["pi","install"]); const st=sc(["pi","status"]); ok("T5 reinstall restores (status exit 0)", r.status===0 && st.status===0); }
{ const r=sc(["pi","bogus"]); ok("T6 bad subcommand → usage, exit 1", r.status===1 && /usage: sidecar pi/.test(r.stdout+r.stderr)); }

console.log("=== C. inject bridge (global binary) ===");
const PER=[["commons","inject"],["claudemd","inject"],["recommend","inject"],["prefs","inject"],["easy","inject"],["load","inject"],["ing","inject"]];
let perOk=true,perDetail=[];
for(const v of PER){const c=extractContext(sc(v,PER_EV),true);if(!(c.length>0)){perOk=false;perDetail.push(v[0]);}}
ok("T8 all per-turn injects emit", perOk, perDetail.length?`empty: ${perDetail}`:"");
{ const arch=extractContext(sc(["architecture","inject"],SES_EV),true); const tk=extractContext(sc(["toolkit","inject"],SES_EV),true); const co=extractContext(sc(["companions","inject"],SES_EV),true); ok("T9 session injects emit (arch/toolkit/companions)", arch.length>0&&tk.length>0&&co.length>0, `arch=${arch.length} tk=${tk.length} co=${co.length}`); }
{ const c=extractContext(sc(["commons","inject"],""),true); ok("T10 inject silent WITHOUT hook_event_name carrier", c.length===0, `len=${c.length}`); }

console.log("=== D. guard bridge (tool_call) ===");
{ const blk=extractBlock(callGuard("bash",{command:"git push --"+"force origin main"})); ok("T11 bash force-push → block", !!blk, blk?blk.reason.slice(0,40):"no block"); }
{ const blk=extractBlock(callGuard("bash",{command:"ls -la"})); ok("T12 bash benign → no block", blk===null); }
{ const blk=extractBlock(callGuard("write",{path:`${REPO}/helper_v2.ts`,content:"x"})); ok("T13 write Pi{path}→file_path alias, versioned-name guard blocks", !!blk, blk?blk.reason.slice(0,40):"no block (alias broken?)"); }
{ const r=callGuard("read",{path:`${REPO}/README.md`}); ok("T14 read→pre touch no crash", r.status===0); }
{ const r=callGuard("mcp__some__tool",{x:1}); ok("T15 mcp tool→pre tool no crash", r.status===0); }

console.log("=== E. post + prompt ===");
{ const r=sc(["post","edit",`${REPO}/CLAUDE.md`]); ok("T16 post edit runs (advisory)", r.status===0); }
{ const c=extractContext(sc(["prompt","force push to main please"]),true); ok("T17 prompt-scan emits on trigger", c.length>0, `len=${c.length}`); }

console.log("=== F. parse-logic edge ===");
ok("T18 extractContext JSON additionalContext", extractContext({stdout:JSON.stringify({hookSpecificOutput:{additionalContext:"hello-json"}}),stderr:""})==="hello-json");
ok("T19 extractContext plain-text stdout", extractContext({stdout:"# plain markdown body",stderr:""})==="# plain markdown body");
ok("T20 extractContext stderr carrier", extractContext({stdout:"",stderr:"stderr-text"},true)==="stderr-text");
ok("T21 extractBlock deny", extractBlock({stdout:JSON.stringify({hookSpecificOutput:{permissionDecision:"deny",permissionDecisionReason:"x"}})})?.reason==="x" && extractBlock({stdout:"{}"})===null);

console.log(`\n=== TALLY: ${pass} PASS / ${fail} FAIL ===`);
if(fails.length) console.log("FAILED:", fails.join(", "));
process.exit(fail?1:0);
