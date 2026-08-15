import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  name: string;
  value?: string | number | null;
  required?: boolean;
  type?: string;
  placeholder?: string;
};

export function TextField({
  label,
  name,
  value,
  required,
  type = "text",
  placeholder
}: FieldProps) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
      {label}
      <input
        className="lien-input placeholder:text-stone-400"
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  value,
  required,
  placeholder
}: FieldProps) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
      {label}
      <textarea
        className="lien-input min-h-28 py-3 placeholder:text-stone-400"
        name={name}
        defaultValue={value ?? ""}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

type SelectFieldProps = FieldProps & {
  options: string[];
};

export function SelectField({ label, name, value, options, required }: SelectFieldProps) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
      {label}
      <select className="lien-input" name={name} defaultValue={value ?? ""} required={required}>
        <option value="">未選択</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Section({
  title,
  children,
  className = ""
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[22px] border border-[color:var(--lien-border)] bg-[color:var(--lien-surface)] p-5 shadow-lien-sm ${className}`}>
      <h2 className="mb-4 text-base font-semibold text-[color:var(--lien-ink)]">{title}</h2>
      {children}
    </section>
  );
}

export function SubmitButton({ children = "保存" }: { children?: ReactNode }) {
  return (
    <button type="submit" className="lien-button-primary">
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[color:var(--lien-border-strong)] bg-[color:var(--lien-surface-soft)] px-4 py-7 text-center text-sm text-[color:var(--lien-muted)]">
      {children}
    </div>
  );
}
