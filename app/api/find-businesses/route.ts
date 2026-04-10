import { NextRequest, NextResponse } from 'next/server'
import { CITY_COORDINATES, BUSINESS_CATEGORIES } from '@/lib/constants'

export const maxDuration = 60

interface PlaceResult {
  place_id: string
  name: string
}

interface PlaceDetails {
  result?: {
    name?: string
    formatted_address?: string
    formatted_phone_number?: string
    international_phone_number?: string
    website?: string
    rating?: number
    user_ratings_total?: number
    business_status?: string
  }
}

function normalizePhoneForWhatsApp(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) {
    return '40' + digits.slice(1)
  }
  if (digits.startsWith('40')) return digits
  return digits
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { city, category, googleApiKey: clientKey } = body

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || clientKey
  if (!apiKey) {
    return NextResponse.json({ error: 'Lipsă Google Places API key' }, { status: 400 })
  }

  const coords = CITY_COORDINATES[city]
  if (!coords) {
    return NextResponse.json({ error: `Oraș necunoscut: ${city}` }, { status: 400 })
  }

  const nearbyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  nearbyUrl.searchParams.set('location', `${coords.lat},${coords.lng}`)
  nearbyUrl.searchParams.set('radius', String(coords.radius))
  nearbyUrl.searchParams.set('type', category)
  nearbyUrl.searchParams.set('key', apiKey)

  const nearbyRes = await fetch(nearbyUrl.toString())
  const nearbyData = await nearbyRes.json()

  if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
    return NextResponse.json(
      { error: `Google API error: ${nearbyData.status} – ${nearbyData.error_message || ''}` },
      { status: 500 },
    )
  }

  const places: PlaceResult[] = nearbyData.results || []

  const detailsResults: PlaceDetails[] = await Promise.all(
    places.map(async (place) => {
      const detailUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
      detailUrl.searchParams.set('place_id', place.place_id)
      detailUrl.searchParams.set(
        'fields',
        'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,business_status',
      )
      detailUrl.searchParams.set('key', apiKey)
      detailUrl.searchParams.set('language', 'ro')
      try {
        const res = await fetch(detailUrl.toString())
        return res.json()
      } catch {
        return {}
      }
    }),
  )

  const businesses = detailsResults
    .map((d, i) => ({ d, place: places[i] }))
    .filter(({ d }) => {
      const r = d.result || {}
      return (
        r.business_status !== 'CLOSED_PERMANENTLY' &&
        !r.website &&
        (r.formatted_phone_number || r.international_phone_number)
      )
    })
    .map(({ d, place }) => {
      const r = d.result || {}
      const phone = r.formatted_phone_number || ''
      const intlPhone = r.international_phone_number || ''
      const waNumber = normalizePhoneForWhatsApp(intlPhone || phone)
      return {
        place_id:            place.place_id,
        name:                r.name || place.name,
        address:             r.formatted_address || '',
        phone,
        phone_intl:          waNumber,
        whatsapp_link:       waNumber ? `https://wa.me/${waNumber}` : '',
        rating:              r.rating || 0,
        reviews_count:       r.user_ratings_total || 0,
        category,
        category_label:      BUSINESS_CATEGORIES[category] || category,
        city,
        is_small_city:       coords.isSmall || false,
        contact_email:       '',
        generated_subject:   '',
        generated_body:      '',
        generated_whatsapp:  '',
        status:              'found',
        contact_method:      waNumber ? 'whatsapp' : 'none',
        created_at:          new Date().toISOString(),
      }
    })

  return NextResponse.json({ businesses, total: businesses.length })
}
