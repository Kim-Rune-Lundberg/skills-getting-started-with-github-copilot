document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4></h4>
          <p class="activity-description"></p>
          <p><strong>Schedule:</strong> <span class="activity-schedule"></span></p>
          <p><strong>Availability:</strong> <span class="activity-availability">${spotsLeft} spots left</span></p>
          <div class="participants-section">
            <h5>Participants</h5>
            <ul class="participant-list"></ul>
          </div>
        `;

        activityCard.querySelector("h4").textContent = name;
        activityCard.querySelector(".activity-description").textContent = details.description;
        activityCard.querySelector(".activity-schedule").textContent = details.schedule;

        const participantList = activityCard.querySelector(".participant-list");
        function renderParticipants() {
          participantList.replaceChildren();

          if (details.participants.length === 0) {
            const emptyItem = document.createElement("li");
            emptyItem.className = "empty-participants";
            emptyItem.textContent = "No participants yet";
            participantList.appendChild(emptyItem);
            return;
          }

          details.participants.forEach((email) => {
            const participantItem = document.createElement("li");
            participantItem.className = "participant-item";

            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = email;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-participant-button";
            removeButton.textContent = "\u{1F5D1}";
            removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            removeButton.title = `Unregister ${email}`;
            removeButton.addEventListener("click", async () => {
              removeButton.disabled = true;

              try {
                const response = await fetch(
                  `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`,
                  { method: "DELETE" }
                );
                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.detail || "Failed to unregister participant");
                }

                details.participants = details.participants.filter((participant) => participant !== email);
                renderParticipants();
                activityCard.querySelector(".activity-availability").textContent =
                  `${details.max_participants - details.participants.length} spots left`;
                messageDiv.textContent = result.message;
                messageDiv.className = "success";
              } catch (error) {
                removeButton.disabled = false;
                messageDiv.textContent = error.message || "Failed to unregister participant";
                messageDiv.className = "error";
                console.error("Error unregistering participant:", error);
              }

              messageDiv.classList.remove("hidden");
              setTimeout(() => messageDiv.classList.add("hidden"), 5000);
            });

            participantItem.appendChild(participantEmail);
            participantItem.appendChild(removeButton);
            participantList.appendChild(participantItem);
          });
        }

        renderParticipants();

        activitiesList.appendChild(activityCard);

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
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
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

def test_signup_adds_participant(client):
    # Arrange
    activity_name = "Art Club"
    email = "student@example.com"

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert email in activities[activity_name]["participants"]
