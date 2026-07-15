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
