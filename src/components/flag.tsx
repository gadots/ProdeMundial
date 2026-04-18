// Maps our 3-letter team codes (TLA) to ISO 3166-1 alpha-2 codes for flagcdn.com
const TLA_TO_ISO2: Record<string, string> = {
  // Anfitriones
  USA: "us", MEX: "mx", CAN: "ca",
  // CONMEBOL
  ARG: "ar", BRA: "br", URU: "uy", COL: "co", ECU: "ec", VEN: "ve",
  CHI: "cl", CHL: "cl", BOL: "bo", PAR: "py", PRY: "py", PER: "pe",
  // UEFA
  ENG: "gb-eng", FRA: "fr", ESP: "es", GER: "de", POR: "pt", NED: "nl",
  ITA: "it", BEL: "be", CRO: "hr", POL: "pl", SUI: "ch", CHE: "ch", AUT: "at",
  SCO: "gb-sct", SER: "rs", SRB: "rs", TUR: "tr", DEN: "dk", UKR: "ua",
  HUN: "hu", WAL: "gb-wls", NOR: "no", SWE: "se", SVE: "se",
  SVN: "si", SLO: "si", CZE: "cz", SVK: "sk", SLK: "sk",
  ROU: "ro", ROM: "ro", GRE: "gr", GRC: "gr", IRL: "ie", IRE: "ie",
  FIN: "fi", ISL: "is", GEO: "ge", MKD: "mk", MNE: "me", BIH: "ba",
  ALB: "al", KSV: "xk", KOS: "xk", ARM: "am", AZE: "az", BLR: "by",
  LTU: "lt", LVA: "lv", EST: "ee", LUX: "lu", NIR: "gb-nir",
  // CAF
  MAR: "ma", SEN: "sn", CMR: "cm", NGA: "ng", EGY: "eg", CIV: "ci",
  GHA: "gh", TUN: "tn", RSA: "za", ALG: "dz", CGO: "cg", COG: "cg",
  COD: "cd", DRC: "cd", MLI: "ml", BFA: "bf", GNB: "gw", MOZ: "mz", TAN: "tz",
  ZIM: "zw", ZAM: "zm", GAB: "ga", GUI: "gn", GIN: "gn", SLE: "sl", LBY: "ly",
  ETH: "et", UGA: "ug", KEN: "ke", SUD: "sd", NIG: "ne", BEN: "bj",
  CPV: "cv", GAM: "gm", GMB: "gm", GNE: "gq", GEQ: "gq", EQG: "gq",
  COM: "km", RWA: "rw", MRT: "mr", MTN: "mr", ANG: "ao",
  NAM: "na", BOT: "bw", SWZ: "sz", LES: "ls", MAD: "mg",
  // AFC
  JPN: "jp", KOR: "kr", PRK: "kp", IRN: "ir", IRI: "ir", AUS: "au",
  SAU: "sa", JOR: "jo", IRQ: "iq", UZB: "uz", QAT: "qa", CHN: "cn",
  UAE: "ae", OMA: "om", BHR: "bh", KWT: "kw", SYR: "sy", PAL: "ps",
  YEM: "ye", AFG: "af", IND: "in", PAK: "pk", BAN: "bd", THA: "th",
  VIE: "vn", IDN: "id", PHI: "ph", MAS: "my", SGP: "sg",
  KGZ: "kg", TJK: "tj", TKM: "tm", KAZ: "kz", MNG: "mn", MGL: "mn",
  LBN: "lb", LIB: "lb", ISR: "il",
  // CONCACAF (no anfitriones)
  CRC: "cr", PAN: "pa", JAM: "jm", HON: "hn", SLV: "sv", GTM: "gt",
  HAI: "ht", HTI: "ht", TRI: "tt", TTO: "tt", CUB: "cu",
  GUY: "gy", SUR: "sr", BLZ: "bz", NCA: "ni", NIC: "ni",
  DOM: "do", PUR: "pr", GUA: "gt",
  // OFC
  NZL: "nz", FIJ: "fj", PNG: "pg", SOL: "sb", VAN: "vu", TGA: "to",
  SAM: "ws", TAH: "pf",
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
