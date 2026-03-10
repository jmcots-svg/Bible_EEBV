Deno.serve((_req: Request) => {
  return new Response(JSON.stringify({ 
    status: "ok", 
    message: "API Biblia funcionando",
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" }
  });
});