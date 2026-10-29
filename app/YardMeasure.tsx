"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./components/shared";

type Point = [number, number];
type Props = {
  initialAddress: string;
  onApply: (feet: number, address: string) => void;
};

const standardPoints = [
  "Back-left house corner",
  "Left rear property corner",
  "Right rear property corner",
  "Back-right house corner",
];

const feetBetween = (a: Point, b: Point) => {
  const r = 20902231,
    lat1 = (a[0] * Math.PI) / 180,
    lat2 = (b[0] * Math.PI) / 180,
    dLat = ((b[0] - a[0]) * Math.PI) / 180,
    dLng = ((b[1] - a[1]) * Math.PI) / 180,
    h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
};
const measurements = (points: Point[]) => {
  if (points.length < 2) return { feet: 0 };
  let feet = 0;
  for (let i = 1; i < points.length; i++)
    feet += feetBetween(points[i - 1], points[i]);
  return { feet: Math.round(feet) };
};

export default function YardMeasure({ initialAddress, onApply }: Props) {
  const mapNode = useRef<HTMLDivElement | null>(null),
    mapRef = useRef<any>(null),
    layerRef = useRef<any>(null),
    leafletRef = useRef<any>(null);
  const [open, setOpen] = useState(false),
    [address, setAddress] = useState(initialAddress),
    [matched, setMatched] = useState(initialAddress),
    [points, setPoints] = useState<Point[]>([]),
    [searching, setSearching] = useState(false),
    [error, setError] = useState("");
  const result = measurements(points);
  useEffect(() => {
    if (!open || !mapNode.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapNode.current) return;
      leafletRef.current = L;
      const map = L.map(mapNode.current, {
        zoomControl: true,
        attributionControl: true,
        zoomSnap: 0.5,
      }).setView([39.798, -89.644], 18);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxNativeZoom: 19,
          maxZoom: 22,
          attribution:
            "Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        },
      ).addTo(map);
      map.on("click", (event: any) =>
        setPoints((current) => [
          ...current,
          [event.latlng.lat, event.latlng.lng],
        ]),
      );
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);
  useEffect(() => {
    const L = leafletRef.current,
      map = mapRef.current;
    if (!L || !map) return;
    if (layerRef.current) layerRef.current.remove();
    const group = L.layerGroup().addTo(map);
    points.forEach((point, index) =>
      L.circleMarker(point, {
        radius: 6,
        color: "#c8ef5a",
        weight: 3,
        fillColor: "#123447",
        fillOpacity: 1,
      })
        .bindTooltip(String(index + 1), {
          permanent: true,
          direction: "center",
          className: "measurePoint",
        })
        .addTo(group),
    );
    if (points.length > 1)
      L.polyline(points, {
        color: "#c8ef5a",
        weight: 4,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);
    layerRef.current = group;
  }, [points]);
  const locate = async () => {
    setSearching(true);
    setError("");
    try {
      const response = await fetch(
          `/api/geocode?address=${encodeURIComponent(address)}`,
        ),
        data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Address not found");
      setMatched(data.matchedAddress);
      mapRef.current?.setView([data.lat, data.lng], 19);
      setPoints([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Address not found");
    } finally {
      setSearching(false);
    }
  };
  if (!open)
    return (
      <button
        className="satelliteLaunch"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span>
          <Icon name="pin" size={20} />
        </span>
        <div>
          <strong>Measure the backyard fence run</strong>
          <small>Trace from one back house corner to the other</small>
        </div>
        <b>Open yard map</b>
      </button>
    );
  return (
    <section className="yardMeasure">
      <div className="yardMeasureHead">
        <div>
          <span>
          <Icon name="pin" size={20} />
        </span>
          <div>
            <strong>Backyard fence measure</strong>
            <small>
              Zoom to the house, then place the four fence points in order.
            </small>
          </div>
        </div>
        <button className="quiet" type="button" onClick={() => setOpen(false)}>
          Close map
        </button>
      </div>
      <div className="mapSearch">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && locate()}
          aria-label="Property address"
        />
        <button
          className="primary"
          type="button"
          disabled={searching || !address.trim()}
          onClick={locate}
        >
          {searching ? "Locating…" : "Find property"}
        </button>
      </div>
      {error && <div className="mapError">{error}</div>}
      <div className="mapGuide">
        {standardPoints.map((label, index) => (
          <div
            className={
              points.length > index
                ? "complete"
                : points.length === index
                  ? "current"
                  : ""
            }
            key={label}
          >
            <span>{points.length > index ? "✓" : index + 1}</span>
            {label}
          </div>
        ))}
      </div>
      <div className="mapCanvas" ref={mapNode} />
      <div className="measureBar">
        <div>
          <span>Fence points</span>
          <strong>{points.length}</strong>
        </div>
        <div>
          <span>Estimated fence run</span>
          <strong>{result.feet.toLocaleString()} ft</strong>
        </div>
        <div>
          <span>Layout</span>
          <strong className="layoutLabel">House → rear line → house</strong>
        </div>
        <div className="measureActions">
          <button
            className="quiet"
            type="button"
            disabled={!points.length}
            onClick={() => setPoints(points.slice(0, -1))}
          >
            Undo point
          </button>
          <button
            className="quiet"
            type="button"
            disabled={!points.length}
            onClick={() => setPoints([])}
          >
            Reset
          </button>
          <button
            className="primary"
            type="button"
            disabled={points.length < 4}
            onClick={() => onApply(result.feet, matched)}
          >
            Use this fence run
          </button>
        </div>
      </div>
      <p className="mapNotice">
        This measures an open fence line; it does not connect back across the
        house. Planning estimate only—confirm property corners, utilities,
        terrain, and final footage onsite. Imagery sources: Esri, Maxar,
        Earthstar Geographics, and the GIS User Community.
      </p>
    </section>
  );
}
