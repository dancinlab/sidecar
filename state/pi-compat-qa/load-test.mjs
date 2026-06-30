import { createJiti } from "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/jiti/lib/jiti.mjs";
const jiti = createJiti(import.meta.url, { interopDefault: true });
const ext = await jiti.import(process.env.HOME+"/.sidecar/cli/pi/sidecar.ts", { default: true });
const events=[]; ext({on:n=>events.push(n),registerTool(){},registerCommand(){}});
const expect=["session_start","before_agent_start","tool_call","tool_result"];
const ok=typeof ext==="function"&&expect.every(e=>events.includes(e));
console.log("  "+(ok?"PASS":"FAIL")+"  T7 jiti load + 4 events ("+events.join(",")+")");
process.exit(ok?0:1);
