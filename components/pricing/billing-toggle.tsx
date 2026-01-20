'use client';

import { motion } from 'framer-motion';

import { useLanguage } from '@/context/LanguageContext';

interface BillingToggleProps {
    billingCycle: 'monthly' | 'annual';
    onChange: (cycle: 'monthly' | 'annual') => void;
}

export function BillingToggle({ billingCycle, onChange }: BillingToggleProps) {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center h-fit gap-4 mb-6">
             <div className="flex items-center">
                 <span className="text-xs font-semibold text-white bg-green-600 px-2 py-1.5 rounded-full shadow-sm">
                    {t('billingDiscountBadge')}
                </span>
            </div>
            <div className="bg-secondary/50 px-0 py-1.5 gap-0 rounded-full flex items-center justify-center relative border border-border/50">
                {/* Background Slider */}
                <motion.div
                    className="absolute h-[calc(100%-12px)] top-1.5 bg-background border border-border/50 rounded-full shadow-sm"
                    initial={false}
                    animate={{
                        x: billingCycle === 'monthly' ? 0 : '100%',
                        left: billingCycle === 'monthly' ? 6 : 0, 
                    }}
                    style={{ 
                        width: 'calc(50% - 6px)', 
                        left: 6 
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />

                <button
                    onClick={() => onChange('monthly')}
                    className={`w-32 py-2.5 rounded-full text-sm font-medium transition-colors relative z-10 ${
                        billingCycle === 'monthly' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('billingToggleMonthly')}
                </button>
                <button
                    onClick={() => onChange('annual')}
                    className={`w-32 py-2.5 rounded-full text-sm font-medium transition-colors relative z-10 ${
                        billingCycle === 'annual' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('billingToggleAnnual')}
                </button>
            </div>
        </div>
    );
}
