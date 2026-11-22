"use strict";

const CONFIG = Object.freeze({
  linkFile: "/link.txt",
  linkRefreshMs: 45_000,
  previewMode: new URLSearchParams(location.search).get("preview") === "1",
  previewStorageKey: "velora:preview:v1",
  api: Object.freeze({
    profiles: "/api/profiles",
    actions: "/api/actions",
    likes: "/api/likes",
    conversations: "/api/conversations"
  })
});

const PREVIEW_PROFILES = [
  {
    id: "maya-preview", name: "Maya", age: 25, city: "Khulna",
    role: "Creative producer", intent: "Meaningful dating",
    bio: "I spend weekends looking for independent bookshops, good coffee and new places to photograph.",
    interests: ["Photography", "Independent cinema", "Coffee", "Travel"],
    verified: false,
    photos: [
      { url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a woman outdoors" },
      { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a woman in natural light" },
      { url: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a woman by the sea" }
    ]
  },
  {
    id: "sami-preview", name: "Sami", age: 26, city: "Khulna",
    role: "Product designer", intent: "Long-term relationship",
    bio: "Interested in thoughtful design, small businesses and the places that make a city feel familiar.",
    interests: ["Design", "Street food", "Cycling", "Architecture"],
    verified: false,
    photos: [
      { url: "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a man" },
      { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a man in a dark shirt" }
    ]
  },
  {
    id: "isha-preview", name: "Isha", age: 26, city: "Khulna",
    role: "Architect", intent: "Meaningful dating",
    bio: "Drawn to well-made spaces, live music and conversations that make an ordinary evening memorable.",
    interests: ["Architecture", "Live music", "Plants", "Weekend trips"],
    verified: false,
    photos: [
      { url: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a woman outdoors" },
      { url: "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a woman" }
    ]
  },
  {
    id: "arif-preview", name: "Arif", age: 27, city: "Dhaka",
    role: "Product designer", intent: "New connections",
    bio: "Building useful things by day. Looking for new restaurants, long walks and good conversation.",
    interests: ["Design", "Coffee", "Cycling", "Films"],
    verified: false,
    photos: [
      { url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a man" },
      { url: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a man smiling" }
    ]
  },
  {
    id: "nora-preview", name: "Nora", age: 24, city: "Chattogram",
    role: "Photographer", intent: "New connections",
    bio: "Usually carrying a camera, a notebook and a playlist for the way home.",
    interests: ["Photography", "Ocean", "Books", "Food"],
    verified: false,
    photos: [
      { url: "https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a woman" },
      { url: "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=1200&q=88", alt: "Portrait of a woman in natural light" }
    ]
  }
];

const $ = (id) => document.getElementById(id);
const state = {
  city: "Khulna",
  minAge: 21,
  maxAge: 35,
  intent: "Any",
  verifiedOnly: false,
  profiles: [],
  profileIndex: 0,
  photoIndex: 0,
  currentPanel: "likes",
  currentConversation: null,
  likes: [],
  conversations: [],
  destination: "",
  drag: null,
  loading: false,
  preview: CONFIG.previewMode,
  previewData: loadPreviewState()
};

function loadPreviewState() {
  try {
    const value = JSON.parse(localStorage.getItem(CONFIG.previewStorageKey) || "{}");
    return {
      likes: Array.isArray(value.likes) ? value.likes : [],
      passed: Array.isArray(value.passed) ? value.passed : [],
      conversations: value.conversations && typeof value.conversations === "object" ? value.conversations : {}
    };
  } catch {
    return { likes: [], passed: [], conversations: {} };
  }
}

function savePreviewState() {
  if (!state.preview) return;
  try {
    localStorage.setItem(CONFIG.previewStorageKey, JSON.stringify(state.previewData));
  } catch (error) {
    console.warn("VELORA preview state could not be saved.", error);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function safePhoto(photo) {
  const source = typeof photo === "string" ? photo : photo?.url;
  if (!source) return "";
  try {
    const url = new URL(source, location.origin);
    if (url.protocol !== "https:" && url.origin !== location.origin) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function photoAlt(photo, profile) {
  return (typeof photo === "object" && photo?.alt) || `${profile.name}'s profile photograph`;
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " is-error" : ""}`;
  toast.textContent = message;
  $("toastRegion").append(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 3400);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.message || `Request failed (${response.status}).`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function currentProfile() {
  return state.profiles[state.profileIndex] || null;
}

function activeFiltersCount() {
  let count = 0;
  if (state.minAge !== 21 || state.maxAge !== 35) count += 1;
  if (state.intent !== "Any") count += 1;
  if (state.verifiedOnly) count += 1;
  return count;
}

function updateCityText() {
  const label = state.city === "Anywhere" ? "Anywhere" : state.city;
  $("cityTitle").textContent = label;
  $("cityEyebrow").textContent = label;
}

function updateFilterCount() {
  const count = activeFiltersCount();
  $("filterCount").hidden = count === 0;
  $("filterCount").textContent = String(count);
}

function buildProfileQuery() {
  const query = new URLSearchParams({
    city: state.city,
    minAge: String(state.minAge),
    maxAge: String(state.maxAge),
    intent: state.intent,
    verifiedOnly: String(state.verifiedOnly)
  });
  return query.toString();
}

function filterPreviewProfiles() {
  return PREVIEW_PROFILES.filter((profile) => {
    if (state.previewData.passed.includes(profile.id)) return false;
    if (state.city !== "Anywhere" && profile.city !== state.city) return false;
    if (profile.age < state.minAge || profile.age > state.maxAge) return false;
    if (state.verifiedOnly && !profile.verified) return false;
    if (state.intent === "Meaningful dating" && profile.intent !== "Meaningful dating") return false;
    if (state.intent === "Long-term" && profile.intent !== "Long-term relationship") return false;
    if (state.intent === "New connections" && profile.intent !== "New connections") return false;
    return true;
  });
}

function setPanelState(kind, title, message, primaryLabel = "", secondaryLabel = "") {
  $("profileCard").hidden = true;
  $("statePanel").hidden = false;
  $("stateTitle").textContent = title;
  $("stateMessage").textContent = message;
  $("statePrimary").hidden = !primaryLabel;
  $("statePrimary").textContent = primaryLabel;
  $("stateSecondary").hidden = !secondaryLabel;
  $("stateSecondary").textContent = secondaryLabel;
  $("statePreview").hidden = kind !== "error" || state.preview;
  $("previewNotice").hidden = !state.preview;
  $("statePanel").dataset.state = kind;
  $("resultsLabel").textContent = kind === "loading" ? "Loading profiles" : "Profile discovery";
}

async function loadProfiles() {
  if (state.loading) return;
  state.loading = true;
  setPanelState("loading", "Loading profiles", "Please wait while member profiles load.");
  try {
    if (state.preview) {
      state.profiles = filterPreviewProfiles();
    } else {
      const data = await requestJson(`${CONFIG.api.profiles}?${buildProfileQuery()}`);
      if (!data || !Array.isArray(data.profiles)) throw new Error("The profile service returned an invalid response.");
      state.profiles = data.profiles;
    }
    state.profileIndex = 0;
    state.photoIndex = 0;
    if (!state.profiles.length) {
      setPanelState("empty", "No profiles to show", "Change your city or widen your filters to see more profiles.", "", "Change filters");
    } else {
      renderProfile();
    }
  } catch (error) {
    console.error("Profile loading failed:", error);
    setPanelState("error", "Profiles could not be loaded", "The frontend is online, but its profile API (/api/profiles) is not available. Connect a backend to load real members, or open the sample preview to review the interface.", "Retry profiles", "Change filters");
  } finally {
    state.loading = false;
    updateFilterCount();
  }
}

function renderProfile() {
  const profile = currentProfile();
  if (!profile) {
    setPanelState("empty", "No profiles to show", "Change your city or widen your filters to see more profiles.", "", "Change filters");
    return;
  }

  $("statePanel").hidden = true;
  $("profileCard").hidden = false;
  $("resultsLabel").textContent = state.preview ? "Sample profile · preview only" : "Member profile";
  $("previewNotice").hidden = !state.preview;

  const photo = profile.photos?.[state.photoIndex] || profile.photos?.[0];
  const image = safePhoto(photo);
  $("profilePhoto").src = image;
  $("profilePhoto").alt = photoAlt(photo, profile);
  $("profilePhoto").onerror = () => {
    $("profilePhoto").removeAttribute("src");
    $("profilePhoto").alt = "Profile photograph unavailable";
  };

  $("profileCity").textContent = profile.city || "";
  $("verifiedLabel").hidden = profile.verified !== true;
  $("profileName").textContent = profile.name || "";
  $("profileAge").textContent = profile.age ? String(profile.age) : "";
  $("profileRole").textContent = profile.role || "";
  $("profileIntent").textContent = profile.intent || "";
  $("profileBio").textContent = profile.bio || "";
  $("interestsTitle").hidden = !Array.isArray(profile.interests) || profile.interests.length === 0;
  $("interestList").innerHTML = (profile.interests || [])
    .map((interest) => `<li>${escapeHtml(interest)}</li>`).join("");

  const photos = Array.isArray(profile.photos) ? profile.photos : [];
  $("photoControls").innerHTML = photos.map((item, index) => `
    <button class="photo-dot" type="button" data-photo-index="${index}"
      aria-label="Show photograph ${index + 1}" aria-current="${index === state.photoIndex ? "true" : "false"}"></button>
  `).join("");
  $("photoControls").querySelectorAll("[data-photo-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.photoIndex = Number(button.dataset.photoIndex);
      renderProfile();
    });
  });

  $("profileCard").classList.remove("is-entering");
  void $("profileCard").offsetWidth;
  $("profileCard").classList.add("is-entering");
}

async function submitProfileAction(action) {
  const profile = currentProfile();
  if (!profile || state.loading) return;
  const buttons = ["passButton", "superButton", "likeButton"].map($);
  buttons.forEach((button) => { button.disabled = true; });

  try {
    if (state.preview) {
      if (action === "pass") {
        state.previewData.passed.push(profile.id);
      } else if (!state.previewData.likes.includes(profile.id)) {
        state.previewData.likes.push(profile.id);
      }
      savePreviewState();
    } else {
      await requestJson(CONFIG.api.actions, {
        method: "POST",
        body: JSON.stringify({ profileId: profile.id, action })
      });
    }
    await loadProfiles();
    if (action === "pass") showToast("Profile passed.");
    if (action === "like") showToast("Like sent.", false);
    if (action === "super_like") showToast("Super like sent.", false);
  } catch (error) {
    console.error("Profile action failed:", error);
    showToast("Your action could not be saved. Please try again.", true);
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function refreshGlobalDestination() {
  try {
    const response = await fetch(`${CONFIG.linkFile}?v=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) throw new Error(`link.txt returned ${response.status}`);
    const contents = await response.text();
    const firstUrl = contents.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#") && !line.startsWith("//"));
    const candidate = firstUrl ? new URL(firstUrl) : null;
    state.destination = candidate && ["https:", "http:"].includes(candidate.protocol) ? candidate.toString() : "";
  } catch (error) {
    console.warn("Global destination could not be checked:", error);
    state.destination = "";
  }
  $("globalLinkButton").hidden = !state.destination;
}

function openGlobalDestination() {
  if (!state.destination) {
    showToast("No destination is configured in link.txt.", true);
    return;
  }
  window.location.assign(state.destination);
}

function openFilters() {
  $("ageRange").value = `${state.minAge}-${state.maxAge}`;
  $("intentSelect").value = state.intent;
  $("verifiedOnly").checked = state.verifiedOnly;
  $("filtersDialog").showModal();
}

function applyFilters(event) {
  event.preventDefault();
  const [minAge, maxAge] = $("ageRange").value.split("-").map(Number);
  state.minAge = minAge;
  state.maxAge = maxAge;
  state.intent = $("intentSelect").value;
  state.verifiedOnly = $("verifiedOnly").checked;
  $("filtersDialog").close();
  loadProfiles();
}

function resetFilters() {
  state.minAge = 21;
  state.maxAge = 35;
  state.intent = "Any";
  state.verifiedOnly = false;
  $("ageRange").value = "21-35";
  $("intentSelect").value = "Any";
  $("verifiedOnly").checked = false;
  updateFilterCount();
}

function openPanel(panel) {
  state.currentPanel = panel;
  state.currentConversation = null;
  $("panelDialog").showModal();
  renderPanel();
}

function setPanelTab(panel) {
  state.currentPanel = panel;
  state.currentConversation = null;
  renderPanel();
}

function renderPanel() {
  const isLikes = state.currentPanel === "likes";
  $("panelTitle").textContent = isLikes ? "Likes" : "Messages";
  $("panelEyebrow").textContent = isLikes ? "Profiles you liked" : "Your conversations";
  document.querySelectorAll("[data-panel-tab]").forEach((button) => {
    const active = button.dataset.panelTab === state.currentPanel;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  if (state.currentConversation) {
    renderConversation(state.currentConversation);
    return;
  }

  $("panelContent").innerHTML = `<div class="empty-list"><strong>Loading ${isLikes ? "likes" : "messages"}</strong><p>Please wait.</p></div>`;
  loadPanelData(isLikes ? "likes" : "messages");
}

async function loadPanelData(kind) {
  try {
    let items;
    if (state.preview) {
      if (kind === "likes") {
        items = state.previewData.likes
          .map((id) => PREVIEW_PROFILES.find((profile) => profile.id === id))
          .filter(Boolean)
          .map((profile) => ({ id: profile.id, profile, lastMessage: null }));
      } else {
        items = Object.entries(state.previewData.conversations).map(([id, messages]) => {
          const profile = PREVIEW_PROFILES.find((item) => item.id === id);
          return profile ? { id, profile, lastMessage: messages[messages.length - 1] } : null;
        }).filter(Boolean);
      }
    } else {
      const data = await requestJson(kind === "likes" ? CONFIG.api.likes : CONFIG.api.conversations);
      items = kind === "likes" ? (data?.profiles || []).map((profile) => ({ id: profile.id, profile })) : (data?.conversations || []);
    }
    renderPanelItems(kind, items);
  } catch (error) {
    console.error(`${kind} could not be loaded:`, error);
    $("panelContent").innerHTML = `<div class="empty-list"><strong>${kind === "likes" ? "Likes" : "Messages"} are unavailable</strong><p>We could not load this information. Close this panel and try again.</p></div>`;
  }
}

function renderPanelItems(kind, items) {
  if (!items.length) {
    const message = kind === "likes"
      ? "Profiles you like will appear here."
      : "Your conversations will appear here.";
    $("panelContent").innerHTML = `<div class="empty-list"><strong>No ${kind} yet</strong><p>${message}</p></div>`;
    return;
  }
  $("panelContent").innerHTML = items.map((item) => {
    const profile = item.profile || {};
    const photo = safePhoto(profile.photos?.[0]);
    const preview = kind === "likes" ? "Open profile" : (item.lastMessage?.text || "Open conversation");
    return `
      <button class="member-row" type="button" data-member-id="${escapeHtml(item.id)}" data-member-kind="${kind}">
        <img class="member-thumb" src="${escapeHtml(photo)}" alt="">
        <span class="member-copy"><strong>${escapeHtml(profile.name || "Member")}${profile.age ? `, ${escapeHtml(profile.age)}` : ""}</strong><span>${escapeHtml(preview)}</span></span>
        <svg class="member-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </button>`;
  }).join("");
  $("panelContent").querySelectorAll("[data-member-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (kind === "likes") {
        const id = button.dataset.memberId;
        if (state.preview) {
          const profile = PREVIEW_PROFILES.find((item) => item.id === id);
          if (profile) {
            $("panelDialog").close();
            state.profiles = filterPreviewProfiles();
            state.profileIndex = state.profiles.findIndex((item) => item.id === id);
            if (state.profileIndex < 0) state.profileIndex = 0;
            renderProfile();
          }
        } else {
          $("panelDialog").close();
          showToast("Open liked profiles from your account feed.");
        }
      } else {
        openConversation(button.dataset.memberId);
      }
    });
  });
}

async function openConversation(id) {
  state.currentConversation = id;
  const panel = $("panelContent");
  panel.innerHTML = `<div class="empty-list"><strong>Loading conversation</strong><p>Please wait.</p></div>`;
  try {
    let messages;
    if (state.preview) {
      messages = state.previewData.conversations[id] || [];
    } else {
      const data = await requestJson(`${CONFIG.api.conversations}/${encodeURIComponent(id)}/messages`);
      messages = data?.messages || [];
    }
    renderConversation(id, messages);
  } catch (error) {
    console.error("Conversation could not be loaded:", error);
    panel.innerHTML = `<div class="empty-list"><strong>Conversation unavailable</strong><p>We could not load these messages. Try again later.</p></div>`;
  }
}

function renderConversation(id, messages = state.previewData.conversations[id] || []) {
  const profile = PREVIEW_PROFILES.find((item) => item.id === id);
  $("panelTitle").textContent = profile ? `Conversation with ${profile.name}` : "Conversation";
  $("panelEyebrow").textContent = "Messages";
  $("panelContent").innerHTML = `
    <div class="conversation-view">
      <button class="conversation-back" type="button" id="conversationBack">← Back to messages</button>
      <div class="message-list" id="messageList">
        ${messages.map((message) => `<div class="message-bubble ${message.from === "me" ? "is-mine" : ""}">${escapeHtml(message.text)}</div>`).join("")}
      </div>
      <form class="message-form" id="messageForm">
        <label class="sr-only" for="messageInput">Write a message</label>
        <input id="messageInput" name="message" maxlength="500" autocomplete="off" placeholder="Write a message…" required>
        <button class="button button-primary" type="submit">Send</button>
      </form>
    </div>`;
  $("conversationBack").addEventListener("click", () => {
    state.currentConversation = null;
    renderPanel();
  });
  $("messageForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("messageInput");
    const text = input.value.trim();
    if (!text) return;
    try {
      if (state.preview) {
        state.previewData.conversations[id] ||= [];
        state.previewData.conversations[id].push({ from: "me", text, createdAt: new Date().toISOString() });
        savePreviewState();
        renderConversation(id, state.previewData.conversations[id]);
      } else {
        await requestJson(`${CONFIG.api.conversations}/${encodeURIComponent(id)}/messages`, {
          method: "POST",
          body: JSON.stringify({ text })
        });
        await openConversation(id);
      }
    } catch (error) {
      console.error("Message send failed:", error);
      showToast("Message could not be sent. Please try again.", true);
    }
  });
  $("messageList").scrollTop = $("messageList").scrollHeight;
}

function openIntroduction() {
  const profile = currentProfile();
  if (!profile) return;
  $("introRecipient").textContent = `To ${profile.name}`;
  $("introMessage").value = "";
  $("introError").hidden = true;
  $("introDialog").showModal();
  $("introMessage").focus();
}

async function sendIntroduction(event) {
  event.preventDefault();
  const profile = currentProfile();
  const message = $("introMessage").value.trim();
  if (!profile || !message) return;
  const submit = $("introForm").querySelector('[type="submit"]');
  submit.disabled = true;
  $("introError").hidden = true;
  try {
    if (state.preview) {
      state.previewData.likes = [...new Set([...state.previewData.likes, profile.id])];
      state.previewData.conversations[profile.id] ||= [];
      state.previewData.conversations[profile.id].push({ from: "me", text: message, createdAt: new Date().toISOString() });
      savePreviewState();
    } else {
      await requestJson(CONFIG.api.conversations, {
        method: "POST",
        body: JSON.stringify({ profileId: profile.id, initialMessage: message })
      });
    }
    $("introDialog").close();
    showToast("Introduction sent.");
    await loadProfiles();
  } catch (error) {
    console.error("Introduction failed:", error);
    $("introError").textContent = "Your introduction could not be sent. Please try again.";
    $("introError").hidden = false;
  } finally {
    submit.disabled = false;
  }
}

function wireEvents() {
  $("citySelect").addEventListener("change", (event) => {
    state.city = event.target.value;
    updateCityText();
    loadProfiles();
  });
  $("filtersButton").addEventListener("click", openFilters);
  $("filtersForm").addEventListener("submit", applyFilters);
  $("resetFilters").addEventListener("click", resetFilters);
  $("statePrimary").addEventListener("click", loadProfiles);
  $("stateSecondary").addEventListener("click", openFilters);
  $("statePreview").addEventListener("click", () => {
    state.preview = true;
    state.profiles = [];
    state.profileIndex = 0;
    state.photoIndex = 0;
    loadProfiles();
  });

  $("passButton").addEventListener("click", () => submitProfileAction("pass"));
  $("superButton").addEventListener("click", () => submitProfileAction("super_like"));
  $("likeButton").addEventListener("click", () => submitProfileAction("like"));

  document.querySelectorAll("[data-open-panel]").forEach((button) => {
    button.addEventListener("click", () => openPanel(button.dataset.openPanel));
  });
  document.querySelectorAll("[data-panel-tab]").forEach((button) => {
    button.addEventListener("click", () => setPanelTab(button.dataset.panelTab));
  });
  $("panelClose").addEventListener("click", () => $("panelDialog").close());
  $("introClose").addEventListener("click", () => $("introDialog").close());
  $("introCancel").addEventListener("click", () => $("introDialog").close());
  $("introForm").addEventListener("submit", sendIntroduction);
  $("globalLinkButton").addEventListener("click", openGlobalDestination);
  $("accountButton").addEventListener("click", openIntroduction);

  $("profileCard").addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    state.drag = { x: event.clientX, y: event.clientY };
    try { $("swipeSurface").setPointerCapture(event.pointerId); } catch {}
  });
  $("profileCard").addEventListener("pointermove", (event) => {
    if (!state.drag) return;
    const dx = event.clientX - state.drag.x;
    $("profileCard").style.transform = `translateX(${dx * .16}px) rotate(${dx * .012}deg)`;
    $("swipeFeedback").textContent = dx > 0 ? "LIKE" : "PASS";
    $("swipeSurface").classList.toggle("drag-like", dx > 28);
    $("swipeSurface").classList.toggle("drag-pass", dx < -28);
  });
  const finishSwipe = (event) => {
    if (!state.drag) return;
    const dx = event.clientX - state.drag.x;
    state.drag = null;
    $("profileCard").style.transform = "";
    $("swipeSurface").classList.remove("drag-like", "drag-pass");
    if (Math.abs(dx) > 90) submitProfileAction(dx > 0 ? "like" : "pass");
  };
  $("profileCard").addEventListener("pointerup", finishSwipe);
  $("profileCard").addEventListener("pointercancel", () => {
    state.drag = null;
    $("profileCard").style.transform = "";
    $("swipeSurface").classList.remove("drag-like", "drag-pass");
  });

  document.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    if ($("filtersDialog").open || $("panelDialog").open || $("introDialog").open) return;
    if (event.key === "ArrowLeft") submitProfileAction("pass");
    if (event.key === "ArrowRight") submitProfileAction("like");
    if (event.key === "ArrowUp") submitProfileAction("super_like");
  });
}

async function init() {
  $("currentYear").textContent = String(new Date().getFullYear());
  $("photoCredits").hidden = !state.preview;
  $("previewNotice").hidden = !state.preview;
  $("filtersForm").addEventListener("reset", resetFilters);
  wireEvents();
  updateCityText();
  updateFilterCount();
  await Promise.all([loadProfiles(), refreshGlobalDestination()]);
  window.setInterval(refreshGlobalDestination, CONFIG.linkRefreshMs);
}

init();
