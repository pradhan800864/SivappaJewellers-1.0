import React, { useEffect, useState, useRef } from 'react';
import Tree from 'react-d3-tree';
import axios from 'axios';
import officeManIcon from '../../Assets/office-man.png';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4998';

export default function ReferralTree({ userId }) {
  const [tree, setTree] = useState(null);
  const [dims, setDims] = useState({ width: 600, height: 400 });
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const token = localStorage.getItem('app_token');
        const res = await axios.get(`${API_BASE}/api/referral-branch`, {
          params: { focusUserId: userId },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setTree(res.data);
      } catch (error) {
        console.error('Error fetching referral branch:', error);
        setTree(null);
      }
    };
    if (userId) fetchBranch();
  }, [userId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderCustomNode = ({ nodeDatum }) => {
    const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
    const formatCoins = (coins) => {
      const n = Math.floor(coins ?? 0);
      if (n >= 100000) return `${(n / 100000).toFixed(1)}L coins`;
      if (n >= 1000) return `${(n / 1000).toFixed(1)}K coins`;
      return `${n} coins`;
    };
    return (
      <g>
        <circle r="25" fill={hasChildren ? '#4a5568' : '#ffffff'} stroke="#4a5568" strokeWidth="2" />
        <image href={officeManIcon} x="-20" y="-20" height="40" width="40" />
        <text fill="#111827" fontSize="13" x="0" y="40" textAnchor="middle" style={{ fontFamily: 'Inter, Roboto, Segoe UI, sans-serif', fontWeight: 600 }}>
          {nodeDatum.username}
        </text>
        <text fill="#4B5563" fontSize="14" x="0" y="56" textAnchor="middle" style={{ fontFamily: 'Inter, Roboto, Segoe UI, sans-serif', fontWeight: 400 }}>
          {formatCoins(nodeDatum.wallet)}
        </text>
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '50vw', height: '50vh', position: 'relative', background: '#f9f9f9', overflow: 'hidden' }}
    >
      <style>{`.rd3t-node, .rd3t-leaf-node, .rd3t-link, .rd3t-g, .rd3t-tree-container svg { cursor: default !important; }`}</style>
      {tree ? (
        <Tree
          data={tree}
          dimensions={dims}
          renderCustomNodeElement={renderCustomNode}
          orientation="vertical"
          translate={{ x: Math.max(0, dims.width / 2), y: 80 }}
          zoomable={false}
          scaleExtent={{ min: 1, max: 1 }}
          collapsible={false}
          initialDepth={3}     // parent → you → children → grandchildren
          pathFunc="diagonal"
          separation={{ siblings: 1, nonSiblings: 1.5 }}
        />
      ) : (
        <p style={{ textAlign: 'center', marginTop: 80 }}>No referral data</p>
      )}
    </div>
  );
}
