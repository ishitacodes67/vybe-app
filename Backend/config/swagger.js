const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "VYBE Backend API",
      version: "1.0.0",
      description:
        "College event platform with AI-powered recommendations. " +
        "Auth via JWT (Bearer tokens). Roles: member, organizer, authority.",
      contact: { name: "VYBE Team" }
    },
    servers: [
      { url: "https://vybe-backend-0qa7.onrender.com", description: "Production" },
      { url: "http://localhost:5000", description: "Local" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    tags: [
      { name: "Auth", description: "Register, login, password reset" },
      { name: "Users", description: "Profile, interests, onboarding" },
      { name: "Events", description: "Create, list, filter, recommended" },
      { name: "Registrations", description: "Register, cancel, approve" },
      { name: "Organizer", description: "Organizer dashboard endpoints" },
      { name: "Authority", description: "Admin approval + user management" },
      { name: "Feedback", description: "Post-event ratings" },
      { name: "Notifications", description: "User notifications" },
      { name: "Chat", description: "Vix AI assistant" }
    ]
  },
  apis: ["./Routes/*.js"]
};

module.exports = swaggerJsdoc(options);