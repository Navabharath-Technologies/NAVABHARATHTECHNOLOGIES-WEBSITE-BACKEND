const body = JSON.stringify({
  title: "Digital Marketing Executive",
  team: "Marketing",
  location: "Mysore, India",
  type: "Full-time",
  experience: "1-3 Years",
  description: "We are looking for a driven Digital Marketing Executive to develop, implement, track and optimize digital marketing campaigns across all channels including SEO, social media, email, and PPC.",
  isActive: true
});

fetch("https://company-website-backend-9lia.onrender.com/api/admin/jobs", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-admin-key": process.env.ADMIN_API_KEY || "REPLACE_WITH_YOUR_ADMIN_KEY"
  },
  body
})
  .then(r => r.json())
  .then(d => console.log("Result:", JSON.stringify(d, null, 2)))
  .catch(e => console.error("Error:", e.message));
