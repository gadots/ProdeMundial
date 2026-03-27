// Maps our 3-letter team codes (TLA) to ISO 3166-1 alpha-2 codes for flagcdn.com
const TLA_TO_ISO2: Record<string, string> = {
  // Anfitriones
  USA: "us", MEX: "mx", CAN: "ca",
  // CONMEBOL
  ARG: "ar", BRA: "br", URU: "uy", COL: "co", ECU: "ec", VEN: "ve",
  CHI: "cl", CHL: "cl", BOL: "bo", PAR: "py", PRY: "py", PER: "pe",
  // UEFA
  ENG: "gb-eng", FRA: "fr", ESP: "es", GER: "de", POR: "pt", NED: "nl",
  ITA: "it", BEL: "be", CRO: "hr", POL: "pl", SUI: "ch", AUT: "at",
  SCO: "gb-sct", SER: "rs", SRB: "rs", TUR: "tr", DEN: "dk", UKR: "ua",
  HUN: "hu", WAL: "gb-wls", NOR: "no", SWE: "se", SVE: "se",
  SVN: "si", SLO: "si", CZE: "cz", SVK: "sk", SLK: "sk",
  ROU: "ro", ROM: "ro", GRE: "gr", GRC: "gr", IRL: "ie", IRE: "ie",
  FIN: "fi", ISL: "is", GEO: "ge", MKD: "mk", MNE: "me", BIH: "ba",
  ALB: "al", KSV: "xk", ARM: "am", AZE: "az", BLR: "by",
  LTU: "lt", LVA: "lv", EST: "ee",
  // CAF
  MAR: "ma", SEN: "sn", CMR: "cm", NGA: "ng", EGY: "eg", CIV: "ci",
  GHA: "gh", TUN: "tn", RSA: "za", ALG: "dz", CGO: "cg", COG: "cg",
  COD: "cd", MLI: "ml", BFA: "bf", GNB: "gw", MOZ: "mz", TAN: "tz",
  ZIM: "zw", ZAM: "zm", GAB: "ga", GUI: "gn", SLE: "sl", LBY: "ly",
  ETH: "et", UGA: "ug", KEN: "ke", SUD: "sd", NIG: "ne", BEN: "bj",
  // AFC
  JPN: "jp", KOR: "kr", IRN: "ir", AUS: "au", SAU: "sa", JOR: "jo",
  IRQ: "iq", UZB: "uz", QAT: "qa", CHN: "cn", UAE: "ae", OMA: "om",
  BHR: "bh", KWT: "kw", SYR: "sy", PAL: "ps", YEM: "ye", AFG: "af",
  IND: "in", PAK: "pk", BAN: "bd", THA: "th", VIE: "vn", IDN: "id",
  PHI: "ph", MAS: "my", SGP: "sg",
  // CONCACAF (no anfitriones)
  CRC: "cr", PAN: "pa", JAM: "jm", HON: "hn", SLV: "sv", GTM: "gt",
  HAI: "ht", HTI: "ht", TRI: "tt", CUB: "cu",
  // OFC
  NZL: "nz",
};

export function getFlagUrl(tla: string, size: 20 | 40 | 80 = 40): string {
  const iso2 = TLA_TO_ISO2[tla?.toUpperCase()];
  if (!iso2) return "";
  return `https://flagcdn.com/w${size}/${iso2}.png`;
}

interface FlagProps {
  tla: string;
  size?: 20 | 40 | 80;
  className?: string;
}

export function Flag({ tla, size = 40, className = "" }: FlagProps) {
  const url = getFlagUrl(tla, size);
  if (!url) return <span className={`text-white/20 text-xs ${className}`}>{tla}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={tla}
      width={size}
      height={Math.round(size * 0.67)}
      className={`inline-block rounded-[2px] object-cover ${className}`}
      loading="lazy"
    />
  );
}
