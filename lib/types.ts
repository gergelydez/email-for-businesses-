export interface Business {
  place_id: string
  name: string
  address: string
  phone: string
  rating: number
  reviews_count: number
  category: string
  category_label: string
  city: string
  contact_email: string
  generated_subject: string
  generated_body: string
  status: 'found' | 'ready' | 'sent' | 'failed'
  sent_at?: string
  error?: string
  created_at: string
}

export interface Settings {
  googlePlacesApiKey: string
  anthropicApiKey: string
  senderEmail: string
  senderAppPassword: string
  senderName: string
  yourWebsite: string
  yourPortfolio: string
  maxEmailsPerDay: number
}

export interface DailyStats {
  date: string
  sent: number
  failed: number
}
