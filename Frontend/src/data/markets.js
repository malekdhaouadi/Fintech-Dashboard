export const MARKET_CONFIG = {
  global: {
    label: 'Global Markets',
    icon: 'globe',
    currency: 'USD',
    currencyMode: 'currency',
    map: { center: [0, 18], zoom: 1.2 },
    watchlist: {
      groups: [
        { title: 'Tech', tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'TSLA', 'AMZN', 'AMD', 'INTC', 'ORCL'] },
        { title: 'Finance', tickers: ['JPM', 'GS', 'BAC', 'V', 'MA'] },
        { title: 'Health', tickers: ['JNJ', 'PFE', 'UNH', 'ABBV'] },
        { title: 'Energy', tickers: ['XOM', 'CVX', 'TTE.PA'] },
        { title: 'Crypto', tickers: ['BTC-USD', 'ETH-USD', 'SOL-USD'] },
        { title: 'Commodities', tickers: ['GC=F', 'CL=F'] },
        { title: 'Forex', tickers: ['EURUSD=X', 'USDTND=X'] },
        { title: 'Tunisia', tickers: ['TLNET.TN', 'SFBT.TN'] },
      ],
    },
  },
  us: {
    label: 'US',
    icon: 'star',
    currency: 'USD',
    currencyMode: 'currency',
    map: { center: [-96, 37.5], zoom: 3.2 },
    watchlist: { groups: [{ title: 'US Equities', tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'V', 'BRK-B'] }] },
  },
  tunisia: {
    label: 'Tunisia',
    icon: 'location',
    currency: 'TND',
    currencyMode: 'currency',
    map: { center: [9.5, 34.0], zoom: 5.7 },
    watchlist: { groups: [{ title: 'BVMT', tickers: ['TLNET.TN', 'SFBT.TN', 'BIAT.TN', 'PGH.TN', 'SOTUMAG.TN'] }] },
  },
  france: {
    label: 'France',
    icon: 'layers',
    currency: 'EUR',
    currencyMode: 'currency',
    map: { center: [2.2, 46.2], zoom: 5.2 },
    watchlist: { groups: [{ title: 'Euronext', tickers: ['MC.PA', 'LVMH', 'AIR.PA', 'TTE.PA', 'BNP.PA'] }] },
  },
  germany: {
    label: 'Germany',
    icon: 'shield',
    currency: 'EUR',
    currencyMode: 'currency',
    map: { center: [10.4, 51.1], zoom: 5.2 },
    watchlist: { groups: [{ title: 'DAX', tickers: ['SAP.DE', 'SIE.DE', 'BMW.DE', 'BAYN.DE'] }] },
  },
  uk: {
    label: 'UK',
    icon: 'arch',
    currency: 'GBP',
    currencyMode: 'currency',
    map: { center: [-2.5, 54.1], zoom: 4.9 },
    watchlist: { groups: [{ title: 'LSE', tickers: ['SHEL.L', 'AZN.L', 'HSBA.L', 'BP.L'] }] },
  },
  china: {
    label: 'China',
    shortLabel: 'China Market',
    icon: 'rocket',
    currency: 'CNY',
    currencyMode: 'currency',
    map: { center: [104.2, 35.8], zoom: 3.2 },
    searchPlaceholder: 'Search China equities, ADRs, EVs, and semiconductors...',
    searchCopy: 'Track A-shares, ADRs, EVs, and internet platforms in China.',
    watchlist: {
      groups: [
        { title: 'Internet Platforms', tickers: ['BABA', 'JD', 'PDD', 'TME', 'BIDU', 'TCEHY'] },
        { title: 'EV & Mobility', tickers: ['NIO', 'XPEV', 'LI', 'BYDDF'] },
        { title: 'Semiconductors', tickers: ['SMIC', 'HXSCL', 'NAAS'] },
        { title: 'Financials', tickers: ['HK:0939', 'HK:3988', 'HK:2318'] },
        { title: 'Consumer & Retail', tickers: ['MNSO', 'YUMC', 'VIPS'] },
      ],
    },
  },
  crypto: {
    label: 'Crypto',
    icon: 'coin',
    currency: 'USD',
    currencyMode: 'currency',
    map: { center: [0, 18], zoom: 1.4 },
    watchlist: { groups: [{ title: 'Crypto', tickers: ['BTC-USD', 'ETH-USD', 'BNB-USD', 'SOL-USD', 'MATIC-USD'] }] },
  },
  forex: {
    label: 'Forex',
    icon: 'swap',
    currency: 'USD',
    currencyMode: 'decimal',
    map: { center: [0, 20], zoom: 1.2 },
    watchlist: { groups: [{ title: 'Forex', tickers: ['EURUSD=X', 'GBPUSD=X', 'USDTND=X'] }] },
  },
  commodities: {
    label: 'Commodities',
    icon: 'industry',
    currency: 'USD',
    currencyMode: 'currency',
    map: { center: [0, 20], zoom: 1.2 },
    watchlist: { groups: [{ title: 'Commodities', tickers: ['GC=F', 'CL=F', 'SI=F'] }] },
  },
}

export const MARKET_ORDER = ['global', 'us', 'tunisia', 'france', 'germany', 'uk', 'china', 'crypto', 'forex', 'commodities']

export const MARKET_OPTIONS = MARKET_ORDER.map((id) => ({ id, ...MARKET_CONFIG[id] }))

export function getMarketConfig(marketId = 'global') {
  return MARKET_CONFIG[marketId] ?? MARKET_CONFIG.global
}

export function getMarketWatchlist(marketId = 'global') {
  return getMarketConfig(marketId).watchlist
}
