/*
 * The 89 real Lemon Squad reports added for the AI demo (tools/report-conversion, photo-picks.json), as completed
 * jobs: REPORT_JOBS rows in seed.js's shape, [report id, who, street, [type, subtype], class, created days ago,
 * inspected days ago, form notes, extras]. Each job takes its report's car, VIN and city. The workspaces follow
 * docs/platform/decisions.md: Meridian Fleet Services (fleet, condition reports), Inspectd Consumers (consumers in
 * the four launch metros), Crestview Denver (dealer, condition reports) and ReBuilt Autos (marketplace shoppers in
 * Salt Lake City, ordered through its embed with the listing's facts). The two repeat-VIN pairs keep the real gap
 * between their visits. Street addresses are invented; the reports give only the city and ZIP.
 */

// where these reports were inspected, beyond the seed's own ZIPs. Centroids from us-zips; the tier is an estimate
// (the nearest seeded ZIP's tier within 60 miles, else tier 2), not from zip_tiers.csv.gz
export const REPORT_ZIPS = { "11561": { "city": "Long Beach", "state": "NY", "lat": 40.590904, "lon": -73.644668, "tier": 1 },
  "21144": { "city": "Severn", "state": "MD", "lat": 39.12057, "lon": -76.677621, "tier": 3 },
  "28214": { "city": "Charlotte", "state": "NC", "lat": 35.272034, "lon": -80.968109, "tier": 2 },
  "30004": { "city": "Milton", "state": "GA", "lat": 34.145635, "lon": -84.291881, "tier": 2 },
  "30033": { "city": "Decatur", "state": "GA", "lat": 33.813689, "lon": -84.284377, "tier": 1 },
  "30040": { "city": "Cumming", "state": "GA", "lat": 34.223434, "lon": -84.17644, "tier": 2 },
  "30043": { "city": "Lawrenceville", "state": "GA", "lat": 34.010038, "lon": -84.005043, "tier": 2 },
  "30087": { "city": "Stone Mountain", "state": "GA", "lat": 33.791402, "lon": -84.098277, "tier": 1 },
  "30114": { "city": "Canton", "state": "GA", "lat": 34.243544, "lon": -84.535815, "tier": 2 },
  "30127": { "city": "Powder Springs", "state": "GA", "lat": 33.875084, "lon": -84.69934, "tier": 2 },
  "30180": { "city": "Villa Rica", "state": "GA", "lat": 33.718878, "lon": -84.918801, "tier": 2 },
  "30263": { "city": "Newnan", "state": "GA", "lat": 33.388415, "lon": -84.858937, "tier": 1 },
  "30269": { "city": "Peachtree City", "state": "GA", "lat": 33.393891, "lon": -84.569301, "tier": 1 },
  "30290": { "city": "Tyrone", "state": "GA", "lat": 33.476407, "lon": -84.589704, "tier": 1 },
  "30294": { "city": "Ellenwood", "state": "GA", "lat": 33.636692, "lon": -84.264986, "tier": 1 },
  "30328": { "city": "Atlanta", "state": "GA", "lat": 33.933259, "lon": -84.386656, "tier": 2 },
  "30342": { "city": "Sandy Springs", "state": "GA", "lat": 33.88435, "lon": -84.374964, "tier": 1 },
  "35907": { "city": "Southside", "state": "AL", "lat": 33.890841, "lon": -86.01802, "tier": 2 },
  "37073": { "city": "Greenbrier", "state": "TN", "lat": 36.432642, "lon": -86.817152, "tier": 1 },
  "37122": { "city": "Mt. Juliet", "state": "TN", "lat": 36.178348, "lon": -86.48658, "tier": 1 },
  "37128": { "city": "Murfreesboro", "state": "TN", "lat": 35.803224, "lon": -86.474647, "tier": 3 },
  "37174": { "city": "Spring Hill", "state": "TN", "lat": 35.719255, "lon": -86.898188, "tier": 4 },
  "37205": { "city": "Nashville", "state": "TN", "lat": 36.113187, "lon": -86.870443, "tier": 1 },
  "37206": { "city": "Nashville", "state": "TN", "lat": 36.179319, "lon": -86.731083, "tier": 1 },
  "37209": { "city": "Nashville", "state": "TN", "lat": 36.150656, "lon": -86.959839, "tier": 1 },
  "37228": { "city": "Nashville", "state": "TN", "lat": 36.19693, "lon": -86.803373, "tier": 1 },
  "43204": { "city": "Columbus", "state": "OH", "lat": 39.960662, "lon": -83.082542, "tier": 2 },
  "45402": { "city": "Dayton", "state": "OH", "lat": 39.760114, "lon": -84.207627, "tier": 2 },
  "48026": { "city": "Fraser", "state": "MI", "lat": 42.537633, "lon": -82.946742, "tier": 1 },
  "50320": { "city": "Des Moines", "state": "IA", "lat": 41.531043, "lon": -93.572356, "tier": 2 },
  "70653": { "city": "Merryville", "state": "LA", "lat": 30.667604, "lon": -93.558664, "tier": 2 },
  "72034": { "city": "Conway", "state": "AR", "lat": 35.053787, "lon": -92.47871, "tier": 2 },
  "75067": { "city": "Lewisville", "state": "TX", "lat": 33.016102, "lon": -96.998962, "tier": 2 },
  "75070": { "city": "McKinney", "state": "TX", "lat": 33.154678, "lon": -96.696669, "tier": 2 },
  "75078": { "city": "Prosper", "state": "TX", "lat": 33.241332, "lon": -96.812388, "tier": 3 },
  "75115": { "city": "Desoto", "state": "TX", "lat": 32.599427, "lon": -96.864075, "tier": 1 },
  "75161": { "city": "Terrell", "state": "TX", "lat": 32.738794, "lon": -96.163857, "tier": 1 },
  "75182": { "city": "Sunnyvale", "state": "TX", "lat": 32.800525, "lon": -96.547577, "tier": 1 },
  "75205": { "city": "Dallas", "state": "TX", "lat": 32.837129, "lon": -96.797155, "tier": 1 },
  "75228": { "city": "Dallas", "state": "TX", "lat": 32.824924, "lon": -96.679438, "tier": 1 },
  "75234": { "city": "Farmers Branch", "state": "TX", "lat": 32.924853, "lon": -96.888139, "tier": 2 },
  "75409": { "city": "Anna", "state": "TX", "lat": 33.3555, "lon": -96.516313, "tier": 3 },
  "76006": { "city": "Arlington", "state": "TX", "lat": 32.787079, "lon": -97.102578, "tier": 2 },
  "76021": { "city": "Bedford", "state": "TX", "lat": 32.852971, "lon": -97.130443, "tier": 2 },
  "76034": { "city": "Colleyville", "state": "TX", "lat": 32.891478, "lon": -97.149747, "tier": 2 },
  "76051": { "city": "Grapevine", "state": "TX", "lat": 32.942026, "lon": -97.07993, "tier": 2 },
  "76118": { "city": "Fort Worth", "state": "TX", "lat": 32.793694, "lon": -97.194034, "tier": 2 },
  "76132": { "city": "Fort Worth", "state": "TX", "lat": 32.668193, "lon": -97.415906, "tier": 2 },
  "76137": { "city": "Fort Worth", "state": "TX", "lat": 32.859685, "lon": -97.291523, "tier": 2 },
  "80005": { "city": "Arvada", "state": "CO", "lat": 39.85165, "lon": -105.131418, "tier": 1 },
  "80015": { "city": "Aurora", "state": "CO", "lat": 39.628055, "lon": -104.793254, "tier": 2 },
  "80018": { "city": "Aurora", "state": "CO", "lat": 39.7019, "lon": -104.686962, "tier": 2 },
  "80022": { "city": "Commerce City", "state": "CO", "lat": 39.861115, "lon": -104.788777, "tier": 2 },
  "80026": { "city": "Lafayette", "state": "CO", "lat": 40.012151, "lon": -105.09991, "tier": 1 },
  "80104": { "city": "Castle Rock", "state": "CO", "lat": 39.302112, "lon": -104.819674, "tier": 2 },
  "80109": { "city": "Castle Rock", "state": "CO", "lat": 39.372344, "lon": -104.912085, "tier": 2 },
  "80112": { "city": "Englewood", "state": "CO", "lat": 39.573236, "lon": -104.86489, "tier": 2 },
  "80129": { "city": "Littleton", "state": "CO", "lat": 39.546879, "lon": -105.011599, "tier": 2 },
  "80130": { "city": "Littleton", "state": "CO", "lat": 39.528342, "lon": -104.923869, "tier": 2 },
  "80214": { "city": "Wheat Ridge", "state": "CO", "lat": 39.743312, "lon": -105.069025, "tier": 1 },
  "80223": { "city": "Denver", "state": "CO", "lat": 39.695794, "lon": -105.003843, "tier": 1 },
  "80236": { "city": "Denver", "state": "CO", "lat": 39.651633, "lon": -105.039699, "tier": 2 },
  "80301": { "city": "Boulder", "state": "CO", "lat": 40.04569, "lon": -105.20089, "tier": 1 },
  "80302": { "city": "Boulder", "state": "CO", "lat": 40.025056, "lon": -105.348664, "tier": 1 },
  "80303": { "city": "Boulder", "state": "CO", "lat": 39.973222, "lon": -105.209276, "tier": 1 },
  "80503": { "city": "Longmont", "state": "CO", "lat": 40.169014, "lon": -105.210376, "tier": 1 },
  "80516": { "city": "Erie", "state": "CO", "lat": 40.052867, "lon": -105.021054, "tier": 1 },
  "81637": { "city": "Gypsum", "state": "CO", "lat": 39.777826, "lon": -107.105814, "tier": 2 },
  "84037": { "city": "Fruit Heights", "state": "UT", "lat": 41.02248, "lon": -111.948762, "tier": 1 },
  "84104": { "city": "Salt Lake City", "state": "UT", "lat": 40.749441, "lon": -111.981537, "tier": 2 },
  "89084": { "city": "North Las Vegas", "state": "NV", "lat": 36.297486, "lon": -115.156932, "tier": 2 },
  "97045": { "city": "Oregon City", "state": "OR", "lat": 45.320278, "lon": -122.536461, "tier": 2 },
  "98802": { "city": "East Wenatchee", "state": "WA", "lat": 47.491932, "lon": -120.16375, "tier": 2 },
  "02301": { "city": "Brockton", "state": "MA", "lat": 42.078371, "lon": -71.042304, "tier": 2 },
  "02155": { "city": "Medford", "state": "MA", "lat": 42.42384, "lon": -71.107673, "tier": 2 },
  "02915": { "city": "Riverside", "state": "RI", "lat": 41.772177, "lon": -71.354407, "tier": 2 },
  "08817": { "city": "Edison", "state": "NJ", "lat": 40.514655, "lon": -74.393104, "tier": 1 } };

// people who ordered these for themselves: consumers, and ReBuilt Autos' shoppers ([name, email, phone])
export const REPORT_PEOPLE = {
  tyson_o: ["Tyson Olsen", "tyson.olsen@pinemail.net", "(801) 555-0185"],
  kaylee_j: ["Kaylee Jensen", "kaylee.jensen@pinemail.net", "(385) 555-0187"],
  spencer_h: ["Spencer Hall", "spencer.hall@pinemail.net", "(801) 555-0189"],
  madison_b: ["Madison Bennion", "madison.bennion@pinemail.net", "(801) 555-0191"],
  laura_j: ["Laura Jennings", "laura.jennings@pinemail.net", "(214) 555-0132"],
  diego_m: ["Diego Morales", "diego.morales@pinemail.net", "(469) 555-0136"],
  chloe_n: ["Chloe Nguyen", "chloe.nguyen@pinemail.net", "(972) 555-0141"],
  brandon_h: ["Brandon Hayes", "brandon.hayes@pinemail.net", "(817) 555-0145"],
  tamika_l: ["Tamika Lewis", "tamika.lewis@pinemail.net", "(214) 555-0150"],
  andre_m: ["Andre Mitchell", "andre.mitchell@pinemail.net", "(404) 555-0110"],
  keisha_b: ["Keisha Brown", "keisha.brown@pinemail.net", "(470) 555-0115"],
  ryan_c: ["Ryan Callahan", "ryan.callahan@pinemail.net", "(678) 555-0120"],
  priya_r: ["Priya Raman", "priya.raman@pinemail.net", "(770) 555-0125"],
  marcus_w: ["Marcus Webb", "marcus.webb@pinemail.net", "(404) 555-0130"],
  owen_f: ["Owen Fischer", "owen.fischer@pinemail.net", "(303) 555-0152"],
  maria_s: ["Maria Sandoval", "maria.sandoval@pinemail.net", "(720) 555-0156"],
  josh_w: ["Josh Whitaker", "josh.whitaker@pinemail.net", "(303) 555-0160"],
  emily_c: ["Emily Carter", "emily.carter@pinemail.net", "(720) 555-0163"],
  sam_p: ["Sam Patel", "sam.patel@pinemail.net", "(303) 555-0166"],
  caleb_t: ["Caleb Turner", "caleb.turner@pinemail.net", "(615) 555-0124"],
  grace_h: ["Grace Holloway", "grace.holloway@pinemail.net", "(629) 555-0128"],
  isaiah_r: ["Isaiah Reed", "isaiah.reed@pinemail.net", "(615) 555-0134"],
  hannah_b: ["Hannah Brooks", "hannah.brooks@pinemail.net", "(615) 555-0138"],
  luke_r: ["Luke Ramsey", "luke.ramsey@pinemail.net", "(629) 555-0142"],
};

export const MORE_REPORT_JOBS = [
  ["20260514-180105-32d7fa", "tasha", "1399 Center St", ["condition", "fleet"], "standard", 181.9, 177.9, ""],   // 2018 Mitsubishi Outlander Sport, Aurora CO · Meridian Fleet Services
  ["20260516-174152-cd91dc", "luis", "4140 Maple Dr", ["condition", "lease-return"], "standard", 178.9, 175.9, ""],   // 2020 Lincoln Continental, Southside AL · Meridian Fleet Services
  ["20260518-202058-627ebe", "luis", "4552 Center St", ["condition", "lease-return"], "standard", 176.8, 173.8, ""],   // 2020 Hyundai Elantra, Newnan GA · Meridian Fleet Services
  ["20260519-151649-f008b0", "dana", "6315 Lakeview Dr", ["condition", "fleet"], "standard", 176, 173, ""],   // 2019 Toyota Camry, Brockton MA · Meridian Fleet Services
  ["20260520-202116-d655e3", "tasha", "7844 Highland Ave", ["condition", "lease-return"], "standard", 173.8, 171.8, ""],   // 2021 Volkswagen Tiguan, Denver CO · Meridian Fleet Services
  ["20260522-223948-9e7004", "tasha", "1080 Industrial Blvd", ["condition", "fleet"], "ev", 172.7, 169.7, ""],   // 2020 Tesla Model 3, Columbus OH · Meridian Fleet Services
  ["20260525-003800-b18fe5", "andre_m", "153 Ridge Rd", ["consumer", "pre-purchase"], "standard", 171.6, 167.6, ""],   // 2019 Dodge Challenger, Newnan GA · Inspectd Consumers
  ["20260527-011714-65ab31", "tom", "3701 Washington Ave", ["condition", "general"], "standard", 168.6, 165.6, ""],   // 2021 Ford F-150, Erie CO · Crestview Denver
  ["20260529-034836-a99ba7", "sam_p", "4863 Airport Rd", ["consumer", "pre-purchase"], "standard", 166.5, 163.5, ""],   // 2013 Audi Q5, Wheat Ridge CO · Inspectd Consumers
  ["20260531-031831-7dd4fe", "luis", "464 Elm St", ["condition", "lease-return"], "standard", 165.5, 161.5, ""],   // 2023 Subaru Ascent, East Wenatchee WA · Meridian Fleet Services
  ["20260602-055317-366cb7", "luis", "2066 Oak Ave", ["condition", "lease-return"], "standard", 163.4, 159.4, ""],   // 2019 Infiniti QX60, McKinney TX · Meridian Fleet Services
  ["20260604-053346-30ac53", "maria_s", "4280 Cedar Ln", ["consumer", "pre-purchase"], "standard", 161.4, 157.4, ""],   // 2016 Honda Civic, Boulder CO · Inspectd Consumers
  ["20260606-075517-aadbdb", "luis", "8327 Lincoln Ave", ["condition", "fleet"], "standard", 159.3, 155.3, ""],   // 2018 Toyota RAV4, Dallas TX · Meridian Fleet Services
  ["20260608-101844-625aa7", "tom", "1126 Sunset Blvd", ["condition", "general"], "standard", 155.2, 153.2, ""],   // 2018 Toyota 4Runner, Littleton CO · Crestview Denver
  ["20260610-102702-df7605", "tasha", "8566 Park Ave", ["condition", "fleet"], "standard", 154.2, 151.2, ""],   // 2021 Ford Expedition, Greenbrier TN · Meridian Fleet Services
  ["20260612-123929-ec2c92", "grace_h", "4006 Washington Ave", ["consumer", "pre-purchase"], "standard", 152.1, 149.1, ""],   // 2016 Chevrolet Colorado, Nashville TN · Inspectd Consumers
  ["20260614-130608-2ad7f9", "luis", "9235 Washington Ave", ["condition", "fleet"], "ev", 151.1, 147.1, ""],   // 2019 Chevrolet Bolt EV, Des Moines IA · Meridian Fleet Services
  ["20260616-150555-e65ab2", "dana", "3923 Elm St", ["condition", "fleet"], "standard", 149, 145, ""],   // 2018 Mazda Mazda 3, Conway AR · Meridian Fleet Services
  ["20260618-174723-155d3a", "owen_f", "2204 Airport Rd", ["consumer", "pre-purchase"], "standard", 145.9, 142.9, ""],   // 2013 Honda CR-V, Denver CO · Inspectd Consumers
  ["20260620-173920-61cc97", "dana", "3759 Lakeview Dr", ["condition", "fleet"], "standard", 144.9, 140.9, ""],   // 2022 Subaru Impreza, Canton GA · Meridian Fleet Services
  ["20260622-200233-374f8f", "keisha_b", "212 Cedar Ln", ["consumer", "pre-purchase"], "standard", 141.8, 138.8, ""],   // 2013 Audi Allroad, Sandy Springs GA · Inspectd Consumers
  ["20260624-202812-3d34ab", "marcus_w", "6314 Commerce Pkwy", ["consumer", "pre-purchase"], "standard", 140.8, 136.8, ""],   // 2014 Dodge Charger, Ellenwood GA · Inspectd Consumers
  ["20260626-223556-601534", "ryan_c", "324 Oak Ave", ["consumer", "pre-purchase"], "standard", 138.7, 134.7, ""],   // 2015 BMW 535i, Cumming GA · Inspectd Consumers
  ["20260629-004533-f52db1", "dana", "8095 Ridge Rd", ["condition", "fleet"], "standard", 134.6, 132.6, ""],   // 2021 Honda Ridgeline, Tyrone GA · Meridian Fleet Services
  ["20260701-010853-23ed8f", "tasha", "7197 Washington Ave", ["condition", "fleet"], "standard", 133.6, 130.6, ""],   // 2020 Mitsubishi Mirage, Charlotte NC · Meridian Fleet Services
  ["20260703-032929-2fddbe", "dana", "7124 Maple Dr", ["condition", "lease-return"], "standard", 130.5, 128.5, ""],   // 2018 Hyundai Kona, Boulder CO · Meridian Fleet Services
  ["20260705-032751-26afc4", "dana", "9788 Sunset Blvd", ["condition", "lease-return"], "standard", 128.5, 126.5, ""],   // 2019 Lexus NX, Dallas TX · Meridian Fleet Services
  ["20260707-053432-b5fdee", "dana", "3324 Main St", ["condition", "lease-return"], "standard", 126.4, 124.4, ""],   // 2018 Buick Envision, Fort Worth TX · Meridian Fleet Services
  ["20260709-060534-5e05b0", "dana", "471 Lakeview Dr", ["condition", "fleet"], "standard", 125.4, 122.4, ""],   // 2018 Hyundai Tucson, Gypsum CO · Meridian Fleet Services
  ["20260711-075453-36760b", "luis", "5396 Sunset Blvd", ["condition", "lease-return"], "standard", 124.3, 120.3, ""],   // 2023 Lexus IS, Atlanta GA · Meridian Fleet Services
  ["20260713-101635-4f6082", "luis", "5644 Park Ave", ["condition", "lease-return"], "standard", 122.2, 118.2, ""],   // 2019 Mercedes-Benz C-Class, Stone Mountain GA · Meridian Fleet Services
  ["20260715-101838-4ec7bf", "luke_r", "7924 River Rd", ["consumer", "pre-purchase"], "standard", 118.2, 116.2, ""],   // 2015 Hyundai Accent, Nashville TN · Inspectd Consumers
  ["20260717-131326-0c2fa6", "tasha", "2441 Airport Rd", ["condition", "fleet"], "standard", 117.1, 114.1, ""],   // 2019 Honda Accord, Prosper TX · Meridian Fleet Services
  ["20260719-124440-50e10d", "luis", "2636 Oak Ave", ["condition", "fleet"], "standard", 115.1, 112.1, ""],   // 2019 Toyota RAV4, Dayton OH · Meridian Fleet Services
  ["20260721-153815-5311cd", "caleb_t", "8775 Commerce Pkwy", ["consumer", "pre-purchase"], "standard", 112, 110, ""],   // 2014 Hyundai Accent, Nashville TN · Inspectd Consumers
  ["20260723-180519-21962c", "dana", "1078 Fleet Way", ["condition", "lease-return"], "standard", 109.9, 107.9, ""],   // 2019 Hyundai Tucson, Riverside RI · Meridian Fleet Services
  ["20260725-174050-c21097", "tasha", "6158 Airport Rd", ["condition", "lease-return"], "standard", 109.9, 105.9, ""],   // 2021 Kia Telluride, Commerce City CO · Meridian Fleet Services
  ["20260727-194848-565f02", "tasha", "8884 Lakeview Dr", ["condition", "lease-return"], "standard", 105.8, 103.8, ""],   // 2019 Infiniti QX60, Long Beach NY · Meridian Fleet Services
  ["20260729-200606-53e297", "luis", "2931 Washington Ave", ["condition", "fleet"], "standard", 104.8, 101.8, ""],   // 2018 Buick Encore, Castle Rock CO · Meridian Fleet Services
  ["20260731-224749-9f751a", "kaylee_j", "5286 Maple Dr", ["consumer", "pre-purchase"], "standard", 101.7, 99.7, "Rebuilt title. I'd like to know how well the repairs were done before I buy.", {partner: "rebuilt-autos", listing: {id:"RB-57586",mileage:92207,lot:["Valley Rebuilt Motors","Shauna Petersen","(385) 555-0112"],damage:[{date:"2021-04-12",type:"collision",areas:["right_side","right_rear"],severity:"moderate",airbags_deployed:false,odometer_at_damage:74207,notes:"Right doors and quarter panel repaired and refinished."}]}}],   // 2008 BMW 3 Series, Salt Lake City UT · ReBuilt Autos
  ["20260803-005056-4cd32f", "isaiah_r", "4289 Lakeview Dr", ["consumer", "pre-purchase"], "standard", 100.6, 97.6, ""],   // 2017 Toyota Prius, Murfreesboro TN · Inspectd Consumers
  ["20260805-010758-eaf76c", "tasha", "1092 Pine St", ["condition", "fleet"], "standard", 97.6, 95.6, ""],   // 2018 Mitsubishi Outlander, Villa Rica GA · Meridian Fleet Services
  ["20260807-033750-992b1b", "dana", "6058 Fleet Way", ["condition", "lease-return"], "standard", 96.5, 93.5, ""],   // 2018 Chevrolet Silverado 1500, Mt. Juliet TN · Meridian Fleet Services
  ["20260809-033202-cad6c5", "tom", "941 Washington Ave", ["condition", "general"], "standard", 94.5, 91.5, ""],   // 2021 Chevrolet Silverado 1500, North Las Vegas NV · Crestview Denver
  ["20260811-052846-8dca87", "tasha", "5010 Sunset Blvd", ["condition", "lease-return"], "standard", 91.4, 89.4, ""],   // 2019 Lexus UX 250h, Lawrenceville GA · Meridian Fleet Services
  ["20260813-055228-eaa4a5", "dana", "6837 Fleet Way", ["condition", "lease-return"], "standard", 89.4, 87.4, ""],   // 2023 Toyota Sienna, Alpharetta GA · Meridian Fleet Services
  ["20260815-081115-6d94f4", "tasha", "1483 Park Ave", ["condition", "lease-return"], "standard", 88.3, 85.3, ""],   // 2018 Chrysler Pacifica, Cumming GA · Meridian Fleet Services
  ["20260817-104111-f1b62b", "tyson_o", "6251 Ridge Rd", ["consumer", "pre-purchase"], "standard", 86.2, 83.2, "Rebuilt title. I'd like to know how well the repairs were done before I buy.", {partner: "rebuilt-autos", listing: {id:"RB-51151",mileage:97727,lot:["Wasatch Front Auto","Brent Larsen","(801) 555-0107"],damage:[{date:"2020-03-11",type:"collision",areas:["front_end"],severity:"moderate",airbags_deployed:false,odometer_at_damage:82727,notes:"Front bumper, hood and radiator support replaced; state rebuilt inspection passed."}]}}],   // 2018 Kia Optima, Fruit Heights UT · ReBuilt Autos
  ["20260819-105017-cd5323", "josh_w", "5302 Sunset Blvd", ["consumer", "pre-purchase"], "standard", 84.2, 81.2, ""],   // 2014 BMW 5 Series, Englewood CO · Inspectd Consumers
  ["20260821-123613-515f31", "luis", "4839 Sunset Blvd", ["condition", "fleet"], "standard", 83.1, 79.1, ""],   // 2020 Ram 1500, Sunnyvale TX · Meridian Fleet Services
  ["20260823-124339-d4966f", "tom", "175 Elm St", ["condition", "general"], "standard", 81.1, 77.1, ""],   // 2023 Ford Bronco Sport, Aurora CO · Crestview Denver
  ["20260825-152927-4325fa", "tasha", "1516 Industrial Blvd", ["condition", "fleet"], "standard", 77, 75, ""],   // 2019 Dodge Grand Caravan, Terrell TX · Meridian Fleet Services
  ["20260827-174648-439c24", "laura_j", "8849 Elm St", ["consumer", "pre-purchase"], "standard", 74.9, 72.9, ""],   // 2017 Toyota Tacoma, Anna TX · Inspectd Consumers
  ["20260829-174702-2ea2a1", "dana", "2862 Market St", ["condition", "fleet"], "standard", 74.9, 70.9, ""],   // 2022 Kia Soul, Arlington TX · Meridian Fleet Services
  ["20260831-195146-8cf274", "tasha", "665 Oak Ave", ["condition", "lease-return"], "ev", 71.8, 68.8, ""],   // 2022 Rivian R1T, Colleyville TX · Meridian Fleet Services
  ["20260902-202500-b3d61c", "madison_b", "7024 Lincoln Ave", ["consumer", "pre-purchase"], "ev", 70.8, 66.8, "Rebuilt title. I'd like to know how well the repairs were done before I buy.", {partner: "rebuilt-autos", listing: {id:"RB-58524",mileage:59928,lot:["Davis County Cars","Janae Wright","(801) 555-0119"],damage:[{date:"2023-06-14",type:"collision",areas:["rear"],severity:"moderate",airbags_deployed:false,odometer_at_damage:35928,notes:"Rear bumper, trunk lid and taillamps replaced."}]}}],   // 2012 Nissan LEAF, Midvale UT · ReBuilt Autos
  ["20260904-222647-c0fdda", "luis", "6640 Maple Dr", ["condition", "lease-return"], "standard", 66.7, 64.7, ""],   // 2019 Nissan Murano, Bedford TX · Meridian Fleet Services
  ["20260907-004509-29309d", "tasha", "4613 Pine St", ["condition", "fleet"], "standard", 64.6, 62.6, ""],   // 2021 GMC Sierra 1500, Merryville LA · Meridian Fleet Services
  ["20260909-004302-253dd4", "tasha", "5957 Fleet Way", ["condition", "lease-return"], "standard", 62.6, 60.6, ""],   // 2021 Ford Bronco, Peachtree City GA · Meridian Fleet Services
  ["20260911-034754-aa5537", "tasha", "9381 Lincoln Ave", ["condition", "lease-return"], "standard", 60.5, 58.5, ""],   // 2019 Ford Ranger, Oregon City OR · Meridian Fleet Services
  ["20260913-033841-63f801", "dana", "5250 Elm St", ["condition", "fleet"], "standard", 58.5, 56.5, ""],   // 2018 Dodge Durango, Powder Springs GA · Meridian Fleet Services
  ["20260915-060929-8683b4", "dana", "1721 Fleet Way", ["condition", "fleet"], "standard", 56.4, 54.4, ""],   // 2018 Dodge Ram 1500, Nashville TN · Meridian Fleet Services
  ["20260917-061202-fc17e1", "tasha", "2705 Highland Ave", ["condition", "lease-return"], "standard", 55.4, 52.4, ""],   // 2019 Ford Ranger, Lewisville TX · Meridian Fleet Services
  ["20260919-080620-06b789", "luis", "5539 Commerce Pkwy", ["condition", "lease-return"], "standard", 52.3, 50.3, ""],   // 2020 Volkswagen Passat, Nashville TN · Meridian Fleet Services
  ["20260921-110054-72c85d", "emily_c", "5290 Market St", ["consumer", "pre-purchase"], "standard", 52.2, 48.2, ""],   // 2011 Hyundai Santa Fe, Lafayette CO · Inspectd Consumers
  ["20260922-154057-1cd4d8", "luis", "6177 Pine St", ["condition", "fleet"], "standard", 51, 47, ""],   // 2018 Subaru Outback, Severn MD · Meridian Fleet Services
  ["20260923-104718-b4e671", "diego_m", "6250 Main St", ["consumer", "pre-purchase"], "standard", 49.2, 46.2, ""],   // 2014 Subaru Forester, Grapevine TX · Inspectd Consumers
  ["20260925-132536-f0ec0b", "tamika_l", "9873 Park Ave", ["consumer", "pre-purchase"], "standard", 46.1, 44.1, ""],   // 2018 Ford F-150, Desoto TX · Inspectd Consumers
  ["20260927-130141-79f355", "luis", "1697 Ridge Rd", ["condition", "fleet"], "standard", 44.1, 42.1, ""],   // 2020 Mercedes-Benz Sprinter Passenger Van, Milton GA · Meridian Fleet Services
  ["20260929-152549-e08591", "dana", "2832 Airport Rd", ["condition", "fleet"], "standard", 43, 40, ""],   // 2018 Chevrolet Volt, Medford MA · Meridian Fleet Services
  ["20261001-174156-719cf4", "hannah_b", "5265 Center St", ["consumer", "pre-purchase"], "standard", 40.9, 37.9, ""],   // 2016 Chevrolet Sonic, Spring Hill TN · Inspectd Consumers
  ["20261003-172929-eb5e4e", "dana", "3438 Cedar Ln", ["condition", "fleet"], "standard", 39.9, 35.9, ""],   // 2021 Subaru Outback, Boulder CO · Meridian Fleet Services
  ["20261005-195319-8a79ee", "priya_r", "9003 Lincoln Ave", ["consumer", "pre-purchase"], "standard", 35.8, 33.8, ""],   // 2015 Acura MDX, Cumming GA · Inspectd Consumers
  ["20261007-202541-f52ee2", "dana", "7263 Pine St", ["condition", "lease-return"], "standard", 34.8, 31.8, ""],   // 2019 Subaru Ascent, Grapevine TX · Meridian Fleet Services
  ["20261009-222705-080dd5", "spencer_h", "5554 Cedar Ln", ["consumer", "pre-purchase"], "standard", 33.7, 29.7, "Rebuilt title. I'd like to know how well the repairs were done before I buy.", {partner: "rebuilt-autos", listing: {id:"RB-57854",mileage:97375,lot:["Midvale Auto Exchange","Rick Ostler","(801) 555-0116"],damage:[{date:"2022-05-13",type:"hail",areas:["roof","hood","trunk"],severity:"minor",airbags_deployed:false,odometer_at_damage:76375,notes:"Paintless dent repair across the top surfaces."}]}}],   // 2012 Chevrolet Cruze, Salt Lake City UT · ReBuilt Autos
  ["20261012-012503-33093e", "luis", "421 Lakeview Dr", ["condition", "lease-return"], "standard", 31.6, 27.6, ""],   // 2022 Volkswagen Tiguan, Arvada CO · Meridian Fleet Services
  ["20261014-005119-19d283", "tom", "1074 Fleet Way", ["condition", "general"], "standard", 29.6, 25.6, ""],   // 2020 GMC Sierra 3500HD, Longmont CO · Crestview Denver
  ["20261016-030940-d0665b", "dana", "3467 Maple Dr", ["condition", "fleet"], "ev", 26.5, 23.5, ""],   // 2021 Ford Mustang Mach-E, Fraser MI · Meridian Fleet Services
  ["20261018-030700-59e62e", "luis", "2520 River Rd", ["condition", "lease-return"], "standard", 25.5, 21.5, ""],   // 2019 Mazda CX-5, Littleton CO · Meridian Fleet Services
  ["20261020-061058-ce4075", "dana", "6574 Park Ave", ["condition", "fleet"], "standard", 23.4, 19.4, ""],   // 2019 Nissan Sentra, Fort Worth TX · Meridian Fleet Services
  ["20261021-153952-622a14", "luis", "1365 River Rd", ["condition", "lease-return"], "standard", 20, 18, "Re-inspection of a unit we inspected before, ahead of remarketing."],   // 2019 Toyota Camry, Brockton MA · Meridian Fleet Services
  ["20261022-060610-ab7129", "tasha", "8295 Airport Rd", ["condition", "fleet"], "standard", 21.4, 17.4, ""],   // 2020 Mazda CX-30, Decatur GA · Meridian Fleet Services
  ["20261024-083129-ab674d", "luis", "2365 Market St", ["condition", "fleet"], "standard", 19.3, 15.3, ""],   // 2021 Kia Forte, Dallas TX · Meridian Fleet Services
  ["20261026-104538-d65921", "dana", "5227 River Rd", ["condition", "fleet"], "standard", 17.2, 13.2, ""],   // 2019 Honda HR-V, Castle Rock CO · Meridian Fleet Services
  ["20261028-104949-e0a47e", "luis", "4788 Highland Ave", ["condition", "lease-return"], "standard", 14.2, 11.2, ""],   // 2019 Honda Civic Sedan, Edison NJ · Meridian Fleet Services
  ["20261028-152914-cbf026", "tasha", "3491 Park Ave", ["condition", "fleet"], "standard", 14, 11, "Re-inspection of a unit we inspected before, ahead of remarketing."],   // 2018 Subaru Outback, Severn MD · Meridian Fleet Services
  ["20261030-125557-2c319e", "chloe_n", "7309 Highland Ave", ["consumer", "pre-purchase"], "standard", 13.1, 9.1, ""],   // 2008 Mazda MX-5, Farmers Branch TX · Inspectd Consumers
  ["20261101-131637-4d1750", "tasha", "3924 Highland Ave", ["condition", "lease-return"], "standard", 11.1, 7.1, ""],   // 2020 Cadillac XT5, Fort Worth TX · Meridian Fleet Services
  ["20261103-153723-93d5fd", "brandon_h", "2748 Airport Rd", ["consumer", "pre-purchase"], "exotic", 8, 5, ""],   // 2010 Chevrolet Corvette, McKinney TX · Inspectd Consumers
];
