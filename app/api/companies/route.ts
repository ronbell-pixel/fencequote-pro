import { apiError, createCompany, db, now, requireSession } from "../../../lib/tenant";
export async function POST(request:Request){
  try{
    const session=await requireSession(request); if(session.platformRole!=="super_admin") throw Object.assign(new Error("Platform administrator required"),{status:403});
    const body=await request.json() as any; const name=String(body.name??"").trim(); if(!name)return Response.json({error:"Company name is required"},{status:400});
    const companyId=await createCompany(name,session.userId,{legalName:body.legalName,city:body.city,state:body.state,timezone:body.timezone,prefix:body.prefix});
    return Response.json({companyId},{status:201});
  }catch(error){return apiError(error)}
}
export async function PATCH(request:Request){
  try{const session=await requireSession(request);if(session.platformRole!=="super_admin")throw Object.assign(new Error("Platform administrator required"),{status:403});const body=await request.json() as any;if(!["trial","active","suspended","cancelled"].includes(body.status))return Response.json({error:"Invalid status"},{status:400});await db().prepare("UPDATE companies SET status=?,updated_at=? WHERE id=?").bind(body.status,now(),body.companyId).run();return Response.json({ok:true})}catch(error){return apiError(error)}
}
