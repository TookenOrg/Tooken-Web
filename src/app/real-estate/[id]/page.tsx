import RealEstateDetailsPageClient from './RealEstateDetailsPageClient'

type Params = {
    params: Promise<{ id: string }>
}

export default async function RealEstateDetailsPageServer({ params }: Params) {
    const { id } = await params
    return <RealEstateDetailsPageClient id={id} />
}