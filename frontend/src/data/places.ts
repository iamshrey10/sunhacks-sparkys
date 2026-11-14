export type PlaceKind =
  | 'campus'
  | 'library'
  | 'sports'
  | 'transit'
  | 'park'
  | 'street'
  | 'water'
  | 'cooling'
  | 'other'

export interface Place {
  id: string
  name: string
  /** Other names people type: abbreviations, former names, nearby terms. */
  aliases: string[]
  kind: PlaceKind
  lat: number
  lng: number
  /** True when the point is beyond the walking-route area (routing would fail). */
  outsideRoutes?: boolean
}

/**
 * Well-known places in the demo area (ASU Tempe campus and Mill Ave).
 *
 * Coordinates come from OpenStreetMap (looked up once by place name, not at
 * runtime) and Hayden Library also matches data/resources/osm_resources.json.
 * Each point lies within 170 m of the walking network, except Tempe Town Lake,
 * which is about 560 m north of it, so it is marked outsideRoutes.
 */
export const PLACES: Place[] = [
  { id: 'memorial-union', name: 'Memorial Union', aliases: ['MU', 'union', 'memorial'], kind: 'campus', lat: 33.4177272, lng: -111.9344005 },
  { id: 'hayden-library', name: 'Hayden Library', aliases: ['hayden', 'library'], kind: 'library', lat: 33.4190476, lng: -111.9345785 },
  { id: 'noble-library', name: 'Noble Library', aliases: ['Noble Science and Engineering Library', 'noble'], kind: 'library', lat: 33.4199684, lng: -111.9306564 },
  { id: 'student-pavilion', name: 'Student Pavilion', aliases: ['pavilion'], kind: 'campus', lat: 33.4186687, lng: -111.9337308 },
  { id: 'fulton-center', name: 'Fulton Center', aliases: ['fulton'], kind: 'campus', lat: 33.4222695, lng: -111.9344655 },
  { id: 'armstrong-hall', name: 'Armstrong Hall', aliases: ['armstrong'], kind: 'campus', lat: 33.4178188, lng: -111.929444 },
  { id: 'biodesign', name: 'Biodesign Institute', aliases: ['biodesign'], kind: 'campus', lat: 33.4196615, lng: -111.9283439 },
  { id: 'brickyard', name: 'The Brickyard', aliases: ['brickyard'], kind: 'campus', lat: 33.4240271, lng: -111.938759 },
  { id: 'gammage', name: 'Gammage Auditorium', aliases: ['Grady Gammage', 'gammage', 'theater', 'theatre'], kind: 'campus', lat: 33.4162591, lng: -111.9380622 },
  { id: 'sun-devil-stadium', name: 'Sun Devil Stadium', aliases: ['Mountain America Stadium', 'football', 'stadium'], kind: 'sports', lat: 33.4263095, lng: -111.932659 },
  { id: 'desert-financial-arena', name: 'Desert Financial Arena', aliases: ['Wells Fargo Arena', 'arena'], kind: 'sports', lat: 33.4245079, lng: -111.93101 },
  { id: 'sdfc', name: 'Sun Devil Fitness Complex', aliases: ['SDFC', 'gym', 'fitness'], kind: 'sports', lat: 33.4154595, lng: -111.9327338 },
  { id: 'hayden-lawn', name: 'Hayden Lawn', aliases: ['lawn'], kind: 'park', lat: 33.4191754, lng: -111.9354183 },
  { id: 'hayden-butte', name: 'Hayden Butte (A Mountain)', aliases: ['A Mountain', 'Tempe Butte', 'butte'], kind: 'park', lat: 33.4282729, lng: -111.935822 },
  { id: 'mill-ave', name: 'Mill Avenue', aliases: ['Mill Ave', 'downtown Tempe', 'downtown'], kind: 'street', lat: 33.4207511, lng: -111.9400608 },
  { id: 'transportation-center', name: 'Tempe Transportation Center', aliases: ['bus station', 'transit center', 'light rail', 'metro'], kind: 'transit', lat: 33.4259313, lng: -111.9360348 },
  { id: 'town-lake', name: 'Tempe Town Lake', aliases: ['town lake', 'lake'], kind: 'park', lat: 33.433436, lng: -111.9404797, outsideRoutes: true },
]
