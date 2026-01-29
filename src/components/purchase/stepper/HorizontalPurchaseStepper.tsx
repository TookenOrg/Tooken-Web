import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type StepStatus = 'completed' | 'active' | 'upcoming'

type Step = {
    title: string
    status: StepStatus
}

type HorizontalPurchaseStepperProps = {
    steps: Step[]
}

export default function HorizontalPurchaseStepper({ steps }: HorizontalPurchaseStepperProps) {
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
                                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0",
                                    step.status === 'completed' && "bg-primary border-primary text-primary-foreground",
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
                                    "h-0.5 w-12 md:w-20 lg:w-32 self-start mt-5 md:mt-6 flex-shrink-0",
                                    step.status === 'completed' ? "bg-primary" : "bg-gray-300"
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}