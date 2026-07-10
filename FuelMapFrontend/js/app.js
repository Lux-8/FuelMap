console.log("app.js загружен");

const API = "https://fuelmap-production.up.railway.app";

let map;
let markers;
let stationMarkers = {};

let stations = [];

let currentStation = null;

let myMarker = null;