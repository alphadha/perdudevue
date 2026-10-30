export default function ComingSoonPage({ title, lot }: { title: string; lot: string }) {
  return (
    <>
      <h1 className="h4">{title}</h1>
      <p className="text-secondary">Cet écran arrive au {lot}.</p>
    </>
  );
}
