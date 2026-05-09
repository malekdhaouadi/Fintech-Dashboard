import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL,
  timeout: 15000,
})

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

export default api
