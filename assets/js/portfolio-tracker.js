(function () {
  const WORKER_URL = "https://portfolio-tracker.ryalen95.workers.dev";

  const STORAGE_KEY = "portfolio-campaign-tracker-v1";
  const EXPIRATION_DAYS = 14;
  const WAIT_BEFORE_NOTIFY_MS = 8000;

  function normalizeCampaign(value) {
    if (!value) return "";

    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .slice(0, 80);
  }

  function getStoredCampaign() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);

      if (!data.campaign || !data.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      if (Date.now() > data.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  function saveCampaign(campaign) {
    try {
      const now = Date.now();

      const data = {
        campaign,
        firstSeenAt: now,
        lastSeenAt: now,
        expiresAt: now + EXPIRATION_DAYS * 24 * 60 * 60 * 1000
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage peut être bloqué par certains navigateurs/extensions.
    }
  }

  function refreshStoredCampaign(data) {
    try {
      const now = Date.now();

      const refreshed = {
        ...data,
        lastSeenAt: now,
        expiresAt: now + EXPIRATION_DAYS * 24 * 60 * 60 * 1000
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
    } catch {
      // localStorage peut être bloqué par certains navigateurs/extensions.
    }
  }

  function getCampaignContext() {
    const params = new URLSearchParams(window.location.search);

    const campaignFromUrl = normalizeCampaign(
      params.get("campaign") ||
      params.get("utm_campaign")
    );

    const storedCampaign = getStoredCampaign();

    if (campaignFromUrl) {
      if (storedCampaign && storedCampaign.campaign === campaignFromUrl) {
        refreshStoredCampaign(storedCampaign);

        return {
          campaign: campaignFromUrl,
          eventType: "return_visit",
          isAnonymous: false
        };
      }

      saveCampaign(campaignFromUrl);

      return {
        campaign: campaignFromUrl,
        eventType: "initial_visit",
        isAnonymous: false
      };
    }

    if (storedCampaign) {
      refreshStoredCampaign(storedCampaign);

      return {
        campaign: storedCampaign.campaign,
        eventType: "return_visit",
        isAnonymous: false
      };
    }

    return {
      campaign: "",
      eventType: "",
      isAnonymous: true
    };
  }

  function notifyPortfolioEvent({
    campaign,
    eventType,
    label = "",
    targetUrl = "",
    isAnonymous = false,
    delayMs = 0,
    dedupeScope = "session"
  }) {
    if (!eventType) return;

    const dedupeKeyParts = [
      "portfolio-telegram-notified",
      dedupeScope,
      isAnonymous ? "anonymous" : campaign,
      eventType,
      label || targetUrl || "default"
    ];

    const dedupeKey = dedupeKeyParts.join(":");

    if (sessionStorage.getItem(dedupeKey)) return;

    const send = () => {
      if (sessionStorage.getItem(dedupeKey)) return;

      sessionStorage.setItem(dedupeKey, "1");

      fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          campaign,
          eventType,
          label,
          targetUrl,
          referrer: document.referrer || "",
          isAnonymous
        }),
        keepalive: true
      }).catch(() => {});
    };

    if (delayMs > 0) {
      setTimeout(send, delayMs);
    } else {
      send();
    }
  }

  const context = getCampaignContext();

  if (!context.isAnonymous && context.eventType) {
    notifyPortfolioEvent({
      campaign: context.campaign,
      eventType: context.eventType,
      isAnonymous: false,
      delayMs: WAIT_BEFORE_NOTIFY_MS,
      dedupeScope: "session"
    });
  }

  document.addEventListener("click", function (event) {
    const trackableElement = event.target.closest("[data-track-event], a");

    if (!trackableElement) return;

    const explicitEventType = trackableElement.dataset.trackEvent || "";
    const explicitLabel = trackableElement.dataset.trackLabel || "";

    const href = trackableElement.href || "";
    const isGithubLink = href.includes("github.com");

    let eventType = explicitEventType;

    if (!eventType && isGithubLink) {
      eventType = "github_click";
    }

    if (!eventType) return;

    const label =
      explicitLabel ||
      trackableElement.getAttribute("aria-label") ||
      trackableElement.textContent.trim().replace(/\s+/g, " ").slice(0, 120) ||
      "élément non précisé";

    const freshContext = getCampaignContext();

    notifyPortfolioEvent({
      campaign: freshContext.campaign,
      eventType,
      label,
      targetUrl: href || window.location.href,
      isAnonymous: freshContext.isAnonymous,
      delayMs: 0,
      dedupeScope: "session"
    });
  });
})();
