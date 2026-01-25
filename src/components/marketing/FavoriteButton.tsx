'use client'

import { useState } from 'react'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

type Props = {
    estateId: Number
}

export function FavoriteButton({ estateId }: Props) {
    const [isFav, setIsFav] = useState(false)

    const toggleFavorite = () => {
        setIsFav(!isFav)




    }

    return (
        <button
            onClick={toggleFavorite}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
            {isFav ? <HeartIconSolid className="w-6 h-6 text-red-500" /> : <HeartIcon className="w-6 h-6 text-gray-500" />}

        </button>
    )
}
