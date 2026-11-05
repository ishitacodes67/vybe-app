/* The shared VYBE catalogue. Every consumer page reads this same 48-event set.
   It is deliberately client-safe, so the experience is complete even before a
   newly seeded backend is deployed. */
const VYBE_EVENT_SETS = {
  Tech: [
    ["Futureproof Friday", "A fast, friendly room for future-facing ideas, live demos and people who make things.", "11", "5:30 PM", "Innovation Lab", 0, "Code & Coffee"],
    ["Build After Dark", "Bring the half-made project. Find a collaborator. Leave with a version you can show.", "13", "6:30 PM", "Maker Garage", 99, "No Cap Coders"],
    ["Robots, Actually", "Tiny robots, big curiosity and a hands-on evening for anyone who wants to try.", "16", "4:00 PM", "Robotics Collective", 49, "Robotics Guild"],
    ["Interface Lab", "Make an interface kinder, sharper and easier to use with real people in the room.", "19", "5:00 PM", "Digital Studio", 0, "Product People"],
    ["Open Source Social", "A low-pressure contribution night: good first issues, mentors and late pizza.", "22", "6:00 PM", "Library Lab", 0, "Open Campus"],
    ["The 404 Museum", "A playful exhibition of mistakes, failed prototypes and the clever pivots they made possible.", "26", "7:00 PM", "Media Gallery", 79, "Byte Society"]
  ],
  Design: [
    ["Let’s Go Canva!", "A colourful, hands-on workshop for turning a blank canvas into something worth sharing.", "12", "3:30 PM", "Design Studio", 0, "Design Society"],
    ["Print Party", "Ink, paper, posters and a table full of visual experiments. Make a print to take home.", "14", "4:30 PM", "Print Lab", 99, "Print & Play"],
    ["The Moodboard Social", "Bring your saved posts and half-formed taste. Make a moodboard with new people.", "17", "5:30 PM", "Art Block", 0, "Design Society"],
    ["Type After Hours", "A type-led evening of lettering, layout and very good visual rabbit holes.", "20", "6:30 PM", "Design Studio", 49, "Letterform Club"],
    ["Design Jam: 90 Minutes", "Teams, sticky notes and one campus problem to make better before the timer ends.", "23", "11:00 AM", "Innovation Lab", 99, "Design Society"],
    ["Portfolio Picnic", "Share work-in-progress, swap gentle feedback and make your next portfolio move feel easier.", "27", "4:00 PM", "Campus Lawn", 0, "Creative Careers"]
  ],
  Music: [
    ["Open Mic, No Small Talk", "Poetry, music, comedy and brave first takes. Come with a performance or a loud clap.", "10", "7:00 PM", "Amphitheatre", 49, "Sound Society"],
    ["Terrace Tape Club", "A golden-hour listening club for album stories, favourite tracks and unplanned dancing.", "15", "6:00 PM", "North Terrace", 0, "Sound Society"],
    ["The Great Campus Jam", "Plug in, pull up and make noise together—no audition energy, just the shared groove.", "18", "6:30 PM", "Music Room", 79, "Campus Jam"],
    ["Bedroom Pop Workshop", "Write a tiny song, shape a home-recorded sound and meet people with the same playlists.", "21", "4:00 PM", "Recording Corner", 149, "Bedroom Beats"],
    ["Sufi Under String Lights", "An intimate evening of live Sufi music, warm lights and a crowd that sings back.", "24", "7:30 PM", "Courtyard", 129, "Cultural Collective"],
    ["After Class: DJ Set", "A proper after-class reset: local selectors, a lit-up room and no reason to rush home.", "28", "7:00 PM", "Student Commons", 99, "Frequency Club"]
  ],
  Sports: [
    ["Sunset Miles Run Club", "A welcoming campus run for every pace, followed by a hydration stop and new run friends.", "10", "5:45 PM", "Main Gate", 0, "VYBE Run Club"],
    ["Midnight Badminton", "Book your court, find a doubles partner and play under the lights past ordinary hours.", "13", "9:00 PM", "Sports Complex", 79, "Racquet Crew"],
    ["Street Football Nights", "Small-sided football, big shouts and a drop-in game that keeps moving all evening.", "16", "6:00 PM", "College Ground", 49, "Goal Club"],
    ["Climb & Coffee", "Learn the wall, cheer for strangers and trade the fear of falling for a post-climb coffee.", "19", "7:00 AM", "Climbing Wall", 149, "Peak People"],
    ["Cycle to Somewhere", "A slow social ride through the city with photo stops, snacks and a beautiful final destination.", "23", "6:30 AM", "Campus Gate", 99, "Pedal Club"],
    ["The Rally: Table Tennis", "A lively ladder night for casual rallies, heroic saves and the joy of a clean winner.", "27", "5:00 PM", "Indoor Arena", 49, "Spin Society"]
  ],
  Business: [
    ["Pitch, Please", "A friendly pitch night for rough ideas, bold founders and the people who might build with them.", "11", "6:00 PM", "Main Auditorium", 0, "E-Cell"],
    ["Money Talks, Softly", "An honest, no-shame conversation about student money, investing basics and financial confidence.", "14", "5:00 PM", "Seminar Hall 3", 0, "Finance Forum"],
    ["Brand Dinner", "A long-table dinner about identity, stories and making a brand people genuinely remember.", "17", "7:00 PM", "The Dining Room", 249, "Brand Lab"],
    ["The Side Project Salon", "Show the little thing you are making outside class and find the people who get it.", "20", "6:30 PM", "Innovation Lab", 0, "Indie Builders"],
    ["Marketing Playground", "A tactile workshop for testing campaign ideas, angles and weirdly memorable first drafts.", "24", "4:00 PM", "Media Lab", 129, "Market Minds"],
    ["Women Who Build", "Founders, builders and allies sharing clear stories about making space and making progress.", "28", "5:30 PM", "Seminar Hall 1", 0, "Women in Business"]
  ],
  Culture: [
    ["Film Club: After the Credits", "Watch something good, then stay for the part where everyone notices something different.", "12", "6:30 PM", "Screening Room", 79, "Frame Society"],
    ["The Poetry Kitchen", "Write a line, read a line or simply sit with the words and a cup of chai.", "15", "5:00 PM", "Reading Room", 0, "Word Club"],
    ["Folk, Found & Reimagined", "A living evening of folk sounds, stories and contemporary artists making them new.", "18", "7:00 PM", "Cultural Hall", 99, "Roots Collective"],
    ["Pottery & Playlist", "Clay on your hands, songs in the room and a beautiful little object to take home.", "21", "3:00 PM", "Craft Studio", 199, "Mitti Club"],
    ["Photo Walk: Blue Hour", "A photo walk for the most cinematic hour of the day. Any camera—including your phone—works.", "25", "5:30 PM", "Main Gate", 0, "Frame Society"],
    ["Theatre: Read It Aloud", "Read a scene with new people, find its rhythm and let the room surprise you.", "29", "4:30 PM", "Black Box", 49, "Stage Left"]
  ],
  Social: [
    ["Sunday Supper Club", "A long-table student dinner where the food is warm and no one needs to know anyone first.", "11", "7:00 PM", "Community Kitchen", 199, "Sunday Club"],
    ["The New Here Club", "A soft landing for people who are new, feeling new or just up for one good conversation.", "14", "5:30 PM", "Student Commons", 0, "Hello Club"],
    ["Tiny Things Swap", "Trade books, plants, postcards and tiny treasures. Leave with something unexpectedly perfect.", "17", "3:00 PM", "Courtyard", 0, "Good Things Club"],
    ["Coffee & Good News", "A sunny afternoon of coffee, low-stakes prompts and the kind of news worth telling people.", "20", "4:00 PM", "Campus Café", 49, "Hello Club"],
    ["Game Night, Gently Competitive", "A game table for chaos, laughter and people who promise not to care about winning.", "24", "7:00 PM", "Common Room", 79, "Play Society"],
    ["Dinner With Strangers", "A thoughtfully hosted dinner for turning an unfamiliar table into a plan for next week.", "28", "7:30 PM", "The Dining Room", 249, "Table for More"]
  ],
  Wellness: [
    ["Soft Start Sunday", "Move slowly, stretch a little and start the week with a softer kind of ambition.", "10", "9:00 AM", "Garden Amphitheatre", 0, "Wellbeing Cell"],
    ["The Nervous System Reset", "A practical, gentle reset for stressed student brains: breath, movement and tools to keep.", "13", "5:00 PM", "Wellness Room", 49, "Wellbeing Cell"],
    ["Cook For Your Friends", "Make a simple shared meal from scratch, learn a few useful tricks and eat together.", "16", "4:00 PM", "Community Kitchen", 149, "Food & Feelings"],
    ["Phone Down Picnic", "A phone-free afternoon with blankets, prompts, snacks and the relief of being present.", "19", "4:30 PM", "Campus Lawn", 0, "Slow Club"],
    ["Sleepover for Your Brain", "A cosy workshop on rest, better nights and the small rituals that make tomorrow kinder.", "23", "6:00 PM", "Wellness Room", 79, "Rest Club"],
    ["Move, Breathe, Dance", "A no-pressure movement session where showing up is the only choreography you need.", "27", "6:30 PM", "Dance Studio", 99, "Move Together"]
  ]
};

const VYBE_EVENTS = Object.entries(VYBE_EVENT_SETS).flatMap(([category, rows]) => rows.map(([title, description, day, time, venue, price, organizer], index) => {
  const number = index + 1;
  const date = `2026-11-${String(Math.min(Number(day), 29)).padStart(2, "0")}`;
  const capacity = 44 + ((number * 17 + category.length * 3) % 82);
  const registered = Math.max(8, capacity - (4 + ((number * 5 + category.length) % 22)));
  return {
    id: `catalog-${category.toLowerCase()}-${number}`,
    title, category, description, date, time, venue, price,
    mode: "offline", registrationMode: price > 0 && number % 3 === 0 ? "approval" : "first-come",
    capacity, registered, registeredCount: registered,
    organizer: { name: organizer, organizerProfile: { orgName: organizer } },
    institution: { name: "VYBE community" }, organizerVerified: true,
    tags: [category.toLowerCase(), "campus", number % 2 ? "social" : "creative"]
  };
}));

function getEventById(id) { return VYBE_EVENTS.find(event => String(event.id) === String(id)) || null; }
function eventDate(event) { return new Date(`${event.date}T23:59:59`); }
function getUpcomingEvents() { return [...VYBE_EVENTS].filter(event => eventDate(event) >= new Date()).sort((a, b) => a.date.localeCompare(b.date)); }
function getPastEvents() { return [...VYBE_EVENTS].filter(event => eventDate(event) < new Date()).sort((a, b) => b.date.localeCompare(a.date)); }
function getRecommendedEvents(user) {
  const profile = [...(user?.interests || []), ...(user?.goals || [])].join(" ").toLowerCase();
  return getUpcomingEvents().map(event => ({ ...event, recommendationScore: `${event.category} ${event.tags.join(" ")} ${event.title}`.toLowerCase().split(/\s+/).filter(word => word.length > 3 && profile.includes(word)).length })).sort((a, b) => b.recommendationScore - a.recommendationScore || a.date.localeCompare(b.date));
}
function formatEventDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }
function formatPrice(price) { return Number(price) === 0 ? "Free" : `₹${Number(price).toLocaleString("en-IN")}`; }
