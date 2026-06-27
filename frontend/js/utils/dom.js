// Small DOM helpers shared by every page.


// Build an element with attributes/children in one call.
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") {
      node.className = value;
    } else if (key === "dataset") {
      Object.assign(node.dataset, value);
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node && typeof value !== "string") {
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  }

  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}


export function replaceChildren(host, ...nodes) {
  host.replaceChildren(...nodes.filter(Boolean));
}


// Toggle a loading state on a submit button.
export function setButtonLoading(button, isLoading, idleLabel) {
  if (!button) return;
  const label = button.querySelector(".btn__label");
  const spinner = button.querySelector(".btn__spinner");
  button.classList.toggle("is-loading", isLoading);
  button.disabled = !!isLoading;
  if (label && idleLabel) label.textContent = isLoading ? "Working…" : idleLabel;
  if (spinner) spinner.hidden = !isLoading;
}


export function readForm(form) {
  const data = {};
  for (const element of form.elements) {
    if (!element.name) continue;
    if (element.type === "checkbox") {
      data[element.name] = element.checked;
    } else {
      data[element.name] = element.value;
    }
  }
  return data;
}
