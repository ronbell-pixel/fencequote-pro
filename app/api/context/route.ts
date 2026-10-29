import { apiError, getContext } from "../../../lib/tenant";
export const dynamic = "force-dynamic";
export async function GET(request:Request){try{return Response.json(await getContext(request),{headers:{"Cache-Control":"no-store"}})}catch(error){return apiError(error)}}
