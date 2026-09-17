export interface Profile {
  id: string
  email: string
  nome: string
  cognome: string
  ruolo: 'user' | 'admin'
  is_active: boolean
  created_at: string
  must_change_password: boolean
  temporary_password_expires_at: string | null
  invitation_status: 'pending' | 'sent' | 'failed' | 'completed'
  invited_at: string | null
  invitation_sent_at: string | null
  invited_by: string | null
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
