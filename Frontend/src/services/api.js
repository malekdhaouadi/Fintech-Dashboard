import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL,
  timeout: 15000,
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

export default api
