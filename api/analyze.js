export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mimeType } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in environment variables.' });
  }

  if (!image || !mimeType) {
    return res.status(400).json({ error: 'Image data and mimeType are required.' });
  }

  try {
    const prompt = `Analyze this image of a fruit or vegetable as a plant pathology and food safety expert. 
Examine the item for diseases, fungal infection, anthracnose, mold, rot, mechanical damage, or normal ripening (such as sugar spots).

Respond EXCLUSIVELY with a JSON object in this exact structure without markdown backticks:
{
  "produceName": "Name of fruit/vegetable",
  "conditionTitle": "Specific condition or disease name",
  "safetyStatus": "SAFE" | "CAUTION" | "UNSAFE",
  "confidencePercent": integer between 70 and 99,
  "symptoms": "Detailed visual symptoms seen in image",
  "causeOrPathogen": "Biological or physiological cause",
  "recommendations": "Direct food safety advice on whether it is safe to eat or must be discarded."
}`;

    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: image } }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const data = await apiResponse.json();
    const rawJsonText = data.candidates[0].content.parts[0].text;
    const parsedResult = JSON.parse(rawJsonText);

    return res.status(200).json(parsedResult);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error during AI analysis.' });
  }
}