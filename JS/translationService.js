// JS/translationService.js
async function getCommentaryWithTranslation(sourceId, divId, userLang) {
  // Si es inglés, obtener directo
  if (userLang === "en") {
    return await fetchCommentary(sourceId, divId, "en");
  }

  // Intentar obtener en el idioma del usuario
  let entry = await fetchCommentary(sourceId, divId, userLang);

  if (entry) return entry;

  // No existe, pedir traducción on-the-fly
  try {
    const response = await fetch(`${API_URL}/api/translate-commentary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, divId, targetLang: userLang }),
    });

    const data = await response.json();

    if (data.entry) {
      console.log(
        `Traducido on-the-fly con ${data.method}, guardado: ${data.saved}`
      );
      return data.entry;
    }
  } catch (error) {
    console.error("Error en traducción on-the-fly:", error);
  }

  // Fallback final: mostrar en inglés
  return await fetchCommentary(sourceId, divId, "en");
}
