const INPUT_ID = "case-search-input";
const TABLE_ID = "hearings-table";
const TABLE_CLASS = "hearings-table";
const CONTAINER_IDS = ["hearings-table-container", "court-lists-container"];

export function initTableSearch() {
  const searchInput = document.getElementById(INPUT_ID);
  if (!searchInput) return;

  // Support both ID-based (#hearings-table) and class-based (.hearings-table) table selectors
  let tableRows = document.querySelectorAll(`#${TABLE_ID} tbody tr`);
  if (!tableRows.length) {
    tableRows = document.querySelectorAll(`.${TABLE_CLASS} tbody tr`);
  }

  // Find containers for highlighting
  const containersById = CONTAINER_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
  const tablesByClass = Array.from(document.querySelectorAll(`.${TABLE_CLASS}`)) as HTMLElement[];
  const containers = containersById.length > 0 ? containersById : tablesByClass;

  if (!tableRows.length && containers.length === 0) return;

  searchInput.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.trim();
    const queryLower = query.toLowerCase();

    // Filter rows
    tableRows.forEach((row) => {
      const text = row.textContent?.toLowerCase() ?? "";
      const matches = !queryLower || text.includes(queryLower);
      (row as HTMLElement).style.display = matches ? "" : "none";
    });

    // Highlight matches in containers
    for (const container of containers) {
      highlightText(query, container);
    }
  });
}

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
