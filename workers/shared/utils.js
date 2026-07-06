export function stringToHash(str) {
  let hash = 0;
  if (str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function get48HourWindow() {
  return Math.floor(Date.now() / (48 * 60 * 60 * 1000));
}

export function get24HourWindow() {
  return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
}

export function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) {
    return "spring";
  }
  if (month >= 5 && month <= 7) {
    return "summer";
  }
  if (month >= 8 && month <= 10) {
    return "autumn";
  }
  return "winter";
}

export function createResponse(data, status = 200, headers = {}) {
  const defaultHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  return new Response(data, {
    status,
    headers: { ...defaultHeaders, ...headers },
  });
}

export function createJSONResponse(data, status = 200, additionalHeaders = {}) {
  return createResponse(JSON.stringify(data), status, {
    "Content-Type": "application/json",
    ...additionalHeaders,
  });
}

export async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
