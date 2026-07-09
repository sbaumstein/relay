'use client'

import { useRef } from 'react'
import GooglePlacesAutocomplete from 'react-google-autocomplete'
import { MapPin } from 'lucide-react'

interface LocationPickerProps {
  onSelect: (address: string, neighborhood: string) => void
  defaultValue?: string
  error?: string
}

function extractNeighborhood(components: google.maps.GeocoderAddressComponent[]): string {
  const neighborhoodTypes = ['neighborhood', 'sublocality_level_1', 'sublocality']
  for (const type of neighborhoodTypes) {
    const comp = components.find((c) => c.types.includes(type))
    if (comp) return comp.long_name
  }
  // Fall back to city name
  const city = components.find((c) => c.types.includes('locality'))
  return city?.long_name ?? ''
}

export function LocationPicker({ onSelect, defaultValue = '', error }: LocationPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="space-y-1">
        <input
          type="text"
          defaultValue={defaultValue}
          placeholder="123 Main St, New York, NY"
          onChange={(e) => onSelect(e.target.value, '')}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <GooglePlacesAutocomplete
          apiKey={apiKey}
          defaultValue={defaultValue}
          onPlaceSelected={(place) => {
            const address = place.formatted_address ?? place.name ?? ''
            const neighborhood = place.address_components
              ? extractNeighborhood(place.address_components)
              : ''
            onSelect(address, neighborhood)
          }}
          options={{
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'us' },
          }}
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Search for a studio or address…"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
