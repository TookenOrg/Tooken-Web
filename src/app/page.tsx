export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-blue-600">Bienvenue sur Tooken!</h1>
      <p className="mt-4 text-gray-700">
        Voici votre tableau de bord. Vous pouvez gérer vos investisseurs, vos actifs et vos souscriptions ici.
      </p>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">Investisseurs</h2>
          <p>Consultez vos investisseurs et leurs souscriptions.</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">Actifs</h2>
          <p>Ajoutez et gérez vos biens immobiliers tokenisés.</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">Reporting</h2>
          <p>Consultez vos rapports et statistiques en temps réel.</p>
        </div>
      </section>
    </div>
  )
}
