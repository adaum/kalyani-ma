const NAMES = {
  IN: "India", US: "United States", GB: "United Kingdom", CA: "Canada",
  AU: "Australia", AE: "United Arab Emirates", SG: "Singapore",
  DE: "Germany", FR: "France", NZ: "New Zealand", MY: "Malaysia"
};

module.exports = function handler(req, res) {
  const code = String(req.headers["x-vercel-ip-country"] || "IN").toUpperCase();
  const country = NAMES[code] || code;
  res.setHeader("Cache-Control", "no-store, max-age=0");
  return res.status(200).json({ code, country });
};
