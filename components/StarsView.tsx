/** Wyświetlenie oceny gwiazdkami (z ułamkiem). */
export default function StarsView({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars-view" aria-label={`Ocena ${value.toFixed(1)} z 5`} style={{ ["--p" as string]: `${(value / 5) * 100}%`, fontSize: size }}>
      <span aria-hidden>★★★★★</span>
      <span aria-hidden className="fill">★★★★★</span>
    </span>
  );
}
