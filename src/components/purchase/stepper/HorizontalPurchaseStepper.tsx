import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type HorizontalPurchaseStepperProps = {
    currentStep: number
}

export default function HorizontalPurchaseStepper({ currentStep }: HorizontalPurchaseStepperProps) {

    const steps: Array<{ title: string; status: "completed" | "active" | "upcoming" }> = [
        { title: "Place Order", status: currentStep >= 0 ? "completed" : "active" },
        { title: "Sent to Blockchain", status: currentStep == 0 ? "active" : currentStep >= 1 ? "completed" : "upcoming" },
        { title: "Confirmed", status: currentStep == 1 ? "active" : currentStep >= 2 ? "completed" : "upcoming" },
        { title: "Tokens transferred", status: currentStep == 2 ? "active" : currentStep >= 3 ? "completed" : "upcoming" },
    ]

    return (
        <div className="w-full flex justify-center py-6">
            <div className="flex items-start justify-center">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-start">
                        {/* Step item */}
                        <div className="flex flex-col items-center" style={{ minWidth: '90px' }}>
                            {/* Circle */}
                            <div className="relative flex items-center justify-center">
                                {/* Glow ring for active */}
                                {step.status === 'active' && (
                                    <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary" />
                                )}
                                <div
                                    className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 font-semibold text-sm relative z-10",
                                        step.status === 'completed' && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
                                        step.status === 'active' && "bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20",
                                        step.status === 'upcoming' && "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {step.status === 'completed' ? (
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </div>
                            </div>

                            {/* Label */}
                            <p
                                className={cn(
                                    "mt-2.5 text-xs font-medium text-center leading-tight max-w-[80px]",
                                    step.status === 'completed' && "text-emerald-600",
                                    step.status === 'active' && "text-primary",
                                    step.status === 'upcoming' && "text-muted-foreground"
                                )}
                            >
                                {step.title}
                            </p>
                        </div>

                        {/* Connector */}
                        {index < steps.length - 1 && (
                            <div className="mt-[24px] mx-1 h-0.5 w-10 md:w-14 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        step.status === 'completed' ? "w-full bg-emerald-500" : "w-0"
                                    )}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}