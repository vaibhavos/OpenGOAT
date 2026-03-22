#!/usr/bin/env node
import{Command as rr}from"commander";import{useState as Ie,useEffect as uo}from"react";import{render as fo,Box as se,Text as H,useApp as yo,useInput as ho}from"ink";import tt from"inquirer";import Se from"crypto";import He from"os";import mt from"path";import ge from"fs";var Ye=mt.join(He.homedir(),".opengoat"),je=mt.join(Ye,"vault.enc"),gt="aes-256-cbc";function ut(){let o=`${He.hostname()}::${He.userInfo().username}::opengoat-v1`;return Se.createHash("sha256").update(o).digest()}function We(){try{if(!ge.existsSync(je))return{};let o=ge.readFileSync(je,"utf-8"),{iv:e,data:t}=JSON.parse(o),r=ut(),n=Se.createDecipheriv(gt,r,Buffer.from(e,"hex")),i=n.update(t,"hex","utf-8")+n.final("utf-8");return JSON.parse(i)}catch{return{}}}function dt(o){ge.existsSync(Ye)||ge.mkdirSync(Ye,{recursive:!0});let e=ut(),t=Se.randomBytes(16),r=Se.createCipheriv(gt,e,t),n=r.update(JSON.stringify(o),"utf-8","hex")+r.final("hex");ge.writeFileSync(je,JSON.stringify({iv:t.toString("hex"),data:n}),"utf-8")}var W={set(o,e,t){let r=We();r[`${o}::${e}`]=t,dt(r)},get(o,e){let t=`OPENGOAT_API_KEY_${e.toUpperCase()}`;return process.env[t]?process.env[t]:We()[`${o}::${e}`]||null},delete(o,e){let t=We();delete t[`${o}::${e}`],dt(t)},has(o,e){return this.get(o,e)!==null}};import Kt from"conf";var qe=class{name="DefaultConf";version="1.0.0";store;constructor(){this.store=new Kt({projectName:"opengoat"})}async initialize(){}async get(e){return this.store.get(e)||null}async set(e,t){this.store.set(e,t)}async delete(e){this.store.delete(e)}async query(e,t){return[]}async transaction(e){return e()}async close(){}getAll(){return this.store.store}},d=new qe;import Jt from"better-sqlite3";import zt from"path";var Zt="opengoat.db",Qt=`
CREATE TABLE IF NOT EXISTS goals (
  id            TEXT PRIMARY KEY,
  statement     TEXT NOT NULL,
  category      TEXT NOT NULL,
  current_val   REAL NOT NULL,
  target_val    REAL NOT NULL,
  unit          TEXT NOT NULL,
  deadline      TEXT NOT NULL,
  active_path   TEXT,
  status        TEXT DEFAULT 'active',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resource_profiles (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL REFERENCES goals(id),
  profile       TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS paths (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL REFERENCES goals(id),
  data          TEXT NOT NULL,
  rank          INTEGER NOT NULL,
  is_active     INTEGER DEFAULT 0,
  generated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gap_log (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL REFERENCES goals(id),
  value         REAL NOT NULL,
  note          TEXT,
  logged_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interventions (
  id              TEXT PRIMARY KEY,
  goal_id         TEXT NOT NULL REFERENCES goals(id),
  trigger_type    TEXT NOT NULL,
  question        TEXT NOT NULL,
  user_response   TEXT,
  constraint_type TEXT,
  unlock_action   TEXT,
  resolved        INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS missions (
  id              TEXT PRIMARY KEY,
  goal_id         TEXT NOT NULL REFERENCES goals(id),
  path_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  estimated_hours REAL NOT NULL,
  status          TEXT DEFAULT 'pending',
  week            INTEGER NOT NULL,
  difficulty      INTEGER DEFAULT 2,
  xp              INTEGER NOT NULL,
  completed_at    TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS week_scores (
  id             TEXT PRIMARY KEY,
  goal_id        TEXT NOT NULL REFERENCES goals(id),
  week_number    INTEGER NOT NULL,
  velocity_score REAL NOT NULL,
  consistency    REAL NOT NULL,
  momentum       REAL NOT NULL,
  path_fit       REAL NOT NULL,
  total          REAL NOT NULL,
  rank           TEXT NOT NULL,
  xp             INTEGER NOT NULL,
  gap_at_week    REAL,
  scored_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(goal_id, week_number)
);

CREATE TABLE IF NOT EXISTS plugin_registry (
  name          TEXT PRIMARY KEY,
  version       TEXT NOT NULL,
  type          TEXT NOT NULL,
  manifest      TEXT NOT NULL,
  installed_at  TEXT DEFAULT (datetime('now'))
);
`,Je="paths_legacy",ze="missions_legacy",Ze="week_scores_legacy";function N(o,e){return!!o.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(e)}function yt(o,e){if(!N(o,e))return new Set;let t=o.prepare(`PRAGMA table_info(${e})`).all();return new Set(t.map(r=>r.name))}function eo(o,e,t){let r=yt(o,e);return t.every(n=>r.has(n))}function Ke(o,e,t,r){if(!(!N(o,e)||eo(o,e,t))){if(N(o,r)){o.exec(`DROP TABLE ${e}`);return}o.exec(`ALTER TABLE ${e} RENAME TO ${r}`)}}function ft(o,e,t,r,n){!N(o,e)||yt(o,e).has(t)||(o.exec(`ALTER TABLE ${e} ADD COLUMN ${t} ${r}`),n&&o.exec(`
      UPDATE ${e}
      SET ${t} = ${n}
      WHERE ${t} IS NULL
    `))}function to(o){!N(o,"logs")||!N(o,"gap_log")||o.exec(`
    INSERT OR IGNORE INTO gap_log (id, goal_id, value, note, logged_at)
    SELECT id, goal_id, amount, note, logged_at
    FROM logs
  `)}function oo(o){if(!N(o,Je)||!N(o,"paths"))return;let e=o.prepare(`SELECT id, goal_id, name, playbook_id, selected_at
     FROM ${Je}
     ORDER BY goal_id ASC, selected_at ASC, id ASC`).all();if(e.length===0)return;let t=o.prepare("SELECT id, active_path FROM goals").all(),r=new Map(t.map(a=>[a.id,a.active_path])),n=new Map,i=o.prepare(`
    INSERT OR IGNORE INTO paths (id, goal_id, data, rank, is_active, generated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);for(let a of e){let s=(n.get(a.goal_id)??0)+1;n.set(a.goal_id,s);let c={id:a.id,name:a.name,tagline:a.playbook_id?`Legacy playbook: ${a.playbook_id}`:"Legacy path data",whyFastest:"Migrated from a pre-v1.0 path. Run `opengoat paths` to regenerate a full ranked plan.",confidenceScore:0,weeksToClose:0,weeklyHoursRequired:0,capitalRequired:0,skillGaps:[],resourceFit:{time:"stretch",capital:"stretch",skills:"stretch",network:"stretch",overall:0},milestones:[],firstAction:{description:"Run `opengoat paths` to regenerate this legacy path.",timeRequired:10,output:"A fresh ranked path set"},rank:Math.min(s,5)};i.run(a.id,a.goal_id,JSON.stringify(c),s,r.get(a.goal_id)===a.id?1:0,a.selected_at??new Date().toISOString())}}function ro(o){!N(o,ze)||!N(o,"missions")||o.exec(`
    INSERT OR IGNORE INTO missions (
      id, goal_id, path_id, title, description, estimated_hours,
      status, week, difficulty, xp, completed_at, created_at
    )
    SELECT
      id,
      goal_id,
      path_id,
      title,
      description,
      COALESCE(est_hours, 1),
      COALESCE(status, 'pending'),
      week_number,
      COALESCE(difficulty, 2),
      COALESCE(xp, 100),
      completed_at,
      created_at
    FROM ${ze}
  `)}function no(o){!N(o,Ze)||!N(o,"week_scores")||o.exec(`
    INSERT OR IGNORE INTO week_scores (
      id, goal_id, week_number, velocity_score, consistency,
      momentum, path_fit, total, rank, xp, gap_at_week, scored_at
    )
    SELECT
      id,
      goal_id,
      week_number,
      COALESCE(velocity, 0),
      COALESCE(consistency, 0),
      COALESCE(execution, 0),
      COALESCE(reflection, 0),
      total,
      rank,
      xp,
      gap_end,
      scored_at
    FROM ${Ze}
  `)}function io(o){!N(o,"goals")||!N(o,"paths")||o.exec(`
    UPDATE goals
    SET active_path = NULL
    WHERE active_path IS NOT NULL
      AND active_path NOT IN (SELECT id FROM paths)
  `)}function ao(o){Ke(o,"paths",["data","rank","is_active"],Je),Ke(o,"missions",["estimated_hours","week"],ze),Ke(o,"week_scores",["velocity_score","momentum","path_fit","gap_at_week"],Ze),o.exec(Qt),ft(o,"goals","updated_at","TEXT","datetime('now')"),ft(o,"resource_profiles","updated_at","TEXT","datetime('now')"),to(o),oo(o),ro(o),no(o),io(o)}var Qe=class{static instance=null;static getInstance(){if(!this.instance){let e=et();this.instance=new Jt(e),this.instance.pragma("journal_mode = WAL"),this.instance.pragma("foreign_keys = ON"),ao(this.instance)}return this.instance}};function et(o=process.cwd()){return zt.join(o,Zt)}var u=()=>Qe.getInstance();import{v4 as so}from"uuid";var h=class{static create(e){let t=u(),r=so();return t.prepare(`
      INSERT INTO goals (id, statement, category, current_val, target_val, unit, deadline, active_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(r,e.statement,e.category,e.currentVal,e.targetVal,e.unit,e.deadline,e.activePath||null),r}static getAllActive(){return u().prepare('SELECT * FROM goals WHERE status = "active"').all().map(r=>({id:r.id,statement:r.statement,category:r.category,currentVal:r.current_val,targetVal:r.target_val,unit:r.unit,deadline:r.deadline,activePath:r.active_path,status:r.status,createdAt:new Date(r.created_at+"Z")}))}static getAll(){return u().prepare("SELECT * FROM goals").all().map(r=>({id:r.id,statement:r.statement,category:r.category,currentVal:r.current_val,targetVal:r.target_val,unit:r.unit,deadline:r.deadline,activePath:r.active_path,status:r.status,createdAt:new Date(r.created_at+"Z")}))}static getById(e){let r=u().prepare("SELECT * FROM goals WHERE id = ?").get(e);return r?{id:r.id,statement:r.statement,category:r.category,currentVal:r.current_val,targetVal:r.target_val,unit:r.unit,deadline:r.deadline,activePath:r.active_path,status:r.status,createdAt:new Date(r.created_at+"Z")}:null}static updateCurrentValue(e,t){u().prepare('UPDATE goals SET current_val = ?, updated_at = datetime("now") WHERE id = ?').run(t,e)}static updatePath(e,t){u().prepare('UPDATE goals SET active_path = ?, updated_at = datetime("now") WHERE id = ?').run(t,e)}};import{v4 as co}from"uuid";var Q=class{static save(e,t){let r=u();this.getByGoalId(e)?r.prepare(`
        UPDATE resource_profiles 
        SET profile = ?, updated_at = datetime('now')
        WHERE goal_id = ?
      `).run(JSON.stringify(t),e):r.prepare(`
        INSERT INTO resource_profiles (id, goal_id, profile)
        VALUES (?, ?, ?)
      `).run(co(),e,JSON.stringify(t))}static getByGoalId(e){let r=u().prepare("SELECT profile FROM resource_profiles WHERE goal_id = ?").get(e);return r?JSON.parse(r.profile):null}};var v=class{static savePaths(e,t){let r=u(),n=r.prepare(`
      INSERT OR REPLACE INTO paths (id, goal_id, data, rank, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);r.transaction(()=>{r.prepare("DELETE FROM paths WHERE goal_id = ?").run(e),t.forEach(i=>{n.run(i.id,e,JSON.stringify(i),i.rank,0)})})()}static activatePath(e,t){let r=u();r.transaction(()=>{r.prepare("UPDATE paths SET is_active = 0 WHERE goal_id = ?").run(e),r.prepare("UPDATE paths SET is_active = 1 WHERE id = ?").run(t),r.prepare("UPDATE goals SET active_path = ? WHERE id = ?").run(t,e)})()}static getForGoal(e){return u().prepare("SELECT * FROM paths WHERE goal_id = ? ORDER BY rank ASC").all(e).map(n=>({...JSON.parse(n.data),id:n.id,rank:n.rank,isActive:n.is_active===1}))}static getActivePath(e){let r=u().prepare("SELECT * FROM paths WHERE goal_id = ? AND is_active = 1 LIMIT 1").get(e);return r?{...JSON.parse(r.data),id:r.id,rank:r.rank}:null}};var ee=class{static generateGoalExtractionPrompt(e){return`
You are GoatBrain, the OpenGOAT intent parser.
Extract the structured goal data from this natural language statement:
"${e}"

Rules:
- Current value is usually 0 unless implied otherwise.
- Infer the category (e.g. income, fitness, learning, audience, product).
- If unit is implied as currency, use '$' or the specified currency.
- If deadline is implied (e.g. "by august"), calculate the exact YYYY-MM-DD representing the end of that period for the year 2026.

Return exactly this JSON interface:
{
  "statement": "${e}",
  "category": "string",
  "currentVal": 0,
  "targetVal": number,
  "unit": "string",
  "deadline": "YYYY-MM-DD"
}

Output JSON only. No markdown. No intro.
`}static generateProfileExtractionPrompt(e){return`
You are GoatBrain, mapping a user's organic answers into a strict 5D Resource Profile.

Here are the user's answers to the 5 dimensions:
Time: "${e.time}"
Capital: "${e.capital}"
Skills: "${e.skills}"
Network: "${e.network}"
Assets: "${e.assets}"

Parse these answers directly into this strict JSON schema. Extract numbers intelligently.
If an array is requested, split their answers logically.

interface ResourceProfile {
  time: {
    hoursPerDay: number;
    peakHours: 'morning' | 'afternoon' | 'evening';
    daysPerWeek: number;
    hardConstraints: string[];
  };
  capital: {
    deployable: number;
    monthlyIncome: number;
    runway: number;
    willingToSpend: boolean;
  };
  skills: string[];
  tools: string[];
  triedBefore: string[];
  unfairAdvantage: string;
  network: {
    hasExistingAudience: boolean;
    audienceSize: number;
    platforms: string[];
    keyConnections: string[];
    communities: string[];
  };
  assets: string[];
}

Return ONLY the valid JSON object matching the ResourceProfile layout. No markdown context.
`}};var ae=class{static generatePrompt(e,t){return`
You are GoatBrain \u2014 the intelligence engine of OpenGOAT.
A person has a goal and a specific set of resources.
Your job: generate exactly 5 paths to close their gap.

CRITICAL RULES:
- Every path must be built around THEIR specific resources
- Rank by one metric only: speed to close the gap given what they have NOW
- Be brutally honest about skill gaps and resource mismatches
- The #1 path must be startable within 2 hours with zero additional resources
- Never generate generic advice. Specific means specific.
- Include a first action for each path that takes under 2 hours
- Return ONLY valid JSON. Zero markdown. Zero explanation.

Goal: ${e.statement}
Current: ${e.currentVal} ${e.unit}
Target: ${e.targetVal} ${e.unit}
Deadline: ${e.deadline}
Resource profile: ${JSON.stringify(t,null,2)}

Generate 5 paths as a JSON array matching exactly this TypeScript interface:
interface Path {
  id: string; // generate a random uuid string
  name: string;
  tagline: string;
  whyFastest: string;
  confidenceScore: number;
  weeksToClose: number;
  weeklyHoursRequired: number;
  capitalRequired: number;
  skillGaps: string[];
  resourceFit: { time: string, capital: string, skills: string, network: string, overall: number };
  milestones: { week: number, description: string, metric: number, unit: string }[];
  firstAction: { description: string, timeRequired: number, output: string };
  rank: 1 | 2 | 3 | 4 | 5;
}

Output JSON array only. No code blocks. No intro.
`}};import lo from"@anthropic-ai/sdk";var Ae=class{supportsStreaming=!0;name="anthropic";version="1.0.0";client;constructor(e){this.client=new lo({apiKey:e})}async complete(e,t){let n=(await this.client.messages.create({model:t?.model||"claude-3-opus-20240229",max_tokens:t?.maxTokens||1024,system:t?.systemPrompt,messages:[{role:"user",content:e}]})).content[0];return n.type==="text"?n.text:""}async*stream(e,t){yield await this.complete(e,t)}};import po from"openai";var ke=class{supportsStreaming=!0;name="openai";version="1.0.0";client;constructor(e){this.client=new po({apiKey:e})}async complete(e,t){return(await this.client.chat.completions.create({model:t?.model||"gpt-4o",messages:[{role:"system",content:t?.systemPrompt||""},{role:"user",content:e}],max_tokens:t?.maxTokens,temperature:t?.temperature})).choices[0]?.message?.content||""}async*stream(e,t){yield await this.complete(e,t)}};import mo from"groq-sdk";var _e=class{supportsStreaming=!0;name="groq";version="1.0.0";client;constructor(e){this.client=new mo({apiKey:e})}async complete(e,t){return(await this.client.chat.completions.create({model:t?.model||"llama-3.3-70b-versatile",messages:[{role:"system",content:t?.systemPrompt||""},{role:"user",content:e}]})).choices[0]?.message?.content||""}async*stream(e,t){yield await this.complete(e,t)}};var Oe=class{supportsStreaming=!0;name="ollama";version="1.0.0";baseUrl;constructor(e="http://localhost:11434"){this.baseUrl=e}async complete(e,t){return(await(await fetch(`${this.baseUrl}/api/generate`,{method:"POST",body:JSON.stringify({model:t?.model||"llama2",prompt:e,system:t?.systemPrompt,stream:!1})})).json()).response||""}async*stream(e,t){yield await this.complete(e,t)}};var go={groq:"llama-3.3-70b-versatile",anthropic:"claude-3-5-haiku-20241022",openai:"gpt-4o-mini",ollama:"llama3.1"};async function U(o){let e=o.toLowerCase();if(e.includes("ollama"))return new Oe;let t=W.get("opengoat",e);if(!t)throw new Error(`No API key found for "${o}".
  Option 1: Run \`opengoat init\` to set up your provider.
  Option 2: Set the env var OPENGOAT_API_KEY_${e.toUpperCase()}=<your-key>`);if(e.includes("anthropic"))return process.env.ANTHROPIC_API_KEY=t,new Ae(t);if(e.includes("openai"))return process.env.OPENAI_API_KEY=t,new ke(t);if(e.includes("groq"))return process.env.GROQ_API_KEY=t,new _e(t);throw new Error(`Unknown provider: ${o}`)}async function M(o,e){try{let t=go[o.name.toLowerCase()]||"gpt-4o-mini";return await o.complete(e,{model:t})}catch(t){return console.error(`
[BRAIN OFFLINE] AI Model Inference Failed: ${t.message}`),""}}import{jsx as C,jsxs as Ne}from"react/jsx-runtime";async function ht(){console.log("\x1B[2J\x1B[0;0H");let o=await tt.prompt([{name:"statement",message:"What is your goal (in plain English)?"},{name:"current",message:"What is your current number/value today?",validate:n=>!isNaN(Number(n))||"Enter a number"},{type:"list",name:"provider",message:"Select Intelligence layer:",choices:["Anthropic","OpenAI","Groq","Ollama (Local)"]}]),e=o.provider==="Ollama (Local)"?"ollama":o.provider.toLowerCase();if(e!=="ollama"){let{apiKey:n}=await tt.prompt([{type:"password",name:"apiKey",message:`Enter your ${o.provider} API Key:`}]);W.set("opengoat",e,n)}await d.set("preferred_provider",e),console.log(`
--- GoatBrain 5D Resource Mapping ---`);let t=await tt.prompt([{name:"time",message:"[Time] How many hours/day genuinely available? Peak hours? Days/week?"},{name:"capital",message:"[Capital] Deployable cash right now? Monthly income? Willing to spend?"},{name:"skills",message:"[Skills] What do you do well? Tools you use? Unfair advantage?"},{name:"network",message:"[Network] Existing audience? Connections who have done this?"},{name:"assets",message:"[Assets] Existing code, content, reputation, zero-cost leverage?"}]),{waitUntilExit:r}=fo(C(To,{base:o,resources:t}));await r()}var To=({base:o,resources:e})=>{let{exit:t}=yo(),[r,n]=Ie("Booting GoatBrain..."),[i,a]=Ie([]),[s,c]=Ie(0),[l,f]=Ie(null);return uo(()=>{async function g(){try{let T=await U(o.provider);n("Parsing natural language goal constraints...");let m=ee.generateGoalExtractionPrompt(o.statement),S=await M(T,m),I=JSON.parse(S.replace(/```json|```/g,"").trim());n("Mapping 5D organic resource profile...");let ie=ee.generateProfileExtractionPrompt(e),Xe=await M(T,ie),de=JSON.parse(Xe.replace(/```json|```/g,"").trim()),F=h.create({statement:I.statement,category:I.category||"unknown",currentVal:Number(o.current),targetVal:I.targetVal,unit:I.unit,deadline:I.deadline});Q.save(F,de),n("Calculating top 5 fastest paths based on resources...");let Re=ae.generatePrompt(h.getById(F),de),pt=await M(T,Re),be=JSON.parse(pt.replace(/```json|```/g,"").trim());v.savePaths(F,be),n("COMPLETE"),a(be),await d.set("active_goal_id",F)}catch(T){n(`FAILED: ${T.message}`)}}g()},[]),ho((g,T)=>{if(!(r!=="COMPLETE"&&!l)){if(T.upArrow&&s>0&&c(s-1),T.downArrow&&s<i.length-1&&c(s+1),T.return&&!l){let m=i[s],S=d.get("active_goal_id");(async()=>{let I=await d.get("active_goal_id");v.activatePath(I,m.id),f(m)})()}g==="q"&&t()}}),l?Ne(se,{flexDirection:"column",padding:1,borderStyle:"round",borderColor:"green",children:[Ne(H,{bold:!0,color:"green",children:["PATH LOCKED: ",l.name]}),C(se,{marginY:1,children:C(H,{dimColor:!0,children:l.whyFastest})}),C(H,{bold:!0,color:"yellow",children:"First Action (Next 2 hours):"}),C(H,{children:l.firstAction.description}),C(se,{marginTop:1,children:C(H,{dimColor:!0,children:"Run 'opengoat paths' to view all options. Run 'opengoat log' to update your gap. Press Q to exit."})})]}):r!=="COMPLETE"?C(se,{padding:1,children:C(H,{children:r})}):Ne(se,{flexDirection:"column",padding:1,children:[C(H,{bold:!0,color:"cyan",children:"GOATBRAIN TOP 5 PATHS"}),C(H,{dimColor:!0,children:"Select your operating context (Up/Down + Enter)"}),C(se,{flexDirection:"column",marginY:1,children:i.map((g,T)=>Ne(H,{color:T===s?"green":"white",children:[T===s?"\u276F ":"  ",g.rank,". ",g.name," \u2014 ",g.weeksToClose," weeks (",Math.round(g.confidenceScore),"% confidence)"]},T))})]})};import{v4 as Eo}from"uuid";var b=class{static log(e,t,r){let n=u(),i=Eo();return n.prepare(`
      INSERT INTO gap_log (id, goal_id, value, note)
      VALUES (?, ?, ?, ?)
    `).run(i,e,t,r||null),{id:i,goalId:e,value:t,loggedAt:new Date,note:r}}static getSeries(e){return u().prepare("SELECT * FROM gap_log WHERE goal_id = ? ORDER BY logged_at ASC").all(e).map(n=>({id:n.id,goalId:n.goal_id,value:n.value,note:n.note,loggedAt:new Date(n.logged_at+"Z")}))}static getLatest(e){let r=u().prepare("SELECT * FROM gap_log WHERE goal_id = ? ORDER BY logged_at DESC LIMIT 1").get(e);return r?{id:r.id,goalId:r.goal_id,value:r.value,note:r.note,loggedAt:new Date(r.logged_at+"Z")}:null}};var ue=class{static evaluateGap(e){let t=e.targetVelocity>0?e.velocity7d/e.targetVelocity:1;return e.daysSinceMovement>=5||t<.4&&e.isBehindSchedule?"intervening":e.daysSinceMovement>=2||t<.6?"watching":"silent"}static generateWatchingQuestion(e){let t=Math.floor(e.daysSinceMovement);return t>=2?`Your gap hasn't moved in ${t} days. What is the single thing blocking you right now?`:`Your velocity dropped ${Math.round((1-e.velocity7d/e.targetVelocity)*100)}% below target. What is the constraint right now?`}};import{v4 as xo}from"uuid";var Y=class{static create(e){let t=u(),r=xo();return t.prepare(`
      INSERT INTO interventions (id, goal_id, trigger_type, question, user_response, constraint_type, unlock_action)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(r,e.goalId,e.triggeredBy,e.question,e.userResponse||null,e.constraintType||null,e.unlockAction||null),{...e,id:r,createdAt:new Date,resolved:!1}}static update(e,t){let r=u(),n=[],i=[];t.userResponse!==void 0&&(n.push("user_response = ?"),i.push(t.userResponse)),t.constraintType!==void 0&&(n.push("constraint_type = ?"),i.push(t.constraintType)),t.unlockAction!==void 0&&(n.push("unlock_action = ?"),i.push(t.unlockAction)),t.resolved!==void 0&&(n.push("resolved = ?"),i.push(t.resolved?1:0)),n.length!==0&&(i.push(e),r.prepare(`
      UPDATE interventions SET ${n.join(", ")} WHERE id = ?
    `).run(...i))}static getUnresolved(e){return u().prepare("SELECT * FROM interventions WHERE goal_id = ? AND resolved = 0").all(e).map(n=>({id:n.id,goalId:n.goal_id,triggeredBy:n.trigger_type,question:n.question,userResponse:n.user_response,constraintType:n.constraint_type,unlockAction:n.unlock_action,createdAt:new Date(n.created_at+"Z"),resolved:n.resolved===1}))}};function J(o,e,t=o.currentVal,r=Date.now()){let n=o.targetVal-t,i=o.targetVal>0?Number((t/o.targetVal*100).toFixed(1)):0,a=r-10080*60*1e3,s=e.filter(S=>S.loggedAt.getTime()>a),c=0,l="0.0/week (not enough data)";if(s.length>=2){let S=s[0],I=Math.max(1,(r-S.loggedAt.getTime())/(1e3*60*60*24));c=(t-S.value)/I*7,l=`${c.toFixed(1)}/week (7-day average)`}else if(e.length>=2){let S=e[0],I=Math.max(1,(r-S.loggedAt.getTime())/(1e3*60*60*24));c=(t-S.value)/I*7,l=`${c.toFixed(1)}/week (all-time average)`}let f=Math.max(1,(new Date(o.deadline).getTime()-r)/(1e3*60*60*24*7)),g=f>0?n/f:n,T=c>0?n/c:Number.POSITIVE_INFINITY,m=c>0?new Date(r+T*7*24*60*60*1e3).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"No projection (log more data)";return{gapRemaining:n,closedPercent:i,velocity7d:c,targetVelocity:g,weeksRemaining:f,projectedDate:m,velocityLabel:l}}import te from"chalk";async function Tt(o){if(!Number.isFinite(o)){console.log(te.red("Invalid number. Example: `opengoat log 1250`"));return}let e=await d.get("active_goal_id");if(!e){console.log(te.red("No active goal. Run `opengoat init` first."));return}let t=h.getById(e);if(!t){console.log(te.red("Active goal not found in the local database."));return}b.log(e,o),h.updateCurrentValue(e,o);let r=b.getSeries(e),n=Date.now(),i=J(t,r,o,n);console.log(`
Gap updated -> ${o} ${t.unit}`),console.log(`Gap remaining: ${i.gapRemaining} ${t.unit}`),console.log(`Closed: ${i.closedPercent}%`),console.log(`Velocity: ${i.velocityLabel} (need ${Math.round(i.targetVelocity)}/week)`),console.log(`Projected completion: ${i.projectedDate}`);let a={current:o,target:t.targetVal,unit:t.unit,percentClosed:i.closedPercent,gap:i.gapRemaining,velocity7d:i.velocity7d,velocity30d:i.velocity7d*4,targetVelocity:i.targetVelocity,projectedWeeks:i.velocity7d>0?i.gapRemaining/i.velocity7d:999,status:i.velocity7d>=i.targetVelocity?"on-track":"behind",daysSinceMovement:r.length>1?(n-r[r.length-2].loggedAt.getTime())/864e5:0,projectedCompletionDate:i.projectedDate,isBehindSchedule:i.velocity7d<i.targetVelocity},s=ue.evaluateGap(a);if(s!=="silent")if(s==="watching"){let c=ue.generateWatchingQuestion(a);console.log(te.yellow(`
[GoatBrain] -> ${c}`)),console.log(te.dim("(Type 'opengoat why' to answer and trigger a constraint block resolution)")),Y.create({goalId:e,triggeredBy:"stalled-48h",question:c,userResponse:"",constraintType:"clarity",unlockAction:""})}else s==="intervening"&&(console.log(te.red(`
[CRISIS MODE] Your gap has stalled critically. The protocol must be reset.`)),console.log(te.dim("(Run 'opengoat gap' to view full intervention options.)")))}import{render as vo,Box as fe,Text as j}from"ink";import Et from"chalk";import{jsx as ce,jsxs as q}from"react/jsx-runtime";async function xt(){let o=await d.get("active_goal_id");if(!o){console.log(Et.red("No active goal. Run `opengoat init` first."));return}let e=h.getById(o),t=v.getForGoal(o);if(!t||t.length===0){console.log(Et.yellow("No paths generated yet for this goal. Run `opengoat init`."));return}vo(ce(wo,{paths:t,goal:e}))}var wo=({paths:o,goal:e})=>q(fe,{flexDirection:"column",padding:1,children:[q(j,{bold:!0,color:"cyan",children:["GOATBRAIN PATHS FOR: ",e.statement]}),ce(fe,{flexDirection:"column",marginY:1,children:o.map((t,r)=>q(fe,{flexDirection:"column",marginBottom:1,borderStyle:"round",borderColor:t.isActive?"green":"gray",children:[q(j,{bold:!0,color:t.isActive?"green":"white",children:[t.rank,". ",t.name," ",t.isActive&&ce(j,{color:"green",children:"(ACTIVE)"})]}),ce(j,{dimColor:!0,children:t.tagline}),q(fe,{flexDirection:"column",marginY:1,children:[q(j,{children:["Gap Closes: ~",t.weeksToClose," weeks (",t.weeklyHoursRequired," hrs/wk)"]}),q(j,{children:["Capital Req: $",t.capitalRequired]}),q(j,{children:["Confidence: ",Math.round(t.confidenceScore),"%"]})]}),t.isActive&&q(fe,{flexDirection:"column",marginTop:1,children:[ce(j,{bold:!0,color:"yellow",children:"First Action:"}),ce(j,{children:t.firstAction.description})]})]},r))})]});import{render as Ro,Box as Ce,Text as G}from"ink";import{Box as Pe,Text as ye}from"ink";var ot={name:"Goat",colors:{primary:"#EF9F27",secondary:"#1D9E75",success:"#1D9E75",warning:"#E24B4A",muted:"#555550",border:"round"},barChars:{filled:"\u2588",empty:"\u2591"}};import{jsx as Le,jsxs as he}from"react/jsx-runtime";var le=({current:o,target:e,unit:t,theme:r=ot})=>{let n=Math.min(100,Math.round(o/e*100)),i=15,a=Math.round(n/100*i);return he(Pe,{flexDirection:"column",children:[he(Pe,{justifyContent:"space-between",marginBottom:0,children:[Le(ye,{color:r.colors.muted,children:t.toUpperCase()}),he(ye,{bold:!0,color:r.colors.primary,children:[n,"%"]})]}),he(Pe,{children:[Le(ye,{color:r.colors.primary,children:"\u2588".repeat(a)}),Le(ye,{color:"#252525",children:"\u2592".repeat(i-a)}),Le(Pe,{marginLeft:1,children:he(ye,{color:r.colors.muted,children:[o,"/",e]})})]})]})};import{Box as On,Text as In}from"ink";import{jsx as Cn,jsxs as Dn}from"react/jsx-runtime";import{Box as Bn,Text as $n}from"ink";import{jsx as Un}from"react/jsx-runtime";import{Box as Wn,Text as Hn}from"ink";import{jsx as jn,jsxs as qn}from"react/jsx-runtime";import{Box as zn,Text as Zn}from"ink";import{jsx as ei}from"react/jsx-runtime";import bo from"chalk";import{jsx as z,jsxs as K}from"react/jsx-runtime";async function vt(){let o=await d.get("active_goal_id");if(!o){console.log(bo.red("No active goal. Run `opengoat init` first."));return}let e=h.getById(o),t=v.getActivePath(o),r=b.getSeries(o),n=Y.getUnresolved(o);Ro(z(So,{goal:e,activePath:t,history:r,interventions:n}))}var So=({goal:o,activePath:e,history:t,interventions:r})=>{let n=J(o,t);return K(Ce,{flexDirection:"column",padding:1,borderStyle:"round",borderColor:"#EF9F27",children:[z(G,{bold:!0,color:"#EF9F27",children:"GAP STATUS"}),z(Ce,{marginY:1,children:z(le,{current:o.currentVal,target:o.targetVal,unit:o.unit})}),K(G,{dimColor:!0,children:["Goal: ",o.statement]}),e&&K(G,{dimColor:!0,children:["Path: ",e.name]}),K(Ce,{flexDirection:"column",marginTop:1,children:[K(G,{children:["Velocity: ",z(G,{color:n.velocity7d>=n.targetVelocity?"green":"yellow",children:n.velocityLabel})]}),K(G,{children:["Pace: ",n.velocity7d>=n.targetVelocity?"On Track":"Behind Pace"]}),K(G,{children:["Remaining: ",n.gapRemaining.toFixed(1)," ",o.unit]}),K(G,{children:["Projected completion: ",n.projectedDate]})]}),r.length>0&&K(Ce,{flexDirection:"column",marginTop:1,padding:1,borderStyle:"round",borderColor:"red",children:[z(G,{bold:!0,color:"red",children:"ACTIVE INTERVENTION"}),z(G,{children:r[0].question}),z(G,{dimColor:!0,children:"Run `opengoat why` to resolve this block."})]})]})};import Ao from"inquirer";import B from"chalk";async function wt(){let o=await d.get("active_goal_id");if(!o){console.log(B.red("No active goal. Run `opengoat init` first."));return}let e=h.getById(o),t=Q.getByGoalId(o);console.log(B.cyan(`
UPDATING RESOURCES FOR: ${e?.statement}`)),t&&(console.log(B.dim("Your last answers were processed into this mapped profile:")),console.log(B.dim(JSON.stringify(t,null,2)))),console.log(B.yellow(`
Provide new answers for the 5 dimensions. Leave blank to skip that dimension.`));let r=await Ao.prompt([{name:"time",message:"[Time] Any changes to schedule/availability?"},{name:"capital",message:"[Capital] Did funding, income, or runway change?"},{name:"skills",message:"[Skills] Any new skills acquired or tools mastered?"},{name:"network",message:"[Network] Any new valuable connections or platforms?"},{name:"assets",message:"[Assets] Any new leverage or reputation built?"}]);if(!r.time&&!r.capital&&!r.skills&&!r.network&&!r.assets){console.log(B.dim("No changes made. Aborting."));return}console.log(B.blue("GoatBrain is analyzing new dimensions..."));try{let n=await d.get("preferred_provider")||"Ollama (Local)",i=await U(n),a=ee.generateProfileExtractionPrompt(r),s=await M(i,a),c=JSON.parse(s.replace(/```json|```/g,"").trim());Q.save(o,c),console.log(B.blue("Re-calculating paths based on new profile..."));let l=ae.generatePrompt(e,c),f=await M(i,l),g=JSON.parse(f.replace(/```json|```/g,"").trim());v.savePaths(o,g),console.log(B.green("Resources updated and Top 5 Paths fully regenerated.")),console.log(B.dim("Run `opengoat paths` to lock in your new strategy."))}catch(n){console.log(B.red(`GoatBrain failed: ${n.message}`))}}import{v4 as ko}from"uuid";var P=class{static saveWeekScore(e){let t=u(),r=ko();return t.prepare(`
      INSERT INTO week_scores (
        id, goal_id, week_number, velocity_score, consistency, 
        momentum, path_fit, total, rank, xp, gap_at_week
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(goal_id, week_number) DO UPDATE SET
        velocity_score=excluded.velocity_score, consistency=excluded.consistency, 
        momentum=excluded.momentum, path_fit=excluded.path_fit, total=excluded.total, 
        rank=excluded.rank, xp=excluded.xp, gap_at_week=excluded.gap_at_week, 
        scored_at=datetime("now")
    `).run(r,e.goalId,e.weekNumber,e.velocityScore,e.consistency,e.momentum,e.pathFit,e.total,e.rank,e.xp,e.gapAtWeek),r}static getScores(e,t=12){return u().prepare("SELECT * FROM week_scores WHERE goal_id = ? ORDER BY week_number DESC LIMIT ?").all(e,t).map(i=>({id:i.id,goalId:i.goal_id,weekNumber:i.week_number,velocityScore:i.velocity_score,consistency:i.consistency,momentum:i.momentum,pathFit:i.path_fit,total:i.total,rank:i.rank,xp:i.xp,gapAtWeek:i.gap_at_week,scoredAt:new Date(i.scored_at+"Z")}))}};import V from"chalk";async function Rt(){let o=await d.get("active_goal_id");if(!o){console.log(V.red("No active goal. Run `opengoat init` first."));return}let e=h.getById(o),t=v.getActivePath(o),r=b.getSeries(o);if(!e||!t)return;console.log(V.cyan(`
SCORING WEEK ENDING: ${new Date().toISOString().split("T")[0]}`));let n=J(e,r),i=n.targetVelocity>0?Math.min(100,Math.max(0,n.velocity7d/n.targetVelocity*100)):100,a=r.length>5?85:40,s=n.velocity7d>0?90:20,c=95,l=i*.4+a*.3+s*.2+c*.1,f=Math.round(l*10),g="Recruit";l>=90?g="Apex":l>=70?g="Ghost":l>=40&&(g="Operator");let T={goalId:o,weekNumber:P.getScores(o).length+1,velocityScore:i,consistency:a,momentum:s,pathFit:c,total:l,rank:g,xp:f,gapAtWeek:n.gapRemaining};P.saveWeekScore(T),console.log(V.hex("#EF9F27")(`
Velocity Score  : ${Math.round(i)} / 100`)),console.log(V.hex("#EF9F27")(`Consistency     : ${a} / 100`)),console.log(V.hex("#EF9F27")(`Momentum        : ${s} / 100`)),console.log(V.hex("#EF9F27")(`Path Fit        : ${c} / 100`)),console.log(V.green(`
TOTAL SCORE     : ${Math.round(l)}`)),console.log(V.green(`RANK EARNED     : ${g}`)),console.log(V.green(`XP GAINED       : +${f} XP`)),console.log(V.dim(`
Run 'opengoat share' to generate your viral scorecard.
`))}import De from"chalk";import _o from"fs";import Oo from"path";import Io from"os";async function bt(){let o=await d.get("active_goal_id");if(!o){console.log(De.red("\nNo active goal. Run `opengoat init` first.\n"));return}let e=h.getById(o),t=P.getScores(o,1),r=b.getSeries(o),n=t[0],i=n?.rank||"RECRUIT",a=n?.xp||0,s=n?.total||0,c=e?Math.round(e.currentVal/e.targetVal*100):0,l=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OpenGOAT Scorecard</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;900&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #080808;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: 'JetBrains Mono', monospace;
  }
  .card {
    width: 680px;
    background: #0e0e0e;
    border: 1px solid #252525;
    border-radius: 12px;
    padding: 40px;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #EF9F27, #1D9E75);
  }
  .goat { font-size: 48px; margin-bottom: 8px; }
  .brand { font-family: 'Orbitron', monospace; color: #EF9F27; font-size: 24px; font-weight: 900; letter-spacing: 4px; }
  .tagline { color: #555550; font-size: 12px; margin-top: 4px; letter-spacing: 2px; }
  .divider { border: none; border-top: 1px solid #1e1e1e; margin: 24px 0; }
  .goal-label { color: #555550; font-size: 11px; letter-spacing: 2px; margin-bottom: 8px; }
  .goal-text { color: #e8e6df; font-size: 16px; font-weight: 700; line-height: 1.4; }
  .metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 24px 0; }
  .metric { text-align: center; }
  .metric-value { font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 900; color: #EF9F27; }
  .metric-label { color: #555550; font-size: 10px; letter-spacing: 2px; margin-top: 4px; }
  .progress-bar { background: #141414; border-radius: 4px; height: 8px; overflow: hidden; margin: 16px 0 4px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #EF9F27, #1D9E75); border-radius: 4px; transition: width 0.3s; }
  .progress-label { display: flex; justify-content: space-between; color: #555550; font-size: 11px; }
  .rank-badge { display: inline-block; background: #1D9E7522; border: 1px solid #1D9E75; color: #1D9E75; font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; padding: 4px 16px; border-radius: 4px; letter-spacing: 3px; margin-top: 16px; }
  .footer { color: #2a2a28; font-size: 10px; text-align: center; margin-top: 24px; letter-spacing: 2px; }
</style>
</head>
<body>
<div class="card">
  <div class="goat">\u{1F410}</div>
  <div class="brand">OPENGOAT</div>
  <div class="tagline">GOAL OPERATING SYSTEM \xB7 GAP = GOAL \u2212 CURRENT</div>
  <hr class="divider">
  <div class="goal-label">ACTIVE MISSION</div>
  <div class="goal-text">${e?.statement||"No active goal"}</div>
  <div class="metrics">
    <div class="metric">
      <div class="metric-value">${c}%</div>
      <div class="metric-label">GAP CLOSED</div>
    </div>
    <div class="metric">
      <div class="metric-value">${s}</div>
      <div class="metric-label">OPERATOR SCORE</div>
    </div>
    <div class="metric">
      <div class="metric-value">${r.length}</div>
      <div class="metric-label">DATA POINTS</div>
    </div>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width:${Math.min(100,c)}%"></div>
  </div>
  <div class="progress-label">
    <span>${e?.currentVal||0} ${e?.unit||""}</span>
    <span>${e?.targetVal||0} ${e?.unit||""}</span>
  </div>
  <div class="rank-badge">${i}</div>
  <div class="footer">opengoat.dev \xB7 built by a goat, for goats</div>
</div>
</body>
</html>`,f=Oo.join(Io.tmpdir(),`opengoat-share-${Date.now()}.html`);_o.writeFileSync(f,l,"utf-8"),console.log(De.green(`
\u2713 Scorecard generated: ${f}`));try{let{default:g}=await import("open");await g(f),console.log(De.dim(`  Opened in browser. Screenshot and post to X! \u{1F680}
`))}catch{console.log(De.dim(`  Open this file in your browser: ${f}
`))}}import Me from"chalk";async function St(){let o=await d.get("active_goal_id");if(!o){console.log(Me.red("No active goal."));return}let e=h.getById(o),t=b.getSeries(o),r=await d.get("preferred_provider")||"Ollama (Local)";console.log(Me.cyan(`Booting ${r} for deep diagnostic analysis...`));try{let n=await U(r),i=`
You are GoatBrain Diagnostics.
Analyze the following gap velocity time-series and Goal constraints.
Goal: ${JSON.stringify(e,null,2)}
Gap Log: ${JSON.stringify(t,null,2)}

Identify any latent friction patterns or acceleration windows in this exact time-series.
Output a 3-bullet insight summary. Be brutally honest. No intro.
`,a=await M(n,i);console.log(`
${Me.yellow(a)}`)}catch(n){console.log(Me.red(`Diagnostic failed: ${n.message}`))}}import{render as No,Box as Ge,Text as L}from"ink";import Po from"chalk";import{jsx as Z,jsxs as $}from"react/jsx-runtime";async function At(){let o=await d.get("active_goal_id");if(!o){console.log(Po.red("No active goal. Run `opengoat init` first."));return}let e=h.getById(o);if(!e)return;let t=v.getActivePath(o),r=b.getSeries(o),n=P.getScores(o,4);No(Z(Lo,{goal:e,path:t,scores:n,history:r}))}var Lo=({goal:o,path:e,scores:t,history:r})=>{let n=J(o,r),i=t.length>0?t[0].rank:"UNRANKED",a=t.reduce((s,c)=>s+c.xp,0);return $(Ge,{flexDirection:"column",padding:1,borderStyle:"round",borderColor:"#EF9F27",children:[Z(L,{bold:!0,color:"#EF9F27",children:"OPENGOAT COCKPIT"}),Z(Ge,{marginY:1,children:Z(le,{current:o.currentVal,target:o.targetVal,unit:o.unit})}),$(L,{dimColor:!0,children:["Goal: ",o.statement]}),$(L,{dimColor:!0,children:["Deadline: ",o.deadline," (",Math.round(n.closedPercent),"% Closed)"]}),$(L,{dimColor:!0,children:["Remaining: ",n.gapRemaining," ",o.unit]}),$(L,{dimColor:!0,children:["Velocity: ",n.velocityLabel]}),$(L,{dimColor:!0,children:["Projected completion: ",n.projectedDate]}),$(Ge,{flexDirection:"column",marginTop:1,padding:1,borderStyle:"round",borderColor:"yellow",children:[Z(L,{bold:!0,color:"yellow",children:"ACTIVE STRATEGY"}),Z(L,{children:e?e.name:"None Selected (Run `opengoat paths`)"}),e&&Z(L,{dimColor:!0,children:e.tagline})]}),$(Ge,{flexDirection:"column",marginTop:1,padding:1,borderStyle:"round",borderColor:"green",children:[Z(L,{bold:!0,color:"green",children:"OPERATOR STATS"}),$(L,{children:["Current Rank: ",i]}),$(L,{children:["Total XP: ",a]}),$(L,{children:["Logs: ",r.length," entries"]})]})]})};import rt from"chalk";import Co from"path";import Do from"cors";async function kt(o){let e=(await import("express")).default,t=e(),r=Number(o)||3e3;t.use(e.json()),t.use(Do());let n=Co.join(process.cwd(),"web");t.use(e.static(n)),t.get("/api/state",async(i,a)=>{let s=await d.get("active_goal_id");if(!s)return a.status(404).json({error:"No active goal"});let c=h.getById(s),l=v.getActivePath(s),f=b.getSeries(s),g=P.getScores(s,1);a.json({goal:c?.statement,gap:{current:c?.currentVal,target:c?.targetVal,unit:c?.unit},score:{total:g.length>0?g[0].total:0,rank:g.length>0?g[0].rank:"RECRUIT",xp:g.length>0?g[0].xp:0},path:l?.name,historyCount:f.length})}),t.get("/api/state/stream",async(i,a)=>{a.setHeader("Content-Type","text/event-stream"),a.setHeader("Cache-Control","no-cache"),a.setHeader("Connection","keep-alive"),a.flushHeaders();let s=async()=>{let l=await d.get("active_goal_id");if(!l)return{error:"No active goal"};let f=h.getById(l),g=v.getActivePath(l),T=b.getSeries(l),m=P.getScores(l,1);return{goal:f?.statement,gap:{current:f?.currentVal,target:f?.targetVal,unit:f?.unit},score:{total:m[0]?.total||0,rank:m[0]?.rank||"RECRUIT",xp:m[0]?.xp||0},path:g?.name,historyCount:T.length,ts:Date.now()}};a.write(`data: ${JSON.stringify(await s())}

`);let c=setInterval(async()=>{try{a.write(`data: ${JSON.stringify(await s())}

`)}catch{clearInterval(c)}},2e3);i.on("close",()=>clearInterval(c))}),t.get("/api/v1/goal",async(i,a)=>{let s=await d.get("active_goal_id");if(!s)return a.status(404).json({error:"No active goal"});let c=h.getById(s);a.json(c)}),t.get("/api/v1/paths/active",async(i,a)=>{let s=await d.get("active_goal_id");if(!s)return a.status(404).json({error:"No active goal"});let c=v.getActivePath(s);a.json(c)}),t.get("/api/v1/gap/history",async(i,a)=>{let s=await d.get("active_goal_id");if(!s)return a.status(404).json({error:"No active goal"});let c=b.getSeries(s);a.json(c)}),t.post("/api/v1/gap/log",async(i,a)=>{let s=await d.get("active_goal_id");if(!s)return a.status(404).json({error:"No active goal"});let{value:c,note:l}=i.body,f=b.log(s,Number(c),l);h.updateCurrentValue(s,Number(c)),a.json(f)}),t.listen(r,async()=>{let i=`http://localhost:${r}`;console.log(rt.green(`
\u{1F680} OpenGOAT API running on ${i}`)),console.log(rt.hex("#1D9E75")(`   SSE live stream: ${i}/api/state/stream`)),console.log(rt.dim(`   Hook in your Obsidian/Notion/iOS plugins to read the local gap state.
`));let{default:a}=await import("open").catch(()=>({default:null}));a&&a(i)})}import _t from"chalk";async function Ot(){console.log(_t.red.bold("NUCLEAR PURGE INITIATED"));let o=u();o.transaction(()=>{o.prepare("DELETE FROM gap_log").run(),o.prepare("DELETE FROM interventions").run(),o.prepare("DELETE FROM missions").run(),o.prepare("DELETE FROM week_scores").run(),o.prepare("DELETE FROM paths").run(),o.prepare("DELETE FROM resource_profiles").run(),o.prepare("DELETE FROM goals").run()})(),await d.set("active_goal_id",null),console.log(_t.green("All local GoatOS data deleted."))}import{useState as Te,useEffect as It,memo as nt}from"react";import{render as Mo,Box as E,Text as y,useInput as Go,useApp as Bo,useStdout as $o}from"ink";import{jsx as p,jsxs as w}from"react/jsx-runtime";var oe="#EF9F27",re="#1D9E75",Be="#E24B4A",_="#555550",pe="#333333";var Fo=nt(({goal:o,gap:e,closedPct:t,rank:r})=>w(E,{borderStyle:"round",borderColor:pe,paddingX:1,justifyContent:"space-between",height:3,flexShrink:0,children:[w(E,{children:[p(y,{color:oe,bold:!0,children:"GOAT_OS // "}),p(y,{color:_,children:"MISSION: "}),p(y,{color:"white",wrap:"truncate-end",children:o||"UNASSIGNED"})]}),w(E,{children:[p(y,{color:_,children:"GAP: "}),p(y,{color:oe,children:e||"--"}),p(y,{color:_,children:" \u2502 "}),p(y,{color:_,children:"CLOSED: "}),w(y,{color:re,children:[t,"%"]}),p(y,{color:_,children:" \u2502 "}),w(y,{color:re,bold:!0,children:["[",r?.toUpperCase()||"RECRUIT","]"]})]})]})),Uo=nt(({current:o,target:e,unit:t,compact:r=!1,height:n})=>w(E,{flexDirection:"column",width:32,height:n,paddingX:1,borderStyle:"round",borderColor:pe,flexShrink:0,overflow:"hidden",children:[p(y,{color:_,bold:!0,children:"TELEMETRY"}),p(E,{marginY:1,children:p(le,{current:o,target:e,unit:t})}),w(E,{flexDirection:"column",marginTop:1,children:[p(y,{color:_,children:"VELOCITY"}),p(y,{color:re,bold:!0,children:"+14.2/wk"}),w(E,{marginTop:1,flexDirection:"column",children:[p(y,{color:_,children:"PROJECTION"}),p(y,{color:"white",children:"Wk 14 (Nov 26)"})]})]}),w(E,{flexGrow:1,justifyContent:"flex-end",flexDirection:"column",children:[p(y,{color:_,children:"SYSTEM STATUS"}),p(y,{color:re,children:"\u25CF NOMINAL"})]})]})),Vo=nt(({score:o,xp:e,compact:t=!1,height:r})=>w(E,{flexDirection:"column",width:32,height:r,paddingX:1,borderStyle:"round",borderColor:pe,flexShrink:0,overflow:"hidden",children:[p(y,{color:_,bold:!0,children:"OPERATOR"}),w(E,{marginY:1,flexDirection:"column",children:[p(y,{color:_,children:"SCORE"}),p(y,{color:oe,bold:!0,children:o})]}),w(E,{flexDirection:"column",marginTop:1,children:[p(y,{color:_,children:"MOMENTUM"}),p(y,{color:oe,children:"\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591"}),w(E,{marginTop:1,flexDirection:"column",children:[p(y,{color:_,children:"SYNC RATE"}),p(y,{color:re,children:"\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588"})]})]}),p(E,{flexGrow:1,justifyContent:"flex-end",children:p(E,{borderStyle:"single",borderColor:"#4a1515",width:"100%",justifyContent:"center",children:p(y,{color:Be,bold:!0,children:" \u26A1 OVERRIDE"})})})]})),Xo=()=>p(y,{color:oe,children:"\u2588"}),Wo=({onSubmit:o,onExit:e,width:t})=>{let[r,n]=Te("");return Go((i,a)=>{a.return?(r.trim()&&o(r),n("")):a.backspace||a.delete?n(s=>s.slice(0,-1)):a.escape?e():i&&!a.ctrl&&!a.meta&&n(s=>s+i)}),w(E,{borderStyle:"round",borderColor:pe,paddingX:1,flexShrink:0,height:3,children:[p(y,{color:oe,bold:!0,children:"# "}),p(y,{color:"white",wrap:"truncate-end",children:r.slice(0,t)}),p(Xo,{})]})},Ho=()=>{let{exit:o}=Bo(),{stdout:e}=$o(),[t,r]=Te({rows:e.rows,columns:e.columns});It(()=>{let R=()=>r({rows:e.rows,columns:e.columns});return e.on("resize",R),()=>{e.off("resize",R)}},[e]);let[n,i]=Te([{type:"system",text:"boot sequence initiated..."},{type:"system",text:"goatbrain v2.6 loaded (anti-flicker mode)."},{type:"info",text:"awaiting operator input."}]),[a,s]=Te({goal:null,gap:{current:0,target:100,unit:""},score:{total:0,rank:"Recruit"}}),[c,l]=Te(!1);It(()=>{(async()=>{try{let k=await d.get("active_goal_id");if(k){let D=h.getById(k),me=P.getScores(k,1),Yt=me.reduce((jt,qt)=>jt+qt.xp,0);s({goal:D?.statement,gap:{current:D?.currentVal||0,target:D?.targetVal||100,unit:D?.unit||""},score:{total:Yt,rank:me[0]?.rank||"Recruit"}})}}catch{}})()},[]);let f=(R,k)=>{i(D=>[...D.slice(-30),{type:R,text:k}])},g=async R=>{let k=R.trim();if(k)if(f("cmd",`> ${k}`),k.startsWith("/")){let[D,...me]=k.slice(1).split(" ");switch(D.toLowerCase()){case"q":case"quit":case"exit":o();break;case"help":f("info","COMMANDS: /clear, /refresh, /quit");break;case"clear":i([]);break;default:f("warn",`Unknown command: /${D}`)}}else l(!0),await T(k),l(!1)},T=async R=>{try{let k=await U(await d.get("preferred_provider")||"groq"),D=`You are GoatBrain OS. You live in a terminal. Keep answers extremely short, 1-2 sentences. Goal context: ${a.goal}`,me=await M(k,`${D}

User: ${R}`);f("ai",me)}catch(k){f("warn",`NETWORK ERROR: ${k.message}`)}},m=Math.round(a.gap.current/a.gap.target*100),S=t.rows<25,I=3,ie=3,Xe=3,de=4,F=Math.max(5,t.rows-Xe-ie-de),Re=Math.max(30,t.columns-64-2),be=Math.max(1,F-3-(c?1:0)-2),Ht=n.slice(-be);return t.rows<15||t.columns<80?p(E,{padding:1,borderStyle:"round",borderColor:Be,children:w(y,{color:Be,bold:!0,children:["WINDOW TOO SMALL. PLEASE RESIZE. (",t.columns,"x",t.rows,")"]})}):w(E,{flexDirection:"column",height:t.rows-de,overflow:"hidden",children:[p(Fo,{goal:a.goal,gap:a.gap.target-a.gap.current,closedPct:m,rank:a.score.rank}),w(E,{height:F,overflow:"hidden",children:[p(Uo,{current:a.gap.current,target:a.gap.target,unit:a.gap.unit,compact:S,height:F}),w(E,{flexDirection:"column",flexGrow:1,height:F,borderStyle:"round",borderColor:pe,paddingX:1,overflow:"hidden",children:[w(E,{flexGrow:1,flexDirection:"column",overflowY:"hidden",children:[Ht.map((R,k)=>w(E,{paddingLeft:R.type==="ai"?0:2,height:1,overflow:"hidden",children:[p(y,{color:R.type==="cmd"?oe:R.type==="ai"?re:R.type==="warn"?Be:_,children:R.type==="cmd"?"":R.type==="ai"?"\u25C6  ":""}),p(y,{color:(R.type==="cmd","white"),dimColor:R.type==="system",bold:R.type==="cmd",wrap:"truncate-end",children:R.text.slice(0,Re-8)})]},k)),c&&p(E,{paddingLeft:2,height:1,children:p(y,{color:re,italic:!0,children:"goatbrain is thinking..."})})]}),p(Wo,{onSubmit:g,onExit:o,width:Re-10})]}),p(Vo,{score:a.score.total,xp:a.score.total,compact:S,height:F})]}),w(E,{borderStyle:"round",borderColor:pe,paddingX:1,justifyContent:"space-between",height:ie,flexShrink:0,children:[p(E,{children:p(y,{color:_,children:"GOAT_OS v3.0 [PREMIUM]"})}),p(E,{children:w(y,{color:_,children:["[T: ",t.columns,"x",t.rows," | M: ",process.memoryUsage().rss/1024/1024|0,"MB]"]})})]})]})};async function Nt(){process.stdout.write("\x1B[?1049h"),process.stdout.write("\x1B[?25l");let{waitUntilExit:o}=Mo(p(Ho,{}));try{await o()}finally{process.stdout.write("\x1B[?1049l"),process.stdout.write("\x1B[?25h"),process.exit(0)}}import x from"chalk";import{v4 as Yo}from"uuid";var X=class{static getByGoal(e,t){return u().prepare("SELECT * FROM missions WHERE goal_id = ? AND week = ?").all(e,t).map(i=>({id:i.id,title:i.title,description:i.description,estimatedHours:i.estimated_hours,status:i.status,week:i.week,pathId:i.path_id,goalId:i.goal_id,xp:i.xp,difficulty:i.difficulty,createdAt:new Date(i.created_at+"Z")}))}static create(e){let t=u(),r=Yo();return t.prepare(`
      INSERT INTO missions (id, title, description, estimated_hours, status, week, path_id, goal_id, xp, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(r,e.title,e.description,e.estimatedHours,e.status,e.week,e.pathId,e.goalId,e.xp,e.difficulty),r}static createMany(e){let t=u(),r=t.prepare(`
      INSERT OR REPLACE INTO missions (
        id, title, description, estimated_hours, status, week, path_id, goal_id, xp, difficulty, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);t.transaction(()=>{for(let n of e)r.run(n.id,n.title,n.description,n.estimatedHours,n.status,n.week,n.pathId,n.goalId,n.xp,n.difficulty,n.createdAt.toISOString())})()}static getAllByGoal(e){return u().prepare("SELECT * FROM missions WHERE goal_id = ? ORDER BY week DESC").all(e).map(n=>({id:n.id,title:n.title,description:n.description,estimatedHours:n.estimated_hours,status:n.status,week:n.week,pathId:n.path_id,goalId:n.goal_id,xp:n.xp,difficulty:n.difficulty,createdAt:new Date(n.created_at+"Z")}))}static markComplete(e){u().prepare(`
      UPDATE missions
      SET status = 'complete', completed_at = datetime('now')
      WHERE id = ?
    `).run(e)}static markMissed(e){u().prepare(`
      UPDATE missions
      SET status = 'missed'
      WHERE id = ?
    `).run(e)}};import{v4 as it}from"uuid";var jo=10080*60*1e3;function Pt(o,e,t){return Math.min(t,Math.max(e,o))}function Lt(o,e){let t=o.trim();return t?t.length>48?`${t.slice(0,45).trimEnd()}...`:t:e}function Ct(o){return o<=1.5?1:o<=4?2:3}function Ee(o,e=Date.now()){return Math.max(1,Math.floor((e-o.createdAt.getTime())/jo)+1)}function Dt(o,e,t=Ee(o)){let r=[],n=Pt(e.weeklyHoursRequired>0?e.weeklyHoursRequired/Math.max(2,Math.min(e.milestones.length||1,3)):2,1,6);r.push({id:it(),title:Lt(e.firstAction.description,`Start ${e.name}`),description:e.firstAction.description,estimatedHours:Pt(e.firstAction.timeRequired/60||1,.5,2),status:"pending",week:t,pathId:e.id,goalId:o.id,xp:120,difficulty:Ct(e.firstAction.timeRequired/60||1),createdAt:new Date});for(let i of e.milestones.slice(0,3))r.push({id:it(),title:Lt(i.description,`Advance milestone ${i.week}`),description:`${i.description} Target metric: ${i.metric} ${i.unit}.`,estimatedHours:n,status:"pending",week:t,pathId:e.id,goalId:o.id,xp:150,difficulty:Ct(n),createdAt:new Date});return r.push({id:it(),title:"Review velocity and adjust",description:`Review progress on "${o.statement}", compare results against ${e.name}, and update your next move.`,estimatedHours:1,status:"pending",week:t,pathId:e.id,goalId:o.id,xp:100,difficulty:1,createdAt:new Date}),r}function qo(o){return o==="complete"?x.green("[\u2713]"):o==="pending"?x.yellow("[\u2192]"):x.red("[\xD7]")}function Mt(o,e){let t=X.getAllByGoal(o),r=t.find(i=>i.id===e);if(r)return r.id;let n=t.filter(i=>i.id.startsWith(e));return n.length===1?n[0].id:null}function Ko(o,e){let t=Ee(e),r=X.getByGoal(o,t),n=!1;if(r.length===0){let i=v.getActivePath(o);if(!i)return{missions:r,week:t,generated:n,activePath:null};r=Dt(e,i,t),X.createMany(r),n=!0}return{missions:r,week:t,generated:n,activePath:v.getActivePath(o)}}async function Gt(o,e){let t=await d.get("active_goal_id");if(!t){console.log(x.red("\n No active goal. Run `opengoat init` first.\n"));return}let r=h.getById(t);if(!r){console.log(x.red(`
 Active goal not found in the local database.
`));return}if(o==="complete"&&e){let m=Mt(t,e);if(!m){console.log(x.red(`
 Mission ${e} was not found. Use the shown 8-character ID prefix.
`));return}X.markComplete(m),console.log(x.green(`
\u2713 Mission ${m.slice(0,8)} complete!`));return}if(o==="missed"&&e){let m=Mt(t,e);if(!m){console.log(x.red(`
 Mission ${e} was not found. Use the shown 8-character ID prefix.
`));return}X.markMissed(m),console.log(x.yellow(`
! Mission ${m.slice(0,8)} marked missed.`));return}let{missions:n,week:i,generated:a,activePath:s}=Ko(t,r);if(n.length===0){console.log(x.dim("\n No generated missions found for this goal. Select an active path with `opengoat paths` first.\n"));return}let c=n.filter(m=>m.status==="complete").length,l=n.filter(m=>m.status==="complete").reduce((m,S)=>m+S.xp,0),f=n.reduce((m,S)=>m+S.xp,0);console.log(`
`+x.hex("#EF9F27").bold(`  \u25E2 MISSION BOARD \u2014 ${r.statement}`)),console.log(x.dim(`  Week ${i} \xB7 Path: ${s?.name||"None selected"} \xB7 Progress: ${c}/${n.length} missions \xB7 ${l} XP earned`)),console.log(a?x.green(`  Generated this week's mission set from your active path.
`):"");for(let m of n){let S=qo(m.status),I=m.status==="complete"?x.dim:x.white.bold,ie=m.status==="complete"?x.green:m.status==="missed"?x.red:x.dim;console.log(`  ${S} ${I(m.title.padEnd(30))} ${ie(`+${m.xp} XP`)}  ${x.dim(`(ID: ${m.id.slice(0,8)})`)}`),m.status!=="complete"&&console.log(x.dim(`      ${m.description}`))}let g=Math.round(c/Math.max(1,n.length)*100),T="\u2588".repeat(Math.round(g/5))+"\u2591".repeat(20-Math.round(g/5));console.log(`
`+x.dim(`  [${T}] ${g}% Mission Complete`)),console.log(x.hex("#1D9E75")(`  Total XP Pool: ${f} XP available
`)),c<n.length&&(console.log(x.dim("  To complete a mission: opengoat missions complete <ID>")),console.log(x.dim("  To mark one missed:     opengoat missions missed <ID>")))}import{render as Jo,Box as $e,Text as Fe}from"ink";function Bt(o,e){let t=o.length,r=o.filter(T=>T.status==="complete").length,n=o.filter(T=>T.status==="missed").length,i=t>0?Math.round(r/t*100):0,a=Math.max(0,100-n*15),s=Math.min(100,i*1.1),c=10,l=t===0?0:Math.round(i*.4+a*.3+s*.2+c*.1),f=r*100+Math.floor(l/10)*50,g=l>=90?"Apex":l>=70?"Ghost":l>=40?"Operator":"Recruit";return{execution:i,consistency:a,capitalVelocity:s,reflection:c,total:l,rank:g,xp:f,weekNumber:e}}import{jsx as at,jsxs as xe}from"react/jsx-runtime";async function $t(){let o=h.getAllActive();if(o.length!==0)for(let e of o){let t=Ee(e),r=X.getByGoal(e.id,t),n=Bt(r,t),i=r.length,a=r.filter(c=>c.status==="complete").length,s=r.filter(c=>c.status==="missed").length;Jo(xe($e,{flexDirection:"column",borderStyle:"double",borderColor:"yellow",padding:1,marginY:1,children:[xe(Fe,{bold:!0,inverse:!0,color:"yellow",children:[" WEEK ",t," RECAP: ",e.statement.toUpperCase()," "]}),at($e,{marginTop:1,children:xe(Fe,{color:"green",children:["SUCCESS: ",a," missions crushed"]})}),at($e,{children:xe(Fe,{color:"red",children:["MISSED: ",s," protocols drifted"]})}),at($e,{marginTop:1,children:xe(Fe,{bold:!0,children:["FINAL SCORE: ",n.total," (",n.rank,")"]})})]}))}}import{Command as zo}from"commander";import O from"chalk";import Zo from"os";import st from"path";import ve from"fs";import Qo from"better-sqlite3";var Ft=new zo("doctor").description("Run diagnostic health checks on the OpenGOAT system").action(async()=>{console.log(O.bold.cyan(`
\u{1FA7A} OpenGOAT System Doctor`)),console.log(O.dim("========================================="));let o=0,e=0,t=(i,a,s)=>{let c=a==="OK"?O.green("\u2713"):a==="WARN"?O.yellow("\u26A0"):O.red("\u2717"),l=a==="OK"?O.green:a==="WARN"?O.yellow:O.red;console.log(`${c} ${O.bold(i)}: ${l(a)}`),s&&console.log(`   ${O.dim(s)}`),a==="WARN"&&e++,a==="FAIL"&&o++},r=st.join(Zo.homedir(),".opengoat");try{if(!ve.existsSync(r))t("Home Directory","WARN","~/.opengoat does not exist. It will be created automatically.");else{let i=ve.statSync(r);ve.accessSync(r,ve.constants.W_OK),t("Home Directory","OK","~/.opengoat is accessible.")}}catch(i){t("Home Directory","FAIL",`Cannot access ~/.opengoat: ${i.message}`)}try{let i=et();if(ve.existsSync(i)){let a=new Qo(i,{fileMustExist:!0}),s=a.prepare("SELECT COUNT(*) as count FROM goals").get();t("Database","OK",`Connected to ${st.basename(i)}. Found ${s.count} goals.`),a.close()}else t("Database","WARN",`${st.basename(i)} does not exist yet. Run 'opengoat init'.`)}catch(i){t("Database","FAIL",`Database connection failed: ${i.message}`)}let n=[];try{let i=W.get("opengoat","groq"),a=W.get("opengoat","anthropic"),s=W.get("opengoat","openai"),c=W.get("opengoat","ollama"),l=[i?"groq":null,a?"anthropic":null,s?"openai":null,c?"ollama":null].filter(Boolean);n=l,l.length>0?t("Secret Store","OK",`Found configurations for: ${l.join(", ")}`):t("Secret Store","WARN","No API keys configured. Run 'opengoat init' to set up an AI provider.")}catch(i){t("Secret Store","FAIL",`Failed to access SecretStore: ${i.message}`)}console.log(O.dim(`
Probing AI Provider connectivity...`));try{if(n.length>0){let i=n[0],a=await U(i),s=Date.now(),c=await a.complete('Reply exactly with the word "pong". Output no other text.'),l=Date.now()-s;c&&c.toLowerCase().includes("pong")?t(`AI Connection (${i})`,"OK",`Provider responded in ${l}ms. (${c.trim()})`):t(`AI Connection (${i})`,"WARN",`Provider responded but output was unexpected: ${c}`)}else t("AI Connection","WARN","Skipped probe. No AI provider configured.")}catch(i){t("AI Connection","FAIL",`AI connectivity test failed: ${i.message}`)}console.log(O.dim(`
=========================================`)),console.log(o===0&&e===0?O.bold.green("All systems nominal. OpenGOAT is ready."):O.bold(`Diagnosis complete with ${O.red(o+" errors")} and ${O.yellow(e+" warnings")}.`)),process.exit(o>0?1:0)});import tr from"inquirer";import ne from"chalk";var er=[{constraintType:"time",matches:["time","busy","schedule","work","hours","calendar"],unlockAction:"Block a concrete 60-90 minute slot today and define one visible output for that session."},{constraintType:"skill",matches:["skill","learn","don't know","unclear technically","stuck technically","hard"],unlockAction:"Shrink the work to a tutorial-sized slice and finish one proof-of-work before returning to the larger task."},{constraintType:"resource",matches:["money","resource","budget","tool","equipment","capital"],unlockAction:"Reduce scope to what you can do with current resources or identify the single cheapest missing input to acquire next."},{constraintType:"external",matches:["waiting","client","approval","reply","response","dependency","blocked by"],unlockAction:"Send the blocking request now, set a follow-up date, and create one parallel task that does not depend on the response."},{constraintType:"motivation",matches:["motivation","tired","burned out","avoid","procrast","energy"],unlockAction:"Cut the task down to a 15-minute starter action and begin before you evaluate how you feel about it."}];function Ut(o){let e=o.trim().toLowerCase();for(let t of er)if(t.matches.some(r=>e.includes(r)))return{constraintType:t.constraintType,unlockAction:t.unlockAction};return{constraintType:"clarity",unlockAction:"Rewrite the next move as one action you can finish in under 2 hours, then execute only that step."}}async function Vt(o){let e=await d.get("active_goal_id");if(!e){console.log(ne.red("No active goal. Run `opengoat init` first."));return}let t=Y.getUnresolved(e);if(t.length===0){console.log(ne.dim("No active intervention. Keep executing."));return}let r=t[0],n=o?.trim();if(n||(console.log(ne.yellow(`
[GoatBrain] ${r.question}`)),n=(await tr.prompt([{name:"response",message:"What is the real blocker right now?"}])).response.trim()),!n){console.log(ne.dim("No response captured. Aborting."));return}let i=Ut(n);Y.update(r.id,{userResponse:n,constraintType:i.constraintType,unlockAction:i.unlockAction,resolved:!0}),console.log(ne.green(`
Intervention resolved.`)),console.log(ne.dim(`Constraint type: ${i.constraintType}`)),console.log(ne.bold(`Next unlock action: ${i.unlockAction}
`))}import or from"os";import Ve from"path";import we from"fs/promises";var ct=class{playbooks=new Map;providers=new Map;renderers=new Map;storage=null;registerPlaybook(e){this.playbooks.set(e.name,e)}registerProvider(e){this.providers.set(e.name,e)}registerRenderer(e){this.renderers.set(e.name,e)}setStorage(e){this.storage=e}getPlaybooks(){return Array.from(this.playbooks.values())}getProviders(){return Array.from(this.providers.values())}getProvider(e){return this.providers.get(e)}getStorage(){return this.storage}},lt=new ct;import Xt from"chalk";var Ue=Ve.join(or.homedir(),".opengoat","skills");async function Wt(){try{try{await we.access(Ue)}catch{await we.mkdir(Ue,{recursive:!0});return}let o=await we.readdir(Ue,{withFileTypes:!0});for(let e of o)if(e.isDirectory()){let t=Ve.join(Ue,e.name),r=Ve.join(t,"index.js"),n=Ve.join(t,"index.mjs"),i=null;try{await we.access(r),i=r}catch{}if(!i)try{await we.access(n),i=n}catch{}if(i)try{let s=await import(new URL(`file://${i}`).href);if(s.default&&typeof s.default=="function"){let c=s.default();c.name&&c.category&&lt.registerPlaybook(c)}else s.plugin&&lt.registerPlaybook(s.plugin)}catch(a){console.error(Xt.yellow(`[SkillsLoader] Failed to load skill '${e.name}': ${a.message}`))}}}catch(o){console.error(Xt.red(`[SkillsLoader] Critical failure reading ~/.opengoat/skills: ${o.message}`))}}var A=new rr;A.name("opengoat").description("The GOAT Operating System for Goals v1").version("1.0.0").showHelpAfterError().action(()=>{A.outputHelp()});A.command("init").description("Setup wizard and 5D resource mapping").action(ht);A.command("log <number>").description("Log your current number towards the gap").action(o=>Tt(Number(o)));A.command("paths").description("View and select GoatBrain generated paths").action(xt);A.command("gap").description("View current gap velocity and interventions").action(vt);A.command("why [response]").description("Resolve the current intervention block").action(Vt);A.command("resources").description("Update your 5D resources and re-calculate paths").action(wt);A.command("score").description("Calculate weekly OS operator score").action(Rt);A.command("share").description("Generate shareable HTML scorecard").action(bt);A.command("analyze").description("Cross-goal correlation logic").action(St);A.command("dashboard").description("Live terminal cockpit UI").action(At);A.command("interactive").description("Launch the experimental full-screen shell").action(Nt);A.command("serve").description("Start Plugin API layer").action(kt);A.command("reset").description("Nuclear data purge").action(Ot);A.command("missions [action] [id]").description("View protocol missions and XP progress").action(Gt);A.command("recap").description("Weekly performance recap and insights").action($t);A.addCommand(Ft);(async()=>(await Wt(),await A.parseAsync(process.argv)))();
//# sourceMappingURL=index.js.map