export function initBackToTop() {
  const backToTopLink = document.querySelector(".back-to-top-link");

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
