export type CurrencyInfo = {
  code: string
  /** Fraction digits used for amounts, rounding and display. */
  decimals: number
  symbol: string
  crypto: boolean
  /** CoinGecko identifier for market prices of a crypto asset. */
  coingecko?: string
}

const fiat = (code: string, symbol: string, decimals = 2): CurrencyInfo => ({
  code,
  symbol,
  decimals,
  crypto: false
})
const coin = (
  code: string,
  symbol: string,
  coingecko: string,
  decimals = 8
): CurrencyInfo => ({ code, symbol, decimals, crypto: true, coingecko })

export const CURRENCIES: Record<string, CurrencyInfo> = Object.fromEntries(
  [
    fiat('AZN', '₼'),
    fiat('USD', '$'),
    fiat('EUR', '€'),
    fiat('GBP', '£'),
    fiat('RUB', '₽'),
    fiat('TRY', '₺'),
    fiat('GEL', '₾'),
    fiat('AED', 'AED'),
    fiat('KZT', '₸'),
    fiat('UZS', 'UZS'),
    fiat('UAH', '₴'),
    fiat('BYN', 'Br'),
    fiat('CNY', '¥'),
    fiat('JPY', '¥', 0),
    fiat('KRW', '₩', 0),
    fiat('INR', '₹'),
    fiat('CHF', 'CHF'),
    fiat('CAD', 'C$'),
    fiat('AUD', 'A$'),
    fiat('PLN', 'zł'),
    fiat('SEK', 'kr'),
    fiat('NOK', 'kr'),
    fiat('HKD', 'HK$'),
    fiat('SGD', 'S$'),
    fiat('SAR', 'SAR'),
    fiat('QAR', 'QAR'),
    fiat('IRR', 'IRR', 0),
    coin('BTC', '₿', 'bitcoin'),
    coin('ETH', 'Ξ', 'ethereum'),
    coin('USDT', 'USDT', 'tether', 2),
    coin('USDC', 'USDC', 'usd-coin', 2),
    coin('TON', 'TON', 'the-open-network', 6),
    coin('ADA', 'ADA', 'cardano', 6),
    coin('SOL', 'SOL', 'solana', 6),
    coin('BNB', 'BNB', 'binancecoin', 6),
    coin('XRP', 'XRP', 'ripple', 6),
    coin('DOGE', 'DOGE', 'dogecoin', 4),
    coin('TRX', 'TRX', 'tron', 4),
    coin('LTC', 'LTC', 'litecoin', 6)
  ].map(info => [info.code, info])
)

export const CURRENCY_CODE = /^[A-Z][A-Z0-9]{1,9}$/

/** Known currencies carry their own precision; custom codes use cents. */
export function currencyInfo(code: string): CurrencyInfo {
  return CURRENCIES[code] ?? { code, symbol: code, decimals: 2, crypto: false }
}

export const decimalsOf = (code: string) => currencyInfo(code).decimals

export const isKnownCurrency = (code: string) => code in CURRENCIES

export const FIAT_CODES = Object.values(CURRENCIES)
  .filter(info => !info.crypto)
  .map(info => info.code)

export const CRYPTO_CODES = Object.values(CURRENCIES)
  .filter(info => info.crypto)
  .map(info => info.code)
