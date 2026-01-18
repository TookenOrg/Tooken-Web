'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

type RangeColor = 'primary' | 'success' | 'amber' | 'danger';
type TrackColor = 'muted' | 'gray' | 'slate' | 'zinc';
type ThumbColor = 'primary' | 'success' | 'amber' | 'danger' | 'slate';

interface DualRangeSliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
    labelPosition?: 'top' | 'bottom';
    label?: (value: number | undefined) => React.ReactNode;
    rangeColor?: RangeColor;
    trackColor?: TrackColor;
    thumbColor?: ThumbColor;
}

const DualRangeSlider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    DualRangeSliderProps
>(({
    className,
    label,
    labelPosition = 'top',
    rangeColor = 'primary',
    trackColor = 'muted',
    thumbColor = 'primary',
    ...props
}, ref) => {
    const initialValue = Array.isArray(props.value) ? props.value : [props.min ?? 0, props.max ?? 100];

    const getRangeClasses = () => {
        switch (rangeColor) {
            case 'success': return 'bg-gradient-to-r from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600';
            case 'amber': return 'bg-gradient-to-r from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600';
            case 'danger': return 'bg-gradient-to-r from-rose-400 to-red-500 dark:from-rose-500 dark:to-red-600';
            default: return 'bg-primary dark:bg-primary/90';
        }
    };

    const getTrackClasses = () => {
        switch (trackColor) {
            case 'gray': return 'bg-gray-200/80 dark:bg-gray-800/60';
            case 'slate': return 'bg-slate-200/80 dark:bg-slate-800/60';
            case 'zinc': return 'bg-zinc-200/80 dark:bg-zinc-800/60';
            default: return 'bg-background/60 dark:bg-muted';
        }
    };

    const getThumbClasses = () => {
        switch (thumbColor) {
            case 'success': return 'bg-emerald-400 border-emerald-500 ring-emerald-400 dark:bg-emerald-500 dark:border-emerald-400 dark:ring-emerald-500';
            case 'amber': return 'bg-amber-400 border-amber-500 ring-amber-400 dark:bg-amber-500 dark:border-amber-400 dark:ring-amber-500';
            case 'danger': return 'bg-rose-400 border-rose-500 ring-rose-400 dark:bg-rose-500 dark:border-rose-400 dark:ring-rose-500';
            case 'slate': return 'bg-slate-100 border-slate-300 ring-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:ring-slate-600';
            default: return 'bg-primary border-primary/80 ring-primary dark:bg-primary/90 dark:border-primary dark:ring-primary';
        }
    };

    return (
        <SliderPrimitive.Root
            ref={ref}
            className={cn('relative flex w-full touch-none select-none items-center', className)}
            {...props}
        >
            <SliderPrimitive.Track className={cn("relative h-2 w-full grow overflow-hidden rounded-full shadow-inner", getTrackClasses())}>
                <SliderPrimitive.Range className={cn('absolute h-full rounded-full shadow-sm transition-all duration-200', getRangeClasses())} />
            </SliderPrimitive.Track>

            {initialValue.map((value, index) => (
                <React.Fragment key={index}>
                    <SliderPrimitive.Thumb
                        className={cn(
                            "relative block h-5 w-5 rounded-full border-3 shadow-lg transition-all duration-200 hover:scale-110 focus-visible:scale-110",
                            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                            getThumbClasses()
                        )}
                    >
                        {label && (
                            <span
                                className={cn(
                                    'absolute -top-8 text-xs font-medium px-2 py-1 rounded-md shadow-lg whitespace-nowrap backdrop-blur-sm border',
                                    'bg-background/95 text-foreground border-border/50 dark:bg-muted/95 dark:text-muted-foreground dark:border-border',
                                    labelPosition === 'top' && '-top-7',
                                    labelPosition === 'bottom' && 'top-4'
                                )}
                            >
                                {label(value)}
                            </span>
                        )}
                    </SliderPrimitive.Thumb>
                </React.Fragment>
            ))}
        </SliderPrimitive.Root>
    );
});

DualRangeSlider.displayName = 'DualRangeSlider';
export { DualRangeSlider };
