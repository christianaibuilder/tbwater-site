/* TB Water Technologies — site behavior
   Mobile menu, sticky header state, scroll reveal,
   hero video controls, mailto form composer. */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Pricing layout variants (?layout=a|b|c, default a) ---------- */
  const layoutParam = new URLSearchParams(window.location.search).get("layout");
  const layout = ["a", "b", "c"].includes(layoutParam) ? layoutParam : "a";
  document.body.classList.add(`layout-${layout}`);

  /* ---------- Mobile menu ---------- */
  const menuToggle = document.querySelector(".menu-toggle");
  const siteMenu = document.querySelector("#site-menu");

  if (menuToggle && siteMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = siteMenu.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    siteMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        siteMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Sticky header state ---------- */
  const header = document.querySelector(".site-header");

  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Scroll reveal ---------- */
  const revealTargets = document.querySelectorAll("[data-reveal]");

  if (revealTargets.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((el) => el.classList.add("is-revealed"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      revealTargets.forEach((el) => observer.observe(el));
    }
  }

  /* ---------- Hero video controls ---------- */
  const heroVideo = document.querySelector(".hero-video");
  const mediaFrame = document.querySelector(".media-frame");
  const playButton = document.querySelector(".video-play-button");
  const muteButton = document.querySelector(".video-mute-button");
  const fullscreenButton = document.querySelector(".video-fullscreen-button");
  const progressInput = document.querySelector(".video-progress");
  const progressFill = document.querySelector(".video-progress-fill");

  if (heroVideo && mediaFrame && playButton) {
    mediaFrame.classList.add("is-muted");

    const setPlayingState = (playing) => {
      mediaFrame.classList.toggle("is-playing", playing);
      playButton.setAttribute("aria-pressed", String(playing));
      playButton.setAttribute("aria-label", playing ? "Pause video" : "Play video");
    };

    const togglePlay = () => {
      if (heroVideo.paused || heroVideo.ended) {
        heroVideo.play();
      } else {
        heroVideo.pause();
      }
    };

    playButton.addEventListener("click", togglePlay);
    heroVideo.addEventListener("click", togglePlay);
    heroVideo.addEventListener("play", () => setPlayingState(true));
    heroVideo.addEventListener("pause", () => setPlayingState(false));
    heroVideo.addEventListener("ended", () => setPlayingState(false));

    if (muteButton) {
      muteButton.addEventListener("click", () => {
        heroVideo.muted = !heroVideo.muted;
        mediaFrame.classList.toggle("is-muted", heroVideo.muted);
        muteButton.setAttribute("aria-pressed", String(heroVideo.muted));
        muteButton.setAttribute("aria-label", heroVideo.muted ? "Unmute video" : "Mute video");
      });
    }

    if (fullscreenButton) {
      fullscreenButton.addEventListener("click", () => {
        if (heroVideo.requestFullscreen) {
          heroVideo.requestFullscreen();
        } else if (heroVideo.webkitEnterFullscreen) {
          heroVideo.webkitEnterFullscreen();
        }
      });
    }

    if (progressInput && progressFill) {
      let isScrubbing = false;

      const paintProgress = (percent) => {
        progressFill.style.width = `${percent}%`;
      };

      heroVideo.addEventListener("timeupdate", () => {
        if (isScrubbing || !heroVideo.duration) return;
        const percent = (heroVideo.currentTime / heroVideo.duration) * 100;
        progressInput.value = String(percent);
        paintProgress(percent);
      });

      progressInput.addEventListener("input", () => {
        isScrubbing = true;
        paintProgress(progressInput.value);
      });

      progressInput.addEventListener("change", () => {
        if (heroVideo.duration) {
          heroVideo.currentTime = (Number(progressInput.value) / 100) * heroVideo.duration;
        }
        isScrubbing = false;
      });
    }
  }

  /* ---------- Product photo carousels ----------
     Slides live in HTML. To swap in a real photo, set
     data-image-src="public/images/approved/<file>" (and data-alt)
     on the .carousel-slide — the placeholder is replaced automatically. */
  document.querySelectorAll("[data-carousel]").forEach((media) => {
    const track = media.querySelector(".carousel-track");
    const slides = Array.from(media.querySelectorAll(".carousel-slide"));
    const dotsWrap = media.querySelector(".carousel-dots");
    if (!track || slides.length < 2) return;

    // Inject real images where a path has been provided (lazy-loaded).
    slides.forEach((slide) => {
      const src = slide.dataset.imageSrc;
      if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = slide.dataset.alt || "";
        img.loading = "lazy";
        const placeholder = slide.querySelector(".slide-placeholder");
        if (placeholder) placeholder.remove();
        slide.prepend(img); // prepend keeps any .slide-caption overlay intact
      }
    });

    let index = 0;
    const dots = slides.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.setAttribute("aria-label", `Go to photo ${i + 1} of ${slides.length}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    const goTo = (i) => {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, d) => {
        dot.classList.toggle("is-active", d === index);
        dot.setAttribute("aria-current", d === index ? "true" : "false");
      });
    };

    media.querySelector(".carousel-prev").addEventListener("click", () => goTo(index - 1));
    media.querySelector(".carousel-next").addEventListener("click", () => goTo(index + 1));

    // Keyboard support on the carousel region.
    media.tabIndex = 0;
    media.setAttribute("role", "group");
    media.setAttribute("aria-roledescription", "carousel");
    media.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); goTo(index - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); goTo(index + 1); }
    });

    // Swipe support (pointer events cover touch + mouse drags).
    let startX = null;
    media.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      startX = event.clientX;
    });
    media.addEventListener("pointerup", (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) goTo(dx < 0 ? index + 1 : index - 1);
    });
    media.addEventListener("pointercancel", () => { startX = null; });

    goTo(0);
  });

  /* ---------- Product card tabs (Overview / What's Inside) ----------
     Progressive enhancement: without JS the Overview panel is
     visible via its is-active class in the markup. */
  document.querySelectorAll(".product-card").forEach((card, cardIndex) => {
    const tablist = card.querySelector(".card-tabs");
    const tabs = Array.from(card.querySelectorAll(".card-tab"));
    if (!tablist || !tabs.length) return;

    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Product details");

    const panelFor = (tab) => card.querySelector(`.card-panel-${tab.dataset.tab}`);

    tabs.forEach((tab) => {
      const panel = panelFor(tab);
      tab.id = `product-${cardIndex}-tab-${tab.dataset.tab}`;
      panel.id = `product-${cardIndex}-panel-${tab.dataset.tab}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);

      tab.addEventListener("click", () => {
        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", String(active));
          t.tabIndex = active ? 0 : -1;
          const p = panelFor(t);
          p.classList.toggle("is-active", active);
          p.setAttribute("aria-hidden", String(!active));
        });
      });

      tab.setAttribute("aria-selected", String(tab.classList.contains("is-active")));
      tab.tabIndex = tab.classList.contains("is-active") ? 0 : -1;
      panel.setAttribute("aria-hidden", String(!panel.classList.contains("is-active")));
    });

    tablist.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const current = tabs.findIndex((t) => t.classList.contains("is-active"));
      const next = tabs[(current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });

  /* ---------- Check My Water: ZIP -> EWG-style contaminant report ----------
     Data lives in public/data/water-data.js (window.TB_WATER_DATA), scraped
     from the EWG Tap Water Database. No backend: the report renders locally
     and the CTA carries the lead to Dave through the existing mailto flow. */
  const waterForm = document.querySelector("#water-check-form");
  const waterReport = document.querySelector("#water-report");
  const waterData = window.TB_WATER_DATA;

  if (waterForm && waterReport && waterData) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
    const timesNum = (t) => parseFloat(String(t).replace(/,/g, "")) || 0;

    const contaminantCard = (c, isExceed) => `
      <article class="wr-card">
        <h4>${esc(c.name)}</h4>
        ${c.effect ? `<p class="wr-effect">Potential effect: ${esc(c.effect)}</p>` : ""}
        <div class="wr-chips">
          <span>This utility: ${esc(c.level)}</span>
          <span>${c.legal ? `Legal limit: ${esc(c.legal)}` : "No legal limit"}</span>
        </div>
        ${isExceed && c.times ? `
        <div class="wr-times">
          <strong>${esc(c.times)}x</strong>
          <small>EWG's health guideline${c.guideline ? `: ${esc(c.guideline)}` : ""}</small>
        </div>` : (c.guideline ? `
        <div class="wr-times"><small>EWG's health guideline: ${esc(c.guideline)}</small></div>` : "")}
      </article>`;

    const renderReport = (key, zip) => {
      const u = waterData.utilities[key];
      const ewgUrl = `https://www.ewg.org/tapwater/system.php?pws=${u.pws}`;
      const exceed = [...u.exceed].sort((a, b) => timesNum(b.times) - timesNum(a.times));

      waterReport.innerHTML = `
        <div class="wr-head">
          <h3>${esc(u.name)}</h3>
          <span class="wr-pop">Serves about ${esc(u.pop)} people &middot; ZIP ${esc(zip)}</span>
        </div>
        <p class="wr-overview">${esc(waterData.source.compliance)}</p>
        <div class="wr-summary">
          <strong>${u.exceed.length}</strong>
          <span>contaminants detected above EWG health guidelines in this utility's water &mdash; all while staying legally compliant.</span>
        </div>
        <div class="wr-tabs" role="tablist" aria-label="Contaminant lists">
          <button class="wr-tab is-active" type="button" data-wr-tab="exceed" role="tab" aria-selected="true">Exceed guidelines (${u.exceed.length})</button>
          <button class="wr-tab" type="button" data-wr-tab="other" role="tab" aria-selected="false">Other detected (${u.other.length})</button>
        </div>
        <div class="wr-grid" data-wr-panel="exceed" role="tabpanel">
          ${exceed.map((c) => contaminantCard(c, true)).join("")}
        </div>
        <div class="wr-grid" data-wr-panel="other" role="tabpanel" hidden>
          ${u.other.map((c) => contaminantCard(c, false)).join("")}
        </div>
        <div class="wr-cta">
          <p>This is exactly what our systems are built to remove.
            <small>Upfront pricing, honest recommendations, and a system matched to your exact water &mdash; no pushy pitch.</small>
          </p>
          <div class="wr-cta-actions">
            <a class="button button-primary" href="#products">See Systems &amp; Pricing</a>
            <a class="button button-outline" href="tel:+17275858686">Call (727) 585-8686</a>
          </div>
        </div>
        <p class="wr-foot">Source: <a href="${ewgUrl}" target="_blank" rel="noopener noreferrer">EWG Tap Water Database &mdash; ${esc(u.name)}</a>. ${esc(waterData.source.period)} On a private well? These reports cover city utilities only &mdash; well water needs its own free test.</p>`;

      waterReport.hidden = false;
      waterReport.querySelectorAll(".wr-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          waterReport.querySelectorAll(".wr-tab").forEach((t) => {
            const active = t === tab;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", String(active));
          });
          waterReport.querySelectorAll("[data-wr-panel]").forEach((p) => {
            p.hidden = p.dataset.wrPanel !== tab.dataset.wrTab;
          });
        });
      });
      waterReport.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    };

    const renderUnknown = (zip) => {
      const mailHref = `mailto:dave@tbwater.com?subject=${encodeURIComponent(`Water report request (ZIP ${zip})`)}&body=${encodeURIComponent(`ZIP code: ${zip}\n\nMy ZIP wasn't in the site's instant report database - I'd like the water quality report for my utility.\n\nSent from the TB Water website water report.`)}`;
      waterReport.innerHTML = `
        <div class="wr-empty">
          <h3>We don't have ZIP ${esc(zip)} on file yet.</h3>
          <p>Our instant reports cover 22 utilities across Tampa Bay and surrounding counties. Send us your ZIP and we'll pull the water quality data for your exact utility &mdash; no obligation.</p>
          <div class="wr-cta-actions" style="justify-content:center">
            <a class="button button-primary" href="${mailHref}">Request My Water Report</a>
            <a class="button button-outline" href="tel:+17275858686">Call (727) 585-8686</a>
          </div>
        </div>`;
      waterReport.hidden = false;
      waterReport.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    };

    waterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const first = (waterForm.querySelector("#check-first")?.value || "").trim();
      const last = (waterForm.querySelector("#check-last")?.value || "").trim();
      const email = (waterForm.querySelector("#check-email")?.value || "").trim();
      const zip = (waterForm.querySelector("#zip-code")?.value || "").trim();
      const zipError = waterForm.querySelector("#zip-error");

      const valid = first && last && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && /^\d{5}$/.test(zip);
      if (!valid) {
        zipError.hidden = false;
        (!first ? waterForm.querySelector("#check-first")
          : !last ? waterForm.querySelector("#check-last")
          : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? waterForm.querySelector("#check-email")
          : waterForm.querySelector("#zip-code")).focus();
        return;
      }
      zipError.hidden = true;

      const key = waterData.zipMap[zip] || waterData.prefixMap[zip.slice(0, 3)] || null;
      const utility = key && waterData.utilities[key] ? waterData.utilities[key] : null;

      // Silent lead capture once a CRM endpoint is configured (see the TODO
      // on the form in index.html). Fire-and-forget; never blocks the report.
      const endpoint = waterForm.dataset.leadEndpoint;
      if (endpoint) {
        const topConcerns = utility
          ? [...utility.exceed].sort((a, b) => timesNum(b.times) - timesNum(a.times))
              .slice(0, 3).map((c) => `${c.name} (${c.times}x)`).join(", ")
          : "";
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            first, last, email, zip,
            utility: utility ? utility.name : "(not in database)",
            topConcerns,
            source: "tbwater.com water report"
          })
        }).catch(() => {});
      }

      if (utility) renderReport(key, zip);
      else renderUnknown(zip);
    });
  }

  /* ---------- Review rotator ----------
     All reviews live in the markup, so without JS the section is
     simply the full list. JS pages through them three at a time. */
  const rotator = document.querySelector("[data-review-rotator]");

  if (rotator) {
    const grid = rotator.querySelector(".review-grid");
    const cards = Array.from(grid.querySelectorAll(".review-card"));
    const dotsWrap = rotator.querySelector(".review-dots");
    const perPage = 3;
    const pageCount = Math.ceil(cards.length / perPage);

    if (cards.length > perPage) {
      rotator.classList.add("is-enhanced");
      rotator.setAttribute("aria-roledescription", "carousel");

      let page = 0;
      let timer = null;

      // The final page wraps back to the start so it is always full.
      const indicesFor = (p) =>
        Array.from({ length: perPage }, (_, i) => (p * perPage + i) % cards.length);

      const dots = Array.from({ length: pageCount }, (_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "review-dot";
        dot.setAttribute("aria-label", `Show reviews ${i + 1} of ${pageCount}`);
        dot.addEventListener("click", () => {
          goTo(i);
          restart();
        });
        dotsWrap.appendChild(dot);
        return dot;
      });

      const render = (p) => {
        const visible = indicesFor(p);
        cards.forEach((card, i) => {
          const pos = visible.indexOf(i);
          card.hidden = pos === -1;
          if (pos !== -1) card.style.order = String(pos);
        });
        dots.forEach((dot, i) => {
          dot.classList.toggle("is-active", i === p);
          dot.setAttribute("aria-current", i === p ? "true" : "false");
        });
      };

      const goTo = (p) => {
        page = (p + pageCount) % pageCount;
        if (prefersReducedMotion) {
          render(page);
          return;
        }
        grid.classList.add("is-fading");
        window.setTimeout(() => {
          render(page);
          grid.classList.remove("is-fading");
        }, 260);
      };

      const stop = () => {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      };

      // Auto-rotate is a motion effect: skip it entirely when reduced
      // motion is requested and leave the arrows/dots as the way through.
      const start = () => {
        if (prefersReducedMotion) return;
        stop();
        timer = window.setInterval(() => goTo(page + 1), 6500);
      };

      const restart = () => { stop(); start(); };

      rotator.querySelector(".review-prev").addEventListener("click", () => {
        goTo(page - 1);
        restart();
      });
      rotator.querySelector(".review-next").addEventListener("click", () => {
        goTo(page + 1);
        restart();
      });

      rotator.addEventListener("mouseenter", stop);
      rotator.addEventListener("mouseleave", start);
      rotator.addEventListener("focusin", stop);
      rotator.addEventListener("focusout", start);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop(); else start();
      });

      render(0);
      start();
    }
  }

  /* ---------- Mailto form composer ----------
     No backend yet: forms compose a prefilled email in the
     visitor's mail app. Nothing is stored on the site. */
  document.querySelectorAll("form[data-mailto]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const address = form.dataset.mailto;
      const subject = form.dataset.subject || "Website inquiry";
      const lines = [];

      form.querySelectorAll("input, select, textarea").forEach((field) => {
        const label = field.getAttribute("name");
        const value = field.value.trim();
        if (label && value) lines.push(`${label}: ${value}`);
      });

      lines.push("", "Sent from the TB Water website.");

      const href = `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      window.location.href = href;

      const note = form.querySelector(".form-note");
      if (note) {
        note.textContent = "Your email app should have opened with everything filled in. If not, call (727) 585-8686.";
      }
    });
  });
})();
