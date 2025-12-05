export function initSearchHighlight() {
  const searchInput = document.getElementById("case-search-input");
  const containers = [document.getElementById("hearings-table-container"), document.getElementById("court-lists-container")].filter(
    (el): el is HTMLElement => el !== null
  );

  if (!searchInput || containers.length === 0) return;

  function removeHighlights(container: HTMLElement) {
    const marks = container.querySelectorAll("mark.search-highlight");
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });
  }

  function highlightText(searchTerm: string, container: HTMLElement) {
    removeHighlights(container);

    if (!searchTerm) {
      return;
    }

    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

    function highlightNode(node: Node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const text = node.textContent;
        const matches: Array<{ index: number; length: number; text: string }> = [];
        let match: RegExpExecArray | null;

        regex.lastIndex = 0;
        match = regex.exec(text);
        while (match !== null) {
          matches.push({ index: match.index, length: match[0].length, text: match[0] });
          match = regex.exec(text);
        }

        if (matches.length > 0) {
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;

          matches.forEach((m) => {
            if (m.index > lastIndex) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex, m.index)));
            }
            const mark = document.createElement("mark");
            mark.className = "search-highlight";
            mark.textContent = m.text;
            fragment.appendChild(mark);
            lastIndex = m.index + m.length;
          });

          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
          }

          node.parentNode?.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE" && node.nodeName !== "MARK") {
        Array.from(node.childNodes).forEach(highlightNode);
      }
    }

    highlightNode(container);
  }

  searchInput.addEventListener("input", (e) => {
    const searchTerm = (e.target as HTMLInputElement).value.trim();
    for (const container of containers) {
      highlightText(searchTerm, container);
    }
  });
}
