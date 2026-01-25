'use client'

import { useState } from 'react'
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'
import type { RealEstate } from '@/types/real-estate/RealEstate'
import { formatCurrency } from '@/lib/formatters'

type Props = {
    estate: RealEstate
}

// Génère données avec intérêts composés
function generateCompoundData(initialInvestment: number, yieldPct: number, years: number) {
    const data = []
    let value = initialInvestment
    for (let year = 1; year <= years; year++) {
        value = value * (1 + yieldPct / 100)
        data.push({
            year,
            total: Math.round(value * 100) / 100,
            capital: initialInvestment,
            interest: Math.round((value - initialInvestment) * 100) / 100,
        })
    }
    return data
}

export function RealEstateInvestmentChart({ estate }: Props) {
    const minYears = 5
    const maxYears = 25

    const [investment, setInvestment] = useState<number>(estate.configuration.price_per_share)
    const [years, setYears] = useState<number>(15)

    const data = generateCompoundData(investment, estate.configuration.yield, years)

    return (
        <section className="rounded-xl border bg-white p-6 space-y-6 shadow-sm">
            <h3 className="text-lg font-semibold">Investment evolution over {years} years</h3>

            {/* Slider investissement initial */}
            <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-4">
                {/* Slider investissement initial */}
                <div className="flex flex-col md:flex-1">
                    <label className="font-medium text-gray-700 mb-1">
                        Initial investment: {formatCurrency(investment, "EUR")}
                    </label>
                    <input
                        type="range"
                        min={estate.configuration.price_per_share}
                        max={estate.configuration.price_per_share * 20}
                        step={estate.configuration.price_per_share / 10}
                        value={investment}
                        onChange={(e) => setInvestment(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Slider durée */}
                <div className="flex flex-col md:flex-1">
                    <label className="font-medium text-gray-700 mb-1">
                        Duration: {years} years
                    </label>
                    <input
                        type="range"
                        min={minYears}
                        max={maxYears}
                        step={1}
                        value={years}
                        onChange={(e) => setYears(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            {/* Graphique */}
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                    <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                    <YAxis
                        mirror
                        tickFormatter={(value) => formatCurrency(value, 'EUR')}
                        // label={{ value: 'Value', angle: -90, position: 'insideLeft', offset: 10 }}
                        tick={{ fontSize: 12, fill: '#374151' }}
                    />

                    <Tooltip
                        formatter={(value) => (value !== undefined ? formatCurrency(Number(value), 'EUR') : "")}
                        labelFormatter={(label) => `Year ${label}`}
                    />

                    {/* Zone intérêts cumulés */}
                    <Area
                        type="monotone"
                        dataKey="interest"
                        stackId="1"
                        stroke="#fcd34d"
                        fill="#fef3c7"
                        name="Interest earned"
                    />

                    {/* Capital initial */}
                    <Area
                        type="monotone"
                        dataKey="capital"
                        stackId="1"
                        stroke="#f59e0b"
                        fill="#fbbf24"
                        name="Initial capital"
                    />

                    {/* Ligne totale */}
                    <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#b45309"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Total value"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </section>
    )
}
