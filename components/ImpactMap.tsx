"use client";

import { MouseEvent, useEffect, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type ImpactLocation = {
  id: number;
  city: string;
  state: string;
  country: string;
  coordinates: [number, number];
  category: string;
  color: string;
  glowColor: string;
  impact: string;
  amount: number;
  lives: number;
  size: number;
  icon: string;
};

const impactLocations: ImpactLocation[] = [
  {
    id: 1,
    city: "Rewari",
    state: "Haryana",
    country: "India",
    coordinates: [76.6179, 28.1986],
    category: "Food",
    color: "#4ade80",
    glowColor: "rgba(74,222,128,0.4)",
    impact: "47 children fed",
    amount: 45000,
    lives: 47,
    size: 8,
    icon: "🍱",
  },
  {
    id: 2,
    city: "Muzaffarpur",
    state: "Bihar",
    country: "India",
    coordinates: [85.391, 26.1209],
    category: "Education",
    color: "#60a5fa",
    glowColor: "rgba(96,165,250,0.4)",
    impact: "60 kids, library built",
    amount: 78000,
    lives: 60,
    size: 9,
    icon: "📚",
  },
  {
    id: 3,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    coordinates: [73.8567, 18.5204],
    category: "Healthcare",
    color: "#f87171",
    glowColor: "rgba(248,113,113,0.4)",
    impact: "18 people, medical camp",
    amount: 32000,
    lives: 18,
    size: 7,
    icon: "🏥",
  },
  {
    id: 4,
    city: "Jorhat",
    state: "Assam",
    country: "India",
    coordinates: [94.2026, 26.7509],
    category: "Disaster Relief",
    color: "#fb923c",
    glowColor: "rgba(251,146,60,0.4)",
    impact: "125 flood victims helped",
    amount: 125000,
    lives: 125,
    size: 12,
    icon: "🌧️",
  },
  {
    id: 5,
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    coordinates: [77.209, 28.6139],
    category: "Shelter",
    color: "#a78bfa",
    glowColor: "rgba(167,139,250,0.4)",
    impact: "1000 winter clothes",
    amount: 95000,
    lives: 1000,
    size: 14,
    icon: "🧥",
  },
];

const legendItems = [
  { color: "#4ade80", label: "Food" },
  { color: "#60a5fa", label: "Education" },
  { color: "#f87171", label: "Healthcare" },
  { color: "#fb923c", label: "Disaster" },
  { color: "#a78bfa", label: "Shelter" },
];

type GeographyShape = {
  rsmKey: string;
  properties: {
    name?: string;
  };
};

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-IN");
}

export default function ImpactMap() {
  const [hoveredLocation, setHoveredLocation] =
    useState<ImpactLocation | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [animatedDots, setAnimatedDots] = useState<number[]>([]);

  useEffect(() => {
    const timers = impactLocations.map((loc, index) =>
      window.setTimeout(() => {
        setAnimatedDots((previous) => [...previous, loc.id]);
      }, index * 300),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function handleMarkerEnter(
    event: MouseEvent<SVGElement>,
    location: ImpactLocation,
  ) {
    setHoveredLocation(location);
    setTooltipPos({
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <div
      className="map-container relative w-full overflow-hidden rounded-2xl"
      style={{
        background: "#0a0a12",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="absolute left-5 top-4 z-10">
        <p className="mb-1 text-[11px] uppercase tracking-widest text-[#444455]">
          Global Impact
        </p>
        <p className="text-[13px] font-medium text-[#f0f0f0]">
          Your donations reached these cities
        </p>
      </div>

      <div className="absolute right-5 top-4 z-10">
        <span className="rounded-full border border-white/[0.08] bg-[#1a1a24] px-2.5 py-1 text-[10px] text-[#888899]">
          🌍 Going global soon
        </span>
      </div>

      <div className="absolute bottom-4 left-5 z-10 flex flex-wrap gap-3">
        {legendItems.map((item) => (
          <div className="flex items-center gap-1.5" key={item.label}>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-[10px] text-[#888899]">{item.label}</span>
          </div>
        ))}
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [60, 20],
          scale: 140,
        }}
        style={{ width: "100%", height: "420px" }}
      >
        <ZoomableGroup maxZoom={4} minZoom={1} zoom={1}>
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: GeographyShape[] }) =>
              geographies.map((geo) => {
                const isIndia = geo.properties.name === "India";

                return (
                  <Geography
                    geography={geo}
                    key={geo.rsmKey}
                    style={{
                      default: {
                        fill: isIndia ? "#1a1a24" : "#0d0d14",
                        filter: isIndia
                          ? "drop-shadow(0 0 8px rgba(240,192,64,0.1))"
                          : "none",
                        outline: "none",
                        stroke: isIndia
                          ? "rgba(240,192,64,0.15)"
                          : "rgba(255,255,255,0.04)",
                        strokeWidth: isIndia ? 0.8 : 0.3,
                      },
                      hover: {
                        fill: isIndia ? "#1f1f3a" : "#0d0d14",
                        outline: "none",
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {impactLocations.map((location) => {
            const isVisible = animatedDots.includes(location.id);
            const isHovered = hoveredLocation?.id === location.id;

            return (
              <Marker
                coordinates={location.coordinates}
                key={location.id}
                onMouseEnter={(event) => handleMarkerEnter(event, location)}
                onMouseLeave={() => setHoveredLocation(null)}
              >
                <circle
                  fill="transparent"
                  opacity={isVisible ? 0.3 : 0}
                  r={isHovered ? location.size + 8 : location.size + 4}
                  stroke={location.color}
                  strokeWidth={1}
                  style={{
                    animation: isVisible
                      ? "dotPulse 2s ease-in-out infinite"
                      : "none",
                    transition: "all 0.5s ease",
                  }}
                />
                <circle
                  fill="transparent"
                  opacity={isVisible ? 0.5 : 0}
                  r={isHovered ? location.size + 4 : location.size + 2}
                  stroke={location.color}
                  strokeWidth={1.5}
                  style={{
                    animation: isVisible
                      ? "dotPulse 2s ease-in-out infinite 0.3s"
                      : "none",
                    transition: "all 0.5s ease",
                  }}
                />
                <circle
                  fill={location.color}
                  opacity={isVisible ? 1 : 0}
                  r={isHovered ? location.size + 1 : location.size}
                  style={{
                    filter: `drop-shadow(0 0 ${isHovered ? 12 : 6}px ${
                      location.color
                    })`,
                    transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                />
                <text
                  fontSize={location.size * 0.9}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: "none",
                    transition: "opacity 0.5s ease",
                  }}
                  textAnchor="middle"
                  y={location.size * 0.4}
                >
                  {location.icon}
                </text>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {hoveredLocation && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: tooltipPos.x + 16,
            top: tooltipPos.y - 80,
          }}
        >
          <div
            style={{
              background: "#1a1a24",
              border: `1px solid ${hoveredLocation.color}30`,
              borderLeft: `3px solid ${hoveredLocation.color}`,
              borderRadius: "12px",
              boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${hoveredLocation.glowColor}`,
              minWidth: "200px",
              padding: "12px 16px",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{hoveredLocation.icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-[#f0f0f0]">
                  {hoveredLocation.city}
                </p>
                <p className="text-[11px] text-[#888899]">
                  {hoveredLocation.state}, {hoveredLocation.country}
                </p>
              </div>
            </div>
            <div className="my-2 h-px bg-white/[0.06]" />
            <p className="mb-1 text-[12px] text-[#f0f0f0]">
              {hoveredLocation.impact}
            </p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span
                className="text-[11px]"
                style={{ color: hoveredLocation.color }}
              >
                {hoveredLocation.lives} lives impacted
              </span>
              <span className="text-[11px] font-medium text-[#f0c040]">
                ₹{formatCurrency(hoveredLocation.amount)} used
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
