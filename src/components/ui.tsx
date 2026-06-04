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
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      {label}
      <input
        className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      {label}
      <textarea
        className="min-h-24 rounded-md border border-stone-200 bg-white px-3 py-2 text-stone-950 shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      {label}
      <select
        className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        name={name}
        defaultValue={value ?? ""}
        required={required}
      >
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
    <section className={`rounded-lg border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="mb-4 text-base font-semibold text-stone-950">{title}</h2>
      {children}
    </section>
  );
}

export function SubmitButton({ children = "保存" }: { children?: ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex h-11 items-center justify-center rounded-md bg-teal-800 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-900"
    >
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 py-7 text-center text-sm text-stone-500">
      {children}
    </div>
  );
}
