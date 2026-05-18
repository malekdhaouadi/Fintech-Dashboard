import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL,
  timeout: 30000,
})

export const wsBaseURL = baseURL.replace(/^http/i, 'ws')

export async function getPrice(ticker) {
  const { data } = await api.get(`/api/price/${encodeURIComponent(ticker)}`)
  return data
}

export async function getHistory(ticker, period) {
  const { data } = await api.get(`/api/history/${encodeURIComponent(ticker)}`, {
    params: { period },
  })
  return data
}

export async function searchTickers(query) {
  const { data } = await api.get('/api/search', {
    params: { q: query },
  })
  return data
}

export async function getIndicators(ticker) {
  const { data } = await api.get(`/api/indicators/${encodeURIComponent(ticker)}`)
  return data
}

export async function getOptionPrice(params) {
  const { data } = await api.get('/api/options/price', { params })
  return data
}

export async function calculateImpliedVol(payload) {
  const { data } = await api.post('/api/options/implied-vol', payload)
  return data
}

export async function solveCrankNicolson(payload) {
  const { data } = await api.post('/api/options/crank-nicolson', payload)
  return data
}

export async function getVolatilitySurface(ticker) {
  const { data } = await api.get('/api/options/surface', {
    params: { ticker },
  })
  return data
}

export async function getFftPrices(params) {
  const { data } = await api.get('/api/options/fft-prices', { params })
  return data
}

export default api
