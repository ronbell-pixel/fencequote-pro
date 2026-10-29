import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";

export type AppRole = "owner" | "manager" | "salesperson";
export type Session = { userId:string; oaiUserId:string; email:string; name:string; platformRole:"super_admin"|null; companyId:string; role:AppRole; supportMode:boolean };
const now = () => new Date().toISOString();
const id = (prefix:string) => `${prefix}_${crypto.randomUUID().replaceAll("-","")}`;
export const db = () => env.DB;

async function ensureRuntimeSchema(){
  const d1=db(); const sql=[
    "CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,legal_name TEXT,slug TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'trial',setup_step INTEGER NOT NULL DEFAULT 1,settings TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS company_settings (company_id TEXT PRIMARY KEY NOT NULL,address TEXT,city TEXT,state TEXT,zip TEXT,phone TEXT,email TEXT,website TEXT,primary_contact TEXT,timezone TEXT,logo_key TEXT,primary_color TEXT NOT NULL DEFAULT '#123447',secondary_color TEXT NOT NULL DEFAULT '#2f7d62',accent_color TEXT NOT NULL DEFAULT '#c8ef5a',sales_tax REAL NOT NULL DEFAULT 0,deposit_pct REAL NOT NULL DEFAULT 30,quote_expiration_days INTEGER NOT NULL DEFAULT 30,estimate_prefix TEXT NOT NULL DEFAULT 'FQP',next_estimate_number INTEGER NOT NULL DEFAULT 10001,min_gross_margin REAL NOT NULL DEFAULT 30,max_sales_discount REAL NOT NULL DEFAULT 5,proposal_terms TEXT,proposal_footer TEXT,approval_text TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL,oai_user_id TEXT NOT NULL UNIQUE,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,platform_role TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL UNIQUE,description TEXT,created_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS company_users (company_id TEXT NOT NULL,user_id TEXT NOT NULL,role TEXT NOT NULL,pricing_admin INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(company_id,user_id))",
    "CREATE TABLE IF NOT EXISTS invitations (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,email TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',invited_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(company_id,email))",
    "CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,first_name TEXT NOT NULL,last_name TEXT NOT NULL,customer_company TEXT,property_address TEXT NOT NULL,billing_address TEXT,phone TEXT,mobile TEXT,email TEXT,lead_source TEXT,notes TEXT,assigned_user_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS properties (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,customer_id TEXT NOT NULL,address TEXT NOT NULL,city TEXT NOT NULL,state TEXT NOT NULL,zip TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,category TEXT NOT NULL,name TEXT NOT NULL,style TEXT,height TEXT,color TEXT,material_cost_per_foot REAL NOT NULL,labor_cost_per_foot REAL NOT NULL,post_cost REAL NOT NULL DEFAULT 0,concrete_cost REAL NOT NULL DEFAULT 0,other_cost_per_foot REAL NOT NULL DEFAULT 0,sell_price_per_foot REAL NOT NULL,minimum_sell_price_per_foot REAL NOT NULL DEFAULT 0,removal_price_per_foot REAL NOT NULL DEFAULT 0,minimum_charge REAL NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS gates (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,description TEXT NOT NULL,width REAL NOT NULL,internal_cost REAL NOT NULL,sell_price REAL NOT NULL,labor_cost REAL NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS addons (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,name TEXT NOT NULL,pricing_mode TEXT NOT NULL,internal_cost REAL NOT NULL,customer_price REAL NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS estimates (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_number TEXT NOT NULL,customer_id TEXT NOT NULL,property_id TEXT,assigned_user_id TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,discount_type TEXT NOT NULL DEFAULT 'percentage',discount_value REAL NOT NULL DEFAULT 0,discount_pct REAL NOT NULL DEFAULT 0,approval_status TEXT NOT NULL DEFAULT 'not_required',tax_rate REAL NOT NULL DEFAULT 0,subtotal REAL NOT NULL DEFAULT 0,total REAL NOT NULL DEFAULT 0,deposit REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(company_id,estimate_number))",
    "CREATE TABLE IF NOT EXISTS estimate_costs (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,material_cost REAL NOT NULL,labor_cost REAL NOT NULL,gate_cost REAL NOT NULL DEFAULT 0,other_cost REAL NOT NULL,total_cost REAL NOT NULL,gross_profit REAL NOT NULL,gross_margin REAL NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(company_id,estimate_id))",
    "CREATE TABLE IF NOT EXISTS estimate_drafts (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,user_id TEXT NOT NULL,customer_id TEXT,payload TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(company_id,user_id))",
    "CREATE TABLE IF NOT EXISTS estimate_sections (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,material_id TEXT NOT NULL,section_name TEXT NOT NULL,description TEXT NOT NULL,length_feet REAL NOT NULL,style TEXT,height TEXT,color TEXT,sell_price REAL NOT NULL DEFAULT 0,notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS estimate_gates (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,section_id TEXT,gate_id TEXT NOT NULL,width REAL NOT NULL,quantity INTEGER NOT NULL,sell_price REAL NOT NULL DEFAULT 0,notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS estimate_addons (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,addon_id TEXT NOT NULL,quantity REAL NOT NULL,customer_price REAL NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS estimate_notes (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,section_id TEXT,visibility TEXT NOT NULL,body TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS estimate_versions (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,version INTEGER NOT NULL,approval_token TEXT NOT NULL UNIQUE,snapshot TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(company_id,estimate_id,version))",
    "CREATE TABLE IF NOT EXISTS quote_acceptances (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,version_id TEXT NOT NULL,customer_name TEXT NOT NULL,signature TEXT NOT NULL,approved_amount REAL NOT NULL,accepted_at TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(company_id,version_id))",
    "CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT,user_id TEXT NOT NULL,action TEXT NOT NULL,metadata TEXT,created_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS estimate_photos (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,section_id TEXT,target_type TEXT NOT NULL DEFAULT 'job',target_id TEXT,r2_key TEXT NOT NULL,content_type TEXT NOT NULL,description TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"
  ];
  await d1.batch(sql.map(statement=>d1.prepare(statement)));
}

async function identity(request:Request) {
  const user = await getChatGPTUser();
  if (user) return { oaiUserId:user.userId, email:user.email.toLowerCase(), name:user.displayName };
  const host = new URL(request.url).hostname;
  if (["localhost","127.0.0.1","::1","[::1]"].includes(host)) return { oaiUserId:"local-super-admin", email:"admin@fencequote.local", name:"Jordan Ellis" };
  return null;
}

async function seedPlatform(user:{oaiUserId:string;email:string;name:string}) {
  const d1=db(); const stamp=now(); await ensureRuntimeSchema();
  const count=await d1.prepare("SELECT COUNT(*) AS n FROM companies").first<{n:number}>();
  if ((count?.n ?? 0) === 0) {
    const uid=id("usr");
    const companies=[
      {id:"co_demo",name:"Demo Fence Company",legal:"Demo Fence Company LLC",slug:"demo-fence",status:"active",city:"Springfield",state:"IL",prefix:"FQP",primary:"#123447",secondary:"#2f7d62",accent:"#c8ef5a",phone:"(555) 014-7732",email:"quotes@demofence.co",website:"demofence.example"},
      {id:"co_premier",name:"Premier Fence",legal:"Premier Fence of St. Louis LLC",slug:"premier-fence",status:"active",city:"St. Louis",state:"MO",prefix:"PFX",primary:"#243b6b",secondary:"#d56b42",accent:"#f2c94c",phone:"(555) 220-1840",email:"hello@premierfence.example",website:"premierfence.example"},
      {id:"co_midwest",name:"Midwest Fence & Deck",legal:"Midwest Fence and Deck Inc.",slug:"midwest-fence-deck",status:"trial",city:"Kansas City",state:"MO",prefix:"MFD",primary:"#2c4a3b",secondary:"#8b5e3c",accent:"#e8b85a",phone:"(555) 816-4402",email:"quotes@midwestfd.example",website:"midwestfd.example"},
    ];
    const statements:D1PreparedStatement[]=[
      d1.prepare("INSERT INTO users (id,oai_user_id,email,name,platform_role,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(uid,user.oaiUserId,user.email,user.name,"super_admin",stamp,stamp),
      ...["owner","manager","salesperson"].map(r=>d1.prepare("INSERT INTO roles (id,name,description,created_at) VALUES (?,?,?,?)").bind(`role_${r}`,r,`${r} company role`,stamp)),
    ];
    for(const c of companies){
      statements.push(
        d1.prepare("INSERT INTO companies (id,name,legal_name,slug,status,setup_step,settings,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(c.id,c.name,c.legal,c.slug,c.status,8,"{}",stamp,stamp),
        d1.prepare("INSERT INTO company_settings (company_id,address,city,state,zip,phone,email,website,primary_contact,timezone,primary_color,secondary_color,accent_color,sales_tax,deposit_pct,quote_expiration_days,estimate_prefix,next_estimate_number,min_gross_margin,max_sales_discount,proposal_terms,proposal_footer,approval_text,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(c.id,"1820 Market Street",c.city,c.state,"62704",c.phone,c.email,c.website,user.name,"America/Chicago",c.primary,c.secondary,c.accent,7.25,30,30,c.prefix,10031,30,5,"Proposal valid for 30 days. A 30% deposit is required to schedule installation.",`${c.name} · Built with care.`,"I approve this proposal and agree to the stated terms.",stamp,stamp),
      );
      if(c.id==="co_demo") statements.push(d1.prepare("INSERT INTO company_users (company_id,user_id,role,pricing_admin,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(c.id,uid,"owner",1,1,stamp,stamp));
      const tenantOwnerId=`usr_owner_${c.id}`,tenantOwnerEmail=`owner@${c.slug}.example`;
      statements.push(
        d1.prepare("INSERT INTO users (id,oai_user_id,email,name,platform_role,created_at,updated_at) VALUES (?,?,?,?,NULL,?,?)").bind(tenantOwnerId,`invite:${tenantOwnerEmail}`,tenantOwnerEmail,`${c.name} Owner`,stamp,stamp),
        d1.prepare("INSERT INTO company_users (company_id,user_id,role,pricing_admin,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(c.id,tenantOwnerId,"owner",1,1,stamp,stamp)
      );
      const people=c.id==="co_demo"?[["Evelyn","Smith","2847 Oak Hollow Dr"],["Noah","Johnson","912 Willow Creek Ln"],["Amelia","Wilson","4401 Fox Run Ct"],["Liam","Bennett","667 Meadow Ridge"],["Olivia","Carter","38 Winding Way"]]:c.id==="co_premier"?[["Ava","Martin","7409 Clayton Ave"],["Mason","Clark","2109 Arsenal St"],["Isla","Turner","6812 Delmar Blvd"]]:[["Harper","Lewis","9920 Wornall Rd"],["Ethan","Walker","4501 N Oak Trfy"],["Grace","Hall","1720 Brookside Blvd"]];
      for(let i=0;i<people.length;i++){const p=people[i],cid=`cust_${c.id}_${i}`;statements.push(d1.prepare("INSERT INTO customers (id,company_id,first_name,last_name,property_address,mobile,email,lead_source,assigned_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(cid,c.id,p[0],p[1],p[2],`(555) ${200+i}-01${10+i}`,`${String(p[0]).toLowerCase()}@example.com`,i%2?"Referral":"Website",uid,stamp,stamp));}
      const mats=c.id==="co_premier"?[["Vinyl Privacy","Horizon","6 ft","Tan",39,24,91],["Aluminum","Regal 3-Rail","4 ft","Bronze",46,23,108],["Wood Privacy","Western Cedar","6 ft","Natural",34,28,84]]:c.id==="co_midwest"?[["Wood Privacy","Cedar Shadowbox","6 ft","Natural",36,29,88],["Vinyl Privacy","Prairie","6 ft","White",41,24,96],["Chain Link","Commercial","6 ft","Black",24,19,62]]:[["Vinyl Privacy","EverGuard","6 ft","White",42,23,94],["Wood Privacy","Cedar Dog Ear","6 ft","Natural",31,27,79],["Aluminum","Classic 3-Rail","4 ft","Black",48,22,105],["Chain Link","Residential","4 ft","Galvanized",18,16,49],["Ornamental Steel","Majestic","5 ft","Black",59,29,129]];
      for(let i=0;i<mats.length;i++){const m=mats[i];statements.push(d1.prepare("INSERT INTO materials (id,company_id,category,name,style,height,color,material_cost_per_foot,labor_cost_per_foot,post_cost,concrete_cost,other_cost_per_foot,sell_price_per_foot,minimum_sell_price_per_foot,removal_price_per_foot,minimum_charge,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(`mat_${c.id}_${i}`,c.id,m[0],m[0],m[1],m[2],m[3],m[4],m[5],12,5,2,m[6],m[6]-8,4,1200,1,stamp,stamp));}
      const gateRows=[["4' Walk Gate",4,430,825,115],["5' Walk Gate",5,510,950,135],["Double Drive Gate",10,980,1850,260]];
      for(let i=0;i<gateRows.length;i++){const g=gateRows[i];statements.push(d1.prepare("INSERT INTO gates (id,company_id,description,width,internal_cost,sell_price,labor_cost,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(`gate_${c.id}_${i}`,c.id,g[0],g[1],g[2],g[3],g[4],1,stamp,stamp));}
      const addonRows=[["Fence Removal","per_foot",1.2,4],["Haul Away","fixed",180,450],["Difficult Digging","per_unit",55,125],["Permit","fixed",75,225]];
      for(let i=0;i<addonRows.length;i++){const a=addonRows[i];statements.push(d1.prepare("INSERT INTO addons (id,company_id,name,pricing_mode,internal_cost,customer_price,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(`addon_${c.id}_${i}`,c.id,a[0],a[1],a[2],a[3],1,stamp,stamp));}
      const estimateCount=c.id==="co_demo"?6:3;
      for(let i=0;i<estimateCount;i++){const eid=`est_${c.id}_${i}`, customerId=`cust_${c.id}_${i%people.length}`,amount=7200+i*1875,cost=Math.round(amount*.62),num=`${c.prefix}-${10024+i}`;statements.push(
        d1.prepare("INSERT INTO estimates (id,company_id,estimate_number,customer_id,assigned_user_id,status,version,discount_type,discount_value,discount_pct,approval_status,tax_rate,subtotal,total,deposit,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(eid,c.id,num,customerId,uid,["draft","sent","viewed","approved","declined","ready"][i%6],1,"percentage",0,0,"not_required",7.25,amount/1.0725,amount,amount*.3,stamp,stamp),
        d1.prepare("INSERT INTO estimate_costs (id,company_id,estimate_id,material_cost,labor_cost,gate_cost,other_cost,total_cost,gross_profit,gross_margin,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(`cost_${eid}`,c.id,eid,cost*.55,cost*.35,0,cost*.1,cost,amount-cost,(amount-cost)/amount*100,stamp,stamp)
      );}
    }
    await d1.batch(statements);
    await d1.prepare("PRAGMA optimize").run();
  } else {
    const existing=await d1.prepare("SELECT id FROM users WHERE oai_user_id=? OR lower(email)=?").bind(user.oaiUserId,user.email).first<{id:string}>();
    if(!existing){const uid=id("usr");await d1.prepare("INSERT INTO users (id,oai_user_id,email,name,platform_role,created_at,updated_at) VALUES (?,?,?,?,NULL,?,?)").bind(uid,user.oaiUserId,user.email,user.name,now(),now()).run();}
  }
}

export async function requireSession(request:Request, requestedCompany?:string|null, requestedRole?:string|null):Promise<Session> {
  const who=await identity(request); if(!who) throw Object.assign(new Error("Authentication required"),{status:401});
  await seedPlatform(who); const d1=db();
  let user=await d1.prepare("SELECT id,oai_user_id,email,name,platform_role FROM users WHERE oai_user_id=? OR lower(email)=?").bind(who.oaiUserId,who.email).first<any>();
  if(!user) throw Object.assign(new Error("User account unavailable"),{status:403});
  if(user.oai_user_id.startsWith("invite:")){await d1.prepare("UPDATE users SET oai_user_id=?,name=?,updated_at=? WHERE id=?").bind(who.oaiUserId,who.name,now(),user.id).run();user={...user,oai_user_id:who.oaiUserId,name:who.name};}
  const requestUrl=new URL(request.url),localTestIdentity=["localhost","127.0.0.1","::1","[::1]"].includes(requestUrl.hostname)&&requestUrl.searchParams.get("testNonAdmin")==="1";
  const platformRole=(localTestIdentity?null:user.platform_role) as "super_admin"|null;
  let companyId=requestedCompany;
  if(!companyId){const first=await d1.prepare("SELECT company_id FROM company_users WHERE user_id=? AND active=1 ORDER BY created_at LIMIT 1").bind(user.id).first<{company_id:string}>();companyId=first?.company_id ?? (platformRole?"co_demo":null);}
  if(!companyId) throw Object.assign(new Error("No company membership"),{status:403});
  const company=await d1.prepare("SELECT status FROM companies WHERE id=?").bind(companyId).first<{status:string}>();
  if(!company) throw Object.assign(new Error("Company not found"),{status:404});
  const membership=await d1.prepare("SELECT role,active FROM company_users WHERE company_id=? AND user_id=?").bind(companyId,user.id).first<any>();
  if(!platformRole && (!membership || !membership.active)) throw Object.assign(new Error("Tenant access denied"),{status:403});
  if(!platformRole && ["suspended","cancelled"].includes(company.status)) throw Object.assign(new Error(`Company access is ${company.status}`),{status:423});
  const baseRole=(membership?.role ?? "owner") as AppRole; const role=(platformRole&&["owner","manager","salesperson"].includes(requestedRole??"")?requestedRole:baseRole) as AppRole;
  return {userId:user.id,oaiUserId:user.oai_user_id,email:user.email,name:user.name,platformRole,companyId,role,supportMode:Boolean(platformRole&&requestedCompany)};
}

export async function getContext(request:Request) {
  const url=new URL(request.url); const session=await requireSession(request,url.searchParams.get("company"),url.searchParams.get("asRole")); const d1=db(); const privileged=session.role!=="salesperson";
  const company=await d1.prepare("SELECT c.*,s.* FROM companies c JOIN company_settings s ON s.company_id=c.id WHERE c.id=?").bind(session.companyId).first<any>();
  const customers=(await d1.prepare("SELECT id,first_name,last_name,property_address,mobile,email,lead_source FROM customers WHERE company_id=? ORDER BY last_name").bind(session.companyId).all()).results;
  const materialSql=privileged?"SELECT * FROM materials WHERE company_id=? AND active=1 ORDER BY category":"SELECT id,company_id,category,name,style,height,color,sell_price_per_foot,minimum_sell_price_per_foot,removal_price_per_foot,minimum_charge,active FROM materials WHERE company_id=? AND active=1 ORDER BY category";
  const gateSql=privileged?"SELECT * FROM gates WHERE company_id=? AND active=1":"SELECT id,company_id,description,width,sell_price,active FROM gates WHERE company_id=? AND active=1";
  const addonSql=privileged?"SELECT * FROM addons WHERE company_id=? AND active=1":"SELECT id,company_id,name,pricing_mode,customer_price,active FROM addons WHERE company_id=? AND active=1";
  const materials=(await d1.prepare(materialSql).bind(session.companyId).all()).results; const gates=(await d1.prepare(gateSql).bind(session.companyId).all()).results; const addons=(await d1.prepare(addonSql).bind(session.companyId).all()).results;
  const estimateSql=privileged?"SELECT e.*,c.first_name||' '||c.last_name customer,c.property_address,ec.total_cost,ec.gross_profit,ec.gross_margin FROM estimates e JOIN customers c ON c.id=e.customer_id AND c.company_id=e.company_id LEFT JOIN estimate_costs ec ON ec.estimate_id=e.id AND ec.company_id=e.company_id WHERE e.company_id=? ORDER BY e.updated_at DESC":"SELECT e.id,e.company_id,e.estimate_number,e.customer_id,e.status,e.version,e.discount_type,e.discount_value,e.tax_rate,e.subtotal,e.total,e.deposit,e.created_at,e.updated_at,c.first_name||' '||c.last_name customer,c.property_address FROM estimates e JOIN customers c ON c.id=e.customer_id AND c.company_id=e.company_id WHERE e.company_id=? ORDER BY e.updated_at DESC";
  const estimates=(await d1.prepare(estimateSql).bind(session.companyId).all()).results;
  let companies:any[]=[]; if(session.platformRole){companies=(await d1.prepare("SELECT c.id,c.name,c.status,c.setup_step,s.city,s.state,(SELECT COUNT(*) FROM company_users cu WHERE cu.company_id=c.id AND cu.active=1) user_count,(SELECT COUNT(*) FROM estimates e WHERE e.company_id=c.id) estimate_count FROM companies c JOIN company_settings s ON s.company_id=c.id ORDER BY c.name").all()).results;}
  return {session,company,companies,customers,materials,gates,addons,estimates};
}

export function apiError(error:unknown){const status=typeof error==="object"&&error&&"status" in error?Number((error as any).status):500;return Response.json({error:error instanceof Error?error.message:"Unexpected error"},{status});}
export { id, now };
