/* AI Writing Assistant for admin.html
   Add before </body> in admin.html:  <script src="/ai-assistant.js"></script> */

(function () {

  var ENDPOINT = "/api/assist";

  var main = document.querySelector("main");

  if (!main || typeof db === "undefined") {
    return;
  }

  function $(id) {
    return document.getElementById(id);
  }

  /* Use the edit form when it is open, otherwise the new-article form */
  function fields() {
    var editing = $("editCard") && $("editCard").style.display === "block";
    return editing
      ? { title: $("editTitle"), category: $("editCategory"), excerpt: $("editExcerpt"), body: $("editBody") }
      : { title: $("title"), category: $("category"), excerpt: $("excerpt"), body: $("body") };
  }

  var card = document.createElement("section");
  card.className = "card";
  card.innerHTML =
    '<h2>AI Writing Assistant</h2>' +
    '<label for="aiAction">What do you need?</label>' +
    '<select id="aiAction">' +
      '<option value="draft">Write article from my notes</option>' +
      '<option value="headlines">Suggest headlines</option>' +
      '<option value="excerpt">Write short description</option>' +
      '<option value="polish">Fix grammar and polish</option>' +
      '<option value="translate">Translate to English</option>' +
    '</select>' +
    '<label for="aiNotes">Notes (Hausa or English, optional)</label>' +
    '<textarea id="aiNotes" style="min-height:110px" placeholder="If empty, the Article Body field is used."></textarea>' +
    '<button type="button" class="save" id="aiRun">Run assistant</button>' +
    '<div id="aiStatus" style="margin-top:14px;color:#6b7280"></div>' +
    '<div id="aiResult" style="display:none;margin-top:14px"></div>' +
    '<p style="margin:14px 0 0;font-size:13px;color:#6b7280">' +
    'AI can make mistakes. Check every name, number and date before publishing. ' +
    'Text marked [CHECK: ...] needs your input.</p>';

  main.insertBefore(card, main.firstChild);

  var runBtn = $("aiRun");
  var statusEl = $("aiStatus");
  var resultEl = $("aiResult");

  function setStatus(text, isError) {
    statusEl.textContent = text || "";
    statusEl.style.color = isError ? "#991b1b" : "#6b7280";
  }

  function actionButton(label, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "draft-publish";
    b.style.marginRight = "8px";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function showResult(action, text) {

    var f = fields();

    resultEl.innerHTML = "";
    resultEl.style.display = "block";

    if (action === "headlines") {

      text.split("\n")
        .map(function (l) { return l.trim(); })
        .filter(Boolean)
        .forEach(function (line) {

          var b = document.createElement("button");
          b.type = "button";
          b.textContent = line;
          b.style.cssText =
            "display:block;width:100%;text-align:left;margin-top:8px;padding:12px;" +
            "border:1px solid #d1d5db;border-radius:7px;background:#f9fafb;font-size:15px";

          b.addEventListener("click", function () {
            f.title.value = line;
            setStatus("Headline applied.");
          });

          resultEl.appendChild(b);

        });

      setStatus("Tap a headline to use it.");
      return;
    }

    var box = document.createElement("div");
    box.style.cssText =
      "white-space:pre-wrap;padding:14px;border:1px solid #d1d5db;" +
      "border-radius:8px;background:#f9fafb;line-height:1.5";
    box.textContent = text;
    resultEl.appendChild(box);

    var actions = document.createElement("div");
    actions.style.marginTop = "6px";

    if (action === "excerpt") {
      actions.appendChild(actionButton("Use as description", function () {
        f.excerpt.value = text;
        setStatus("Description applied.");
      }));
    } else {
      actions.appendChild(actionButton("Replace article body", function () {
        f.body.value = text;
        setStatus("Article body replaced.");
      }));
    }

    actions.appendChild(actionButton("Copy", function () {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setStatus("Copied.");
      }
    }));

    resultEl.appendChild(actions);
    setStatus("Review the result, then apply it.");

  }

  runBtn.addEventListener("click", async function () {

    var action = $("aiAction").value;
    var f = fields();
    var notes = $("aiNotes").value.trim();
    var text = notes || f.body.value.trim();

    if (!text && action === "excerpt") {
      text = f.title.value.trim();
    }

    if (!text) {
      setStatus("Write your notes above, or fill in the Article Body first.", true);
      return;
    }

    runBtn.disabled = true;
    runBtn.textContent = "Working...";
    resultEl.style.display = "none";
    setStatus("Working on it...");

    try {

      var session = await db.auth.getSession();
      var token = session.data && session.data.session
        ? session.data.session.access_token
        : null;

      if (!token) {
        window.location.href = "/login.html";
        return;
      }

      var res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          action: action,
          text: text,
          title: f.title.value.trim(),
          category: f.category.value
        })
      });

      var data = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      showResult(action, data.result || "");

    } catch (e) {
      setStatus(e.message, true);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = "Run assistant";
    }

  });

})();