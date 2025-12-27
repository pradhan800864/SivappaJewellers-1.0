// src/components/Referrals/ReferralTreeGraph.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Tree from "react-d3-tree";

const DEFAULT_API_BASE = process.env.REACT_APP_API_BASE;

/** Find a node and its parent in a generic tree */
function findNodeAndParent(root, targetId, parent = null) {
  if (!root) return null;
  if (root.id === targetId) return { node: root, parent };
  for (const ch of (root.children || [])) {
    const res = findNodeAndParent(ch, targetId, root);
    if (res) return res;
  }
  return null;
}

/** Keep exactly: Parent -> You -> Your direct children (no siblings, no grandchildren) */
function trimToParentYouAndChildren(fullRoot, focusId, includeParent) {
  if (!fullRoot) return null;
  const hit = findNodeAndParent(fullRoot, focusId, null);
  if (!hit) return fullRoot;

  const { node: focus, parent } = hit;

  const you = {
    id: focus.id,
    username: focus.username,
    referrer_id: focus.referrer_id,
    wallet: focus.wallet,
    coins: focus.coins, // backend may use 'coins'
    children: (focus.children || []).map((c) => ({
      id: c.id,
      username: c.username,
      referrer_id: c.referrer_id,
      wallet: c.wallet,
      coins: c.coins,
      children: [], // drop grandchildren
    })),
  };

  if (includeParent && parent) {
    return {
      id: parent.id,
      username: parent.username,
      referrer_id: parent.referrer_id,
      wallet: parent.wallet,
      coins: parent.coins,
      children: [you], // no siblings
    };
  }
  return you;
}

/** Make user_id -> coins map (prefers 'wallet', falls back to 'coins') */
function buildCoinsMapFromTree(root) {
  const map = new Map();
  const dfs = (n) => {
    if (!n) return;
    const val =
      (typeof n.wallet === "number" ? n.wallet : undefined) ??
      (typeof n.coins === "number" ? n.coins : undefined) ??
      0;
    map.set(n.id, Number(val) || 0);
    (n.children || []).forEach(dfs);
  };
  dfs(root);
  return map;
}

/** Convert to react-d3-tree nodes */
function toD3(node, { focusId, coinsMap, rootId }) {
  if (!node) return null;
  const isRoot = node.id === rootId;
  const isFocus = node.id === focusId;

  return {
    name: node.username || "Unknown",
    attributes: {
      id: node.id,
      isRoot,
      isFocus,
      coins: coinsMap.get(node.id) ?? 0,
    },
    children: (node.children || []).map((ch) =>
      toD3(ch, { focusId, coinsMap, rootId })
    ),
  };
}

export default function ReferralTreeGraph({
  userId,
  height = 520,
  apiBase = DEFAULT_API_BASE,
  includeParent = true,
}) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: height });

  useEffect(() => {
    const onResize = () => {
      if (containerRef.current) {
        setDims({ w: containerRef.current.offsetWidth, h: height });
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [height]);

  const loadBranch = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const token = localStorage.getItem("token");

      // ✅ Your router is mounted at /api/referrals
      const url = new URL(`${apiBase}/api/my-branch`);
      url.searchParams.set("focusUserId", String(userId));
      url.searchParams.set("withBalances", "1"); // harmless flag; backend already includes wallet

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to fetch referral branch");

      const json = await res.json();
      const full = json.root || json;
      const focusId = Number(json.focusUserId || userId);

      // Trim to Parent -> You -> Your children
      const trimmed = trimToParentYouAndChildren(full, focusId, includeParent);

      // Coins from wallet/coins fields
      const coinsMap = buildCoinsMapFromTree(trimmed);

      const rootId = trimmed.id;
      const d3 = toD3(trimmed, { focusId, coinsMap, rootId });

      setData(d3);
    } catch (e) {
      setErr(e.message || "Failed to load referral branch");
    } finally {
      setLoading(false);
    }
  }, [apiBase, includeParent, userId]);

  useEffect(() => {
    if (userId) loadBranch();
  }, [userId, loadBranch]);

  const translate = useMemo(
    () => ({ x: Math.max(120, dims.w / 2), y: 90 }),
    [dims]
  );

  if (loading) return <div style={{ padding: 12 }}>Loading referral tree…</div>;
  if (err) return <div style={{ padding: 12, color: "#b00020" }}>⚠️ {err}</div>;
  if (!data) return <div style={{ padding: 12 }}>No referrals yet.</div>;

  const renderNode = ({ nodeDatum }) => {
    const { isRoot, isFocus, coins } = nodeDatum.attributes || {};
    const radius = isFocus ? 18 : 14;
    const stroke = isFocus ? "#2563eb" : "#999";
    const fill = isRoot ? "#e0f2fe" : "#fff";

    return (
      <g>
        <circle r={radius} stroke={stroke} strokeWidth={2} fill={fill} />
        <text x={radius + 8} dy="-0.2em" style={{ fill: "#111", fontWeight: 600 }}>
          {nodeDatum.name}{isFocus ? " (You)" : ""}
        </text>
        <text x={radius + 8} dy="1.2em" style={{ fill: "#065f46" }}>
          Coins: {Number.isFinite(coins) ? coins : 0}
        </text>
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: dims.h,
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 12,
        overflow: "hidden",
      }}
    >
      <Tree
        data={data}
        orientation="vertical"
        translate={translate}
        collapsible
        zoomable
        initialDepth={2}
        pathFunc="diagonal"
        separation={{ siblings: 1, nonSiblings: 1.5 }}
        renderCustomNodeElement={renderNode}
      />
    </div>
  );
}
