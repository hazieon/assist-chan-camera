
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2Icon, CheckCircle2Icon, AlertCircleIcon, InfoIcon } from 'lucide-react';

export type ToastType = 'loading' | 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
    useEffect(() => {
        if (type !== 'loading') {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [type, duration, onClose]);

    const icons = {
        loading: <Loader2Icon className="animate-spin text-accent w-4 h-4" />,
        success: <CheckCircle2Icon className="text-green-500 w-4 h-4" />,
        error: <AlertCircleIcon className="text-red-500 w-4 h-4" />,
        info: <InfoIcon className="text-blue-500 w-4 h-4" />
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`
                fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]
                flex items-center gap-3 px-4 py-3 rounded-2xl
                bg-secondary/90 backdrop-blur-xl border border-gray-300 dark:border-gray-700
                shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[240px] max-w-[90vw]
            `}
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <p className="text-sm font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                {message}
            </p>
        </motion.div>
    );
};

export const ToastContainer: React.FC<{ toasts: { id: string; message: string; type: ToastType }[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col items-center justify-end pb-8 gap-3">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
