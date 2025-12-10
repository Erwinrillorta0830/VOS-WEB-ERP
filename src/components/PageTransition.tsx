"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
    children: ReactNode;
};

export function PageTransition({ children }: Props) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0, x: 40 }}     // start slightly to the right
                animate={{ opacity: 1, x: 0 }}      // slide into place
                exit={{ opacity: 0, x: -40 }}       // slide slightly left on exit
                transition={{ duration: 0.25, ease: "easeInOut" }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
