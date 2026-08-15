"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  message: string;
  className?: string;
  pendingText?: ReactNode;
};

export function ConfirmSubmitButton({ children, message, className, pendingText = "処理中..." }: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:pointer-events-none disabled:opacity-60`}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }

        const form = event.currentTarget.form;
        if (form && !form.checkValidity()) {
          return;
        }

        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
