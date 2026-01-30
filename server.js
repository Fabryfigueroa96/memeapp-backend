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

/* ==========================
   DETECCIÓN DE EMERGENCIA
   (tolerante a errores)
========================== */

const EMERGENCY_KEYWORDS = [
  "crisis",
  "crisi",
  "cricis",
  "crizis",
  "nervios",
  "ataque",
  "descontrol",
  "grita",
  "llora",
  "se golpea",
  "no se calma",
  "perdió control",
  "autolesion",
  "autolesión",
  "se lastima",
  "urgente",
  "emergencia"
];

function isEmergency(text) {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return EMERGENCY_KEYWORDS.some(word =>
    normalized.includes(word)
  );
}

/* ==========================
   SYSTEM PROMPTS
========================== */

function getSystemPrompt(mode, emergency) {
  if (emergency) {
    return `
Sos un asistente especializado en crisis emocionales en niños con TEA.

REGLAS OBLIGATORIAS:
- Respondé SOLO con pasos claros y numerados.
- Frases MUY cortas.
- Lenguaje directo y calmado.
- NO expliques, NO hagas preguntas largas.
- Máximo 6 pasos.
- Enfocado en el AHORA.
`;
  }

  if (mode === "parent") {
    return `
Sos un asistente empático especializado en acompañar a padres de niños con TEA.

Reglas:
- Asumí siempre que el niño tiene TEA.
- Explicá con claridad y sin juzgar.
- Sé práctico, realista y humano.
- Evitá textos innecesariamente largos.
`;
  }

  return `
Sos un asistente empático para adultos.
Escuchás, contenés y ayudás a reflexionar con calma.
`;
}

/* ==========================
   ENDPOINT CHAT
========================== */

app.post("/chat", async (req, res) => {
  try {
    const { message, mode } = req.body;

    const emergency = isEmergency(message);
    const systemPrompt = getSystemPrompt(mode, emergency);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: emergency ? 0.2 : 0.6
    });

    let reply = completion.choices[0].message.content;

    // Limpieza defensiva
    reply = reply.trim();

    res.json({
      reply,
      emergency
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      reply: "No se pudo procesar la solicitud.",
      emergency: false
    });
  }
});

/* ==========================
   SERVER
========================== */

app.listen(3000, () => {
  console.log("✅ Backend corriendo en http://localhost:3000");
});
