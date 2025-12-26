import React, { useMemo, useState, useEffect, useRef } from "react";
import "./Filter.css";

// shallow set equality to avoid redundant setState calls
const equalSets = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
};

const Filter = ({ onFilterChange, facets, onClose }) => {
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
   onFilterChangeRef.current = onFilterChange;
 }, [onFilterChange]);
  // ---- Use server data as-is; keep references stable with useMemo ----
  const productTypes = useMemo(() => facets?.productTypes ?? [], [facets]);
  const categoriesByType = useMemo(() => facets?.categoriesByType ?? {}, [facets]);
  const subCategoriesByCategory = useMemo(
    () => facets?.subCategoriesByCategory ?? {},
    [facets]
  );
  const purities = useMemo(() => facets?.purities ?? [], [facets]);
  const stoneTypes = useMemo(() => facets?.stoneTypes ?? [], [facets]);

  // ----- LOCAL STATE -----
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedSubCats, setSelectedSubCats] = useState(new Set());
  const [selectedPurities, setSelectedPurities] = useState(new Set());
  const [hasStones, setHasStones] = useState(false);
  const [selectedStoneTypes, setSelectedStoneTypes] = useState(new Set());
  const [inStockOnly, setInStockOnly] = useState(false);

  // show-more toggles
  const [showMoreType, setShowMoreType] = useState(false);
  const [showMoreCat, setShowMoreCat] = useState(false);
  const [showMoreSub, setShowMoreSub] = useState(false);
  const [showMorePurity, setShowMorePurity] = useState(false);
  const [showMoreStone, setShowMoreStone] = useState(false);

  const toggleSet = (value, setFn) => {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const takeOrAll = (arr, showMore, limit = 4) =>
    showMore ? arr : arr.slice(0, limit);

  // ----- Derived lists (stable because facets are memoized) -----
  const visibleCategories = useMemo(() => {
    const types = Array.from(selectedTypes);
    if (types.length === 0) return Object.values(categoriesByType).flat();
    const merged = [];
    types.forEach((t) => merged.push(...(categoriesByType[t] ?? [])));
    return merged;
  }, [selectedTypes, categoriesByType]);

  const visibleSubCats = useMemo(() => {
    const cats = Array.from(selectedCategories);
    if (cats.length === 0) return Object.values(subCategoriesByCategory).flat();
    const merged = [];
    cats.forEach((c) => merged.push(...(subCategoriesByCategory[c] ?? [])));
    return merged;
  }, [selectedCategories, subCategoriesByCategory]);

  // ----- Cleanup invalid selections (guarded to avoid loops) -----
  useEffect(() => {
    const valid = new Set(visibleCategories.map((c) => c.label));
    setSelectedCategories((prev) => {
      const next = new Set([...prev].filter((c) => valid.has(c)));
      return equalSets(prev, next) ? prev : next;
    });
  }, [visibleCategories]);

  useEffect(() => {
    const valid = new Set(visibleSubCats.map((s) => s.label));
    setSelectedSubCats((prev) => {
      const next = new Set([...prev].filter((s) => valid.has(s)));
      return equalSets(prev, next) ? prev : next;
    });
  }, [visibleSubCats]);

  // ----- Badge count -----
  const activeCount = useMemo(() => {
    return (
      selectedTypes.size +
      selectedCategories.size +
      selectedSubCats.size +
      selectedPurities.size +
      (hasStones ? 1 : 0) +
      (hasStones ? selectedStoneTypes.size : 0) +
      (inStockOnly ? 1 : 0)
    );
  }, [
    selectedTypes,
    selectedCategories,
    selectedSubCats,
    selectedPurities,
    hasStones,
    selectedStoneTypes,
    inStockOnly,
  ]);

  // ----- Bubble up labels (IMPORTANT: no onFilterChange in deps) -----
  useEffect(() => {
    if (!onFilterChangeRef.current) return;
    const labels = [
      ...Array.from(selectedTypes).map((t) => `type:${t}`),
      ...Array.from(selectedCategories).map((c) => `cat:${c}`),
      ...Array.from(selectedSubCats).map((s) => `sub:${s}`),
      ...Array.from(selectedPurities).map((p) => `purity:${p}`),
      ...(hasStones ? ["has-stones"] : []),
      ...(hasStones ? Array.from(selectedStoneTypes).map((st) => `stone:${st}`) : []),
      ...(inStockOnly ? ["in-stock"] : []),
    ];
    onFilterChangeRef.current(labels);
  }, [
    selectedTypes,
    selectedCategories,
    selectedSubCats,
    selectedPurities,
    hasStones,
    selectedStoneTypes,
    inStockOnly,
  ]);

  return (
    <aside className="facetPanel">
      <div className="facetTopBar">
        <button
          type="button"
          className="facetBackBtn"
          onClick={() => onClose?.()}
          aria-label="Back to shop"
        >
          ← Back
        </button>

        <div className="facetTopTitle">
          <span>Filters</span>
          <span className="facetBadge">{activeCount}</span>
        </div>

        <button
          type="button"
          className="facetCloseBtn"
          onClick={() => onClose?.()}
          aria-label="Close filters"
        >
          ✕
        </button>
      </div>


      {/* Product Type */}
      <div className="facetGroup">
        <h5 className="facetTitle">Product Type</h5>
        <div className="facetList">
          {takeOrAll(productTypes, showMoreType).map((item) => {
            const checked = selectedTypes.has(item.label);
            return (
              <label key={item.label} className="facetRow">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSet(item.label, setSelectedTypes)}
                />
                <span className="facetLabel">{item.label}</span>
              </label>
            );
          })}
        </div>
        {productTypes.length > 4 && (
          <button className="facetMore" onClick={() => setShowMoreType((s) => !s)}>
            {showMoreType ? "Show less" : `Show (${productTypes.length - 4}) more`}
          </button>
        )}
      </div>

      {/* Category */}
      <div className="facetGroup">
        <h5 className="facetTitle">Category</h5>
        <div className="facetList">
          {takeOrAll(visibleCategories, showMoreCat).map((item) => {
            const checked = selectedCategories.has(item.label);
            return (
              <label key={item.label} className="facetRow">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSet(item.label, setSelectedCategories)}
                />
                <span className="facetLabel">{item.label}</span>
              </label>
            );
          })}
        </div>
        {visibleCategories.length > 4 && (
          <button className="facetMore" onClick={() => setShowMoreCat((s) => !s)}>
            {showMoreCat ? "Show less" : `Show (${visibleCategories.length - 4}) more`}
          </button>
        )}
      </div>

      {/* Sub-Category */}
      <div className="facetGroup">
        <h5 className="facetTitle">Sub-Category</h5>
        <div className="facetList">
          {takeOrAll(visibleSubCats, showMoreSub).map((item) => {
            const checked = selectedSubCats.has(item.label);
            return (
              <label key={item.label} className="facetRow">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSet(item.label, setSelectedSubCats)}
                />
                <span className="facetLabel">{item.label}</span>
              </label>
            );
          })}
        </div>
        {visibleSubCats.length > 4 && (
          <button className="facetMore" onClick={() => setShowMoreSub((s) => !s)}>
            {showMoreSub ? "Show less" : `Show (${visibleSubCats.length - 4}) more`}
          </button>
        )}
      </div>

      {/* Purity */}
      <div className="facetGroup">
        <h5 className="facetTitle">Purity</h5>
        <div className="facetList">
          {takeOrAll(purities, showMorePurity).map((item) => {
            const checked = selectedPurities.has(item.label);
            return (
              <label key={item.label} className="facetRow">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSet(item.label, setSelectedPurities)}
                />
                <span className="facetLabel">{item.label}</span>
              </label>
            );
          })}
        </div>
        {purities.length > 4 && (
          <button className="facetMore" onClick={() => setShowMorePurity((s) => !s)}>
            {showMorePurity ? "Show less" : `Show (${purities.length - 4}) more`}
          </button>
        )}
      </div>

      {/* Stones */}
      <div className="facetGroup">
        <h5 className="facetTitle">Stones</h5>
        <label className="facetRow">
          <input
            type="checkbox"
            checked={hasStones}
            onChange={(e) => {
              setHasStones(e.target.checked);
              if (!e.target.checked) setSelectedStoneTypes(new Set());
            }}
          />
          <span className="facetLabel">Has Stones</span>
        </label>

        {hasStones && (
          <>
            <div className="facetList">
              {takeOrAll(stoneTypes, showMoreStone).map((item) => {
                const checked = selectedStoneTypes.has(item.label);
                return (
                  <label key={item.label} className="facetRow">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSet(item.label, setSelectedStoneTypes)}
                    />
                    <span className="facetLabel">{item.label}</span>
                  </label>
                );
              })}
            </div>
            {stoneTypes.length > 4 && (
              <button className="facetMore" onClick={() => setShowMoreStone((s) => !s)}>
                {showMoreStone ? "Show less" : `Show (${stoneTypes.length - 4}) more`}
              </button>
            )}
          </>
        )}
      </div>

      {/* In Stock */}
      <div className="facetGroup">
        <h5 className="facetTitle">Availability</h5>
        <label className="facetRow">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          <span className="facetLabel">In-Stock</span>
        </label>
      </div>
    </aside>
  );
};

export default Filter;
