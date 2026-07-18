import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE;
const CACHE_TTL_MS = 30 * 1000;

let cachedProducts = null;
let cachedAt = 0;
let inFlightRequest = null;

export const fetchProductCatalog = async () => {
  if (cachedProducts && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedProducts;
  }

  if (!inFlightRequest) {
    inFlightRequest = axios
      .get(`${API_BASE}/api/products`)
      .then(({ data }) => {
        const products = Array.isArray(data) ? data : data?.rows || data?.items || [];
        cachedProducts = products;
        cachedAt = Date.now();
        return products;
      })
      .finally(() => {
        inFlightRequest = null;
      });
  }

  return inFlightRequest;
};
