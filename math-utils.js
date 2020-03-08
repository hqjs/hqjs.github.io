/**
 * Copyright © 2018 hqjs
 */

const rsize = 1013;
const rnd = new Float32Array(rsize);
const a = 1069;
const b = 7368787;
const m = 9925439;
let x = 1;
for (let i = 0; i < rsize; i++) {
  x = (a * x + b) % m;
  rnd[i] = x / m;
}
let cur = 0;

export function getRnd() {
  cur = (cur + 1) % rsize;
  return rnd[cur];
}

export function random(min = 0, max = 1) {
  return min + getRnd() * (max - min);
}

export function randomInt(min = 0, max = 1) {
  return Math.floor(random(min, max + 1));
}
