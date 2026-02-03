"use client";

import { CheckCircle2Icon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components";
import { useNotificationStore } from "@/store";

export function Notification() {
  const { notifications, removeNotification } = useNotificationStore();

  useEffect(() => {
    if (notifications.length === 0) return;

    // Берем первый (самый старый) элемент
    const first = notifications[0];

    // Удаляем его с анимацией спустя 4 сек (3.7 + 0.3 на exit)
    const timer = setTimeout(() => {
      removeNotification(first.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [notifications, removeNotification]);

  return (
    notifications.length > 0 && (
      <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-3 w-[320px] overflow-hidden">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 150 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Alert variant={n.type}>
                <CheckCircle2Icon height={16} />
                {n.title && <AlertTitle>{n.title}</AlertTitle>}
                {n.description && (
                  <AlertDescription>{n.description}</AlertDescription>
                )}
              </Alert>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )
  );
}
