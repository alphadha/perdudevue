type Props = {
  message?: string;
};

export default function FieldError({ message }: Props) {
  if (!message) {
    return null;
  }
  return <div className="invalid-feedback d-block">{message}</div>;
}
