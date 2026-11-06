window.VYBE_EVENT_VISUALS = {
  images: {
    "Tech": [
      "assets/event-covers/tech-1.webp",
      "assets/event-covers/tech-2.webp",
      "assets/event-covers/tech-3.webp",
      "assets/event-covers/tech-4.webp",
      "assets/event-covers/tech-5.webp",
      "assets/event-covers/tech-6.webp"
    ],
    "Design": [
      "assets/event-covers/design-1.webp",
      "assets/event-covers/design-2.webp",
      "assets/event-covers/design-3.webp",
      "assets/event-covers/design-4.webp",
      "assets/event-covers/design-5.webp",
      "assets/event-covers/design-6.webp"
    ],
    "Music": [
      "assets/event-covers/music-1.webp",
      "assets/event-covers/music-2.webp",
      "assets/event-covers/music-3.webp",
      "assets/event-covers/music-4.webp",
      "assets/event-covers/music-5.webp",
      "assets/event-covers/music-6.webp"
    ],
    "Sports": [
      "assets/event-covers/sports-1.webp",
      "assets/event-covers/sports-2.webp",
      "assets/event-covers/sports-3.webp",
      "assets/event-covers/sports-4.webp",
      "assets/event-covers/sports-5.webp",
      "assets/event-covers/sports-6.webp"
    ],
    "Business": [
      "assets/event-covers/business-1.webp",
      "assets/event-covers/business-2.webp",
      "assets/event-covers/business-3.webp",
      "assets/event-covers/business-4.webp",
      "assets/event-covers/business-5.webp",
      "assets/event-covers/business-6.webp"
    ],
    "Culture": [
      "assets/event-covers/culture-1.webp",
      "assets/event-covers/culture-2.webp",
      "assets/event-covers/culture-3.webp",
      "assets/event-covers/culture-4.webp",
      "assets/event-covers/culture-5.webp",
      "assets/event-covers/culture-6.webp"
    ],
    "Social": [
      "assets/event-covers/social-1.webp",
      "assets/event-covers/social-2.webp",
      "assets/event-covers/social-3.webp",
      "assets/event-covers/social-4.webp",
      "assets/event-covers/social-5.webp",
      "assets/event-covers/social-6.webp"
    ],
    "Wellness": [
      "assets/event-covers/wellness-1.webp",
      "assets/event-covers/wellness-2.webp",
      "assets/event-covers/wellness-3.webp",
      "assets/event-covers/wellness-4.webp",
      "assets/event-covers/wellness-5.webp",
      "assets/event-covers/wellness-6.webp"
    ],
  },
  titleIndexes: {
    "Futureproof Friday": ["Tech", 0],
    "Build After Dark": ["Tech", 1],
    "Robots, Actually": ["Tech", 2],
    "Interface Lab": ["Tech", 3],
    "Open Source Social": ["Tech", 4],
    "The 404 Museum": ["Tech", 5],
    "Let\u2019s Go Canva!": ["Design", 0],
    "Print Party": ["Design", 1],
    "The Moodboard Social": ["Design", 2],
    "Type After Hours": ["Design", 3],
    "Design Jam: 90 Minutes": ["Design", 4],
    "Portfolio Picnic": ["Design", 5],
    "Open Mic, No Small Talk": ["Music", 0],
    "Terrace Tape Club": ["Music", 1],
    "The Great Campus Jam": ["Music", 2],
    "Bedroom Pop Workshop": ["Music", 3],
    "Sufi Under String Lights": ["Music", 4],
    "After Class: DJ Set": ["Music", 5],
    "Sunset Miles Run Club": ["Sports", 0],
    "Midnight Badminton": ["Sports", 1],
    "Street Football Nights": ["Sports", 2],
    "Climb & Coffee": ["Sports", 3],
    "Cycle to Somewhere": ["Sports", 4],
    "The Rally: Table Tennis": ["Sports", 5],
    "Pitch, Please": ["Business", 0],
    "Money Talks, Softly": ["Business", 1],
    "Brand Dinner": ["Business", 2],
    "The Side Project Salon": ["Business", 3],
    "Marketing Playground": ["Business", 4],
    "Women Who Build": ["Business", 5],
    "Film Club: After the Credits": ["Culture", 0],
    "The Poetry Kitchen": ["Culture", 1],
    "Folk, Found & Reimagined": ["Culture", 2],
    "Pottery & Playlist": ["Culture", 3],
    "Photo Walk: Blue Hour": ["Culture", 4],
    "Theatre: Read It Aloud": ["Culture", 5],
    "Sunday Supper Club": ["Social", 0],
    "The New Here Club": ["Social", 1],
    "Tiny Things Swap": ["Social", 2],
    "Coffee & Good News": ["Social", 3],
    "Game Night, Gently Competitive": ["Social", 4],
    "Dinner With Strangers": ["Social", 5],
    "Soft Start Sunday": ["Wellness", 0],
    "The Nervous System Reset": ["Wellness", 1],
    "Cook For Your Friends": ["Wellness", 2],
    "Phone Down Picnic": ["Wellness", 3],
    "Sleepover for Your Brain": ["Wellness", 4],
    "Move, Breathe, Dance": ["Wellness", 5],
    "Design Futures: AI + Creativity": ["Design", 0],
    "Campus Startup Pitch Night": ["Business", 0],
    "AI Builders Meetup": ["Tech", 0],
    "Design Jam: 90 Minutes": ["Design", 1],
    "Run Club: Sunset Miles": ["Sports", 0],
    "Open Mic After Hours": ["Music", 0],
    "Build Your Personal Brand": ["Business", 1],
    "Hack the Campus": ["Tech", 1],
    "Mindful Monday": ["Wellness", 0],
    "Photography Walk": ["Culture", 0],
    "Women in Technology Circle": ["Tech", 2],
    "Inter-College Football Cup": ["Sports", 1],
  },
  uploaded(event) {
    const media = Array.isArray(event?.media) ? event.media : [];
    const image = media.find(item => item && item.type === "image" && item.url);
    return image?.url || event?.coverImage || event?.imageUrl || event?.image || "";
  },
  fallback(event) {
    const category = Object.keys(this.images).find(key => key.toLowerCase() === String(event?.category || "").toLowerCase()) || "Social";
    const list = this.images[category];
    const title = String(event?.title || "").trim();
    const exact = this.titleIndexes[title];
    if (exact && exact[0] === category) return list[exact[1] % list.length];
    const key = String(event?._id || event?.id || title || "vybe");
    // Numeric suffixes (demo/event ids) rotate cleanly without repeating within a category set.
    const suffix = key.match(/(?:-|_)(\\d+)$/);
    if (suffix) return list[(Math.max(1, Number(suffix[1])) - 1) % list.length];
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
    return list[hash % list.length];
  },
  src(event) {
    const uploaded = this.uploaded(event);
    // The complete cover bundle lives inside /Frontend/assets so it resolves
    // under either a project-root or Frontend-root Live Server configuration.
    // Uploaded organiser media stays untouched.
    return uploaded || this.fallback(event);
  },
  focus(event) {
    const category = Object.keys(this.images).find(key => key.toLowerCase() === String(event?.category || "").toLowerCase()) || "Social";
    const title = String(event?.title || "").trim();
    const exact = this.titleIndexes[title];
    const index = exact && exact[0] === category
      ? exact[1]
      : Math.abs([...String(event?._id || event?.id || title || "vybe")].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % this.images[category].length;
    const focusPoints = {
      Tech: ["50% 45%", "50% 58%", "50% 48%", "50% 50%", "50% 46%", "50% 52%"],
      Design: ["50% 45%", "50% 50%", "50% 42%", "50% 50%", "50% 45%", "50% 52%"],
      Music: ["50% 45%", "50% 50%", "50% 43%", "50% 48%", "50% 45%", "50% 50%"],
      Sports: ["50% 48%", "50% 48%", "50% 45%", "50% 50%", "50% 48%", "50% 50%"],
      Business: ["50% 45%", "50% 50%", "50% 45%", "50% 48%", "50% 50%", "50% 46%"],
      Culture: ["50% 46%", "50% 50%", "50% 44%", "50% 50%", "50% 47%", "50% 50%"],
      Social: ["50% 48%", "50% 45%", "50% 50%", "50% 45%", "50% 48%", "50% 50%"],
      Wellness: ["50% 46%", "50% 50%", "50% 48%", "50% 45%", "50% 50%", "50% 45%"]
    };
    return focusPoints[category][index % focusPoints[category].length];
  }
};
