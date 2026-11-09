/* The demo's dealer group. Its own module: the platform seed imports it, and the seed also runs on the server
   (api/ask.js), where data.js's icon imports aren't wanted. data.js re-exports it. */
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
