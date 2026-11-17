const regionNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

export default function CountryFlag({ country }) {
  if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return null;

  const flag = String.fromCodePoint(
    ...Array.from(country, (letter) => letter.charCodeAt(0) + 127397)
  );
  const name = regionNames?.of(country) || country;

  return <span role="img" aria-label={`${name} flag`} title={name}>{flag}</span>;
}
