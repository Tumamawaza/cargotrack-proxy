const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;
const MT_API_KEY = process.env.MT_API_KEY;
const DD_API_KEY = process.env.DD_API_KEY;
const DD_BASE = "https://datadocked.com/api/vessels_operations";

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "CargoTrack Proxy activo",
    mt_key_loaded: !!MT_API_KEY,
    dd_key_loaded: !!DD_API_KEY
  });
});

// ── DataDocked: posición real de buque por IMO o MMSI ──
app.get("/api/dd/location", async (req, res) => {
  const { imo_or_mmsi } = req.query;
  if (!DD_API_KEY) return res.status(500).json({ error: "DD_API_KEY no configurada" });
  if (!imo_or_mmsi) return res.status(400).json({ error: "Se requiere imo_or_mmsi" });
  try {
    const { data } = await axios.get(`${DD_BASE}/get-vessel-location`, {
      params: { imo_or_mmsi },
      headers: { "x-api-key": DD_API_KEY },
      timeout: 10000
    });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Error DataDocked", detail: e.message });
  }
});

// ── DataDocked: buscar buque por nombre ──
app.get("/api/dd/search", async (req, res) => {
  const { name } = req.query;
  if (!DD_API_KEY) return res.status(500).json({ error: "DD_API_KEY no configurada" });
  if (!name) return res.status(400).json({ error: "Se requiere name" });
  try {
    const { data } = await axios.get(`${DD_BASE}/get-vessel-info`, {
      params: { vessel_name: name },
      headers: { "x-api-key": DD_API_KEY },
      timeout: 10000
    });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Error DataDocked", detail: e.message });
  }
});

// ── DataDocked: escalas portuarias del buque ──
app.get("/api/dd/portcalls", async (req, res) => {
  const { imo_or_mmsi } = req.query;
  if (!DD_API_KEY) return res.status(500).json({ error: "DD_API_KEY no configurada" });
  try {
    const { data } = await axios.get(`${DD_BASE}/port-calls-by-vessel`, {
      params: { imo_or_mmsi },
      headers: { "x-api-key": DD_API_KEY },
      timeout: 10000
    });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Error DataDocked", detail: e.message });
  }
});

// Buscar buque por nombre
app.get("/api/vessel", async (req, res) => {
  const { name, imo, mmsi } = req.query;
  if (!MT_API_KEY) return res.status(500).json({ error: "MT_API_KEY no configurada" });

  let params = "protocol=jsono";
  if (name)  params += `&vessel_name=${encodeURIComponent(name)}`;
  if (imo)   params += `&imo=${imo}`;
  if (mmsi)  params += `&mmsi=${mmsi}`;

  try {
    const url = `https://services.marinetraffic.com/api/exportvessel/v:8/${MT_API_KEY}/?v=8&${params}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Error consultando MarineTraffic", detail: e.message });
  }
});

// Posición actual del buque por MMSI
app.get("/api/position", async (req, res) => {
  const { mmsi } = req.query;
  if (!MT_API_KEY) return res.status(500).json({ error: "MT_API_KEY no configurada" });
  if (!mmsi) return res.status(400).json({ error: "Se requiere mmsi" });

  try {
    const url = `https://services.marinetraffic.com/api/exportvessel/v:8/${MT_API_KEY}/?v=8&mmsi=${mmsi}&protocol=jsono`;
    const { data } = await axios.get(url, { timeout: 10000 });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Error consultando MarineTraffic", detail: e.message });
  }
});

// Llegadas esperadas a un puerto (UNLOCODE, ej: MXMZT = Manzanillo)
app.get("/api/arrivals", async (req, res) => {
  const { port } = req.query;
  if (!MT_API_KEY) return res.status(500).json({ error: "MT_API_KEY no configurada" });
  if (!port) return res.status(400).json({ error: "Se requiere port (UNLOCODE)" });

  try {
    const url = `https://services.marinetraffic.com/api/getexpectedarrivals/v:1/${MT_API_KEY}/?portid=${encodeURIComponent(port)}&protocol=jsono`;
    const { data } = await axios.get(url, { timeout: 10000 });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Error consultando MarineTraffic", detail: e.message });
  }
});

// Historial de escalas de un buque
app.get("/api/portcalls", async (req, res) => {
  const { mmsi, imo } = req.query;
  if (!MT_API_KEY) return res.status(500).json({ error: "MT_API_KEY no configurada" });

  let params = "protocol=jsono";
  if (mmsi) params += `&mmsi=${mmsi}`;
  if (imo)  params += `&imo=${imo}`;

  try {
    const url = `https://services.marinetraffic.com/api/portcalls/v:5/${MT_API_KEY}/?${params}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Error consultando MarineTraffic", detail: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ CargoTrack Proxy corriendo en puerto ${PORT}`);
  console.log(`   MT API Key: ${MT_API_KEY ? "✓ cargada" : "✗ NO configurada"}`);
});
