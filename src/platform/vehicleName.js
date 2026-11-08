/**
 * A vehicle's display name, the same everywhere (the report list and header, the share page, the job pages, the
 * overview): year, make, model, and the trim when the record has one ("2018 Porsche 718 Cayman"). A trim the model
 * already ends with isn't repeated. Takes a report's vehicle or a job's form (a job's form carries its report's trim
 * as `trim` when it has a report). Returns "" when there's nothing to name.
 */
export function vehicleName(v = {}){
  const model = String(v.model || "").trim(), trim = String(v.trim || "").trim();
  const withTrim = trim && !model.toLowerCase().endsWith(trim.toLowerCase()) ? `${model} ${trim}` : model;
  return [v.year, v.make, withTrim].map(x => String(x || "").trim()).filter(Boolean).join(" ");
}
