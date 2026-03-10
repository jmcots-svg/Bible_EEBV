import { serve } from "https://deno.land/std@0.220.0/http/server.ts";

serve((req: Request) => {
  return new Response(JSON.stringify({ 
    status: "ok", 
    message: "API funcionando",
    url: req.url,
    dbUrl: Deno.env.get("DATABASE_URL") ? "configurada" : "NO configurada"
  }), {
    headers: { "Content-Type": "application/json" }
  });
});