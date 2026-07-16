import {
  Gauge,
  Smartphone,
  Camera,
  Eye,
  Bluetooth,
  Snowflake,
  Navigation,
  Sun,
  Lock,
} from "lucide-react";

// Mock partner. Generic on purpose; not tied to any real dealer.
export const DEALER = {
  name: "Crestview Auto Group",
  short: "Crestview",
  address: "16400 E Colfax Ave",
  city: "Aurora",
  state: "CO",
  zip: "80011",
  phone: "(303) 555-0148",
  url: "crestviewautogroup.com",
};

// Dealer contexts for the parameterized Inspectd order flow.
// The order flow reads these from context; both share the same visual chrome
// but carry their own promise wording and slug for the simulated tab URL.
export const CRESTVIEW_DEALER = {
  ...DEALER,
  key: "crestview",
  reimbursementText: (usdPrice) =>
    `Crestview Auto Group reimburses this full ${usdPrice} at signing if you purchase this vehicle.`,
};

export const AXLEAUTO_DEALER = {
  key: "axleauto",
  name: "AxleAuto",
  short: "AxleAuto",
  address: "2200 Bayshore Pkwy",
  city: "Mountain View",
  state: "CA",
  zip: "94043",
  phone: "(650) 555-0100",
  url: "axleauto.ai",
  reimbursementText: (usdPrice) =>
    `AxleAuto reserves this vehicle when you order, and applies the ${usdPrice} inspection cost toward your purchase if you buy.`,
};

// Representative Inspectd price placeholder.
export const PRICE = 199;

export const INVENTORY = [
  { vin: "2T3W1RFV5MW128841", year: 2021, make: "Toyota", model: "RAV4", trim: "XLE Hybrid AWD", price: 29995, orig: 31250, mo: 498, miles: 38120, stock: "U28841", cpo: true, body: "SUV", ext: "Magnetic Gray", intc: "Black", drive: "AWD", fuel: "Hybrid", trans: "eCVT", engine: "2.5L I4 Hybrid 219 hp", hue: 210, image: "/vehicles/toyota-rav4.jpg" },
  { vin: "1FTFW1E84MFA90765", year: 2021, make: "Ford", model: "F-150", trim: "Lariat SuperCrew 4x4", price: 47995, orig: 49500, mo: 787, miles: 29440, stock: "U90765", cpo: false, body: "Truck", ext: "Oxford White", intc: "Medium Earth Gray", drive: "4WD", fuel: "Gasoline", trans: "10-Speed Automatic", engine: "3.5L V6 EcoBoost", hue: 20, image: "/vehicles/ford-f-150.jpg" },
  { vin: "5YJ3E1EA8MF334455", year: 2021, make: "Tesla", model: "Model 3", trim: "Performance", price: 39995, orig: 41500, mo: 661, miles: 41010, stock: "U34455", cpo: false, body: "Sedan", ext: "Pearl White", intc: "Black", drive: "AWD", fuel: "Electric", trans: "Single-Speed", engine: "Dual Motor Electric", hue: 0, image: "/vehicles/tesla-model-3.jpg" },
  { vin: "WBA5R1C50MAE61223", year: 2021, make: "BMW", model: "330i", trim: "xDrive M Sport", price: 33890, orig: 35200, mo: 559, miles: 35720, stock: "U61223", cpo: true, body: "Sedan", ext: "Alpine White", intc: "Cognac", drive: "AWD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "2.0L I4 Turbo", hue: 260, image: "/vehicles/bmw-330i.jpg" },
  { vin: "1C4RJFBG5MC700112", year: 2021, make: "Jeep", model: "Grand Cherokee L", trim: "Limited", price: 33995, orig: 35200, mo: 561, miles: 44210, stock: "U00112", cpo: false, body: "SUV", ext: "Bright White", intc: "Black", drive: "4WD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "3.6L V6", hue: 150, image: "/vehicles/jeep-grand-cherokee.jpg" },
  { vin: "3VWC57BU5MM012233", year: 2021, make: "Volkswagen", model: "Jetta", trim: "GLI", price: 24995, orig: 27500, mo: 412, miles: 33990, stock: "U12233", cpo: true, body: "Sedan", ext: "Pure White", intc: "Titan Black", drive: "FWD", fuel: "Gasoline", trans: "7-Speed DSG", engine: "2.0L I4 Turbo 228 hp", hue: 200, image: "/vehicles/volkswagen-jetta.jpg" },
  { vin: "5NPEG4JA9MH098877", year: 2024, make: "Hyundai", model: "Sonata", trim: "SEL", price: 23995, orig: 26500, mo: 396, miles: 18540, stock: "U98877", cpo: false, body: "Sedan", ext: "Hyper White", intc: "Black", drive: "FWD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "2.5L I4", hue: 230, image: "/vehicles/hyundai-sonata.jpg" },
  { vin: "1GNERGKW8MJ223344", year: 2021, make: "Chevrolet", model: "Traverse", trim: "LT", price: 29900, orig: 31200, mo: 494, miles: 40120, stock: "U23344", cpo: false, body: "SUV", ext: "Satin Steel Metallic", intc: "Jet Black", drive: "AWD", fuel: "Gasoline", trans: "9-Speed Automatic", engine: "3.6L V6", hue: 30, image: "/vehicles/chevrolet-traverse.jpg" },
];

// Digital-native retailer inventory (AxleAuto.ai). Kept separate from
// the Crestview INVENTORY on purpose.
export const DN_INVENTORY = [
  { vin: "SALYB2FV5MA000123", year: 2021, make: "Land Rover", model: "Range Rover Velar", trim: "S", price: 41900, mo: 691, miles: 32540, stock: "DN12045", body: "SUV", ext: "Fuji White", drive: "AWD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "2.0L I4 Turbo", image: "/vehicles-dn/range-rover-velar.jpg", confidence: "Priced $1,200 below market" },
  { vin: "W1NKM4HB0PF000456", year: 2023, make: "Mercedes-Benz", model: "GLC 300", trim: "4MATIC", price: 47500, mo: 784, miles: 21870, stock: "DN23106", body: "SUV", ext: "Obsidian Black Metallic", drive: "AWD", fuel: "Gasoline", trans: "9-Speed Automatic", engine: "2.0L I4 Turbo", image: "/vehicles-dn/mercedes-glc.jpg" },
  { vin: "7SAYGDEF5NF000789", year: 2022, make: "Tesla", model: "Model Y", trim: "Performance", price: 38900, mo: 642, miles: 28430, stock: "DN34212", body: "SUV", ext: "Midnight Silver Metallic", drive: "AWD", fuel: "Electric", trans: "Single-Speed", engine: "Dual Motor Electric", image: "/vehicles-dn/tesla-model-y.jpg", confidence: "AxleAuto confidence: high" },
  { vin: "5YJ3E1EB5PF001111", year: 2023, make: "Tesla", model: "Model 3", trim: "Long Range", price: 33500, mo: 553, miles: 19820, stock: "DN45330", body: "Sedan", ext: "Pearl White Multi-Coat", drive: "AWD", fuel: "Electric", trans: "Single-Speed", engine: "Dual Motor Electric", image: "/vehicles-dn/tesla-model-3.jpg" },
  { vin: "WBA73AK09S7000222", year: 2025, make: "BMW", model: "228", trim: "xDrive Gran Coupe · Sport Package", price: 41900, mo: 691, miles: 6210, stock: "DN56418", body: "Sedan", ext: "Alpine White", drive: "AWD", fuel: "Gasoline", trans: "7-Speed DCT", engine: "2.0L I4 Turbo", image: "/vehicles-dn/bmw-228.jpg", confidence: "New arrival" },
  { vin: "WP1AA2A50NLB00333", year: 2022, make: "Porsche", model: "Macan", trim: "Base", price: 51900, mo: 856, miles: 24080, stock: "DN67509", body: "SUV", ext: "Jet Black Metallic", drive: "AWD", fuel: "Gasoline", trans: "7-Speed PDK", engine: "2.0L I4 Turbo", image: "/vehicles-dn/porsche-macan.jpg" },
  { vin: "WA15AAFY0N2000444", year: 2022, make: "Audi", model: "Q5 Sportback", trim: "S line Premium Plus", price: 44500, mo: 734, miles: 26760, stock: "DN78621", body: "SUV", ext: "Mythos Black Metallic", drive: "quattro AWD", fuel: "Gasoline", trans: "7-Speed S tronic", engine: "2.0L I4 Turbo", image: "/vehicles-dn/audi-q5.jpg" },
  { vin: "WAUAUDGY8NA000555", year: 2022, make: "Audi", model: "A3", trim: "Premium Plus", price: 32900, mo: 543, miles: 21310, stock: "DN89733", body: "Sedan", ext: "Daytona Gray Pearl Effect", drive: "FWD", fuel: "Gasoline", trans: "7-Speed S tronic", engine: "2.0L I4 Turbo", image: "/vehicles-dn/audi-a3.jpg" },
];

export const FEATURES = [
  ["Adaptive cruise control", Gauge],
  ["Apple CarPlay", Smartphone],
  ["Android Auto", Smartphone],
  ["Backup camera", Camera],
  ["Blind spot monitor", Eye],
  ["Bluetooth", Bluetooth],
  ["Automatic climate control", Snowflake],
  ["Navigation system", Navigation],
  ["Sunroof / moonroof", Sun],
  ["Keyless entry", Lock],
  ["Lane departure warning", Eye],
  ["Heated seats", Sun],
];

export const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
