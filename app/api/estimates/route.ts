import { apiError, db, id, now, requireSession } from "../../../lib/tenant";
import { ensureEsignSchema, ensureSigningToken } from "../../../lib/esign";
type SectionInput={name:string;description:string;length:number;materialId:string;notes?:string};
const estimateStatuses=["draft","ready","sent","viewed","approved","declined"] as const;

/** Signing link, signature record, and customer activity for one estimate. */
export async function GET(request:Request){
 try{
  const url=new URL(request.url),session=await requireSession(request,url.searchParams.get("company"),url.searchParams.get("asRole")),estimateId=url.searchParams.get("estimateId")??"";
  await ensureEsignSchema();const d1=db();
  const estimate=await d1.prepare("SELECT id FROM estimates WHERE id=? AND company_id=?").bind(estimateId,session.companyId).first<any>();
  if(!estimate)return Response.json({error:"Estimate not found"},{status:404});
  const token=await ensureSigningToken(session.companyId,estimate.id,session.userId);
  const signature=await d1.prepare("SELECT a.customer_name,a.signer_email,a.signature,a.signature_method,a.signature_image,a.document_hash,a.ip_address,a.user_agent,a.approved_amount,a.accepted_at,a.decision,a.decline_reason FROM quote_acceptances a JOIN estimate_versions v ON v.id=a.version_id AND v.company_id=a.company_id WHERE v.approval_token=? AND a.company_id=?").bind(token,session.companyId).first<any>();
  const activity=(await d1.prepare("SELECT action,metadata,created_at FROM activity_log WHERE estimate_id=? AND company_id=? ORDER BY created_at DESC LIMIT 20").bind(estimate.id,session.companyId).all()).results;
  return Response.json({signingPath:`/p/${token}`,signature:signature??null,activity},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return apiError(error)}
}

export async function PATCH(request:Request){
 try{
  const body=await request.json() as any,session=await requireSession(request,body.companyId,body.asRole),status=String(body.status??"");
  if(!estimateStatuses.includes(status as any))return Response.json({error:"Invalid estimate status"},{status:400});
  if(session.role==="salesperson"&&["approved","declined"].includes(status))return Response.json({error:"Manager access is required for final status changes"},{status:403});
  const estimate=await db().prepare("SELECT id,status FROM estimates WHERE id=? AND company_id=?").bind(body.estimateId,session.companyId).first<any>();
  if(!estimate)return Response.json({error:"Estimate not found"},{status:404});
  const stamp=now();await db().batch([
   db().prepare("UPDATE estimates SET status=?,updated_at=? WHERE id=? AND company_id=?").bind(status,stamp,estimate.id,session.companyId),
   db().prepare("INSERT INTO activity_log (id,company_id,estimate_id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("act"),session.companyId,estimate.id,session.userId,"estimate_status_changed",JSON.stringify({from:estimate.status,to:status}),stamp)
  ]);
  return Response.json({id:estimate.id,status,updatedAt:stamp});
 }catch(error){return apiError(error)}
}

export async function POST(request:Request){
 try{
  const body=await request.json() as any;const session=await requireSession(request,body.companyId,body.asRole);const d1=db();const customer=await d1.prepare("SELECT id FROM customers WHERE id=? AND company_id=?").bind(body.customerId,session.companyId).first();if(!customer)throw Object.assign(new Error("Customer does not belong to this company"),{status:403});
  const settings=await d1.prepare("SELECT * FROM company_settings WHERE company_id=?").bind(session.companyId).first<any>();const sections=(body.sections??[]) as SectionInput[];if(!sections.length)return Response.json({error:"At least one fence section is required"},{status:400});let sell=0,materialCost=0,laborCost=0,otherCost=0;const calculatedSections:any[]=[];
  for(const section of sections){const material=await d1.prepare("SELECT * FROM materials WHERE id=? AND company_id=? AND active=1").bind(section.materialId,session.companyId).first<any>();if(!material)throw Object.assign(new Error("Material does not belong to this company"),{status:403});const length=Math.max(0,Number(section.length));sell+=length*material.sell_price_per_foot;materialCost+=length*(material.material_cost_per_foot+material.post_cost/8+material.concrete_cost/8);laborCost+=length*material.labor_cost_per_foot;otherCost+=length*material.other_cost_per_foot;calculatedSections.push({...section,length,material});}
  let gateSell=0,gateCost=0;const calcGates:any[]=[];for(const item of body.gates??[]){const gate=await d1.prepare("SELECT * FROM gates WHERE id=? AND company_id=? AND active=1").bind(item.gateId,session.companyId).first<any>();if(!gate)throw Object.assign(new Error("Gate does not belong to this company"),{status:403});const qty=Math.max(1,Number(item.quantity??1));gateSell+=gate.sell_price*qty;gateCost+=(gate.internal_cost+gate.labor_cost)*qty;calcGates.push({...item,qty,gate});}
  let addonSell=0,addonCost=0;const calcAddons:any[]=[];for(const item of body.addons??[]){const addon=await d1.prepare("SELECT * FROM addons WHERE id=? AND company_id=? AND active=1").bind(item.addonId,session.companyId).first<any>();if(!addon)throw Object.assign(new Error("Add-on does not belong to this company"),{status:403});const qty=Math.max(0,Number(item.quantity??1)),mult=addon.pricing_mode==="fixed"?1:qty;addonSell+=addon.customer_price*mult;addonCost+=addon.internal_cost*mult;calcAddons.push({...item,qty,addon});}
  const baseSubtotal=sell+gateSell+addonSell,discountType=body.discountType==="dollar"?"dollar":"percentage",discountValue=Math.max(0,Number(body.discountValue??0)),discount=discountType==="dollar"?Math.min(baseSubtotal,discountValue):baseSubtotal*Math.min(discountValue,100)/100,subtotal=Math.max(0,baseSubtotal-discount),tax=subtotal*(settings.sales_tax/100),total=subtotal+tax,totalCost=materialCost+laborCost+otherCost+gateCost+addonCost,grossProfit=total-totalCost,grossMargin=total?grossProfit/total*100:0,requiresApproval=session.role==="salesperson"&&(discountValue>settings.max_sales_discount||grossMargin<settings.min_gross_margin);
  if(requiresApproval&&body.finalize) return Response.json({error:"Manager approval required",approvalRequired:true,grossMargin:undefined},{status:409});
  const stamp=now(),estimateId=id("est"),versionId=id("ver"),token=crypto.randomUUID()+crypto.randomUUID(),num=`${settings.estimate_prefix}-${settings.next_estimate_number}`;const statements:D1PreparedStatement[]=[
   d1.prepare("INSERT INTO estimates (id,company_id,estimate_number,customer_id,assigned_user_id,status,version,discount_type,discount_value,discount_pct,approval_status,tax_rate,subtotal,total,deposit,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(estimateId,session.companyId,num,body.customerId,session.userId,requiresApproval?"draft":body.finalize?"ready":"draft",1,discountType,discountValue,discountType==="percentage"?discountValue:baseSubtotal?discount/baseSubtotal*100:0,requiresApproval?"required":"not_required",settings.sales_tax,subtotal,total,total*(settings.deposit_pct/100),stamp,stamp),
   d1.prepare("UPDATE company_settings SET next_estimate_number=next_estimate_number+1,updated_at=? WHERE company_id=?").bind(stamp,session.companyId),
   d1.prepare("INSERT INTO estimate_costs (id,company_id,estimate_id,material_cost,labor_cost,gate_cost,other_cost,total_cost,gross_profit,gross_margin,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(id("cost"),session.companyId,estimateId,materialCost,laborCost,gateCost,otherCost+addonCost,totalCost,grossProfit,grossMargin,stamp,stamp),
   d1.prepare("INSERT INTO estimate_versions (id,company_id,estimate_id,version,approval_token,snapshot,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(versionId,session.companyId,estimateId,1,token,JSON.stringify({companyId:session.companyId,estimateNumber:num,total,subtotal,deposit:total*(settings.deposit_pct/100),sections:calculatedSections.map(x=>({name:x.name,description:x.description,length:x.length,price:x.length*x.material.sell_price_per_foot,material:x.material.name,style:x.material.style,height:x.material.height,color:x.material.color})),gates:calcGates.map(x=>({description:x.gate.description,quantity:x.qty,price:x.gate.sell_price*x.qty})),addons:calcAddons.map(x=>({name:x.addon.name,quantity:x.qty,price:x.addon.customer_price*(x.addon.pricing_mode==="fixed"?1:x.qty)})),customerNotes:body.customerNotes??"",terms:settings.proposal_terms}),session.userId,stamp,stamp),
   d1.prepare("INSERT INTO activity_log (id,company_id,estimate_id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("act"),session.companyId,estimateId,session.userId,"estimate_created",JSON.stringify({number:num}),stamp)
  ];
  for(const x of calculatedSections)statements.push(d1.prepare("INSERT INTO estimate_sections (id,company_id,estimate_id,material_id,section_name,description,length_feet,style,height,color,sell_price,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id("sec"),session.companyId,estimateId,x.materialId,x.name,x.description,x.length,x.material.style,x.material.height,x.material.color,x.length*x.material.sell_price_per_foot,x.notes??"",stamp,stamp));
  for(const x of calcGates)statements.push(d1.prepare("INSERT INTO estimate_gates (id,company_id,estimate_id,gate_id,width,quantity,sell_price,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id("eg"),session.companyId,estimateId,x.gateId,x.gate.width,x.qty,x.gate.sell_price*x.qty,x.notes??"",stamp,stamp));
  for(const x of calcAddons)statements.push(d1.prepare("INSERT INTO estimate_addons (id,company_id,estimate_id,addon_id,quantity,customer_price,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("ea"),session.companyId,estimateId,x.addonId,x.qty,x.addon.customer_price*(x.addon.pricing_mode==="fixed"?1:x.qty),stamp,stamp));
  for(const note of [["internal",body.internalNotes],["customer",body.customerNotes]] as const)if(note[1])statements.push(d1.prepare("INSERT INTO estimate_notes (id,company_id,estimate_id,visibility,body,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("note"),session.companyId,estimateId,note[0],note[1],session.userId,stamp,stamp));
  await d1.batch(statements);const result:any={id:estimateId,estimateNumber:num,status:requiresApproval?"draft":body.finalize?"ready":"draft",subtotal,total,deposit:total*(settings.deposit_pct/100),approvalRequired:requiresApproval,versionId,approvalToken:token};if(session.role!=="salesperson")result.financials={materialCost,laborCost,gateCost,otherCost:otherCost+addonCost,totalCost,grossProfit,grossMargin};return Response.json(result,{status:201});
 }catch(error){return apiError(error)}
}
