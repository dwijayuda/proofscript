"use strict";

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function parse(text) {
  if (typeof text !== "string") return { ok: false, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: undefined };
  }
}

function objectRoot(text) {
  const parsed = parse(text);
  if (!parsed.ok) return undefined;
  const value = parsed.value;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value;
}

exports.isValid = function isValid(text) {
  return parse(text).ok;
};

exports.isObject = function isObject(text) {
  return objectRoot(text) !== undefined;
};

exports.isArray = function isArray(text) {
  const parsed = parse(text);
  return parsed.ok && Array.isArray(parsed.value);
};

exports.hasStringField = function hasStringField(text, key) {
  if (typeof key !== "string") return false;
  const value = objectRoot(text);
  return value !== undefined && hasOwn(value, key) && typeof value[key] === "string";
};

exports.hasBooleanField = function hasBooleanField(text, key) {
  if (typeof key !== "string") return false;
  const value = objectRoot(text);
  return value !== undefined && hasOwn(value, key) && typeof value[key] === "boolean";
};

exports.hasSafeIntegerField = function hasSafeIntegerField(text, key) {
  if (typeof key !== "string") return false;
  const value = objectRoot(text);
  return value !== undefined && hasOwn(value, key) && Number.isSafeInteger(value[key]);
};

exports.canonicalizeOr = function canonicalizeOr(text, fallback) {
  if (typeof fallback !== "string") throw new TypeError("canonicalizeOr fallback must be a string");
  const parsed = parse(text);
  if (!parsed.ok) return fallback;
  try {
    const encoded = JSON.stringify(parsed.value);
    return typeof encoded === "string" ? encoded : fallback;
  } catch {
    return fallback;
  }
};
