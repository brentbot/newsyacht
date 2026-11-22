const pendingPosts = new WeakSet();

const updatePost = async (url, row, button) => {
  if (pendingPosts.has(row)) return;
  pendingPosts.add(row);
  row.querySelector(".post-action-error")?.remove();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "X-Newsyacht-Fragment": "post" },
    });
    if (!response.ok)
      throw new Error(`Failed to update post (${response.status})`);

    const template = document.createElement("template");
    template.innerHTML = await response.text();
    const newRow = template.content.querySelector(".post");
    if (!newRow || newRow.dataset.postId !== row.dataset.postId) {
      throw new Error("Missing updated post");
    }

    const filter = row.parentElement?.dataset.readFilter;
    const isRead = newRow.classList.contains("is-read");
    const hadFocus = button && document.activeElement === button;
    if ((filter === "unread" && isRead) || (filter === "read" && !isRead)) {
      const neighbor = row.nextElementSibling ?? row.previousElementSibling;
      row.remove();
      if (hadFocus) neighbor?.querySelector(".post-title a")?.focus();
      return;
    }

    const buttonIndex = Array.from(row.querySelectorAll("button")).indexOf(
      button,
    );
    row.replaceWith(newRow);
    if (hadFocus) newRow.querySelectorAll("button")[buttonIndex]?.focus();
  } catch (error) {
    console.error(error);
    const message = document.createElement("span");
    message.className = "post-action-error";
    message.setAttribute("role", "status");
    message.textContent = " Could not confirm the update. Refresh to check.";
    row.querySelector(".post-meta").append(message);
  } finally {
    pendingPosts.delete(row);
  }
};

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-async-post]");
  const row = form?.closest(".post");
  if (!row) return;
  event.preventDefault();
  void updatePost(form.action, row, event.submitter);
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-mark-read-url]");
  if (!link || event.defaultPrevented || event.button !== 0) return;
  const row = link.closest(".post");
  if (!row || pendingPosts.has(row)) return;

  // Keep native new-tab navigation while the fragment request marks the post.
  const articleUrl = new URL(link.href);
  articleUrl.searchParams.set("mark", "0");
  link.href = articleUrl.href;
  void updatePost(link.dataset.markReadUrl, row);
});
