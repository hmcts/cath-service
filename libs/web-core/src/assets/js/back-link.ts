export function initBackLink() {
  const backLink = document.querySelector('.govuk-back-link') as HTMLAnchorElement | null;

  if (backLink && backLink.getAttribute('href') === '#') {
    const handleClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      history.back();
    };

    backLink.addEventListener('click', handleClick, true);
  }
}
