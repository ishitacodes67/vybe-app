// Loads a handful of sample events (based on your existing events-data.js)
// plus one user per role, so you have real data to hit the API against.
// Run with: npm run seed

require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Institution = require("../models/Institution");
const User = require("../models/User");
const Event = require("../models/Event");

const SAMPLE_EVENTS = [
  {
    title: "Design Futures: AI + Creativity",
    category: "Design",
    tags: ["design", "tech", "ai", "creative"],
    date: "2026-10-18",
    time: "4:00 PM",
    venue: "Innovation Lab",
    price: 0,
    registrationMode: "first-come",
    capacity: 120,
    description: "An evening exploring how AI is changing creative workflows and visual thinking."
  },
  {
    title: "Campus Startup Pitch Night",
    category: "Business",
    tags: ["business", "startup", "networking", "entrepreneurship"],
    date: "2026-10-21",
    time: "6:00 PM",
    venue: "Main Auditorium",
    price: 0,
    registrationMode: "first-come",
    capacity: 300,
    description: "Student founders pitch ideas and meet mentors from across campus."
  },
  {
    title: "AI Builders Meetup",
    category: "Tech",
    tags: ["tech", "ai", "coding", "networking"],
    date: "2026-10-25",
    time: "5:30 PM",
    venue: "Seminar Hall 2",
    price: 0,
    registrationMode: "first-come",
    capacity: 180,
    description: "Meet builders working on AI, ML and software projects."
  }
];

async function seed() {
  await connectDB();

  const institution = await Institution.findOneAndUpdate(
    { name: "MIT" },
    { name: "MIT", domain: "mit.edu" },
    { upsert: true, new: true }
  );

  const passwordHash = await bcrypt.hash("password123", 10);

  const organizer = await User.findOneAndUpdate(
    { email: "organizer@mit.edu" },
    {
      name: "Design Society",
      email: "organizer@mit.edu",
      passwordHash,
      role: "organizer",
      institution: institution._id,
      organizerProfile: { orgName: "Design Society", verified: true }
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: "authority@mit.edu" },
    { name: "MIT Student Affairs", email: "authority@mit.edu", passwordHash, role: "authority", institution: institution._id },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: "student@mit.edu" },
    {
      name: "Test Student",
      email: "student@mit.edu",
      passwordHash,
      role: "member",
      institution: institution._id,
      interests: ["tech", "ai", "design"],
      goals: ["networking"],
      onboardingCompleted: true
    },
    { upsert: true, new: true }
  );

  for (const eventData of SAMPLE_EVENTS) {
    await Event.findOneAndUpdate(
      { title: eventData.title },
      { ...eventData, institution: institution._id, organizer: organizer._id, status: "approved" },
      { upsert: true, new: true }
    );
  }

  console.log("Seed complete. Login with student@mit.edu / organizer@mit.edu / authority@mit.edu, password: password123");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
