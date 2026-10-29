import { apiError, db, id, now, requireSession } from "../../../lib/tenant";
export async function POST(request:Request){
  try{
    const session=await requireSession(request); if(session.platformRole!=="super_admin") throw Object.assign(new Error("Platform administrator required"),{status:403});
    const body=await request.json() as any; const name=String(body.name??"").trim(); if(!name)return Response.json({error:"Company name is required"},{status:400});
    const companyId=id("co"), stamp=now(), slug=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")+"-"+companyId.slice(-5);
    await db().batch([
      db().prepare("INSERT INTO companies (id,name,legal_name,slug,status,setup_step,settings,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(companyId,name,body.legalName??name,slug,"trial",1,"{}",stamp,stamp),
      db().prepare("INSERT INTO company_settings (company_id,city,state,timezone,primary_color,secondary_color,accent_color,sales_tax,deposit_pct,quote_expiration_days,estimate_prefix,next_estimate_number,min_gross_margin,max_sales_discount,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(companyId,body.city??"",body.state??"",body.timezone??"America/Chicago","#123447","#2f7d62","#c8ef5a",0,30,30,String(body.prefix??"FQP").toUpperCase(),10001,30,5,stamp,stamp),
      db().prepare("INSERT INTO company_users (company_id,user_id,role,pricing_admin,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(companyId,session.userId,"owner",1,1,stamp,stamp),
    ]);
    return Response.json({companyId},{status:201});
  }catch(error){return apiError(error)}
}
export async function PATCH(request:Request){
  try{const session=await requireSession(request);if(session.platformRole!=="super_admin")throw Object.assign(new Error("Platform administrator required"),{status:403});const body=await request.json() as any;if(!["trial","active","suspended","cancelled"].includes(body.status))return Response.json({error:"Invalid status"},{status:400});await db().prepare("UPDATE companies SET status=?,updated_at=? WHERE id=?").bind(body.status,now(),body.companyId).run();return Response.json({ok:true})}catch(error){return apiError(error)}
}
