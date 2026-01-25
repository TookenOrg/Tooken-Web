export function formatCurrency(value: number, currency: 'EUR' | 'USD' = 'EUR') {
    const locale = currency === 'EUR' ? 'fr-FR' : 'en-US'
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}