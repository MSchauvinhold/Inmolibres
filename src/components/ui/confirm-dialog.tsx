"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Confirmación propia del sistema (reemplaza a window.confirm, que algunos navegadores
// bloquean o autodescartan y deja la acción cortada sin ningún aviso).

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, onConfirm, loading = false, destructive = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="light-portal max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-text-primary">{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-text-secondary space-y-2">{description}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="il-btn il-btn--ghost"
            style={{ height: 36, fontSize: 13 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={destructive ? "il-btn" : "il-btn il-btn--primary"}
            style={{
              height: 36, fontSize: 13, gap: 6, opacity: loading ? 0.7 : 1,
              ...(destructive && { background: "var(--danger-500)", color: "#fff", border: "none" }),
            }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
