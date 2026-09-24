'use client'

import { Marker, Popup } from 'react-leaflet'
import { DivIcon } from 'leaflet'
import {
  PlacePhoto,
  PlaceBody,
  PlaceTitle,
  PlaceAddress,
  PlaceMeta,
  PlaceActions,
  ActionLink,
} from '@/components/place'

/**
 * Minimal shape a map marker needs. LibraryEntry satisfies this; session
 * results can map their restaurants into it too.
 */
export interface MapPlace {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  photoUrl?: string
  nominationCount?: number
  favoriteDishes?: string[]
}

// DivIcon html is a raw string, so token classes can't reach it — these hex
// values mirror the tailwind tokens: #333333 = surface-card, #EA4D19 = brand.
const createDefaultIcon = (isHighlighted: boolean = false) => {
  return new DivIcon({
    className: 'custom-marker',
    html: `<div style="
      font-size: 19px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isHighlighted ? '#EA4D19' : '#333333'};
      border: 3px solid ${isHighlighted ? '#ffffff' : '#EA4D19'};
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      cursor: pointer;
    ">🍽️</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

// Nominated place — carries the community heart
const createNominatedIcon = (isHighlighted: boolean = false) => {
  return new DivIcon({
    className: 'nominated-marker',
    html: `<div style="
      font-size: 19px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isHighlighted ? '#EA4D19' : '#333333'};
      border: 3px solid ${isHighlighted ? '#ffffff' : '#EA4D19'};
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      cursor: pointer;
      position: relative;
    ">🍽️<span style="
      position: absolute;
      bottom: -4px;
      right: -4px;
      font-size: 10px;
      background: #222222;
      border-radius: 50%;
      width: 17px;
      height: 17px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #EA4D19;
    ">❤️</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

// Winner marker for session results (rank number)
const createWinnerIcon = (rank: number) => {
  return new DivIcon({
    className: 'winner-marker',
    html: `<div style="
      font-size: 15px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #EA4D19;
      color: white;
      font-weight: bold;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 16px rgba(234, 77, 25, 0.45);
      cursor: pointer;
    ">${rank}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  })
}

export interface RestaurantMarkerProps {
  place: MapPlace
  isHighlighted?: boolean
  rank?: number
  onClick?: () => void
  disablePopup?: boolean
  /** href for the popup's "View page" action (e.g. /restaurant/[id]) */
  detailHref?: string
}

export function RestaurantMarker({
  place,
  isHighlighted = false,
  rank,
  onClick,
  disablePopup = false,
  detailHref,
}: RestaurantMarkerProps) {
  const position: [number, number] = [place.lat, place.lng]
  const isNominated = (place.nominationCount ?? 0) > 0

  const icon = rank
    ? createWinnerIcon(rank)
    : isNominated
      ? createNominatedIcon(isHighlighted)
      : createDefaultIcon(isHighlighted)

  if (disablePopup) {
    return (
      <Marker
        position={position}
        icon={icon}
        eventHandlers={{ click: () => onClick?.() }}
      />
    )
  }

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{ click: () => onClick?.() }}
    >
      <Popup>
        <div className="min-w-[240px] max-w-[280px]">
          <PlacePhoto src={place.photoUrl} alt={place.name} loved={isNominated} height="sm" />
          <PlaceBody padding="sm">
            <PlaceTitle className="text-base">{place.name}</PlaceTitle>
            {place.address && <PlaceAddress className="text-xs">{place.address}</PlaceAddress>}
            <PlaceMeta
              nominationCount={place.nominationCount ?? 0}
              dishes={place.favoriteDishes}
              maxChips={3}
            />
            <PlaceActions className="mt-3">
              {detailHref && (
                <ActionLink href={detailHref} variant="primary" className="text-xs">
                  See the page →
                </ActionLink>
              )}
              <ActionLink
                href={`https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lng}`}
                external
                className="text-xs"
              >
                Directions ↗
              </ActionLink>
            </PlaceActions>
          </PlaceBody>
        </div>
      </Popup>
    </Marker>
  )
}
