import {promises as fs} from "fs";

export async function open(path, schema) {
  let config;

  try {
    const file = await fs.readFile(path, {encoding: "utf8"});
    config = JSON.parse(file);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  if (config) {
    return validate(config, schema, path + ":");
  } else {
    return validate(config, schema, "[schema]:");
  }
}

export function validate(config, schema, ...keys) {
  const path = [...keys].reverse().join(".");

  switch (schema) {
    case String:
    case Boolean:
    case Number:
      if (config === undefined) {
        throw new Error(`missing configuration setting in ${path}`);
      } else if (typeof config !== schema.name.toLowerCase()) {
        throw new Error(`invalid configuration setting in ${path}`);
      }
      return config;
    default:
      if (Array.isArray(schema) && schema.length === 1) {
        if (!Array.isArray(config)) {
          throw new Error(`invalid configuration setting in ${path}`);
        }

        return config.map(value => validate(value, schema[0], ...keys));
      } else if (typeof schema === "object" && !Array.isArray(schema)) {
        const validated = {};
        const unusedKeys = new Set(Object.keys(config||{}));

        for (const key in schema) {
          const value = validate((config||{})[key], schema[key], key, ...keys);

          if (typeof value === "object" && !Array.isArray(value)) {
            Object.setPrototypeOf(value, validated);
          }

          validated[key] = value;
          unusedKeys.delete(key);
        }

        // TODO: make this error better
        if (unusedKeys.size) {
          const key = unusedKeys.values().next().value;
          throw new Error(`unknown configuration setting ${path}.${key}`);
        }

        return validated;
      } else if (typeof schema === "string") {
        return config === undefined ? schema : validate(config, String, ...keys);
      } else if (typeof schema === "boolean") {
        return config === undefined ? schema : validate(config, Boolean, ...keys);
      } else if (typeof schema === "number") {
        return config === undefined ? schema : validate(config, Number, ...keys);
      } else if (typeof schema === "function") {
        if (schema(config)) return config;
        throw new Error(`invalid configuration setting in ${path}`);
      } else {
        throw new Error(`unknown configuration error in ${path}`);
      }
  }
}
