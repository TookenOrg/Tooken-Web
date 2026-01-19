// src/domain/real-estate/RealEstate.ts

export type PaymentFrequencyType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface RealEstateConfiguration {
    payment_frequency: number;
    payment_frequency_type: PaymentFrequencyType;
    payment_frequency_type_id: number;
    price_per_share: number;
    total_shares: number;
    yield: number;
}

export interface RealEstateSpecification {
    bathroom_number: number;
    bedroom_number: number;
    build_year: number;
    lot_size: number;
    pool_size: number;
    surface_area: number;
    terrace_size: number;
}

export interface RealEstateProgression {
    tokens_sold: number;
    tokens_sold_pctg: number;
}

export interface RealEstate {
    id: number;
    active: boolean;
    contract_address: string;
    created_at: string;
    description: string;
    estate_type: string;
    estate_type_id: number;
    imageurl: string;
    configuration: RealEstateConfiguration;
    specificiation: RealEstateSpecification;
    progression: RealEstateProgression;
    title: string;
}

