'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileEdit, CalendarDays, Mail, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { updateProfile, deleteUserAction, createUserAction, resendInvitationAction } from './actions'

type Member = {
  id: string
  email: string
  nome: string
  cognome: string
  ruolo: string
  must_change_password: boolean
  invitation_status: 'pending' | 'sent' | 'failed' | 'completed'
}

type Event = {
  utente_id: string
  tipo: string
}

const STATUS_STYLES: Record<string, string> = {
  ufficio: 'text-green-700 dark:text-green-400',
  smartworking: 'text-blue-700 dark:text-blue-400',
  ferie: 'text-yellow-700 dark:text-yellow-400',
  malattia: 'text-red-700 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  ufficio: 'Ufficio',
  smartworking: 'Smartworking',
  ferie: 'Ferie',
  malattia: 'Malattia',
}

function TodayStatus({ event }: { event?: Event }) {
  if (!event) return <span className="text-sm text-muted-foreground">Nessun evento</span>
  return <span className={`text-sm font-medium ${STATUS_STYLES[event.tipo] || ''}`}>{STATUS_LABELS[event.tipo] || event.tipo}</span>
}

export default function TeamClient({ initialMembers, todaysEvents, stats }: { initialMembers: Member[], todaysEvents: Event[], stats: Record<'ufficio' | 'smartworking' | 'ferie' | 'malattia' | 'assenti_non_giustificati', number> }) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  
  // Stati Modale Modifica User
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Member | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCognome, setEditCognome] = useState('')
  const [editRuolo, setEditRuolo] = useState('')
  const [loading, setLoading] = useState(false)

  // Stati Modale Nuovo Collega
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newCognome, setNewCognome] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Stati Modale Errore custom
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  // Stati Modale Conferma Cancellazione
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Member | null>(null)

  const handleEditClick = (member: Member) => {
    setSelectedUser(member)
    setEditNome(member.nome || '')
    setEditCognome(member.cognome || '')
    setEditRuolo(member.ruolo || 'user')
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (member: Member) => {
    setUserToDelete(member)
    setDeleteConfirmOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    setLoading(true)
    const res = await updateProfile(selectedUser.id, editNome, editCognome, editRuolo)
    setLoading(false)
    
    if (res.error) {
      setAlertMessage(res.error)
      setAlertOpen(true)
    } else {
      // Aggiorniamo la UI in locale
      setMembers(members.map(m => m.id === selectedUser.id ? { ...m, nome: editNome, cognome: editCognome, ruolo: editRuolo } : m))
      setIsEditModalOpen(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setLoading(true)
    const res = await deleteUserAction(userToDelete.id)
    setLoading(false)

    if (res.error) {
      setDeleteConfirmOpen(false)
      setAlertMessage(res.error)
      setAlertOpen(true)
    } else {
      setMembers(members.filter(m => m.id !== userToDelete.id))
      setDeleteConfirmOpen(false)
    }
  }

  const showAlert = (message: string, password?: string) => {
    setAlertMessage(message)
    setTemporaryPassword(password || null)
    setAlertOpen(true)
  }

  const handleCreateUser = async () => {
    setLoading(true)
    const result = await createUserAction(newNome, newCognome, newEmail)
    setLoading(false)
    if (result.error) return showAlert(result.error)
    if (result.member) setMembers(current => [...current, result.member].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)))
    setNewNome(''); setNewCognome(''); setNewEmail(''); setIsNewUserModalOpen(false)
    showAlert(result.warning || 'Account creato e invito inviato.', result.temporaryPassword)
  }

  const handleResendInvitation = async (member: Member) => {
    setLoading(true)
    const result = await resendInvitationAction(member.id)
    setLoading(false)
    if (result.error) {
      setMembers(current => current.map(item => item.id === member.id ? { ...item, invitation_status: 'failed' } : item))
      showAlert(result.error, result.temporaryPassword)
    } else {
      setMembers(current => current.map(item => item.id === member.id ? { ...item, invitation_status: 'sent' } : item))
      showAlert('Nuova password temporanea inviata. Quella precedente non è più valida.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      
      {/* Intestazione */}
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Gestione team
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Presenze di oggi e anagrafica dei colleghi.
          </p>
        </div>
        <Button onClick={() => setIsNewUserModalOpen(true)}>
          Nuovo collega
        </Button>
      </header>

      {/* Panoramica di Oggi */}
      <section aria-labelledby="today-title">
        <h2 id="today-title" className="text-sm font-medium text-muted-foreground">Situazione di oggi</h2>
        <dl className="mt-3 grid grid-cols-2 border-y sm:grid-cols-3 md:grid-cols-5 md:divide-x">
          <div className="py-3 md:px-4 md:first:pl-0"><dt className="text-sm text-muted-foreground">In ufficio</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.ufficio}</dd></div>
          <div className="py-3 md:px-4"><dt className="text-sm text-muted-foreground">Smartworking</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.smartworking}</dd></div>
          <div className="py-3 md:px-4"><dt className="text-sm text-muted-foreground">Ferie</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.ferie}</dd></div>
          <div className="py-3 md:px-4"><dt className="text-sm text-muted-foreground">Malattia</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.malattia}</dd></div>
          <div className="py-3 md:px-4"><dt className="text-sm text-muted-foreground">Non pianificati</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.assenti_non_giustificati}</dd></div>
        </dl>
      </section>

      {/* Tabella Colleghi */}
      <section className="border-y" aria-labelledby="members-title">
        <div className="flex items-baseline gap-2 border-b py-4">
          <h2 id="members-title" className="text-lg font-semibold">Colleghi</h2>
          <span className="text-sm text-muted-foreground">{members.length}</span>
        </div>
        <div>
          {/* Visualizzazione Mobile (Lista a schede compatte) */}
          <div className="flex flex-col divide-y md:hidden">
            {members.map((member) => {
              const todayStatus = todaysEvents.find(e => e.utente_id === member.id)

              return (
                <div key={member.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="font-semibold">
                          {(member.nome?.[0] || 'U') + (member.cognome?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{[member.nome, member.cognome].filter(Boolean).join(' ') || member.email}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {member.ruolo === 'admin' 
                            ? <span className="font-medium text-foreground">Amministratore</span>
                            : <span>Utente</span>
                          }
                        </div>
                        {member.must_change_password && <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">Primo accesso in attesa</p>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-medium text-muted-foreground">Stato oggi</span>
                    <TodayStatus event={todayStatus} />
                  </div>
                  
                  <div className="mt-1 flex justify-end gap-2 border-t pt-3">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/dashboard/calendario?userId=${member.id}`}>
                        <CalendarDays className="h-3.5 w-3.5 mr-1" /> Calendario
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditClick(member)}
                      className="shrink-0"
                      aria-label="Modifica dati anagrafici"
                    >
                      <FileEdit className="h-4 w-4" />
                    </Button>
                    {member.must_change_password && <Button variant="ghost" size="icon" disabled={loading} onClick={() => handleResendInvitation(member)} title="Reinvia invito" aria-label="Reinvia invito" className="h-8 w-8 text-amber-700 shrink-0"><Mail className="h-4 w-4" /></Button>}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteClick(member)}
                      className="shrink-0 text-destructive"
                      aria-label="Rimuovi account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Visualizzazione Desktop (Tabella Classica) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] pl-6">Collega</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Stato oggi</TableHead>
                <TableHead className="pr-6 text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const todayStatus = todaysEvents.find(e => e.utente_id === member.id)
                return (
                  <TableRow key={member.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs font-semibold">
                            {(member.nome?.[0] || 'U') + (member.cognome?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div><span>{[member.nome, member.cognome].filter(Boolean).join(' ') || member.email}</span><div className="text-xs text-muted-foreground">{member.email}</div></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.ruolo === 'admin' 
                        ? <span className="text-sm font-medium">Amministratore</span>
                        : <span className="text-sm text-muted-foreground">Utente</span>
                      }
                      {member.must_change_password && <span className="ml-2 text-xs font-medium text-amber-700 dark:text-amber-400">Invito {member.invitation_status === 'failed' ? 'non inviato' : 'in attesa'}</span>}
                    </TableCell>
                    <TableCell><TodayStatus event={todayStatus} /></TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/calendario?userId=${member.id}`}>
                            <CalendarDays className="h-3.5 w-3.5 mr-1" /> Apri Calendario
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditClick(member)}
                          title="Modifica dati anagrafici"
                          aria-label="Modifica dati anagrafici"
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        {member.must_change_password && <Button variant="ghost" size="icon" disabled={loading} onClick={() => handleResendInvitation(member)} title="Genera una nuova password temporanea e reinvia" aria-label="Reinvia invito" className="text-amber-700"><Mail className="h-4 w-4" /></Button>}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClick(member)}
                          className="text-destructive"
                          title="Rimuovi account"
                          aria-label="Rimuovi account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        </div>
      </section>

      {/* --- Modale di Modifica Dati --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Modifica anagrafica</DialogTitle>
            <DialogDescription>
              Modifica i dati di questo collega. Per cambiare l’email, contatta il supporto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-semibold">Nome</Label>
                <Input id="nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cognome" className="text-sm font-semibold">Cognome</Label>
                <Input id="cognome" value={editCognome} onChange={(e) => setEditCognome(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Qualifica / Ruolo nel Sistema</Label>
              <Select value={editRuolo} onValueChange={(val: string) => setEditRuolo(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utente Base</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modale "Nuovo Collega" --- */}
      <Dialog open={isNewUserModalOpen} onOpenChange={setIsNewUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Aggiungi nuovo dipendente
            </DialogTitle>
            <DialogDescription>Il nuovo account sarà un utente base e riceverà una password temporanea valida 24 ore.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="newNome">Nome</Label><Input id="newNome" value={newNome} onChange={event => setNewNome(event.target.value)} required maxLength={100} /></div>
              <div className="space-y-2"><Label htmlFor="newCognome">Cognome</Label><Input id="newCognome" value={newCognome} onChange={event => setNewCognome(event.target.value)} required maxLength={100} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="newEmail">Email</Label><Input id="newEmail" value={newEmail} onChange={event => setNewEmail(event.target.value)} type="email" required maxLength={254} autoComplete="off" /></div>
            <p className="text-xs text-muted-foreground">Il ruolo amministratore potrà essere assegnato in seguito con “Modifica”.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewUserModalOpen(false)} disabled={loading}>Annulla</Button>
            <Button onClick={handleCreateUser} disabled={loading || !newNome.trim() || !newCognome.trim() || !newEmail.trim()}>{loading ? 'Creazione…' : 'Crea e invia invito'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modale Errore Custom --- */}
      <AlertDialog open={alertOpen} onOpenChange={open => { setAlertOpen(open); if (!open) setTemporaryPassword(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esito dell’operazione</AlertDialogTitle>
            <AlertDialogDescription>
              <p>{alertMessage}</p>
              {temporaryPassword && <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                <p className="font-medium">Password temporanea da consegnare con un canale sicuro</p>
                <code className="mt-2 block break-all rounded bg-background p-2 font-mono text-sm">{temporaryPassword}</code>
                <p className="mt-2 text-xs">È visibile soltanto ora e verrà sostituita obbligatoriamente al primo accesso.</p>
              </div>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {temporaryPassword && <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(temporaryPassword)}>Copia password</Button>}
            <AlertDialogAction>Ho capito</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Modale Conferma Cancellazione --- */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere l’account?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per rimuovere l’account di <strong>{userToDelete?.nome} {userToDelete?.cognome}</strong>.
              L’utente non potrà più accedere e l’email potrà essere usata per un nuovo profilo. Le presenze già registrate resteranno archiviate in forma anonimizzata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={loading} variant="destructive">
              {loading ? 'Rimozione in corso...' : 'Sì, rimuovi utente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
