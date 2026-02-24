import { ReactNode } from 'react';

interface UserLayoutProps {
    children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
    return (
        <div className="bg-gray-50 min-h-full">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Mon Compte</h1>
                    <p className="text-gray-600 mt-1">Gérez vos commandes et investissements</p>
                </div>

                <div className="bg-white rounded-lg shadow">
                    {children}
                </div>
            </div>
        </div>
    );
}