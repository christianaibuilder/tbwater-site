/* TB Water — Tampa Bay tap water quality data
   Source: EWG Tap Water Database (ewg.org/tapwater), utility testing data
   2021–2023 as published by EWG. Scraped from EWG report pages 2026-07-23;
   each utility links to its live EWG report for the authoritative version.
   DO NOT edit numbers by hand — refresh from EWG instead. */
window.TB_WATER_DATA = {
  source: {
    label: "EWG Tap Water Database",
    period: "Utility water testing data from 2021–2023 — the latest published in EWG's Tap Water Database, compiled from Florida DEP and U.S. EPA records.",
    compliance: "For the latest quarter assessed by the U.S. EPA (April 2024 – June 2024), tap water provided by this utility was in compliance with federal health-based drinking water standards. Legal doesn’t always mean ideal — the levels below are compared against EWG’s stricter health guidelines."
  },
  utilities: {
    pinellas: {
      name: "Pinellas County Utilities", pws: "FL6521405", pop: "506,353",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "0.400 ppb", legal: "10 ppb", times: "100", guideline: "0.004 ppb" },
        { name: "Chlorate", effect: "Harm to the thyroid", level: "542.5 ppb", legal: null, times: "2.6", guideline: "210 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0713 ppb", legal: null, times: "3.6", guideline: "0.02 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "25.9 ppb", legal: "60 ppb", times: "259", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "29.1 ppb", legal: null, times: "486", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "1.70 pCi/L", legal: "5 pCi/L", times: "34", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "41.6 ppb", legal: "80 ppb", times: "277", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "17.9 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "13.8 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chromium (total)", level: "2.43 ppb", legal: "100 ppb", guideline: null },
        { name: "Fluoride", level: "0.683 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "2.85 ppb", legal: null, guideline: "100 ppb" },
        { name: "Mercury (inorganic)", level: "0.0333 ppb", legal: "2 ppb", guideline: "1.2 ppb" },
        { name: "Nitrate", level: "0.103 ppm", legal: "10 ppm", guideline: "0.14 ppm" },
        { name: "Strontium", level: "0.348 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.15 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "0.484 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    tampa: {
      name: "City of Tampa Water Department", pws: "FL6290327", pop: "717,000",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "0.1000 ppb", legal: "10 ppb", times: "25", guideline: "0.004 ppb" },
        { name: "Bromate", effect: "Cancer", level: "2.54 ppb", legal: "10 ppb", times: "25", guideline: "0.1 ppb" },
        { name: "Bromodichloromethane", effect: "Cancer", level: "4.66 ppb", legal: null, times: "78", guideline: "0.06 ppb" },
        { name: "Chloroform", effect: "Cancer", level: "6.66 ppb", legal: null, times: "17", guideline: "0.4 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0769 ppb", legal: null, times: "3.8", guideline: "0.02 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "1.89 ppb", legal: null, times: "63", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "2.47 ppb", legal: null, times: "25", guideline: "0.1 ppb" },
        { name: "Dichloroacetic acid", effect: "Cancer", level: "7.71 ppb", legal: null, times: "39", guideline: "0.2 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "14.5 ppb", legal: "60 ppb", times: "145", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "15.3 ppb", legal: null, times: "254", guideline: "0.06 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "0.347 ppm", legal: "10 ppm", times: "2.5", guideline: "0.14 ppm" },
        { name: "PFHxS (a “forever chemical”)", effect: "Harm to immune & hormone systems", level: "1.69 ppt", legal: null, times: "1,686", guideline: "0.001 ppt" },
        { name: "PFOS (a “forever chemical”)", effect: "Harm to immune system", level: "3.87 ppt", legal: null, times: "13", guideline: "0.3 ppt" },
        { name: "PFOA (a “forever chemical”)", effect: "Cancer", level: "1.29 ppt", legal: null, times: "14", guideline: "0.09 ppt" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.30 pCi/L", legal: "5 pCi/L", times: "6", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "14.5 ppb", legal: "80 ppb", times: "97", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "1.85 ppb", legal: null, times: "18", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "Barium", level: "13.0 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Bromoform", level: "0.774 ppb", legal: null, guideline: "0.5 ppb" },
        { name: "Fluoride", level: "0.693 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "0.397 ppb", legal: null, guideline: "100 ppb" },
        { name: "Monobromoacetic acid", level: "1.86 ppb", legal: null, guideline: "25 ppb" },
        { name: "Monochloroacetic acid", level: "1.14 ppb", legal: null, guideline: "53 ppb" },
        { name: "PFBS (forever chemical)", level: "4.61 ppt", legal: null, guideline: "2,000 ppt" },
        { name: "PFBA (forever chemical)", level: "3.47 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHpA (forever chemical)", level: "0.557 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHxA (forever chemical)", level: "5.03 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFPeA (forever chemical)", level: "6.94 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "0.205 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.46 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "0.0581 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    stpete: {
      name: "City of St. Petersburg", pws: "FL6521715", pop: "349,979",
      exceed: [
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0839 ppb", legal: null, times: "4.2", guideline: "0.02 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "20.4 ppb", legal: "60 ppb", times: "204", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "22.5 ppb", legal: null, times: "375", guideline: "0.06 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "0.444 ppm", legal: "10 ppm", times: "3.2", guideline: "0.14 ppm" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "20.7 ppb", legal: "80 ppb", times: "138", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "24.2 ppb", legal: null, times: "242", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "29.0 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "90.0 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "190.0 ppb", legal: null, guideline: "210 ppb" },
        { name: "Fluoride", level: "0.620 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "1.05 ppb", legal: null, guideline: "100 ppb" },
        { name: "Nitrite", level: "0.0550 ppm", legal: "1 ppm", guideline: null },
        { name: "PFPeA (forever chemical)", level: "0.775 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "0.287 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "0.479 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    hillssc: {
      name: "Hillsborough County (South-Central)", pws: "FL6290787", pop: "473,500",
      exceed: [
        { name: "Bromate", effect: "Cancer", level: "2.32 ppb", legal: "10 ppb", times: "23", guideline: "0.1 ppb" },
        { name: "Bromodichloromethane", effect: "Cancer", level: "3.62 ppb", legal: null, times: "60", guideline: "0.06 ppb" },
        { name: "Bromoform", effect: "Cancer", level: "1.48 ppb", legal: null, times: "3", guideline: "0.5 ppb" },
        { name: "Chloroform", effect: "Cancer", level: "3.57 ppb", legal: null, times: "8.9", guideline: "0.4 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0876 ppb", legal: null, times: "4.4", guideline: "0.02 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "1.72 ppb", legal: null, times: "57", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "3.00 ppb", legal: null, times: "30", guideline: "0.1 ppb" },
        { name: "Dichloroacetic acid", effect: "Cancer", level: "2.45 ppb", legal: null, times: "12", guideline: "0.2 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "6.05 ppb", legal: "60 ppb", times: "61", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "8.10 ppb", legal: null, times: "135", guideline: "0.06 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "0.296 ppm", legal: "10 ppm", times: "2.1", guideline: "0.14 ppm" },
        { name: "PFOS (a “forever chemical”)", effect: "Harm to immune system", level: "2.28 ppt", legal: null, times: "7.6", guideline: "0.3 ppt" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.41 pCi/L", legal: "5 pCi/L", times: "8.2", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "11.6 ppb", legal: "80 ppb", times: "78", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "0.764 ppb", legal: null, times: "7.6", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "1,4-Dioxane", level: "0.0163 ppb", legal: null, guideline: "0.35 ppb" },
        { name: "Barium", level: "19.7 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "213.3 ppb", legal: null, guideline: "210 ppb" },
        { name: "Fluoride", level: "0.626 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "0.492 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "3.56 ppb", legal: null, guideline: "40 ppb" },
        { name: "Monobromoacetic acid", level: "0.771 ppb", legal: null, guideline: "25 ppb" },
        { name: "Monochloroacetic acid", level: "0.368 ppb", legal: null, guideline: "53 ppb" },
        { name: "PFBS (forever chemical)", level: "2.19 ppt", legal: null, guideline: "2,000 ppt" },
        { name: "PFBA (forever chemical)", level: "2.36 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHpA (forever chemical)", level: "0.600 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHxA (forever chemical)", level: "3.96 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFPeA (forever chemical)", level: "5.65 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "1.09 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "0.478 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    hillsnw: {
      name: "Hillsborough County (Northwest)", pws: "FL6290388", pop: "206,485",
      exceed: [
        { name: "Bromodichloromethane", effect: "Cancer", level: "3.83 ppb", legal: null, times: "64", guideline: "0.06 ppb" },
        { name: "Chloroform", effect: "Cancer", level: "26.2 ppb", legal: null, times: "66", guideline: "0.4 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0690 ppb", legal: null, times: "3.5", guideline: "0.02 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "1.04 ppb", legal: null, times: "35", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "1.18 ppb", legal: null, times: "12", guideline: "0.1 ppb" },
        { name: "Dichloroacetic acid", effect: "Cancer", level: "9.65 ppb", legal: null, times: "48", guideline: "0.2 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "22.1 ppb", legal: "60 ppb", times: "221", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "18.4 ppb", legal: null, times: "307", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.87 pCi/L", legal: "5 pCi/L", times: "17", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "31.9 ppb", legal: "80 ppb", times: "213", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "9.14 ppb", legal: null, times: "91", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "Barium", level: "14.7 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Bromoform", level: "0.577 ppb", legal: null, guideline: "0.5 ppb" },
        { name: "Chlorate", level: "253.8 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chloromethane", level: "0.183 ppb", legal: null, guideline: "2.69 ppb" },
        { name: "Fluoride", level: "0.649 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "1.98 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "0.0875 ppb", legal: null, guideline: "40 ppb" },
        { name: "Monobromoacetic acid", level: "1.06 ppb", legal: null, guideline: "25 ppb" },
        { name: "Monochloroacetic acid", level: "2.09 ppb", legal: null, guideline: "53 ppb" },
        { name: "Nitrate", level: "0.0973 ppm", legal: "10 ppm", guideline: "0.14 ppm" },
        { name: "Nitrite", level: "0.00550 ppm", legal: "1 ppm", guideline: null },
        { name: "PFHxA (forever chemical)", level: "0.375 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFPeA (forever chemical)", level: "0.938 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "0.305 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "0.312 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    pasco: {
      name: "Pasco County Regional (PCUD)", pws: "FL6511361", pop: "214,403",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "0.400 ppb", legal: "10 ppb", times: "100", guideline: "0.004 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.108 ppb", legal: null, times: "5.4", guideline: "0.02 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "0.890 ppb", legal: null, times: "30", guideline: "0.03 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "9.96 ppb", legal: "60 ppb", times: "100", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "10.9 ppb", legal: null, times: "181", guideline: "0.06 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "0.303 ppm", legal: "10 ppm", times: "2.2", guideline: "0.14 ppm" },
        { name: "PFOS (a “forever chemical”)", effect: "Harm to immune system", level: "1.24 ppt", legal: null, times: "4.1", guideline: "0.3 ppt" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.78 pCi/L", legal: "5 pCi/L", times: "16", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "17.6 ppb", legal: "80 ppb", times: "117", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "1,4-Dioxane", level: "0.00387 ppb", legal: null, guideline: "0.35 ppb" },
        { name: "Aluminum", level: "2.17 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "11.7 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Bromoform", level: "0.330 ppb", legal: null, guideline: "0.5 ppb" },
        { name: "Chlorate", level: "320.7 ppb", legal: null, guideline: "210 ppb" },
        { name: "Fluoride", level: "0.158 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "8.33 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "1.13 ppb", legal: null, guideline: "40 ppb" },
        { name: "Nitrite", level: "0.00229 ppm", legal: "1 ppm", guideline: null },
        { name: "PFBS (forever chemical)", level: "1.54 ppt", legal: null, guideline: "2,000 ppt" },
        { name: "PFBA (forever chemical)", level: "0.553 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHpA (forever chemical)", level: "0.222 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHxA (forever chemical)", level: "1.53 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFPeA (forever chemical)", level: "2.25 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "0.306 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.33 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "0.743 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    clearwater: {
      name: "Clearwater Water System", pws: "FL6520336", pop: "115,000",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "3.01 ppb", legal: "10 ppb", times: "753", guideline: "0.004 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0525 ppb", legal: null, times: "2.6", guideline: "0.02 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "24.1 ppb", legal: "60 ppb", times: "241", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "33.4 ppb", legal: null, times: "556", guideline: "0.06 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "0.282 ppm", legal: "10 ppm", times: "2", guideline: "0.14 ppm" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "1.04 pCi/L", legal: "5 pCi/L", times: "21", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "51.5 ppb", legal: "80 ppb", times: "344", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "2.40 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "12.1 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Benzo[a]pyrene", level: "0.00373 ppb", legal: "0.2 ppb", guideline: "0.007 ppb" },
        { name: "Chlorate", level: "281.2 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chromium (total)", level: "2.43 ppb", legal: "100 ppb", guideline: null },
        { name: "Di(2-ethylhexyl) phthalate", level: "0.168 ppb", legal: "6 ppb", guideline: "3 ppb" },
        { name: "Fluoride", level: "0.556 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "4.98 ppb", legal: null, guideline: "100 ppb" },
        { name: "Mercury (inorganic)", level: "0.0333 ppb", legal: "2 ppb", guideline: "1.2 ppb" },
        { name: "Molybdenum", level: "1.18 ppb", legal: null, guideline: "40 ppb" },
        { name: "Nitrite", level: "0.0637 ppm", legal: "1 ppm", guideline: null },
        { name: "PFPeA (forever chemical)", level: "3.23 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "0.304 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.01 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "0.208 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    tarpon: {
      name: "Tarpon Springs Water System", pws: "FL6521784", pop: "28,875",
      exceed: [
        { name: "PFHxS (a “forever chemical”)", effect: "Harm to immune & hormone systems", level: "5.20 ppt", legal: "10 ppt", times: "5,200", guideline: "0.001 ppt" },
        { name: "PFOS (a “forever chemical”)", effect: "Harm to immune system", level: "23.4 ppt", legal: null, times: "78", guideline: "0.3 ppt" },
        { name: "PFOA (a “forever chemical”)", effect: "Cancer", level: "6.50 ppt", legal: null, times: "72", guideline: "0.09 ppt" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "10.3 ppb", legal: "60 ppb", times: "103", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "11.3 ppb", legal: null, times: "188", guideline: "0.06 ppb" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "25.8 ppb", legal: "80 ppb", times: "172", guideline: "0.15 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "1.80 pCi/L", legal: "5 pCi/L", times: "36", guideline: "0.05 pCi/L" },
        { name: "Dibromoacetic acid", effect: "", level: "1.55 ppb", legal: null, times: "52", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "3.60 ppb", legal: null, times: "36", guideline: "0.1 ppb" },
        { name: "Bromodichloromethane", effect: "Cancer", level: "0.988 ppb", legal: null, times: "16", guideline: "0.06 ppb" },
        { name: "Bromoform", effect: "Cancer", level: "6.30 ppb", legal: null, times: "13", guideline: "0.5 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.166 ppb", legal: null, times: "8.3", guideline: "0.02 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "0.856 ppm", legal: "10 ppm", times: "6.1", guideline: "0.14 ppm" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "1.11 ppb", legal: null, times: "11", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "1,4-Dioxane", level: "0.0355 ppb", legal: null, guideline: "0.35 ppb" },
        { name: "Barium", level: "8.00 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "230.5 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chloroform", level: "0.106 ppb", legal: null, guideline: "0.4 ppb" },
        { name: "Chromium (total)", level: "0.550 ppb", legal: "100 ppb", guideline: null },
        { name: "Dichloroacetic acid", level: "0.355 ppb", legal: null, guideline: "0.2 ppb" },
        { name: "Fluoride", level: "0.622 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "1.02 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "2.52 ppb", legal: null, guideline: "40 ppb" },
        { name: "PFBS (forever chemical)", level: "6.55 ppt", legal: null, guideline: "2,000 ppt" },
        { name: "PFBA (forever chemical)", level: "5.82 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHpA (forever chemical)", level: "2.47 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHxA (forever chemical)", level: "3.67 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFPeA (forever chemical)", level: "5.03 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Selenium", level: "1.000 ppb", legal: "50 ppb", guideline: "30 ppb" },
        { name: "Strontium", level: "0.293 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.84 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "4.31 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    npr: {
      name: "New Port Richey Water Department", pws: "FL6511255", pop: "33,000",
      exceed: [
        { name: "Bromate", effect: "Cancer", level: "1.14 ppb", legal: "10 ppb", times: "11", guideline: "0.1 ppb" },
        { name: "Bromodichloromethane", effect: "Cancer", level: "3.05 ppb", legal: null, times: "51", guideline: "0.06 ppb" },
        { name: "Cadmium", effect: "Harm to the kidney", level: "0.150 ppb", legal: "5 ppb", times: "3.8", guideline: "0.04 ppb" },
        { name: "Chloroform", effect: "Cancer", level: "37.6 ppb", legal: null, times: "94", guideline: "0.4 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "1.93 ppb", legal: null, times: "64", guideline: "0.03 ppb" },
        { name: "Dichloroacetic acid", effect: "Cancer", level: "10.5 ppb", legal: null, times: "52", guideline: "0.2 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "25.1 ppb", legal: "60 ppb", times: "251", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "22.9 ppb", legal: null, times: "382", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "1.70 pCi/L", legal: "5 pCi/L", times: "34", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "36.0 ppb", legal: "80 ppb", times: "240", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "7.40 ppb", legal: null, times: "74", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "17.0 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "18.0 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Bromoform", level: "0.0563 ppb", legal: null, guideline: "0.5 ppb" },
        { name: "Chlorate", level: "392.3 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chlorite", level: "3.63 ppb", legal: "1,000 ppb", guideline: "50 ppb" },
        { name: "Chromium (hexavalent)", level: "0.00800 ppb", legal: null, guideline: "0.02 ppb" },
        { name: "Chromium (total)", level: "1.000 ppb", legal: "100 ppb", guideline: null },
        { name: "Fluoride", level: "0.657 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "4.93 ppb", legal: null, guideline: "100 ppb" },
        { name: "Mercury (inorganic)", level: "0.800 ppb", legal: "2 ppb", guideline: "1.2 ppb" },
        { name: "Monobromoacetic acid", level: "0.639 ppb", legal: null, guideline: "25 ppb" },
        { name: "Monochloroacetic acid", level: "1.21 ppb", legal: null, guideline: "53 ppb" },
        { name: "Nitrate", level: "0.0414 ppm", legal: "10 ppm", guideline: "0.14 ppm" },
        { name: "Selenium", level: "1.83 ppb", legal: "50 ppb", guideline: "30 ppb" },
        { name: "Strontium", level: "0.387 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.25 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "0.300 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    dunedin: {
      name: "Dunedin Water System", pws: "FL6520486", pop: "46,161",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "1.37 ppb", legal: "10 ppb", times: "342", guideline: "0.004 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "9.27 ppb", legal: "60 ppb", times: "93", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "22.2 ppb", legal: null, times: "370", guideline: "0.06 ppb" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "45.0 ppb", legal: "80 ppb", times: "300", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "Barium", level: "7.93 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "184.0 ppb", legal: null, guideline: "210 ppb" },
        { name: "Fluoride", level: "0.618 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "1.44 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "0.825 ppb", legal: null, guideline: "40 ppb" },
        { name: "Strontium", level: "0.0966 ppb", legal: null, guideline: "1,500 ppb" }
      ]
    },
    pinellaspark: {
      name: "Pinellas Park Water Department", pws: "FL6521406", pop: "48,939",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "0.400 ppb", legal: "10 ppb", times: "100", guideline: "0.004 ppb" },
        { name: "Bromodichloromethane", effect: "Cancer", level: "5.20 ppb", legal: null, times: "87", guideline: "0.06 ppb" },
        { name: "Chlorate", effect: "Harm to the thyroid", level: "446.3 ppb", legal: null, times: "2.1", guideline: "210 ppb" },
        { name: "Chloroform", effect: "Cancer", level: "22.8 ppb", legal: null, times: "57", guideline: "0.4 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0580 ppb", legal: null, times: "2.9", guideline: "0.02 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "1.14 ppb", legal: null, times: "38", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "2.73 ppb", legal: null, times: "27", guideline: "0.1 ppb" },
        { name: "Dichloroacetic acid", effect: "Cancer", level: "9.93 ppb", legal: null, times: "50", guideline: "0.2 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "22.1 ppb", legal: "60 ppb", times: "221", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "27.2 ppb", legal: null, times: "453", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "1.70 pCi/L", legal: "5 pCi/L", times: "34", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "36.9 ppb", legal: "80 ppb", times: "246", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "6.00 ppb", legal: null, times: "60", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "17.9 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "13.8 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Bromochloromethane", level: "0.0275 ppb", legal: null, guideline: "0.06 ppb" },
        { name: "Bromoform", level: "0.260 ppb", legal: null, guideline: "0.5 ppb" },
        { name: "Chromium (total)", level: "2.43 ppb", legal: "100 ppb", guideline: null },
        { name: "Fluoride", level: "0.683 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "3.10 ppb", legal: null, guideline: "100 ppb" },
        { name: "Mercury (inorganic)", level: "0.0333 ppb", legal: "2 ppb", guideline: "1.2 ppb" },
        { name: "Molybdenum", level: "0.263 ppb", legal: null, guideline: "40 ppb" },
        { name: "Nitrate", level: "0.103 ppm", legal: "10 ppm", guideline: "0.14 ppm" },
        { name: "PFHxA (forever chemical)", level: "1.03 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFPeA (forever chemical)", level: "2.43 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "0.411 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.15 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "0.441 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    oldsmar: {
      name: "Oldsmar Water System", pws: "FL6521417", pop: "14,731",
      exceed: [
        { name: "Bromodichloromethane", effect: "Cancer", level: "3.90 ppb", legal: null, times: "65", guideline: "0.06 ppb" },
        { name: "Bromoform", effect: "Cancer", level: "23.2 ppb", legal: null, times: "46", guideline: "0.5 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "4.55 ppb", legal: null, times: "152", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "13.0 ppb", legal: null, times: "130", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "3.59 ppb", legal: "60 ppb", times: "36", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "11.6 ppb", legal: null, times: "193", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.63 pCi/L", legal: "5 pCi/L", times: "13", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "22.9 ppb", legal: "80 ppb", times: "153", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "0.415 ppb", legal: null, times: "4.2", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "118.0 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "3.40 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "310.0 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chloroform", level: "0.630 ppb", legal: null, guideline: "0.4 ppb" },
        { name: "Di(2-ethylhexyl) phthalate", level: "0.205 ppb", legal: "6 ppb", guideline: "3 ppb" },
        { name: "Fluoride", level: "0.681 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "0.520 ppb", legal: null, guideline: "100 ppb" },
        { name: "Strontium", level: "0.0695 ppb", legal: null, guideline: "1,500 ppb" }
      ]
    },
    manatee: {
      name: "Manatee County Utilities", pws: "FL6411132", pop: "347,800",
      exceed: [
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0615 ppb", legal: null, times: "3.1", guideline: "0.02 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "29.5 ppb", legal: "60 ppb", times: "295", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "61.7 ppb", legal: null, times: "1,029", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.87 pCi/L", legal: "5 pCi/L", times: "17", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "33.5 ppb", legal: "80 ppb", times: "224", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "25.0 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "12.0 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "276.3 ppb", legal: null, guideline: "210 ppb" },
        { name: "Fluoride", level: "0.250 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "6.60 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "2.26 ppb", legal: null, guideline: "40 ppb" },
        { name: "Nitrate", level: "0.120 ppm", legal: "10 ppm", guideline: "0.14 ppm" },
        { name: "Strontium", level: "1.91 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "1.78 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    sarasotaco: {
      name: "Sarasota County Utilities", pws: "FL6581591", pop: "267,171",
      exceed: [
        { name: "Bromodichloromethane", effect: "Cancer", level: "12.7 ppb", legal: null, times: "212", guideline: "0.06 ppb" },
        { name: "Bromoform", effect: "Cancer", level: "2.37 ppb", legal: null, times: "4.7", guideline: "0.5 ppb" },
        { name: "Chlorate", effect: "Harm to the thyroid", level: "471.8 ppb", legal: null, times: "2.2", guideline: "210 ppb" },
        { name: "Chloroform", effect: "Cancer", level: "21.4 ppb", legal: null, times: "53", guideline: "0.4 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "2.99 ppb", legal: null, times: "100", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "5.71 ppb", legal: null, times: "57", guideline: "0.1 ppb" },
        { name: "Dichloroacetic acid", effect: "Cancer", level: "17.0 ppb", legal: null, times: "85", guideline: "0.2 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "28.0 ppb", legal: "60 ppb", times: "280", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "42.4 ppb", legal: null, times: "706", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.72 pCi/L", legal: "5 pCi/L", times: "14", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "42.1 ppb", legal: "80 ppb", times: "281", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "6.95 ppb", legal: null, times: "70", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "26.4 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "12.5 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chromium (hexavalent)", level: "0.0356 ppb", legal: null, guideline: "0.02 ppb" },
        { name: "Di(2-ethylhexyl) phthalate", level: "0.113 ppb", legal: "6 ppb", guideline: "3 ppb" },
        { name: "Fluoride", level: "0.411 ppm", legal: "4 ppm", guideline: null },
        { name: "Hexachlorocyclopentadiene", level: "0.00436 ppb", legal: "50 ppb", guideline: "2 ppb" },
        { name: "Manganese", level: "5.63 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "2.02 ppb", legal: null, guideline: "40 ppb" },
        { name: "Monobromoacetic acid", level: "0.0763 ppb", legal: null, guideline: "25 ppb" },
        { name: "Monochloroacetic acid", level: "1.45 ppb", legal: null, guideline: "53 ppb" },
        { name: "Nitrate", level: "0.218 ppm", legal: "10 ppm", guideline: "0.14 ppm" },
        { name: "Strontium", level: "3.47 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "0.863 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    lakeland: {
      name: "City of Lakeland", pws: "FL6531014", pop: "193,297",
      exceed: [
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0704 ppb", legal: null, times: "3.5", guideline: "0.02 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "19.3 ppb", legal: "60 ppb", times: "193", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "32.0 ppb", legal: null, times: "533", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.45 pCi/L", legal: "5 pCi/L", times: "9", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "36.7 ppb", legal: "80 ppb", times: "245", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "1,4-Dioxane", level: "0.0645 ppb", legal: null, guideline: "0.35 ppb" },
        { name: "Aluminum", level: "10.5 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "4.40 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "9.68 ppb", legal: null, guideline: "210 ppb" },
        { name: "Fluoride", level: "0.640 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "0.247 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "8.15 ppb", legal: null, guideline: "40 ppb" },
        { name: "Strontium", level: "0.152 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.02 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "0.249 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    winterhaven: {
      name: "Winter Haven Water Department", pws: "FL6531992", pop: "87,537",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "0.189 ppb", legal: "10 ppb", times: "47", guideline: "0.004 ppb" },
        { name: "Chlorate", effect: "Harm to the thyroid", level: "700.6 ppb", legal: null, times: "3.3", guideline: "210 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "26.6 ppb", legal: "60 ppb", times: "266", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "47.7 ppb", legal: null, times: "795", guideline: "0.06 ppb" },
        { name: "PFHxS (a “forever chemical”)", effect: "Harm to immune & hormone systems", level: "0.667 ppt", legal: "10 ppt", times: "667", guideline: "0.001 ppt" },
        { name: "PFOS (a “forever chemical”)", effect: "Harm to immune system", level: "1.20 ppt", legal: null, times: "4", guideline: "0.3 ppt" },
        { name: "PFOA (a “forever chemical”)", effect: "Cancer", level: "0.644 ppt", legal: null, times: "7.2", guideline: "0.09 ppt" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.64 pCi/L", legal: "5 pCi/L", times: "13", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "57.4 ppb", legal: "80 ppb", times: "383", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "Aluminum", level: "0.833 ppb", legal: null, guideline: "600 ppb" },
        { name: "Barium", level: "15.4 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chromium (hexavalent)", level: "0.0142 ppb", legal: null, guideline: "0.02 ppb" },
        { name: "Fluoride", level: "0.611 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "1.92 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "11.7 ppb", legal: null, guideline: "40 ppb" },
        { name: "Nitrate", level: "0.0470 ppm", legal: "10 ppm", guideline: "0.14 ppm" },
        { name: "PFBS (forever chemical)", level: "0.506 ppt", legal: null, guideline: "2,000 ppt" },
        { name: "Strontium", level: "0.137 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "0.588 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    ouc: {
      name: "Orlando Utilities Commission", pws: "FL3480962", pop: "456,036",
      exceed: [
        { name: "1,3-Butadiene", effect: "Cancer", level: "0.0229 ppb", legal: null, times: "2.2", guideline: "0.0103 ppb" },
        { name: "Bromate", effect: "Cancer", level: "3.52 ppb", legal: "10 ppb", times: "35", guideline: "0.1 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.0456 ppb", legal: null, times: "2.3", guideline: "0.02 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "23.8 ppb", legal: "60 ppb", times: "238", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "32.7 ppb", legal: null, times: "544", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.84 pCi/L", legal: "5 pCi/L", times: "17", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "53.4 ppb", legal: "80 ppb", times: "356", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "Barium", level: "20.6 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Fluoride", level: "0.733 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "0.697 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "1.69 ppb", legal: null, guideline: "40 ppb" },
        { name: "Nitrate", level: "0.0283 ppm", legal: "10 ppm", guideline: "0.14 ppm" },
        { name: "Strontium", level: "0.535 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "0.0154 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    toho: {
      name: "Toho Water Authority (Kissimmee)", pws: "FL3490751", pop: "110,102",
      exceed: [
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "29.3 ppb", legal: "60 ppb", times: "293", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "32.9 ppb", legal: null, times: "548", guideline: "0.06 ppb" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "49.3 ppb", legal: "80 ppb", times: "328", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "Barium", level: "13.7 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "269.7 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chromium (hexavalent)", level: "0.00708 ppb", legal: null, guideline: "0.02 ppb" },
        { name: "Fluoride", level: "0.244 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "0.698 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "4.06 ppb", legal: null, guideline: "40 ppb" },
        { name: "Strontium", level: "0.558 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "0.0833 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    hernando: {
      name: "Hernando County Utilities", pws: "FL6277059", pop: "135,207",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "0.345 ppb", legal: "10 ppb", times: "86", guideline: "0.004 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.668 ppb", legal: null, times: "33", guideline: "0.02 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "3.43 ppb", legal: "60 ppb", times: "34", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "3.92 ppb", legal: null, times: "65", guideline: "0.06 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "0.876 ppm", legal: "10 ppm", times: "6.3", guideline: "0.14 ppm" },
        { name: "PFOS (a “forever chemical”)", effect: "Harm to immune system", level: "1.10 ppt", legal: null, times: "3.7", guideline: "0.3 ppt" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "0.74 pCi/L", legal: "5 pCi/L", times: "15", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "8.59 ppb", legal: "80 ppb", times: "57", guideline: "0.15 ppb" },
        { name: "Uranium", effect: "Cancer", level: "1.93 pCi/L", legal: "20 pCi/L", times: "4.5", guideline: "0.43 pCi/L" }
      ],
      other: [
        { name: "Barium", level: "3.44 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "201.5 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chromium (total)", level: "0.0727 ppb", legal: "100 ppb", guideline: null },
        { name: "Manganese", level: "0.404 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "4.02 ppb", legal: null, guideline: "40 ppb" },
        { name: "PFBS (forever chemical)", level: "1.93 ppt", legal: null, guideline: "2,000 ppt" },
        { name: "PFPeA (forever chemical)", level: "0.760 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "0.205 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Vanadium", level: "2.61 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    plantcity: {
      name: "City of Plant City Utility", pws: "FL6290323", pop: "42,536",
      exceed: [
        { name: "Bromodichloromethane", effect: "Cancer", level: "13.8 ppb", legal: null, times: "230", guideline: "0.06 ppb" },
        { name: "Chloroform", effect: "Cancer", level: "44.5 ppb", legal: null, times: "111", guideline: "0.4 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "1.02 ppb", legal: null, times: "34", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "6.03 ppb", legal: null, times: "60", guideline: "0.1 ppb" },
        { name: "Dichloroacetic acid", effect: "Cancer", level: "19.0 ppb", legal: null, times: "95", guideline: "0.2 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "34.4 ppb", legal: "60 ppb", times: "344", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "38.5 ppb", legal: null, times: "641", guideline: "0.06 ppb" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "1.29 pCi/L", legal: "5 pCi/L", times: "26", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "62.1 ppb", legal: "80 ppb", times: "414", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "15.9 ppb", legal: null, times: "159", guideline: "0.1 ppb" }
      ],
      other: [
        { name: "Barium", level: "10.6 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Bromoform", level: "0.0888 ppb", legal: null, guideline: "0.5 ppb" },
        { name: "Chlorate", level: "375.3 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chloromethane", level: "0.333 ppb", legal: null, guideline: "2.69 ppb" },
        { name: "Chromium (hexavalent)", level: "0.00194 ppb", legal: null, guideline: "0.02 ppb" },
        { name: "Chromium (total)", level: "3.95 ppb", legal: "100 ppb", guideline: null },
        { name: "Fluoride", level: "0.515 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "7.32 ppb", legal: null, guideline: "100 ppb" },
        { name: "Monobromoacetic acid", level: "1.60 ppb", legal: null, guideline: "25 ppb" },
        { name: "Monochloroacetic acid", level: "0.639 ppb", legal: null, guideline: "53 ppb" },
        { name: "Strontium", level: "0.199 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.03 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" }
      ]
    },
    temple: {
      name: "City of Temple Terrace Utility", pws: "FL6291791", pop: "31,250",
      exceed: [
        { name: "Arsenic", effect: "Cancer", level: "1.65 ppb", legal: "10 ppb", times: "413", guideline: "0.004 ppb" },
        { name: "Bromodichloromethane", effect: "Cancer", level: "11.3 ppb", legal: null, times: "188", guideline: "0.06 ppb" },
        { name: "Bromoform", effect: "Cancer", level: "2.14 ppb", legal: null, times: "4.3", guideline: "0.5 ppb" },
        { name: "Chloroform", effect: "Cancer", level: "10.8 ppb", legal: null, times: "27", guideline: "0.4 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "0.360 ppb", legal: null, times: "18", guideline: "0.02 ppb" },
        { name: "Dibromoacetic acid", effect: "", level: "3.28 ppb", legal: null, times: "109", guideline: "0.03 ppb" },
        { name: "Dibromochloromethane", effect: "Cancer", level: "10.3 ppb", legal: null, times: "103", guideline: "0.1 ppb" },
        { name: "Dichloroacetic acid", effect: "Cancer", level: "4.65 ppb", legal: null, times: "23", guideline: "0.2 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "10.7 ppb", legal: "60 ppb", times: "107", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "18.6 ppb", legal: null, times: "309", guideline: "0.06 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "1.81 ppm", legal: "10 ppm", times: "13", guideline: "0.14 ppm" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "1.30 pCi/L", legal: "5 pCi/L", times: "26", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "34.5 ppb", legal: "80 ppb", times: "230", guideline: "0.15 ppb" },
        { name: "Trichloroacetic acid", effect: "Cancer", level: "2.53 ppb", legal: null, times: "25", guideline: "0.1 ppb" },
        { name: "Uranium", effect: "Cancer", level: "3.85 pCi/L", legal: "20 pCi/L", times: "9", guideline: "0.43 pCi/L" }
      ],
      other: [
        { name: "Barium", level: "17.0 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "73.7 ppb", legal: null, guideline: "210 ppb" },
        { name: "Chromium (total)", level: "0.250 ppb", legal: "100 ppb", guideline: null },
        { name: "Fluoride", level: "0.636 ppm", legal: "4 ppm", guideline: null },
        { name: "Manganese", level: "0.625 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "7.74 ppb", legal: null, guideline: "40 ppb" },
        { name: "Selenium", level: "2.95 ppb", legal: "50 ppb", guideline: "30 ppb" },
        { name: "Strontium", level: "0.847 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Thallium", level: "0.150 ppb", legal: "2 ppb", guideline: "0.1 ppb" },
        { name: "Vanadium", level: "9.39 ppb", legal: null, guideline: "21 ppb" }
      ]
    },
    zephyrhills: {
      name: "City of Zephyrhills", pws: "FL6512020", pop: "29,117",
      exceed: [
        { name: "PFHxS (a “forever chemical”)", effect: "Harm to immune & hormone systems", level: "3.85 ppt", legal: "10 ppt", times: "3,850", guideline: "0.001 ppt" },
        { name: "PFOS (a “forever chemical”)", effect: "Harm to immune system", level: "6.39 ppt", legal: null, times: "21", guideline: "0.3 ppt" },
        { name: "PFOA (a “forever chemical”)", effect: "Cancer", level: "1.35 ppt", legal: null, times: "15", guideline: "0.09 ppt" },
        { name: "Arsenic", effect: "Cancer", level: "0.286 ppb", legal: "10 ppb", times: "71", guideline: "0.004 ppb" },
        { name: "Chromium (hexavalent)", effect: "Cancer", level: "1.18 ppb", legal: null, times: "59", guideline: "0.02 ppb" },
        { name: "Haloacetic acids (HAA5)", effect: "Cancer", level: "2.75 ppb", legal: "60 ppb", times: "27", guideline: "0.1 ppb" },
        { name: "Haloacetic acids (HAA9)", effect: "Cancer", level: "1.41 ppb", legal: null, times: "24", guideline: "0.06 ppb" },
        { name: "Nitrate", effect: "Cancer", level: "1.90 ppm", legal: "10 ppm", times: "14", guideline: "0.14 ppm" },
        { name: "Radium, combined (-226 and -228)", effect: "Cancer", level: "1.16 pCi/L", legal: "5 pCi/L", times: "23", guideline: "0.05 pCi/L" },
        { name: "Total trihalomethanes (TTHMs)", effect: "Cancer", level: "6.88 ppb", legal: "80 ppb", times: "46", guideline: "0.15 ppb" }
      ],
      other: [
        { name: "1,4-Dioxane", level: "0.0106 ppb", legal: null, guideline: "0.35 ppb" },
        { name: "Barium", level: "5.57 ppb", legal: "2,000 ppb", guideline: "700 ppb" },
        { name: "Chlorate", level: "58.0 ppb", legal: null, guideline: "210 ppb" },
        { name: "Cobalt", level: "0.0484 ppb", legal: null, guideline: "70 ppb" },
        { name: "Manganese", level: "11.9 ppb", legal: null, guideline: "100 ppb" },
        { name: "Molybdenum", level: "3.23 ppb", legal: null, guideline: "40 ppb" },
        { name: "PFBS (forever chemical)", level: "2.94 ppt", legal: null, guideline: "2,000 ppt" },
        { name: "PFHpA (forever chemical)", level: "0.429 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFHxA (forever chemical)", level: "1.52 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "PFPeA (forever chemical)", level: "3.15 ppt", legal: null, guideline: "1,000 ppt" },
        { name: "Strontium", level: "0.483 ppb", legal: null, guideline: "1,500 ppb" },
        { name: "Uranium", level: "0.43 pCi/L", legal: "20 pCi/L", guideline: "0.43 pCi/L" },
        { name: "Vanadium", level: "4.87 ppb", legal: null, guideline: "21 ppb" }
      ]
    }
  },
  zipMap: {
    "34689": "tarpon", "34688": "tarpon",
    "34698": "dunedin",
    "34677": "oldsmar",
    "34683": "pinellas", "34684": "pinellas", "34685": "pinellas", "34695": "pinellas",
    "33770": "pinellas", "33771": "pinellas", "33772": "pinellas", "33773": "pinellas",
    "33774": "pinellas", "33776": "pinellas", "33777": "pinellas", "33778": "pinellas",
    "33760": "pinellas", "33762": "pinellas", "33764": "pinellas", "33708": "pinellas",
    "33755": "clearwater", "33756": "clearwater", "33759": "clearwater", "33761": "clearwater",
    "33763": "clearwater", "33765": "clearwater", "33767": "clearwater",
    "33780": "pinellaspark", "33781": "pinellaspark", "33782": "pinellaspark",
    "33701": "stpete", "33702": "stpete", "33703": "stpete", "33704": "stpete",
    "33705": "stpete", "33707": "stpete", "33709": "stpete", "33710": "stpete",
    "33711": "stpete", "33712": "stpete", "33713": "stpete", "33714": "stpete",
    "33715": "stpete", "33716": "stpete",
    "33602": "tampa", "33603": "tampa", "33604": "tampa", "33605": "tampa",
    "33606": "tampa", "33607": "tampa", "33609": "tampa", "33610": "tampa",
    "33611": "tampa", "33612": "tampa", "33613": "tampa", "33616": "tampa",
    "33617": "tampa", "33629": "tampa", "33647": "tampa",
    "33614": "hillsnw", "33615": "hillsnw", "33618": "hillsnw", "33624": "hillsnw",
    "33625": "hillsnw", "33626": "hillsnw", "33634": "hillsnw", "33635": "hillsnw",
    "33548": "hillsnw", "33549": "hillsnw", "33556": "hillsnw", "33558": "hillsnw", "33559": "hillsnw",
    "33510": "hillssc", "33511": "hillssc", "33527": "hillssc", "33534": "hillssc",
    "33547": "hillssc", "33569": "hillssc", "33570": "hillssc", "33572": "hillssc",
    "33573": "hillssc", "33578": "hillssc", "33579": "hillssc", "33584": "hillssc",
    "33594": "hillssc", "33596": "hillssc", "33598": "hillssc", "33619": "hillssc",
    "34652": "npr", "34653": "npr",
    "34654": "pasco", "34655": "pasco", "34667": "pasco", "34668": "pasco",
    "34669": "pasco", "34690": "pasco", "34691": "pasco", "34610": "pasco",
    "34637": "pasco", "34638": "pasco", "34639": "pasco",
    "33543": "pasco", "33544": "pasco", "33545": "pasco",
    "33617": "temple", "33637": "temple",
    "33563": "plantcity", "33565": "plantcity", "33566": "plantcity", "33567": "plantcity",
    "33540": "zephyrhills", "33541": "zephyrhills", "33542": "zephyrhills",
    "34601": "hernando", "34602": "hernando", "34604": "hernando", "34606": "hernando",
    "34607": "hernando", "34608": "hernando", "34609": "hernando", "34613": "hernando", "34614": "hernando",
    "34201": "manatee", "34202": "manatee", "34203": "manatee", "34205": "manatee",
    "34207": "manatee", "34208": "manatee", "34209": "manatee", "34210": "manatee",
    "34211": "manatee", "34212": "manatee", "34219": "manatee", "34221": "manatee",
    "34222": "manatee", "34243": "manatee", "34251": "manatee",
    "34229": "sarasotaco", "34231": "sarasotaco", "34232": "sarasotaco", "34233": "sarasotaco",
    "34234": "sarasotaco", "34235": "sarasotaco", "34236": "sarasotaco", "34237": "sarasotaco",
    "34238": "sarasotaco", "34239": "sarasotaco", "34240": "sarasotaco", "34241": "sarasotaco",
    "34242": "sarasotaco", "34275": "sarasotaco", "34285": "sarasotaco", "34287": "sarasotaco",
    "34288": "sarasotaco", "34289": "sarasotaco", "34292": "sarasotaco", "34293": "sarasotaco",
    "33801": "lakeland", "33803": "lakeland", "33805": "lakeland", "33809": "lakeland",
    "33810": "lakeland", "33811": "lakeland", "33812": "lakeland", "33813": "lakeland", "33815": "lakeland",
    "33880": "winterhaven", "33881": "winterhaven", "33884": "winterhaven",
    "32801": "ouc", "32803": "ouc", "32804": "ouc", "32805": "ouc", "32806": "ouc",
    "32807": "ouc", "32808": "ouc", "32809": "ouc", "32810": "ouc", "32811": "ouc",
    "32812": "ouc", "32814": "ouc", "32822": "ouc", "32824": "ouc", "32827": "ouc",
    "32829": "ouc", "32832": "ouc", "32839": "ouc",
    "34741": "toho", "34743": "toho", "34744": "toho", "34746": "toho",
    "34747": "toho", "34758": "toho", "34759": "toho"
  },
  /* Prefix fallbacks only where one utility clearly dominates the range.
     Fragmented areas (Polk 338xx beyond Lakeland/WH, greater Orlando)
     intentionally fall through to the "we don't have your ZIP" path. */
  prefixMap: { "337": "pinellas", "346": "pasco", "336": "tampa", "335": "hillssc", "342": "sarasotaco", "347": "toho" }
};
