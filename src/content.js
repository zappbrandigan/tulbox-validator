(function tulboxValidator() {
  "use strict";

  const FIELD_IDS = {
    musicTextRelationship: "work-tmr",
    type: "work-type",
    genre: "work-genre"
  };

  const BUTTON_LABELS = new Set(["Save", "Submit", "Submit Changes"]);
  const MESSAGE_ID = "tulbox-validation-message";
  const DEBUG_EVENT = "tulbox-validator-debug";
  const STATE_ATTRIBUTE = "data-tulbox-validator-state";

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function getLeadingCode(value) {
    const match = normalizeText(value).toUpperCase().match(/^[A-Z0-9]+/);

    return match ? match[0] : "";
  }

  function hasCode(value, codes) {
    const leadingCode = getLeadingCode(value);

    return codes.includes(leadingCode);
  }

  function getButtonLabel(button) {
    const candidates = [
      button.textContent,
      button.value,
      button.getAttribute("aria-label"),
      button.getAttribute("title")
    ];

    return candidates.map(normalizeText).find(Boolean) || "";
  }

  function getFieldValue(field) {
    if (!field) return "";

    const input = field.matches("input, textarea, select")
      ? field
      : field.querySelector("input, textarea, select");

    if (input) return normalizeText(input.value);

    const selectedOption =
      field.querySelector(".mat-mdc-select-value-text") ||
      field.querySelector(".mat-select-value-text") ||
      field.querySelector("[aria-selected='true']");

    if (selectedOption) return normalizeText(selectedOption.textContent);

    return normalizeText(field.textContent);
  }

  function getFields() {
    return {
      ...Object.fromEntries(
        Object.entries(FIELD_IDS).map(([key, id]) => [key, document.getElementById(id)])
      ),
      capacities: Array.from(document.querySelectorAll("[id^='writer-capacity-']"))
    };
  }

  function getButton() {
    const buttons = Array.from(
      document.querySelectorAll("button, input[type='button'], input[type='submit'], [role='button']")
    );

    const exactMatch = buttons.find((button) => BUTTON_LABELS.has(getButtonLabel(button)));

    if (exactMatch) return exactMatch;

    return (
      buttons.find((button) => {
        const label = getButtonLabel(button);

        return Array.from(BUTTON_LABELS).some((buttonLabel) => label.includes(buttonLabel));
      }) || null
    );
  }

  function validate(values) {
    const errors = [];

    if (hasCode(values.genre, ["054", "050"]) && !hasCode(values.type, ["CU"])) {
      errors.push("Type must be CU when Genre is 054 or 050.");
    }

    if (hasCode(values.genre, ["059"]) && !hasCode(values.type, ["OG"])) {
      errors.push("Type must be OG when Genre is 059.");
    }

    if (!values.capacities.some((capacity) => hasCode(capacity, ["CA", "C"]))) {
      errors.push("At least one writer capacity must be C or CA.");
    }

    if (
      hasCode(values.musicTextRelationship, ["MTX"]) &&
      !values.capacities.some((capacity) => hasCode(capacity, ["CA", "A"]))
    ) {
      errors.push("At least one writer capacity must be CA or A when Music Text Relationship is MTX.");
    }

    if (
      hasCode(values.musicTextRelationship, ["MUS"]) &&
      values.capacities.some((capacity) => hasCode(capacity, ["CA", "A", "SA"]))
    ) {
      errors.push("Writer capacity cannot be CA, A, or SA when Music Text Relationship is MUS.");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  function ensureMessage(button) {
    let message = document.getElementById(MESSAGE_ID);

    if (!message) {
      message = document.createElement("div");
      message.id = MESSAGE_ID;
      message.className = "tulbox-validation-message";
      message.setAttribute("role", "alert");
    }

    if (button && message.parentElement !== button.parentElement) {
      button.parentElement.insertAdjacentElement("afterend", message);
    }

    return message;
  }

  function setButtonState(button, validation) {
    const message = ensureMessage(button);

    if (!validation.valid && button.dataset.tulboxBlocked !== "true") {
      button.dataset.tulboxWasDisabled = String(button.disabled);
    }

    if (!validation.valid && !button.disabled) {
      button.disabled = true;
    } else if (button.dataset.tulboxBlocked === "true" && button.dataset.tulboxWasDisabled === "false") {
      button.disabled = false;
    }

    const blocked = String(!validation.valid);

    if (button.dataset.tulboxBlocked !== blocked) {
      button.dataset.tulboxBlocked = blocked;
    }

    if (button.classList.contains("tulbox-blocked") !== !validation.valid) {
      button.classList.toggle("tulbox-blocked", !validation.valid);
    }

    if (button.getAttribute("aria-disabled") !== blocked) {
      button.setAttribute("aria-disabled", blocked);
    }

    if (validation.valid) {
      message.hidden = true;
      message.textContent = "";
    } else {
      message.hidden = false;
      message.textContent = validation.errors.join(" ");
    }
  }

  function evaluate() {
    const fields = getFields();
    const button = getButton();
    let state;

    if (!button || !fields.musicTextRelationship || !fields.type || !fields.genre) {
      state = {
        ready: false,
        buttonFound: Boolean(button),
        musicTextRelationshipFound: Boolean(fields.musicTextRelationship),
        typeFound: Boolean(fields.type),
        genreFound: Boolean(fields.genre),
        capacityCount: fields.capacities.length
      };

      document.documentElement.setAttribute(STATE_ATTRIBUTE, JSON.stringify(state));

      return state;
    }

    const values = {
      musicTextRelationship: getFieldValue(fields.musicTextRelationship),
      type: getFieldValue(fields.type),
      genre: getFieldValue(fields.genre),
      capacities: fields.capacities.map(getFieldValue)
    };

    const validation = validate(values);

    setButtonState(button, validation);

    state = {
      ready: true,
      buttonLabel: getButtonLabel(button),
      values,
      validation
    };

    document.documentElement.setAttribute(STATE_ATTRIBUTE, JSON.stringify(state));

    return state;
  }

  function getButtonLabels() {
    return Array.from(
      document.querySelectorAll("button, input[type='button'], input[type='submit'], [role='button']")
    ).map(getButtonLabel);
  }

  function start() {
    let scheduled = false;

    function scheduleEvaluate() {
      if (scheduled) return;

      scheduled = true;

      window.requestAnimationFrame(() => {
        scheduled = false;
        evaluate();
      });
    }

    evaluate();

    document.addEventListener(DEBUG_EVENT, () => {
      console.info("Tulbox Validator state", evaluate());
      console.info("Tulbox Validator button labels", getButtonLabels());
    });

    // console.info(
    //   `Tulbox Validator active. Run document.dispatchEvent(new Event("${DEBUG_EVENT}")) for current state.`
    // );

    document.addEventListener("input", scheduleEvaluate, true);
    document.addEventListener("change", scheduleEvaluate, true);
    document.addEventListener("click", () => window.setTimeout(scheduleEvaluate, 0), true);

    const observer = new MutationObserver(scheduleEvaluate);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
