/*
 * VINs for the portal: Kavin's offline validity check (shell.js vinCheck, mirroring apps/common/vin.py),
 * and a local stand-in for /api/vin/{vin}. Kavin's server asks NHTSA's vPIC decoder for the year, make
 * and model; the demo makes no network calls, so this decodes the model year from position 10, the make
 * from the manufacturer prefix, and the model only for vehicles it knows (the seed's and the demo
 * de-fleet list's). Whatever it cannot tell is left for the person to fill in.
 */

const VIN_MAP = Object.fromEntries([..."0123456789"].map((c, i) => [c, i]).concat([..."ABCDEFGH"].map((c, i) => [c, i + 1]), [..."JKLMN"].map((c, i) => [c, i + 1]), [["P", 7], ["R", 9]], [..."STUVWXYZ"].map((c, i) => [c, i + 2])));
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
export const vinNormalize = v => String(v || "").replace(/[\s-]/g, "").toUpperCase();
export function vinCheck(raw){
  const v = vinNormalize(raw);
  if (!v) return {ok: false, vin: v, reason: "VIN is empty"};
  if (v.length !== 17) return {ok: false, vin: v, reason: `VIN must be 17 characters (this one has ${v.length})`};
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) { const bad = [...new Set([...v].filter(c => "IOQ".includes(c) || !/[A-Z0-9]/.test(c)))]; return {ok: false, vin: v, reason: bad.length ? "VIN cannot contain " + bad.join(", ") : "VIN has an invalid character"}; }
  const total = [...v].reduce((t, c, i) => t + VIN_MAP[c] * VIN_WEIGHTS[i], 0), expect = total % 11 === 10 ? "X" : String(total % 11);
  return v[8] === expect ? {ok: true, vin: v, reason: ""} : {ok: false, vin: v, reason: "VIN check digit does not match; one character is probably mistyped"};
}

// position 10 repeats every 30 years; for cars and light trucks position 7 says which cycle:
// a digit there is 1980-2009, a letter 2010-2039 (the rule decoders such as vPIC apply)
const YEAR_CHARS = "ABCDEFGHJKLMNPRSTVWXY123456789";
function modelYear(vin){
  const i = YEAR_CHARS.indexOf(vin[9]); if (i < 0) return "";
  const y = (/\d/.test(vin[6]) ? 1980 : 2010) + i;
  return y > new Date().getFullYear() + 1 ? "" : String(y);
}
// world manufacturer identifiers (positions 1-3) for the makes a fleet holds
const WMI = {
  "1FA": "Ford", "1FM": "Ford", "1FT": "Ford", "1FD": "Ford", "3FA": "Ford", "3FM": "Ford", "1G1": "Chevrolet", "1GC": "Chevrolet", "1GN": "Chevrolet", "3GN": "Chevrolet", "2G1": "Chevrolet",
  "1GY": "Cadillac", "1GK": "GMC", "1GT": "GMC", "4T1": "Toyota", "4T3": "Toyota", "4T4": "Toyota", "5TD": "Toyota", "5TF": "Toyota", "5YF": "Toyota", "2T3": "Toyota", "3TM": "Toyota", "JTD": "Toyota",
  "JTE": "Toyota", "JTM": "Toyota", "2T2": "Lexus", "JTH": "Lexus", "1HG": "Honda", "2HG": "Honda", "5FN": "Honda", "5J6": "Honda", "7FA": "Honda", "19X": "Honda", "1N4": "Nissan", "3N1": "Nissan",
  "5N1": "Nissan", "JN8": "Nissan", "5YJ": "Tesla", "7SA": "Tesla", "WBA": "BMW", "5UX": "BMW", "WDD": "Mercedes-Benz", "W1K": "Mercedes-Benz", "4JG": "Mercedes-Benz", "KMH": "Hyundai", "5NP": "Hyundai",
  "KM8": "Hyundai", "KNA": "Kia", "KND": "Kia", "3KP": "Kia", "5XY": "Kia", "JM1": "Mazda", "JM3": "Mazda", "4S4": "Subaru", "JF1": "Subaru", "JF2": "Subaru", "1C4": "Jeep", "1C6": "Ram", "3C6": "Ram",
  "2C3": "Dodge", "2C4": "Chrysler", "WP0": "Porsche", "WP1": "Porsche", "ZHW": "Lamborghini", "WAU": "Audi", "WA1": "Audi", "3VW": "Volkswagen", "1V2": "Volkswagen", "YV1": "Volvo", "SAL": "Land Rover",
};
// positions 1-8 of vehicles the demo knows: [make, model]
const KNOWN = {
  "4T1C11AK": ["Toyota", "Camry"], "5N1BT3BB": ["Nissan", "Rogue"], "7SAYGDEE": ["Tesla", "Model Y"], "1G1ZD5ST": ["Chevrolet", "Malibu"], "1FMSK8DH": ["Ford", "Explorer"],
  "1C4RJHBG": ["Jeep", "Grand Cherokee"], "1GNSKNKD": ["Chevrolet", "Tahoe"], "3KPF24AD": ["Kia", "Forte"], "5YJ3E1EA": ["Tesla", "Model 3"], "7FARW2H5": ["Honda", "CR-V"],
  "KMHLM4AG": ["Hyundai", "Elantra"], "2T3P1RFV": ["Toyota", "RAV4"], "5UXCR6C0": ["BMW", "X5"], "4JGFB4KB": ["Mercedes-Benz", "GLE 350"], "1N4BL4DV": ["Nissan", "Altima"],
  "1FTFW1E5": ["Ford", "F-150"], "ZHWUF5ZF": ["Lamborghini", "Huracan EVO"], "2T2BZMCA": ["Lexus", "RX 350"], "1HGCV1F3": ["Honda", "Accord"], "4S4BTACC": ["Subaru", "Outback"],
  "2HGFC2F6": ["Honda", "Civic"], "3GNAXKEG": ["Chevrolet", "Equinox"], "3FMTK3SU": ["Ford", "Mustang Mach-E"], "2C4RC1BG": ["Chrysler", "Pacifica"], "1GYS4BKL": ["Cadillac", "Escalade"],
  "KM8KN4AE": ["Hyundai", "Ioniq 5"], "WP0AB091": ["Porsche", "911 Carrera"], "1C4HJXEG": ["Jeep", "Wrangler"], "5YFEPMAE": ["Toyota", "Corolla"], "2C3CDXBG": ["Dodge", "Charger"],
  "1C6SRFBT": ["Ram", "1500"], "3TMCZ5AN": ["Toyota", "Tacoma"], "1FMCU0G6": ["Ford", "Escape"], "JM3KFBCM": ["Mazda", "CX-5"], "5N1AT3AA": ["Nissan", "Rogue"],
  "1FMCU9G6": ["Ford", "Escape"], "1G1FY6S0": ["Chevrolet", "Bolt EV"], "1FA6P8TH": ["Ford", "Mustang"], "5NPEG4JA": ["Hyundai", "Sonata"], "3N1AB8CV": ["Nissan", "Sentra"],
  "4T1G11AK": ["Toyota", "Camry"], "1C4PJMDX": ["Jeep", "Cherokee"], "KNDJ23AU": ["Kia", "Soul"], "5TDGZRBH": ["Toyota", "Highlander"],
};

/** /api/vin/{vin}: {vin, valid, reason} plus whatever is known of year, make and model. */
export function vinLookup(raw){
  const {ok, vin, reason} = vinCheck(raw);
  const out = {vin, valid: ok, reason};
  if (!ok) return out;
  const known = KNOWN[vin.slice(0, 8)], make = known?.[0] || WMI[vin.slice(0, 3)];
  const year = modelYear(vin);
  if (year) out.year = year;
  if (make) out.make = make;
  if (known) out.model = known[1];
  return out;
}
