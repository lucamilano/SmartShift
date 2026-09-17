export interface Profile {
  id: string
  email: string
  nome: string
  cognome: string
  ruolo: 'user' | 'admin'
  is_active: boolean
  created_at: string
}

export interface CalendarEvent {
  id: string
  utente_id: string
  data: string
  tipo: 'ferie' | 'smartworking' | 'malattia' | 'ufficio'
  mezza_giornata: boolean
  stato: 'approvato'
  created_at: string
}
