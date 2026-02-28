'use client'

import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { logout } from "@/lib/api/auth/auth";
import { Button } from "@/components/ui/button"
import { useState } from "react";
import { useRouter } from "next/navigation";


export default function LogoutPage() {
    const router = useRouter()
    logout()
    router.push(`/`)

    return (
        <div>

        </div>
    )
}
