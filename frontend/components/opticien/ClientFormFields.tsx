import PdvField from "@/components/pdv/PdvField";
import PdvToggle from "@/components/pdv/PdvToggle";
import type { ClientPayload } from "@/lib/types";

type Props = {
  value: ClientPayload;
  fieldErrors: Record<string, string>;
  onChange: (next: ClientPayload) => void;
  idPrefix: string;
  showConsents?: boolean;
};

export default function ClientFormFields({
  value,
  fieldErrors,
  onChange,
  idPrefix,
  showConsents = true,
}: Props) {
  function set<K extends keyof ClientPayload>(key: K, next: ClientPayload[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <>
      <div className="pdv-field-row">
        <PdvField
          id={`${idPrefix}-last`}
          label="Nom*"
          value={value.last_name}
          placeholder="Dupond"
          error={fieldErrors.last_name}
          required
          onChange={(event) => set("last_name", event.target.value)}
        />
        <PdvField
          id={`${idPrefix}-first`}
          label="Prénom*"
          value={value.first_name}
          placeholder="Corentin"
          error={fieldErrors.first_name}
          required
          onChange={(event) => set("first_name", event.target.value)}
        />
      </div>
      <PdvField
        id={`${idPrefix}-email`}
        type="email"
        label="Adresse e-mail*"
        placeholder="adresse@mail.fr"
        value={value.email}
        error={fieldErrors.email}
        required
        onChange={(event) => set("email", event.target.value)}
      />
      <PdvField
        id={`${idPrefix}-phone`}
        label="Numéro de téléphone*"
        placeholder="06 00 00 00 00"
        value={value.phone}
        error={fieldErrors.phone}
        required
        onChange={(event) => set("phone", event.target.value)}
      />
      {showConsents ? (
        <div className="pdv-consent-block">
          <div className="pdv-consent-block__intro">
            <p className="pdv-field__label">Préférences de notifications de votre client*</p>
            <p className="pdv-field__hint">
              Le client doit donner son accord pour chaque mode de communication. Ces choix peuvent être
              modifiés ultérieurement
            </p>
          </div>
          <PdvToggle
            checked={value.consent_email}
            onChange={(checked) => set("consent_email", checked)}
            label="Le client accepte les notifications par email"
          />
          <PdvToggle
            checked={value.consent_sms}
            onChange={(checked) => set("consent_sms", checked)}
            label="Le client accepte les notifications par SMS"
          />
        </div>
      ) : null}
    </>
  );
}
