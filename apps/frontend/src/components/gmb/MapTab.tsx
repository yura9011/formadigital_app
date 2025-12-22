
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { Business, SearchParams, Language } from './types';
import { TRANSLATIONS } from './constants';
import { searchCompetitors } from '../../services/gmb.service';

// Fix Leaflet Icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
});

interface MapTabProps {
    language: Language;
    onSearchComplete: (data: Business[]) => void;
    currentData: Business[];
    onSetClient: (b: Business | undefined) => void;
    onSwitchToAudit: () => void;
    searchParams: SearchParams;
    setSearchParams: (params: SearchParams) => void;
    isReportMode?: boolean;
}

const MapTab: React.FC<MapTabProps> = ({
    language,
    onSearchComplete,
    currentData,
    onSetClient,
    onSwitchToAudit,
    searchParams,
    setSearchParams,
    isReportMode = false
}) => {
    const t = TRANSLATIONS[language].mapTab;
    const [isLoading, setIsLoading] = useState(false);

    // --- Feature 5: Recent Searches ---
    const [recentSearches, setRecentSearches] = useState<SearchParams[]>([]);

    // --- Feature 1: Quick Filters ---
    const [filters, setFilters] = useState({
        minRating: 0,
        hideChains: false,
        openNow: false
    });

    // Derived state for filtered data
    const [filteredData, setFilteredData] = useState<Business[]>([]);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (mapContainerRef.current && !mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                preferCanvas: true,
                zoomControl: !isReportMode,
                dragging: !isReportMode,
                scrollWheelZoom: !isReportMode,
                doubleClickZoom: !isReportMode
            }).setView([0, 0], 2);

            // Base Map Layers
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                crossOrigin: true
            });

            const radarKey = process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY;

            if (radarKey) {
                // Try Radar (Standard Raster Style)
                const radarUrl = `https://api.radar.io/maps/styles/radar-default-v1/{z}/{x}/{y}.png?publishableKey=${radarKey}`;

                const radarTileLayer = L.tileLayer(radarUrl, {
                    attribution: '<a href="https://radar.com" target="_blank">Radar</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
                    maxZoom: 20,
                });

                // Fallback Handler
                radarTileLayer.on('tileerror', (e) => {
                    console.warn("Radar Map Failed (404/Auth). Switching to OSM Fallback.");

                    // Avoid infinite loops or multiple toasts
                    if (map.hasLayer(radarTileLayer)) {
                        map.removeLayer(radarTileLayer);

                        if (!map.hasLayer(osmLayer)) {
                            osmLayer.addTo(map);
                            toast.error("Radar Map Load Failed. Switched to OpenStreetMap.", {
                                id: 'map-fallback', // Unique ID to prevent duplicates
                                duration: 4000
                            });
                        }
                    }
                });

                radarTileLayer.addTo(map);
            } else {
                // No Key -> Direct OSM
                osmLayer.addTo(map);
            }
            // L.tileLayer('https://api.radar.io/maps/raster/v1/style/{z}/{x}/{y}?publishableKey=prj_test_pk_...&layers=labels', { ... }).addTo(map);

            markersLayerRef.current = L.layerGroup().addTo(map);
            mapInstanceRef.current = map;
        }
        // ... (rest of cleanup)
    }, [isReportMode]);

    useEffect(() => {
        if (!mapInstanceRef.current || !markersLayerRef.current) return;

        const layerGroup = markersLayerRef.current;
        layerGroup.clearLayers();

        if (currentData.length === 0) {
            mapInstanceRef.current.setView([-34.6037, -58.3816], 12);
            return;
        }

        const validLocations = currentData.filter(b => b.latitude !== 0 && b.longitude !== 0);

        let centerLat = -34.6037;
        let centerLng = -58.3816;

        const clientBiz = currentData.find(b => b.isClient);

        if (clientBiz && clientBiz.latitude !== 0 && clientBiz.longitude !== 0) {
            centerLat = clientBiz.latitude;
            centerLng = clientBiz.longitude;
        }
        else if (validLocations.length > 0) {
            const sumLat = validLocations.reduce((sum, b) => sum + b.latitude, 0);
            const sumLng = validLocations.reduce((sum, b) => sum + b.longitude, 0);
            centerLat = sumLat / validLocations.length;
            centerLng = sumLng / validLocations.length;
        }

        const kmPerLat = 111.32;
        const kmPerLng = (40075 * Math.cos(centerLat * Math.PI / 180)) / 360;

        // Create Icon Helper
        const createCustomIcon = (rating: number, isClient: boolean) => {
            return L.divIcon({
                className: 'bg-transparent',
                html: `
                    <div style="
                        width: 32px; 
                        height: 32px; 
                        background-color: ${isClient ? '#9333ea' : (rating >= 4.0 ? '#86efac' : '#fef08a')}; 
                        border: 3px solid black; 
                        transform: rotate(45deg); 
                        box-shadow: 4px 4px 0px black;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div style="
                            width: 10px; 
                            height: 10px; 
                            background-color: ${isClient ? 'white' : 'black'}; 
                            transform: rotate(-45deg);
                        "></div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -25]
            });
        };

        const bounds = L.latLngBounds([]);

        // Use filteredData instead of currentData for markers
        filteredData.forEach((business, index) => {
            let lat = business.latitude;
            let lng = business.longitude;
            let isSynthetic = false;

            if (lat === 0 || lng === 0) {
                isSynthetic = true;

                if (business.isClient) {
                    lat = centerLat;
                    lng = centerLng;
                } else {
                    const angle = (index / filteredData.length) * 2 * Math.PI;
                    const distanceKm = searchParams.radius * (0.3 + ((index % 5) * 0.1));
                    const deltaLat = (Math.sin(angle) * distanceKm) / kmPerLat;
                    const deltaLng = (Math.cos(angle) * distanceKm) / kmPerLng;
                    lat = centerLat + deltaLat;
                    lng = centerLng + deltaLng;
                }
            }

            const isClient = business.isClient;

            // Create Marker
            const marker = L.marker([lat, lng], {
                icon: createCustomIcon(business.rating, isClient),
                zIndexOffset: isClient ? 1000 : 0
            });

            // Brutalist Popup
            const popupContent = `
                <div style="font-family: 'Inter', sans-serif; min-width: 220px; padding: 5px;">
                    <h3 style="font-weight: 900; font-size: 18px; margin-bottom: 4px; color: black; text-transform: uppercase;">${business.name}</h3>
                    <p style="font-size: 14px; color: #333; margin-bottom: 12px; font-weight: 500;">${business.address}</p>
                    ${business.rating ? `<div style="display:flex; align-items:center; gap:6px; font-weight:800; font-size:14px; background: #fffbeb; border: 2px solid black; padding: 4px 8px; width: fit-content; margin-bottom: 12px;"><span style="color:#f59e0b">★</span> ${business.rating}</div>` : ''}
                    
                    <div style="display: flex; gap: 8px;">
                        <button 
                            onclick="window.handleMapAction('${business.id}', 'client')"
                            style="flex: 1; background: #9333ea; color: white; border: 2px solid black; box-shadow: 3px 3px 0px black; padding: 10px; font-weight: 800; cursor: pointer; transition: all 0.1s;"
                            onmousedown="this.style.transform='translate(2px, 2px)'; this.style.boxShadow='0px 0px 0px black';"
                            onmouseup="this.style.transform='translate(0, 0)'; this.style.boxShadow='3px 3px 0px black';"
                        >
                            SELECT
                        </button>
                         <button 
                            onclick="window.handleMapAction('${business.id}', 'competitor')"
                            style="flex: 1; background: white; color: black; border: 2px solid black; box-shadow: 3px 3px 0px black; padding: 10px; font-weight: 800; cursor: pointer; transition: all 0.1s;"
                            onmousedown="this.style.transform='translate(2px, 2px)'; this.style.boxShadow='0px 0px 0px black';"
                            onmouseup="this.style.transform='translate(0, 0)'; this.style.boxShadow='3px 3px 0px black';"
                        >
                            TARGET
                        </button>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);

            // IMPORTANT: use mapInstance check or ref
            if (markersLayerRef.current) {
                marker.addTo(markersLayerRef.current);
            }
            // Use local var or global ref? layerGroup not defined here.

            bounds.extend([lat, lng]);
        });

        // Add Radius Circle
        if (markersLayerRef.current) {
            const circle = L.circle([centerLat, centerLng], {
                radius: searchParams.radius * 1000,
                color: 'black',
                weight: 2,
                fillColor: '#fef08a',
                fillOpacity: 0.2, // Brutalist Circle style
                dashArray: '10, 10'
            }).addTo(markersLayerRef.current);
            bounds.extend(circle.getBounds());

            if (bounds.isValid()) {
                mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] });
            } else {
                mapInstanceRef.current?.setView([centerLat, centerLng], 14);
            }
        }

    }, [filteredData, searchParams.radius]); // Switched to filteredData


    // State hoisted to top
    // ...


    useEffect(() => {
        let res = [...currentData];
        if (filters.hideChains) {
            // Heuristic: Chains often have same name as others, or we can use specific list. 
            // For now, let's filter likely chains (Burger King, Starbucks, etc if they appear)
            // or just business with > 10 reviews but low rating?
            // Actual logic: Filter by category or name keywords if available. 
            // Simple version: no-op placeholder for now until we have "isChain" flag.
        }
        if (filters.minRating > 0) {
            // Note: meaningful for Audit step, but Radar search often returns 0 rating initially.
            // This filter might hide everything if we haven't audited yet.
            // Let's assume user wants to filter mapped results that *have* ratings.
            res = res.filter(b => b.rating >= filters.minRating || b.rating === 0);
        }
        setFilteredData(res);
    }, [currentData, filters]);

    // Update map markers when filteredData changes (not currentData)
    // We need to modify the useEffect below that draws markers to use 'filteredData' instead.

    useEffect(() => {
        const saved = localStorage.getItem('gmb_recent_searches');
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch (e) { console.error("History parse error", e); }
        }
    }, []);

    const saveToHistory = (params: SearchParams) => {
        const newHistory = [params, ...recentSearches.filter(s => s.keywords !== params.keywords || s.address !== params.address)].slice(0, 5);
        setRecentSearches(newHistory);
        localStorage.setItem('gmb_recent_searches', JSON.stringify(newHistory));
    };

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            saveToHistory(searchParams); // Save to history
            const results = await searchCompetitors(searchParams);
            onSearchComplete(results);
            if (results.length === 0) {
                toast.error(t.noResults, { style: { borderRadius: '0px', border: '2px solid black', boxShadow: '4px 4px 0 #000' } });
            } else {
                toast.success(`${t.found} ${results.length} ${t.competitors}`, { style: { borderRadius: '0px', border: '2px solid black', boxShadow: '4px 4px 0 #000' } });
            }
        } catch (error) {
            console.error(error);
            toast.error(t.errorSearch, { style: { borderRadius: '0px', border: '2px solid black', boxShadow: '4px 4px 0 #000' } });
        } finally {
            setIsLoading(false);
        }
    };

    const restoreSearch = (s: SearchParams) => {
        setSearchParams(s);
        // Optional: Auto-trigger search? Let's just fill inputs for now to be safe.
        toast.success("Resumed Search: " + s.keywords, { icon: '🕒' });
    };

    return (
        <div className="flex flex-col h-full space-y-8">
            {!isReportMode && (
                <div className="bg-white p-6 border-2 border-neo-border shadow-neo">

                    {/* Quick Filters Toolbar */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest self-center mr-2">Filters:</span>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, minRating: prev.minRating === 4 ? 0 : 4 }))}
                            className={`px-3 py-1 text-xs font-bold border-2 transition-all ${filters.minRating === 4 ? 'bg-yellow-300 border-black translate-x-[2px] translate-y-[2px] shadow-none' : 'bg-white border-neo-border shadow-neo'}`}
                        >
                            ★ 4.0+ Only
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, hideChains: !prev.hideChains }))}
                            className={`px-3 py-1 text-xs font-bold border-2 transition-all ${filters.hideChains ? 'bg-blue-300 border-black translate-x-[2px] translate-y-[2px] shadow-none' : 'bg-white border-neo-border shadow-neo'}`}
                        >
                            🚫 Hide Chains
                        </button>
                        {/* Add more filters here easily */}
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, openNow: !prev.openNow }))}
                            className={`px-3 py-1 text-xs font-bold border-2 transition-all ${filters.openNow ? 'bg-green-300 border-black translate-x-[2px] translate-y-[2px] shadow-none' : 'bg-white border-neo-border shadow-neo'}`}
                        >
                            🕒 Open Now
                        </button>
                    </div>

                    {/* Recent Searches Chips */}
                    {recentSearches.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest self-center mr-2">History:</span>
                            {recentSearches.map((s, i) => (
                                <button key={i} onClick={() => restoreSearch(s)} className="text-xs bg-gray-100 hover:bg-yellow-100 border border-gray-300 px-2 py-1 rounded transition-colors text-gray-600 flex items-center">
                                    <span className="font-bold mr-1">{s.keywords}</span>
                                    <span className="truncate max-w-[100px] opacity-70">({s.address.split(',')[0]})</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end mb-2">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-black uppercase text-neo-text mb-2">{t.clientAddress}</label>
                            <input
                                type="text"
                                className="w-full border-2 border-neo-border p-3 font-bold shadow-neo focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
                                placeholder={t.placeholderAddress}
                                value={searchParams.address}
                                onChange={(e) => setSearchParams({ ...searchParams, address: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-black uppercase text-neo-text mb-2">{t.keywords}</label>
                            <input
                                type="text"
                                className="w-full border-2 border-neo-border p-3 font-bold shadow-neo focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
                                placeholder={t.placeholderKeywords}
                                value={searchParams.keywords}
                                onChange={(e) => setSearchParams({ ...searchParams, keywords: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-black uppercase text-neo-text mb-2">{t.radius}</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                className="w-full border-2 border-neo-border p-3 font-bold shadow-neo focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
                                value={searchParams.radius}
                                onChange={(e) => setSearchParams({ ...searchParams, radius: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <button
                                onClick={handleSearch}
                                disabled={isLoading}
                                className={`w-full text-white p-3 border-2 border-neo-border font-black uppercase shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-neo-blue hover:bg-black'}`}
                            >
                                {isLoading ? t.searching : t.searchBtn}
                            </button>
                        </div>
                    </div>

                    <div className="w-full mt-4">
                        <label className="block text-sm font-black uppercase text-neo-text mb-2">
                            {t.products} <span className="text-gray-400 font-medium text-xs normal-case">(Optional but Recommended)</span>
                        </label>
                        <input
                            type="text"
                            className="w-full border-2 border-neo-border p-3 font-bold shadow-neo focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
                            placeholder={t.placeholderProducts}
                            value={searchParams.products}
                            onChange={(e) => setSearchParams({ ...searchParams, products: e.target.value })}
                        />
                    </div>
                </div>
            )}

            <div className={`relative bg-white border-2 border-neo-border shadow-neo ${isReportMode ? 'h-[400px] border-none shadow-none' : 'h-[600px]'} flex flex-col overflow-hidden`}>

                {isLoading && (
                    <div className="absolute inset-0 z-[500] bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-neo-border border-t-neo-blue mx-auto mb-4"></div>
                            <p className="text-neo-blue font-black uppercase text-xl animate-pulse">{t.searching}</p>
                        </div>
                    </div>
                )}

                <div ref={mapContainerRef} className="w-full h-full z-0" />

                {currentData.length > 0 && (
                    <div className="absolute top-4 right-4 z-[400] bg-white px-4 py-3 border-2 border-neo-border shadow-neo text-right">
                        <div className="text-3xl font-black text-neo-text leading-none">{currentData.length}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t.resultsFound}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapTab;
