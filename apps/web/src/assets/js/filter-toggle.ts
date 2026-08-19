import { FilterToggleButton } from "@ministryofjustice/frontend";

const FILTER_SELECTOR = ".moj-filter";
const TOGGLE_CONTAINER_SELECTOR = ".moj-action-bar__filter";
const HEADER_ACTION_SELECTOR = ".moj-filter__header-action";
const OPTIONS_SELECTOR = ".moj-filter__options";
const HIDE_CONTAINER_CLASS = "app-filter__hide";
const SELECTED_SELECTOR = ".moj-filter__selected";
const CLEAR_ACTION_SELECTOR = ".moj-filter__heading-action";
const DEFAULT_BIG_MODE_MEDIA_QUERY = "(min-width: 48.0625em)";
const REVEAL_LAYOUT_SELECTOR = ".app-filter-layout--reveal";

// Wires up the MOJ Frontend filter toggle for the single filter panel a page may
// render. All user-facing button text is read from data-* attributes on the
// .moj-filter element (set from the page's locale data) so no localised string is
// ever interpolated into JavaScript. Guarded on the presence of .moj-filter so the
// vast majority of pages, which have no filter, never construct the component.
export function initFilterToggle(): void {
  const filter = document.querySelector<HTMLElement>(FILTER_SELECTOR);
  if (!filter) return;

  moveClearLinkBelowTags(filter);

  // By default MOJ appends its close ("Hide filters") button into the header at the
  // top of the panel, styled with a ✕ cross. We want a plain "Hide filters" button
  // directly beneath the green "Apply filters" button instead. Give MOJ an empty
  // container placed right after the Apply button to render that button into, and
  // (below) restyle it as a normal secondary button so the ✕ cross is dropped.
  const closeContainerSelector = ensureHideContainer(filter);

  const { showText, hideText, closeText, startHidden, bigModeMediaQuery } = filter.dataset;

  try {
    new FilterToggleButton(filter, {
      bigModeMediaQuery: bigModeMediaQuery || DEFAULT_BIG_MODE_MEDIA_QUERY,
      startHidden: startHidden === "true",
      toggleButton: {
        showText: showText ?? "Show filters",
        hideText: hideText ?? "Hide filters",
        classes: "govuk-button--secondary"
      },
      closeButton: {
        text: closeText ?? "Hide filters",
        // Plain secondary button — not moj-filter__close, so no ✕ cross icon.
        classes: "govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
      },
      toggleButtonContainer: { selector: TOGGLE_CONTAINER_SELECTOR },
      closeButtonContainer: { selector: closeContainerSelector }
    });

    keepRevealPanelOpenOnLoad(filter, startHidden, hideText);
  } catch (error) {
    console.error("Error initializing filter toggle:", error);
  }
}

// The toggle-to-reveal SJP pages set a never-matching bigModeMediaQuery so the panel
// is always in MOJ's "small mode". In small mode the component's constructor calls
// hideMenu() unconditionally, ignoring startHidden — so after applying a filter (when
// the server sets data-start-hidden="false" because filters are active) the panel is
// slammed shut on load instead of staying open. Re-open it here to honour startHidden.
// We reveal the panel by hand rather than clicking the toggle so focus stays at the top
// of the page (MOJ's toggle() moves focus into the panel, jarring on load). Sidebar
// pages sit in big mode on desktop (panel already shown) and aren't reveal layouts, so
// this leaves them untouched.
function keepRevealPanelOpenOnLoad(filter: HTMLElement, startHidden: string | undefined, hideText: string | undefined): void {
  if (startHidden !== "false" || !filter.closest(REVEAL_LAYOUT_SELECTOR)) return;

  const toggleButton = document.querySelector<HTMLButtonElement>(`${TOGGLE_CONTAINER_SELECTOR} button`);
  if (!toggleButton || toggleButton.getAttribute("aria-expanded") !== "false") return;

  filter.classList.remove("moj-js-hidden");
  toggleButton.setAttribute("aria-expanded", "true");
  toggleButton.textContent = hideText ?? "Hide filters";
}

// Inserts an empty container immediately after the "Apply filters" button (the first
// button in .moj-filter__options) for MOJ to render its close/"Hide filters" button
// into, and returns a selector for it. Falls back to MOJ's default header-action
// container if the options block or Apply button is not found, so the toggle still
// constructs (MOJ requires both button containers to resolve).
function ensureHideContainer(filter: HTMLElement): string {
  const options = filter.querySelector<HTMLElement>(OPTIONS_SELECTOR);
  const applyButton = options?.querySelector<HTMLElement>(".govuk-button");
  if (!options || !applyButton) return HEADER_ACTION_SELECTOR;

  let container = filter.querySelector<HTMLElement>(`.${HIDE_CONTAINER_CLASS}`);
  if (!container) {
    container = document.createElement("div");
    container.className = HIDE_CONTAINER_CLASS;
    applyButton.insertAdjacentElement("afterend", container);
  }
  return `.${HIDE_CONTAINER_CLASS}`;
}

// MOJ renders the "Clear filters" link (.moj-filter__heading-action) before the
// selected-filter tags in the DOM. We want it visually below the tags. Moving it
// in the DOM — rather than reordering with CSS `order` — keeps the DOM order, the
// visual order and the keyboard focus/reading order in agreement (WCAG 2.4.3 Focus
// Order / 1.3.2 Meaningful Sequence). Without JS the link stays at the top, which
// is still valid MOJ markup.
function moveClearLinkBelowTags(filter: HTMLElement): void {
  const selected = filter.querySelector<HTMLElement>(SELECTED_SELECTOR);
  const clearAction = selected?.querySelector<HTMLElement>(CLEAR_ACTION_SELECTOR);
  if (selected && clearAction) {
    selected.appendChild(clearAction);
  }
}
