document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Função utilitária para escapar texto e evitar XSS
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // Ensure we don't get a cached response so UI always shows latest data
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message and previous options
      activitiesList.innerHTML = "";

      // Reset activity select and keep default option
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list markup
        let participantsHtml = "";
        if (details.participants && details.participants.length > 0) {
          participantsHtml += '<ul class="participants-list">';
          details.participants.forEach((p) => {
            // Add a remove button (✕) next to each participant. Use escaped values for attributes.
            participantsHtml += `<li class="participant-pill">${escapeHtml(p)} <button class="remove-btn" data-email="${escapeHtml(
              p
            )}" data-activity="${escapeHtml(name)}" title="Unregister">✕</button></li>`;
          });
          participantsHtml += "</ul>";
        } else {
          participantsHtml = '<p class="participants-empty">Nenhum participante ainda</p>';
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add event delegation on the activity card to handle participant removal
        activityCard.addEventListener("click", async (e) => {
          if (!e.target.classList.contains("remove-btn")) return;

          const email = e.target.dataset.email;
          const activityName = e.target.dataset.activity;

          // Optional: confirm removal
          const confirmRemoval = window.confirm(`Unregister ${email} from ${activityName}?`);
          if (!confirmRemoval) return;

          try {
            const resp = await fetch(
              `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
              { method: "DELETE" }
            );

            const json = await resp.json();
            if (resp.ok) {
              messageDiv.textContent = json.message;
              messageDiv.className = "message success";
              messageDiv.classList.remove("hidden");
              // Refresh list
              fetchActivities();
            } else {
              messageDiv.textContent = json.detail || json.message || "Failed to unregister";
              messageDiv.className = "message error";
              messageDiv.classList.remove("hidden");
            }

            setTimeout(() => messageDiv.classList.add("hidden"), 4000);
          } catch (err) {
            console.error("Error unregistering:", err);
            messageDiv.textContent = "Failed to unregister. Please try again.";
            messageDiv.className = "message error";
            messageDiv.classList.remove("hidden");
          }
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // keep the generic "message" class for consistent styling
        messageDiv.className = "message success";
        signupForm.reset();

        // Await the refresh to ensure UI reflects change immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
