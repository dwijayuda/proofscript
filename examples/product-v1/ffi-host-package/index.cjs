"use strict";
exports.upper = function upper(value) {
  if (typeof value !== "string") throw new TypeError("upper expects a string");
  return value.toUpperCase();
};
