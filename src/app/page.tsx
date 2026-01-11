"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Building2, ShieldCheck, Wallet } from "lucide-react";
import Image from "next/image"

export default function Page() {
  return (
    <div className="bg-[#2D2B3D] text-white">
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Invest in real estate,
            <span className="block text-amber-400"> easily and from today</span>
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-xl">
            Tooken lets you invest in real-world properties through tokenization. Accessible, transparent, and secure.
          </p>
          <div className="mt-8 flex gap-4">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600">
              Explore real estate <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-black hover:bg-white hover:text-[#2D2B3D]">
              How it works
            </Button>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="relative h-[40vh] flex items-center justify-center bg-[#2D2B3D]">
            <Image
              src="/logo-transparent_3000.png"
              alt="Tooken"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="bg-[#262435] py-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          <Card className="bg-[#2D2B3D] border border-white/10">
            <CardContent className="p-6">
              <ShieldCheck className="h-10 w-10 text-cyan-400" />
              <h3 className="mt-4 text-xl font-semibold text-cyan-400">Sécurité & conformité</h3>
              <p className="mt-2 text-gray-300">
                Chaque investissement est encadré juridiquement et sécurisé
                par la blockchain.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#2D2B3D] border border-white/10">
            <CardContent className="p-6">
              <Building2 className="h-10 w-10 text-cyan-400" />
              <h3 className="mt-4 text-xl font-semibold text-cyan-400">Biens réels</h3>
              <p className="mt-2 text-gray-300">
                Investissez dans des projets immobiliers concrets, sélectionnés
                avec rigueur.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#2D2B3D] border border-white/10">
            <CardContent className="p-6">
              <Wallet className="h-10 w-10 text-cyan-400" />
              <h3 className="mt-4 text-xl font-semibold text-cyan-400">Accessible à tous</h3>
              <p className="mt-2 text-gray-300">
                Démarrez avec un ticket réduit et suivez vos revenus en temps réel.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center">Comment ça marche</h2>
        <div className="mt-16 grid md:grid-cols-4 gap-8 text-center">
          {[
            "Créez votre compte",
            "Vérifiez votre identité",
            "Investissez dans un bien",
            "Recevez vos revenus",
          ].map((step, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#262435]">
              <div className="text-amber-400 text-2xl font-bold">{i + 1}</div>
              <p className="mt-4 text-gray-200">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-amber-500 py-20 text-center">
        <h2 className="text-3xl font-bold text-[#2D2B3D]">Prêt à investir dans l’immobilier ?</h2>
        <p className="mt-4 text-amber-100">
          Rejoignez Tooken et accédez à une nouvelle façon d’investir.
        </p>
        <div className="mt-8">
          <Button size="lg" className="bg-white text-[#2D2B3D] hover:bg-gray-100">
            Créer un compte
          </Button>
        </div>
      </section>
    </div>
  );
}
