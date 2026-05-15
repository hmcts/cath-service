export function initBackToTop() {
  const backToTopContainer = document.querySelector(".back-to-top-link");
  const backToTopLink = backToTopContainer?.querySelector("a");

  if (backToTopLink) {
    backToTopLink.addEventListener("click", (event) => {
      event.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }
}
