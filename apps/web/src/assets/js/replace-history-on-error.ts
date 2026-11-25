// Same approach as pip-frontend's backButtonHistory macro. An error page is rendered straight
// from the POST, so replacing its history entry turns it into a GET. The page is also sent with
// Cache-Control: no-store, so going back fetches a fresh page with no error, and the browser
// restores whatever the user had filled in before continuing. If the browser still restores
// the old error page from the back/forward cache, reload it to get that fresh page.
export function initReplaceHistoryOnError() {
  const hasError = Array.from(document.querySelectorAll("form[data-replace-history-on-error]")).some((form) => form.querySelector(".govuk-form-group--error"));

  if (!hasError) {
    return;
  }

  window.history.replaceState(null, "", window.location.href);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.location.reload();
    }
  });
}
