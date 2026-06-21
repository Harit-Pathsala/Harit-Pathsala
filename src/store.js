// store.js — tiny shared state so features can talk to each other.
// The Calculator writes the latest footprint result here; Ask Bana reads it
// to personalise plans ("your calculator showed transport is your biggest source").
let lastResult = null;

export function setLastResult(r) { lastResult = r; }
export function getLastResult() { return lastResult; }
