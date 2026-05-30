const mailVote = document.querySelector("#mailVote");

mailVote.addEventListener("click", () => {
  mailVote.classList.add("is-popped");
  window.setTimeout(() => mailVote.classList.remove("is-popped"), 220);
});
