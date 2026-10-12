/* Gamepad detection for the standalone dinosaur game.
   No build step: plain script, loaded after the game scripts. */
(function () {
  "use strict";

  // Runner.init() reads this key to decide whether to paint its night sky
  // (inverted canvas, moon and stars). There is no theme switcher any more, so
  // a stale "true" left over from one would render a dark canvas on the light
  // page. Pin it off.
  try {
    localStorage.setItem("elgoog-dark-mode", "false");
  } catch (e) {}

  // offline.js only starts its gamepad poll on a "gamepadconnected" event, so a
  // controller that was already plugged in when the page loaded is never picked
  // up. Watch for pads directly and kick the game's own poll off.
  function pads() {
    if (!navigator.getGamepads) return [];
    var list = navigator.getGamepads() || [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].connected !== false) out.push(list[i]);
    }
    return out;
  }

  function startGamepadPoll() {
    var r = window.Runner && window.Runner.instance_;
    if (r && typeof r.pollGamepadState === "function" && !r.gamepadRafId) {
      r.pollGamepadState();
      return true;
    }
    return false;
  }

  function init() {
    var btn = document.querySelector("[data-pad-toggle]");
    if (!btn) return;
    var label = btn.querySelector("[data-pad-label]");

    function sync() {
      var found = pads();
      if (found.length) {
        btn.setAttribute("data-connected", "true");
        if (label) label.textContent = "Controller";
        btn.setAttribute(
          "title",
          found.length > 1 ? found.length + " controllers connected" : "Controller connected"
        );
        startGamepadPoll();
      } else {
        btn.setAttribute("data-connected", "false");
        if (label) label.textContent = "No controller";
        btn.setAttribute("title", "Connect a controller, then press A / d-pad up to play");
      }
    }

    window.addEventListener("gamepadconnected", sync);
    window.addEventListener("gamepaddisconnected", sync);

    // A pad already connected at load never fires "gamepadconnected", and the
    // runner may not exist yet when a pad shows up later. So keep a cheap
    // low-frequency re-scan running rather than a one-shot check.
    sync();
    setInterval(sync, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
