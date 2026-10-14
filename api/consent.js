/* Nexora News: cookie notice for Google Analytics (consent mode) */
(function () {

  var KEY = "nx_consent_v1";

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function save(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  function update(state) {
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", { analytics_storage: state });
    }
  }

  var css =
    "#nxConsent{position:fixed;left:12px;right:12px;bottom:12px;z-index:3000;max-width:560px;margin:0 auto;" +
    "background:var(--surface,#fff);color:var(--text,#0d1220);border:1px solid var(--line,#e0e5ee);" +
    "border-radius:20px;padding:18px 18px 16px;box-shadow:0 12px 40px rgba(0,0,0,.28);" +
    "font:500 14px/1.5 var(--font,system-ui,-apple-system,Segoe UI,Arial,sans-serif)}" +
    "#nxConsent p{margin:0 0 12px}" +
    "#nxConsent a{color:var(--accent-text,#c60f28);font-weight:700;text-decoration:underline;text-underline-offset:3px}" +
    "#nxConsent .nx-row{display:flex;gap:10px;flex-wrap:wrap}" +
    "#nxConsent button{flex:1;min-width:130px;height:44px;border-radius:999px;border:1px solid var(--line,#e0e5ee);" +
    "font:700 14px var(--font,system-ui,sans-serif);cursor:pointer}" +
    "#nxConsent .nx-yes{background:var(--red,#d0102a);border-color:var(--red,#d0102a);color:#fff}" +
    "#nxConsent .nx-no{background:var(--soft,#e8ecf3);color:var(--text,#0d1220)}" +
    "#nxConsent button:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}";

  function build() {

    if (document.getElementById("nxConsent")) { return; }

    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var box = document.createElement("div");
    box.id = "nxConsent";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Cookie preferences");

    box.innerHTML =
      "<p>We would like to use cookies for anonymous audience statistics (Google Analytics). " +
      "They are only used if you allow them. Read our <a href=\"/privacy.html\">Privacy Policy</a>.</p>" +
      "<div class=\"nx-row\">" +
      "<button type=\"button\" class=\"nx-yes\" id=\"nxAllow\">Allow</button>" +
      "<button type=\"button\" class=\"nx-no\" id=\"nxDeny\">No thanks</button>" +
      "</div>";

    document.body.appendChild(box);

    document.getElementById("nxAllow").addEventListener("click", function () {
      save("granted");
      update("granted");
      box.remove();
    });

    document.getElementById("nxDeny").addEventListener("click", function () {
      save("denied");
      update("denied");
      box.remove();
    });

  }

  function addFooterLink() {

    var holder =
      document.querySelector(".legal-links") ||
      document.querySelector(".footer-links") ||
      document.querySelector(".copyright");

    if (!holder || document.getElementById("nxCookieLink")) { return; }

    var link = document.createElement("a");
    link.href = "#";
    link.id = "nxCookieLink";
    link.textContent = "Cookie settings";

    link.addEventListener("click", function (event) {
      event.preventDefault();
      build();
    });

    holder.appendChild(link);

  }

  function start() {

    var saved = read();

    if (saved === "granted") {
      update("granted");
    } else if (saved !== "denied") {
      build();
    }

    addFooterLink();

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})();