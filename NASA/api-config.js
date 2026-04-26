// api-config.js
export const JPL_ENDPOINTS = {
    CAD: "https://ssd-api.jpl.nasa.gov/cad.api",
    SENTRY: "https://ssd-api.jpl.nasa.gov/sentry.api",
    MDESIGN: "https://ssd-api.jpl.nasa.gov/mdesign.api",
    SB_SAT: "https://ssd-api.jpl.nasa.gov/sb_sat.api"
};

export const DEFAULT_PARAMS = {
    CAD: "dist-max=10LD&date-min=now&sort=dist",
    MDESIGN: "lim=200&crit=1&year=2025,2026,2027,2028,2029&sb-group=neo"
};