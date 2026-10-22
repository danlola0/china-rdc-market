import React, { useState, useMemo } from 'react';
import { NumberInput } from '../../components/common/NumberInput';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ProductCard } from '../../components/product/ProductCard';
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  MapPin,
  Building,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { CATEGORIES, CHINESE_CITIES } from '../../data/referenceData';

export const CatalogPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { products, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, t, getCategoryName } = useApp();

  const [selectedCity, setSelectedCity] = useState<string>('Toutes les villes');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [moqFilter, setMoqFilter] = useState<string>('all');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.name.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchAgency = p.agencyName.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAgency && !matchCat) return false;
      }

      // 2. Category
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // 3. City in China
      if (selectedCity !== 'Toutes les villes' && p.agencyCity !== selectedCity) {
        return false;
      }

      // 4. Price range
      if (priceRange.min && p.priceMin < parseFloat(priceRange.min)) return false;
      if (priceRange.max && p.priceMin > parseFloat(priceRange.max)) return false;

      // 5. MOQ
      if (moqFilter === '1' && p.moq > 1) return false;
      if (moqFilter === '10' && p.moq > 10) return false;
      if (moqFilter === '50' && p.moq > 50) return false;

      // 6. In stock
      if (onlyInStock && !p.inStock) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceMin - b.priceMin;
      if (sortBy === 'price_desc') return b.priceMin - a.priceMin;
      if (sortBy === 'moq_asc') return a.moq - b.moq;
      if (sortBy === 'newest') return (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0);
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [products, searchQuery, selectedCategory, selectedCity, priceRange, moqFilter, onlyInStock, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedCity('Toutes les villes');
    setPriceRange({ min: '', max: '' });
    setMoqFilter('all');
    setOnlyInStock(false);
  };

  const activeFiltersCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedCity !== 'Toutes les villes' ? 1 : 0) +
    (priceRange.min || priceRange.max ? 1 : 0) +
    (moqFilter !== 'all' ? 1 : 0) +
    (onlyInStock ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Title & Breadcrumb */}
      <div className="mb-6">
        <div className="text-xs text-slate-500 mb-1">
          <span>{t.home}</span>
          <span className="mx-2">/</span>
          <span className="text-slate-800 font-medium">{t.b2bCatalog}</span>
          {selectedCategory !== 'all' && (
            <>
              <span className="mx-2">/</span>
              <span className="text-[#123B70] font-semibold">{getCategoryName(selectedCategory)}</span>
            </>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.b2bCatalog}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t.corridorSub}
            </p>
          </div>

          {/* Quick Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors w-fit cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.clearFilters} ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR FILTERS (Desktop) */}
        <aside className="hidden lg:block space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#123B70]" />
                <span>{t.filters}</span>
              </h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#123B70] hover:underline cursor-pointer"
                >
                  {t.clearFilters}
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t.allCategories}
              </label>
              <div className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#123B70] text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {cat.id !== 'all' && (
                      <span className={`text-[10px] ml-2 ${selectedCategory === cat.id ? 'text-blue-200' : 'text-slate-400'}`}>
                        {products.filter((p) => p.category === cat.id).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* City in China */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t.cityChina}
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70] bg-white cursor-pointer"
              >
                {CHINESE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city === 'Toutes les villes' ? t.allCities : city}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t.priceRangeLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  placeholder={t.minPrice}
                  value={priceRange.min}
                  onChange={(v) => setPriceRange({ ...priceRange, min: v })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#123B70]"
                />
                <NumberInput
                  placeholder={t.maxPrice}
                  value={priceRange.max}
                  onChange={(v) => setPriceRange({ ...priceRange, max: v })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#123B70]"
                />
              </div>
            </div>

            {/* MOQ filter */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t.moqFilterLabel}
              </label>
              <select
                value={moqFilter}
                onChange={(e) => setMoqFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70] bg-white cursor-pointer"
              >
                <option value="all">{t.moqAll}</option>
                <option value="1">{t.moqSmall}</option>
                <option value="10">{t.moqMedium}</option>
                <option value="50">{t.moqLarge}</option>
              </select>
            </div>

            {/* In stock toggle */}
            <div className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded text-[#123B70] focus:ring-[#123B70]"
                />
                <span className="text-xs font-medium text-slate-700">{t.onlyInStock}</span>
              </label>
            </div>
          </div>
        </aside>

        {/* MAIN PRODUCT LISTING */}
        <main className="lg:col-span-3 space-y-6">
          {/* Top Bar with Sort & View Toggle */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-900 font-mono">{filteredProducts.length}</span> {t.resultsCount}
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Filter Trigger Button */}
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{t.filters} {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
              </button>

              {/* Sorting */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 hidden sm:inline">{t.sortByLabel}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="featured">{t.sortFeatured}</option>
                  <option value="newest">{t.sortNewest}</option>
                  <option value="price_asc">{t.sortPriceAsc}</option>
                  <option value="price_desc">{t.sortPriceDesc}</option>
                  <option value="moq_asc">{t.sortMoqAsc}</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="hidden sm:flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400'}`}
                  aria-label="Vue grille"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded cursor-pointer ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400'}`}
                  aria-label="Vue liste"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid / List */}
          {filteredProducts.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">{t.noProductsFound}</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {t.noProductsDesc}
              </p>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-[#123B70] text-white rounded-lg text-xs font-semibold hover:bg-[#0c274c] transition-colors cursor-pointer"
              >
                {t.clearFilters}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE FILTER MODAL DRAWER */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 lg:hidden">
          <div className="bg-white w-full max-w-xs h-full p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900">{t.filters}</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t.allCategories}</label>
              <div className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setMobileFilterOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                      selectedCategory === cat.id ? 'bg-[#123B70] text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {getCategoryName(cat.name)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t.cityChina}</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {CHINESE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city === 'Toutes les villes' ? t.allCities : city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t.moqFilterLabel}</label>
              <select
                value={moqFilter}
                onChange={(e) => setMoqFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">{t.moqAll}</option>
                <option value="1">{t.moqSmall}</option>
                <option value="10">{t.moqMedium}</option>
                <option value="50">{t.moqLarge}</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-2.5 bg-[#123B70] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                {t.resultsCount} ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
