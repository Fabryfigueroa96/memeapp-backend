import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =====================================================
   🔎 NORMALIZADOR DE TEXTO (más robusto)
===================================================== */

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "");
}

/* =====================================================
   🚨 LISTAS DE EMERGENCIA ESCALONADAS
===================================================== */

// 🔴 EMERGENCIA GRAVE (médica o suicida)
const HIGH_RISK = [
  "no respira",
  "no puedo respirar",
  "no puede respirar",
  "se esta ahogando",
  "me ahogo",
  "me falta el aire",
  "convulsiona",
  "convulsion",
  "inconsciente",
  "no responde",
  "desmayo",
  "se desmayo",
  "me quiero morir",
  "me quiero matar",
  "suicidio",
  "se quiere matar",
  "emergencia",
  "urgente ya",
  "911",
  "107",
  "ambulancia",
  "policia ya"
  "no puedo respirar"
  "no respiro"
];

// 🟠 CRISIS FUERTE (desregulación severa)
const MEDIUM_RISK = [
  "crisis",
  "crisi",
  "cricis",
  "crizis",
  "ataque de nervios",
  "descontrol",
  "no se calma",
  "llora mucho",
  "grita fuerte",
  "se golpea",
  "autolesion",
  "meltdown",
  "colapso",
  "sobrecarga",
  "perdio control"
];

/* =====================================================
   🧠 DETECTOR INTELIGENTE
===================================================== */

function detectRisk(text) {
  const normalized = normalize(text);

  if (HIGH_RISK.some(word => normalized.includes(word))) {
    return "HIGH";
  }

  if (MEDIUM_RISK.some(word => normalized.includes(word))) {
    return "MEDIUM";
  }

  return "LOW";
}

/* =====================================================
   🧩 SYSTEM PROMPTS DINÁMICOS
===================================================== */

function getSystemPrompt(mode, risk) {

  if (risk === "HIGH") {
    return `
Sos un asistente especializado en emergencias.

REGLAS:
- Responder SOLO con pasos numerados.
- Frases muy cortas.
- Máximo 6 pasos.
- Indicar buscar ayuda inmediata.
- No explicar teoría.
- Enfocado en el AHORA.
`;
  }

  if (risk === "MEDIUM") {
    return `
Sos un asistente especializado en crisis emocionales en niños con TEA.

REGLAS:
- Pasos claros y prácticos.
- Lenguaje simple.
- Frases cortas.
- Máximo 6 pasos.
`;
  }

  if (mode === "parent") {
    return `
Sos un asistente empático especializado en acompañar a padres de niños con TEA.

- Sé práctico.
- Sé humano.
- No juzgues.
- No seas excesivamente largo.
`;
  }

  return `
Sos un asistente empático para adultos.
Escuchás y acompañás con calma.
`;
}

/* =====================================================
   💬 ENDPOINT CHAT
===================================================== */

app.post("/chat", async (req, res) => {
  try {
    const { message, mode } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Mensaje vacío.",
        risk: "LOW"
      });
    }

    const risk = detectRisk(message);
    const systemPrompt = getSystemPrompt(mode, risk);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: risk === "HIGH" ? 0.2 : 0.6
    });

    let reply = completion.choices[0].message.content.trim();

    res.json({
      reply,
      risk
    });

  } catch (error) {
    console.error("❌ ERROR:", error);

    res.status(500).json({
      reply: "No se pudo procesar la solicitud.",
      risk: "LOW"
    });
  }
});

/* =====================================================
   🚀 SERVER
===================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});
