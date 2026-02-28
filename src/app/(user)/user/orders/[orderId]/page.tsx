import { notFound } from 'next/navigation';
import { Calendar, Hash, Coins, User, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

import HorizontalPurchaseStepper from "@/components/purchase/stepper/HorizontalPurchaseStepper"
import { GetIssuanceOrderByOrderRef } from "@/lib/api/order/issuance-order"
import { cn } from '@/lib/utils';

interface OrderDetailsPageProps {
    params: Promise<{ orderId: string }>;
}

function defineStepperStep(orderStatus: string): number {
    switch (orderStatus) {
        case "CREATED":
        case "PENDING_PAYMENT":
        case "PAYMENT_CONFIRMED":
            return 0;
        case "SENT":
            return 1;
        case "CONFIRMED":
            return 2;
        case "CLOSED":
            return 3;
        default:
            return 0;
    }
}

function StatusBadge({ label, isFinal }: { label: string; isFinal?: boolean }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
            isFinal
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        )}>
            <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                isFinal ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
            )} />
            {label}
        </span>
    );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
            <div className="p-2 rounded-lg bg-background shadow-sm ring-1 ring-border/50">
                <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-foreground truncate">{value}</p>
            </div>
        </div>
    );
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
    const { orderId } = await params;

    const order = await GetIssuanceOrderByOrderRef(orderId);
    if (!order || !order?.statusLabel) notFound();

    const status = order.statusLabel;
    const createdAt = new Date(order.createdAt);
    const updatedAt = order.updatedAt ? new Date(order.updatedAt) : null;

    const formatDate = (date: Date) =>
        date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="bg-gradient-to-br from-background via-muted/20 to-background">
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

                {/* Back + Header */}
                <div>
                    <Link
                        href="/user/orders"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Mes commandes
                    </Link>

                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Commande
                            </h1>
                            <p className="text-sm text-muted-foreground font-mono mt-0.5">
                                #{order.orderRef}
                            </p>
                        </div>
                        <StatusBadge label={status} isFinal={order.statusIfFinal} />
                    </div>
                </div>

                {/* Stepper Card */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                            Suivi de commande
                        </p>
                    </div>
                    <HorizontalPurchaseStepper currentStep={defineStepperStep(status)} />
                </div>

                {/* Info Grid */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                        Détails
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoCard
                            icon={Coins}
                            label="Tokens achetés"
                            value={`${order.tokenQuantity} tokens`}
                        />
                        <InfoCard
                            icon={Hash}
                            label="Bien immobilier"
                            value={`#${order.realEstateId}`}
                        />
                        <InfoCard
                            icon={Calendar}
                            label="Date de commande"
                            value={formatDate(createdAt)}
                        />
                        {updatedAt && (
                            <InfoCard
                                icon={Clock}
                                label="Dernière mise à jour"
                                value={formatDate(updatedAt)}
                            />
                        )}
                    </div>
                </div>

                {/* Status final message */}
                {order.statusIfFinal && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Coins className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">Tokens transférés</p>
                            <p className="text-xs text-emerald-600 mt-0.5">
                                Vos {order.tokenQuantity} tokens ont été crédités sur votre compte.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}