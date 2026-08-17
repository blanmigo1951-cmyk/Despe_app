const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1. Analizar repositorio y corregir con IA
app.post('/api/analyze-and-fix', async (req, res) => {
    const { repoUrl } = req.body;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "user",
                content: `Analiza el repositorio ${repoUrl}. Determina si es "static" o "dynamic". Si necesita correcciones en la estructura de archivos, package.json o configuraciones de despliegue para desplegar exitosamente en Netlify o Render, indica las correcciones necesarias.`
            }]
        });

        const analysis = response.choices[0].message.content;
        const isStatic = !analysis.toLowerCase().includes("dynamic");

        res.json({ type: isStatic ? "static" : "dynamic", analysis });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Desplegar en Netlify (Estáticos) o Render (Dinámicos)
app.post('/api/deploy', async (req, res) => {
    const { repoUrl, type } = req.body;
    try {
        if (type === 'static') {
            // Despliegue en Netlify
            const response = await axios.post(
                'https://api.netlify.com/api/v1/sites',
                { repo: { provider: 'github', repo: repoUrl.replace('https://github.com/', ''), branch: 'main' } },
                { headers: { Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}` } }
            );
            return res.json({ deployUrl: response.data.ssl_url || response.data.url });
        } else {
            // Despliegue en Render
            const response = await axios.post(
                'https://api.render.com/v1/services',
                {
                    type: 'web_service',
                    name: 'app-' + Date.now(),
                    repo: repoUrl,
                    envVars: []
                },
                { headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` } }
            );
            return res.json({ deployUrl: response.data.service.serviceDetails.url });
        }
    } catch (error) {
        res.status(500).json({ error: error.response?.data || error.message });
    }
});

// 3. Empaquetar a APK Nativa
app.post('/api/package-apk', async (req, res) => {
    const { deployUrl } = req.body;
    // Simulación de pipeline de empaquetado (ej. invocando Capacitor/TWA vía CLI)
    res.json({ apkUrl: `${deployUrl}/download-app.apk`, status: "Empaquetado iniciado correctamente" });
});

app.listen(process.env.PORT || 3000, () => console.log('Servidor corriendo'));
