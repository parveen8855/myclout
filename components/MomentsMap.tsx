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

type MomentLocation = {
  id: number;
  city: string;
  state: string;
  coordinates: [number, number];
  type: string;
  color: string;
  glowColor: string;
  story: string;
  person: string;
  emoji: string;
  size: number;
  likes: number;
};

const momentLocations: MomentLocation[] = [
  {
    id: 1,
    city: "South Delhi",
    state: "Delhi",
    coordinates: [77.209, 28.5244],
    type: "Proposal 💍",
    color: "#f0c040",
    glowColor: "rgba(240,192,64,0.4)",
    story: "Sneha got proposed with a flash mob",
    person: "Sneha Sharma",
    emoji: "💍",
    size: 14,
    likes: 1423,
  },
  {
    id: 2,
    city: "Ludhiana",
    state: "Punjab",
    coordinates: [75.8573, 30.901],
    type: "Surprise 🎉",
    color: "#a78bfa",
    glowColor: "rgba(167,139,250,0.4)",
    story: "Parents surprised on 25th anniversary",
    person: "Anonymous",
    emoji: "🎉",
    size: 11,
    likes: 987,
  },
  {
    id: 3,
    city: "Bengaluru",
    state: "Karnataka",
    coordinates: [77.5946, 12.9716],
    type: "Prank 😂",
    color: "#60a5fa",
    glowColor: "rgba(96,165,250,0.4)",
    story: "Epic job loss prank on best friend",
    person: "Vikram Nair",
    emoji: "😂",
    size: 10,
    likes: 756,
  },
  {
    id: 4,
    city: "Barmer",
    state: "Rajasthan",
    coordinates: [71.3536, 25.7521],
    type: "Awareness 📢",
    color: "#4ade80",
    glowColor: "rgba(74,222,128,0.4)",
    story: "First mental health camp in the village",
    person: "Riya Gupta",
    emoji: "📢",
    size: 9,
    likes: 634,
  },
  {
    id: 5,
    city: "Lucknow",
    state: "Uttar Pradesh",
    coordinates: [80.9462, 26.8467],
    type: "Surprise 🎉",
    color: "#f0c040",
    glowColor: "rgba(240,192,64,0.4)",
    story: "Kavya found out she cracked UPSC!",
    person: "Arjun Mehta",
    emoji: "🏆",
    size: 16,
    likes: 2341,
  },
];

const legendItems = [
  { color: "#f0c040", label: "💍 Proposal" },
  { color: "#a78bfa", label: "🎉 Surprise" },
  { color: "#60a5fa", label: "😂 Prank" },
  { color: "#4ade80", label: "📢 Awareness" },
];

type GeographyShape = {
  rsmKey: string;
  properties: {
    name?: string;
  };
};

export default function MomentsMap() {
  const [hoveredMoment, setHoveredMoment] = useState<MomentLocation | null>(
    null,
  );
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [animatedDots, setAnimatedDots] = useState<number[]>([]);

  useEffect(() => {
    const timers = momentLocations.map((moment, index) =>
      window.setTimeout(() => {
        setAnimatedDots((previous) => [...previous, moment.id]);
      }, index * 250),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function handleMarkerEnter(
    event: MouseEvent<SVGElement>,
    moment: MomentLocation,
  ) {
    setHoveredMoment(moment);
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
          Moments Map
        </p>
        <p className="text-[13px] font-medium text-[#f0f0f0]">
          Every dot is a real moment
        </p>
      </div>

      <div className="absolute bottom-11 left-5 z-10 flex flex-wrap gap-3">
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

      <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-[11px] text-[#888899]">
        Every dot changed someone&apos;s day forever ✨
      </p>

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
                        fill: isIndia ? "#1f1a2e" : "#0d0d14",
                        filter: isIndia
                          ? "drop-shadow(0 0 10px rgba(167,139,250,0.12))"
                          : "none",
                        outline: "none",
                        stroke: isIndia
                          ? "rgba(167,139,250,0.2)"
                          : "rgba(255,255,255,0.04)",
                        strokeWidth: isIndia ? 0.8 : 0.3,
                      },
                      hover: {
                        fill: isIndia ? "#2a2240" : "#0d0d14",
                        outline: "none",
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {momentLocations.map((moment) => {
            const isVisible = animatedDots.includes(moment.id);
            const isHovered = hoveredMoment?.id === moment.id;
            const isLegendary = moment.id === 5;

            return (
              <Marker
                coordinates={moment.coordinates}
                key={moment.id}
                onClick={() => console.log("Moment clicked:", moment)}
                onMouseEnter={(event) => handleMarkerEnter(event, moment)}
                onMouseLeave={() => setHoveredMoment(null)}
              >
                {isLegendary && (
                  <circle
                    fill="transparent"
                    opacity={isVisible ? 0.35 : 0}
                    r={isHovered ? moment.size + 14 : moment.size + 10}
                    stroke={moment.color}
                    strokeWidth={1.2}
                    style={{
                      animation: isVisible
                        ? "dotPulse 3s ease-in-out infinite"
                        : "none",
                      transition: "all 0.5s ease",
                    }}
                  />
                )}
                <circle
                  fill="transparent"
                  opacity={isVisible ? 0.35 : 0}
                  r={isHovered ? moment.size + 8 : moment.size + 4}
                  stroke={moment.color}
                  strokeWidth={1}
                  style={{
                    animation: isVisible
                      ? "dotPulse 1.5s ease-in-out infinite"
                      : "none",
                    transition: "all 0.5s ease",
                  }}
                />
                <circle
                  fill="transparent"
                  opacity={isVisible ? 0.55 : 0}
                  r={isHovered ? moment.size + 4 : moment.size + 2}
                  stroke={moment.color}
                  strokeWidth={1.5}
                  style={{
                    animation: isVisible
                      ? "dotPulse 1.5s ease-in-out infinite 0.2s"
                      : "none",
                    transition: "all 0.5s ease",
                  }}
                />
                <circle
                  fill={moment.color}
                  opacity={isVisible ? 1 : 0}
                  r={isHovered ? moment.size + 1 : moment.size}
                  style={{
                    cursor: "pointer",
                    filter: `drop-shadow(0 0 ${isHovered ? 14 : 7}px ${
                      moment.color
                    })`,
                    transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                />
                <text
                  fontSize={moment.size * 0.9}
                  style={{
                    cursor: "pointer",
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: "none",
                    transition: "opacity 0.5s ease",
                  }}
                  textAnchor="middle"
                  y={moment.size * 0.4}
                >
                  {moment.emoji}
                </text>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {hoveredMoment && (
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
              border: `1px solid ${hoveredMoment.color}30`,
              borderLeft: `3px solid ${hoveredMoment.color}`,
              borderRadius: "12px",
              boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${hoveredMoment.glowColor}`,
              minWidth: "220px",
              padding: "12px 16px",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{hoveredMoment.emoji}</span>
              <div>
                <p className="text-[13px] font-semibold text-[#f0f0f0]">
                  {hoveredMoment.person}
                </p>
                <p className="text-[11px] text-[#888899]">
                  {hoveredMoment.city}, {hoveredMoment.state}
                </p>
              </div>
            </div>
            <div className="my-2 h-px bg-white/[0.06]" />
            <p className="text-[12px] text-[#f0f0f0]">
              {hoveredMoment.story}
            </p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span
                className="text-[11px]"
                style={{ color: hoveredMoment.color }}
              >
                {hoveredMoment.type}
              </span>
              <span className="text-[11px] font-medium text-[#f0c040]">
                ❤️ {hoveredMoment.likes.toLocaleString("en-IN")} people loved
                this
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
