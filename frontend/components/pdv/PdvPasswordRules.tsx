const RULES = [
  {
    id: "length",
    label: "Plus de 8 caractères",
    ok: (password: string) => password.length > 8,
  },
  {
    id: "case",
    label: "Une majuscule et une minuscule",
    ok: (password: string) => /[A-Z]/.test(password) && /[a-z]/.test(password),
  },
  {
    id: "mix",
    label: "Un chiffre et un caractère spécial",
    ok: (password: string) => /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password),
  },
] as const;

export function passwordMeetsRules(password: string): boolean {
  return RULES.every((rule) => rule.ok(password));
}

export default function PdvPasswordRules({
  password,
  showError = false,
}: {
  password: string;
  showError?: boolean;
}) {
  return (
    <ul className="pdv-password-rules">
      {RULES.map((rule) => {
        const ok = rule.ok(password);
        const error = showError && !ok;
        return (
          <li key={rule.id} className={ok ? "is-ok" : error ? "is-error" : undefined}>
            <img
              src={
                ok
                  ? "/icons/pdv/check-circle-16.svg"
                  : error
                    ? "/icons/pdv/alert-circle-16.svg"
                    : "/icons/pdv/info-circle.svg"
              }
              alt=""
              width={16}
              height={16}
            />
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
