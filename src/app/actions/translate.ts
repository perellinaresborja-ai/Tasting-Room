"use server";

export async function translateEsToEn(text: string): Promise<{ success: boolean; translation?: string; error?: string }> {
  if (!text || text.trim() === '') {
    return { success: false, error: "No hay texto para traducir." };
  }

  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    
    if (!res.ok) {
      throw new Error(`Error en el servicio de traducción: ${res.statusText}`);
    }

    const data = await res.json();
    
    // The google translate free API returns an array where the first element is an array of segments
    // e.g. [ [ ["Hello", "Hola", null, null, 1], ["world", "mundo", null, null, 1] ], ... ]
    if (data && data[0] && Array.isArray(data[0])) {
      const translatedText = data[0].map((segment: string[]) => segment[0]).join('');
      return { success: true, translation: translatedText };
    } else {
      return { success: false, error: "Formato de respuesta desconocido." };
    }
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) || "Error al traducir." };
  }
}
