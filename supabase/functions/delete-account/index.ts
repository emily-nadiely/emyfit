import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"Método não permitido"}),{status:405,headers:{...cors,"Content-Type":"application/json"}});
  try{
    const authorization=req.headers.get("Authorization");
    if(!authorization)throw new Error("Sessão não encontrada.");
    const body=await req.json().catch(()=>({}));
    if(String(body.confirmation||"").toUpperCase()!=="EXCLUIR")return new Response(JSON.stringify({error:"Confirmação inválida."}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    const url=Deno.env.get("SUPABASE_URL");
    const anon=Deno.env.get("SUPABASE_ANON_KEY");
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!anon||!service)throw new Error("Variáveis do Supabase não configuradas.");
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user)throw new Error("Sessão inválida ou expirada.");
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    await admin.from("user_app_state").delete().eq("user_id",user.id);
    const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
    if(deleteError)throw deleteError;
    return new Response(JSON.stringify({ok:true}),{headers:{...cors,"Content-Type":"application/json"}});
  }catch(error){
    return new Response(JSON.stringify({ok:false,error:String(error?.message||error)}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  }
});
