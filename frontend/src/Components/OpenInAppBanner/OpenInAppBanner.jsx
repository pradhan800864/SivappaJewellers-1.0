import React, { useState } from "react";
import "./OpenInAppBanner.css";

export default function OpenInAppBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="openInAppBannerWrap">
        <div className="openInAppBanner">
          <div className="openInAppLeft" onClick={() => setOpen(true)}>
            <div className="openInAppTitle">Open in app</div>
            <div className="openInAppSub">Faster access • Home screen icon</div>
          </div>

          <button className="openInAppBtn" onClick={() => setOpen(true)}>
            How
          </button>

          <button
            className="openInAppClose"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>
      </div>

      {open && (
        <div className="openInAppModalOverlay" onClick={() => setOpen(false)}>
          <div className="openInAppModal" onClick={(e) => e.stopPropagation()}>
            <div className="openInAppModalTitle">Add to Home Screen</div>

            <ol className="openInAppSteps">
              <li>Tap the <b>Share</b> icon (⬆️) in Safari</li>
              <li>Scroll and tap <b>Add to Home Screen</b></li>
              <li>Tap <b>Add</b></li>
            </ol>

            <button className="openInAppPrimary" onClick={() => setOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
