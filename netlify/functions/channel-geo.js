// netlify/functions/channel-geo.js
// Lee channel_views_geo y entrega países en ISO-3 para que el mapa pinte todo.

const ALLOW_ORIGIN = "*"; // opcional: pon tu dominio

// Mapa ISO2 -> ISO3 (principalmente países ONU; añade si te faltara alguno)
const ISO2_TO_ISO3 = {
  AF:"AFG", AX:"ALA", AL:"ALB", DZ:"DZA", AS:"ASM", AD:"AND", AO:"AGO", AI:"AIA",
  AQ:"ATA", AG:"ATG", AR:"ARG", AM:"ARM", AW:"ABW", AU:"AUS", AT:"AUT", AZ:"AZE",
  BS:"BHS", BH:"BHR", BD:"BGD", BB:"BRB", BY:"BLR", BE:"BEL", BZ:"BLZ", BJ:"BEN",
  BM:"BMU", BT:"BTN", BO:"BOL", BQ:"BES", BA:"BIH", BW:"BWA", BV:"BVT", BR:"BRA",
  IO:"IOT", BN:"BRN", BG:"BGR", BF:"BFA", BI:"BDI", KH:"KHM", CM:"CMR", CA:"CAN",
  CV:"CPV", KY:"CYM", CF:"CAF", TD:"TCD", CL:"CHL", CN:"CHN", CX:"CXR", CC:"CCK",
  CO:"COL", KM:"COM", CG:"COG", CD:"COD", CK:"COK", CR:"CRI", CI:"CIV", HR:"HRV",
  CU:"CUB", CW:"CUW", CY:"CYP", CZ:"CZE", DK:"DNK", DJ:"DJI", DM:"DMA", DO:"DOM",
  EC:"ECU", EG:"EGY", SV:"SLV", GQ:"GNQ", ER:"ERI", EE:"EST", SZ:"SWZ", ET:"ETH",
  FK:"FLK", FO:"FRO", FJ:"FJI", FI:"FIN", FR:"FRA", GF:"GUF", PF:"PYF", TF:"ATF",
  GA:"GAB", GM:"GMB", GE:"GEO", DE:"DEU", GH:"GHA", GI:"GIB", GR:"GRC", GL:"GRL",
  GD:"GRD", GP:"GLP", GU:"GUM", GT:"GTM", GG:"GGY", GN:"GIN", GW:"GNB", GY:"GUY",
  HT:"HTI", HM:"HMD", VA:"VAT", HN:"HND", HK:"HKG", HU:"HUN", IS:"ISL", IN:"IND",
  ID:"IDN", IR:"IRN", IQ:"IRQ", IE:"IRL", IM:"IMN", IL:"ISR", IT:"ITA", JM:"JAM",
  JP:"JPN", JE:"JEY", JO:"JOR", KZ:"KAZ", KE:"KEN", KI:"KIR", KP:"PRK", KR:"KOR",
  KW:"KWT", KG:"KGZ", LA:"LAO", LV:"LVA", LB:"LBN", LS:"LSO", LR:"LBR", LY:"LBY",
  LI:"LIE", LT:"LTU", LU:"LUX", MO:"MAC", MG:"MDG", MW:"MWI", MY:"MYS", MV:"MDV",
  ML:"MLI", MT:"MLT", MH:"MHL", MQ:"MTQ", MR:"MRT", MU:"MUS", YT:"MYT", MX:"MEX",
  FM:"FSM", MD:"MDA", MC:"MCO", MN:"MNG", ME:"MNE", MS:"MSR", MA:"MAR", MZ:"MOZ",
  MM:"MMR", NA:"NAM", NR:"NRU", NP:"NPL", NL:"NLD", NC:"NCL", NZ:"NZL", NI:"NIC",
  NE:"NER", NG:"NGA", NU:"NIU", NF:"NFK", MK:"MKD", MP:"MNP", NO:"NOR", OM:"OMN",
  PK:"PAK", PW:"PLW", PS:"PSE", PA:"PAN", PG:"PNG", PY:"PRY", PE:"PER", PH:"PHL",
  PN:"PCN", PL:"POL", PT:"PRT", PR:"PRI", QA:"QAT", RE:"REU", RO:"ROU", RU:"RUS",
  RW:"RWA", BL:"BLM", SH:"SHN", KN:"KNA", LC:"LCA", MF:"MAF", PM:"SPM", VC:"VCT",
  WS:"WSM", SM:"SMR", ST:"STP", SA:"SAU", SN:"SEN", RS:"SRB", SC:"SYC", SL:"SLE",
  SG:"SGP", SX:"SXM", SK:"SVK", SI:"SVN", SB:"SLB", SO:"SOM", ZA:"ZAF", GS:"SGS",
  SS:"SSD", ES:"ESP", LK:"LKA", SD:"SDN", SR:"SUR", SJ:"SJM", SE:"SWE", CH:"CHE",
  SY:"SYR", TW:"TWN", TJ:"TJK", TZ:"TZA", TH:"THA", TL:"TLS", TG:"TGO", TK:"TKL",
  TO:"TON", TT:"TTO", TN:"TUN", TR:"TUR", TM:"TKM", TC:"TCA", TV:"TUV", UG:"UGA",
  UA:"UKR", AE:"ARE", GB:"GBR", US:"USA", UM:"UMI", UY:"URY", UZ:"UZB", VU:"VUT",
  VE:"VEN", VN:"VNM", VG:"VGB", VI:"VIR", WF:"WLF", EH:"ESH", YE:"YEM", ZM:"ZMB",
  ZW:"ZWE"
};

function toISO3(iso2) {
  const k = String(iso2 || "").toUpperCase();
  return ISO2_TO_ISO3[k] || null;
}

function colorByCount(c) {
  const n = Number(c) || 0;
  if (n <= 0) return "#6b7280";
  if (n <= 3) return "#ef4444";   // 1–3
  if (n <= 10) return "#22c55e";  // 4–10
  if (n <= 50) return "#f59e0b";  // 11–50
  return "#ec4899";               // 51+
}

function getParam(event, ...keys) {
  const qs = event.queryStringParameters || {};
  for (const k of keys) {
    const v = (qs[k] || "").trim();
    if (v) return v;
  }
  return "";
}

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": ALLOW_ORIGIN,
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-origin": ALLOW_ORIGIN,
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-headers": "content-type, authorization",
      },
      body: "",
    };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return json(500, { error: "Missing Supabase env vars" });
    }

    const channelId = getParam(event, "channel_id", "channelId", "id", "cid");
    if (!channelId) return json(400, { error: "channel_id is required" });

    // Leer TODOS los países agregados del canal
    const qs = new URLSearchParams({
      select: "country_code,country_name,views_count",
      "channel_id": `eq.${channelId}`,
      order: "views_count.desc.nullslast",
    });
    const url = `${SUPABASE_URL}/rest/v1/channel_views_geo?${qs}`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "count=exact",
      },
    });

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      return json(res.status, { error: "supabase_rest_error", details });
    }

    const rows = await res.json();

    const countries = (Array.isArray(rows) ? rows : [])
      .map(r => {
        const iso2 = String(r.country_code || "").toUpperCase();
        const iso3 = toISO3(iso2);    // ← CLAVE: lo que usa el mapa
        const count = Number(r.views_count || 0);
        return {
          id: iso3 || iso2,           // muchos mapas usan feature.id (ISO3)
          iso2,
          iso3,
          name: r.country_name || iso3 || iso2 || "—",
          value: count,
          count,
          fill: colorByCount(count),
        };
      })
      .filter(r => r.id); // descarta si no logramos mapear nada

    const byCountry = countries.map(({ name, count }) => ({ country_name: name, count }));
    const total = countries.reduce((s, x) => s + (x.count || 0), 0);

    return json(200, {
      countries,     // ChannelGeoMap debe pintar con esto (id = ISO3)
      byCountry,     // compat con la barra
      meta: { channel_id: channelId, total, countries_count: countries.length, source: "channel_views_geo" },
    });
  } catch (e) {
    return json(500, { error: "unexpected", message: e?.message || String(e) });
  }
};
