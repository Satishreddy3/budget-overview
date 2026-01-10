export default function suggestCategory(note = "") {
  const n = note.toLowerCase();

  const rules = [
    { keys: ["rent", "house", "flat"], category: "Rent" },
    { keys: ["food", "swiggy", "zomato", "restaurant", "dinner", "lunch"], category: "Food" },
    { keys: ["uber", "ola", "fuel", "petrol", "diesel", "bus", "train"], category: "Transport" },
    { keys: ["shopping", "amazon", "flipkart", "mall"], category: "Shopping" },
    { keys: ["movie", "netflix", "prime", "hotstar"], category: "Entertainment" },
    { keys: ["doctor", "hospital", "medicine", "pharmacy"], category: "Health" },
    { keys: ["salary", "paycheck"], category: "Salary" },
  ];

  const matches = [];
  for (const r of rules) {
    if (r.keys.some((k) => n.includes(k))) matches.push(r.category);
  }

  // unique
  return [...new Set(matches)].slice(0, 5);
}