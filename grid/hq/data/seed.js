// Demo seed: realistic Tampa Bay marine data so every HQ screen has something to show.
// Timestamps are relative to "now" so the response timers and streaks behave.

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const daysAgo = (d, h = 0) => new Date(Date.now() - (d * 24 + h) * 3600000).toISOString();
const inDays = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');

export const MARINE_SERVICES = [
  { slug: 'outboard-service', name: '100 / 300-hour outboard service', blurb: 'Oil, filters, plugs, gear lube, water pump, fuel filter and a full inspection on your schedule, at your dock or driveway.', avg_ticket: 650, intake_fields: ['engine_make', 'engine_model', 'engine_hours'] },
  { slug: 'outboard-repair', name: 'Outboard won\'t start / running rough', blurb: 'Diagnostics and repair for no-start, stalling, overheating, alarms, loss of power and rough idle on any outboard.', avg_ticket: 550, intake_fields: ['engine_make', 'engine_model', 'symptom'] },
  { slug: 'lower-unit', name: 'Lower unit & gearcase', blurb: 'Seals, bearings, shift issues, milky gear oil, prop shaft and water intrusion repairs.', avg_ticket: 900, intake_fields: ['engine_make', 'engine_model'] },
  { slug: 'inboard-sterndrive', name: 'Inboard & sterndrive', blurb: 'MerCruiser, Volvo Penta and inboard gas engines: tune-ups, impellers, manifolds, bellows and outdrive service.', avg_ticket: 850, intake_fields: ['engine_make', 'engine_model', 'engine_hours'] },
  { slug: 'diesel', name: 'Marine diesel', blurb: 'Yanmar, Volvo, Cummins and other diesel service: injectors, fuel polishing, raw-water pumps, heat exchangers.', avg_ticket: 1400, intake_fields: ['engine_make', 'engine_model', 'engine_hours'] },
  { slug: 'electrical', name: 'Electrical & batteries', blurb: 'Batteries, charging, wiring, bilge pumps, switch panels, corrosion and shore power faults.', avg_ticket: 450, intake_fields: ['symptom'] },
  { slug: 'electronics', name: 'Electronics install', blurb: 'GPS, fishfinders, VHF, trolling motors, transducers and NMEA networking installed and configured.', avg_ticket: 600, intake_fields: ['equipment_brand'] },
  { slug: 'fuel-system', name: 'Fuel system & ethanol problems', blurb: 'Fuel pumps, lines, tanks, water in fuel, clogged injectors and carburetor rebuilds.', avg_ticket: 500, intake_fields: ['engine_make', 'symptom'] },
  { slug: 'trailer', name: 'Trailer brakes, bearings & lights', blurb: 'Bearings, hubs, surge and electric brakes, lights, winches and bunks so the boat gets to the ramp.', avg_ticket: 350, intake_fields: [] },
  { slug: 'fiberglass-gelcoat', name: 'Fiberglass & gelcoat', blurb: 'Cracks, chips, blisters, transom and stringer repair with color-matched gelcoat.', avg_ticket: 900, intake_fields: ['symptom'] },
  { slug: 'detailing', name: 'Wash, wax & oxidation removal', blurb: 'Hull compounding, wax, teak and vinyl care at the slip or in the driveway.', avg_ticket: 350, intake_fields: ['boat_length'] },
  { slug: 'storm-prep', name: 'Hurricane prep & layup', blurb: 'Pre-storm checks, fuel stabilizing, battery disconnect, haul-out coordination and post-storm inspections.', avg_ticket: 300, intake_fields: [] },
];

export const MARINE_BRANDS = [
  { slug: 'yamaha', name: 'Yamaha', notes: 'F-series four-strokes, VMAX SHO, HPDI two-strokes' },
  { slug: 'mercury', name: 'Mercury', notes: 'FourStroke, Pro XS, Verado, OptiMax' },
  { slug: 'suzuki', name: 'Suzuki', notes: 'DF series, Lean Burn' },
  { slug: 'honda', name: 'Honda Marine', notes: 'BF series' },
  { slug: 'tohatsu', name: 'Tohatsu', notes: 'MFS series, also sold as Nissan Marine' },
  { slug: 'evinrude', name: 'Evinrude / Johnson', notes: 'E-TEC and legacy two-strokes (discontinued 2020)' },
  { slug: 'mercruiser', name: 'MerCruiser', notes: 'Sterndrives and inboards' },
  { slug: 'volvo-penta', name: 'Volvo Penta', notes: 'Gas and diesel sterndrives, IPS' },
  { slug: 'yanmar', name: 'Yanmar', notes: 'Sailboat and trawler diesels' },
];

const MARINE_ZIPS = {
  Pinellas: ['33701','33702','33703','33704','33705','33706','33707','33708','33709','33710','33711','33712','33713','33714','33715','33716','33755','33756','33759','33760','33761','33762','33763','33764','33765','33767','33770','33771','33772','33773','33774','33776','33777','33778','33781','33782','33785','33786','34677','34681','34683','34684','34685','34688','34689','34695','34698'],
  Hillsborough: ['33510','33511','33527','33534','33547','33548','33549','33556','33558','33559','33566','33569','33570','33572','33573','33578','33579','33584','33592','33594','33596','33598','33602','33603','33604','33605','33606','33607','33609','33610','33611','33612','33613','33614','33615','33616','33617','33618','33619','33624','33625','33626','33629','33634','33635','33637','33647'],
  Pasco: ['33523','33525','33540','33541','33542','33543','33544','33545','33576','34610','34637','34638','34639','34652','34653','34654','34655','34667','34668','34669','34690','34691'],
};

export function buildSeed() {
  const categories = [
    {
      id: 'marine', name: 'Marine', brand_name: 'Tampa Bay Boat Mechanics', site_url: 'https://tampabayboatmechanics.com',
      phone: '(727) 555-0188', email: 'help@tampabayboatmechanics.com', status: 'active', unlock_rule: { min_level: 0 },
      services: MARINE_SERVICES, equipment_brands: MARINE_BRANDS, default_tax_rate: 0.07,
      service_area: { counties: ['Pinellas', 'Hillsborough', 'Pasco'], zips: MARINE_ZIPS }, sort_order: 1, created_at: daysAgo(40),
    },
    { id: 'golf_cart', name: 'Golf carts', brand_name: 'Suncoast Cart Mechanics', site_url: '', phone: '', email: '', status: 'locked', unlock_rule: { min_level: 3 }, services: [], equipment_brands: [], default_tax_rate: 0.07, service_area: {}, sort_order: 2, created_at: daysAgo(40) },
    { id: 'rv', name: 'RV & trailers', brand_name: 'Tampa Bay Mobile RV Techs', site_url: '', phone: '', email: '', status: 'locked', unlock_rule: { min_level: 4 }, services: [], equipment_brands: [], default_tax_rate: 0.07, service_area: {}, sort_order: 3, created_at: daysAgo(40) },
    { id: 'auto', name: 'Mobile auto', brand_name: 'Bay Area Mobile Mechanics', site_url: '', phone: '', email: '', status: 'locked', unlock_rule: { min_level: 5 }, services: [], equipment_brands: [], default_tax_rate: 0.07, service_area: {}, sort_order: 4, created_at: daysAgo(40) },
  ];

  const T = (o) => ({ id: uid(), user_id: null, category_ids: ['marine'], certifications: [], payout_method: 'ach_manual', payout_details: {}, stripe_account_id: null, status: 'approved', agreement_version: '2026-11', agreement_signed_at: daysAgo(30), gmv_total: 0, notes: '', created_at: daysAgo(30), updated_at: daysAgo(2), service_radius_miles: 25, ...o });
  const techs = [
    T({ business_name: 'Anclote Mobile Marine', contact_name: 'Ricky Alvarez', phone: '(727) 555-0101', email: 'ricky@anclotemobilemarine.com', home_zip: '34689', service_zips: ['34689','34688','34683','34684','34685','34677','34698','34695','34681'], specialties: ['outboard-service','outboard-repair','lower-unit','fuel-system'], brands: ['yamaha','suzuki','mercury'], certifications: ['Yamaha Master Tech'], years_experience: 14, hourly_rate: 135, trip_fee: 95, insurance_carrier: 'Progressive Commercial', insurance_expires: inDays(120), coi_path: 'demo/coi-anclote.pdf', w9_path: 'demo/w9-anclote.pdf', btr_number: 'TS-22-4471', rating: 4.9, jobs_completed: 23, gmv_total: 16840 }),
    T({ business_name: 'Bay Breeze Marine Service', contact_name: 'Dana Whitfield', phone: '(727) 555-0122', email: 'dana@baybreezemarine.com', home_zip: '33755', service_zips: ['33755','33756','33759','33761','33763','33764','33765','33767','34695','34698','33770','33771'], specialties: ['outboard-service','outboard-repair','electrical','electronics'], brands: ['mercury','yamaha','honda'], certifications: ['Mercury Certified', 'ABYC Electrical'], years_experience: 9, hourly_rate: 125, trip_fee: 85, insurance_carrier: 'Hiscox', insurance_expires: inDays(26), coi_path: 'demo/coi-baybreeze.pdf', w9_path: 'demo/w9-baybreeze.pdf', btr_number: 'CLW-31882', rating: 4.7, jobs_completed: 15, gmv_total: 9950 }),
    T({ business_name: 'Gulfport Diesel & Inboard', contact_name: 'Marcus Lee', phone: '(727) 555-0143', email: 'marcus@gulfportdiesel.com', home_zip: '33707', service_zips: ['33701','33702','33703','33704','33705','33706','33707','33708','33709','33710','33711','33712','33713','33715','33716','33785','33786'], specialties: ['inboard-sterndrive','diesel','electrical','fuel-system'], brands: ['mercruiser','volvo-penta','yanmar'], certifications: ['Volvo Penta Certified', 'Yanmar Trained'], years_experience: 20, hourly_rate: 150, trip_fee: 120, insurance_carrier: 'Markel', insurance_expires: inDays(200), coi_path: 'demo/coi-gulfport.pdf', w9_path: 'demo/w9-gulfport.pdf', btr_number: 'STP-10932', rating: 4.8, jobs_completed: 31, gmv_total: 41200 }),
    T({ business_name: 'Suncoast Outboard Pros', contact_name: 'Tyler Nguyen', phone: '(727) 555-0167', email: 'tyler@suncoastoutboard.com', home_zip: '34683', service_zips: ['34683','34684','34685','34677','34681','34689','34695','34698'], specialties: ['outboard-service','outboard-repair','lower-unit'], brands: ['yamaha','suzuki','tohatsu'], certifications: ['Suzuki Certified'], years_experience: 6, hourly_rate: 120, trip_fee: 75, insurance_carrier: 'Next Insurance', insurance_expires: inDays(300), coi_path: 'demo/coi-suncoast.pdf', w9_path: null, btr_number: null, rating: 4.6, jobs_completed: 7, gmv_total: 4100 }),
    T({ business_name: 'Hillsborough Marine Electric', contact_name: 'Priya Raman', phone: '(813) 555-0190', email: 'priya@hillsmarineelectric.com', home_zip: '33611', service_zips: ['33611','33616','33629','33606','33609','33602','33604','33605','33619','33572','33570','33573','33634','33635'], specialties: ['electrical','electronics','fuel-system','storm-prep'], brands: ['yamaha','mercury','suzuki','honda','mercruiser'], certifications: ['ABYC Marine Electrical', 'NMEA Installer'], years_experience: 11, hourly_rate: 140, trip_fee: 95, insurance_carrier: 'The Hartford', insurance_expires: inDays(220), coi_path: 'demo/coi-hme.pdf', w9_path: 'demo/w9-hme.pdf', btr_number: 'HC-77-2210', rating: 5.0, jobs_completed: 19, gmv_total: 12300 }),
    T({ business_name: 'Pasco Mobile Boat Repair', contact_name: 'Luis Herrera', phone: '(727) 555-0174', email: 'luis@pascomobileboat.com', home_zip: '34652', service_zips: ['34652','34653','34654','34655','34667','34668','34669','34690','34691','34610'], specialties: ['outboard-service','outboard-repair','trailer','fuel-system'], brands: ['mercury','yamaha','evinrude'], certifications: [], years_experience: 8, hourly_rate: 115, trip_fee: 80, insurance_carrier: 'Progressive Commercial', insurance_expires: inDays(90), coi_path: 'demo/coi-pasco.pdf', w9_path: 'demo/w9-pasco.pdf', btr_number: 'PC-44810', rating: 4.5, jobs_completed: 12, gmv_total: 6900 }),
  ];
  const [anclote, baybreeze, gulfport, suncoast, hme, pasco] = techs;

  const tech_applications = [
    { id: uid(), category_id: 'marine', business_name: 'Dunedin Boatworks Mobile', contact_name: 'Sam Okafor', phone: '(727) 555-0211', email: 'sam@dunedinboatworks.com', home_zip: '34698', service_area_text: 'Dunedin, Clearwater, Palm Harbor, Safety Harbor', specialties: ['outboard-service','outboard-repair','fiberglass-gelcoat'], brands: ['yamaha','mercury'], years_experience: 10, has_insurance: true, insurance_carrier: 'Hiscox', notes: 'Former dealer tech, mobile for 3 years.', agreement_accepted: true, status: 'new', tech_id: null, created_at: minutesAgo(190) },
    { id: uid(), category_id: 'marine', business_name: 'Ruskin Marine Tech', contact_name: 'Jenna Cole', phone: '(813) 555-0233', email: 'jenna@ruskinmarinetech.com', home_zip: '33570', service_area_text: 'Ruskin, Apollo Beach, Gibsonton, Riverview', specialties: ['outboard-service','trailer','detailing'], brands: ['mercury','suzuki'], years_experience: 4, has_insurance: false, insurance_carrier: '', notes: '', agreement_accepted: true, status: 'new', tech_id: null, created_at: daysAgo(1, 3) },
  ];

  const leads = [];
  const lead_events = [];
  const dispatch_offers = [];
  const quotes = [];
  const invoices = [];
  const payouts = [];

  const L = (o) => {
    const row = { id: uid(), category_id: 'marine', source: 'site', email: null, address: null, lat: null, lng: null, photos: [], urgency: 'this_week', sms_consent: true, assigned_tech_id: null, first_response_at: null, scheduled_at: null, estimated_value: null, lost_reason: null, updated_at: o.created_at, ...o };
    leads.push(row);
    lead_events.push({ id: uid(), lead_id: row.id, type: 'created', actor: 'customer', payload: { source: row.source }, created_at: row.created_at });
    return row;
  };
  const E = (lead, type, actor, payload, created_at) => lead_events.push({ id: uid(), lead_id: lead.id, type, actor, payload: payload || {}, created_at });
  const respond = (lead, minutesAfter, how = 'call') => {
    const t = new Date(new Date(lead.created_at).getTime() + minutesAfter * 60000).toISOString();
    lead.first_response_at = t;
    E(lead, how, 'admin', { minutes_to_respond: minutesAfter, note: how === 'call' ? 'Spoke with customer, confirmed details.' : 'Texted to confirm.' }, t);
    return t;
  };

  // --- new (two timers running)
  L({ customer_name: 'Kevin Marsh', phone: '(727) 555-3001', email: 'kevin.marsh@example.com', city: 'Tarpon Springs', zip: '34689', county: 'Pinellas', equipment: { make: 'yamaha', model: 'F150', year: 2019, hours: 410 }, service_slug: 'outboard-repair', description: 'Won\'t idle, dies at the dock unless I keep the throttle up. Started after sitting two months.', urgency: 'asap', status: 'new', created_at: minutesAgo(3) });
  L({ customer_name: 'Alicia Romero', phone: '(813) 555-3002', email: 'alicia.r@example.com', city: 'Apollo Beach', zip: '33572', county: 'Hillsborough', equipment: { make: 'mercury', model: '115 FourStroke', year: 2021, hours: 180 }, service_slug: 'outboard-service', description: '100 hour service, boat is on a lift behind the house.', urgency: 'this_week', status: 'new', created_at: minutesAgo(47), source: 'google_ads' });

  // --- contacted
  const l3 = L({ customer_name: 'Doug Henley', phone: '(727) 555-3003', city: 'Dunedin', zip: '34698', county: 'Pinellas', equipment: { make: 'suzuki', model: 'DF200', year: 2017, hours: 620 }, service_slug: 'lower-unit', description: 'Gear oil came out milky at the last change. Shifting fine.', status: 'contacted', created_at: minutesAgo(140) });
  respond(l3, 4);

  // --- approved
  const l4 = L({ customer_name: 'Marta Kowalski', phone: '(727) 555-3004', email: 'marta.k@example.com', city: 'Clearwater', zip: '33767', county: 'Pinellas', equipment: { make: 'yamaha', model: 'F250 x2', year: 2016, hours: 890 }, service_slug: 'electrical', description: 'House batteries dead every morning. Three batteries, two switches, no idea what\'s draining them.', status: 'approved', created_at: minutesAgo(200), estimated_value: 450 });
  respond(l4, 2);
  E(l4, 'status', 'admin', { from: 'contacted', to: 'approved' }, minutesAgo(190));

  // --- offered
  const l5 = L({ customer_name: 'Brian Teague', phone: '(727) 555-3005', email: 'bteague@example.com', city: 'Palm Harbor', zip: '34683', county: 'Pinellas', equipment: { make: 'yamaha', model: 'F115', year: 2020, hours: 240 }, service_slug: 'outboard-service', description: '300 hour service plus check a slow tilt.', status: 'offered', created_at: minutesAgo(75), estimated_value: 700 });
  respond(l5, 3);
  E(l5, 'status', 'admin', { from: 'contacted', to: 'approved' }, minutesAgo(70));
  for (const t of [anclote, suncoast, baybreeze]) {
    dispatch_offers.push({ id: uid(), lead_id: l5.id, tech_id: t.id, status: 'offered', offered_at: minutesAgo(12), expires_at: new Date(Date.now() + 18 * 60000).toISOString(), responded_at: null, note: null });
    E(l5, 'offer', 'system', { tech_id: t.id, business_name: t.business_name }, minutesAgo(12));
  }

  // --- assigned (two)
  const l6 = L({ customer_name: 'Hannah Pruitt', phone: '(813) 555-3006', email: 'hannah.p@example.com', city: 'Tampa', zip: '33611', county: 'Hillsborough', equipment: { make: 'mercruiser', model: '5.0 MPI', year: 2012, hours: 540 }, service_slug: 'inboard-sterndrive', description: 'Overheating alarm after 20 minutes at cruise. Impeller was done two years ago.', status: 'assigned', assigned_tech_id: gulfport.id, created_at: daysAgo(1, 2), estimated_value: 850 });
  respond(l6, 6);
  E(l6, 'status', 'admin', { from: 'contacted', to: 'approved' }, daysAgo(1, 1));
  dispatch_offers.push({ id: uid(), lead_id: l6.id, tech_id: gulfport.id, status: 'accepted', offered_at: daysAgo(1, 1), expires_at: daysAgo(1, 0.5), responded_at: daysAgo(1, 0.8), note: null });
  dispatch_offers.push({ id: uid(), lead_id: l6.id, tech_id: hme.id, status: 'withdrawn', offered_at: daysAgo(1, 1), expires_at: daysAgo(1, 0.5), responded_at: daysAgo(1, 0.8), note: null });
  E(l6, 'offer', 'system', { tech_id: gulfport.id, business_name: gulfport.business_name }, daysAgo(1, 1));
  E(l6, 'accepted', 'tech:' + gulfport.id, { business_name: gulfport.business_name }, daysAgo(1, 0.8));

  const l7 = L({ customer_name: 'Omar Siddiqui', phone: '(727) 555-3007', city: 'New Port Richey', zip: '34652', county: 'Pasco', equipment: { make: 'mercury', model: '150 Pro XS', year: 2018, hours: 330 }, service_slug: 'fuel-system', description: 'Surging at mid-range, fuel smell at the primer bulb.', status: 'assigned', assigned_tech_id: pasco.id, created_at: daysAgo(0, 9), source: 'facebook' });
  respond(l7, 1);
  E(l7, 'status', 'admin', { from: 'contacted', to: 'approved' }, daysAgo(0, 8.5));
  dispatch_offers.push({ id: uid(), lead_id: l7.id, tech_id: pasco.id, status: 'accepted', offered_at: daysAgo(0, 8.5), expires_at: daysAgo(0, 8), responded_at: daysAgo(0, 8.3), note: null });
  E(l7, 'accepted', 'tech:' + pasco.id, { business_name: pasco.business_name }, daysAgo(0, 8.3));

  // --- quoted (quote sent, awaiting customer)
  const l8 = L({ customer_name: 'Grace Lindqvist', phone: '(727) 555-3008', email: 'grace.l@example.com', city: 'St. Petersburg', zip: '33704', county: 'Pinellas', equipment: { make: 'volvo-penta', model: 'D4-260', year: 2015, hours: 1100 }, service_slug: 'diesel', description: 'Black smoke under load and a hard start cold. 32ft express cruiser at Harborage.', status: 'quoted', assigned_tech_id: gulfport.id, created_at: daysAgo(3), estimated_value: 2180 });
  respond(l8, 2);
  E(l8, 'status', 'admin', { from: 'contacted', to: 'approved' }, daysAgo(3, -1));
  dispatch_offers.push({ id: uid(), lead_id: l8.id, tech_id: gulfport.id, status: 'accepted', offered_at: daysAgo(3, -1), expires_at: daysAgo(3, -1.5), responded_at: daysAgo(3, -1.2), note: null });
  E(l8, 'accepted', 'tech:' + gulfport.id, { business_name: gulfport.business_name }, daysAgo(3, -1.2));
  const q8 = { id: uid(), lead_id: l8.id, tech_id: gulfport.id, line_items: [
    { description: 'Diagnostic and sea trial', qty: 2, unit_price: 150, taxable: false, kind: 'labor' },
    { description: 'Injector removal, test and clean (4)', qty: 5, unit_price: 150, taxable: true, kind: 'labor' },
    { description: 'Injector seals and copper washers kit', qty: 1, unit_price: 186, taxable: true, kind: 'parts' },
    { description: 'Fuel filter set (primary + secondary)', qty: 1, unit_price: 92, taxable: true, kind: 'parts' },
    { description: 'Trip fee', qty: 1, unit_price: 120, taxable: false, kind: 'fee' },
  ], subtotal: 1448, tax_rate: 0.07, tax: 72.66, total: 1520.66, deposit_required: null, status: 'sent', valid_until: inDays(11), public_token: token(), sent_at: daysAgo(2), accepted_at: null, customer_note: null, created_at: daysAgo(2, 1), updated_at: daysAgo(2) };
  quotes.push(q8);
  E(l8, 'quote_sent', 'admin', { quote_id: q8.id, total: q8.total }, daysAgo(2));

  // --- scheduled (quote accepted)
  const l9 = L({ customer_name: 'Victor Hale', phone: '(813) 555-3009', email: 'vhale@example.com', city: 'Ruskin', zip: '33570', county: 'Hillsborough', equipment: { make: 'yamaha', model: 'F90', year: 2022, hours: 95 }, service_slug: 'electronics', description: 'Install a Garmin 943xsv and a GT56 transducer, already purchased.', status: 'scheduled', assigned_tech_id: hme.id, scheduled_at: new Date(Date.now() + 2 * 86400000).toISOString(), created_at: daysAgo(4), estimated_value: 640 });
  respond(l9, 8);
  E(l9, 'status', 'admin', { from: 'contacted', to: 'approved' }, daysAgo(4, -1));
  dispatch_offers.push({ id: uid(), lead_id: l9.id, tech_id: hme.id, status: 'accepted', offered_at: daysAgo(4, -1), expires_at: daysAgo(4, -1.5), responded_at: daysAgo(4, -1.1), note: null });
  E(l9, 'accepted', 'tech:' + hme.id, { business_name: hme.business_name }, daysAgo(4, -1.1));
  const q9 = { id: uid(), lead_id: l9.id, tech_id: hme.id, line_items: [
    { description: 'MFD + transducer install, NMEA network, setup', qty: 4, unit_price: 140, taxable: false, kind: 'labor' },
    { description: 'Mounting hardware, cable, connectors', qty: 1, unit_price: 65, taxable: true, kind: 'parts' },
    { description: 'Trip fee', qty: 1, unit_price: 95, taxable: false, kind: 'fee' },
  ], subtotal: 720, tax_rate: 0.075, tax: 4.88, total: 724.88, deposit_required: null, status: 'accepted', valid_until: inDays(8), public_token: token(), sent_at: daysAgo(3), accepted_at: daysAgo(2, 20), customer_note: 'Saturday morning works.', created_at: daysAgo(3, 1), updated_at: daysAgo(2, 20) };
  quotes.push(q9);
  E(l9, 'quote_sent', 'admin', { quote_id: q9.id, total: q9.total }, daysAgo(3));
  E(l9, 'quote_accepted', 'customer', { quote_id: q9.id, total: q9.total }, daysAgo(2, 20));
  E(l9, 'status', 'admin', { from: 'quoted', to: 'scheduled', scheduled_at: l9.scheduled_at }, daysAgo(2, 19));

  // --- in progress
  const l10 = L({ customer_name: 'Renee Caldwell', phone: '(727) 555-3010', city: 'Largo', zip: '33770', county: 'Pinellas', equipment: { make: 'mercury', model: '200 Verado', year: 2014, hours: 760 }, service_slug: 'outboard-repair', description: 'Low oil pressure alarm at idle. Oil level is fine.', status: 'in_progress', assigned_tech_id: baybreeze.id, scheduled_at: daysAgo(0, 3), created_at: daysAgo(2, 5), estimated_value: 600 });
  respond(l10, 3);
  E(l10, 'status', 'admin', { from: 'contacted', to: 'approved' }, daysAgo(2, 4));
  dispatch_offers.push({ id: uid(), lead_id: l10.id, tech_id: baybreeze.id, status: 'accepted', offered_at: daysAgo(2, 4), expires_at: daysAgo(2, 3.5), responded_at: daysAgo(2, 3.9), note: null });
  E(l10, 'accepted', 'tech:' + baybreeze.id, { business_name: baybreeze.business_name }, daysAgo(2, 3.9));
  E(l10, 'status', 'tech:' + baybreeze.id, { from: 'scheduled', to: 'in_progress' }, daysAgo(0, 3));

  // --- completed (invoice in review)
  const l11 = L({ customer_name: 'Tom Barringer', phone: '(727) 555-3011', email: 'tbarringer@example.com', city: 'Safety Harbor', zip: '34695', county: 'Pinellas', equipment: { make: 'suzuki', model: 'DF140A', year: 2019, hours: 300 }, service_slug: 'outboard-service', description: '300 hour service.', status: 'completed', assigned_tech_id: anclote.id, scheduled_at: daysAgo(1, 4), created_at: daysAgo(5), estimated_value: 900 });
  respond(l11, 2);
  E(l11, 'status', 'admin', { from: 'contacted', to: 'approved' }, daysAgo(5, -1));
  dispatch_offers.push({ id: uid(), lead_id: l11.id, tech_id: anclote.id, status: 'accepted', offered_at: daysAgo(5, -1), expires_at: daysAgo(5, -1.5), responded_at: daysAgo(5, -1.1), note: null });
  E(l11, 'accepted', 'tech:' + anclote.id, { business_name: anclote.business_name }, daysAgo(5, -1.1));
  E(l11, 'status', 'tech:' + anclote.id, { from: 'scheduled', to: 'in_progress' }, daysAgo(1, 4));
  const inv11 = { id: uid(), lead_id: l11.id, tech_id: anclote.id, quote_id: null, file_path: 'demo/invoice-barringer.jpg', extracted: { vendor_name: 'Anclote Mobile Marine', invoice_number: 'A-1187', confidence: 0.93 }, line_items: [
    { description: '300 hr service labor', qty: 4, unit_price: 135, taxable: true, kind: 'labor' },
    { description: 'Suzuki OEM service kit (oil, filters, plugs, gear lube)', qty: 1, unit_price: 212, taxable: true, kind: 'parts' },
    { description: 'Water pump impeller kit', qty: 1, unit_price: 68, taxable: true, kind: 'parts' },
    { description: 'Trip fee', qty: 1, unit_price: 95, taxable: false, kind: 'fee' },
  ], subtotal: 915, tax: 57.40, total: 972.40, status: 'review', payment_link_url: null, payment_link_card_url: null, stripe_session_id: null, stripe_payment_intent: null, paid_at: null, paid_amount: null, payment_method: null, platform_fee_pct: 10, platform_fee_min: 25, platform_fee_amount: null, processing_fee_amount: null, card_fee_pct: 3, card_fee_charged: 0, tech_share_amount: null, public_token: token(), sent_at: null, created_at: daysAgo(0, 5), updated_at: daysAgo(0, 5) };
  invoices.push(inv11);
  E(l11, 'invoice_uploaded', 'tech:' + anclote.id, { invoice_id: inv11.id }, daysAgo(0, 5));
  E(l11, 'invoice_extracted', 'system', { invoice_id: inv11.id, total: inv11.total, confidence: 0.93 }, daysAgo(0, 4.9));

  // --- paid #1 (ACH, payout owed)
  const l12 = L({ customer_name: 'Elena Vasquez', phone: '(727) 555-3012', email: 'elena.v@example.com', city: 'Clearwater', zip: '33761', county: 'Pinellas', equipment: { make: 'honda', model: 'BF225', year: 2015, hours: 700 }, service_slug: 'outboard-repair', description: 'Overheat alarm, pee stream weak.', status: 'paid', assigned_tech_id: baybreeze.id, scheduled_at: daysAgo(4), created_at: daysAgo(7), estimated_value: 650 });
  respond(l12, 4);
  E(l12, 'status', 'admin', { from: 'contacted', to: 'approved' }, daysAgo(7, -1));
  dispatch_offers.push({ id: uid(), lead_id: l12.id, tech_id: baybreeze.id, status: 'accepted', offered_at: daysAgo(7, -1), expires_at: daysAgo(7, -1.5), responded_at: daysAgo(7, -1.3), note: null });
  E(l12, 'accepted', 'tech:' + baybreeze.id, { business_name: baybreeze.business_name }, daysAgo(7, -1.3));
  const inv12 = { id: uid(), lead_id: l12.id, tech_id: baybreeze.id, quote_id: null, file_path: 'demo/invoice-vasquez.pdf', extracted: { confidence: 0.97 }, line_items: [
    { description: 'Diagnose overheat, replace water pump and thermostat', qty: 3, unit_price: 125, taxable: true, kind: 'labor' },
    { description: 'Honda water pump kit + thermostat', qty: 1, unit_price: 189, taxable: true, kind: 'parts' },
    { description: 'Trip fee', qty: 1, unit_price: 85, taxable: false, kind: 'fee' },
  ], subtotal: 649, tax: 39.48, total: 688.48, status: 'paid', payment_link_url: 'https://buy.stripe.com/demo_ach', payment_link_card_url: 'https://buy.stripe.com/demo_card', stripe_session_id: 'plink_demo1', stripe_payment_intent: 'pi_demo1', paid_at: daysAgo(1, 6), paid_amount: 688.48, payment_method: 'ach', platform_fee_pct: 10, platform_fee_min: 25, platform_fee_amount: 68.85, processing_fee_amount: 5.00, card_fee_pct: 3, card_fee_charged: 0, tech_share_amount: 619.63, public_token: token(), sent_at: daysAgo(3), created_at: daysAgo(3, 2), updated_at: daysAgo(1, 6) };
  invoices.push(inv12);
  E(l12, 'invoice_uploaded', 'tech:' + baybreeze.id, { invoice_id: inv12.id }, daysAgo(3, 2));
  E(l12, 'invoice_sent', 'admin', { invoice_id: inv12.id, total: inv12.total, fee: 68.85 }, daysAgo(3));
  E(l12, 'paid', 'customer', { invoice_id: inv12.id, total: inv12.total, paid_amount: 688.48, method: 'ach', processing_fee: 5, platform_fee: 68.85 }, daysAgo(1, 6));
  payouts.push({ id: uid(), invoice_id: inv12.id, tech_id: baybreeze.id, amount: 619.63, method: 'ach_manual', status: 'owed', paid_at: null, reference: null, tax_year: new Date().getFullYear(), created_at: daysAgo(1, 6) });

  // --- paid #2 (card, payout paid)
  const l13 = L({ customer_name: 'Nate Garza', phone: '(813) 555-3013', email: 'nate.g@example.com', city: 'Tampa', zip: '33629', county: 'Hillsborough', equipment: { make: 'yamaha', model: 'F300', year: 2018, hours: 520 }, service_slug: 'electrical', description: 'Trim gauge dead, nav lights intermittent.', status: 'paid', assigned_tech_id: hme.id, scheduled_at: daysAgo(9), created_at: daysAgo(12), estimated_value: 450 });
  respond(l13, 2);
  E(l13, 'status', 'admin', { from: 'contacted', to: 'approved' }, daysAgo(12, -1));
  dispatch_offers.push({ id: uid(), lead_id: l13.id, tech_id: hme.id, status: 'accepted', offered_at: daysAgo(12, -1), expires_at: daysAgo(12, -1.5), responded_at: daysAgo(12, -1.2), note: null });
  E(l13, 'accepted', 'tech:' + hme.id, { business_name: hme.business_name }, daysAgo(12, -1.2));
  const inv13 = { id: uid(), lead_id: l13.id, tech_id: hme.id, quote_id: null, file_path: 'demo/invoice-garza.jpg', extracted: { confidence: 0.9 }, line_items: [
    { description: 'Trace and repair harness chafe, replace trim sender, clean grounds', qty: 2.5, unit_price: 140, taxable: true, kind: 'labor' },
    { description: 'Trim sender, heat shrink, terminals', qty: 1, unit_price: 74, taxable: true, kind: 'parts' },
    { description: 'Trip fee', qty: 1, unit_price: 95, taxable: false, kind: 'fee' },
  ], subtotal: 519, tax: 31.80, total: 550.80, status: 'paid', payment_link_url: 'https://buy.stripe.com/demo_ach2', payment_link_card_url: 'https://buy.stripe.com/demo_card2', stripe_session_id: 'plink_demo2', stripe_payment_intent: 'pi_demo2', paid_at: daysAgo(7), paid_amount: 567.32, payment_method: 'card', platform_fee_pct: 10, platform_fee_min: 25, platform_fee_amount: 55.08, processing_fee_amount: 16.75, card_fee_pct: 3, card_fee_charged: 16.52, tech_share_amount: 495.72, public_token: token(), sent_at: daysAgo(8), created_at: daysAgo(8, 2), updated_at: daysAgo(7) };
  invoices.push(inv13);
  E(l13, 'invoice_uploaded', 'tech:' + hme.id, { invoice_id: inv13.id }, daysAgo(8, 2));
  E(l13, 'invoice_sent', 'admin', { invoice_id: inv13.id, total: inv13.total, fee: 55.08 }, daysAgo(8));
  E(l13, 'paid', 'customer', { invoice_id: inv13.id, total: inv13.total, paid_amount: 567.32, method: 'card', processing_fee: 16.75, platform_fee: 55.08 }, daysAgo(7));
  payouts.push({ id: uid(), invoice_id: inv13.id, tech_id: hme.id, amount: 495.72, method: 'ach_manual', status: 'paid', paid_at: daysAgo(6, 20), reference: 'ACH 88213', tax_year: new Date().getFullYear(), created_at: daysAgo(7) });
  E(l13, 'payout_paid', 'admin', { amount: 495.72, same_day: true }, daysAgo(6, 20));
  E(l13, 'review', 'customer', { rating: 5, text: 'Priya found the chafe in 20 minutes. Lights work.' }, daysAgo(5));

  // --- dead
  const l14 = L({ customer_name: 'Chris Donnelly', phone: '(727) 555-3014', city: 'Hudson', zip: '34667', county: 'Pasco', equipment: { make: 'evinrude', model: 'E-TEC 90', year: 2009, hours: null }, service_slug: 'outboard-repair', description: 'No spark, wants it fixed for under $200.', status: 'dead', lost_reason: 'Budget below diagnostic cost; referred to a shop.', created_at: daysAgo(6) });
  respond(l14, 21);
  E(l14, 'status', 'admin', { from: 'contacted', to: 'dead', reason: l14.lost_reason }, daysAgo(6, -1));

  const settings = [
    { key: 'platform_fee_pct', value: 10 }, { key: 'platform_fee_min', value: 25 }, { key: 'card_fee_pct', value: 3 },
    { key: 'speed_sla_minutes', value: 5 }, { key: 'offer_expiry_minutes', value: 30 }, { key: 'payout_rail', value: 'ach_manual' },
    { key: 'county_tax_rates', value: { Pinellas: 0.07, Hillsborough: 0.075, Pasco: 0.07, Manatee: 0.07, Hernando: 0.065 } },
    { key: 'admin_email', value: '' }, { key: 'hq_url', value: '' }, { key: 'site_live', value: false },
  ];

  const notifications = [
    { id: uid(), channel: 'sms', to_addr: anclote.phone, subject: null, body: 'Tampa Bay Boat Mechanics: new job near 34683 — outboard-service. yamaha F115. Accept in your portal.', ref_type: 'lead', ref_id: l5.id, status: 'sent', error: null, created_at: minutesAgo(12) },
    { id: uid(), channel: 'email', to_addr: l8.email, subject: 'Your quote: $1520.66', body: 'Hi Grace, your quote from Tampa Bay Boat Mechanics is ready.', ref_type: 'quote', ref_id: q8.id, status: 'sent', error: null, created_at: daysAgo(2) },
  ];

  return { categories, techs, tech_applications, leads, lead_events, dispatch_offers, quotes, invoices, payouts, settings, achievements: [], notifications, files: {} };
}
