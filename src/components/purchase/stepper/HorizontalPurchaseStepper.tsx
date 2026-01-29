import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type StepStatus = 'completed' | 'active' | 'upcoming'

type HorizontalPurchaseStepperProps = {
    currentStep: number
}

export default function HorizontalPurchaseStepper({ currentStep }: HorizontalPurchaseStepperProps) {

    const steps: Array<{ title: string; status: "completed" | "active" | "upcoming" }> = [
        { title: "Place Order", status: currentStep > 0 ? "completed" : "active" },
        { title: "Sent", status: currentStep === 1 ? "active" : currentStep > 1 ? "completed" : "upcoming" },
        { title: "Confirmed", status: currentStep === 2 ? "active" : currentStep > 2 ? "completed" : "upcoming" },
        { title: "Payment", status: currentStep === 3 ? "active" : currentStep > 3 ? "completed" : "upcoming" },
        { title: "Tokens transferred", status: currentStep === 4 ? "active" : currentStep > 4 ? "completed" : "upcoming" },
    ]

    return (
        <div className="w-full flex justify-center py-4">
            <div className="flex items-start justify-center gap-4 md:gap-8">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-4 md:gap-8">
                        {/* Step item */}
                        <div className="flex flex-col items-center min-w-[80px] md:min-w-[100px]">
                            {/* Circle with fixed size */}
                            <div
                                className={cn(
                                    "w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0",
                                    step.status === 'completed' && "bg-green-600 border-green-800 text-primary-foreground",
                                    step.status === 'active' && "border-primary text-primary bg-background",
                                    step.status === 'upcoming' && "border-gray-300 text-gray-400 bg-background"
                                )}
                            >
                                {step.status === 'completed' ? (
                                    <Check className="w-5 h-5 md:w-6 md:h-6" />
                                ) : (
                                    <span className="text-sm md:text-base font-medium">{index + 1}</span>
                                )}
                            </div>

                            {/* Label */}
                            <p
                                className={cn(
                                    "mt-2 text-xs md:text-sm font-medium text-center whitespace-nowrap",
                                    step.status === 'completed' && "text-primary",
                                    step.status === 'active' && "text-primary",
                                    step.status === 'upcoming' && "text-gray-400"
                                )}
                            >
                                {step.title}
                            </p>
                        </div>

                        {/* Connector line */}
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    "h-0.5 w-12 md:w-20 lg:w-10 self-start mt-5 md:mt-6 flex-shrink-0",
                                    step.status === 'completed' ? "bg-green-600" : "bg-gray-300"
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}