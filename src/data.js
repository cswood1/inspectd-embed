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
  city: "Aurora, CO",
  address: "16400 E Colfax Ave, Aurora, CO 80011",
  phone: "(303) 555-0148",
  url: "crestviewautogroup.com",
};

// Representative Inspectd price placeholder.
export const PRICE = 199;

export const INVENTORY = [
  { vin: "2T3W1RFV5MW128841", year: 2021, make: "Toyota", model: "RAV4", trim: "XLE AWD", price: 27894, orig: 28995, mo: 463, miles: 38120, stock: "U28841", cpo: true, body: "SUV", ext: "Magnetic Gray", intc: "Black", drive: "AWD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "2.5L I4 203 hp", hue: 210 },
  { vin: "1FTFW1E84MFA90765", year: 2021, make: "Ford", model: "F-150", trim: "XLT SuperCrew 4x4", price: 41995, orig: 43500, mo: 689, miles: 29440, stock: "U90765", cpo: false, body: "Truck", ext: "Oxford White", intc: "Medium Earth Gray", drive: "4WD", fuel: "Gasoline", trans: "10-Speed Automatic", engine: "3.5L V6 EcoBoost", hue: 20 },
  { vin: "5YJ3E1EA8MF334455", year: 2021, make: "Tesla", model: "Model 3", trim: "Standard Range Plus", price: 28200, orig: 29900, mo: 472, miles: 41010, stock: "U34455", cpo: false, body: "Sedan", ext: "Pearl White", intc: "Black", drive: "RWD", fuel: "Electric", trans: "Single-Speed", engine: "Electric Motor", hue: 0 },
  { vin: "WBA5R1C50MAE61223", year: 2021, make: "BMW", model: "330i", trim: "xDrive", price: 33890, orig: 35200, mo: 559, miles: 35720, stock: "U61223", cpo: true, body: "Sedan", ext: "Alpine White", intc: "Cognac", drive: "AWD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "2.0L I4 Turbo", hue: 260 },
  { vin: "1C4RJFBG5MC700112", year: 2021, make: "Jeep", model: "Grand Cherokee", trim: "Limited", price: 30650, orig: 31995, mo: 506, miles: 44210, stock: "U00112", cpo: false, body: "SUV", ext: "Diamond Black", intc: "Black", drive: "4WD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "3.6L V6", hue: 150 },
  { vin: "3VWC57BU5MM012233", year: 2021, make: "Volkswagen", model: "Jetta", trim: "SE", price: 19450, orig: 20400, mo: 322, miles: 33990, stock: "U12233", cpo: true, body: "Sedan", ext: "Pure Gray", intc: "Titan Black", drive: "FWD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "1.4L I4 Turbo", hue: 200 },
  { vin: "5NPEG4JA9MH098877", year: 2021, make: "Hyundai", model: "Sonata", trim: "SEL", price: 21895, orig: 22900, mo: 362, miles: 36540, stock: "U98877", cpo: false, body: "Sedan", ext: "Hampton Gray", intc: "Black", drive: "FWD", fuel: "Gasoline", trans: "8-Speed Automatic", engine: "2.5L I4", hue: 230 },
  { vin: "1GNERGKW8MJ223344", year: 2021, make: "Chevrolet", model: "Traverse", trim: "LT", price: 29900, orig: 31200, mo: 494, miles: 40120, stock: "U23344", cpo: false, body: "SUV", ext: "Silver Ice", intc: "Jet Black", drive: "AWD", fuel: "Gasoline", trans: "9-Speed Automatic", engine: "3.6L V6", hue: 30 },
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
