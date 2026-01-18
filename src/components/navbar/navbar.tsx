"use client"

import Link from "next/link"
import Image from "next/image"
import { REM } from "next/font/google"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Button } from "@components/ui/button"
import { usePathname } from 'next/navigation'

const roboto = REM({ subsets: ["latin"], weight: "700", variable: "--font-roboto" })
const isLoggedIn = false

export function Navbar() {

    const pathname = usePathname()
    const hideNavbar =
        pathname.startsWith('/sign-in') ||
        pathname.startsWith('/sign-up')

    if (hideNavbar) return null


    const menuItems = isLoggedIn
        ? [
            { label: "Admin", href: "/admin" },
            { label: "Favorites", href: "/favorites" },
            { label: "Profile", href: "/profile" },
            { label: "About", href: "/about" },
            { label: "Logout", href: "/logout" },
        ]
        : [
            { label: "Sign In", href: "/sign-in" },
            { label: "About", href: "/about" },
        ]

    return (
        <nav className="bg-[#2D2B3D] text-white shadow-md w-full sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link
                        href="/"
                        className={`text-2xl font-bold text-white ${roboto.variable} font-sans`}
                    >
                        Tooken
                    </Link>

                    {/* Avatar + Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-10 h-10 p-0 rounded-full overflow-hidden">
                                <Image
                                    src="/avatar.png"
                                    alt="Avatar"
                                    width={40}
                                    height={40}
                                />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-white shadow-lg rounded-md p-1">
                            {menuItems.map((item, idx) => (
                                <DropdownMenuItem key={idx}>
                                    <Link href={item.href} className="w-full block px-4 py-2 rounded hover:bg-gray-100">
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
