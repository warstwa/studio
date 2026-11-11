"use client";
import { useFormStatus } from "react-dom";

export default function Submit({
  children,
  className = "btn btn-primary",
  pendingText,
  disabled,
  ...rest
}: { children: React.ReactNode; className?: string; pendingText?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} {...rest} disabled={pending || disabled}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden />
          {pendingText ?? "Chwileczkę…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
