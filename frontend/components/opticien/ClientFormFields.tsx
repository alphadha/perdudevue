import FieldError from "@/components/FieldError";
import type { ClientPayload } from "@/lib/types";

type Props = {
  value: ClientPayload;
  fieldErrors: Record<string, string>;
  onChange: (next: ClientPayload) => void;
  idPrefix: string;
};

export default function ClientFormFields({ value, fieldErrors, onChange, idPrefix }: Props) {
  function set<K extends keyof ClientPayload>(key: K, next: ClientPayload[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor={`${idPrefix}-last`}>
            Nom*
          </label>
          <input
            id={`${idPrefix}-last`}
            className={`form-control${fieldErrors.last_name ? " is-invalid" : ""}`}
            value={value.last_name}
            placeholder="Dupond"
            onChange={(event) => set("last_name", event.target.value)}
            required
          />
          <FieldError message={fieldErrors.last_name} />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor={`${idPrefix}-first`}>
            Prénom*
          </label>
          <input
            id={`${idPrefix}-first`}
            className={`form-control${fieldErrors.first_name ? " is-invalid" : ""}`}
            value={value.first_name}
            placeholder="Corentin"
            onChange={(event) => set("first_name", event.target.value)}
            required
          />
          <FieldError message={fieldErrors.first_name} />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor={`${idPrefix}-email`}>
          Adresse e-mail*
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          className={`form-control${fieldErrors.email ? " is-invalid" : ""}`}
          placeholder="adresse@mail.fr"
          value={value.email}
          onChange={(event) => set("email", event.target.value)}
          required
        />
        <FieldError message={fieldErrors.email} />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor={`${idPrefix}-phone`}>
          Numéro de téléphone*
        </label>
        <input
          id={`${idPrefix}-phone`}
          className={`form-control${fieldErrors.phone ? " is-invalid" : ""}`}
          placeholder="00 00 00 00 00"
          value={value.phone}
          onChange={(event) => set("phone", event.target.value)}
          required
        />
        <FieldError message={fieldErrors.phone} />
      </div>
      <p className="fw-medium mb-1">Préférences de notifications de votre client*</p>
      <p className="small text-secondary">
        Le client doit donner son accord pour chaque mode de communication. Ces choix peuvent être
        modifiés ultérieurement.
      </p>
      <div className="form-check form-switch mb-2">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id={`${idPrefix}-consent-email`}
          checked={value.consent_email}
          onChange={(event) => set("consent_email", event.target.checked)}
        />
        <label className="form-check-label" htmlFor={`${idPrefix}-consent-email`}>
          Le client accepte de recevoir les notifications par email
        </label>
      </div>
      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id={`${idPrefix}-consent-sms`}
          checked={value.consent_sms}
          onChange={(event) => set("consent_sms", event.target.checked)}
        />
        <label className="form-check-label" htmlFor={`${idPrefix}-consent-sms`}>
          Le client accepte de recevoir les notifications par SMS
        </label>
      </div>
    </>
  );
}
