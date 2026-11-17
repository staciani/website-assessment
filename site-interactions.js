(function () {
  "use strict";

  var themeToggle = document.getElementById("theme-toggle");
  var guideDialog = document.getElementById("site-guide-dialog");
  var openGuideButton = document.getElementById("open-site-guide");
  var closeGuideButtons = document.querySelectorAll("[data-close-site-guide]");

  function applyTheme(theme) {
    if (!themeToggle) {
      return;
    }

    var isLight = theme === "light";
    document.body.classList.toggle("site-light", isLight);
    themeToggle.textContent = isLight ? "Switch to dark mode" : "Switch to light mode";
    themeToggle.setAttribute("aria-pressed", String(isLight));
  }

  if (themeToggle) {
    applyTheme(localStorage.getItem("giorno-theme") || "dark");

    themeToggle.addEventListener("click", function () {
      var nextTheme = document.body.classList.contains("site-light") ? "dark" : "light";
      localStorage.setItem("giorno-theme", nextTheme);
      applyTheme(nextTheme);
    });
  }

  if (openGuideButton && guideDialog) {
    openGuideButton.addEventListener("click", function () {
      guideDialog.showModal();
    });

    closeGuideButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        guideDialog.close();
      });
    });

    guideDialog.addEventListener("click", function (event) {
      if (event.target === guideDialog) {
        guideDialog.close();
      }
    });
  }

  var submissionStorageKey = "giorno-contact-submissions-v1";

  function readSubmissions() {
    var serialized = localStorage.getItem(submissionStorageKey);
    if (!serialized) {
      return [];
    }

    var submissions = JSON.parse(serialized);
    if (!Array.isArray(submissions)) {
      throw new Error("Saved contact responses are not in the expected format.");
    }

    return submissions;
  }

  function setStatus(element, message, isError) {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.hidden = false;
    element.classList.toggle("is-error", Boolean(isError));
  }

  document.querySelectorAll("form[data-demo-contact-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var formData = new FormData(form);
      var firstName = String(formData.get("first_name") || "").trim();
      var lastName = String(formData.get("last_name") || "").trim();
      var name = String(formData.get("name") || (firstName + " " + lastName)).trim();
      var status = form.querySelector(".demo-form-status");

      try {
        var submissions = readSubmissions();
        submissions.unshift({
          id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
          submittedAt: new Date().toISOString(),
          source: form.getAttribute("data-form-source") || "Contact",
          name: name,
          email: String(formData.get("email") || "").trim(),
          subject: String(formData.get("subject") || "").trim(),
          message: String(formData.get("message") || "").trim(),
          status: "Received (demo)"
        });
        localStorage.setItem(submissionStorageKey, JSON.stringify(submissions));
        form.reset();
        setStatus(status, "Thanks! Your message was received for this assignment demo and saved in this browser. It was not sent to restaurant staff.", false);
      } catch (error) {
        console.error("Could not save the demo contact response.", error);
        setStatus(status, "This browser could not save your message. It was not sent; please try another browser or device.", true);
      }
    });
  });

  var inboxList = document.getElementById("chef-inbox-list");
  var inboxCount = document.getElementById("chef-inbox-count");
  var inboxStatus = document.getElementById("chef-inbox-status");
  var exportButton = document.getElementById("export-demo-responses");
  var clearButton = document.getElementById("clear-demo-responses");

  function appendDetail(card, label, value, className) {
    var detail = document.createElement("p");
    var heading = document.createElement("strong");
    heading.textContent = label + ": ";
    detail.appendChild(heading);

    var text = document.createElement("span");
    text.className = className || "";
    text.textContent = value;
    detail.appendChild(text);
    card.appendChild(detail);
  }

  function renderInbox() {
    if (!inboxList) {
      return;
    }

    inboxList.textContent = "";
    try {
      var submissions = readSubmissions();
      inboxCount.textContent = submissions.length + (submissions.length === 1 ? " response saved in this browser." : " responses saved in this browser.");
      inboxStatus.textContent = "";
      inboxStatus.hidden = true;

      if (submissions.length === 0) {
        var emptyMessage = document.createElement("p");
        emptyMessage.className = "chef-inbox-empty";
        emptyMessage.textContent = "No demo responses have been recorded in this browser yet.";
        inboxList.appendChild(emptyMessage);
        return;
      }

      submissions.sort(function (left, right) {
        return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      });

      submissions.forEach(function (submission) {
        var card = document.createElement("article");
        card.className = "chef-submission-card";

        var header = document.createElement("div");
        header.className = "chef-submission-header";

        var title = document.createElement("h3");
        title.textContent = submission.subject || "Contact message";
        header.appendChild(title);

        var time = document.createElement("time");
        var date = new Date(submission.submittedAt);
        if (!Number.isNaN(date.getTime())) {
          time.dateTime = date.toISOString();
          time.textContent = date.toLocaleString();
        } else {
          time.textContent = "Date unavailable";
        }
        header.appendChild(time);
        card.appendChild(header);

        appendDetail(card, "From", submission.name || "Name not provided");
        if (submission.email) {
          appendDetail(card, "Email", submission.email);
        }
        appendDetail(card, "Submitted from", submission.source || "Contact");
        appendDetail(card, "Status", submission.status || "Received (demo)", "chef-submission-status");

        var message = document.createElement("p");
        message.className = "chef-submission-message";
        message.textContent = submission.message || "No message entered.";
        card.appendChild(message);
        inboxList.appendChild(card);
      });
    } catch (error) {
      console.error("Could not load the demo contact responses.", error);
      inboxCount.textContent = "";
      setStatus(inboxStatus, "The inbox could not read saved responses in this browser.", true);
    }
  }

  if (inboxList) {
    renderInbox();
    window.addEventListener("storage", function (event) {
      if (event.key === submissionStorageKey) {
        renderInbox();
      }
    });
  }

  if (exportButton) {
    exportButton.addEventListener("click", function () {
      try {
        var submissions = readSubmissions();
        var backup = new Blob([JSON.stringify(submissions, null, 2)], { type: "application/json" });
        var downloadUrl = URL.createObjectURL(backup);
        var downloadLink = document.createElement("a");
        downloadLink.href = downloadUrl;
        downloadLink.download = "giorno-e-notte-contact-responses.json";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        URL.revokeObjectURL(downloadUrl);
        setStatus(inboxStatus, "Backup downloaded. Store it somewhere safe; the inbox is still local to this browser.", false);
      } catch (error) {
        console.error("Could not export the demo contact responses.", error);
        setStatus(inboxStatus, "The backup could not be downloaded from this browser.", true);
      }
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", function () {
      if (!window.confirm("Delete all demo responses saved in this browser?")) {
        return;
      }

      try {
        localStorage.removeItem(submissionStorageKey);
        renderInbox();
        setStatus(inboxStatus, "All demo responses saved in this browser have been deleted.", false);
      } catch (error) {
        console.error("Could not clear the demo contact responses.", error);
        setStatus(inboxStatus, "The saved responses could not be deleted in this browser.", true);
      }
    });
  }
})();
